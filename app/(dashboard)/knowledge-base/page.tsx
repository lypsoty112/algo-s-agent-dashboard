import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { KBClient } from "@/components/kb/kb-client";

function KBSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-full" />
      <div className="flex gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-5 w-20" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}

export default function KnowledgeBasePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Knowledge Base</h1>
      <Suspense fallback={<KBSkeleton />}>
        <KBClient />
      </Suspense>
    </div>
  );
}
