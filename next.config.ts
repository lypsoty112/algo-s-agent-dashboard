import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	cacheComponents: true,
	cacheLife: {
		frequent: { stale: 60, revalidate: 60, expire: 300 },
		infrequent: { stale: 300, revalidate: 300, expire: 3600 },
	},
	// Pin app root when a parent directory has another lockfile (e.g. ~/package-lock.json).
	turbopack: {
		root: path.join(__dirname),
	},
};

export default nextConfig;
