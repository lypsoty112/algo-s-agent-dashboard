import { Suspense } from "react"
import { cacheLife } from "next/cache"
import { getAccount, getPortfolioHistory, getPositions, getRecentOrders } from "@/lib/alpaca"
import { db, safeQuery } from "@/lib/db"
import { computeWinRateFromOrders } from "@/lib/stats"
import { KpiStrip } from "@/components/overview/kpi-strip"
import { SystemSnapshot } from "@/components/overview/system-snapshot"
import { OverviewClient } from "@/components/overview/overview-client"
import { Skeleton } from "@/components/ui/skeleton"
import { formatAsOf } from "@/lib/format"

async function getOverviewData() {
  "use cache"
  cacheLife({ stale: 60, revalidate: 60, expire: 300 })

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const [
    accountResult,
    historyResult,
    positionsResult,
    ordersResult,
    strategiesResult,
    kbTotalResult,
    kbRecentResult,
  ] = await Promise.allSettled([
    getAccount(),
    getPortfolioHistory({ period: "1A", timeframe: "1D" }),
    getPositions(),
    getRecentOrders(200),
    safeQuery(
      () => db.strategy.count({ where: { deletedAt: null } }),
      "strategies",
    ),
    safeQuery(
      () => db.knowledgeBase.count({ where: { deletedAt: null } }),
      "kbTotal",
    ),
    safeQuery(
      () =>
        db.knowledgeBase.count({
          where: { deletedAt: null, createdAt: { gte: sevenDaysAgo } },
        }),
      "kbRecent",
    ),
  ])

  const account =
    accountResult.status === "fulfilled" ? accountResult.value : null
  const history =
    historyResult.status === "fulfilled" ? historyResult.value : null
  const positions =
    positionsResult.status === "fulfilled" ? positionsResult.value : []

  // ordersResult comes back newest-first from Alpaca (direction=desc)
  const alpacaOrders =
    ordersResult.status === "fulfilled" ? ordersResult.value : []

  // Compute win rate — algorithm expects chronological order
  const { winRate, totalTrades } = computeWinRateFromOrders(
    alpacaOrders.slice().reverse(),
  )

  // Last filled order (first element since list is newest-first)
  const lastFilledOrder =
    alpacaOrders.find((o) => o.status === "filled" && o.filled_at) ?? null

  // DB results always resolve (safeQuery never throws)
  const strategies =
    strategiesResult.status === "fulfilled"
      ? strategiesResult.value.data
      : null
  const kbTotal =
    kbTotalResult.status === "fulfilled" ? kbTotalResult.value.data : null
  const kbRecent =
    kbRecentResult.status === "fulfilled" ? kbRecentResult.value.data : null

  // KPI calculations
  const portfolioValue = account ? parseFloat(account.equity) : null

  let mtdReturn: number | null = null
  let totalReturn: number | null = null

  if (history && history.equity.length >= 2 && history.timestamp.length >= 2) {
    const equities = history.equity
    const timestamps = history.timestamp

    // Skip leading zero-equity values (pre-funding period)
    const firstNonZeroIdx = equities.findIndex((e) => e > 0)
    if (firstNonZeroIdx >= 0) {
      const startEquity = equities[firstNonZeroIdx]
      const lastEquity = equities.at(-1)!

      if (startEquity > 0) {
        totalReturn = (lastEquity - startEquity) / startEquity
      }

      // MTD return
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)
      const startOfMonthTs = startOfMonth.getTime() / 1000

      const firstMtdIdx = timestamps.findIndex((ts) => ts >= startOfMonthTs)
      if (
        firstMtdIdx >= 0 &&
        firstMtdIdx < equities.length - 1 &&
        equities[firstMtdIdx] > 0
      ) {
        mtdReturn =
          (lastEquity - equities[firstMtdIdx]) / equities[firstMtdIdx]
      }
    }
  }

  const unrealizedPnl =
    positions.length > 0
      ? positions.reduce((sum, p) => sum + parseFloat(p.unrealized_pl), 0)
      : null

  return {
    portfolioValue,
    mtdReturn,
    totalReturn,
    winRate,
    totalTrades,
    activeStrategies: strategies,
    kbTotal,
    kbRecent,
    openPositions: positions.length,
    unrealizedPnl,
    lastTradeDate: lastFilledOrder?.filled_at ?? null,
    portfolio: history
      ? { timestamps: history.timestamp, equities: history.equity }
      : null,
  }
}

export default async function OverviewPage() {
  const data = await getOverviewData()
  const asOf = data.portfolio?.timestamps.at(-1)
    ? formatAsOf(data.portfolio.timestamps.at(-1)!)
    : undefined

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>

      <KpiStrip
        portfolioValue={data.portfolioValue}
        mtdReturn={data.mtdReturn}
        totalReturn={data.totalReturn}
        winRate={data.winRate}
        totalTrades={data.totalTrades}
        asOf={asOf}
      />

      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          {data.portfolio ? (
            <Suspense
              fallback={
                <Skeleton className="h-full min-h-[400px] rounded-xl" />
              }
            >
              <OverviewClient portfolio={data.portfolio} />
            </Suspense>
          ) : (
            <div className="flex h-full min-h-[400px] items-center justify-center rounded-xl border border-border text-sm text-muted-foreground">
              Portfolio data unavailable
            </div>
          )}
        </div>

        <div className="lg:col-span-5">
          <Suspense
            fallback={
              <Skeleton className="h-full min-h-[400px] rounded-xl" />
            }
          >
            <SystemSnapshot
              activeStrategies={data.activeStrategies}
              kbTotal={data.kbTotal}
              kbRecent={data.kbRecent}
              openPositions={data.openPositions}
              unrealizedPnl={data.unrealizedPnl}
              lastTradeDate={data.lastTradeDate}
              asOf={asOf}
            />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
