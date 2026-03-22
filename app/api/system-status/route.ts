import { cacheLife } from "next/cache";
import { checkIsLive } from "@/lib/system-status";

async function getSystemStatus() {
  "use cache";
  cacheLife({ stale: 60, revalidate: 60, expire: 300 });
  return checkIsLive();
}

export async function GET() {
  try {
    const data = await (
      process.env.DISABLE_CACHE === "true" && process.env.NODE_ENV !== "production"
        ? checkIsLive()
        : getSystemStatus()
    );
    return Response.json({
      live: data.live,
      lastActivityAt: data.lastActivityAt?.toISOString() ?? null,
    });
  } catch (err) {
    console.error("System status route error:", err);
    return Response.json({ live: false, lastActivityAt: null }, { status: 200 });
  }
}
