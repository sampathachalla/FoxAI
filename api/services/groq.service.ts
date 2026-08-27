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
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'mixtral-8x7b-32768',
  'gemma2-9b-it',
];

export function getGroqApiKey(): string | null {
  const key =
    process.env.GROQ_API_KEY ||
    process.env.groq_api_key ||
    process.env.GROQ_KEY ||
    process.env.groq_key;
  return key ? key.trim() : null;
}

export function hasGroqKey(): boolean {
  return Boolean(getGroqApiKey());
}

export function normalizeGroqModel(modelId?: string): string {
  if (!modelId) return CANDIDATE_MODELS[0];
  const clean = modelId.toLowerCase().trim();
  const match = CANDIDATE_MODELS.find((m) => clean.includes(m.toLowerCase()) || m.toLowerCase().includes(clean));
  return match || CANDIDATE_MODELS[0];
}

export async function generateGroqResponse(
  prompt: string,
  history: ChatMessage[] = [],
  personaPrompt?: string,
  selectedModel?: string
): Promise<{
  text: string;
  toolsDetected?: AssistantToolCall[];
} | null> {
  const apiKey = getGroqApiKey();
  if (!apiKey) return null;

  const targetModel = normalizeGroqModel(selectedModel);
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
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        console.warn(`[Fox Groq] Model ${model} returned ${response.status}: ${errText}`);
        continue;
      }

      const data = (await response.json()) as any;
      const responseText = data?.choices?.[0]?.message?.content || '';

      if (responseText) {
        const toolsDetected = detectToolsFromPromptAndResponse(prompt, responseText);
        return {
          text: responseText,
          toolsDetected,
        };
      }
    } catch (err: any) {
      console.warn(`[Fox Groq] Error calling ${model}:`, err?.message || err);
    }
  }

  return null;
}

export async function* streamGroqResponse(
  prompt: string,
  history: ChatMessage[] = [],
  personaPrompt?: string,
  selectedModel?: string
): AsyncGenerator<string, void, unknown> {
  const result = await generateGroqResponse(prompt, history, personaPrompt, selectedModel);
  if (!result || !result.text) return;

  const chunks = result.text.split(/(\s+)/);
  for (const chunk of chunks) {
    if (chunk) {
      yield chunk;
      await new Promise((r) => setTimeout(r, 15));
    }
  }
}
