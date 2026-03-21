"use client";

import ReactMarkdown from "react-markdown";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { CATEGORY_LABELS, type KBEntry } from "./kb-client";

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

type EntryDrawerProps = {
  entry: KBEntry | null;
  onClose: () => void;
};

export function EntryDrawer({ entry, onClose }: EntryDrawerProps) {
  return (
    <Sheet
      open={entry !== null}
      onOpenChange={(open: boolean) => {
        if (!open) onClose();
      }}
    >
      {entry && (
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto p-0">
          <SheetHeader className="px-4 pt-4 pb-2">
            <SheetTitle>{entry.subject}</SheetTitle>
            <SheetDescription>
              <Badge variant="secondary">
                {CATEGORY_LABELS[entry.category] ?? entry.category}
              </Badge>
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-4 px-4 pb-6 overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              <MetricRow label="Created" value={fmtDate(entry.createdAt)} />
              <MetricRow label="Updated" value={fmtDate(entry.updatedAt)} />
            </div>

            <Separator />

            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Description
              </p>
              <p className="text-sm mt-1">{entry.description}</p>
            </div>

            <Separator />

            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Content
              </p>
              <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none text-sm mt-1">
                <ReactMarkdown>{entry.content}</ReactMarkdown>
              </div>
            </div>
          </div>
        </SheetContent>
      )}
    </Sheet>
  );
}
