import { Card, CardContent } from "@/components/ui/card"

type KpiStripProps = {
  portfolioValue: number | null
  mtdReturn: number | null
  totalReturn: number | null
  winRate: number | null
  totalTrades: number
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? "+" : ""
  return `${sign}${(value * 100).toFixed(2)}%`
}

type KpiCardProps = {
  label: string
  value: string
  subtext?: string
  valueColor?: "green" | "red" | "default"
}

function KpiCard({ label, value, subtext, valueColor = "default" }: KpiCardProps) {
  const colorClass =
    valueColor === "green"
      ? "text-emerald-500"
      : valueColor === "red"
        ? "text-red-500"
        : ""

  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p
          className={`mt-1 font-mono text-2xl font-semibold tabular-nums ${colorClass}`}
        >
          {value}
        </p>
        {subtext && (
          <p className="mt-1 text-xs text-muted-foreground">{subtext}</p>
        )}
      </CardContent>
    </Card>
  )
}

export function KpiStrip({
  portfolioValue,
  mtdReturn,
  totalReturn,
  winRate,
  totalTrades,
}: KpiStripProps) {
  const winRateSubtext =
    totalTrades === 0
      ? "No closed trades yet"
      : totalTrades < 10
        ? `${totalTrades} trade${totalTrades === 1 ? "" : "s"}`
        : `${totalTrades} trades`

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <KpiCard
        label="Portfolio Value"
        value={portfolioValue !== null ? formatCurrency(portfolioValue) : "--"}
      />
      <KpiCard
        label="MTD Return"
        value={mtdReturn !== null ? formatPercent(mtdReturn) : "--"}
        valueColor={
          mtdReturn !== null ? (mtdReturn >= 0 ? "green" : "red") : "default"
        }
      />
      <KpiCard
        label="Total Return (1Y)"
        value={totalReturn !== null ? formatPercent(totalReturn) : "--"}
        valueColor={
          totalReturn !== null
            ? totalReturn >= 0
              ? "green"
              : "red"
            : "default"
        }
      />
      <KpiCard
        label="Win Rate"
        value={winRate !== null ? `${(winRate * 100).toFixed(1)}%` : "--"}
        subtext={winRateSubtext}
      />
    </div>
  )
}
