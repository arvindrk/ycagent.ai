import { ComputerAction, BashCommand, TextEditorCommand, GoogleSearchCommand } from '@/lib/sandbox-desktop/types';

export interface Message {
  role: 'user' | 'assistant' | 'system';
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
}

export interface StreamChunk {
  type: SSEEvent;
  sandboxId?: string;
  vncUrl?: string;
  content?: string;
  error?: string;
  action?: ComputerAction | BashCommand | TextEditorCommand | GoogleSearchCommand;
  toolName?: string;
  isCompleted?: boolean;
}

export type ComputerModel = "anthropic";

export interface ComputerInteractionStreamerFacade {
  executeAgentLoop(messages: Message[], seedUrl?: string | undefined, options?: ChatOptions): AsyncGenerator<StreamChunk>;
}

export enum ComputerAgent {
  ANTHROPIC = "anthropic",
}

