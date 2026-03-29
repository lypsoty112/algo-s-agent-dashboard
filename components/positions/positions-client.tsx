"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

export type Position = {
  symbol: string;
  qty: string;
  side: string;
  avg_entry_price: number;
  current_price: number;
  market_value: number;
  unrealized_pl: number;
  unrealized_plpc: number;
  change_today: number;
};

// Derived from computeTradeRecords() — Alpaca orders, not DB
export type ClosedTrade = {
  symbol: string;
  pnl: number;
  openedAt: string; // ISO date string
  closedAt: string; // ISO date string
  holdingDays: number;
};

type DrawerItem =
  | { kind: "position"; data: Position }
  | { kind: "trade"; data: ClosedTrade };

type PositionsClientProps = {
  positions: Position[];
  trades: ClosedTrade[];
};

const PAGE_SIZE = 20;

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtCurrency(n: number, decimals = 2): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

function fmtPnl(pl: number, plpc: number): string {
  const sign = pl >= 0 ? "+" : "";
  return `${sign}${fmtCurrency(pl)} (${sign}${(plpc * 100).toFixed(2)}%)`;
}

function PlCell({ value, pct }: { value: number; pct?: number }) {
  const color = value >= 0 ? "text-emerald-500" : "text-red-500";
  return (
    <span className={`font-mono tabular-nums ${color}`}>
      {pct !== undefined ? fmtPnl(value, pct) : fmtCurrency(value)}
    </span>
  );
}

function PctCell({ value }: { value: number }) {
  const color = value >= 0 ? "text-emerald-500" : "text-red-500";
  return (
    <span className={`font-mono tabular-nums ${color}`}>
      {`${value >= 0 ? "+" : ""}${(value * 100).toFixed(2)}%`}
    </span>
  );
}

function MetricRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-mono text-sm font-medium tabular-nums">{value}</p>
    </div>
  );
}

type RationaleState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; text: string | null };

function RationaleSection({ state }: { state: RationaleState }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Agent Rationale
      </p>
      {state.status === "loading" && (
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
      )}
      {state.status === "done" && state.text && (
        <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none text-sm">
          <ReactMarkdown>{state.text}</ReactMarkdown>
        </div>
      )}
      {state.status === "done" && !state.text && (
        <p className="text-sm text-muted-foreground">No rationale available.</p>
      )}
    </div>
  );
}

function DrawerBody({ item }: { item: DrawerItem }) {
  const [rationale, setRationale] = useState<RationaleState>({ status: "idle" });

  useEffect(() => {
    const symbol = item.data.symbol;
    const after = item.kind === "trade" ? item.data.openedAt : undefined;

    setRationale({ status: "loading" });

    const url = new URL("/api/rationale", window.location.origin);
    url.searchParams.set("symbol", symbol);
    if (after) url.searchParams.set("after", after);

    fetch(url.toString())
      .then((r) => r.json())
      .then((json: { rationale: string | null }) => {
        setRationale({ status: "done", text: json.rationale });
      })
      .catch(() => {
        setRationale({ status: "done", text: null });
      });
  }, [item]);

  if (item.kind === "position") {
    const p = item.data;
    return (
      <div className="flex flex-col gap-4 px-4 pb-6 overflow-y-auto">
        <div className="grid grid-cols-2 gap-3">
          <MetricRow label="Side" value={<Badge variant="secondary">{p.side}</Badge>} />
          <MetricRow label="Quantity" value={Math.abs(parseFloat(p.qty))} />
          <MetricRow label="Avg Entry" value={fmtCurrency(p.avg_entry_price)} />
          <MetricRow label="Current Price" value={fmtCurrency(p.current_price)} />
          <MetricRow label="Market Value" value={fmtCurrency(Math.abs(p.market_value), 0)} />
          <MetricRow
            label="Unrealized P&L"
            value={<PlCell value={p.unrealized_pl} pct={p.unrealized_plpc} />}
          />
          <MetricRow label="Today" value={<PctCell value={p.change_today} />} />
        </div>

        <Separator />

        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Navigate
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/knowledge-base?q=${encodeURIComponent(p.symbol)}`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              View in Knowledge Base
            </Link>
            <Link
              href={`/strategies?subject=${encodeURIComponent(p.symbol)}`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              View in Strategies
            </Link>
          </div>
        </div>

        <Separator />

        <RationaleSection state={rationale} />
      </div>
    );
  }

  const t = item.data;
  return (
    <div className="flex flex-col gap-4 px-4 pb-6 overflow-y-auto">
      <div className="grid grid-cols-2 gap-3">
        <MetricRow label="Opened" value={fmtDate(t.openedAt)} />
        <MetricRow label="Closed" value={fmtDate(t.closedAt)} />
        <MetricRow
          label="Holding Period"
          value={`${t.holdingDays} day${t.holdingDays === 1 ? "" : "s"}`}
        />
        <MetricRow
          label="P&L"
          value={<PlCell value={t.pnl} />}
        />
      </div>

      <Separator />

      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Navigate
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/knowledge-base?q=${encodeURIComponent(t.symbol)}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            View in Knowledge Base
          </Link>
          <Link
            href={`/strategies?subject=${encodeURIComponent(t.symbol)}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            View in Strategies
          </Link>
        </div>
      </div>

      <Separator />

      <RationaleSection state={rationale} />
    </div>
  );
}

export function PositionsClient({ positions, trades }: PositionsClientProps) {
  const [drawerItem, setDrawerItem] = useState<DrawerItem | null>(null);
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(trades.length / PAGE_SIZE));
  const pagedTrades = trades.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      {/* Open Positions Table */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Open Positions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {positions.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">
              No open positions
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Side</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Avg Entry</TableHead>
                  <TableHead className="text-right">Current</TableHead>
                  <TableHead className="text-right">Mkt Value</TableHead>
                  <TableHead className="text-right">P&amp;L</TableHead>
                  <TableHead className="text-right">Today</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positions.map((p) => (
                  <TableRow
                    key={p.symbol}
                    className="cursor-pointer"
                    onClick={() => setDrawerItem({ kind: "position", data: p })}
                  >
                    <TableCell className="font-mono font-semibold">{p.symbol}</TableCell>
                    <TableCell>
                      <Badge variant={p.side === "long" ? "secondary" : "outline"}>
                        {p.side}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{Math.abs(parseFloat(p.qty))}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {fmtCurrency(p.avg_entry_price)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {fmtCurrency(p.current_price)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {fmtCurrency(Math.abs(p.market_value), 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      <PlCell value={p.unrealized_pl} pct={p.unrealized_plpc} />
                    </TableCell>
                    <TableCell className="text-right">
                      <PctCell value={p.change_today} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Closed Trades Table */}
      <Card>
        <CardHeader>
          <CardTitle>Closed Trades</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {trades.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">
              No closed trades yet
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Opened</TableHead>
                    <TableHead>Closed</TableHead>
                    <TableHead className="text-right">Holding</TableHead>
                    <TableHead className="text-right">P&amp;L</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedTrades.map((t, i) => (
                    <TableRow
                      key={`${t.symbol}-${t.closedAt}-${i}`}
                      className="cursor-pointer"
                      onClick={() => setDrawerItem({ kind: "trade", data: t })}
                    >
                      <TableCell className="font-mono font-semibold">{t.symbol}</TableCell>
                      <TableCell className="text-sm">{fmtDate(t.openedAt)}</TableCell>
                      <TableCell className="text-sm">{fmtDate(t.closedAt)}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-sm">
                        {t.holdingDays}d
                      </TableCell>
                      <TableCell className="text-right">
                        <PlCell value={t.pnl} />
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

      {/* Detail Drawer */}
      <Sheet
        open={drawerItem !== null}
        modal={false}
        onOpenChange={(open: boolean) => {
          if (!open) setDrawerItem(null);
        }}
      >
        {drawerItem && (
          <SheetContent side="right" showOverlay={false} className="w-full sm:max-w-md overflow-y-auto p-0">
            <SheetHeader className="px-4 pt-4 pb-2">
              <SheetTitle className="font-mono">{drawerItem.data.symbol}</SheetTitle>
              <SheetDescription>
                {drawerItem.kind === "position" ? "Open Position" : "Closed Trade"}
              </SheetDescription>
            </SheetHeader>
            <DrawerBody item={drawerItem} />
          </SheetContent>
        )}
      </Sheet>
    </>
  );
}
