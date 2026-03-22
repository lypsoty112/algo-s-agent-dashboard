import type { NextRequest } from "next/server";
import { db, safeQuery } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const result = await safeQuery(() =>
      db.flowRun.findUnique({
        where: { id },
        include: {
          agentRuns: {
            orderBy: { startedAt: "asc" },
          },
        },
      })
    );

    if (!result.data) {
      return Response.json(
        { error: "Flow run not found" },
        { status: 404 }
      );
    }

    const { agentRuns, ...flowRun } = result.data;

    return Response.json({ flowRun, agentRuns });
  } catch (err) {
    console.error("Flow detail route error:", err);
    return Response.json(
      { error: "Failed to fetch flow run details" },
      { status: 500 }
    );
  }
}
