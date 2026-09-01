import { ChatMessage, AssistantToolCall, DeepgramVoiceItem } from '../types';
import { apiUrl } from './http';

export interface AssistantChatResponse {
  success: boolean;
  data?: {
    text: string;
    thought?: string;
    steps?: any[];
    toolsDetected?: AssistantToolCall[];
    tokens?: {
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
    };
    durationMs?: number;
    sources?: { title: string; url: string }[];
    timestamp: number;
  };
  error?: string;
}

export interface AssistantStatusResponse {
  status: string;
  assistantName: string;
  version: string;
  engine: string;
  hasApiKey: boolean;
  hasOpenAIKey?: boolean;
  hasGeminiKey?: boolean;
  hasDeepgramKey?: boolean;
  hasWakeWord?: boolean;
  wakeWordEnabled?: boolean;
  wakeWordServiceHealthy?: boolean;
  wakeWordPhrase?: string;
  wakeWordWebSocketUrl?: string;
  wakeWordModelConfigured?: boolean;
  wakeWordLoadError?: string | null;
  deepgramModel?: string;
  supportedModals: string[];
}

export interface DeepgramVoicesResponse {
  success: boolean;
  hasApiKey: boolean;
  voices: DeepgramVoiceItem[];
  defaultVoice: string;
}

export async function fetchAssistantChat(
  prompt: string,
  history: ChatMessage[] = [],
  personaPrompt?: string,
  model?: string,
  provider?: string
): Promise<AssistantChatResponse> {
  const response = await fetch(apiUrl('/api/assistant/chat'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt, history, personaPrompt, model, provider }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({ error: 'Network request failed' }));
    throw new Error(errData.error || `Server responded with status ${response.status}`);
  }

  return response.json();
}

export async function streamAssistantChat(
  prompt: string,
  history: ChatMessage[] = [],
  personaPrompt: string | undefined,
  onChunk: (chunk: string) => void,
  onComplete: () => void,
  onError: (err: any) => void,
  model?: string,
  provider?: string
): Promise<() => void> {
  const controller = new AbortController();

  (async () => {
    try {
      const response = await fetch(apiUrl('/api/assistant/chat/stream'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt, history, personaPrompt, model, provider }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Streaming failed with status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('ReadableStream not supported on response.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '').trim();
            if (dataStr === '[DONE]') {
              onComplete();
              return;
            }
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.chunk) {
                onChunk(parsed.chunk);
              } else if (parsed.error) {
                onError(new Error(parsed.error));
              }
            } catch (e) {
              // Ignore non-json chunks
            }
          }
        }
      }
      onComplete();
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        onError(err);
      }
    }
  })();

  return () => controller.abort();
}

export async function fetchDetectTools(
  prompt: string,
  responseText: string
): Promise<{ success: boolean; toolsDetected: AssistantToolCall[] }> {
  const response = await fetch(apiUrl('/api/assistant/detect-tools'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt, responseText }),
  });

  if (!response.ok) {
    return { success: false, toolsDetected: [] };
  }

  return response.json();
}

export async function fetchSystemStatus(): Promise<AssistantStatusResponse> {
  const response = await fetch(apiUrl('/api/assistant/status'));
  if (!response.ok) {
    throw new Error('Failed to fetch system status');
  }
  return response.json();
}

export async function fetchDeepgramTTS(text: string, model: string = 'aura-2-asteria-en'): Promise<Blob> {
  const response = await fetch(apiUrl('/api/assistant/tts'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, model }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Deepgram TTS synthesis failed' }));
    throw new Error(err.error || `TTS synthesis failed with status ${response.status}`);
  }

  return response.blob();
}

export async function fetchDeepgramVoices(): Promise<DeepgramVoicesResponse> {
  const response = await fetch(apiUrl('/api/assistant/voices'));
  if (!response.ok) {
    throw new Error('Failed to fetch Deepgram voices list');
  }
  return response.json();
}

export async function fetchHermesTTS(
  text: string,
  engine: 'edge' | 'piper' = 'edge',
  voice?: string
): Promise<Blob> {
  const response = await fetch(apiUrl('/api/assistant/hermes-tts'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, engine, voice }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Hermes TTS synthesis failed' }));
    throw new Error(err.error || `Hermes TTS synthesis failed with status ${response.status}`);
  }

  return response.blob();
}

export async function fetchHermesTTSEngines(): Promise<{ success: boolean; engines: any[] }> {
  const response = await fetch(apiUrl('/api/assistant/hermes-tts/engines'));
  if (!response.ok) {
    throw new Error('Failed to fetch Hermes TTS engines');
  }
  return response.json();
}

export async function fetchHermesTTSVoices(
  engine: 'edge' | 'piper' = 'edge'
): Promise<{ success: boolean; engine: string; voices: any[] }> {
  const response = await fetch(apiUrl(`/api/assistant/hermes-tts/voices?engine=${encodeURIComponent(engine)}`));
  if (!response.ok) {
    throw new Error('Failed to fetch Hermes TTS voices');
  }
  return response.json();
}
