import { useCallback, useEffect, useRef, useState } from 'react';
import { FoxLiveKitVoiceSession } from '../services/livekitVoice';

export function useLiveKitVoice() {
  const enabled = Boolean((import.meta as any).env?.VITE_LIVEKIT_VOICE_ENABLED === 'true');
  const sessionRef = useRef<FoxLiveKitVoiceSession | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!sessionRef.current) {
    sessionRef.current = new FoxLiveKitVoiceSession();
  }

  const connect = useCallback(async () => {
    if (!enabled || connecting || connected) return;
    setConnecting(true);
    setError(null);
    try {
      await sessionRef.current!.connect();
      setConnected(true);
    } catch (err) {
      setConnected(false);
      setError(err instanceof Error ? err.message : 'Failed to start realtime voice');
      throw err;
    } finally {
      setConnecting(false);
    }
  }, [enabled, connecting, connected]);

  const disconnect = useCallback(async () => {
    await sessionRef.current?.disconnect();
    setConnected(false);
    setConnecting(false);
  }, []);

  const toggle = useCallback(async () => {
    if (!enabled) return;
    if (connected) {
      await disconnect();
    } else {
      await connect();
    }
  }, [enabled, connected, connect, disconnect]);

  useEffect(() => {
    return () => {
      void sessionRef.current?.disconnect();
    };
  }, []);

  return {
    enabled,
    connected,
    connecting,
    error,
    connect,
    disconnect,
    toggle,
  };
}
