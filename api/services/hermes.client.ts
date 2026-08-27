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
