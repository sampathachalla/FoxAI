import { ChatMessage, AssistantToolCall } from '../models/assistant.types';
import { detectToolsFromPromptAndResponse } from '../utils/toolDetection';

export const DEFAULT_LOCAL_BASE_URL = 'https://spry-defensive-snowless.ngrok-free.dev';
export const DEFAULT_LOCAL_MODEL = 'qwen2.5:0.5b';
export const DEFAULT_LOCAL_SYSTEM = 'You are "Fox", a sophisticated, intuitive, and warm Apple-inspired personal voice assistant (similar to next-generation Siri and Apple Intelligence). Concise, elegant, empathic, and directly helpful.';

export const AVAILABLE_LOCAL_MODELS = [
  'llama3.2:1b',
  'gemma3:1b',
  'qwen2.5:0.5b',
  'smollm2:360m',
  'qwen3:1.7b',
];

export function getLocalLlmApiKey(): string | null {
  const key =
    process.env.OWN_LLM_API ||
    process.env.own_llm_api ||
    process.env.OWN_LLM_KEY ||
    process.env.own_llm_key;
  return key ? key.trim() : null;
}

export function getLocalLlmBaseUrl(): string {
  const url =
    process.env.OWN_LLM_BASE_URL ||
    process.env.own_llm_base_url ||
    DEFAULT_LOCAL_BASE_URL;
  return url.replace(/\/+$/, '');
}

export function hasLocalLlmKey(): boolean {
  return Boolean(getLocalLlmApiKey());
}

export function isLocalLlmModel(modelName?: string): boolean {
  if (!modelName) return false;
  const lower = modelName.toLowerCase();
  return (
    AVAILABLE_LOCAL_MODELS.some((m) => lower.includes(m.toLowerCase()) || lower === m.toLowerCase()) ||
    lower.includes('qwen') ||
    lower.includes('llama') ||
    lower.includes('gemma') ||
    lower.includes('smollm') ||
    lower.includes('ollama') ||
    lower.includes('local')
  );
}

export interface LocalLlmRunResult {
  text: string;
  toolsDetected?: AssistantToolCall[];
  sources?: { title: string; url: string }[];
  latencyMs?: number;
  tokens?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export async function generateLocalLlmResponse(
  prompt: string,
  history: ChatMessage[] = [],
  personaPrompt?: string,
  selectedModel?: string
): Promise<LocalLlmRunResult | null> {
  const apiKey = getLocalLlmApiKey();
  const baseUrl = getLocalLlmBaseUrl();

  const model = selectedModel && isLocalLlmModel(selectedModel)
    ? (AVAILABLE_LOCAL_MODELS.find(m => selectedModel.toLowerCase().includes(m.toLowerCase())) || selectedModel)
    : DEFAULT_LOCAL_MODEL;

  const system = personaPrompt
    ? `${DEFAULT_LOCAL_SYSTEM}\nAdditional Directives: ${personaPrompt}`
    : DEFAULT_LOCAL_SYSTEM;

  // Build conversational context into the message
  const recentHistory = history.slice(-6);
  let formattedMessage = prompt;
  if (recentHistory.length > 0) {
    const historyTranscript = recentHistory
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');
    formattedMessage = `Conversation history:\n${historyTranscript}\n\nCurrent User Question: ${prompt}`;
  }

  const startedAt = Date.now();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  };

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  try {
    const response = await fetch(`${baseUrl}/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        message: formattedMessage,
        system,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.warn(`[Local LLM Service] Request failed with ${response.status}: ${errorText}`);
      throw new Error(`Local LLM API error (${response.status}): ${errorText}`);
    }

    const result = (await response.json()) as any;
    const latencyMs = Date.now() - startedAt;

    // Handle choices format or direct text/response format
    const content =
      result?.choices?.[0]?.message?.content ||
      result?.content ||
      result?.response ||
      result?.text ||
      (typeof result === 'string' ? result : JSON.stringify(result));

    if (!content) {
      return null;
    }

    const toolsDetected = detectToolsFromPromptAndResponse(prompt, content);

    const promptTokens = result?.usage?.prompt_tokens ?? Math.max(1, Math.round(prompt.length / 3.8));
    const completionTokens = result?.usage?.completion_tokens ?? Math.max(1, Math.round(content.length / 3.8));
    const totalTokens = result?.usage?.total_tokens ?? (promptTokens + completionTokens);

    return {
      text: content,
      toolsDetected,
      latencyMs,
      tokens: {
        promptTokens,
        completionTokens,
        totalTokens,
      },
    };
  } catch (error: any) {
    console.error('[Local LLM Service] Execution error:', error?.message || error);
    return null;
  }
}

export async function* streamLocalLlmResponse(
  prompt: string,
  history: ChatMessage[] = [],
  personaPrompt?: string,
  selectedModel?: string
): AsyncGenerator<string, void, unknown> {
  const result = await generateLocalLlmResponse(prompt, history, personaPrompt, selectedModel);
  if (!result || !result.text) {
    return;
  }

  // Smooth tokenized streaming emission for responsive audio visualization
  const words = result.text.split(/(\s+)/);
  for (const chunk of words) {
    if (chunk) {
      yield chunk;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }
}
