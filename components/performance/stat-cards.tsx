import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { TradeStatistics } from "@/lib/stats"

type StatCardsProps = {
  // Return metrics
  totalReturn: number | null
  annualizedReturn: number | null
  bestMonth: number | null
  worstMonth: number | null
  avgMonthlyReturn: number | null
  pctMonthsPositive: number | null
  maxDrawdownPct: number | null
  maxDrawdownPeakDate: string | null
  maxDrawdownTroughDate: string | null
  // Trade metrics
  stats: TradeStatistics | null
  asOf?: string
}

function fmt(v: number | null, formatter: (n: number) => string, fallback = "--"): string {
  return v !== null ? formatter(v) : fallback
}

function fmtPct(v: number, sign = true): string {
  const s = sign && v >= 0 ? "+" : ""
  return `${s}${v.toFixed(2)}%`
}

function fmtDollar(v: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v)
}

type StatRowProps = {
  label: string
  value: string
  valueColor?: "green" | "red" | "default"
}

function StatRow({ label, value, valueColor = "default" }: StatRowProps) {
  const colorClass =
    valueColor === "green"
      ? "text-emerald-500"
      : valueColor === "red"
        ? "text-red-500"
        : "text-foreground"
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-mono tabular-nums ${colorClass}`}>{value}</span>
    </div>
  )
}

export function StatCards({
  totalReturn,
  annualizedReturn,
  bestMonth,
  worstMonth,
  avgMonthlyReturn,
  pctMonthsPositive,
  maxDrawdownPct,
  maxDrawdownPeakDate,
  maxDrawdownTroughDate,
  stats,
  asOf,
}: StatCardsProps) {
  const ddLabel =
    maxDrawdownPeakDate && maxDrawdownTroughDate
      ? `${maxDrawdownPeakDate} → ${maxDrawdownTroughDate}`
      : undefined

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Return metrics */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-baseline gap-2">
            <CardTitle className="text-sm font-medium">Returns</CardTitle>
            {asOf && <span className="text-xs text-muted-foreground font-normal">as of {asOf}</span>}
          </div>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          <StatRow
            label="Total return"
            value={fmt(totalReturn, (v) => fmtPct(v * 100))}
            valueColor={
              totalReturn !== null ? (totalReturn >= 0 ? "green" : "red") : "default"
            }
          />
          <StatRow
            label="Annualized return"
            value={fmt(annualizedReturn, (v) => fmtPct(v * 100))}
            valueColor={
              annualizedReturn !== null
                ? annualizedReturn >= 0
                  ? "green"
                  : "red"
                : "default"
            }
          />
          <StatRow
            label="Best month"
            value={fmt(bestMonth, (v) => fmtPct(v))}
            valueColor={bestMonth !== null && bestMonth > 0 ? "green" : "default"}
          />
          <StatRow
            label="Worst month"
            value={fmt(worstMonth, (v) => fmtPct(v))}
            valueColor={worstMonth !== null && worstMonth < 0 ? "red" : "default"}
          />
          <StatRow
            label="Avg monthly return"
            value={fmt(avgMonthlyReturn, (v) => fmtPct(v))}
            valueColor={
              avgMonthlyReturn !== null
                ? avgMonthlyReturn >= 0
                  ? "green"
                  : "red"
                : "default"
            }
          />
          <StatRow
            label="% months positive"
            value={fmt(pctMonthsPositive, (v) => `${v.toFixed(0)}%`)}
          />
          <div className="py-1.5">
            <StatRow
              label="Max drawdown"
              value={fmt(maxDrawdownPct, (v) => `-${(v * 100).toFixed(2)}%`)}
              valueColor={maxDrawdownPct !== null && maxDrawdownPct > 0 ? "red" : "default"}
            />
            {ddLabel && (
              <p className="text-right text-xs text-muted-foreground">{ddLabel}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Trade metrics */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-baseline gap-2">
            <CardTitle className="text-sm font-medium">Trades</CardTitle>
            {asOf && <span className="text-xs text-muted-foreground font-normal">as of {asOf}</span>}
          </div>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          <StatRow
            label="Total trades"
            value={stats ? String(stats.totalTrades) : "--"}
          />
          <StatRow
            label="Win rate"
            value={
              stats && stats.totalTrades >= 10
                ? `${(stats.winRate * 100).toFixed(1)}%`
                : stats && stats.totalTrades > 0
                  ? `${(stats.winRate * 100).toFixed(1)}% (${stats.totalTrades} trades)`
                  : "--"
            }
          />
          <StatRow
            label="Avg winner"
            value={stats && stats.avgWinner > 0 ? fmtDollar(stats.avgWinner) : "--"}
            valueColor={stats && stats.avgWinner > 0 ? "green" : "default"}
          />
          <StatRow
            label="Avg loser"
            value={stats && stats.avgLoser > 0 ? `-${fmtDollar(stats.avgLoser)}` : "--"}
            valueColor={stats && stats.avgLoser > 0 ? "red" : "default"}
          />
          <StatRow
            label="Profit factor"
            value={
              stats && stats.profitFactor > 0
                ? stats.profitFactor === Infinity
                  ? "∞"
                  : stats.profitFactor.toFixed(2)
                : "--"
            }
            valueColor={
              stats && stats.profitFactor > 1
                ? "green"
                : stats && stats.profitFactor > 0
                  ? "red"
                  : "default"
            }
          />
          <StatRow
            label="Avg holding period"
            value={
              stats && stats.totalTrades > 0
                ? `${stats.avgHoldingPeriodDays.toFixed(1)}d`
                : "--"
            }
          />
          <StatRow
            label="Largest win"
            value={stats && stats.largestWin > 0 ? fmtDollar(stats.largestWin) : "--"}
            valueColor={stats && stats.largestWin > 0 ? "green" : "default"}
          />
          <StatRow
            label="Largest loss"
            value={stats && stats.largestLoss > 0 ? `-${fmtDollar(stats.largestLoss)}` : "--"}
            valueColor={stats && stats.largestLoss > 0 ? "red" : "default"}
          />
        </CardContent>
      </Card>
    </div>
  )
}
