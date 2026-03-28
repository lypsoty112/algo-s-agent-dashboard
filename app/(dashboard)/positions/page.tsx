import { cacheLife } from "next/cache";
import { getPositions, getAccount, getRecentOrders } from "@/lib/alpaca";
import { computeTradeRecords } from "@/lib/stats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PositionsSummary } from "@/components/positions/positions-summary";
import { PositionsClient } from "@/components/positions/positions-client";
import { PortfolioPie } from "@/components/charts/portfolio-pie";
import type { ClosedTrade } from "@/components/positions/positions-client";

async function getPositionsPageData() {
  "use cache";
  cacheLife("frequent");

  const [positionsResult, accountResult, ordersResult] =
    await Promise.allSettled([
      getPositions(),
      getAccount(),
      getRecentOrders(500),
    ]);

  const positions =
    positionsResult.status === "fulfilled" ? positionsResult.value : [];
  const account =
    accountResult.status === "fulfilled" ? accountResult.value : null;

  // Orders come back newest-first; reverse for chronological FIFO matching
  const alpacaOrders =
    ordersResult.status === "fulfilled"
      ? ordersResult.value.slice().reverse()
      : [];
  const tradeRecords = computeTradeRecords(alpacaOrders);
  // Sort newest-closed first
  tradeRecords.sort((a, b) => b.closedAt.getTime() - a.closedAt.getTime());
  const recentTrades = tradeRecords;

  // Compute summary values
  const totalMarketValue =
    positions.length > 0
      ? positions.reduce((sum, p) => sum + parseFloat(p.market_value), 0)
      : null;
  const totalUnrealizedPl =
    positions.length > 0
      ? positions.reduce((sum, p) => sum + parseFloat(p.unrealized_pl), 0)
      : null;
  const totalUnrealizedPlPct =
    totalUnrealizedPl !== null &&
    totalMarketValue !== null &&
    totalMarketValue - totalUnrealizedPl > 0
      ? totalUnrealizedPl / (totalMarketValue - totalUnrealizedPl)
      : null;
  const buyingPower = account ? parseFloat(account.buying_power) : null;

  // Serialize positions for client
  const serializedPositions = positions.map((p) => ({
    symbol: p.symbol,
    qty: p.qty,
    side: p.side,
    avg_entry_price: parseFloat(p.avg_entry_price),
    current_price: parseFloat(p.current_price),
    market_value: parseFloat(p.market_value),
    unrealized_pl: parseFloat(p.unrealized_pl),
    unrealized_plpc: parseFloat(p.unrealized_plpc),
    change_today: parseFloat(p.change_today),
  }));

  // Serialize Date fields for client
  const serializedTrades: ClosedTrade[] = recentTrades.map((t) => ({
    symbol: t.symbol,
    pnl: t.pnl,
    openedAt: t.openedAt.toISOString(),
    closedAt: t.closedAt.toISOString(),
    holdingDays: t.holdingDays,
  }));

  return {
    positions: serializedPositions,
    totalMarketValue,
    totalUnrealizedPl,
    totalUnrealizedPlPct,
    buyingPower,
    trades: serializedTrades,
  };
}

export default async function PositionsPage() {
  const {
    positions,
    totalMarketValue,
    totalUnrealizedPl,
    totalUnrealizedPlPct,
    buyingPower,
    trades,
  } = await getPositionsPageData();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Positions</h1>

      <PositionsSummary
        totalPositions={positions.length}
        totalMarketValue={totalMarketValue}
        totalUnrealizedPl={totalUnrealizedPl}
        totalUnrealizedPlPct={totalUnrealizedPlPct}
        buyingPower={buyingPower}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <PositionsClient positions={positions} trades={trades} />
        </div>
        <div className="lg:col-span-4">
          <Card>
            <CardHeader>
              <CardTitle>Allocation</CardTitle>
            </CardHeader>
            <CardContent>
              <PortfolioPie positions={positions} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
