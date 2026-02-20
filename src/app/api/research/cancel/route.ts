import { NextRequest } from "next/server";
import { runs } from "@trigger.dev/sdk/v3";
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { runId } = await request.json() as { runId: string };

  if (!runId) {
    return Response.json({ error: "runId is required" }, { status: 400 });
  }

  try {
    await runs.cancel(runId);
    return Response.json({ success: true, message: "Agent stopped by user" });
  } catch (error) {
    console.error("Failed to cancel run:", error);
    return Response.json({ error: "Failed to cancel research" }, { status: 500 });
  }
}
