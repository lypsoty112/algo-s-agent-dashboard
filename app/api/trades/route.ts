import type { NextRequest } from "next/server";
import { cacheLife } from "next/cache";
import { db, safeQuery } from "@/lib/db";
import { Prisma } from "@/src/generated/prisma/client";

const PAGE_SIZE = 20;

async function fetchTradesData(
  page: number,
  symbol: string | null,
  from: string | null,
  to: string | null,
  outcome: string | null
) {

  const where: Prisma.TradeHistoryWhereInput = {
    closedAt: { not: null },
    deletedAt: null,
  };

  if (symbol) {
    where.symbol = { equals: symbol.toUpperCase() };
  }
  if (from || to) {
    where.closedAt = {
      not: null,
      ...(from && { gte: new Date(from) }),
      ...(to && { lte: new Date(to) }),
    };
  }
  if (outcome === "win") {
    where.outcomePnl = { gt: 0 };
  } else if (outcome === "loss") {
    where.outcomePnl = { lte: 0 };
  }

  const offset = (page - 1) * PAGE_SIZE;

  const [trades, total] = await Promise.all([
    safeQuery(() =>
      db.tradeHistory.findMany({
        where,
        orderBy: { closedAt: "desc" },
        skip: offset,
        take: PAGE_SIZE,
      })
    ),
    safeQuery(() => db.tradeHistory.count({ where })),
  ]);

  // Serialize Decimal fields to numbers for JSON response
  const serialized = (trades.data ?? []).map((t) => ({
    ...t,
    quantity: t.quantity != null ? Number(t.quantity) : null,
    notional: t.notional != null ? Number(t.notional) : null,
    price: t.price != null ? Number(t.price) : null,
    limitPrice: t.limitPrice != null ? Number(t.limitPrice) : null,
    stopPrice: t.stopPrice != null ? Number(t.stopPrice) : null,
    filledQty: t.filledQty != null ? Number(t.filledQty) : null,
    filledAvgPrice: t.filledAvgPrice != null ? Number(t.filledAvgPrice) : null,
    outcomePnl: t.outcomePnl != null ? Number(t.outcomePnl) : null,
  }));

  return {
    trades: serialized,
    total: total.data ?? 0,
    page,
    pageSize: PAGE_SIZE,
  };
}

async function getCachedTradesData(
  page: number,
  symbol: string | null,
  from: string | null,
  to: string | null,
  outcome: string | null
) {
  "use cache";
  cacheLife("frequent");
  return fetchTradesData(page, symbol, from, to, outcome);
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const rawPage = parseInt(sp.get("page") ?? "1", 10);
  const page = Number.isNaN(rawPage) ? 1 : Math.max(1, rawPage);
  const symbol = sp.get("symbol");
  const from = sp.get("from");
  const to = sp.get("to");
  const outcome = sp.get("outcome");

  try {
    const data = await getCachedTradesData(page, symbol, from, to, outcome);
    return Response.json(data);
  } catch (err) {
    console.error("Trades route error:", err);
    return Response.json(
      { error: "Failed to fetch trades" },
      { status: 500 }
    );
  }
}
