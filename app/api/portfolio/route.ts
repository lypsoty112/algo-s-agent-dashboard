import { cacheLife } from "next/cache";
import { getAccount, getPortfolioHistory } from "@/lib/alpaca";

async function fetchPortfolioData() {
  const [account, history] = await Promise.all([
    getAccount(),
    getPortfolioHistory({ period: "1A", timeframe: "1D" }),
  ]);

  return {
    equity: parseFloat(account.equity),
    buyingPower: parseFloat(account.buying_power),
    timestamps: history.timestamp ?? [],
    equities: history.equity ?? [],
    profitLoss: history.profit_loss ?? [],
  };
}

export async function GET() {
  "use cache";
  cacheLife("infrequent");

  try {
    const data = await fetchPortfolioData();
    return Response.json(data);
  } catch (err) {
    console.error("Portfolio route error:", err);
    return Response.json(
      { error: "Failed to fetch portfolio data" },
      { status: 502 }
    );
  }
}
