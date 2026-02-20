"use server";

import { auth as triggerAuth } from "@trigger.dev/sdk/v3";
import { getSession } from "@/lib/session";
import { headers } from "next/headers";

export async function createResearchAccessToken(): Promise<string | null> {
  const session = await getSession(await headers());
  if (!session) return null;

  const publicToken = await triggerAuth.createPublicToken({
    scopes: {
      read: {
        tasks: ["research-orchestrator"],
      },
      trigger: {
        tasks: ["research-orchestrator"],
      },
    },
    expirationTime: "1h",
  });

  return publicToken;
}
