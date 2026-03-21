import { Card, CardContent } from "@/components/ui/card";

type PositionsSummaryProps = {
  totalPositions: number;
  totalMarketValue: number | null;
  totalUnrealizedPl: number | null;
  totalUnrealizedPlPct: number | null;
  buyingPower: number | null;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

type KpiCardProps = {
  label: string;
  value: string;
  subtext?: string;
  valueColor?: "green" | "red" | "default";
};

function KpiCard({ label, value, subtext, valueColor = "default" }: KpiCardProps) {
  const colorClass =
    valueColor === "green"
      ? "text-emerald-500"
      : valueColor === "red"
        ? "text-red-500"
        : "";

  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className={`mt-1 font-mono text-2xl font-semibold tabular-nums ${colorClass}`}>
          {value}
        </p>
        {subtext && <p className="mt-1 text-xs text-muted-foreground">{subtext}</p>}
      </CardContent>
    </Card>
  );
}

export function PositionsSummary({
  totalPositions,
  totalMarketValue,
  totalUnrealizedPl,
  totalUnrealizedPlPct,
  buyingPower,
}: PositionsSummaryProps) {
  const plColor =
    totalUnrealizedPl === null
      ? "default"
      : totalUnrealizedPl >= 0
        ? "green"
        : "red";

  const plValue =
    totalUnrealizedPl !== null && totalUnrealizedPlPct !== null
      ? `${totalUnrealizedPl >= 0 ? "+" : ""}${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(totalUnrealizedPl)} (${totalUnrealizedPl >= 0 ? "+" : ""}${(totalUnrealizedPlPct * 100).toFixed(2)}%)`
      : "--";

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <KpiCard label="Open Positions" value={String(totalPositions)} />
      <KpiCard
        label="Market Value"
        value={totalMarketValue !== null ? formatCurrency(totalMarketValue) : "--"}
      />
      <KpiCard
        label="Unrealized P&L"
        value={plValue}
        valueColor={plColor}
      />
      <KpiCard
        label="Buying Power"
        value={buyingPower !== null ? formatCurrency(buyingPower) : "--"}
      />
    </div>
  );
}
