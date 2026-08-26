import { HermesToolCall } from './types';

export interface ParsedHermesOutput {
  thought: string;
  toolCalls: HermesToolCall[];
  cleanText: string;
}

export function parseHermesOutput(rawText: string): ParsedHermesOutput {
  let thought = '';
  const toolCalls: HermesToolCall[] = [];

  // Extract <thought>...</thought>
  const thoughtMatch = rawText.match(/<thought>([\s\S]*?)<\/thought>/i);
  if (thoughtMatch) {
    thought = thoughtMatch[1].trim();
  }

  // Extract <tool_call>...</tool_call> blocks
  const toolCallRegex = /<tool_call>([\s\S]*?)<\/tool_call>/gi;
  let match: RegExpExecArray | null;

  while ((match = toolCallRegex.exec(rawText)) !== null) {
    const rawJson = match[1].trim();
    try {
      const parsed = JSON.parse(rawJson);
      if (parsed && parsed.name) {
        toolCalls.push({
          id: `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: parsed.name,
          arguments: parsed.arguments || parsed.parameters || {},
        });
      }
    } catch (err) {
      console.warn('[Hermes Parser] Failed to parse tool_call JSON:', rawJson);
    }
  }

  // Clean out XML tags from final text presentation
  let cleanText = rawText
    .replace(/<thought>[\s\S]*?<\/thought>/gi, '')
    .replace(/<tool_call>[\s\S]*?<\/tool_call>/gi, '')
    .trim();

  return {
    thought,
    toolCalls,
    cleanText,
  };
}
