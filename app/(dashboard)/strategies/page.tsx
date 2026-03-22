import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { StrategiesClient } from "@/components/strategies/strategies-client";

function StrategiesSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-full" />
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
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

export default function StrategiesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Strategies</h1>
      <Suspense fallback={<StrategiesSkeleton />}>
        <StrategiesClient />
      </Suspense>
    </div>
  );
}
