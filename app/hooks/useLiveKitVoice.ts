import { useCallback, useEffect, useRef, useState } from 'react';
import type { VoicePreference } from '../types';
import {
  FoxLiveKitVoiceSession,
  type FoxAgentState,
  toLiveKitTtsConfig,
} from '../services/livekitVoice';

export function useLiveKitVoice(voicePrefs?: VoicePreference) {
  const enabled = Boolean((import.meta as any).env?.VITE_LIVEKIT_VOICE_ENABLED === 'true');
  const sessionRef = useRef<FoxLiveKitVoiceSession | null>(null);
  const voicePrefsRef = useRef<VoicePreference | undefined>(voicePrefs);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [agentState, setAgentState] = useState<FoxAgentState>('idle');
  const [error, setError] = useState<string | null>(null);

  voicePrefsRef.current = voicePrefs;

  if (!sessionRef.current) {
    sessionRef.current = new FoxLiveKitVoiceSession();
  }

  useEffect(() => {
    sessionRef.current?.setAgentStateListener(setAgentState);
    return () => sessionRef.current?.setAgentStateListener(null);
  }, []);

  const connect = useCallback(async () => {
    if (!enabled || connecting || connected) return;
    setConnecting(true);
    setError(null);
    try {
      await sessionRef.current!.connect(toLiveKitTtsConfig(voicePrefsRef.current));
      setConnected(true);
      setAgentState('listening');
    } catch (err) {
      setConnected(false);
      setAgentState('idle');
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
    setAgentState('idle');
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
    if (!enabled || !connected) return;

    void sessionRef.current
      ?.updateTtsConfig(toLiveKitTtsConfig(voicePrefs))
      .catch((err) => {
        console.error('[Fox LiveKit] Failed to update TTS settings:', err);
        setError(err instanceof Error ? err.message : 'Failed to update realtime TTS settings');
      });
  }, [enabled, connected, voicePrefs?.provider, voicePrefs?.deepgramVoice, voicePrefs?.hermesEdgeVoice, voicePrefs?.hermesPiperVoice]);

  useEffect(() => {
    return () => {
      void sessionRef.current?.disconnect();
    };
  }, []);

  return {
    enabled,
    connected,
    connecting,
    agentState,
    error,
    connect,
    disconnect,
    toggle,
  };
}