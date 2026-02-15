import { ComputerAction, BashCommand, TextEditorCommand, GoogleSearchCommand, WebCrawlerCommand, Resolution } from '@/types/sandbox.types';
import { Sandbox } from '@e2b/desktop';

export type MessageRole = 'user' | 'assistant' | 'system';
export interface Message {
  role: MessageRole;
  content: string;
}

export interface ChatOptions {
  signal?: AbortSignal;
}

export enum SSEEvent {
  INIT = 'init',
  ERROR = 'error',
  DONE = 'done',
  ACTION = 'action',
  ACTION_COMPLETED = 'action_completed',
  REASONING = 'reasoning',
  RESULT = 'result',
}

export type AgentAction = ComputerAction
  | BashCommand
  | TextEditorCommand
  | GoogleSearchCommand
  | WebCrawlerCommand;

export interface ResearchResult {
  summary: string;
  keyFindings?: string[];
  sources: string[];
  metadata?: Record<string, unknown>;
}

export interface StreamChunk {
  type: SSEEvent;
  sandboxId?: string;
  vncUrl?: string;
  content?: string;
  error?: string;
  action?: AgentAction;
  toolName?: string;
  isCompleted?: boolean;
  result?: ResearchResult;
}

export interface BaseComputerStreamer {
  executeAgentLoop(messages: Message[], seedUrl?: string | undefined, options?: ChatOptions): AsyncGenerator<StreamChunk>;
}

export enum LLMProvider {
  ANTHROPIC = "anthropic",
  OPENAI = "openai",
  GOOGLE = "google",
}

export interface ComputerAgentConfig {
  apiKey?: string;
  provider?: LLMProvider;
  model?: string;
  desktop: Sandbox;
  resolution: Resolution;
  systemPrompt?: string;
}

