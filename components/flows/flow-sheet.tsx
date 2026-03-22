"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useFlowDetail } from "@/hooks/use-flow-detail";

const STATUS_BADGE: Record<string, string> = {
  completed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  failed: "bg-red-500/10 text-red-700 dark:text-red-400",
  running: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
};

const NUMBER_CIRCLES = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩"];

function fmtDuration(ms: number | null): string {
  if (ms === null) return "--";
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}m ${secs}s`;
}

function fmtTokens(prompt: number | null, completion: number | null): string {
  const total = (prompt ?? 0) + (completion ?? 0);
  if (total === 0) return "";
  return total >= 1000
    ? `${(total / 1000).toFixed(1)}k tokens`
    : `${total} tokens`;
}

function SheetSkeleton() {
  return (
    <div className="space-y-4 px-4 pb-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="flex gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-3 w-48" />
          <Skeleton className="h-3 w-64" />
        </div>
      ))}
    </div>
  );
}

export function FlowSheet({
  id,
  flowName,
  onClose,
}: {
  id: string;
  flowName: string;
  onClose: () => void;
}) {
  const { flowRun, agentRuns, loading, error } = useFlowDetail(id);

  return (
    <Sheet open={!!id} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
        <SheetHeader className="px-4 pt-4 pb-2">
          <SheetTitle className="flex items-center gap-2">
            <span className="font-mono">{flowRun?.flowName ?? flowName}</span>
            {flowRun && (
              <Badge className={STATUS_BADGE[flowRun.status] ?? ""}>
                {flowRun.status}
              </Badge>
            )}
          </SheetTitle>
          {flowRun && (
            <SheetDescription>
              {agentRuns.length} agent{agentRuns.length !== 1 ? "s" : ""} ·{" "}
              {fmtDuration(flowRun.durationMs)}
            </SheetDescription>
          )}
        </SheetHeader>

        {loading && <SheetSkeleton />}

        {error && (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            {error}
          </p>
        )}

        {!loading && !error && agentRuns.length > 0 && (
          <div className="space-y-3 px-4 pb-6">
            <div className="border-t border-border" />

            {agentRuns.map((run, i) => {
              const circle = NUMBER_CIRCLES[i] ?? `${i + 1}`;
              const tokens = fmtTokens(run.promptTokens, run.completionTokens);

              return (
                <div key={run.id} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{circle}</span>
                    <span className="font-mono text-sm font-medium">
                      {run.agentId}
                    </span>
                    <Badge className={`${STATUS_BADGE[run.status] ?? ""} ml-auto`}>
                      {run.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground font-mono">
                      {fmtDuration(run.durationMs)}
                    </span>
                  </div>

                  <div className="text-xs text-muted-foreground ml-6">
                    {run.stepCount != null && (
                      <span>{run.stepCount} steps</span>
                    )}
                    {tokens && <span> · {tokens}</span>}
                  </div>

                  {run.status === "failed" && run.error ? (
                    <p className="text-xs text-red-600 dark:text-red-400 ml-6">
                      {run.error}
                    </p>
                  ) : run.outputSummary ? (
                    <p className="text-xs text-muted-foreground ml-6">
                      {run.outputSummary}
                    </p>
                  ) : null}
                </div>
              );
            })}

            <div className="border-t border-border pt-3">
              <p className="text-xs text-muted-foreground text-center">
                Open on desktop for the full flow graph
              </p>
            </div>
          </div>
        )}

        {!loading && !error && agentRuns.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            No agent runs recorded for this flow.
          </p>
        )}
      </SheetContent>
    </Sheet>
  );
}
