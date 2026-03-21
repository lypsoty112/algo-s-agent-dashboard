import type { NextRequest } from "next/server";
import { cacheLife } from "next/cache";
import { getHistoricalBars } from "@/lib/alpaca";

async function fetchBenchmarkData(start: string) {
  const [spyBars, qqqBars] = await Promise.all([
    getHistoricalBars("SPY", { start, timeframe: "1Day" }),
    getHistoricalBars("QQQ", { start, timeframe: "1Day" }),
  ]);

  function normalize(bars: typeof spyBars) {
    if (bars.length === 0) return { timestamps: [], values: [] };
    const base = bars[0].c;
    return {
      timestamps: bars.map((b) => Math.floor(new Date(b.t).getTime() / 1000)),
      values: bars.map((b) => (base !== 0 ? (b.c / base) * 100 : 100)),
    };
  }

  return {
    spy: normalize(spyBars),
    qqq: normalize(qqqBars),
  };
}

async function getBenchmarkData(start: string) {
  "use cache";
  cacheLife({ stale: 300, revalidate: 300, expire: 3600 });
  return fetchBenchmarkData(start);
}

export async function GET(req: NextRequest) {
  const start = req.nextUrl.searchParams.get("start");

  if (!start) {
    return Response.json({ error: "Missing required query param: start" }, { status: 400 });
  }

  try {
    const data = await (process.env.DISABLE_CACHE === "true" && process.env.NODE_ENV !== "production"
      ? fetchBenchmarkData(start)
      : getBenchmarkData(start));
    return Response.json(data);
  } catch (err) {
    console.error("Benchmark route error:", err);
    return Response.json(
      { error: "Failed to fetch benchmark data" },
      { status: 502 }
    );
  }
}
