import { NextRequest } from "next/server";
import { runs } from "@trigger.dev/sdk/v3";

export async function POST(request: NextRequest) {
  const { runId } = await request.json() as { runId: string };

  if (!runId) {
    return Response.json({ error: "runId is required" }, { status: 400 });
  }

  try {
    await runs.cancel(runId);
    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to cancel run:", error);
    return Response.json({ error: "Failed to cancel research" }, { status: 500 });
  }
}
