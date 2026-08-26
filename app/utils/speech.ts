// Web Speech API Wrapper with auto-silence finalization and safety heartbeats

export interface SpeechRecognitionCallbacks {
  onStart?: () => void;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: any) => void;
  onEnd?: () => void;
}

export class SpeechRecognitionService {
  private recognition: any = null;
  private isListening = false;
  private silenceTimer: any = null;
  private lastTranscript = '';
  private hasEmittedFinal = false;

  constructor() {
    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRec) {
      this.recognition = new SpeechRec();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';
      this.recognition.maxAlternatives = 1;
    }
  }

  isSupported(): boolean {
    return !!this.recognition;
  }

  start(callbacks: SpeechRecognitionCallbacks) {
    if (!this.recognition) {
      callbacks.onError?.(new Error('Speech recognition not supported in this browser.'));
      return;
    }

    if (this.isListening) {
      this.stop();
    }

    this.isListening = true;
    this.hasEmittedFinal = false;
    this.lastTranscript = '';

    this.recognition.onstart = () => {
      callbacks.onStart?.();
    };

    this.recognition.onresult = (event: any) => {
      if (this.hasEmittedFinal) return;

      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const text = (finalTranscript || interimTranscript).trim();
      if (text) {
        this.lastTranscript = text;

        if (finalTranscript) {
          this.hasEmittedFinal = true;
          clearTimeout(this.silenceTimer);
          callbacks.onResult?.(text, true);
          this.stop();
          return;
        }

        callbacks.onResult?.(text, false);

        // Auto-finalize after 1.8 seconds of silence only if not already emitted
        clearTimeout(this.silenceTimer);
        this.silenceTimer = setTimeout(() => {
          if (this.isListening && this.lastTranscript && !this.hasEmittedFinal) {
            this.hasEmittedFinal = true;
            callbacks.onResult?.(this.lastTranscript, true);
            this.stop();
          }
        }, 1800);
      }
    };

    this.recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech') {
        callbacks.onError?.(event);
      }
    };

    this.recognition.onend = () => {
      clearTimeout(this.silenceTimer);
      this.isListening = false;
      callbacks.onEnd?.();
    };

    try {
      this.recognition.start();
    } catch (e) {
      console.warn('Speech recognition start note:', e);
    }
  }

  stop() {
    clearTimeout(this.silenceTimer);
    this.isListening = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {}
    }
  }
}

export class DeepgramAudioService {
  private currentAudio: HTMLAudioElement | null = null;
  private currentBlobUrl: string | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private animFrameId: number | null = null;
  private dataArray: Uint8Array | null = null;
  private wordTicker: any = null;
  private sessionId = 0;

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.audioContext || this.audioContext.state === 'closed') {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.audioContext = new AudioCtx();
        }
      }
      return this.audioContext;
    } catch {
      return null;
    }
  }

  async speak(
    audioBlob: Blob,
    text: string,
    options: {
      volume?: number;
      rate?: number;
      onStart?: () => void;
      onLevel?: (level: number, frequencyData: Uint8Array) => void;
      onEnd?: () => void;
      onError?: (err: any) => void;
      onSubtitle?: (subtitle: string, wordIndex: number, totalWords: number) => void;
    } = {}
  ): Promise<boolean> {
    this.stop();
    const currentSession = ++this.sessionId;

    try {
      const blobUrl = URL.createObjectURL(audioBlob);
      this.currentBlobUrl = blobUrl;

      const audio = new Audio();
      audio.src = blobUrl;
      audio.crossOrigin = 'anonymous';
      audio.volume = Math.max(0, Math.min(1, options.volume ?? 1.0));
      audio.playbackRate = options.rate ?? 1.0;
      this.currentAudio = audio;

      const cleanText = text
        .replace(/[*_~`#\[\]\(\)>]/g, '')
        .replace(/https?:\/\/\S+/g, 'link')
        .trim();
      const words = cleanText.split(/\s+/).filter(Boolean);

      // Subtitle chunking
      const chunks: { text: string; startIndex: number; endIndex: number }[] = [];
      let currentChunkWords: string[] = [];
      let currentStartIndex = 0;

      for (let i = 0; i < words.length; i++) {
        const w = words[i];
        currentChunkWords.push(w);
        const hasPunctuationBreak = /[.,;!?—]$/.test(w);
        const isChunkLongEnough = currentChunkWords.length >= 6;
        const isLastWord = i === words.length - 1;

        if (hasPunctuationBreak || isChunkLongEnough || isLastWord) {
          chunks.push({
            text: currentChunkWords.join(' '),
            startIndex: currentStartIndex,
            endIndex: i,
          });
          currentChunkWords = [];
          currentStartIndex = i + 1;
        }
      }

      const getSubtitleForWordIndex = (idx: number): string => {
        const activeChunk =
          chunks.find((c) => idx >= c.startIndex && idx <= c.endIndex) ||
          chunks[chunks.length - 1];
        return activeChunk ? activeChunk.text : words.slice(Math.max(0, idx - 3), idx + 4).join(' ');
      };

      let currentWordIndex = 0;

      const broadcastSubtitle = (idx: number) => {
        if (this.sessionId !== currentSession) return;
        currentWordIndex = idx;
        const sub = getSubtitleForWordIndex(idx);
        options.onSubtitle?.(sub, idx, words.length);
      };

      audio.onplay = async () => {
        if (this.sessionId !== currentSession) return;

        // Connect real Web Audio API analyser to audio element for zero-lag reactivity
        const ctx = this.getAudioContext();
        let connectedAnalyser = false;
        if (ctx) {
          try {
            if (ctx.state === 'suspended') {
              await ctx.resume().catch(() => {});
            }
            if (!this.sourceNode) {
              this.sourceNode = ctx.createMediaElementSource(audio);
              this.analyser = ctx.createAnalyser();
              this.analyser.fftSize = 256;
              this.analyser.smoothingTimeConstant = 0.65;
              this.sourceNode.connect(this.analyser);
              this.analyser.connect(ctx.destination);
              this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            }
            connectedAnalyser = true;
          } catch (e) {
            // Fallback gracefully if already hooked or restricted
          }
        }

        // Live real-time analysis loop
        const analyzeLoop = () => {
          if (this.sessionId !== currentSession || !this.currentAudio || this.currentAudio.paused) return;
          if (connectedAnalyser && this.analyser && this.dataArray) {
            this.analyser.getByteFrequencyData(this.dataArray);
            let sum = 0;
            for (let i = 0; i < this.dataArray.length; i++) {
              sum += this.dataArray[i];
            }
            const avg = sum / this.dataArray.length;
            const normalizedLevel = Math.min(1, Math.pow(avg / 90, 1.2));
            options.onLevel?.(normalizedLevel, this.dataArray);
          } else {
            // Fallback subtle wave
            const simLevel = 0.35 + Math.sin(Date.now() * 0.01) * 0.25;
            options.onLevel?.(simLevel, new Uint8Array(64).fill(Math.round(simLevel * 180)));
          }
          this.animFrameId = requestAnimationFrame(analyzeLoop);
        };
        analyzeLoop();

        options.onStart?.();
        broadcastSubtitle(0);

        // Word ticker synchronized to audio playback
        const estimatedSeconds = audio.duration || Math.max(1, words.length * 0.28);
        const msPerWord = Math.max(
          110,
          Math.min(380, Math.round((estimatedSeconds * 1000) / Math.max(1, words.length)))
        );

        this.wordTicker = setInterval(() => {
          if (this.sessionId !== currentSession) {
            clearInterval(this.wordTicker);
            return;
          }
          if (currentWordIndex < words.length - 1) {
            currentWordIndex++;
            broadcastSubtitle(currentWordIndex);
          }
        }, msPerWord);
      };

      audio.onended = () => {
        if (this.sessionId !== currentSession) return;
        this.stop();
        options.onEnd?.();
      };

      audio.onerror = (e) => {
        if (this.sessionId !== currentSession) return;
        this.stop();
        options.onError?.(e);
      };

      await audio.play();
      return true;
    } catch (err) {
      this.stop();
      options.onError?.(err);
      return false;
    }
  }

  stop() {
    this.sessionId++;
    clearInterval(this.wordTicker);
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch (e) {}
      this.currentAudio = null;
    }
    if (this.currentBlobUrl) {
      try {
        URL.revokeObjectURL(this.currentBlobUrl);
      } catch (e) {}
      this.currentBlobUrl = null;
    }
  }

  isPlaying(): boolean {
    return Boolean(this.currentAudio && !this.currentAudio.paused);
  }
}

export class SpeechSynthesisService {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private safetyTimeout: any = null;
  private wordTicker: any = null;
  private speakSessionId = 0;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
    }
  }

  isSupported(): boolean {
    return !!this.synth;
  }

  getVoices(): SpeechSynthesisVoice[] {
    if (!this.synth) return [];
    return this.synth.getVoices();
  }

  speak(
    text: string,
    options: {
      voiceURI?: string;
      pitch?: number;
      rate?: number;
      volume?: number;
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (err: any) => void;
      onBoundary?: (event: SpeechSynthesisEvent) => void;
      onSubtitle?: (subtitle: string, wordIndex: number, totalWords: number) => void;
    } = {}
  ): boolean {
    if (!this.synth) return false;

    // Increment speak session to invalidate any prior pending/asynchronous events
    const sessionId = ++this.speakSessionId;

    this.stop();
    if (this.synth.cancel) {
      this.synth.cancel();
    }

    const cleanText = text
      .replace(/[*_~`#\[\]\(\)>]/g, '')
      .replace(/https?:\/\/\S+/g, 'link')
      .trim();

    if (!cleanText) return false;

    // Split into individual words
    const words = cleanText.split(/\s+/).filter(Boolean);
    if (words.length === 0) return false;

    // Build natural subtitle chunks (4-7 words or clause punctuation breaks)
    const chunks: { text: string; startIndex: number; endIndex: number }[] = [];
    let currentChunkWords: string[] = [];
    let currentStartIndex = 0;

    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      currentChunkWords.push(w);

      const hasPunctuationBreak = /[.,;!?—]$/.test(w);
      const isChunkLongEnough = currentChunkWords.length >= 6;
      const isLastWord = i === words.length - 1;

      if (hasPunctuationBreak || isChunkLongEnough || isLastWord) {
        chunks.push({
          text: currentChunkWords.join(' '),
          startIndex: currentStartIndex,
          endIndex: i,
        });
        currentChunkWords = [];
        currentStartIndex = i + 1;
      }
    }

    const getSubtitleForWordIndex = (idx: number): string => {
      const activeChunk = chunks.find((c) => idx >= c.startIndex && idx <= c.endIndex) || chunks[chunks.length - 1];
      return activeChunk ? activeChunk.text : words.slice(Math.max(0, idx - 3), idx + 4).join(' ');
    };

    let currentWordIndex = 0;
    const utterance = new SpeechSynthesisUtterance(cleanText);
    this.currentUtterance = utterance;

    const voices = this.getVoices();
    if (options.voiceURI) {
      const selected = voices.find((v) => v.voiceURI === options.voiceURI);
      if (selected) utterance.voice = selected;
    } else {
      const preferred = voices.find(
        (v) =>
          v.lang.startsWith('en') &&
          (v.name.includes('Samantha') ||
            v.name.includes('Siri') ||
            v.name.includes('Karen') ||
            v.name.includes('Natural') ||
            v.name.includes('Daniel') ||
            v.name.includes('Google US English') ||
            v.name.includes('Victoria'))
      ) || voices.find((v) => v.lang.startsWith('en'));

      if (preferred) utterance.voice = preferred;
    }

    const speechRate = options.rate ?? 1.05;
    utterance.pitch = options.pitch ?? 1.0;
    utterance.rate = speechRate;
    utterance.volume = options.volume ?? 1.0;

    const broadcastSubtitle = (index: number) => {
      if (this.speakSessionId !== sessionId) return;
      currentWordIndex = index;
      const sub = getSubtitleForWordIndex(index);
      options.onSubtitle?.(sub, index, words.length);
    };

    const cleanup = () => {
      clearTimeout(this.safetyTimeout);
      clearInterval(this.wordTicker);
      if (this.currentUtterance === utterance) {
        this.currentUtterance = null;
      }
    };

    utterance.onstart = () => {
      if (this.speakSessionId !== sessionId) return;
      options.onStart?.();
      broadcastSubtitle(0);

      // Start pacing ticker (~180-220ms per word calibrated to rate)
      const msPerWord = Math.max(140, Math.min(380, Math.round(225 / speechRate)));
      this.wordTicker = setInterval(() => {
        if (this.speakSessionId !== sessionId) {
          clearInterval(this.wordTicker);
          return;
        }
        if (currentWordIndex < words.length - 1) {
          currentWordIndex++;
          broadcastSubtitle(currentWordIndex);
        }
      }, msPerWord);
    };

    utterance.onend = () => {
      if (this.speakSessionId !== sessionId) return;
      cleanup();
      options.onEnd?.();
    };

    utterance.onerror = (e) => {
      if (this.speakSessionId !== sessionId) return;
      cleanup();
      options.onError?.(e);
    };

    // Calculate word boundary character offsets for exact Web Speech boundary sync
    let charOffsets: number[] = [];
    let currentOffset = 0;
    for (let i = 0; i < words.length; i++) {
      const wordPos = cleanText.indexOf(words[i], currentOffset);
      charOffsets.push(wordPos >= 0 ? wordPos : currentOffset);
      currentOffset = (wordPos >= 0 ? wordPos : currentOffset) + words[i].length;
    }

    utterance.onboundary = (e: SpeechSynthesisEvent) => {
      if (this.speakSessionId !== sessionId) return;
      options.onBoundary?.(e);
      if (typeof e.charIndex === 'number' && e.charIndex >= 0) {
        let closestWord = 0;
        for (let i = 0; i < charOffsets.length; i++) {
          if (charOffsets[i] <= e.charIndex) {
            closestWord = i;
          } else {
            break;
          }
        }
        broadcastSubtitle(closestWord);
      }
    };

    // Calculate maximum expected duration + 3s buffer so speech never hangs
    const wordCount = words.length;
    const maxDurationMs = Math.max(3000, (wordCount / 2.2) * 1000 + 4000);
    this.safetyTimeout = setTimeout(() => {
      if (this.speakSessionId !== sessionId) return;
      this.stop();
      options.onEnd?.();
    }, maxDurationMs);

    try {
      this.synth.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis speak exception:', e);
      cleanup();
      return false;
    }

    return true;
  }

  stop() {
    clearTimeout(this.safetyTimeout);
    clearInterval(this.wordTicker);
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch (e) {}
      this.currentUtterance = null;
    }
  }

  pause() {
    if (this.synth) {
      try {
        this.synth.pause();
      } catch (e) {}
    }
  }

  resume() {
    if (this.synth) {
      try {
        this.synth.resume();
      } catch (e) {}
    }
  }
}
