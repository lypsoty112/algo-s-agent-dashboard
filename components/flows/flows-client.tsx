"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { FlowCanvas } from "./flow-canvas";
import { FlowSheet } from "./flow-sheet";
import { FlowSummaryStrip } from "./flow-summary-strip";

type FlowRunRow = {
  id: string;
  flowName: string;
  starterAgent: string;
  status: string;
  error: string | null;
  durationMs: number | null;
  startedAt: string;
  endedAt: string | null;
  _count: { agentRuns: number };
};

type FlowsResponse = {
  flows: FlowRunRow[];
  total: number;
  page: number;
  pageSize: number;
};

const STATUS_FILTERS = ["running", "completed", "failed"] as const;

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

function fmtRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function fmtFullDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function TableSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

export function FlowsClient() {
  const isMobile = useIsMobile();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [data, setData] = useState<FlowsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFlow, setSelectedFlow] = useState<FlowRunRow | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchData() {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set("page", String(page));
      if (statusFilter) params.set("status", statusFilter);

      try {
        const res = await fetch(`/api/flows?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("Failed to fetch");
        const json: FlowsResponse = await res.json();
        setData(json);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError("Failed to load flow runs.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();

    return () => {
      controller.abort();
    };
  }, [page, statusFilter]);

  const toggleStatus = (status: string) => {
    setStatusFilter((prev) => (prev === status ? null : status));
    setPage(1);
  };

  const totalPages = data
    ? Math.max(1, Math.ceil(data.total / data.pageSize))
    : 1;

  return (
    <>
      {/* Summary Strip */}
      <FlowSummaryStrip />

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((status) => (
          <button key={status} onClick={() => toggleStatus(status)} type="button">
            <Badge
              className={
                statusFilter === status
                  ? STATUS_BADGE[status]
                  : `opacity-50 ${STATUS_BADGE[status]}`
              }
            >
              {status}
            </Badge>
          </button>
        ))}
        {data && !loading && (
          <span className="ml-auto text-sm text-muted-foreground">
            {data.total} {data.total === 1 ? "run" : "runs"}
          </span>
        )}
      </div>

      {/* Error State */}
      {error && (
        <Card>
          <CardContent>
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">
              {error}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      {!error && (
        <Card>
          <CardHeader>
            <CardTitle>Flow Runs</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <TableSkeleton />
            ) : !data || data.flows.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-muted-foreground">
                No flow runs recorded yet.
              </p>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Flow</TableHead>
                      <TableHead className="hidden md:table-cell">Started by</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Agents</TableHead>
                      <TableHead className="hidden sm:table-cell text-right">Duration</TableHead>
                      <TableHead className="text-right">Started</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.flows.map((flow) => (
                      <TableRow
                        key={flow.id}
                        className="cursor-pointer"
                        onClick={() => setSelectedFlow(flow)}
                      >
                        <TableCell className="font-mono max-w-xs truncate">
                          {flow.flowName}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground font-mono">
                          {flow.starterAgent}
                        </TableCell>
                        <TableCell>
                          <Badge className={STATUS_BADGE[flow.status] ?? ""}>
                            {flow.status === "running" && (
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse mr-1 inline-block" />
                            )}
                            {flow.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm font-mono">
                          {flow._count.agentRuns}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-right text-sm font-mono whitespace-nowrap">
                          {fmtDuration(flow.durationMs)}
                        </TableCell>
                        <TableCell className="text-right text-sm whitespace-nowrap" title={fmtFullDate(flow.startedAt)}>
                          {fmtRelativeTime(flow.startedAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t px-4 py-3">
                    <p className="text-sm text-muted-foreground">
                      Page {page} of {totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => p - 1)}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Detail: Canvas (desktop) or Sheet (mobile) */}
      {selectedFlow && !isMobile && (
        <FlowCanvas
          id={selectedFlow.id}
          flowName={selectedFlow.flowName}
          onClose={() => setSelectedFlow(null)}
        />
      )}
      {selectedFlow && isMobile && (
        <FlowSheet
          id={selectedFlow.id}
          flowName={selectedFlow.flowName}
          onClose={() => setSelectedFlow(null)}
        />
      )}
    </>
  );
}
