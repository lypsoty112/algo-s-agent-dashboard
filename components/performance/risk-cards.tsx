import { ExternalLink } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

type RiskCardsProps = {
  sharpe: number | null
  sortino: number | null
  maxDrawdownPct: number | null
  insufficientData: boolean
  asOf?: string
}

type RiskCardProps = {
  label: string
  value: string
  subtext?: string
  hint?: string
  infoHref?: string
  valueColor?: "green" | "red" | "default"
}

function ratioHint(v: number): string {
  if (v < 0) return "Below risk-free rate"
  if (v < 1) return "Acceptable"
  if (v < 2) return "Good"
  return "Excellent"
}

function RiskCard({ label, value, subtext, hint, infoHref, valueColor = "default" }: RiskCardProps) {
  const colorClass =
    valueColor === "green"
      ? "text-emerald-500"
      : valueColor === "red"
        ? "text-red-500"
        : ""
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-1.5">
          <p className="text-sm text-muted-foreground">{label}</p>
          {infoHref && (
            <a
              href={infoHref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground/50 transition-colors hover:text-muted-foreground"
              aria-label={`Learn about ${label}`}
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
        <p className={`mt-1 font-mono text-2xl font-semibold tabular-nums ${colorClass}`}>
          {value}
        </p>
        {hint && (
          <p className={`mt-0.5 text-xs font-medium ${colorClass || "text-muted-foreground"}`}>
            {hint}
          </p>
        )}
        {subtext && (
          <p className="mt-1 text-xs text-muted-foreground">{subtext}</p>
        )}
      </CardContent>
    </Card>
  )
}

export function RiskCards({
  sharpe,
  sortino,
  maxDrawdownPct,
  insufficientData,
  asOf,
}: RiskCardsProps) {
  const insufficientNote = "Insufficient trade history"

  return (
    <div className="space-y-2">
      {asOf && (
        <p className="text-xs text-muted-foreground">as of {asOf}</p>
      )}
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <RiskCard
        label="Sharpe Ratio"
        infoHref="https://en.wikipedia.org/wiki/Sharpe_ratio"
        value={sharpe !== null ? sharpe.toFixed(2) : "--"}
        hint={sharpe !== null && !insufficientData ? ratioHint(sharpe) : undefined}
        subtext={insufficientData ? insufficientNote : "Annualized, 4.5% risk-free"}
        valueColor={
          sharpe !== null ? (sharpe >= 1 ? "green" : sharpe >= 0 ? "default" : "red") : "default"
        }
      />
      <RiskCard
        label="Sortino Ratio"
        infoHref="https://en.wikipedia.org/wiki/Sortino_ratio"
        value={sortino !== null ? sortino.toFixed(2) : "--"}
        hint={sortino !== null && !insufficientData ? ratioHint(sortino) : undefined}
        subtext={insufficientData ? insufficientNote : "Downside deviation only"}
        valueColor={
          sortino !== null
            ? sortino >= 1
              ? "green"
              : sortino >= 0
                ? "default"
                : "red"
            : "default"
        }
      />
      <RiskCard
        label="Max Drawdown"
        value={maxDrawdownPct !== null ? `-${(maxDrawdownPct * 100).toFixed(2)}%` : "--"}
        subtext="Peak-to-trough"
        valueColor={
          maxDrawdownPct !== null && maxDrawdownPct > 0 ? "red" : "default"
        }
      />
    </div>
    </div>
  )
}
