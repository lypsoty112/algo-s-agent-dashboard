import { cacheLife } from "next/cache";
import { checkIsLive } from "@/lib/system-status";

export async function GET() {
  "use cache";
  cacheLife("frequent");

  try {
    const data = await checkIsLive();
    return Response.json({
      live: data.live,
      lastActivityAt: data.lastActivityAt?.toISOString() ?? null,
    });
  } catch (err) {
    console.error("System status route error:", err);
    return Response.json({ live: false, lastActivityAt: null }, { status: 200 });
  }
}
