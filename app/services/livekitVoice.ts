import { Room, RoomEvent, Track } from 'livekit-client';
import type { VoicePreference } from '../types';

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

  // Hermes Edge is the default realtime provider. `webspeech` and `auto`
  // cannot run inside the worker, so they intentionally map to Edge instead
  // of silently selecting an unsupported backend.
  return {
    provider: 'edge',
    voice: voicePrefs?.hermesEdgeVoice || '',
  };
}

export async function fetchLiveKitToken(ttsConfig: LiveKitTtsConfig): Promise<LiveKitTokenResponse> {
  const response = await fetch('/api/livekit/token', {
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

export class FoxLiveKitVoiceSession {
  private room: Room | null = null;
  private attachedAudio = new Set<HTMLMediaElement>();

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

    room.on(RoomEvent.Disconnected, () => this.cleanupAudio());

    await room.connect(credentials.url, credentials.token);
    await room.localParticipant.setMicrophoneEnabled(true);
    this.room = room;
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
  }

  isConnected(): boolean {
    return this.room?.state === 'connected';
  }

  private cleanupAudio(): void {
    this.attachedAudio.forEach((element) => element.remove());
    this.attachedAudio.clear();
  }
}