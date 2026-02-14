export interface StandardToolCall {
  id: string;
  name: string;
  input: Record<string, any>;
}

export interface StandardToolResult {
  toolCallId: string;
  content: ToolResultContent;
}

export type ToolResultContent = 
  | { type: 'text'; text: string }
  | { type: 'image'; base64: string; mediaType: 'image/png' | 'image/jpeg' };

export interface ToolSchema {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}
