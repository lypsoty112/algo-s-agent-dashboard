import { cacheLife } from "next/cache";
import { getAccount, getPortfolioHistory } from "@/lib/alpaca";

async function fetchPortfolioData() {
	const [account, history] = await Promise.all([
		getAccount(),
		getPortfolioHistory({
			period: "1A",
			timeframe: "1D",
			pnl_reset: "per_day",
		}),
	]);

	return {
		equity: parseFloat(account.equity),
		buyingPower: parseFloat(account.buying_power),
		timestamps: history.timestamp ?? [],
		equities: history.equity ?? [],
		profitLoss: history.profit_loss ?? [],
	};
}

async function getPortfolioData() {
	cacheLife({ stale: 300, revalidate: 300, expire: 3600 });
	return fetchPortfolioData();
}

export async function GET() {
	try {
		const data = await (process.env.DISABLE_CACHE === "true" &&
		process.env.NODE_ENV !== "production"
			? fetchPortfolioData()
			: getPortfolioData());
		return Response.json(data);
	} catch (err) {
		console.error("Portfolio route error:", err);
		return Response.json(
			{ error: "Failed to fetch portfolio data" },
			{ status: 502 },
		);
	}
}
