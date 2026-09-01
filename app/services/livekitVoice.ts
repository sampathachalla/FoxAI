import { Room, RoomEvent, Track } from 'livekit-client';
import type { VoicePreference } from '../types';
import { apiUrl } from './http';

export interface LiveKitTokenResponse {
  token: string;
  url: string;
  room: string;
  identity: string;
  ttsProvider?: string;
  ttsVoice?: string;
}

export interface LiveKitTtsConfig {
  provider: 'deepgram' | 'edge' | 'piper';
  voice: string;
}

export type FoxAgentState = 'idle' | 'listening' | 'thinking' | 'searching' | 'speaking';

interface AgentStatePacket {
  type: 'agent_state';
  state: FoxAgentState;
  source?: string;
  session_id?: string;
}

const AGENT_STATE_TOPIC = 'fox.agent.state';

export function toLiveKitTtsConfig(voicePrefs?: VoicePreference): LiveKitTtsConfig {
  const provider = voicePrefs?.provider;

  if (provider === 'deepgram') {
    return {
      provider: 'deepgram',
      voice: voicePrefs.deepgramVoice || '',
    };
  }

  if (provider === 'hermes-piper') {
    return {
      provider: 'piper',
      voice: voicePrefs.hermesPiperVoice || '',
    };
  }

  return {
    provider: 'edge',
    voice: voicePrefs?.hermesEdgeVoice || '',
  };
}

export async function fetchLiveKitToken(ttsConfig: LiveKitTtsConfig): Promise<LiveKitTokenResponse> {
  const response = await fetch(apiUrl('/api/livekit/token'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ttsProvider: ttsConfig.provider,
      ttsVoice: ttsConfig.voice,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: 'LiveKit token request failed' }));
    throw new Error(payload.error || `LiveKit token request failed (${response.status})`);
  }

  return response.json();
}

export interface FoxTranscript {
  /** Latest speech-to-text of what the user said this turn. */
  user: string;
  /** Latest transcript of what the agent is saying / said this turn. */
  agent: string;
}

export class FoxLiveKitVoiceSession {
  private room: Room | null = null;
  private attachedAudio = new Set<HTMLMediaElement>();
  private agentStateListener: ((state: FoxAgentState) => void) | null = null;
  private transcriptListener: ((t: FoxTranscript) => void) | null = null;
  private transcript: FoxTranscript = { user: '', agent: '' };

  setAgentStateListener(listener: ((state: FoxAgentState) => void) | null): void {
    this.agentStateListener = listener;
  }

  setTranscriptListener(listener: ((t: FoxTranscript) => void) | null): void {
    this.transcriptListener = listener;
    if (listener) listener({ ...this.transcript });
  }

  private emitTranscript(): void {
    this.transcriptListener?.({ ...this.transcript });
  }

  async connect(ttsConfig: LiveKitTtsConfig): Promise<Room> {
    if (this.room?.state === 'connected') {
      await this.updateTtsConfig(ttsConfig);
      return this.room;
    }

    const credentials = await fetchLiveKitToken(ttsConfig);
    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
    });

    room.on(RoomEvent.TrackSubscribed, (track) => {
      if (track.kind !== Track.Kind.Audio) return;
      const element = track.attach();
      element.autoplay = true;
      element.setAttribute('data-fox-livekit-audio', 'true');
      element.style.display = 'none';
      document.body.appendChild(element);
      this.attachedAudio.add(element);
    });

    room.on(RoomEvent.TrackUnsubscribed, (track) => {
      track.detach().forEach((element) => {
        element.remove();
        this.attachedAudio.delete(element);
      });
    });

    // Live captions: STT of the user's speech and the agent's spoken reply are
    // both delivered as transcription segments. Segments from the local
    // participant are the user; anything else is Fox.
    room.on(RoomEvent.TranscriptionReceived, (segments: any[], participant?: any) => {
      try {
        const text = (segments || [])
          .map((s) => (s && typeof s.text === 'string' ? s.text : ''))
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (!text) return;

        const isUser =
          !!participant &&
          !!this.room &&
          participant.identity === this.room.localParticipant.identity;

        if (isUser) {
          // A fresh user utterance starts the next turn: drop the old reply.
          this.transcript = { user: text, agent: '' };
        } else {
          this.transcript = { ...this.transcript, agent: text };
        }
        this.emitTranscript();
      } catch (error) {
        console.debug('[Fox LiveKit] Ignoring transcription segment', error);
      }
    });

    // Keep this handler intentionally tolerant of SDK argument-shape changes.
    // Search state is supplemental UI and must never affect the audio session.
    room.on(RoomEvent.DataReceived, (...args: any[]) => {
      try {
        const payload = args[0] as Uint8Array;
        const topic = args[3] as string | undefined;
        if (topic !== AGENT_STATE_TOPIC || !payload) return;

        const packet = JSON.parse(new TextDecoder().decode(payload)) as AgentStatePacket;
        if (packet.type !== 'agent_state') return;
        if (!['idle', 'listening', 'thinking', 'searching', 'speaking'].includes(packet.state)) return;
        this.agentStateListener?.(packet.state);
      } catch (error) {
        console.debug('[Fox LiveKit] Ignoring invalid agent-state packet', error);
      }
    });

    room.on(RoomEvent.Disconnected, () => {
      this.cleanupAudio();
      this.agentStateListener?.('idle');
    });

    await room.connect(credentials.url, credentials.token);
    await room.localParticipant.setMicrophoneEnabled(true);
    this.room = room;
    this.agentStateListener?.('listening');
    return room;
  }

  async updateTtsConfig(ttsConfig: LiveKitTtsConfig): Promise<void> {
    if (!this.room || this.room.state !== 'connected') return;

    await this.room.localParticipant.setAttributes({
      'fox.tts.provider': ttsConfig.provider,
      'fox.tts.voice': ttsConfig.voice,
    });
  }

  async disconnect(): Promise<void> {
    const room = this.room;
    this.room = null;
    if (room) {
      await room.localParticipant.setMicrophoneEnabled(false).catch(() => undefined);
      await room.disconnect();
    }
    this.cleanupAudio();
    this.transcript = { user: '', agent: '' };
    this.emitTranscript();
    this.agentStateListener?.('idle');
  }

  isConnected(): boolean {
    return this.room?.state === 'connected';
  }

  private cleanupAudio(): void {
    this.attachedAudio.forEach((element) => element.remove());
    this.attachedAudio.clear();
  }
}