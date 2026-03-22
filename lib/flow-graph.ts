import type { Node, Edge } from "@xyflow/react";

// --- Types matching API response ---

export type StepToolCall = {
  name: string;
  input?: unknown;
  output?: unknown;
};

export type StepEntry = {
  stepNumber: number;
  toolCalls: StepToolCall[];
  promptTokens?: number;
  completionTokens?: number;
};

export type AgentRunData = {
  id: string;
  agentId: string;
  callerId: string | null;
  status: string;
  finishReason: string | null;
  error: string | null;
  stepCount: number | null;
  promptTokens: number | null;
  completionTokens: number | null;
  input: string | null;
  outputSummary: string | null;
  steps: StepEntry[] | null;
  durationMs: number | null;
  startedAt: string;
  endedAt: string | null;
};

export type FlowRunData = {
  id: string;
  flowName: string;
  starterAgent: string;
  status: string;
  error: string | null;
  durationMs: number | null;
  startedAt: string;
  endedAt: string | null;
};

export type AgentNodeData = AgentRunData & {
  label: string;
  isStarter: boolean;
  parentToolCallInput: unknown;
};

// --- Graph construction ---

const NODE_WIDTH = 420;
const NODE_HEIGHT_BASE = 130;
const NODE_STEP_HEIGHT = 28;

export function buildGraph(
  flowRun: FlowRunData,
  agentRuns: AgentRunData[]
): { nodes: Node<AgentNodeData>[]; edges: Edge[] } {
  // Count occurrences of each agentId for labeling duplicates
  const agentIdCounts = new Map<string, number>();
  const agentIdIndex = new Map<string, number>();
  for (const run of agentRuns) {
    agentIdCounts.set(run.agentId, (agentIdCounts.get(run.agentId) ?? 0) + 1);
  }

  // Build a lookup: agentId → list of AgentRuns (sorted by startedAt)
  const runsByAgentId = new Map<string, AgentRunData[]>();
  for (const run of agentRuns) {
    const list = runsByAgentId.get(run.agentId) ?? [];
    list.push(run);
    runsByAgentId.set(run.agentId, list);
  }

  // Build nodes
  const nodes: Node<AgentNodeData>[] = agentRuns.map((run) => {
    const count = agentIdCounts.get(run.agentId) ?? 1;
    const idx = agentIdIndex.get(run.agentId) ?? 0;
    agentIdIndex.set(run.agentId, idx + 1);

    const label = count > 1 ? `${run.agentId} #${idx + 1}` : run.agentId;
    const isStarter = run.agentId === flowRun.starterAgent;

    // Find parent tool call input for this agent
    let parentToolCallInput: unknown = null;
    if (run.callerId) {
      const parentRuns = runsByAgentId.get(run.callerId) ?? [];
      for (const parent of parentRuns) {
        if (parent.steps) {
          for (const step of parent.steps) {
            for (const tc of step.toolCalls) {
              if (tc.name === `call_${run.agentId}`) {
                parentToolCallInput = tc.input;
                break;
              }
            }
            if (parentToolCallInput !== null) break;
          }
        }
        if (parentToolCallInput !== null) break;
      }
    }

    const stepCount = run.stepCount ?? run.steps?.length ?? 0;
    const height = NODE_HEIGHT_BASE + Math.min(stepCount * NODE_STEP_HEIGHT, 400);
    const width = NODE_WIDTH;

    return {
      id: run.id,
      type: "agentNode",
      position: { x: 0, y: 0 }, // will be set by ELK
      data: {
        ...run,
        label,
        isStarter,
        parentToolCallInput,
      },
      width,
      height,
    };
  });

  // Build edges using callerId
  const edges: Edge[] = [];
  // Map from agentId → ordered run IDs (by startedAt)
  const orderedRunIdsByAgentId = new Map<string, string[]>();
  for (const run of agentRuns) {
    const list = orderedRunIdsByAgentId.get(run.agentId) ?? [];
    list.push(run.id);
    orderedRunIdsByAgentId.set(run.agentId, list);
  }

  // For matching: track how many children each parent has called per agentId
  const parentCallCounts = new Map<string, Map<string, number>>();

  for (const run of agentRuns) {
    if (!run.callerId) continue;

    // Find the parent run that called this agent
    const parentRuns = runsByAgentId.get(run.callerId) ?? [];
    let sourceId: string | null = null;

    for (const parent of parentRuns) {
      if (parent.steps) {
        const callName = `call_${run.agentId}`;
        const hasCall = parent.steps.some((step) =>
          step.toolCalls.some((tc) => tc.name === callName)
        );
        if (hasCall) {
          // Track call index for multiple calls to same agent
          const countMap =
            parentCallCounts.get(parent.id) ?? new Map<string, number>();
          const callIdx = countMap.get(run.agentId) ?? 0;
          countMap.set(run.agentId, callIdx + 1);
          parentCallCounts.set(parent.id, countMap);

          sourceId = parent.id;
          break;
        }
      }
    }

    // Fallback: if no step-level match, use first parent with matching agentId
    if (!sourceId && parentRuns.length > 0) {
      sourceId = parentRuns[0].id;
    }

    if (sourceId) {
      edges.push({
        id: `e-${sourceId}-${run.id}`,
        source: sourceId,
        target: run.id,
        label: `call_${run.agentId}`,
        type: "smoothstep",
        animated: run.status === "running",
      });
    }
  }

  return { nodes, edges };
}

// --- Sequential horizontal layout ---
// Agents run one at a time; sort by startedAt and place left-to-right in a
// single row so no two nodes ever appear above/below each other.

const NODE_GAP = 80;

export function layoutGraph(
  nodes: Node<AgentNodeData>[],
  _edges: Edge[]
): Promise<Node<AgentNodeData>[]> {
  const sorted = [...nodes].sort(
    (a, b) =>
      new Date(a.data.startedAt).getTime() -
      new Date(b.data.startedAt).getTime()
  );

  return Promise.resolve(
    sorted.map((node, i) => ({
      ...node,
      position: { x: i * (NODE_WIDTH + NODE_GAP), y: 0 },
    }))
  );
}

