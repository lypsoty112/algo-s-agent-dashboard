"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type NodeTypes,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useFlowDetail } from "@/hooks/use-flow-detail";
import { buildGraph, layoutGraph } from "@/lib/flow-graph";
import { extractTodos } from "@/lib/extract-todos";
import { AgentNode } from "./agent-node";
import { TodoPanel } from "./todo-panel";

const STATUS_BADGE: Record<string, string> = {
  completed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  failed: "bg-red-500/10 text-red-700 dark:text-red-400",
  running: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
};

const STATUS_MINIMAP: Record<string, string> = {
  completed: "#10b981",
  failed: "#ef4444",
  running: "#f59e0b",
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

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const nodeTypes: NodeTypes = {
  agentNode: AgentNode,
};

function CanvasSkeleton() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="space-y-6">
        <Skeleton className="h-24 w-72 rounded-xl mx-auto" />
        <div className="flex gap-8 justify-center">
          <Skeleton className="h-20 w-56 rounded-xl" />
          <Skeleton className="h-20 w-56 rounded-xl" />
        </div>
        <div className="flex gap-8 justify-center">
          <Skeleton className="h-20 w-56 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function FlowCanvas({
  id,
  flowName,
  onClose,
}: {
  id: string;
  flowName: string;
  onClose: () => void;
}) {
  const { flowRun, agentRuns, loading, error, retry } = useFlowDetail(id);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [layoutReady, setLayoutReady] = useState(false);

  const todos = useMemo(
    () => (flowRun ? extractTodos(flowRun, agentRuns) : []),
    [flowRun, agentRuns]
  );

  // Build and layout graph when data arrives
  useEffect(() => {
    if (!flowRun || agentRuns.length === 0) return;

    const { nodes: rawNodes, edges: rawEdges } = buildGraph(flowRun, agentRuns);

    layoutGraph(rawNodes, rawEdges).then((positioned) => {
      setNodes(positioned);
      setEdges(rawEdges);
      setLayoutReady(true);
    });
  }, [flowRun, agentRuns, setNodes, setEdges]);

  // Close on Escape
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const nodeColor = useCallback((node: { data: Record<string, unknown> }) => {
    return STATUS_MINIMAP[(node.data as { status?: string }).status ?? ""] ?? "#888";
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-mono font-semibold text-lg truncate">
            {flowRun?.flowName ?? flowName}
          </span>
          {flowRun && (
            <>
              <Badge className={STATUS_BADGE[flowRun.status] ?? ""}>
                {flowRun.status}
              </Badge>
              <span className="text-sm text-muted-foreground font-mono">
                {fmtDuration(flowRun.durationMs)}
              </span>
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {fmtDate(flowRun.startedAt)}
              </span>
            </>
          )}
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </div>

      {/* Canvas */}
      <div className="flex-1 flex overflow-hidden">
      <div className="flex-1 relative">
        {loading && <CanvasSkeleton />}

        {error && (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" onClick={retry}>
              Retry
            </Button>
          </div>
        )}

        {!loading && !error && layoutReady && (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            nodesDraggable={true}
            nodesConnectable={false}
            elementsSelectable={true}
            className="[&_.react-flow__edge-path]:!stroke-[var(--border)] [&_.react-flow__edge-path]:!stroke-2"
          >
            <Background color="var(--border)" gap={20} size={1} />
            <Controls
              showInteractive={false}
              className="!bg-card !border-border !rounded-lg !shadow-sm [&>button]:!bg-card [&>button]:!border-border [&>button]:!text-foreground [&>button:hover]:!bg-muted"
            />
            <MiniMap
              nodeColor={nodeColor}
              maskColor="hsl(var(--background) / 0.8)"
              className="!bg-card !border-border !rounded-lg"
            />
          </ReactFlow>
        )}
      </div>

      {todos.length > 0 && (
        <div className="w-72 shrink-0 border-l border-border p-4 overflow-y-auto">
          <TodoPanel todos={todos} />
        </div>
      )}
      </div>
    </div>
  );
}
