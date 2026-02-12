import Anthropic from "@anthropic-ai/sdk";
import { Sandbox } from "@e2b/desktop";
import { ComputerInteractionStreamerFacade } from "../types";
import { Message } from "../types";
import { ChatOptions } from "../types";
import { StreamChunk } from "../types";
import { SSEEvent } from "../types";
import { ResolutionScaler, Resolution } from "@/lib/sandbox-desktop/resolution";
import { ActionExecutor } from "@/lib/sandbox-desktop/executor";
import { NavigationManager, NavigatorRole } from "@/lib/sandbox-desktop/navigation";
import { BetaMessageParam } from "@anthropic-ai/sdk/resources/beta/messages/messages.mjs";
import { BetaToolUseBlock } from "@anthropic-ai/sdk/resources/beta/messages/messages.mjs";
import { BetaToolResultBlockParam } from "@anthropic-ai/sdk/resources/beta/messages/messages.mjs";
import { ComputerAction } from "@/lib/sandbox-desktop/types";
import { extractErrorMessage } from "@/lib/utils";
import { SYSTEM_PROMPT } from "../constants";
import { googleSearchTool } from "@/lib/schemas/google-search.tool.schema";
import { webCrawlerTool } from "@/lib/schemas/web-crawler.tool.schema";

interface AnthropicComputerConfig {
  apiKey?: string;
  model?: string;
  desktop: Sandbox;
  resolution: Resolution;
}

export class AnthropicComputerStreamer implements ComputerInteractionStreamerFacade {
  private client: Anthropic;
  private model: string;
  private systemPrompt: string;
  private scaler: ResolutionScaler;
  private executor: ActionExecutor;
  private navigationManager: NavigationManager;

  constructor(config: AnthropicComputerConfig) {
    this.client = new Anthropic({
      apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY
    });
    this.systemPrompt = SYSTEM_PROMPT;
    this.model = config.model || "claude-sonnet-4-5";
    this.scaler = new ResolutionScaler(config.desktop, config.resolution);
    this.navigationManager = new NavigationManager(config.desktop);
    this.executor = new ActionExecutor(config.desktop, this.scaler, this.navigationManager);
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

        const [scaledWidth, scaledHeight] = this.scaler.getScaledResolution();

        const response = await this.client.beta.messages.create({
          model: this.model,
          max_tokens: 4096,
          messages: anthropicMessages,
          system: this.systemPrompt,
          tools: [
            {
              type: "computer_20250124",
              name: "computer",
              display_width_px: scaledWidth,
              display_height_px: scaledHeight,
            },
            {
              type: "bash_20250124",
              name: "bash",
            },
            // {
            //   type: "text_editor_20250728",
            //   name: "str_replace_based_edit_tool",
            // },
            googleSearchTool,
            webCrawlerTool,
          ],
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
          yield {
            type: SSEEvent.ACTION,
            action: tool.input as ComputerAction,
            toolName: tool.name
          };

          const textResult = await this.executor.execute(tool);

          yield { type: SSEEvent.ACTION_COMPLETED };

          if (textResult) {
            toolResults.push({
              type: "tool_result",
              tool_use_id: tool.id,
              content: textResult
            });
          } else {
            const screenshot = await this.scaler.takeScreenshot();
            const base64 = screenshot.toString("base64");

            toolResults.push({
              type: "tool_result",
              tool_use_id: tool.id,
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: "image/png",
                    data: base64
                  }
                }
              ]
            });
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
