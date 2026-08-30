import { Router } from 'express';
import {
  handleAssistantChat,
  handleAssistantChatStream,
  handleSystemStatus,
  handleAssistantTools,
  handleDeepgramTTS,
  handleGetDeepgramVoices,
  handleHermesAgent,
  handleHermesTTS,
  handleGetHermesTTSEngines,
  handleGetHermesTTSVoices,
  handleDetectTools,
} from '../controllers/assistant.controller';

const router = Router();

// Autonomous Hermes Agent endpoint (Multi-step reasoning & tool execution)
router.post('/agent', handleHermesAgent);

// Chat completion endpoint (with tools & search grounding)
router.post('/chat', handleAssistantChat);

// Real-time streaming chat endpoint (SSE)
router.post('/chat/stream', handleAssistantChatStream);

// Lightweight tool-intent detection over a finished prompt+response pair (no LLM call)
router.post('/detect-tools', handleDetectTools);

// System telemetry & model status
router.get('/status', handleSystemStatus);

// Deepgram Text-to-Speech (Aura-2 & Aura-1)
router.post('/tts', handleDeepgramTTS);

// Available Deepgram Voices catalog
router.get('/voices', handleGetDeepgramVoices);

// Hermes Agent Text-to-Speech (Microsoft Edge TTS & Piper TTS, via Python microservice)
router.post('/hermes-tts', handleHermesTTS);

// Available Hermes TTS engines & their availability status
router.get('/hermes-tts/engines', handleGetHermesTTSEngines);

// Available voices for a given Hermes TTS engine
router.get('/hermes-tts/voices', handleGetHermesTTSVoices);

// Specialized assistant tools
router.post('/tools', handleAssistantTools);

export default router;

