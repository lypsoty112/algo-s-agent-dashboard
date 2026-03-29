"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  type PieLabelRenderProps,
} from "recharts";

type Position = {
  symbol: string;
  market_value: number;
  side?: string;
};

type PortfolioPieProps = {
  positions: Position[];
};

const COLORS = [
  "#4ade80",
  "#60a5fa",
  "#f59e0b",
  "#a78bfa",
  "#f87171",
  "#34d399",
  "#fb923c",
  "#38bdf8",
  "#e879f9",
  "#facc15",
];

interface TooltipPayloadItem {
  name: string;
  value: number;
  payload: { symbol: string; market_value: number; pct: number; side: string };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="rounded-md border border-border bg-background/95 px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-foreground font-mono">
        {item.symbol}{item.side === "short" ? " (short)" : ""}
      </p>
      <p className="text-muted-foreground">
        {new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(Math.abs(item.market_value))}
      </p>
      <p className="text-muted-foreground">{item.pct.toFixed(1)}% of exposure</p>
    </div>
  );
}

export function PortfolioPie({ positions }: PortfolioPieProps) {
  if (positions.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
        No open positions
      </div>
    );
  }

  const total = positions.reduce((sum, p) => sum + Math.abs(p.market_value), 0);
  const data = positions.map((p) => ({
    symbol: p.symbol,
    market_value: p.market_value,
    side: p.side,
    absValue: Math.abs(p.market_value),
    pct: total > 0 ? (Math.abs(p.market_value) / total) * 100 : 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="absValue"
          nameKey="symbol"
          cx="50%"
          cy="50%"
          outerRadius={90}
          label={(props: PieLabelRenderProps) => {
            const pct = typeof props.percent === "number" ? props.percent * 100 : 0;
            return pct > 4 ? String(props.name ?? "") : "";
          }}
          labelLine={false}
          isAnimationActive={false}
        >
          {data.map((entry, index) => (
            <Cell
              key={entry.symbol}
              fill={COLORS[index % COLORS.length]}
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  );
}
