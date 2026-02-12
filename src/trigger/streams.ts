import { streams } from "@trigger.dev/sdk/v3";
import type { StreamChunk } from "@/lib/llm/types";

export const researchStream = streams.define<StreamChunk>({
  id: "research-stream",
});
