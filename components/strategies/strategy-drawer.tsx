"use client";

import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { TYPE_LABELS, TYPE_COLORS, type StrategyEntry } from "./strategies-client";

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function MetricRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-mono text-sm font-medium tabular-nums">{value}</p>
    </div>
  );
}

type StrategyDrawerProps = {
  strategy: StrategyEntry | null;
  onClose: () => void;
};

export function StrategyDrawer({ strategy, onClose }: StrategyDrawerProps) {
  return (
    <Sheet
      open={strategy !== null}
      modal={false}
      onOpenChange={(open: boolean) => {
        if (!open) onClose();
      }}
    >
      {strategy && (
        <SheetContent side="right" showOverlay={false} className="w-full sm:max-w-md overflow-y-auto p-0">
          <SheetHeader className="px-4 pt-4 pb-2">
            <SheetTitle>{strategy.subject}</SheetTitle>
            <SheetDescription className="flex flex-wrap items-center gap-2">
              <Badge className={TYPE_COLORS[strategy.type]}>
                {TYPE_LABELS[strategy.type] ?? strategy.type}
              </Badge>
              {strategy.superseded && (
                <Badge variant="outline" className="text-xs">Superseded</Badge>
              )}
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-4 px-4 pb-6 overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              <MetricRow label="Created" value={fmtDate(strategy.createdAt)} />
              <MetricRow
                label="Status"
                value={strategy.superseded ? "Superseded" : "Active"}
              />
            </div>

            <Separator />

            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Navigate
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/knowledge-base?q=${encodeURIComponent(strategy.subject)}`}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  View in Knowledge Base
                </Link>
                <Link
                  href="/positions"
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  View in Positions
                </Link>
              </div>
            </div>

            <Separator />

            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Description
              </p>
              <p className="text-sm mt-1">{strategy.description}</p>
            </div>

            <Separator />

            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Content
              </p>
              <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none text-sm mt-1">
                <ReactMarkdown>{strategy.content}</ReactMarkdown>
              </div>
            </div>
          </div>
        </SheetContent>
      )}
    </Sheet>
  );
}
