import { BaseComputerStreamer, LLMProvider, ComputerAgentConfig } from "@/types/llm.types";
import { AnthropicComputerStreamer } from "./providers/anthropic";
import { DEFAULT_SYSTEM_PROMPT } from "@/constants/llm.constants";
import { DEFAULT_RESOLUTION } from "@/types/sandbox.types";
import { OpenAIComputerStreamer } from "./providers/openai";
import { GoogleComputerStreamer } from "./providers/google";

export class StreamerFactory {
  private static testStreamerOverride: BaseComputerStreamer | null = null;

  static getStreamer(config: ComputerAgentConfig): BaseComputerStreamer {
    if (StreamerFactory.testStreamerOverride != null) {
      return StreamerFactory.testStreamerOverride;
    }

    const {
      desktop,
      provider = LLMProvider.ANTHROPIC,
      resolution = DEFAULT_RESOLUTION,
      systemPrompt = DEFAULT_SYSTEM_PROMPT,
      tools,
    } = config;

    switch (provider) {
      case LLMProvider.ANTHROPIC:
        return new AnthropicComputerStreamer({ desktop, resolution, systemPrompt, tools });
      case LLMProvider.OPENAI:
        return new OpenAIComputerStreamer({ desktop, resolution, systemPrompt, tools });
      case LLMProvider.GOOGLE:
        return new GoogleComputerStreamer({ desktop, resolution, systemPrompt, tools });
      default:
        throw new Error(`Unknown Computer Agent provider: ${provider}`);
    }
  }

  // Test seam only. Used exclusively by hermetic evals under src/eval/ for mocked LLM scenarios.
  // Production code must never call this; override is cleared after use.
  static __setTestStreamerOverride(impl: BaseComputerStreamer | null): void {
    StreamerFactory.testStreamerOverride = impl;
  }
}
