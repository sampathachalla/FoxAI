import { Router } from 'express';
import {
  handleAssistantChat,
  handleAssistantChatStream,
  handleSystemStatus,
  handleAssistantTools,
  handleDeepgramTTS,
  handleGetDeepgramVoices,
} from '../controllers/assistant.controller';

const router = Router();

// Chat completion endpoint (with tools & search grounding)
router.post('/chat', handleAssistantChat);

// Real-time streaming chat endpoint (SSE)
router.post('/chat/stream', handleAssistantChatStream);

// System telemetry & model status
router.get('/status', handleSystemStatus);

// Deepgram Text-to-Speech (Aura-2 & Aura-1)
router.post('/tts', handleDeepgramTTS);

// Available Deepgram Voices catalog
router.get('/voices', handleGetDeepgramVoices);

// Specialized assistant tools
router.post('/tools', handleAssistantTools);

export default router;

