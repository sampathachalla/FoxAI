import { useCallback, useEffect, useRef, useState } from 'react';
import type { VoicePreference } from '../types';
import {
  FoxLiveKitVoiceSession,
  type FoxAgentState,
  toLiveKitTtsConfig,
} from '../services/livekitVoice';

/**
 * One LiveKit session for the whole tab, kept outside React so it survives
 * component remounts, hot-reloads and StrictMode double-invokes. Without this,
 * every remount tore down the room mid-turn and started a new one, so the agent
 * never got to answer.
 */
let sharedSession: FoxLiveKitVoiceSession | null = null;
function getSession(): FoxLiveKitVoiceSession {
  if (!sharedSession) sharedSession = new FoxLiveKitVoiceSession();
  return sharedSession;
}

// A remount within this window reuses the live room instead of reconnecting.
const DISCONNECT_GRACE_MS = 5000;
let pendingDisconnect: ReturnType<typeof setTimeout> | null = null;
let inFlightConnect: Promise<void> | null = null;

interface UseLiveKitVoiceOptions {
  /** Connect as soon as the consuming component mounts (Voice mode). */
  autoConnect?: boolean;
}

export function useLiveKitVoice(
  voicePrefs?: VoicePreference,
  options: UseLiveKitVoiceOptions = {},
) {
  const { autoConnect = false } = options;
  const enabled = Boolean((import.meta as any).env?.VITE_LIVEKIT_VOICE_ENABLED === 'true');

  const voicePrefsRef = useRef<VoicePreference | undefined>(voicePrefs);
  voicePrefsRef.current = voicePrefs;

  const [connected, setConnected] = useState(() => getSession().isConnected());
  const [connecting, setConnecting] = useState(false);
  const [agentState, setAgentState] = useState<FoxAgentState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [userTranscript, setUserTranscript] = useState('');
  const [agentTranscript, setAgentTranscript] = useState('');

  useEffect(() => {
    const session = getSession();
    session.setAgentStateListener(setAgentState);
    session.setTranscriptListener((t) => {
      setUserTranscript(t.user);
      setAgentTranscript(t.agent);
    });
    return () => {
      session.setAgentStateListener(null);
      session.setTranscriptListener(null);
    };
  }, []);

  const connect = useCallback(async () => {
    if (!enabled) return;
    if (pendingDisconnect) {
      clearTimeout(pendingDisconnect);
      pendingDisconnect = null;
    }
    const session = getSession();
    if (session.isConnected()) {
      setConnected(true);
      return;
    }
    if (inFlightConnect) return inFlightConnect;

    setConnecting(true);
    setError(null);
    inFlightConnect = session
      .connect(toLiveKitTtsConfig(voicePrefsRef.current))
      .then(() => {
        setConnected(true);
        setAgentState('listening');
      })
      .catch((err) => {
        setConnected(false);
        setAgentState('idle');
        setError(err instanceof Error ? err.message : 'Failed to start realtime voice');
      })
      .finally(() => {
        setConnecting(false);
        inFlightConnect = null;
      });
    return inFlightConnect;
  }, [enabled]);

  const disconnect = useCallback(async () => {
    if (pendingDisconnect) {
      clearTimeout(pendingDisconnect);
      pendingDisconnect = null;
    }
    await getSession().disconnect();
    setConnected(false);
    setConnecting(false);
    setAgentState('idle');
  }, []);

  const toggle = useCallback(async () => {
    if (!enabled) return;
    if (getSession().isConnected()) {
      await disconnect();
    } else {
      await connect();
    }
  }, [enabled, connect, disconnect]);

  // Auto-connect for Voice mode, with a grace period on unmount so a remount
  // (hot reload, mode toggle, StrictMode) does not kill an active call.
  useEffect(() => {
    if (!enabled || !autoConnect) return;
    void connect();
    return () => {
      if (pendingDisconnect) clearTimeout(pendingDisconnect);
      pendingDisconnect = setTimeout(() => {
        pendingDisconnect = null;
        void getSession().disconnect();
        setConnected(false);
        setAgentState('idle');
      }, DISCONNECT_GRACE_MS);
    };
  }, [enabled, autoConnect, connect]);

  // Push voice/TTS preference changes to the live agent without reconnecting.
  useEffect(() => {
    if (!enabled || !connected) return;
    void getSession()
      .updateTtsConfig(toLiveKitTtsConfig(voicePrefs))
      .catch((err) => {
        console.error('[Fox LiveKit] Failed to update TTS settings:', err);
      });
  }, [
    enabled,
    connected,
    voicePrefs?.provider,
    voicePrefs?.deepgramVoice,
    voicePrefs?.hermesEdgeVoice,
    voicePrefs?.hermesPiperVoice,
  ]);

  return {
    enabled,
    connected,
    connecting,
    agentState,
    error,
    userTranscript,
    agentTranscript,
    connect,
    disconnect,
    toggle,
  };
}
