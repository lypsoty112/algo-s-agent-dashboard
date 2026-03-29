import { cacheLife } from "next/cache";
import { getPositions, getAccount } from "@/lib/alpaca";
import { db, safeQuery } from "@/lib/db";

async function fetchPositionsData() {

  const [alpacaPositions, account] = await Promise.all([
    getPositions(),
    getAccount(),
  ]);

  const symbols = alpacaPositions.map((p) => p.symbol);

  // Find the most recent opening order rationale per symbol (buy for longs, sell_short for shorts)
  const { data: tradeRows } = await safeQuery(() =>
    db.tradeHistory.findMany({
      where: {
        symbol: { in: symbols },
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
    })
  );

  // Build symbol → most-recent trade map
  const rationaleMap = new Map<string, { id: string; rationale: string }>();
  for (const row of tradeRows ?? []) {
    if (!rationaleMap.has(row.symbol)) {
      rationaleMap.set(row.symbol, { id: row.id, rationale: row.rationale });
    }
  }

  const positions = alpacaPositions.map((pos) => ({
    symbol: pos.symbol,
    qty: pos.qty,
    side: pos.side,
    avg_entry_price: parseFloat(pos.avg_entry_price),
    current_price: parseFloat(pos.current_price),
    market_value: parseFloat(pos.market_value),
    unrealized_pl: parseFloat(pos.unrealized_pl),
    unrealized_plpc: parseFloat(pos.unrealized_plpc),
    change_today: parseFloat(pos.change_today),
    rationale: rationaleMap.get(pos.symbol)?.rationale ?? null,
    trade_id: rationaleMap.get(pos.symbol)?.id ?? null,
  }));

  return {
    positions,
    buyingPower: parseFloat(account.buying_power),
  };
}

async function getCachedPositionsData() {
  "use cache";
  cacheLife("frequent");
  return fetchPositionsData();
}

export async function GET() {
  try {
    const data = await getCachedPositionsData();
    return Response.json(data);
  } catch (err) {
    console.error("Positions route error:", err);
    return Response.json(
      { error: "Failed to fetch positions" },
      { status: 502 }
    );
  }
}
