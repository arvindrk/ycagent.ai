import Anthropic from "@anthropic-ai/sdk";
import { ComputerAgentConfig, BaseComputerStreamer } from "@/types/llm.types";
import { Message } from "@/types/llm.types";
import { ChatOptions } from "@/types/llm.types";
import { StreamChunk } from "@/types/llm.types";
import { SSEEvent } from "@/types/llm.types";
import { ResolutionScaler } from "@/lib/sandbox-desktop/resolution";
import { ActionExecutor } from "@/lib/sandbox-desktop/executor";
import { NavigationManager, NavigatorRole } from "@/lib/sandbox-desktop/navigation";
import { BetaMessageParam } from "@anthropic-ai/sdk/resources/beta/messages/messages.mjs";
import { BetaToolUseBlock } from "@anthropic-ai/sdk/resources/beta/messages/messages.mjs";
import { BetaToolResultBlockParam } from "@anthropic-ai/sdk/resources/beta/messages/messages.mjs";
import { ComputerAction } from "@/types/sandbox.types";
import { StandardToolCall, StandardToolResult } from "@/types/tool.types";
import { extractErrorMessage } from "@/lib/utils";
import { DEFAULT_SYSTEM_PROMPT } from "../../../constants/llm.constants";
import { ALL_TOOLS } from "@/lib/tools/registry";
import { toAnthropicToolSchema } from "@/lib/tools/adapters";

export class AnthropicComputerStreamer implements BaseComputerStreamer {
  private client: Anthropic;
  private model: string;
  private systemPrompt: string;
  private scaler: ResolutionScaler;
  private executor: ActionExecutor;
  private navigationManager: NavigationManager;

  constructor(config: ComputerAgentConfig) {
    this.client = new Anthropic({
      apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY
    });
    this.systemPrompt = config.systemPrompt || DEFAULT_SYSTEM_PROMPT;
    this.model = config.model || "claude-sonnet-4-5";
    this.scaler = new ResolutionScaler(config.desktop, config.resolution);
    this.navigationManager = new NavigationManager(config.desktop);
    this.executor = new ActionExecutor(config.desktop, this.scaler, this.navigationManager);
  }

  private getProviderTools() {
    const [scaledWidth, scaledHeight] = this.scaler.getScaledResolution();

    return [
      {
        type: "computer_20250124" as const,
        name: "computer" as const,
        display_width_px: scaledWidth,
        display_height_px: scaledHeight,
      },
      {
        type: "bash_20250124" as const,
        name: "bash" as const,
      },
      ...ALL_TOOLS.map(toAnthropicToolSchema)
    ];
  }

  private toStandardToolCall(block: BetaToolUseBlock): StandardToolCall {
    return {
      id: block.id,
      name: block.name,
      input: block.input as Record<string, unknown>
    };
  }

  private toProviderToolResult(result: StandardToolResult): BetaToolResultBlockParam {
    if (result.content.type === 'text') {
      return {
        type: "tool_result",
        tool_use_id: result.toolCallId,
        content: result.content.text
      };
    }

    return {
      type: "tool_result",
      tool_use_id: result.toolCallId,
      content: [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: result.content.mediaType,
            data: result.content.base64
          }
        }
      ]
    };
  }

  async *executeAgentLoop(messages: Message[], seedUrl?: string | undefined, options?: ChatOptions): AsyncGenerator<StreamChunk> {
    const { signal } = options || {};

    const anthropicMessages: BetaMessageParam[] = messages
      .filter(m => m.role === "user" || m.role === "assistant")
      .map(m => ({
        role: m.role as "user" | "assistant",
        content: [{ type: "text" as const, text: m.content }]
      }));

    try {
      if (seedUrl) {
        yield { type: SSEEvent.ACTION, action: { action: "navigate", url: seedUrl }, toolName: "computer" };
        await this.navigationManager.navigate(seedUrl, NavigatorRole.SYSTEM);
        yield { type: SSEEvent.ACTION_COMPLETED };
      }

      while (true) {
        if (signal?.aborted) {
          yield { type: SSEEvent.DONE, content: "Stopped by user" };
          break;
        }

        const response = await this.client.beta.messages.create({
          model: this.model,
          max_tokens: 4096,
          messages: anthropicMessages,
          system: this.systemPrompt,
          tools: this.getProviderTools(),
          betas: ["computer-use-2025-01-24"],
          thinking: { type: "enabled", budget_tokens: 1024 },
        }, { signal });

        const toolUses: BetaToolUseBlock[] = [];
        let textContent = "";
        for (const block of response.content) {
          if (block.type === "tool_use") {
            toolUses.push(block);
          } else if (block.type === "text") {
            textContent += block.text;
          }
        }

        if (textContent) {
          yield { type: SSEEvent.REASONING, content: textContent };
        }

        if (toolUses.length === 0) {
          yield { type: SSEEvent.DONE };
          break;
        }

        anthropicMessages.push({
          role: "assistant",
          content: response.content
        });

        const toolResults: BetaToolResultBlockParam[] = [];

        for (const tool of toolUses) {
          const standardCall = this.toStandardToolCall(tool);

          if (standardCall.name === 'format_result') {
            yield {
              type: SSEEvent.RESULT,
              result: {
                summary: (standardCall.input.summary as string) || '',
                keyFindings: standardCall.input.keyFindings as string[] | undefined,
                sources: (standardCall.input.sources as string[]) || [],
                metadata: {}
              }
            };

            toolResults.push({
              type: "tool_result",
              tool_use_id: standardCall.id,
              content: "Result formatted and sent to user"
            });
          } else {
            yield {
              type: SSEEvent.ACTION,
              action: standardCall.input as ComputerAction,
              toolName: standardCall.name
            };

            const result = await this.executor.execute(standardCall);

            yield { type: SSEEvent.ACTION_COMPLETED };

            toolResults.push(this.toProviderToolResult(result));
          }
        }

        if (toolResults.length > 0) {
          anthropicMessages.push({
            role: "user",
            content: toolResults
          });
        }
      }
    } catch (error) {
      console.error("Anthropic provider error:", error);

      yield {
        type: SSEEvent.ERROR,
        error: extractErrorMessage(error)
      };
    }
  }
}
