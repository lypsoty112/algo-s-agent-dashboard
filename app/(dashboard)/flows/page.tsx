import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { FlowsClient } from "@/components/flows/flows-client";

function FlowsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
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

export default function FlowsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Flows</h1>
      <Suspense fallback={<FlowsSkeleton />}>
        <FlowsClient />
      </Suspense>
    </div>
  );
}
