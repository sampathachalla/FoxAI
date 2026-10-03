import { Router } from 'express';
import {
  handleAssistantChat,
  handleAssistantChatStream,
  handleSystemStatus,
  handleAssistantTools,
  handleDeepgramTTS,
  handleGetDeepgramVoices,
  handleHermesAgent,
  handleVoiceTTS,
  handleGetVoiceTTSEngines,
  handleGetVoiceTTSVoices,
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

// Voice Text-to-Speech (Microsoft Edge TTS & Piper TTS, served by the voice container)
router.post('/voice-tts', handleVoiceTTS);

// Available Voice TTS engines & their availability status
router.get('/voice-tts/engines', handleGetVoiceTTSEngines);

// Available voices for a given Voice TTS engine
router.get('/voice-tts/voices', handleGetVoiceTTSVoices);

// Specialized assistant tools
router.post('/tools', handleAssistantTools);

export default router;

