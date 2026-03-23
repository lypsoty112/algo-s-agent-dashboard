"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type DefinitionsData = {
  activeCount: number;
  totalCount: number;
  nextRun: { flowName: string; scheduledAt: string } | null;
  cronCount: number;
  oneOffCount: number;
};

function fmtRelativeFuture(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "now";
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `in ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours < 24) return mins > 0 ? `in ${hours}h ${mins}m` : `in ${hours}h`;
  const days = Math.floor(hours / 24);
  return `in ${days}d`;
}

type KpiCardProps = {
  label: string;
  value: string;
  subtext?: string;
};

function KpiCard({ label, value, subtext }: KpiCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">{value}</p>
        {subtext && <p className="mt-1 text-xs text-muted-foreground">{subtext}</p>}
      </CardContent>
    </Card>
  );
}

function SkeletonCard() {
  return (
    <Card>
      <CardContent className="pt-6 space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-7 w-16" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}

export function FlowSummaryStrip() {
  const [data, setData] = useState<DefinitionsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/flows/definitions")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((json: DefinitionsData) => setData(json))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  const activeValue = data ? `${data.activeCount} / ${data.totalCount}` : "--";
  const activeSubtext = data ? "enabled / total" : "Data unavailable";

  const nextRunValue = data?.nextRun
    ? fmtRelativeFuture(data.nextRun.scheduledAt)
    : "--";
  const nextRunSubtext = data?.nextRun
    ? data.nextRun.flowName
    : data
      ? "No scheduled flows"
      : "Data unavailable";

  const schedValue =
    data && (data.cronCount > 0 || data.oneOffCount > 0)
      ? [
          data.cronCount > 0 ? `${data.cronCount} cron` : null,
          data.oneOffCount > 0 ? `${data.oneOffCount} one-off` : null,
        ]
          .filter(Boolean)
          .join(" · ")
      : "--";

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
      <KpiCard label="Active Flows" value={activeValue} subtext={activeSubtext} />
      <KpiCard label="Next Scheduled Run" value={nextRunValue} subtext={nextRunSubtext} />
      <KpiCard label="Schedules" value={schedValue} />
    </div>
  );
}
