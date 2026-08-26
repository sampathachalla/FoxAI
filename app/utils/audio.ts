// Web Audio API Utilities for Real-Time Microphone Analysis & Audio-Reactive Visualizations

export class AudioAnalyserService {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private dataArray: Uint8Array | null = null;
  private animationFrameId: number | null = null;
  private isAnalyzing = false;
  private onLevelCallback: ((level: number, frequencyData: Uint8Array) => void) | null = null;

  async startMicrophone(onLevel: (level: number, frequencyData: Uint8Array) => void): Promise<boolean> {
    try {
      this.onLevelCallback = onLevel;
      
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) {
        console.warn('Web Audio API not supported');
        return false;
      }

      this.audioContext = new AudioCtx();
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;

      this.sourceNode.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);

      this.isAnalyzing = true;
      this.loop();
      return true;
    } catch (err) {
      console.error('Error starting microphone analyser:', err);
      return false;
    }
  }

  private loop = () => {
    if (!this.isAnalyzing || !this.analyser || !this.dataArray) return;

    this.analyser.getByteFrequencyData(this.dataArray);

    // Compute RMS / normalized volume level between 0 and 1
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      sum += this.dataArray[i];
    }
    const average = sum / this.dataArray.length;
    // Map average (0-255) to a clean dynamic range (0 - 1.0) with exponential scaling
    const normalizedLevel = Math.min(1, Math.pow(average / 128, 1.2));

    if (this.onLevelCallback) {
      this.onLevelCallback(normalizedLevel, this.dataArray);
    }

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  stopMicrophone() {
    this.isAnalyzing = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch (e) {}
      this.sourceNode = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch (e) {}
      this.audioContext = null;
    }

    this.analyser = null;
    this.dataArray = null;
    this.onLevelCallback = null;
  }
}

/**
 * Creates an artificial audio reactive pulsator for speech synthesis
 * (since Web Speech API SpeechSynthesis is not connected to Web Audio node in all browsers)
 */
export class SpeechVisualizerSimulator {
  private animationFrameId: number | null = null;
  private isRunning = false;
  private onLevelCallback: ((level: number) => void) | null = null;
  private phase = 0;

  start(onLevel: (level: number) => void) {
    this.stop();
    this.onLevelCallback = onLevel;
    this.isRunning = true;
    this.phase = 0;
    this.animate();
  }

  private animate = () => {
    if (!this.isRunning) return;

    this.phase += 0.12;
    // Combine multiple sine waves with random jitter to create realistic vocal rhythm
    const baseWave = Math.sin(this.phase) * 0.35 + Math.sin(this.phase * 2.3) * 0.25 + Math.sin(this.phase * 4.1) * 0.15;
    const jitter = (Math.random() - 0.5) * 0.15;
    const level = Math.max(0.15, Math.min(1.0, 0.45 + baseWave + jitter));

    if (this.onLevelCallback) {
      this.onLevelCallback(level);
    }

    this.animationFrameId = requestAnimationFrame(this.animate);
  };

  stop() {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.onLevelCallback) {
      this.onLevelCallback(0);
      this.onLevelCallback = null;
    }
  }
}

/**
 * Web Audio API Synthesizer for high-fidelity UI Sound FX and Feedback Chimes
 */
export class SoundFXService {
  private static instance: SoundFXService | null = null;
  private ctx: AudioContext | null = null;

  public static getInstance(): SoundFXService {
    if (!SoundFXService.instance) {
      SoundFXService.instance = new SoundFXService();
    }
    return SoundFXService.instance;
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.ctx || this.ctx.state === 'closed') {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  public playChime(
    type: 'toggle_on' | 'toggle_off' | 'click' | 'focus' | 'ambient' | 'action' | 'volume' | 'thinking'
  ) {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      if (type === 'thinking') {
        // Soft futuristic neural thinking shimmer (delicate harmonic double tone)
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(587.33, now); // D5
        osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

        osc2.frequency.setValueAtTime(880, now + 0.04);
        osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.16);

        gain.gain.setValueAtTime(0.035, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.20);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now + 0.04);
        osc1.stop(now + 0.20);
        osc2.stop(now + 0.20);
      } else if (type === 'toggle_on') {
        // Cheerful dual ascending tone
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(520, now);
        osc1.frequency.exponentialRampToValueAtTime(780, now + 0.12);

        osc2.frequency.setValueAtTime(1040, now + 0.06);
        osc2.frequency.exponentialRampToValueAtTime(1560, now + 0.18);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now + 0.05);
        osc1.stop(now + 0.28);
        osc2.stop(now + 0.28);
      } else if (type === 'toggle_off') {
        // Gentle descending tone
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(620, now);
        osc.frequency.exponentialRampToValueAtTime(380, now + 0.16);

        gain.gain.setValueAtTime(0.10, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.22);
      } else if (type === 'focus') {
        // Soft meditative zen harmonic chord
        [440, 554.37, 659.25, 880].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + i * 0.04);

          gain.gain.setValueAtTime(0.06, now + i * 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + i * 0.04);
          osc.stop(now + 0.65);
        });
      } else if (type === 'ambient') {
        // Ethereal sweep
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(960, now + 0.24);

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'volume') {
        // Subtle volume tick
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);

        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.05);
      } else {
        // Standard crisp tactile click
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(900, now);
        osc.frequency.exponentialRampToValueAtTime(450, now + 0.04);

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.06);
      }
    } catch (e) {
      console.warn('Audio FX error:', e);
    }
  }
}
