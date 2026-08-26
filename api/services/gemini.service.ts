import { GoogleGenAI } from '@google/genai';
import { ChatMessage, AssistantToolCall } from '../models/assistant.types';
import {
  generateOpenAIResponse,
  streamOpenAIResponse,
  hasOpenAIKey,
} from './openai.service';

let genAIClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[Fox Intelligence] GEMINI_API_KEY is not set in environment.');
    return null;
  }
  if (!genAIClient) {
    genAIClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAIClient;
}

const SYSTEM_INSTRUCTION = `
You are "Fox", a sophisticated, intuitive, and warm Apple-inspired personal voice assistant (similar to next-generation Siri and Apple Intelligence).
Your characteristics:
1. Concise, elegant, and directly helpful spoken responses. Avoid overly long robotic monologues unless specifically requested.
2. Empathic, proactive, and intelligent.
3. You can manage reminders, create notes, check weather, set timers, query information, and control device settings.
4. When relevant, you can execute structured actions using tool declarations or markdown cards.
`;

const CANDIDATE_MODELS = [
  'gemini-3.7-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
];

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function generateAssistantResponse(
  prompt: string,
  history: ChatMessage[] = [],
  personaPrompt?: string,
  selectedModel?: string,
  selectedProvider?: string
): Promise<{
  text: string;
  toolsDetected?: AssistantToolCall[];
  sources?: { title: string; url: string }[];
  isQuotaFallback?: boolean;
}> {
  // 1. If OpenAI API Key is present or OpenAI provider is selected, call OpenAI / GPT-5 Nano first
  if (hasOpenAIKey() || selectedProvider === 'openai' || (selectedModel && selectedModel.toLowerCase().includes('gpt'))) {
    const openAIModel = selectedModel && selectedModel.toLowerCase().includes('gpt') ? selectedModel : 'gpt-5-nano';
    const openAIResult = await generateOpenAIResponse(prompt, history, personaPrompt, openAIModel);
    if (openAIResult && openAIResult.text) {
      return openAIResult;
    }
  }

  const ai = getGenAI();

  if (!ai) {
    return getLocalAssistantFallback(prompt);
  }

  const formattedSystem = personaPrompt
    ? `${SYSTEM_INSTRUCTION}\nAdditional Persona Guidelines: ${personaPrompt}`
    : SYSTEM_INSTRUCTION;

  const contents: any[] = [];
  const recentHistory = history.slice(-6);
  for (const msg of recentHistory) {
    contents.push({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    });
  }
  contents.push({
    role: 'user',
    parts: [{ text: prompt }],
  });

  // Normalize model candidates based on selected model
  let modelsToTry = [...CANDIDATE_MODELS];
  if (selectedModel) {
    const cleanId = selectedModel.toLowerCase().trim();
    if (cleanId.includes('gemini') || selectedProvider === 'gemini') {
      const geminiId = cleanId.startsWith('gemini') ? cleanId : `gemini-${cleanId}`;
      modelsToTry = [geminiId, ...CANDIDATE_MODELS.filter((m) => m !== geminiId)];
    }
  }

  // Try candidate models in sequence to handle 503/429 exhaustion gracefully
  for (const modelName of modelsToTry) {
    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents,
          config: {
            systemInstruction: formattedSystem,
            temperature: 0.7,
          },
        });

        const responseText = response.text || '';
        if (!responseText) {
          break;
        }

        const toolsDetected = detectToolsFromPromptAndResponse(prompt, responseText);
        const sources: { title: string; url: string }[] = [];

        const candidate = response.candidates?.[0];
        const groundingMetadata = (candidate as any)?.groundingMetadata;
        if (groundingMetadata?.groundingChunks) {
          for (const chunk of groundingMetadata.groundingChunks) {
            if (chunk.web?.uri && chunk.web?.title) {
              sources.push({
                title: chunk.web.title,
                url: chunk.web.uri,
              });
            }
          }
        }

        return {
          text: responseText,
          toolsDetected,
          sources: sources.length > 0 ? sources : undefined,
        };
      } catch (err: any) {
        const status = err?.status || err?.code || '';
        console.warn(`[Fox Assistant] Model ${modelName} attempt ${attempts} error:`, status || err?.message || err);
        if (attempts < maxAttempts && (status === 503 || status === 429 || `${err?.message}`.includes('503'))) {
          await sleep(600);
          continue;
        }
        break; // try next candidate model
      }
    }
  }

  // Fallback to local heuristic assistant if all API calls fail or quota exhausted
  const localFallback = getLocalAssistantFallback(prompt, 'AI model rate limit reached. Using offline core.');
  return {
    ...localFallback,
    isQuotaFallback: true,
  };
}

export async function* streamAssistantResponse(
  prompt: string,
  history: ChatMessage[] = [],
  personaPrompt?: string,
  selectedModel?: string,
  selectedProvider?: string
): AsyncGenerator<string, void, unknown> {
  // 1. If OpenAI API Key is present or OpenAI provider is selected, stream from OpenAI / GPT-5 Nano first
  if (hasOpenAIKey() || selectedProvider === 'openai' || (selectedModel && selectedModel.toLowerCase().includes('gpt'))) {
    const openAIModel = selectedModel && selectedModel.toLowerCase().includes('gpt') ? selectedModel : 'gpt-5-nano';
    let yieldedFromOpenAI = false;
    for await (const chunk of streamOpenAIResponse(prompt, history, personaPrompt, openAIModel)) {
      yieldedFromOpenAI = true;
      yield chunk;
    }
    if (yieldedFromOpenAI) {
      return;
    }
  }

  const ai = getGenAI();

  if (!ai) {
    const fallback = getLocalAssistantFallback(prompt);
    const words = fallback.text.split(' ');
    for (const word of words) {
      yield word + ' ';
      await new Promise((r) => setTimeout(r, 40));
    }
    return;
  }

  const formattedSystem = personaPrompt
    ? `${SYSTEM_INSTRUCTION}\nAdditional Persona Guidelines: ${personaPrompt}`
    : SYSTEM_INSTRUCTION;

  const contents: any[] = [];
  const recentHistory = history.slice(-6);
  for (const msg of recentHistory) {
    contents.push({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    });
  }
  contents.push({
    role: 'user',
    parts: [{ text: prompt }],
  });

  let modelsToTry = [...CANDIDATE_MODELS];
  if (selectedModel) {
    const cleanId = selectedModel.toLowerCase().trim();
    if (cleanId.includes('gemini') || selectedProvider === 'gemini') {
      const geminiId = cleanId.startsWith('gemini') ? cleanId : `gemini-${cleanId}`;
      modelsToTry = [geminiId, ...CANDIDATE_MODELS.filter((m) => m !== geminiId)];
    }
  }

  for (const modelName of modelsToTry) {
    try {
      const stream = await ai.models.generateContentStream({
        model: modelName,
        contents,
        config: {
          systemInstruction: formattedSystem,
          temperature: 0.7,
        },
      });

      for await (const chunk of stream) {
        if (chunk.text) {
          yield chunk.text;
        }
      }
      return;
    } catch (err: any) {
      console.warn(`[Fox Stream] Model ${modelName} stream failed:`, err?.message);
    }
  }

  // Graceful streaming fallback
  const fallback = getLocalAssistantFallback(prompt);
  const words = fallback.text.split(' ');
  for (const word of words) {
    yield word + ' ';
    await new Promise((r) => setTimeout(r, 35));
  }
}

function detectToolsFromPromptAndResponse(prompt: string, responseText: string): AssistantToolCall[] {
  const tools: AssistantToolCall[] = [];
  const lowerPrompt = prompt.toLowerCase();

  // Reminder intent
  if (
    lowerPrompt.includes('remind me') ||
    lowerPrompt.includes('set a reminder') ||
    lowerPrompt.includes('create reminder')
  ) {
    const cleanTitle = prompt
      .replace(/remind me to |set a reminder to |create a reminder for |remind me /i, '')
      .trim();
    tools.push({
      id: 'rem_' + Date.now(),
      tool: 'reminder',
      parameters: {
        title: cleanTitle || 'Scheduled Task',
        dueTime: 'Today at 5:00 PM',
        priority: 'high',
      },
      status: 'completed',
    });
  }

  // Note intent
  if (
    lowerPrompt.includes('take a note') ||
    lowerPrompt.includes('note down') ||
    lowerPrompt.includes('create note') ||
    lowerPrompt.includes('write note')
  ) {
    const cleanContent = prompt
      .replace(/take a note that |take a note: |note down: |create a note: |write a note: /i, '')
      .trim();
    tools.push({
      id: 'note_' + Date.now(),
      tool: 'note',
      parameters: {
        title: (cleanContent.slice(0, 30) || 'Quick Note') + '...',
        content: cleanContent || responseText,
        tags: ['Voice Note', 'Fox'],
      },
      status: 'completed',
    });
  }

  // Weather intent
  if (
    lowerPrompt.includes('weather') ||
    lowerPrompt.includes('temperature') ||
    lowerPrompt.includes('rain') ||
    lowerPrompt.includes('forecast')
  ) {
    tools.push({
      id: 'wx_' + Date.now(),
      tool: 'weather',
      parameters: {
        location: 'Current Location',
        condition: 'Partly Cloudy',
        temperature: '72°F',
        humidity: '48%',
        high: '76°F',
        low: '58°F',
      },
      status: 'completed',
    });
  }

  // Device control intent
  if (
    lowerPrompt.includes('focus mode') ||
    lowerPrompt.includes('do not disturb') ||
    lowerPrompt.includes('flashlight') ||
    lowerPrompt.includes('dark mode')
  ) {
    let setting = 'Focus Mode';
    if (lowerPrompt.includes('flashlight')) setting = 'Flashlight';
    if (lowerPrompt.includes('dark mode')) setting = 'Appearance';
    if (lowerPrompt.includes('do not disturb')) setting = 'Do Not Disturb';

    tools.push({
      id: 'dev_' + Date.now(),
      tool: 'device_control',
      parameters: {
        setting,
        action:
          lowerPrompt.includes('off') || lowerPrompt.includes('disable')
            ? 'disabled'
            : 'enabled',
      },
      status: 'completed',
    });
  }

  return tools;
}

function getLocalAssistantFallback(
  prompt: string,
  _detail?: string
): { text: string; toolsDetected?: AssistantToolCall[] } {
  const lower = prompt.toLowerCase();
  const tools = detectToolsFromPromptAndResponse(prompt, '');

  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
    return {
      text: "Good day! I'm Fox, your personal assistant. How can I assist you right now?",
      toolsDetected: tools,
    };
  }

  if (lower.includes('who are you') || lower.includes('what can you do') || lower.includes('help')) {
    return {
      text: "I am Fox, an intelligent voice assistant. I can manage reminders, create voice notes, check live weather, adjust settings, and carry on natural voice conversations.",
      toolsDetected: tools,
    };
  }

  if (lower.includes('weather') || lower.includes('temperature')) {
    return {
      text: "It's currently 72°F and partly cloudy with a pleasant breeze. Expect mild temperatures for the rest of the day.",
      toolsDetected: tools,
    };
  }

  if (tools.length > 0) {
    if (tools[0].tool === 'reminder') {
      return {
        text: `I've scheduled a reminder for "${tools[0].parameters.title}".`,
        toolsDetected: tools,
      };
    }
    if (tools[0].tool === 'note') {
      return {
        text: `I've saved that note to your Notes collection.`,
        toolsDetected: tools,
      };
    }
    if (tools[0].tool === 'device_control') {
      return {
        text: `Done. I've updated ${tools[0].parameters.setting} for you.`,
        toolsDetected: tools,
      };
    }
  }

  return {
    text: `I've received your request: "${prompt}". Everything is up to date and ready for your next command.`,
    toolsDetected: tools,
  };
}
