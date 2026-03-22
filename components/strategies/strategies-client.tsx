"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { StrategyDrawer } from "./strategy-drawer";

export type StrategyEntry = {
  id: string;
  type: string;
  subject: string;
  description: string;
  content: string;
  createdAt: string;
  deletedAt: string | null;
  superseded: boolean;
};

type StrategiesResponse = {
  strategies: StrategyEntry[];
  total: number;
};

export const TYPE_LABELS: Record<string, string> = {
  stock: "Stock",
  industry: "Industry",
  portfolio: "Portfolio",
  risk_management: "Risk Management",
  other: "Other",
};

export const TYPE_COLORS: Record<string, string> = {
  stock: "bg-cat-stock text-cat-stock-fg",
  industry: "bg-cat-industry text-cat-industry-fg",
  portfolio: "bg-cat-market text-cat-market-fg",
  risk_management: "bg-cat-mistakes text-cat-mistakes-fg",
  other: "bg-cat-other text-cat-other-fg",
};

const ALL_TYPES = Object.keys(TYPE_LABELS);

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function TableSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

export function StrategiesClient() {
  const searchParams = useSearchParams();

  const [inputValue, setInputValue] = useState(() => {
    return searchParams.get("q") ?? searchParams.get("subject") ?? "";
  });
  const [query, setQuery] = useState(() => {
    return searchParams.get("q") ?? searchParams.get("subject") ?? "";
  });
  const [selectedTypes, setSelectedTypes] = useState<string[]>(() => {
    const t = searchParams.get("type");
    return t ? [t] : [];
  });
  const [showSuperseded, setShowSuperseded] = useState(false);
  const [data, setData] = useState<StrategiesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<StrategyEntry | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const q = searchParams.get("q") ?? searchParams.get("subject") ?? "";
    const t = searchParams.get("type");
    setInputValue(q);
    setQuery(q);
    setSelectedTypes(t ? [t] : []);
  }, [searchParams]);

  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setQuery(value);
    }, 300);
  }, []);

  const toggleType = useCallback((t: string) => {
    setSelectedTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchData() {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (selectedTypes.length === 1) params.set("type", selectedTypes[0]);
      if (showSuperseded) params.set("showSuperseded", "true");

      try {
        const res = await fetch(`/api/strategies?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("Failed to fetch");
        const json: StrategiesResponse = await res.json();
        setData(json);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError("Failed to load strategies.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();

    return () => {
      controller.abort();
    };
  }, [query, selectedTypes, showSuperseded]);

  return (
    <>
      {/* Filter Bar */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search strategies..."
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {ALL_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => toggleType(t)}
              type="button"
            >
              <Badge
                className={
                  selectedTypes.includes(t)
                    ? TYPE_COLORS[t]
                    : "opacity-50 " + TYPE_COLORS[t]
                }
              >
                {TYPE_LABELS[t]}
              </Badge>
            </button>
          ))}
          <Button
            variant={showSuperseded ? "secondary" : "outline"}
            size="sm"
            onClick={() => setShowSuperseded((v) => !v)}
            className="ml-1 text-xs h-6 px-2"
          >
            Show superseded
          </Button>
          {data && !loading && (
            <span className="ml-auto text-sm text-muted-foreground">
              {data.total} {data.total === 1 ? "strategy" : "strategies"}
            </span>
          )}
        </div>
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

      {/* Strategies Table */}
      {!error && (
        <Card>
          <CardHeader>
            <CardTitle>Strategies</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <TableSkeleton />
            ) : !data || data.strategies.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-muted-foreground">
                No strategies found
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="hidden md:table-cell">Description</TableHead>
                    <TableHead className="text-right">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.strategies.map((strategy) => (
                    <TableRow
                      key={strategy.id}
                      className={`cursor-pointer${strategy.superseded ? " opacity-60" : ""}`}
                      onClick={() => setSelectedEntry(strategy)}
                    >
                      <TableCell className="font-mono max-w-xs truncate">
                        {strategy.subject}
                        {strategy.superseded && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            Superseded
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={TYPE_COLORS[strategy.type]}>
                          {TYPE_LABELS[strategy.type] ?? strategy.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-md truncate">
                        {strategy.description}
                      </TableCell>
                      <TableCell className="text-right text-sm whitespace-nowrap">
                        {fmtDate(strategy.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Detail Drawer */}
      <StrategyDrawer
        strategy={selectedEntry}
        onClose={() => setSelectedEntry(null)}
      />
    </>
  );
}
