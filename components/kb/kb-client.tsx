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
import { EntryDrawer } from "./entry-drawer";

export type KBEntry = {
  id: string;
  category: string;
  subject: string;
  description: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

type KBResponse = {
  entries: KBEntry[];
  total: number;
  page: number;
  pageSize: number;
};

export const CATEGORY_LABELS: Record<string, string> = {
  stock_specific: "Stock Specific",
  general_market: "General Market",
  industry: "Industry",
  mistakes: "Mistakes",
  system: "System",
  other: "Other",
};

const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS);

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

export function KBClient() {
  const searchParams = useSearchParams();

  const [inputValue, setInputValue] = useState(searchParams.get("q") ?? "");
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(() => {
    const cats = searchParams.get("categories");
    return cats ? cats.split(",").filter(Boolean) : [];
  });
  const [page, setPage] = useState(1);
  const [data, setData] = useState<KBResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<KBEntry | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setQuery(value);
      setPage(1);
    }, 300);
  }, []);

  const toggleCategory = useCallback((cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
    setPage(1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchData() {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set("page", String(page));
      if (query) params.set("q", query);
      if (selectedCategories.length > 0) {
        params.set("categories", selectedCategories.join(","));
      }

      try {
        const res = await fetch(`/api/knowledge-base?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("Failed to fetch");
        const json: KBResponse = await res.json();
        setData(json);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError("Failed to load knowledge base entries.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();

    return () => {
      controller.abort();
    };
  }, [query, selectedCategories, page]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <>
      {/* Filter Bar */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search entries..."
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {ALL_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              type="button"
            >
              <Badge
                variant={selectedCategories.includes(cat) ? "secondary" : "outline"}
              >
                {CATEGORY_LABELS[cat]}
              </Badge>
            </button>
          ))}
          {data && !loading && (
            <span className="ml-auto text-sm text-muted-foreground">
              {data.total} {data.total === 1 ? "entry" : "entries"}
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

      {/* Entry Table */}
      {!error && (
        <Card>
          <CardHeader>
            <CardTitle>Entries</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <TableSkeleton />
            ) : !data || data.entries.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-muted-foreground">
                No knowledge base entries found
              </p>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="hidden md:table-cell">Description</TableHead>
                      <TableHead className="text-right">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.entries.map((entry) => (
                      <TableRow
                        key={entry.id}
                        className="cursor-pointer"
                        onClick={() => setSelectedEntry(entry)}
                      >
                        <TableCell className="font-mono font-semibold max-w-xs truncate">
                          {entry.subject}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {CATEGORY_LABELS[entry.category] ?? entry.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-md truncate">
                          {entry.description}
                        </TableCell>
                        <TableCell className="text-right text-sm whitespace-nowrap">
                          {fmtDate(entry.createdAt)}
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

      {/* Detail Drawer */}
      <EntryDrawer
        entry={selectedEntry}
        onClose={() => setSelectedEntry(null)}
      />
    </>
  );
}
