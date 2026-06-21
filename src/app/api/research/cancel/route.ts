import { NextRequest } from "next/server";
import { z } from "zod";
import { runs } from "@trigger.dev/sdk/v3";
import { getSession } from "@/lib/session";

const cancelRequestSchema = z.object({
  runId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const session = await getSession(request.headers);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = cancelRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "runId is required" }, { status: 400 });
  }

  const { runId } = parsed.data;

  try {
    await runs.cancel(runId);
    return Response.json({ success: true, message: "Agent stopped by user" });
  } catch (error) {
    console.error("Failed to cancel run:", error);
    return Response.json({ error: "Failed to cancel research" }, { status: 500 });
  }
}
