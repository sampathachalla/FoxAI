import { Router } from 'express';
import { AccessToken } from 'livekit-server-sdk';

const router = Router();

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

  const identity = requestedIdentity || `fox-web-${Date.now()}`;
  const room = requestedRoom || `fox-${identity}`;

  try {
    const token = new AccessToken(apiKey, apiSecret, {
      identity,
      name: 'Fox Web User',
      ttl: '15m',
    });

    token.addGrant({
      roomJoin: true,
      room,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    return res.json({
      token: await token.toJwt(),
      url,
      room,
      identity,
    });
  } catch (error) {
    console.error('[LiveKit] Failed to mint access token:', error);
    return res.status(500).json({ error: 'Failed to create LiveKit token' });
  }
});

export default router;
