export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface HermesMessage {
  role: MessageRole;
  content: string;
  name?: string;
  tool_call_id?: string;
  thought?: string;
}

export interface JSONSchemaProperty {
  type: string;
  description?: string;
  enum?: string[];
  items?: JSONSchemaProperty;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
}

export interface HermesToolSchema {
  type: 'object';
  properties: Record<string, JSONSchemaProperty>;
  required?: string[];
}

export interface HermesToolDefinition {
  name: string;
  description: string;
  parameters: HermesToolSchema;
  execute: (args: Record<string, any>, context?: any) => Promise<any> | any;
}

export interface HermesToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface HermesToolResult {
  toolCallId: string;
  name: string;
  result?: any;
  error?: string;
}

export interface HermesExecutionStep {
  step: number;
  thought?: string;
  toolCalls?: HermesToolCall[];
  observations?: HermesToolResult[];
  rawOutput?: string;
}

export interface HermesAgentConfig {
  model?: string;
  provider?: 'openai' | 'gemini' | 'auto';
  temperature?: number;
  maxIterations?: number;
  systemPrompt?: string;
  verbose?: boolean;
}

export interface HermesAgentResponse {
  success: boolean;
  text: string;
  thought?: string;
  steps: HermesExecutionStep[];
  toolsExecuted: HermesToolCall[];
  durationMs: number;
  error?: string;
}
