export interface WakeWordHealth {
  status: 'ok' | 'degraded';
  service: string;
  enabled: boolean;
  ready: boolean;
  phrase: string;
  modelPath: string;
  modelExists: boolean;
  threshold: number;
  cooldownSeconds: number;
  loadError?: string | null;
}

const WAKEWORD_SERVICE_URL = process.env.WAKEWORD_SERVICE_URL || 'http://127.0.0.1:8011';
const WAKEWORD_PUBLIC_WS_URL = process.env.WAKEWORD_PUBLIC_WS_URL;

export function getWakeWordServiceUrl(): string {
  return WAKEWORD_SERVICE_URL;
}

export function getWakeWordWebSocketUrl(): string {
  if (WAKEWORD_PUBLIC_WS_URL) {
    return WAKEWORD_PUBLIC_WS_URL;
  }

  return `${WAKEWORD_SERVICE_URL.replace(/^http/i, 'ws').replace(/\/$/, '')}/ws`;
}

export function isWakeWordEnabled(): boolean {
  return process.env.WAKEWORD_ENABLED !== 'false';
}

export async function checkWakeWordHealth(): Promise<WakeWordHealth | null> {
  if (!isWakeWordEnabled()) {
    return null;
  }

  try {
    const response = await fetch(`${WAKEWORD_SERVICE_URL.replace(/\/$/, '')}/health`, {
      signal: AbortSignal.timeout(1500),
    });

    if (!response.ok) {
      throw new Error(`Wake-word health returned ${response.status}`);
    }

    return (await response.json()) as WakeWordHealth;
  } catch {
    return null;
  }
}
