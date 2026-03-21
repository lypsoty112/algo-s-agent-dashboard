import { cacheLife } from "next/cache";
import { getPositions, getAccount } from "@/lib/alpaca";
import { db, safeQuery } from "@/lib/db";

async function fetchPositionsData() {

  const [alpacaPositions, account] = await Promise.all([
    getPositions(),
    getAccount(),
  ]);

  const symbols = alpacaPositions.map((p) => p.symbol);

  // Find the most recent buy order rationale per symbol (open position = we bought and haven't sold)
  const { data: tradeRows } = await safeQuery(() =>
    db.tradeHistory.findMany({
      where: {
        symbol: { in: symbols },
        orderType: "buy",
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
    })
  );

  // Build symbol → most-recent buy trade map
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

async function getPositionsData() {
  "use cache";
  cacheLife({ stale: 60, revalidate: 60, expire: 300 });
  return fetchPositionsData();
}

export async function GET() {
  try {
    const data = await (process.env.DISABLE_CACHE === "true" && process.env.NODE_ENV !== "production"
      ? fetchPositionsData()
      : getPositionsData());
    return Response.json(data);
  } catch (err) {
    console.error("Positions route error:", err);
    return Response.json(
      { error: "Failed to fetch positions" },
      { status: 502 }
    );
  }
}
