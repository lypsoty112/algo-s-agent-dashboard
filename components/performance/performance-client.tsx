"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EquityCurve } from "@/components/charts/equity-curve"

type BenchmarkData = {
  spy: { timestamps: number[]; values: number[] }
  qqq: { timestamps: number[]; values: number[] }
}

type PerformanceClientProps = {
  portfolio: {
    timestamps: number[]
    equities: number[]
  }
}

export function PerformanceClient({ portfolio }: PerformanceClientProps) {
  const [benchmarkData, setBenchmarkData] = useState<BenchmarkData | null>(null)

  const firstTs = portfolio.timestamps[0]

  useEffect(() => {
    if (!firstTs) return

    const startDate = new Date(firstTs * 1000).toISOString().slice(0, 10)

    fetch(`/api/benchmark?start=${startDate}`)
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
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Equity Curve</CardTitle>
      </CardHeader>
      <CardContent>
        <EquityCurve
          portfolio={portfolio}
          spy={benchmarkData?.spy ?? null}
          qqq={benchmarkData?.qqq ?? null}
          defaultRange="All"
        />
      </CardContent>
    </Card>
  )
}
