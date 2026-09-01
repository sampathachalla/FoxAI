import { Router } from 'express';
import { AccessToken, RoomAgentDispatch, RoomConfiguration } from 'livekit-server-sdk';

const router = Router();

type RealtimeTtsProvider = 'deepgram' | 'edge' | 'piper';

function normalizeTtsProvider(value: unknown): RealtimeTtsProvider {
  if (value === 'deepgram') return 'deepgram';
  if (value === 'hermes-piper' || value === 'piper') return 'piper';
  // Edge is the safe/default realtime voice provider. Browser/auto selections
  // also land here so the worker never receives an unsupported provider name.
  return 'edge';
}

router.post('/token', async (req, res) => {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const url = process.env.LIVEKIT_URL;

  if (!apiKey || !apiSecret || !url) {
    return res.status(503).json({
      error: 'LiveKit is not configured',
    });
  }

  const requestedIdentity = typeof req.body?.identity === 'string' ? req.body.identity.trim() : '';
  const requestedRoom = typeof req.body?.room === 'string' ? req.body.room.trim() : '';
  const requestedVoice = typeof req.body?.ttsVoice === 'string' ? req.body.ttsVoice.trim() : '';
  const ttsProvider = normalizeTtsProvider(req.body?.ttsProvider);

  const identity = requestedIdentity || `fox-web-${Date.now()}`;
  const room = requestedRoom || `fox-${identity}`;

  try {
    const token = new AccessToken(apiKey, apiSecret, {
      identity,
      name: 'Fox Web User',
      ttl: '15m',
      attributes: {
        'fox.tts.provider': ttsProvider,
        'fox.tts.voice': requestedVoice,
      },
    });

    token.addGrant({
      roomJoin: true,
      room,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      // TTS settings are low-frequency participant state. Allow the frontend
      // to update them without reconnecting when the user changes Settings.
      canUpdateOwnMetadata: true,
    });

    // Dispatch the registered realtime worker when this browser joins the room.
    // Without this, the client connects successfully but Hermes never receives a job.
    const roomConfig = new RoomConfiguration();
    roomConfig.agents = [new RoomAgentDispatch({ agentName: 'fox' })];
    token.roomConfig = roomConfig;

    return res.json({
      token: await token.toJwt(),
      url,
      room,
      identity,
      ttsProvider,
      ttsVoice: requestedVoice,
    });
  } catch (error) {
    console.error('[LiveKit] Failed to mint access token:', error);
    return res.status(500).json({ error: 'Failed to create LiveKit token' });
  }
});

export default router;
