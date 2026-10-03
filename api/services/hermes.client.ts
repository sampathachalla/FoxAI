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

// Hermes' built-in OpenAI-compatible API server (hermes container).
const HERMES_URL = process.env.HERMES_URL || 'http://127.0.0.1:8000';
const HERMES_GATEWAY_KEY = process.env.HERMES_GATEWAY_KEY || '';

// `model` and `temperature` are chosen by Hermes' own config.yaml, so they are
// accepted for call-site compatibility but not forwarded.
export async function callHermesPythonService(
  prompt: string,
  history: any[] = [],
  _model?: string,
  _temperature?: number
): Promise<HermesPythonRunResult> {
  const startedAt = Date.now();
  try {
    const messages = [
      ...history
        .filter((h) => h && typeof h.content === 'string')
        .map((h) => ({ role: h.role === 'assistant' ? 'assistant' : 'user', content: h.content })),
      { role: 'user', content: prompt },
    ];
    const response = await fetch(`${HERMES_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${HERMES_GATEWAY_KEY}`,
      },
      body: JSON.stringify({ model: 'hermes-agent', messages }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => 'Unknown Hermes error');
      throw new Error(`Hermes returned ${response.status}: ${errText}`);
    }

    const body = await response.json();
    // Hermes reports agent/provider failures with HTTP 200 and `hermes.failed`.
    if (body?.hermes?.failed) {
      throw new Error(`Hermes run failed: ${body.hermes.error || 'unknown error'}`);
    }
    const usage = body?.usage || {};
    return {
      success: true,
      data: {
        text: String(body?.choices?.[0]?.message?.content || '').trim(),
        steps: [],
        toolsExecuted: [],
        durationMs: Date.now() - startedAt,
        tokens: {
          inputTokens: usage.prompt_tokens || 0,
          outputTokens: usage.completion_tokens || 0,
          totalTokens: usage.total_tokens || 0,
        },
      },
    };
  } catch (error: any) {
    console.error('[Hermes Client] Error calling Hermes:', error);
    throw error;
  }
}

export async function checkHermesPythonHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${HERMES_URL}/health`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}
