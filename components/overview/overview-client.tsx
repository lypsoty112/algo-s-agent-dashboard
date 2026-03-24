"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EquityCurve } from "@/components/charts/equity-curve"
import { formatAsOf } from "@/lib/format"

type BenchmarkData = {
  spy: { timestamps: number[]; values: number[] }
  qqq: { timestamps: number[]; values: number[] }
}

type OverviewClientProps = {
  portfolio: {
    timestamps: number[]
    equities: number[]
  }
}

export function OverviewClient({ portfolio }: OverviewClientProps) {
  const [benchmarkData, setBenchmarkData] = useState<BenchmarkData | null>(
    null,
  )

  const firstTs = portfolio.timestamps[0]
  const lastTs = portfolio.timestamps.at(-1)
  const asOf = lastTs ? formatAsOf(lastTs) : undefined

  useEffect(() => {
    if (!firstTs) return

    const startDate = new Date(firstTs * 1000).toISOString().slice(0, 10)

    fetch(`/api/benchmark?start=${startDate}`, { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error("Benchmark fetch failed")
        return r.json() as Promise<BenchmarkData>
      })
      .then((data) => setBenchmarkData(data))
      .catch(() => {
        // Benchmark unavailable — chart shows portfolio only
      })
  }, [firstTs])

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-baseline gap-2">
          <CardTitle className="text-sm font-medium">Performance</CardTitle>
          {asOf && <span className="text-xs text-muted-foreground font-normal">as of {asOf}</span>}
        </div>
      </CardHeader>
      <CardContent>
        <EquityCurve
          portfolio={portfolio}
          spy={benchmarkData?.spy ?? null}
          qqq={benchmarkData?.qqq ?? null}
        />
      </CardContent>
    </Card>
  )
}
