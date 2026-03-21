import { cacheLife } from "next/cache"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Suspense } from "react"
import { getPortfolioHistory, getHistoricalBars, getRecentOrders } from "@/lib/alpaca"
import type { AlpacaBar } from "@/lib/alpaca"
import {
  computeReturns,
  computeTradeRecords,
  annualizedReturn,
  sharpeRatio,
  sortinoRatio,
  maxDrawdown,
  monthlyReturns,
  tradeStats,
} from "@/lib/stats"
import { PerformanceClient } from "@/components/performance/performance-client"
import { MonthlyReturnsTable } from "@/components/performance/monthly-returns-table"
import { StatCards } from "@/components/performance/stat-cards"
import { RiskCards } from "@/components/performance/risk-cards"
import { TradeScatter } from "@/components/charts/trade-scatter"

function barMonthlyMap(bars: AlpacaBar[]): Map<string, number> {
  const monthMap = new Map<string, { first: number; last: number }>()
  for (const bar of bars) {
    const d = new Date(bar.t)
    const month = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
    const existing = monthMap.get(month)
    if (!existing) {
      monthMap.set(month, { first: bar.c, last: bar.c })
    } else {
      existing.last = bar.c
    }
  }
  const result = new Map<string, number>()
  for (const [month, { first, last }] of monthMap) {
    result.set(month, first > 0 ? ((last - first) / first) * 100 : 0)
  }
  return result
}

function formatDateFromTs(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  })
}

async function getPerformanceData() {
  "use cache"
  cacheLife({ stale: 60, revalidate: 60, expire: 300 })

  const oneYearAgo = new Date(Date.now() - 366 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)

  const [historyResult, spyBarsResult, ordersResult] = await Promise.allSettled([
    getPortfolioHistory({ period: "1A", timeframe: "1D" }),
    getHistoricalBars("SPY", { start: oneYearAgo, timeframe: "1Day" }),
    getRecentOrders(500),
  ])

  const history =
    historyResult.status === "fulfilled" ? historyResult.value : null
  const spyBars =
    spyBarsResult.status === "fulfilled" ? spyBarsResult.value : []
  // Orders come back newest-first; reverse for chronological FIFO matching
  const alpacaOrders =
    ordersResult.status === "fulfilled" ? ordersResult.value.slice().reverse() : []
  const tradesRaw = computeTradeRecords(alpacaOrders)

  // Equity arrays — skip leading zero values
  const equities = history?.equity ?? []
  const timestamps = history?.timestamp ?? []
  const firstNonZeroIdx = equities.findIndex((e) => e > 0)
  const validEquities =
    firstNonZeroIdx >= 0 ? equities.slice(firstNonZeroIdx) : equities
  const validTimestamps =
    firstNonZeroIdx >= 0 ? timestamps.slice(firstNonZeroIdx) : timestamps

  // Risk metrics
  const returns = computeReturns(validEquities)
  const annRet = returns.length >= 2 ? annualizedReturn(returns) : null
  const sharpe = sharpeRatio(returns)
  const sortino = sortinoRatio(returns)
  const { maxDrawdownPct, peakIndex, troughIndex } = maxDrawdown(validEquities)

  const totalReturn =
    validEquities.length >= 2 && validEquities[0] > 0
      ? (validEquities.at(-1)! - validEquities[0]) / validEquities[0]
      : null

  const ddPeakDate =
    validTimestamps.length > peakIndex
      ? formatDateFromTs(validTimestamps[peakIndex])
      : null
  const ddTroughDate =
    validTimestamps.length > troughIndex
      ? formatDateFromTs(validTimestamps[troughIndex])
      : null

  // Monthly returns
  const portfolioMonthly = monthlyReturns(validTimestamps, validEquities)
  const spyMonthly = barMonthlyMap(spyBars)

  const now = new Date()
  const currentMonthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`

  let cumulative = 1
  const monthlyRows = portfolioMonthly.map((m) => {
    const isMtd = m.month === currentMonthKey
    if (!isMtd) cumulative *= 1 + m.returnPct / 100
    const spy = spyMonthly.get(m.month) ?? null
    return {
      month: m.month,
      portfolioReturn: m.returnPct,
      spyReturn: spy,
      delta: spy !== null ? m.returnPct - spy : null,
      cumulativeReturn: (cumulative - 1) * 100,
      isMtd,
    }
  })

  const completedMonths = portfolioMonthly.filter((m) => m.month !== currentMonthKey)
  const bestMonth =
    completedMonths.length > 0
      ? Math.max(...completedMonths.map((m) => m.returnPct))
      : null
  const worstMonth =
    completedMonths.length > 0
      ? Math.min(...completedMonths.map((m) => m.returnPct))
      : null
  const avgMonthly =
    completedMonths.length > 0
      ? completedMonths.reduce((a, m) => a + m.returnPct, 0) / completedMonths.length
      : null
  const pctPositive =
    completedMonths.length > 0
      ? (completedMonths.filter((m) => m.returnPct > 0).length / completedMonths.length) * 100
      : null

  // Trade stats
  const trades = tradesRaw.map((t) => ({
    pnl: t.pnl,
    pnl_pct: 0,
    holding_period_days: t.holdingDays,
  }))

  const stats = trades.length > 0 ? tradeStats(trades) : null

  // Scatter data
  const scatterTrades = tradesRaw.map((t) => ({
    symbol: t.symbol,
    entryDate: t.openedAt.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    holdingDays: t.holdingDays,
    pnl: t.pnl,
  }))

  return {
    portfolio: history
      ? { timestamps: validTimestamps, equities: validEquities }
      : null,
    totalReturn,
    annualizedReturn: annRet,
    sharpe,
    sortino,
    maxDrawdownPct,
    ddPeakDate,
    ddTroughDate,
    bestMonth,
    worstMonth,
    avgMonthly,
    pctPositive,
    monthlyRows,
    stats,
    scatterTrades,
    insufficientReturns: returns.length < 10,
  }
}

export default async function PerformancePage() {
  const data = await getPerformanceData()

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight">Performance</h1>

      {/* Risk metrics strip */}
      <RiskCards
        sharpe={data.sharpe}
        sortino={data.sortino}
        maxDrawdownPct={data.maxDrawdownPct}
        insufficientData={data.insufficientReturns}
      />

      {/* Equity curve */}
      {data.portfolio ? (
        <Suspense fallback={<Skeleton className="h-[420px] rounded-xl" />}>
          <PerformanceClient portfolio={data.portfolio} />
        </Suspense>
      ) : (
        <div className="flex h-[420px] items-center justify-center rounded-xl border border-border text-sm text-muted-foreground">
          Portfolio data unavailable
        </div>
      )}

      {/* Return + trade stat cards */}
      <StatCards
        totalReturn={data.totalReturn}
        annualizedReturn={data.annualizedReturn}
        bestMonth={data.bestMonth}
        worstMonth={data.worstMonth}
        avgMonthlyReturn={data.avgMonthly}
        pctMonthsPositive={data.pctPositive}
        maxDrawdownPct={data.maxDrawdownPct}
        maxDrawdownPeakDate={data.ddPeakDate}
        maxDrawdownTroughDate={data.ddTroughDate}
        stats={data.stats}
      />

      {/* Monthly returns table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Monthly Returns</CardTitle>
        </CardHeader>
        <CardContent>
          <MonthlyReturnsTable rows={data.monthlyRows} />
        </CardContent>
      </Card>

      {/* Trade scatter */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Trade P&amp;L vs Holding Period
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TradeScatter trades={data.scatterTrades} />
        </CardContent>
      </Card>
    </div>
  )
}
