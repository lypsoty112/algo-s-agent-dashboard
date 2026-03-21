"use client"

import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts"

type TradePoint = {
  symbol: string
  entryDate: string
  holdingDays: number
  pnl: number
}

type TradeScatterProps = {
  trades: TradePoint[]
}

interface TooltipProps {
  active?: boolean
  payload?: Array<{ payload: TradePoint }>
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null
  const t = payload[0].payload
  const sign = t.pnl >= 0 ? "+" : ""
  return (
    <div className="rounded-md border border-border bg-background/95 px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium text-foreground">{t.symbol}</p>
      <div className="space-y-0.5 text-muted-foreground">
        <p>Entry: {t.entryDate}</p>
        <p>Held: {t.holdingDays}d</p>
        <p className={t.pnl >= 0 ? "text-emerald-500" : "text-red-500"}>
          P&amp;L: {sign}${t.pnl.toFixed(2)}
        </p>
      </div>
    </div>
  )
}

export function TradeScatter({ trades }: TradeScatterProps) {
  if (trades.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
        No closed trades yet
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ScatterChart margin={{ top: 8, right: 16, left: 8, bottom: 20 }}>
        <CartesianGrid
          horizontal
          vertical={false}
          stroke="hsl(var(--border))"
        />
        <XAxis
          dataKey="holdingDays"
          name="Holding (days)"
          type="number"
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          tickLine={false}
          axisLine={false}
          label={{
            value: "days held",
            position: "insideBottom",
            offset: -12,
            fontSize: 10,
            fill: "hsl(var(--muted-foreground))",
          }}
        />
        <YAxis
          dataKey="pnl"
          name="P&L ($)"
          type="number"
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) =>
            v >= 0 ? `+$${v.toFixed(0)}` : `-$${Math.abs(v).toFixed(0)}`
          }
          width={60}
        />
        <Tooltip content={<CustomTooltip />} cursor={false} />
        <Scatter data={trades} isAnimationActive={false}>
          {trades.map((t, i) => (
            <Cell
              key={i}
              fill={t.pnl >= 0 ? "#4ade80" : "#f87171"}
              fillOpacity={0.75}
            />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  )
}
