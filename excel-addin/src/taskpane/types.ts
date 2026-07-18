export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  isError?: boolean;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, any>;
}

export interface ToolResult {
  tool_use_id: string;
  content: any;
}

export interface ChatResponse {
  type: "tool_calls" | "message";
  conversation_id: string;
  calls: ToolCall[];
  text?: string;
}
