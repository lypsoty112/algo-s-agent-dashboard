"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EquityCurve } from "@/components/charts/equity-curve"

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
        <CardTitle className="text-sm font-medium">Performance</CardTitle>
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
