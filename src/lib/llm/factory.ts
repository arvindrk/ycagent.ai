import { BaseComputerStreamer, LLMProvider, ComputerAgentConfig } from "@/types/llm.types";
import { AnthropicComputerStreamer } from "./providers/anthropic";
import { DEFAULT_SYSTEM_PROMPT } from "@/constants/llm.constants";
import { DEFAULT_RESOLUTION } from "@/types/sandbox.types";
import { OpenAIComputerStreamer } from "./providers/openai";
import { GoogleComputerStreamer } from "./providers/google";

export class StreamerFactory {
  static getStreamer(config: ComputerAgentConfig): BaseComputerStreamer {
    const {
      desktop,
      provider = LLMProvider.ANTHROPIC,
      resolution = DEFAULT_RESOLUTION,
      systemPrompt = DEFAULT_SYSTEM_PROMPT,
    } = config;

    switch (provider) {
      case LLMProvider.ANTHROPIC:
        return new AnthropicComputerStreamer({ desktop, resolution, systemPrompt });
      case LLMProvider.OPENAI:
        return new OpenAIComputerStreamer({ desktop, resolution, systemPrompt });
      case LLMProvider.GOOGLE:
        return new GoogleComputerStreamer({ desktop, resolution, systemPrompt });
      default:
        throw new Error(`Unknown Computer Agent provider: ${provider}`);
    }
  }
}
