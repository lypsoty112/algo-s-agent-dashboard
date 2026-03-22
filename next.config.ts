import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	cacheComponents: true,
	// Pin app root when a parent directory has another lockfile (e.g. ~/package-lock.json).
	turbopack: {
		root: path.join(__dirname),
	},
};

export default nextConfig;
