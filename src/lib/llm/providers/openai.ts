import OpenAI from "openai";
import { ResponseInput } from "openai/resources/responses/responses.mjs";
import { DEFAULT_SYSTEM_PROMPT } from "@/constants/llm.constants";
import { ResolutionScaler } from "@/lib/sandbox-desktop/resolution";
import { BaseComputerStreamer, ChatOptions, ComputerAgentConfig, Message, SSEEvent, StreamChunk } from "@/types/llm.types";
import { ActionExecutor } from "@/lib/sandbox-desktop/executor";
import { NavigationManager, NavigatorRole } from "@/lib/sandbox-desktop/navigation";
import { StandardToolCall, StandardToolResult } from "@/types/tool.types";
import { ComputerAction } from "@/types/sandbox.types";
import { extractErrorMessage } from "@/lib/utils";
import { ALL_TOOLS } from "@/lib/tools/registry";
import { toOpenAIToolSchema } from "@/lib/tools/adapters";

interface OpenAIToolCall {
  type: "computer_call" | "function_call";
  call_id: string;
  name?: string;
  arguments?: string;
  action?: Record<string, unknown>;
}

interface OpenAIToolResult {
  call_id: string;
  type: "function_call_output" | "computer_call_output";
  output: string | { type: "computer_screenshot"; image_url: string };
}

export class OpenAIComputerStreamer implements BaseComputerStreamer {
  private client: OpenAI;
  private model: string;
  private systemPrompt: string;
  private scaler: ResolutionScaler;
  private executor: ActionExecutor;
  private navigationManager: NavigationManager;

  constructor(config: ComputerAgentConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey || process.env.OPENAI_API_KEY
    });
    this.systemPrompt = config.systemPrompt || DEFAULT_SYSTEM_PROMPT;
    this.model = config.model || "gpt-5.2";
    this.scaler = new ResolutionScaler(config.desktop, config.resolution);
    this.navigationManager = new NavigationManager(config.desktop);
    this.executor = new ActionExecutor(config.desktop, this.scaler, this.navigationManager);
  }

  private getProviderTools() {
    // const [scaledWidth, scaledHeight] = this.scaler.getScaledResolution();

    return [
      // {
      //   type: "computer_use_preview" as const,
      //   display_width: scaledWidth,
      //   display_height: scaledHeight,
      //   environment: "linux" as const,
      // },
      ...ALL_TOOLS.map(toOpenAIToolSchema)
    ];
  }

  private toStandardToolCall(item: OpenAIToolCall): StandardToolCall | null {
    if (item.type === "computer_call" && item.action) {
      return {
        id: item.call_id,
        name: "computer",
        input: item.action
      };
    }

    if (item.type === "function_call" && item.name) {
      return {
        id: item.call_id,
        name: item.name,
        input: typeof item.arguments === 'string'
          ? JSON.parse(item.arguments)
          : item.arguments || {}
      };
    }

    return null;
  }

  private toProviderToolResult(result: StandardToolResult): OpenAIToolResult {
    if (result.content.type === 'text') {
      return {
        call_id: result.toolCallId,
        type: "function_call_output",
        output: result.content.text
      };
    }

    return {
      call_id: result.toolCallId,
      type: "computer_call_output",
      output: {
        type: "computer_screenshot",
        image_url: `data:${result.content.mediaType};base64,${result.content.base64}`
      }
    };
  }

  async *executeAgentLoop(messages: Message[], seedUrl?: string, options?: ChatOptions): AsyncGenerator<StreamChunk> {
    const { signal } = options || {};

    const openaiMessages: ResponseInput = messages
      .filter(m => m.role === "user" || m.role === "assistant")
      .map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content
      }));

    try {
      if (seedUrl) {
        yield { type: SSEEvent.ACTION, action: { action: "navigate", url: seedUrl }, toolName: "computer" };
        await this.navigationManager.navigate(seedUrl, NavigatorRole.SYSTEM);
        yield { type: SSEEvent.ACTION_COMPLETED };
      }

      let response = await this.client.responses.create({
        model: this.model,
        tools: this.getProviderTools(),
        input: openaiMessages,
        truncation: "auto",
        instructions: this.systemPrompt,
        reasoning: {
          effort: "medium",
          summary: "detailed",
        },
      }, { signal });

      while (true) {
        if (signal?.aborted) {
          yield { type: SSEEvent.DONE, content: "Stopped by user" };
          break;
        }
        const reasoningItems = response.output.filter(
          (item) => item.type === "reasoning" && "summary" in item
        );

        if (reasoningItems.length > 0 && reasoningItems[0]?.summary?.length > 0) {
          const summaries = reasoningItems[0].summary;
          const summaryTexts = summaries
            .filter((s: { type: string }) => s.type === 'summary_text')
            .map((s: { text: string }) => s.text);

          if (summaryTexts.length > 0) {
            yield {
              type: SSEEvent.REASONING,
              content: summaryTexts.join('\n\n')
            };
          }
        }
        console.log(response.output);
        const toolCalls = response.output
          .map(item => this.toStandardToolCall(item as OpenAIToolCall))
          .filter((call): call is StandardToolCall => call !== null);

        if (toolCalls.length === 0) {
          yield { type: SSEEvent.DONE };
          break;
        }

        const toolResults: OpenAIToolResult[] = [];

        for (const toolCall of toolCalls) {
          if (toolCall.name === 'format_result') {
            yield {
              type: SSEEvent.RESULT,
              result: {
                summary: (toolCall.input.summary as string) || '',
                keyFindings: toolCall.input.keyFindings as string[] | undefined,
                sources: (toolCall.input.sources as string[]) || [],
                metadata: {}
              }
            };

            toolResults.push({
              call_id: toolCall.id,
              type: "function_call_output",
              output: "Result formatted and sent to user"
            });
          } else {
            yield {
              type: SSEEvent.ACTION,
              action: toolCall.input as ComputerAction,
              toolName: toolCall.name
            };

            const result = await this.executor.execute(toolCall);

            yield { type: SSEEvent.ACTION_COMPLETED };

            toolResults.push(this.toProviderToolResult(result));
          }
        }

        if (toolResults.length > 0) {
          response = await this.client.responses.create({
            model: this.model,
            previous_response_id: response.id,
            instructions: this.systemPrompt,
            tools: this.getProviderTools(),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            input: toolResults as any,
            truncation: "auto",
            reasoning: {
              effort: "medium",
              summary: "detailed",
            },
          }, { signal });
        }
      }
    } catch (error) {
      console.error("OpenAI provider error:", error);

      yield {
        type: SSEEvent.ERROR,
        error: extractErrorMessage(error)
      };
    }
  }
}
