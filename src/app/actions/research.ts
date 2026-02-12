"use server";

import { auth } from "@trigger.dev/sdk/v3";

export async function createResearchAccessToken() {
  // Token that can both trigger AND read the orchestrator task
  const publicToken = await auth.createPublicToken({
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
