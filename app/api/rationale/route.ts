import type { NextRequest } from "next/server";
import { cacheLife } from "next/cache";
import { db, safeQuery } from "@/lib/db";

async function fetchRationale(symbol: string, after: string | null) {
  // Try to find the closest record at or after the given date
  if (after) {
    const { data } = await safeQuery(() =>
      db.tradeHistory.findFirst({
        where: { symbol, createdAt: { gte: new Date(after) }, deletedAt: null },
        orderBy: { createdAt: "asc" },
      })
    );
    if (data) {
      return { rationale: data.rationale, id: data.id };
    }
  }

  // Fallback: most recent record for this symbol
  const { data: fallback } = await safeQuery(() =>
    db.tradeHistory.findFirst({
      where: { symbol, deletedAt: null },
      orderBy: { createdAt: "desc" },
    })
  );

  return {
    rationale: fallback?.rationale ?? null,
    id: fallback?.id ?? null,
  };
}

async function getCachedRationale(symbol: string, after: string | null) {
  "use cache";
  cacheLife("frequent");
  return fetchRationale(symbol, after);
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const symbol = sp.get("symbol");
  const after = sp.get("after");

  if (!symbol) {
    return Response.json({ error: "symbol is required" }, { status: 400 });
  }

  try {
    const data = await getCachedRationale(symbol.toUpperCase(), after);
    return Response.json(data);
  } catch (err) {
    console.error("Rationale route error:", err);
    return Response.json({ error: "Failed to fetch rationale" }, { status: 500 });
  }
}
