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

const CANDIDATE_MODELS = ['deepseek-reasoner', 'deepseek-chat'];

export function getDeepSeekApiKey(): string | null {
  const key =
    process.env.DEEPSEEK_API_KEY ||
    process.env.deepseek_api_key ||
    process.env.DEEPSEEK_KEY ||
    process.env.deepseek_key;
  return key ? key.trim() : null;
}

export function hasDeepSeekKey(): boolean {
  return Boolean(getDeepSeekApiKey());
}

export function normalizeDeepSeekModel(modelId?: string): string {
  if (!modelId) return 'deepseek-reasoner';
  const clean = modelId.toLowerCase().trim();
  if (clean.includes('r1') || clean.includes('reasoner')) return 'deepseek-reasoner';
  return 'deepseek-chat';
}

export async function generateDeepSeekResponse(
  prompt: string,
  history: ChatMessage[] = [],
  personaPrompt?: string,
  selectedModel?: string
): Promise<{
  text: string;
  thought?: string;
  toolsDetected?: AssistantToolCall[];
} | null> {
  const apiKey = getDeepSeekApiKey();
  if (!apiKey) return null;

  const targetModel = normalizeDeepSeekModel(selectedModel);
  const system = personaPrompt
    ? `${SYSTEM_INSTRUCTION}\nAdditional Guidelines: ${personaPrompt}`
    : SYSTEM_INSTRUCTION;

  const messages: any[] = [{ role: 'system', content: system }];
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
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: model.includes('reasoner') ? undefined : 0.7,
        }),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        console.warn(`[Fox DeepSeek] Model ${model} returned ${response.status}: ${errText}`);
        continue;
      }

      const data = (await response.json()) as any;
      const msg = data?.choices?.[0]?.message;
      const responseText = msg?.content || '';
      const thought = msg?.reasoning_content || '';

      if (responseText) {
        const toolsDetected = detectToolsFromPromptAndResponse(prompt, responseText);
        return {
          text: responseText,
          thought: thought || undefined,
          toolsDetected,
        };
      }
    } catch (err: any) {
      console.warn(`[Fox DeepSeek] Error calling ${model}:`, err?.message || err);
    }
  }

  return null;
}

export async function* streamDeepSeekResponse(
  prompt: string,
  history: ChatMessage[] = [],
  personaPrompt?: string,
  selectedModel?: string
): AsyncGenerator<string, void, unknown> {
  const result = await generateDeepSeekResponse(prompt, history, personaPrompt, selectedModel);
  if (!result || !result.text) return;

  const chunks = result.text.split(/(\s+)/);
  for (const chunk of chunks) {
    if (chunk) {
      yield chunk;
      await new Promise((r) => setTimeout(r, 20));
    }
  }
}
