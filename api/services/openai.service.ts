import OpenAI from 'openai';
import { ChatMessage, AssistantToolCall } from '../models/assistant.types';
import { detectToolsFromPromptAndResponse } from '../utils/toolDetection';

let openaiClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPEN_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

export function hasOpenAIKey(): boolean {
  return Boolean(process.env.OPEN_API_KEY || process.env.OPENAI_API_KEY);
}

const SYSTEM_INSTRUCTION = `
You are "Fox", a sophisticated, intuitive, and warm Apple-inspired personal voice assistant (similar to next-generation Siri and Apple Intelligence) powered by GPT-5 Nano.
Your characteristics:
1. Concise, elegant, and directly helpful spoken responses. Avoid overly long robotic monologues unless specifically requested.
2. Empathic, proactive, and intelligent.
3. You can manage reminders, create notes, check weather, set timers, query information, and control device settings.
4. When relevant, you can execute structured actions using tool declarations or markdown cards.
`;

const CANDIDATE_MODELS = ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'];

export async function generateOpenAIResponse(
  prompt: string,
  history: ChatMessage[] = [],
  personaPrompt?: string,
  selectedModel: string = 'gpt-4o-mini'
): Promise<{
  text: string;
  toolsDetected?: AssistantToolCall[];
  sources?: { title: string; url: string }[];
} | null> {
  const client = getOpenAIClient();
  if (!client) return null;

  const formattedSystem = personaPrompt
    ? `${SYSTEM_INSTRUCTION}\nAdditional Persona Guidelines: ${personaPrompt}`
    : SYSTEM_INSTRUCTION;

  const messages: any[] = [{ role: 'system', content: formattedSystem }];
  const recentHistory = history.slice(-6);
  for (const msg of recentHistory) {
    messages.push({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    });
  }
  messages.push({ role: 'user', content: prompt });

  let modelsToTry = [
    selectedModel || 'gpt-4o-mini',
    ...CANDIDATE_MODELS.filter((m) => m !== selectedModel),
  ];

  for (const modelName of modelsToTry) {
    try {
      const isReasoningOrFixedTempModel =
        modelName.includes('o1') ||
        modelName.includes('o3');

      const completionOptions: any = {
        model: modelName,
        messages,
      };

      if (!isReasoningOrFixedTempModel) {
        completionOptions.temperature = 0.7;
      }

      const completion = await client.chat.completions.create(completionOptions);

      const responseText = completion.choices[0]?.message?.content || '';
      if (responseText) {
        const toolsDetected = detectToolsFromPromptAndResponse(prompt, responseText);
        return {
          text: responseText,
          toolsDetected,
        };
      }
    } catch (err: any) {
      console.warn(`[Fox Assistant OpenAI] Model ${modelName} attempt error:`, err?.message || err);
    }
  }

  return null;
}

export async function* streamOpenAIResponse(
  prompt: string,
  history: ChatMessage[] = [],
  personaPrompt?: string,
  selectedModel: string = 'gpt-4o-mini'
): AsyncGenerator<string, void, unknown> {
  const client = getOpenAIClient();
  if (!client) return;

  const formattedSystem = personaPrompt
    ? `${SYSTEM_INSTRUCTION}\nAdditional Persona Guidelines: ${personaPrompt}`
    : SYSTEM_INSTRUCTION;

  const messages: any[] = [{ role: 'system', content: formattedSystem }];
  const recentHistory = history.slice(-6);
  for (const msg of recentHistory) {
    messages.push({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    });
  }
  messages.push({ role: 'user', content: prompt });

  let modelsToTry = [
    selectedModel || 'gpt-4o-mini',
    ...CANDIDATE_MODELS.filter((m) => m !== selectedModel),
  ];

  for (const modelName of modelsToTry) {
    try {
      const isReasoningOrFixedTempModel =
        modelName.includes('o1') ||
        modelName.includes('o3');

      const streamOptions: any = {
        model: modelName,
        messages,
        stream: true,
      };

      if (!isReasoningOrFixedTempModel) {
        streamOptions.temperature = 0.7;
      }

      const stream = (await client.chat.completions.create(streamOptions)) as any;

      let hasYielded = false;
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          hasYielded = true;
          yield content;
        }
      }
      if (hasYielded) {
        return;
      }
    } catch (err: any) {
      console.warn(`[Fox Stream OpenAI] Model ${modelName} stream error:`, err?.message || err);
    }
  }
}

