import { ComputerAction, BashCommand, TextEditorCommand, GoogleSearchCommand, WebCrawlerCommand, Resolution } from '@/types/sandbox.types';
import { Sandbox } from '@e2b/desktop';
import { ToolSchema } from '@/types/tool.types';

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
  THINKING = 'thinking',
  REASONING = 'reasoning',
  ACTION = 'action',
  ACTION_COMPLETED = 'action_completed',
  RESULT = 'result',
  DONE = 'done',
}

export type AgentAction = ComputerAction
  | BashCommand
  | TextEditorCommand
  | GoogleSearchCommand
  | WebCrawlerCommand;

interface BaseResearchResult {
  domain: string;
  summary: string;
  sources: string[];
  metadata?: Record<string, unknown>;
}

export interface FounderProfileResult extends BaseResearchResult {
  domain: 'founder_profile';
  executiveSummary: string;
  founderRelationship: string[];
  complementarySkills: string[];
  socialPresence: string[];
  trackRecord: string[];
  founders: Array<{
    name: string;
    title: string;
    education?: string[];
    previousCompanies?: string[];
    achievements?: string[];
    socialLinks?: {
      linkedin?: string;
      x?: string;
      github?: string;
    };
  }>;
}

export type ResearchResult = FounderProfileResult;

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
  tools?: ToolSchema[];
}

