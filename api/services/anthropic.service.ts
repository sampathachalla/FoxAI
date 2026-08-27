import { ChatMessage, AssistantToolCall } from '../models/assistant.types';
import { detectToolsFromPromptAndResponse } from '../utils/toolDetection';

const SYSTEM_INSTRUCTION = `
You are "Fox", a sophisticated, intuitive, and warm Apple-inspired personal voice assistant (similar to next-generation Siri and Apple Intelligence).
Your characteristics:
1. Concise, elegant, and directly helpful spoken responses. Avoid overly long robotic monologues unless specifically requested.
2. Empathic, proactive, and intelligent.
3. You can manage reminders, create notes, check weather, set timers, query information, and control device settings.
4. When relevant, you can execute structured actions using tool declarations or markdown cards.
`;

const CANDIDATE_MODELS = [
  'claude-3-7-sonnet-20250219',
  'claude-3-5-sonnet-20241022',
  'claude-3-5-haiku-20241022',
  'claude-3-opus-20240229',
];

export function getAnthropicApiKey(): string | null {
  const key =
    process.env.ANTHROPIC_API_KEY ||
    process.env.anthropic_api_key ||
    process.env.CLAUDE_API_KEY ||
    process.env.claude_api_key;
  return key ? key.trim() : null;
}

export function hasAnthropicKey(): boolean {
  return Boolean(getAnthropicApiKey());
}

export function normalizeAnthropicModel(modelId?: string): string {
  if (!modelId) return CANDIDATE_MODELS[0];
  const clean = modelId.toLowerCase().trim();
  if (clean.includes('3-7') || clean.includes('3.7')) return 'claude-3-7-sonnet-20250219';
  if (clean.includes('haiku')) return 'claude-3-5-haiku-20241022';
  if (clean.includes('opus')) return 'claude-3-opus-20240229';
  if (clean.includes('3-5') || clean.includes('3.5') || clean.includes('sonnet')) return 'claude-3-5-sonnet-20241022';
  return CANDIDATE_MODELS[0];
}

export async function generateAnthropicResponse(
  prompt: string,
  history: ChatMessage[] = [],
  personaPrompt?: string,
  selectedModel?: string
): Promise<{
  text: string;
  toolsDetected?: AssistantToolCall[];
} | null> {
  const apiKey = getAnthropicApiKey();
  if (!apiKey) return null;

  const targetModel = normalizeAnthropicModel(selectedModel);
  const system = personaPrompt
    ? `${SYSTEM_INSTRUCTION}\nAdditional Guidelines: ${personaPrompt}`
    : SYSTEM_INSTRUCTION;

  const messages: { role: 'user' | 'assistant'; content: string }[] = [];
  const recentHistory = history.slice(-6);
  for (const msg of recentHistory) {
    messages.push({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    });
  }
  messages.push({ role: 'user', content: prompt });

  const modelsToTry = [
    targetModel,
    ...CANDIDATE_MODELS.filter((m) => m !== targetModel),
  ];

  for (const model of modelsToTry) {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: 1024,
          system,
          messages,
        }),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        console.warn(`[Fox Anthropic] Model ${model} returned ${response.status}: ${errText}`);
        continue;
      }

      const data = (await response.json()) as any;
      const textBlock = (data?.content || []).find((c: any) => c.type === 'text');
      const responseText = textBlock?.text || '';

      if (responseText) {
        const toolsDetected = detectToolsFromPromptAndResponse(prompt, responseText);
        return {
          text: responseText,
          toolsDetected,
        };
      }
    } catch (err: any) {
      console.warn(`[Fox Anthropic] Error calling ${model}:`, err?.message || err);
    }
  }

  return null;
}

export async function* streamAnthropicResponse(
  prompt: string,
  history: ChatMessage[] = [],
  personaPrompt?: string,
  selectedModel?: string
): AsyncGenerator<string, void, unknown> {
  const result = await generateAnthropicResponse(prompt, history, personaPrompt, selectedModel);
  if (!result || !result.text) return;

  const chunks = result.text.split(/(\s+)/);
  for (const chunk of chunks) {
    if (chunk) {
      yield chunk;
      await new Promise((r) => setTimeout(r, 20));
    }
  }
}
