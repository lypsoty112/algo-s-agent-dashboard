const TRADING_BASE = "https://paper-api.alpaca.markets";
const DATA_BASE = "https://data.alpaca.markets";

export interface AlpacaAccount {
	equity: string;
	buying_power: string;
	cash: string;
	portfolio_value: string;
	last_equity: string;
}

export interface AlpacaPosition {
	asset_id: string;
	symbol: string;
	qty: string;
	avg_entry_price: string;
	current_price: string;
	market_value: string;
	unrealized_pl: string;
	unrealized_plpc: string;
	side: string;
	lastday_price: string;
	change_today: string;
}

export interface AlpacaPortfolioHistory {
	timestamp: number[];
	equity: number[];
	profit_loss: number[];
	profit_loss_pct: number[];
	base_value: number;
}

export interface AlpacaBar {
	t: string; // ISO 8601 timestamp
	o: number;
	h: number;
	l: number;
	c: number;
	v: number;
}

async function alpacaFetch<T>(
	base: "trading" | "data",
	path: string,
	params?: Record<string, string>,
): Promise<T> {
	const keyId = process.env.APCA_API_KEY_ID;
	const secretKey = process.env.APCA_API_SECRET_KEY;

	console.log(`[alpaca] keyId: ${keyId}, secretKey: ${secretKey}`);

	console.log(
		`[alpaca] fetch ${base} ${path} — key present: ${!!keyId}, secret present: ${!!secretKey}`,
	);

	if (!keyId || !secretKey) {
		console.error(
			"[alpaca] MISSING CREDENTIALS: APCA_API_KEY_ID and/or APCA_API_SECRET_KEY not set",
		);
		throw new Error(
			"Missing Alpaca API credentials: APCA_API_KEY_ID and APCA_API_SECRET_KEY must be set",
		);
	}

	const baseUrl = base === "trading" ? TRADING_BASE : DATA_BASE;
	const url = new URL(path, baseUrl);

	if (params) {
		for (const [key, value] of Object.entries(params)) {
			url.searchParams.set(key, value);
		}
	}

	console.log(`[alpaca] → GET ${url.toString()}`);

	const res = await fetch(url.toString(), {
		headers: {
			"APCA-API-KEY-ID": keyId,
			"APCA-API-SECRET-KEY": secretKey,
			Accept: "application/json",
		},
	});

	console.log(`[alpaca] ← ${res.status} ${res.statusText} for ${path}`);

	if (!res.ok) {
		const body = await res.text().catch(() => "");
		console.error(`[alpaca] ERROR ${res.status} on ${path}:`, body);
		throw new Error(`Alpaca API error ${res.status}: ${body}`);
	}

	return res.json() as Promise<T>;
}

export async function getAccount(): Promise<AlpacaAccount> {
	console.log("[alpaca] getAccount()");
	return alpacaFetch<AlpacaAccount>("trading", "/v2/account");
}

export async function getPositions(): Promise<AlpacaPosition[]> {
	console.log("[alpaca] getPositions()");
	return alpacaFetch<AlpacaPosition[]>("trading", "/v2/positions");
}

export async function getPortfolioHistory(params: {
	period?: string;
	timeframe?: string;
	pnl_reset?: string;
}): Promise<AlpacaPortfolioHistory> {
	console.log("[alpaca] getPortfolioHistory()", params);
	const queryParams: Record<string, string> = {};
	if (params.period) queryParams.period = params.period;
	if (params.timeframe) queryParams.timeframe = params.timeframe;
	if (params.pnl_reset) queryParams.pnl_reset = params.pnl_reset;
	return alpacaFetch<AlpacaPortfolioHistory>(
		"trading",
		"/v2/account/portfolio/history",
		queryParams,
	);
}

export async function getClosedOrdersCount(after?: string): Promise<number> {
	console.log("[alpaca] getClosedOrdersCount()", { after });
	const params: Record<string, string> = { status: "closed", limit: "500" };
	if (after) params.after = after;
	const orders = await alpacaFetch<unknown[]>("trading", "/v2/orders", params);
	return orders.length;
}

export async function getHistoricalBars(
	symbol: string,
	params: { start: string; timeframe: string },
): Promise<AlpacaBar[]> {
	console.log("[alpaca] getHistoricalBars()", symbol, params);
	const data = await alpacaFetch<{ bars: AlpacaBar[] }>(
		"data",
		`/v2/stocks/${symbol}/bars`,
		{
			start: params.start,
			timeframe: params.timeframe,
			feed: "iex",
			adjustment: "raw",
		},
	);
	return data.bars ?? [];
}
