import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table"

type MonthRow = {
  month: string       // YYYY-MM
  portfolioReturn: number   // %
  spyReturn: number | null  // %
  delta: number | null      // %
  cumulativeReturn: number  // %
  isMtd: boolean
}

type MonthlyReturnsTableProps = {
  rows: MonthRow[]
}

function formatPct(v: number, sign = true): string {
  const s = sign && v >= 0 ? "+" : ""
  return `${s}${v.toFixed(2)}%`
}

function formatMonth(ym: string): string {
  const [year, month] = ym.split("-")
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" })
}

function returnColor(v: number): string {
  if (Math.abs(v) < 0.01) return ""
  const intensity = Math.min(Math.abs(v) / 10, 1) // 10% = max intensity
  if (v > 0) {
    return `text-emerald-${intensity > 0.5 ? "500" : "400"}`
  }
  return `text-red-${intensity > 0.5 ? "500" : "400"}`
}

export function MonthlyReturnsTable({ rows }: MonthlyReturnsTableProps) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No monthly data available.</p>
    )
  }

  const validMonths = rows.filter((r) => !r.isMtd)
  const avgReturn =
    validMonths.length > 0
      ? validMonths.reduce((a, r) => a + r.portfolioReturn, 0) / validMonths.length
      : null
  const pctPositive =
    validMonths.length > 0
      ? (validMonths.filter((r) => r.portfolioReturn > 0).length / validMonths.length) * 100
      : null

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow className="border-border">
            <TableHead className="w-[120px]">Month</TableHead>
            <TableHead className="text-right">Return</TableHead>
            <TableHead className="text-right">SPY</TableHead>
            <TableHead className="text-right">vs SPY</TableHead>
            <TableHead className="text-right">Cumulative</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={row.month}
              className={`border-border ${row.isMtd ? "opacity-60" : ""}`}
            >
              <TableCell className="font-medium">
                {formatMonth(row.month)}
                {row.isMtd && (
                  <span className="ml-1.5 text-xs text-muted-foreground">MTD</span>
                )}
              </TableCell>
              <TableCell
                className={`text-right font-mono tabular-nums ${returnColor(row.portfolioReturn)}`}
              >
                {formatPct(row.portfolioReturn)}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                {row.spyReturn !== null ? formatPct(row.spyReturn) : "--"}
              </TableCell>
              <TableCell
                className={`text-right font-mono tabular-nums ${row.delta !== null ? returnColor(row.delta) : ""}`}
              >
                {row.delta !== null ? formatPct(row.delta) : "--"}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                {formatPct(row.cumulativeReturn)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        {(avgReturn !== null || pctPositive !== null) && (
          <TableFooter>
            <TableRow className="border-border">
              <TableCell className="text-xs text-muted-foreground">
                {validMonths.length} months
              </TableCell>
              <TableCell
                className={`text-right font-mono text-xs tabular-nums ${avgReturn !== null ? returnColor(avgReturn) : ""}`}
              >
                {avgReturn !== null ? `avg ${formatPct(avgReturn)}` : ""}
              </TableCell>
              <TableCell />
              <TableCell />
              <TableCell className="text-right text-xs text-muted-foreground">
                {pctPositive !== null ? `${pctPositive.toFixed(0)}% positive` : ""}
              </TableCell>
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </div>
  )
}
