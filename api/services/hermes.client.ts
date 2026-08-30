export interface HermesPythonRunResult {
  success: boolean;
  data: {
    text: string;
    thought?: string;
    steps?: any[];
    toolsExecuted?: any[];
    durationMs?: number;
    tokens?: {
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
    };
  };
}

const FASTAPI_HERMES_URL = process.env.HERMES_FASTAPI_URL || 'http://127.0.0.1:8000';

export async function callHermesPythonService(
  prompt: string,
  history: any[] = [],
  model?: string,
  temperature?: number
): Promise<HermesPythonRunResult> {
  try {
    const response = await fetch(`${FASTAPI_HERMES_URL}/agent/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        history,
        model,
        temperature,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => 'Unknown Python error');
      throw new Error(`Hermes FastAPI returned ${response.status}: ${errText}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('[Hermes Client] Error connecting to Python FastAPI service:', error);
    throw error;
  }
}

export async function checkHermesPythonHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${FASTAPI_HERMES_URL}/health`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

export interface HermesTTSEngineInfo {
  id: string;
  name: string;
  requiresNetwork: boolean;
  available: boolean;
}

export async function synthesizeHermesSpeech(
  text: string,
  engine: 'edge' | 'piper' = 'edge',
  voice?: string
): Promise<{ buffer: Buffer; contentType: string }> {
  const response = await fetch(`${FASTAPI_HERMES_URL}/tts/synthesize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, engine, voice }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => 'Unknown Hermes TTS error');
    throw new Error(`Hermes TTS service returned ${response.status}: ${errText}`);
  }

  const contentType = response.headers.get('content-type') || 'audio/mpeg';
  const arrayBuffer = await response.arrayBuffer();
  return { buffer: Buffer.from(arrayBuffer), contentType };
}

export async function getHermesTTSEngines(): Promise<HermesTTSEngineInfo[]> {
  const response = await fetch(`${FASTAPI_HERMES_URL}/tts/engines`, {
    signal: AbortSignal.timeout(3000),
  });
  if (!response.ok) {
    throw new Error(`Hermes TTS engines request returned ${response.status}`);
  }
  const data = await response.json();
  return data.engines || [];
}

export async function getHermesTTSVoices(engine: 'edge' | 'piper' = 'edge'): Promise<any[]> {
  const response = await fetch(
    `${FASTAPI_HERMES_URL}/tts/voices?engine=${encodeURIComponent(engine)}`,
    { signal: AbortSignal.timeout(5000) }
  );
  if (!response.ok) {
    throw new Error(`Hermes TTS voices request returned ${response.status}`);
  }
  const data = await response.json();
  return data.voices || [];
}
