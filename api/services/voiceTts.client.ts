// Edge/Piper speech served over HTTP by the voice container (voice/local_tts/).
const VOICE_TTS_URL = process.env.VOICE_TTS_URL || 'http://127.0.0.1:8200';

export interface VoiceTTSEngineInfo {
  id: string;
  name: string;
  requiresNetwork: boolean;
  available: boolean;
}

export async function synthesizeVoiceSpeech(
  text: string,
  engine: 'edge' | 'piper' = 'edge',
  voice?: string
): Promise<{ buffer: Buffer; contentType: string }> {
  const response = await fetch(`${VOICE_TTS_URL}/tts/synthesize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, engine, voice }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => 'Unknown voice TTS error');
    throw new Error(`Voice TTS service returned ${response.status}: ${errText}`);
  }

  const contentType = response.headers.get('content-type') || 'audio/mpeg';
  const arrayBuffer = await response.arrayBuffer();
  return { buffer: Buffer.from(arrayBuffer), contentType };
}

export async function getVoiceTTSEngines(): Promise<VoiceTTSEngineInfo[]> {
  const response = await fetch(`${VOICE_TTS_URL}/tts/engines`, {
    signal: AbortSignal.timeout(3000),
  });
  if (!response.ok) {
    throw new Error(`Voice TTS engines request returned ${response.status}`);
  }
  const data = await response.json();
  return data.engines || [];
}

export async function getVoiceTTSVoices(engine: 'edge' | 'piper' = 'edge'): Promise<any[]> {
  const response = await fetch(
    `${VOICE_TTS_URL}/tts/voices?engine=${encodeURIComponent(engine)}`,
    { signal: AbortSignal.timeout(5000) }
  );
  if (!response.ok) {
    throw new Error(`Voice TTS voices request returned ${response.status}`);
  }
  const data = await response.json();
  return data.voices || [];
}
