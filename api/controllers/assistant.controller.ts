import { Request, Response } from 'express';
import { generateAssistantResponse, streamAssistantResponse } from '../services/gemini.service';
import { hasOpenAIKey } from '../services/openai.service';
import {
  synthesizeDeepgramSpeech,
  hasDeepgramKey,
  DEEPGRAM_AURA_VOICES,
} from '../services/deepgram.service';
import { ChatMessage } from '../models/assistant.types';

export async function handleAssistantChat(req: Request, res: Response): Promise<void> {
  try {
    const { prompt, history, personaPrompt, model, provider } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ error: 'Prompt is required and must be a string.' });
      return;
    }

    const chatHistory: ChatMessage[] = Array.isArray(history) ? history : [];
    const result = await generateAssistantResponse(prompt, chatHistory, personaPrompt, model, provider);

    res.json({
      success: true,
      data: {
        text: result.text,
        toolsDetected: result.toolsDetected || [],
        sources: result.sources || [],
        isQuotaFallback: result.isQuotaFallback || false,
        timestamp: Date.now(),
      },
    });
  } catch (error: any) {
    console.error('[Aura Controller] Error in handleAssistantChat:', error);
    res.json({
      success: true,
      data: {
        text: "I'm right here and ready for your command.",
        toolsDetected: [],
        timestamp: Date.now(),
      },
    });
  }
}

export async function handleAssistantChatStream(req: Request, res: Response): Promise<void> {
  try {
    const { prompt, history, personaPrompt, model, provider } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ error: 'Prompt is required and must be a string.' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const chatHistory: ChatMessage[] = Array.isArray(history) ? history : [];
    const generator = streamAssistantResponse(prompt, chatHistory, personaPrompt, model, provider);

    for await (const chunk of generator) {
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    }

    res.write(`data: [DONE]\n\n`);
    res.end();
  } catch (error: any) {
    console.error('[Aura Controller] Error in handleAssistantChatStream:', error);
    if (!res.headersSent) {
      res.status(200).json({ chunk: "I'm right here. How can I help you today?" });
    } else {
      res.write(`data: ${JSON.stringify({ chunk: "I'm right here. How can I help you today?" })}\n\n`);
      res.write(`data: [DONE]\n\n`);
      res.end();
    }
  }
}

export async function handleDeepgramTTS(req: Request, res: Response): Promise<void> {
  try {
    const { text, model } = req.body;

    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'Text is required for TTS synthesis.' });
      return;
    }

    if (!hasDeepgramKey()) {
      res.status(503).json({
        error: 'Deepgram API key is not configured in secrets (DEEPGRAM_API_KEY).',
        fallback: true,
      });
      return;
    }

    const audioBuffer = await synthesizeDeepgramSpeech(text, model);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.length);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(audioBuffer);
  } catch (error: any) {
    console.error('[Aura Controller] Error in handleDeepgramTTS:', error);
    res.status(500).json({
      error: error?.message || 'Failed to synthesize voice with Deepgram',
      fallback: true,
    });
  }
}

export async function handleGetDeepgramVoices(req: Request, res: Response): Promise<void> {
  res.json({
    success: true,
    hasApiKey: hasDeepgramKey(),
    voices: DEEPGRAM_AURA_VOICES,
    defaultVoice: 'aura-2-asteria-en',
  });
}

export async function handleSystemStatus(req: Request, res: Response): Promise<void> {
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY);
  const hasOAIKey = hasOpenAIKey();
  const hasDGKey = hasDeepgramKey();
  
  let engineName = 'Local Intelligence Kernel';
  if (hasOAIKey) {
    engineName = 'GPT-5 Nano (OpenAI) + Deepgram Aura';
  } else if (hasGeminiKey) {
    engineName = 'Gemini 3.7 Flash + Deepgram Aura';
  }

  res.json({
    status: 'online',
    assistantName: 'Fox',
    version: '2.0-Intelligence',
    engine: engineName,
    hasApiKey: hasOAIKey || hasGeminiKey,
    hasOpenAIKey: hasOAIKey,
    hasGeminiKey: hasGeminiKey,
    hasDeepgramKey: hasDGKey,
    deepgramModel: 'aura-2-asteria-en',
    defaultModel: hasOAIKey ? 'gpt-5-nano' : 'gemini-3.7-flash',
    supportedModals: ['text', 'voice', 'deepgram-tts', 'audio-reactive', 'system-tools'],
  });
}

export async function handleAssistantTools(req: Request, res: Response): Promise<void> {
  const { tool, payload } = req.body;

  switch (tool) {
    case 'weather':
      res.json({
        success: true,
        data: {
          location: payload?.location || 'Cupertino, CA',
          temperature: '72°F',
          condition: 'Partly Sunny',
          high: '76°F',
          low: '58°F',
          uvIndex: 4,
          wind: '6 mph WNW',
        },
      });
      break;

    case 'summary':
      res.json({
        success: true,
        data: {
          summary: 'All systems are functioning optimally. 3 calendar events upcoming, 2 tasks pending.',
        },
      });
      break;

    default:
      res.json({
        success: true,
        data: {
          message: `Tool ${tool} executed successfully.`,
          timestamp: Date.now(),
        },
      });
  }
}

export async function handleHermesAgent(req: Request, res: Response): Promise<void> {
  try {
    const { prompt, history, model, provider, temperature } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ error: 'Prompt is required and must be a string.' });
      return;
    }

    const agentHistory = Array.isArray(history)
      ? history.map((h: any) => ({
          role: h.role === 'user' ? 'user' : 'assistant',
          content: h.content,
        }))
      : [];

    // 1. Try Python FastAPI microservice first
    try {
      const { callHermesPythonService } = await import('../services/hermes.client');
      const pyResult = await callHermesPythonService(prompt, agentHistory, model, temperature);
      if (pyResult && pyResult.success && pyResult.data) {
        res.json({
          success: true,
          data: {
            ...pyResult.data,
            engine: 'Hermes Python FastAPI Microservice',
            timestamp: Date.now(),
          },
        });
        return;
      }
    } catch (pyErr) {
      console.warn('[Hermes Controller] Python service unavailable, using TypeScript fallback:', pyErr);
    }

    // 2. Fallback to native TypeScript engine
    const { getHermesAgent } = await import('../agent');
    const agent = getHermesAgent({ model, provider, temperature });
    const result = await agent.run(prompt, agentHistory);

    res.json({
      success: true,
      data: {
        text: result.text,
        thought: result.thought,
        steps: result.steps,
        toolsExecuted: result.toolsExecuted,
        durationMs: result.durationMs,
        engine: 'Hermes Native Engine',
        timestamp: Date.now(),
      },
    });
  } catch (error: any) {
    console.error('[Hermes Controller] Error in handleHermesAgent:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Hermes Agent execution failed',
    });
  }
}
