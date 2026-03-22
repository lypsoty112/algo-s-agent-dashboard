import type { Node, Edge } from "@xyflow/react";
import ELK from "elkjs/lib/elk.bundled.js";

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

const COLLAPSED_WIDTH = 300;
const COLLAPSED_HEIGHT = 140;
const EXPANDED_WIDTH = 420;
const EXPANDED_HEIGHT_BASE = 200;
const EXPANDED_STEP_HEIGHT = 60;

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
    const expanded = isStarter;
    const height = expanded
      ? EXPANDED_HEIGHT_BASE + stepCount * EXPANDED_STEP_HEIGHT
      : COLLAPSED_HEIGHT;
    const width = expanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH;

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

// --- ELK Layout ---

const elk = new ELK();

export async function layoutGraph(
  nodes: Node<AgentNodeData>[],
  edges: Edge[]
): Promise<Node<AgentNodeData>[]> {
  const graph = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "DOWN",
      "elk.spacing.nodeNode": "60",
      "elk.layered.spacing.nodeNodeBetweenLayers": "80",
    },
    children: nodes.map((node) => ({
      id: node.id,
      width: node.width ?? COLLAPSED_WIDTH,
      height: node.height ?? COLLAPSED_HEIGHT,
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  };

  const layout = await elk.layout(graph);

  return nodes.map((node) => {
    const layoutNode = layout.children?.find((n) => n.id === node.id);
    return {
      ...node,
      position: {
        x: layoutNode?.x ?? 0,
        y: layoutNode?.y ?? 0,
      },
    };
  });
}

export function getNodeDimensions(
  expanded: boolean,
  stepCount: number
): { width: number; height: number } {
  if (expanded) {
    return {
      width: EXPANDED_WIDTH,
      height: EXPANDED_HEIGHT_BASE + stepCount * EXPANDED_STEP_HEIGHT,
    };
  }
  return { width: COLLAPSED_WIDTH, height: COLLAPSED_HEIGHT };
}
