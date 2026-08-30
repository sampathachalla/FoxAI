export type WakeWordSocketMessage =
  | { type: 'ready'; phrase: string; ready: boolean; loadError?: string | null }
  | { type: 'unavailable'; phrase: string; ready: boolean; loadError?: string | null }
  | { type: 'detected'; phrase: string; score: number; timestamp: number; modelKey: string }
  | { type: 'error'; message: string };

export interface WakeWordCallbacks {
  onReady?: (phrase: string) => void;
  onMonitoring?: () => void;
  onDetected?: (event: Extract<WakeWordSocketMessage, { type: 'detected' }>) => void;
  onUnavailable?: (message: string) => void;
  onError?: (error: Error) => void;
  onClosed?: () => void;
}

export class WakeWordStreamService {
  private static readonly TARGET_SAMPLE_RATE = 16000;
  private static readonly FRAME_SIZE = 1280;
  private socket: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private silenceGain: GainNode | null = null;
  private callbacks: WakeWordCallbacks = {};
  private activeUrl: string | null = null;
  private monitoring = false;
  private pendingSamples = new Float32Array(0);

  isMonitoring(): boolean {
    return this.monitoring;
  }

  async start(url: string, callbacks: WakeWordCallbacks): Promise<boolean> {
    if (!url) {
      callbacks.onError?.(new Error('Wake-word WebSocket URL is not configured.'));
      return false;
    }

    if (this.monitoring && this.activeUrl === url) {
      this.callbacks = callbacks;
      return true;
    }

    await this.stop(false);
    this.callbacks = callbacks;
    this.activeUrl = url;

    try {
      await this.connectSocket(url);

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) {
        throw new Error('Web Audio API is not supported in this browser.');
      }

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.audioContext = new AudioCtx();
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.processorNode = this.audioContext.createScriptProcessor(4096, 1, 1);
      this.silenceGain = this.audioContext.createGain();
      this.silenceGain.gain.value = 0;

      this.processorNode.onaudioprocess = (event) => {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;

        const input = event.inputBuffer.getChannelData(0);
        const resampled = this.resampleTo16k(input, event.inputBuffer.sampleRate);
        if (resampled.length === 0) return;

        this.pendingSamples = this.concatFloat32(this.pendingSamples, resampled);

        while (this.pendingSamples.length >= WakeWordStreamService.FRAME_SIZE) {
          const frame = this.pendingSamples.slice(0, WakeWordStreamService.FRAME_SIZE);
          this.pendingSamples = this.pendingSamples.slice(WakeWordStreamService.FRAME_SIZE);
          const pcm16 = this.floatTo16BitPCM(frame);
          this.socket.send(pcm16.buffer.slice(0));
        }
      };

      this.sourceNode.connect(this.processorNode);
      this.processorNode.connect(this.silenceGain);
      this.silenceGain.connect(this.audioContext.destination);

      this.monitoring = true;
      this.callbacks.onMonitoring?.();
      return true;
    } catch (error: any) {
      callbacks.onError?.(error instanceof Error ? error : new Error(String(error)));
      await this.stop(false);
      return false;
    }
  }

  async stop(notifyClosed = true): Promise<void> {
    this.monitoring = false;
    this.pendingSamples = new Float32Array(0);

    if (this.processorNode) {
      this.processorNode.onaudioprocess = null;
      try {
        this.processorNode.disconnect();
      } catch {}
      this.processorNode = null;
    }

    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {}
      this.sourceNode = null;
    }

    if (this.silenceGain) {
      try {
        this.silenceGain.disconnect();
      } catch {}
      this.silenceGain = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        await this.audioContext.close();
      } catch {}
      this.audioContext = null;
    }

    if (this.socket) {
      const socket = this.socket;
      this.socket = null;
      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close(1000, 'Wake-word monitoring stopped');
      }
    }

    this.activeUrl = null;
    if (notifyClosed) {
      this.callbacks.onClosed?.();
    }
  }

  private connectSocket(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(url);
      this.socket = socket;

      socket.binaryType = 'arraybuffer';
      socket.onopen = () => resolve();
      socket.onerror = () => reject(new Error('Failed to connect to the wake-word service.'));
      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(String(event.data)) as WakeWordSocketMessage;

          if (message.type === 'ready' && message.ready) {
            this.callbacks.onReady?.(message.phrase);
            return;
          }

          if (message.type === 'unavailable') {
            this.callbacks.onUnavailable?.(message.loadError || 'Wake-word model unavailable.');
            return;
          }

          if (message.type === 'detected') {
            this.callbacks.onDetected?.(message);
            return;
          }

          if (message.type === 'error') {
            this.callbacks.onError?.(new Error(message.message));
          }
        } catch {
          this.callbacks.onError?.(new Error('Invalid wake-word service message.'));
        }
      };
      socket.onclose = () => {
        this.monitoring = false;
        this.callbacks.onClosed?.();
      };
    });
  }

  private resampleTo16k(input: Float32Array, inputSampleRate: number): Float32Array {
    if (input.length === 0) {
      return input;
    }

    if (inputSampleRate === WakeWordStreamService.TARGET_SAMPLE_RATE) {
      return input;
    }

    const ratio = inputSampleRate / WakeWordStreamService.TARGET_SAMPLE_RATE;
    const outputLength = Math.max(1, Math.round(input.length / ratio));
    const output = new Float32Array(outputLength);

    for (let i = 0; i < outputLength; i++) {
      const position = i * ratio;
      const index = Math.floor(position);
      const nextIndex = Math.min(index + 1, input.length - 1);
      const fraction = position - index;
      output[i] = input[index] + (input[nextIndex] - input[index]) * fraction;
    }

    return output;
  }

  private concatFloat32(left: Float32Array, right: Float32Array): Float32Array {
    const merged = new Float32Array(left.length + right.length);
    merged.set(left, 0);
    merged.set(right, left.length);
    return merged;
  }

  private floatTo16BitPCM(input: Float32Array): Int16Array {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const sample = Math.max(-1, Math.min(1, input[i]));
      output[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    }
    return output;
  }
}
