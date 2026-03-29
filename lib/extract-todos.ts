import type { FlowRunData, AgentRunData } from "./flow-graph";

export type TodoStatus = "pending" | "in_progress" | "completed" | "skipped";

export type TodoItem = {
  id: string;
  title: string;
  status: TodoStatus;
};

const VALID_STATUSES = new Set<TodoStatus>([
  "pending",
  "in_progress",
  "completed",
  "skipped",
]);

function isValidStatus(s: unknown): s is TodoStatus {
  return typeof s === "string" && VALID_STATUSES.has(s as TodoStatus);
}

export function extractTodos(
  flowRun: FlowRunData,
  agentRuns: AgentRunData[]
): TodoItem[] {
  const map = new Map<string, TodoItem>();

  try {
    const starterRuns = agentRuns
      .filter((r) => r.agentId === flowRun.starterAgent)
      .sort(
        (a, b) =>
          new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()
      );

    for (const run of starterRuns) {
      if (!run.steps) continue;

      for (const step of run.steps) {
        for (const tc of step.toolCalls) {
          if (tc.name === "createTodo") {
            try {
              // input.items: [{ title: string }] — output is null (not stored)
              const input = tc.input;
              if (!input || typeof input !== "object") continue;
              const items = (input as Record<string, unknown>).items;
              if (!Array.isArray(items)) continue;

              for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (item && typeof item === "object" && typeof item.title === "string") {
                  // IDs aren't stored in output, so derive a stable key from title+position
                  const id = `${step.stepNumber}:${i}:${item.title}`;
                  const status = isValidStatus(item.status) ? item.status : "pending";
                  map.set(id, { id, title: item.title, status });
                }
              }
            } catch {
              // ignore malformed createTodo input
            }
          } else if (tc.name === "updateTodoStatus") {
            try {
              // input.updates: [{ id: string, status: string }]
              // IDs reference runtime-generated UUIDs not stored in steps,
              // so we can't match by ID — skip status updates.
              // If the output contains updated items with titles, use those.
              const output = tc.output;
              if (Array.isArray(output)) {
                for (const item of output) {
                  if (
                    item &&
                    typeof item === "object" &&
                    typeof item.title === "string" &&
                    isValidStatus(item.status)
                  ) {
                    // Find matching todo by title and update its status
                    for (const [key, todo] of map.entries()) {
                      if (todo.title === item.title) {
                        map.set(key, { ...todo, status: item.status });
                        break;
                      }
                    }
                  }
                }
              }
            } catch {
              // ignore malformed updateTodoStatus
            }
          }
        }
      }
    }
  } catch {
    return [];
  }

  return Array.from(map.values());
}
