import { Room, RoomEvent, Track } from 'livekit-client';

export interface LiveKitTokenResponse {
  token: string;
  url: string;
  room: string;
  identity: string;
}

export async function fetchLiveKitToken(): Promise<LiveKitTokenResponse> {
  const response = await fetch('/api/livekit/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
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

  async connect(): Promise<Room> {
    if (this.room?.state === 'connected') {
      return this.room;
    }

    const credentials = await fetchLiveKitToken();
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
