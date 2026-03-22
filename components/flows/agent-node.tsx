"use client";

import { memo, useState } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import { ChevronDown, ChevronRight, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatToolValue } from "@/lib/format-tool-value";
import type { AgentNodeData, StepEntry } from "@/lib/flow-graph";
import ReactMarkdown from "react-markdown";

const STATUS_BORDER: Record<string, string> = {
  completed: "border-l-emerald-500",
  failed: "border-l-red-500",
  running: "border-l-amber-500",
};

const STATUS_BADGE: Record<string, string> = {
  completed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  failed: "bg-red-500/10 text-red-700 dark:text-red-400",
  running: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
};

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

function ToolCallValue({ value }: { value: unknown }) {
  const formatted = formatToolValue(value);
  if (!formatted) return null;

  if (formatted.mode === "markdown") {
    return (
      <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none text-xs">
        <ReactMarkdown>{formatted.content}</ReactMarkdown>
      </div>
    );
  }

  return (
    <pre className="text-xs bg-muted/50 rounded p-2 overflow-x-auto max-h-40 overflow-y-auto">
      <code>{formatted.content}</code>
    </pre>
  );
}

function StepDetails({ steps }: { steps: StepEntry[] }) {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());

  const toggleStep = (stepNumber: number) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepNumber)) {
        next.delete(stepNumber);
      } else {
        next.add(stepNumber);
      }
      return next;
    });
  };

  return (
    <div className="space-y-1">
      {steps.map((step) => {
        const isExpanded = expandedSteps.has(step.stepNumber);
        const tokens = fmtTokens(
          step.promptTokens ?? null,
          step.completionTokens ?? null
        );

        return (
          <div key={step.stepNumber} className="text-xs">
            <button
              type="button"
              className="flex items-center gap-1.5 w-full text-left py-1 hover:bg-muted/50 rounded px-1 -mx-1"
              onClick={(e) => {
                e.stopPropagation();
                toggleStep(step.stepNumber);
              }}
            >
              {isExpanded ? (
                <ChevronDown className="size-3 shrink-0" />
              ) : (
                <ChevronRight className="size-3 shrink-0" />
              )}
              <span className="font-mono text-muted-foreground">
                Step {step.stepNumber}
              </span>
              {tokens && (
                <span className="text-muted-foreground ml-auto">{tokens}</span>
              )}
            </button>

            {isExpanded && step.toolCalls.length > 0 && (
              <div className="ml-4 pl-2 border-l border-border space-y-2 py-1">
                {step.toolCalls.map((tc, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Wrench className="size-3 shrink-0" />
                      <span className="font-mono font-medium text-foreground">
                        {tc.name}
                      </span>
                    </div>
                    {tc.input != null && (
                      <div className="ml-4">
                        <span className="text-muted-foreground text-[10px] uppercase tracking-wide">
                          in
                        </span>
                        <ToolCallValue value={tc.input} />
                      </div>
                    )}
                    {tc.output != null && (
                      <div className="ml-4">
                        <span className="text-muted-foreground text-[10px] uppercase tracking-wide">
                          out
                        </span>
                        <ToolCallValue value={tc.output} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AgentNodeComponent({ data }: NodeProps) {
  const nodeData = data as unknown as AgentNodeData;
  const [expanded, setExpanded] = useState(nodeData.isStarter);

  const borderColor = STATUS_BORDER[nodeData.status] ?? "border-l-border";
  const badgeColor = STATUS_BADGE[nodeData.status] ?? "";
  const tokens = fmtTokens(nodeData.promptTokens, nodeData.completionTokens);
  const steps = nodeData.steps as StepEntry[] | null;

  return (
    <>
      <Handle type="target" position={Position.Top} className="!bg-border !w-2 !h-2" />
      <div
        className={`bg-card border border-border rounded-xl shadow-sm border-l-4 ${borderColor} min-w-[280px] max-w-[420px]`}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <span className="font-mono font-medium text-sm text-foreground truncate">
            {nodeData.label}
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <Badge className={badgeColor}>{nodeData.status}</Badge>
            {steps && steps.length > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(!expanded);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                {expanded ? (
                  <ChevronDown className="size-4" />
                ) : (
                  <ChevronRight className="size-4" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="px-3 pb-2 space-y-1">
          {nodeData.parentToolCallInput != null && (
            <div className="text-xs text-muted-foreground truncate">
              <span className="text-[10px] uppercase tracking-wide">in: </span>
              {typeof nodeData.parentToolCallInput === "string"
                ? nodeData.parentToolCallInput.slice(0, 120)
                : JSON.stringify(nodeData.parentToolCallInput).slice(0, 120)}
            </div>
          )}
          {nodeData.outputSummary && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {nodeData.outputSummary}
            </p>
          )}

          {/* Stats line */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
            {nodeData.stepCount != null && (
              <span>{nodeData.stepCount} steps</span>
            )}
            {tokens && <span>· {tokens}</span>}
            <span>· {fmtDuration(nodeData.durationMs)}</span>
          </div>

          {/* Error */}
          {nodeData.status === "failed" && nodeData.error && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              {nodeData.error}
            </p>
          )}
        </div>

        {/* Expanded: Step details */}
        {expanded && steps && steps.length > 0 && (
          <div className="border-t border-border px-3 py-2 max-h-[400px] overflow-y-auto">
            <StepDetails steps={steps} />
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-border !w-2 !h-2" />
    </>
  );
}

export const AgentNode = memo(AgentNodeComponent);
