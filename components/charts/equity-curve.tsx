"use client"

import { useState, useMemo } from "react"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts"
import { Button } from "@/components/ui/button"

type TimeRange = "1M" | "3M" | "6M" | "1Y" | "All"

const TIME_RANGES: TimeRange[] = ["1M", "3M", "6M", "1Y", "All"]

type EquityCurveProps = {
  portfolio: { timestamps: number[]; equities: number[] }
  spy: { timestamps: number[]; values: number[] } | null
  qqq: { timestamps: number[]; values: number[] } | null
  defaultRange?: TimeRange
}

type ChartPoint = {
  ts: number
  date: string
  portfolio: number
  spy: number | null
  qqq: number | null
}

function getCutoffTimestamp(range: TimeRange): number {
  const now = Date.now() / 1000
  switch (range) {
    case "1M":
      return now - 30 * 24 * 3600
    case "3M":
      return now - 90 * 24 * 3600
    case "6M":
      return now - 180 * 24 * 3600
    case "1Y":
      return now - 365 * 24 * 3600
    case "All":
      return 0
  }
}

function formatShortDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

function buildChartData(
  portfolio: { timestamps: number[]; equities: number[] },
  spy: { timestamps: number[]; values: number[] } | null,
  qqq: { timestamps: number[]; values: number[] } | null,
  cutoff: number,
): ChartPoint[] {
  // Build date-keyed lookup maps for benchmarks
  const spyMap = new Map<string, number>()
  const qqqMap = new Map<string, number>()

  spy?.timestamps.forEach((ts, i) => {
    const key = new Date(ts * 1000).toISOString().slice(0, 10)
    spyMap.set(key, spy.values[i])
  })
  qqq?.timestamps.forEach((ts, i) => {
    const key = new Date(ts * 1000).toISOString().slice(0, 10)
    qqqMap.set(key, qqq.values[i])
  })

  // Filter portfolio to cutoff, skip leading zero-equity points
  const filtered = portfolio.timestamps
    .map((ts, i) => ({ ts, equity: portfolio.equities[i] }))
    .filter(({ ts, equity }) => ts >= cutoff && equity > 0)

  if (filtered.length === 0) return []

  // Normalize all three series to 100 at the cutoff point for apples-to-apples comparison
  const portfolioBase = filtered[0].equity
  const firstKey = new Date(filtered[0].ts * 1000).toISOString().slice(0, 10)
  const spyBase = spy ? (spyMap.get(firstKey) ?? null) : null
  const qqqBase = qqq ? (qqqMap.get(firstKey) ?? null) : null

  return filtered.map(({ ts, equity }) => {
    const key = new Date(ts * 1000).toISOString().slice(0, 10)
    const spyRaw = spyMap.get(key) ?? null
    const qqqRaw = qqqMap.get(key) ?? null

    return {
      ts,
      date: formatShortDate(ts),
      portfolio: (equity / portfolioBase) * 100,
      spy:
        spyRaw !== null && spyBase !== null && spyBase > 0
          ? (spyRaw / spyBase) * 100
          : null,
      qqq:
        qqqRaw !== null && qqqBase !== null && qqqBase > 0
          ? (qqqRaw / qqqBase) * 100
          : null,
    }
  })
}

interface TooltipProps {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border border-border bg-background/95 px-3 py-2 text-xs shadow-md">
      <p className="mb-1.5 font-medium text-foreground">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-mono font-medium tabular-nums">
            {entry.value.toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  )
}

export function EquityCurve({ portfolio, spy, qqq, defaultRange = "1Y" }: EquityCurveProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>(defaultRange)

  const chartData = useMemo(() => {
    return buildChartData(portfolio, spy, qqq, getCutoffTimestamp(timeRange))
  }, [portfolio, spy, qqq, timeRange])

  if (portfolio.timestamps.length === 0) {
    return (
      <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
        No portfolio history available
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-1">
        {TIME_RANGES.map((range) => (
          <Button
            key={range}
            variant={timeRange === range ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setTimeRange(range)}
          >
            {range}
          </Button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={chartData}
          margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
        >
          <CartesianGrid
            horizontal
            vertical={false}
            stroke="hsl(var(--border))"
          />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => v.toFixed(0)}
            width={45}
            domain={([dataMin, dataMax]: readonly [number, number]) => {
              const pad = (dataMax - dataMin) * 0.05
              return [
                Math.floor(dataMin - pad),
                Math.ceil(dataMax + pad),
              ] as [number, number]
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
          <Line
            type="monotone"
            dataKey="portfolio"
            name="Portfolio"
            stroke="#4ade80"
            strokeWidth={2}
            dot={false}
            connectNulls
            isAnimationActive={false}
          />
          {spy && (
            <Line
              type="monotone"
              dataKey="spy"
              name="SPY"
              stroke="#60a5fa"
              strokeWidth={1.5}
              dot={false}
              connectNulls
              isAnimationActive={false}
              strokeDasharray="4 4"
            />
          )}
          {qqq && (
            <Line
              type="monotone"
              dataKey="qqq"
              name="QQQ"
              stroke="#a78bfa"
              strokeWidth={1.5}
              dot={false}
              connectNulls
              isAnimationActive={false}
              strokeDasharray="4 4"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
