import { cacheLife } from "next/cache";
import { checkIsLive } from "@/lib/system-status";

async function getCachedSystemStatus() {
  "use cache";
  cacheLife("frequent");
  const data = await checkIsLive();
  return {
    live: data.live,
    lastActivityAt: data.lastActivityAt?.toISOString() ?? null,
  };
}

export async function GET() {
  try {
    const data = await getCachedSystemStatus();
    return Response.json(data);
  } catch (err) {
    console.error("System status route error:", err);
    return Response.json({ live: false, lastActivityAt: null }, { status: 200 });
  }
}
