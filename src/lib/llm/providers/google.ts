import { GoogleGenAI, Content, Part, FunctionCall, Tool } from "@google/genai";
import { ComputerAgentConfig, BaseComputerStreamer, Message, ChatOptions, StreamChunk, SSEEvent } from "@/types/llm.types";
import { ResolutionScaler } from "@/lib/sandbox-desktop/resolution";
import { ActionExecutor } from "@/lib/sandbox-desktop/executor";
import { NavigationManager, NavigatorRole } from "@/lib/sandbox-desktop/navigation";
import { StandardToolCall, StandardToolResult } from "@/types/tool.types";
import { ComputerAction } from "@/types/sandbox.types";
import { extractErrorMessage } from "@/lib/utils";
import { DEFAULT_SYSTEM_PROMPT } from "@/constants/llm.constants";
import { ALL_TOOLS } from "@/lib/tools/registry";
import { toGoogleToolSchema } from "@/lib/tools/adapters";

export class GoogleComputerStreamer implements BaseComputerStreamer {
  private client: GoogleGenAI;
  private model: string;
  private systemPrompt: string;
  private scaler: ResolutionScaler;
  private executor: ActionExecutor;
  private navigationManager: NavigationManager;

  constructor(config: ComputerAgentConfig) {
    this.client = new GoogleGenAI({
      apiKey: config.apiKey || process.env.GEMINI_API_KEY,
      vertexai: false,
      apiVersion: 'v1beta'
    });
    this.systemPrompt = config.systemPrompt || DEFAULT_SYSTEM_PROMPT;
    this.model = config.model || "gemini-3-flash-preview";
    this.scaler = new ResolutionScaler(config.desktop, config.resolution);
    this.navigationManager = new NavigationManager(config.desktop);
    this.executor = new ActionExecutor(config.desktop, this.scaler, this.navigationManager);
  }

  private getProviderTools(): Tool[] {
    return [
      // {
      //   computerUse: {
      //     environment: Environment.ENVIRONMENT_BROWSER,
      //   }
      // },
      {
        functionDeclarations: ALL_TOOLS.map(toGoogleToolSchema)
      }
    ];
  }

  private toStandardToolCall(functionCall: FunctionCall): StandardToolCall {
    return {
      id: functionCall.id || `call_${Date.now()}`,
      name: functionCall.name || "unknown",
      input: (functionCall.args || {}) as Record<string, unknown>
    };
  }

  private toProviderToolResult(result: StandardToolResult): Part {
    if (result.content.type === 'text') {
      return {
        functionResponse: {
          id: result.toolCallId,
          name: result.toolCallId.startsWith('computer') ? 'computer' : 'function',
          response: { output: result.content.text }
        }
      };
    }

    return {
      functionResponse: {
        id: result.toolCallId,
        name: 'computer',
        response: { output: 'screenshot' },
        parts: [
          {
            inlineData: {
              mimeType: result.content.mediaType,
              data: result.content.base64
            }
          }
        ]
      }
    };
  }

  async *executeAgentLoop(messages: Message[], seedUrl?: string, options?: ChatOptions): AsyncGenerator<StreamChunk> {
    const { signal } = options || {};

    const googleMessages: Content[] = messages
      .filter(m => m.role === "user" || m.role === "assistant")
      .map(m => ({
        role: m.role as "user" | "model",
        parts: [{ text: m.content }]
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

        const response = await this.client.models.generateContent({
          model: this.model,
          contents: googleMessages,
          config: {
            systemInstruction: this.systemPrompt,
            tools: this.getProviderTools(),
            thinkingConfig: {
              includeThoughts: true,
              thinkingBudget: 2048
            },
            abortSignal: signal,
          }
        });

        if (response.usageMetadata) {
          console.log('Google usage:', {
            thoughtsTokens: response.usageMetadata.thoughtsTokenCount,
            outputTokens: response.usageMetadata.candidatesTokenCount,
            totalTokens: response.usageMetadata.totalTokenCount
          });
        }

        const candidate = response.candidates?.[0];
        if (!candidate || !candidate.content) {
          yield { type: SSEEvent.DONE };
          break;
        }

        const functionCalls: FunctionCall[] = [];
        let reasoningContent = "";

        for (const part of candidate.content.parts || []) {
          if (part.functionCall) {
            functionCalls.push(part.functionCall);
          } else if (part.thought && part.text) {
            reasoningContent += part.text;
          } else if (part.text && !reasoningContent) {
            reasoningContent = part.text;
          }
        }

        if (reasoningContent) {
          yield { type: SSEEvent.REASONING, content: reasoningContent };
        }

        if (functionCalls.length === 0) {
          yield { type: SSEEvent.DONE };
          break;
        }

        googleMessages.push({
          role: "model",
          parts: candidate.content.parts || []
        });

        const toolResults: Part[] = [];

        for (const functionCall of functionCalls) {
          const standardCall = this.toStandardToolCall(functionCall);

          yield {
            type: SSEEvent.ACTION,
            action: standardCall.input as ComputerAction,
            toolName: standardCall.name
          };

          const result = await this.executor.execute(standardCall);

          yield { type: SSEEvent.ACTION_COMPLETED };

          toolResults.push(this.toProviderToolResult(result));
        }

        if (toolResults.length > 0) {
          googleMessages.push({
            role: "user",
            parts: toolResults
          });
        }
      }
    } catch (error) {
      console.error("Google provider error:", error);

      yield {
        type: SSEEvent.ERROR,
        error: extractErrorMessage(error)
      };
    }
  }
}
