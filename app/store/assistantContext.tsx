import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  ChatMessage,
  AssistantStatus,
  ReminderItem,
  NoteItem,
  AccentTheme,
  VoicePreference,
  DeviceSettingState,
  AssistantToolCall,
  ConversationSession,
  PromptTemplate,
  AppMode,
  ActiveToolType,
  SettingsTab,
  SidebarTab,
  EnginePreferences,
  HeaderQuickOptionId,
  DeepgramVoiceItem,
  EngineTelemetry,
  VoiceTelemetry,
  CoreShapeId,
  WakeWordState,
} from '../types';
import { StorageService } from '../services/storage';
import {
  fetchAssistantChat,
  streamAssistantChat,
  fetchDetectTools,
  fetchDeepgramTTS,
  fetchDeepgramVoices,
  fetchHermesTTS,
  fetchSystemStatus,
} from '../services/api';
import { WakeWordStreamService } from '../services/wakeWord';
import { AudioAnalyserService, SpeechVisualizerSimulator, SoundFXService } from '../utils/audio';
import {
  SpeechRecognitionService,
  SpeechSynthesisService,
  DeepgramAudioService,
} from '../utils/speech';

interface AssistantContextType {
  messages: ChatMessage[];
  status: AssistantStatus;
  audioLevel: number;
  frequencyData: Uint8Array | null;
  accentTheme: AccentTheme;
  coreShape: CoreShapeId;
  setCoreShape: (shape: CoreShapeId) => void;
  reminders: ReminderItem[];
  notes: NoteItem[];
  currentTranscript: string;
  speakingTranscript: string;
  isStreaming: boolean;
  voicePrefs: VoicePreference;
  deviceSettings: DeviceSettingState;
  availableVoices: SpeechSynthesisVoice[];
  deepgramVoices: DeepgramVoiceItem[];
  hasDeepgramKey: boolean;
  isSynthesizingTTS: boolean;
  wakeWordState: WakeWordState;
  wakeWordServiceHealthy: boolean;
  wakeWordPhrase: string;
  wakeWordLoadError: string | null;
  
  // App View Modes (Voice 3D Core vs ChatGPT-Style Chat vs Settings View Page vs Tools Panel View)
  appMode: AppMode;
  setAppMode: (mode: AppMode) => void;
  activeTool: ActiveToolType;
  setActiveTool: (tool: ActiveToolType) => void;
  openToolPanel: (tool?: ActiveToolType) => void;

  // Settings View Page Navigation
  settingsTab: SettingsTab;
  setSettingsTab: (tab: SettingsTab) => void;
  openSettingsTab: (tab: SettingsTab) => void;
  enginePrefs: EnginePreferences;
  setEnginePrefs: (prefs: EnginePreferences) => void;

  // Left Sidebar State & Sessions (Gemini & ChatGPT Style)
  sessions: ConversationSession[];
  activeSessionId: string;
  isSidebarOpen: boolean;
  activeSidebarTab: SidebarTab;
  promptTemplates: PromptTemplate[];
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  setIsSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setActiveSidebarTab: (tab: SidebarTab) => void;
  createNewSession: (initialPrompt?: string) => string;
  switchSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  renameSession: (sessionId: string, newTitle: string) => void;
  pinSession: (sessionId: string) => void;
  usePromptTemplate: (prompt: string) => void;

  // Quick Access & Header Configuration
  headerQuickOptions: HeaderQuickOptionId[];
  setHeaderQuickOptions: (options: HeaderQuickOptionId[]) => void;
  isQuickAccessOpen: boolean;
  setIsQuickAccessOpen: (open: boolean) => void;
  toggleQuickAccess: () => void;

  // Telemetry Metrics
  engineTelemetry: EngineTelemetry;
  voiceTelemetry: VoiceTelemetry;
  resetTelemetry: () => void;

  setAccentTheme: (theme: AccentTheme) => void;
  setVoicePrefs: (prefs: VoicePreference) => void;
  updateDeviceSetting: (key: keyof DeviceSettingState, value: boolean) => void;
  sendMessage: (prompt: string) => Promise<void>;
  startListening: () => Promise<void>;
  stopListening: () => void;
  toggleListening: () => void;
  cancelSpeaking: () => void;
  speakText: (text: string, onProgress?: (revealedText: string) => void, options?: { suppressAutoListen?: boolean }) => Promise<void>;
  addReminder: (title: string, dueTime?: string, priority?: 'low' | 'medium' | 'high') => void;
  toggleReminder: (id: string) => void;
  deleteReminder: (id: string) => void;
  addNote: (title: string, content: string, tags?: string[]) => void;
  deleteNote: (id: string) => void;
  clearChat: () => void;
}

const AssistantContext = createContext<AssistantContextType | undefined>(undefined);

export const AssistantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Sessions and active conversation thread state
  const [sessions, setSessions] = useState<ConversationSession[]>(() => StorageService.loadSessions());
  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    const savedActiveId = StorageService.loadActiveSessionId();
    const loadedSessions = StorageService.loadSessions();
    if (loadedSessions.some((s) => s.id === savedActiveId)) {
      return savedActiveId;
    }
    return loadedSessions[0]?.id || 'session_fox_1';
  });

  const [isSidebarOpen, setIsSidebarOpenState] = useState<boolean>(() => StorageService.loadSidebarOpen());
  const [activeSidebarTab, setActiveSidebarTab] = useState<SidebarTab>('chats');
  const [promptTemplates, setPromptTemplates] = useState<PromptTemplate[]>(() => StorageService.loadPromptTemplates());
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [appMode, setAppModeState] = useState<AppMode>(() => StorageService.loadAppMode());
  const [activeTool, setActiveToolState] = useState<ActiveToolType>('notes');
  const [settingsTab, setSettingsTabState] = useState<SettingsTab>(() => StorageService.loadSettingsTab());
  const [enginePrefs, setEnginePrefsState] = useState<EnginePreferences>(() => StorageService.loadEnginePreferences());
  const [headerQuickOptions, setHeaderQuickOptionsState] = useState<HeaderQuickOptionId[]>(() => StorageService.loadHeaderQuickOptions());
  const [isQuickAccessOpen, setIsQuickAccessOpen] = useState<boolean>(false);

  const toggleQuickAccess = useCallback(() => {
    setIsQuickAccessOpen((prev) => !prev);
  }, []);

  const setHeaderQuickOptions = useCallback((options: HeaderQuickOptionId[]) => {
    const sanitized = options.slice(0, 3);
    setHeaderQuickOptionsState(sanitized);
    StorageService.saveHeaderQuickOptions(sanitized);
  }, []);

  const setAppMode = useCallback((mode: AppMode) => {
    setAppModeState(mode);
    StorageService.saveAppMode(mode);
  }, []);

  const setActiveTool = useCallback((tool: ActiveToolType) => {
    setActiveToolState(tool);
  }, []);

  const openToolPanel = useCallback((tool: ActiveToolType = 'notes') => {
    setActiveToolState(tool);
    setAppModeState('tools');
    StorageService.saveAppMode('tools');
    setActiveSidebarTab('tools');
  }, []);

  const setSettingsTab = useCallback((tab: SettingsTab) => {
    setSettingsTabState(tab);
    StorageService.saveSettingsTab(tab);
  }, []);

  const openSettingsTab = useCallback((tab: SettingsTab) => {
    setSettingsTabState(tab);
    StorageService.saveSettingsTab(tab);
    setAppModeState('settings');
    StorageService.saveAppMode('settings');
    setActiveSidebarTab('settings');
  }, []);

  const setEnginePrefs = useCallback((prefs: EnginePreferences) => {
    setEnginePrefsState(prefs);
    StorageService.saveEnginePreferences(prefs);
  }, []);

  // Active messages derived from active session
  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (activeSession && activeSession.messages && activeSession.messages.length > 0) {
      return activeSession.messages;
    }
    return [
      {
        id: 'welcome',
        role: 'assistant',
        content: "Good day. I am Fox. Tap the 3D intelligence core or speak anytime to manage reminders, capture notes, or ask anything.",
        timestamp: Date.now(),
      },
    ];
  });

  const [status, setStatus] = useState<AssistantStatus>('idle');
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [frequencyData, setFrequencyData] = useState<Uint8Array | null>(null);
  const [accentTheme, setAccentThemeState] = useState<AccentTheme>(() => StorageService.loadTheme());
  const [coreShape, setCoreShapeState] = useState<CoreShapeId>(() => StorageService.loadCoreShape('sphere'));
  const [reminders, setReminders] = useState<ReminderItem[]>(() => StorageService.loadReminders());
  const [notes, setNotes] = useState<NoteItem[]>(() => StorageService.loadNotes());
  const [currentTranscript, setCurrentTranscript] = useState<string>('');
  const [speakingTranscript, setSpeakingTranscript] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [voicePrefs, setVoicePrefsState] = useState<VoicePreference>(() => StorageService.loadVoicePreferences());
  // Mirrors voicePrefs synchronously (React state updates are not synchronous, so a
  // caller that calls setVoicePrefs() and then immediately triggers speech in the same
  // event handler — e.g. a voice-preview button — would otherwise read the OLD value
  // through the still-current-render's closure). TTS functions read from this ref
  // instead of the voicePrefs variable directly, so they always see the latest choice.
  const voicePrefsRef = useRef<VoicePreference>(voicePrefs);
  const [deviceSettings, setDeviceSettingsState] = useState<DeviceSettingState>(() => StorageService.loadDeviceSettings());
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [deepgramVoices, setDeepgramVoices] = useState<DeepgramVoiceItem[]>([]);
  const [hasDeepgramKey, setHasDeepgramKey] = useState<boolean>(false);
  const [isSynthesizingTTS, setIsSynthesizingTTS] = useState<boolean>(false);
  const [wakeWordState, setWakeWordState] = useState<WakeWordState>(
    deviceSettings.wakeWordEnabled ? 'arming' : 'disabled'
  );
  const [wakeWordServiceHealthy, setWakeWordServiceHealthy] = useState<boolean>(false);
  const [wakeWordPhrase, setWakeWordPhrase] = useState<string>('Hey Jarvis');
  const [wakeWordLoadError, setWakeWordLoadError] = useState<string | null>(null);
  const [wakeWordWebSocketUrl, setWakeWordWebSocketUrl] = useState<string | null>(null);

  // Telemetry state
  const [engineTelemetry, setEngineTelemetry] = useState<EngineTelemetry>(() => StorageService.loadEngineTelemetry());
  const [voiceTelemetry, setVoiceTelemetry] = useState<VoiceTelemetry>(() => StorageService.loadVoiceTelemetry());

  const resetTelemetry = useCallback(() => {
    const res = StorageService.resetAllTelemetry();
    setEngineTelemetry(res.engine);
    setVoiceTelemetry(res.voice);
  }, []);

  // Services references
  const audioAnalyserRef = useRef<AudioAnalyserService>(new AudioAnalyserService());
  const speechSimulatorRef = useRef<SpeechVisualizerSimulator>(new SpeechVisualizerSimulator());
  const speechRecRef = useRef<SpeechRecognitionService>(new SpeechRecognitionService());
  const speechSynthRef = useRef<SpeechSynthesisService>(new SpeechSynthesisService());
  const deepgramAudioRef = useRef<DeepgramAudioService>(new DeepgramAudioService());
  const wakeWordRef = useRef<WakeWordStreamService>(new WakeWordStreamService());
  const wakeWordConnectingRef = useRef<boolean>(false);
  const wakeWordActiveUrlRef = useRef<string | null>(null);
  const isSpeechFinalDispatchedRef = useRef<boolean>(false);
  const isSendingMessageRef = useRef<boolean>(false);
  const startListeningRef = useRef<() => void>(() => {});
  const autoListenTimerRef = useRef<any>(null);

  // Incremental (sentence-by-sentence) TTS streaming queue
  const speechSessionRef = useRef<number>(0);
  const sentenceQueueRef = useRef<{ text: string; audioPromise: Promise<Blob | null> }[]>([]);
  const queueDrainingRef = useRef<boolean>(false);
  // Resolver for whichever playSentence() call is currently in flight. DeepgramAudioService's
  // stop()/pause() never fires the 'ended' event, so if playback gets interrupted from
  // outside the drain loop's own sequence (cancelSpeaking() called for any reason — a new
  // message starting, a voice preview elsewhere, starting to listen again), the pending
  // playSentence() promise would otherwise hang forever, permanently wedging the queue
  // (queueDrainingRef never resets) and leaving status stuck non-idle. cancelSpeaking()
  // calls this directly to force that promise to resolve instead of leaking a hang.
  const pendingPlaybackResolveRef = useRef<(() => void) | null>(null);

  // Persistence effects
  useEffect(() => {
    StorageService.saveSessions(sessions);
  }, [sessions]);

  useEffect(() => {
    StorageService.saveActiveSessionId(activeSessionId);
  }, [activeSessionId]);

  useEffect(() => {
    StorageService.saveSidebarOpen(isSidebarOpen);
  }, [isSidebarOpen]);

  useEffect(() => {
    StorageService.saveReminders(reminders);
  }, [reminders]);

  useEffect(() => {
    StorageService.saveNotes(notes);
  }, [notes]);

  // Load Deepgram voices and system key status
  const refreshSystemCapabilities = useCallback(async () => {
    try {
      const [voicesRes, statusRes] = await Promise.allSettled([
        fetchDeepgramVoices(),
        fetchSystemStatus(),
      ]);

      if (voicesRes.status === 'fulfilled' && voicesRes.value.voices) {
        setDeepgramVoices(voicesRes.value.voices);
        if (voicesRes.value.hasApiKey) {
          setHasDeepgramKey(true);
        }
      }

      if (statusRes.status === 'fulfilled') {
        if (statusRes.value.hasDeepgramKey) {
          setHasDeepgramKey(true);
        }
        setWakeWordServiceHealthy(Boolean(statusRes.value.wakeWordServiceHealthy));
        setWakeWordPhrase(statusRes.value.wakeWordPhrase || 'Hey Jarvis');
        setWakeWordWebSocketUrl(statusRes.value.wakeWordWebSocketUrl || null);
        setWakeWordLoadError(statusRes.value.wakeWordLoadError || null);
      }
    } catch (err) {
      console.warn('[AssistantContext] System capability check:', err);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    refreshSystemCapabilities().finally(() => {
      if (!isMounted) return;
    });

    return () => {
      isMounted = false;
    };
  }, [refreshSystemCapabilities]);

  // Load browser web speech voices
  useEffect(() => {
    const updateVoices = () => {
      const voices = speechSynthRef.current.getVoices();
      if (voices.length > 0) {
        setAvailableVoices(voices);
      }
    };
    updateVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  const setIsSidebarOpen = (open: boolean) => {
    setIsSidebarOpenState(open);
  };

  const toggleSidebar = () => {
    setIsSidebarOpenState((prev) => !prev);
  };

  const setAccentTheme = (theme: AccentTheme) => {
    setAccentThemeState(theme);
    StorageService.saveTheme(theme);
  };

  const setCoreShape = useCallback((shape: CoreShapeId) => {
    setCoreShapeState(shape);
    StorageService.saveCoreShape(shape);
  }, []);

  const setVoicePrefs = (prefs: VoicePreference) => {
    voicePrefsRef.current = prefs;
    setVoicePrefsState(prefs);
    StorageService.saveVoicePreferences(prefs);
  };

  const updateDeviceSetting = (key: keyof DeviceSettingState, value: boolean) => {
    setDeviceSettingsState((prev) => {
      const next = { ...prev, [key]: value };
      StorageService.saveDeviceSettings(next);
      return next;
    });
  };

  const addReminder = useCallback((title: string, dueTime = 'Today at 5:00 PM', priority: 'low' | 'medium' | 'high' = 'medium') => {
    const newReminder: ReminderItem = {
      id: 'rem_' + Date.now(),
      title,
      dueTime,
      completed: false,
      priority,
    };
    setReminders((prev) => [newReminder, ...prev]);
  }, []);

  const toggleReminder = useCallback((id: string) => {
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, completed: !r.completed } : r))
    );
  }, []);

  const deleteReminder = useCallback((id: string) => {
    setReminders((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const addNote = useCallback((title: string, content: string, tags: string[] = ['Assistant']) => {
    const newNote: NoteItem = {
      id: 'note_' + Date.now(),
      title,
      content,
      updatedAt: Date.now(),
      tags,
    };
    setNotes((prev) => [newNote, ...prev]);
  }, []);

  const deleteNote = useCallback((id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const cancelSpeaking = useCallback(() => {
    speechSessionRef.current += 1;
    sentenceQueueRef.current = [];
    clearTimeout(autoListenTimerRef.current);
    speechSynthRef.current.stop();
    deepgramAudioRef.current.stop();
    speechSimulatorRef.current.stop();
    setAudioLevel(0);
    setFrequencyData(null);
    setSpeakingTranscript('');
    setIsSynthesizingTTS(false);
    setStatus('idle');

    // Force-resolve any playSentence() promise left hanging by the stop() calls above —
    // pause() never fires 'ended', so without this the drain loop for whatever was
    // playing would never reach its finally block, permanently wedging the queue.
    if (pendingPlaybackResolveRef.current) {
      const resolvePending = pendingPlaybackResolveRef.current;
      pendingPlaybackResolveRef.current = null;
      resolvePending();
    }
  }, []);

  // --- Session Management (Gemini & ChatGPT Style) ---
  const switchSession = useCallback(
    (sessionId: string) => {
      cancelSpeaking();
      const target = sessions.find((s) => s.id === sessionId);
      if (target) {
        setActiveSessionId(target.id);
        setMessages(target.messages || []);
        // If user was viewing settings, switch back to chat mode
        if (appMode === 'settings') {
          setAppMode('chat');
        }
      }
    },
    [sessions, cancelSpeaking, appMode, setAppMode]
  );

  const createNewSession = useCallback(
    (initialPrompt?: string): string => {
      cancelSpeaking();
      const newId = 'session_' + Date.now();
      const initialMessages: ChatMessage[] = [
        {
          id: 'welcome_' + newId,
          role: 'assistant',
          content: "Good day. I am Fox. How can I assist you with this new conversation?",
          timestamp: Date.now(),
        },
      ];

      const newSession: ConversationSession = {
        id: newId,
        title: initialPrompt ? initialPrompt.slice(0, 32) + '...' : 'New Chat',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        pinned: false,
        previewText: initialPrompt || 'New conversation started',
        messages: initialMessages,
      };

      setSessions((prev) => [newSession, ...prev]);
      setActiveSessionId(newId);
      setMessages(initialMessages);
      if (appMode === 'settings') {
        setAppMode('chat');
      }
      return newId;
    },
    [cancelSpeaking, appMode, setAppMode]
  );

  const deleteSession = useCallback(
    (sessionId: string) => {
      setSessions((prev) => {
        const filtered = prev.filter((s) => s.id !== sessionId);
        if (filtered.length === 0) {
          const freshId = 'session_' + Date.now();
          const freshSession: ConversationSession = {
            id: freshId,
            title: 'New Chat',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            pinned: false,
            messages: [
              {
                id: 'welcome_' + freshId,
                role: 'assistant',
                content: "Good day. I am Fox. How can I assist you?",
                timestamp: Date.now(),
              },
            ],
          };
          setActiveSessionId(freshId);
          setMessages(freshSession.messages);
          return [freshSession];
        }

        if (activeSessionId === sessionId) {
          const nextActive = filtered[0];
          setActiveSessionId(nextActive.id);
          setMessages(nextActive.messages || []);
        }

        return filtered;
      });
    },
    [activeSessionId]
  );

  const renameSession = useCallback((sessionId: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, title: newTitle.trim(), updatedAt: Date.now() } : s))
    );
  }, []);

  const pinSession = useCallback((sessionId: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, pinned: !s.pinned } : s))
    );
  }, []);

  const fallbackWebSpeech = useCallback(
    (text: string, onProgress?: (revealedText: string) => void, suppressAutoListen?: boolean) => {
      // Keep status as 'thinking' until speech actually begins
      setStatus('thinking');
      setAudioLevel(0);
      setFrequencyData(null);

      const spoke = speechSynthRef.current.speak(text, {
        voiceURI: voicePrefsRef.current.voiceURI,
        pitch: voicePrefsRef.current.pitch,
        rate: voicePrefsRef.current.rate,
        volume: voicePrefsRef.current.volume,
        onStart: () => {
          setStatus('speaking');
          speechSimulatorRef.current.start((simLevel) => {
            setAudioLevel(simLevel);
          });
        },
        onSubtitle: (subtitle) => {
          setSpeakingTranscript(subtitle);
        },
        onProgress: (revealed) => {
          onProgress?.(revealed);
        },
        onEnd: () => {
          onProgress?.(text);
          speechSimulatorRef.current.stop();
          setAudioLevel(0);
          setFrequencyData(null);
          setSpeakingTranscript('');
          setStatus('idle');

          if (!suppressAutoListen) {
            clearTimeout(autoListenTimerRef.current);
            autoListenTimerRef.current = setTimeout(() => {
              startListeningRef.current?.();
            }, 350);
          }
        },
        onError: () => {
          onProgress?.(text);
          speechSimulatorRef.current.stop();
          setAudioLevel(0);
          setFrequencyData(null);
          setSpeakingTranscript('');
          setStatus('idle');
        },
      });

      if (!spoke) {
        onProgress?.(text);
        speechSimulatorRef.current.stop();
        setAudioLevel(0);
        setFrequencyData(null);
        setSpeakingTranscript('');
        setStatus('idle');
      }
    },
    [voicePrefs]
  );

  const speakText = useCallback(
    async (
      text: string,
      onProgress?: (revealedText: string) => void,
      options?: { suppressAutoListen?: boolean }
    ) => {
      const suppressAutoListen = options?.suppressAutoListen;

      if (!voicePrefsRef.current.autoSpeak) {
        onProgress?.(text);
        setStatus('idle');
        setSpeakingTranscript('');
        return;
      }

      cancelSpeaking();
      // Record TTS telemetry
      const wordCount = text.split(/\s+/).filter(Boolean).length;
      const estimatedSecs = Math.max(0.5, Math.round(wordCount * 0.28 * 10) / 10);
      const updatedVoice = StorageService.recordVoiceTTS(text.length, estimatedSecs);
      setVoiceTelemetry(updatedVoice);

      // Keep status as 'thinking' while TTS is synthesizing/fetching over network
      setStatus('thinking');
      setSpeakingTranscript('');
      setAudioLevel(0);
      setFrequencyData(null);

      // Determine which cloud/local audio-synthesis engine to use, or fall back to browser Web Speech API
      const provider = voicePrefsRef.current.provider;
      const isHermesEdge = provider === 'hermes-edge';
      const isHermesPiper = provider === 'hermes-piper';
      const shouldUseDeepgram =
        (provider === 'deepgram' || (provider !== 'webspeech' && !isHermesEdge && !isHermesPiper && hasDeepgramKey)) &&
        hasDeepgramKey;

      if (shouldUseDeepgram || isHermesEdge || isHermesPiper) {
        setIsSynthesizingTTS(true);
        const engineLabel = shouldUseDeepgram ? 'Deepgram TTS' : 'Hermes TTS';

        try {
          const audioBlob = shouldUseDeepgram
            ? await fetchDeepgramTTS(text, voicePrefsRef.current.deepgramVoice || 'aura-2-asteria-en')
            : await fetchHermesTTS(
                text,
                isHermesPiper ? 'piper' : 'edge',
                isHermesPiper ? voicePrefsRef.current.hermesPiperVoice : voicePrefsRef.current.hermesEdgeVoice
              );
          setIsSynthesizingTTS(false);

          const played = await deepgramAudioRef.current.speak(audioBlob, text, {
            volume: voicePrefsRef.current.volume,
            rate: voicePrefsRef.current.rate,
            onStart: () => {
              // Switch to speaking ONLY when audio actually starts playing
              setStatus('speaking');
            },
            onLevel: (level, freqData) => {
              setAudioLevel(level);
              setFrequencyData(freqData);
            },
            onSubtitle: (sub) => {
              setSpeakingTranscript(sub);
            },
            onProgress: (revealed) => {
              onProgress?.(revealed);
            },
            onEnd: () => {
              onProgress?.(text);
              setAudioLevel(0);
              setFrequencyData(null);
              setSpeakingTranscript('');
              setStatus('idle');

              if (!suppressAutoListen) {
                clearTimeout(autoListenTimerRef.current);
                autoListenTimerRef.current = setTimeout(() => {
                  startListeningRef.current?.();
                }, 350);
              }
            },
            onError: (err) => {
              console.warn(`[${engineLabel}] Playback error, falling back to Web Speech:`, err);
              fallbackWebSpeech(text, onProgress, suppressAutoListen);
            },
          });

          if (!played) {
            fallbackWebSpeech(text, onProgress, suppressAutoListen);
          }
          return;
        } catch (err) {
          console.warn(`[${engineLabel}] Synthesis error, falling back to Web Speech:`, err);
          setIsSynthesizingTTS(false);
          fallbackWebSpeech(text, onProgress, suppressAutoListen);
          return;
        }
      }

      fallbackWebSpeech(text, onProgress, suppressAutoListen);
    },
    [voicePrefs, hasDeepgramKey, cancelSpeaking, fallbackWebSpeech]
  );

  // Synthesizes one sentence's audio ahead of time. Returns null to signal "use the
  // browser's Web Speech engine for this sentence" (e.g. provider is webspeech, or the
  // cloud engine failed) rather than throwing, so prefetching never rejects the queue.
  const synthesizeSentenceAudio = useCallback(
    async (text: string): Promise<Blob | null> => {
      const provider = voicePrefsRef.current.provider;
      const isHermesEdge = provider === 'hermes-edge';
      const isHermesPiper = provider === 'hermes-piper';
      const shouldUseDeepgram =
        (provider === 'deepgram' || (provider !== 'webspeech' && !isHermesEdge && !isHermesPiper && hasDeepgramKey)) &&
        hasDeepgramKey;

      if (!shouldUseDeepgram && !isHermesEdge && !isHermesPiper) {
        return null;
      }

      try {
        if (shouldUseDeepgram) {
          return await fetchDeepgramTTS(text, voicePrefsRef.current.deepgramVoice || 'aura-2-asteria-en');
        }
        return await fetchHermesTTS(
          text,
          isHermesPiper ? 'piper' : 'edge',
          isHermesPiper ? voicePrefsRef.current.hermesPiperVoice : voicePrefsRef.current.hermesEdgeVoice
        );
      } catch (err) {
        console.warn('[Streaming TTS] Sentence synthesis failed, falling back to Web Speech:', err);
        return null;
      }
    },
    [hasDeepgramKey]
  );

  // Plays one sentence (a pre-synthesized blob, or the browser voice if blob is null)
  // and resolves once playback actually ends.
  const playSentence = useCallback(
    (text: string, audioBlob: Blob | null): Promise<void> => {
      return new Promise((resolve) => {
        // Wrap resolve so it can be triggered externally (by cancelSpeaking, via
        // pendingPlaybackResolveRef) if playback gets interrupted rather than ending
        // naturally — DeepgramAudioService.stop()/pause() never fires 'ended', so without
        // this escape hatch an interruption would leave this promise pending forever.
        const finish = () => {
          if (pendingPlaybackResolveRef.current === finish) {
            pendingPlaybackResolveRef.current = null;
          }
          resolve();
        };
        pendingPlaybackResolveRef.current = finish;

        const speakWithWebSpeech = () => {
          const spoke = speechSynthRef.current.speak(text, {
            voiceURI: voicePrefsRef.current.voiceURI,
            pitch: voicePrefsRef.current.pitch,
            rate: voicePrefsRef.current.rate,
            volume: voicePrefsRef.current.volume,
            onStart: () => {
              setStatus('speaking');
            },
            onSubtitle: (subtitle) => {
              setSpeakingTranscript(subtitle);
            },
            onEnd: () => finish(),
            onError: () => finish(),
          });
          if (!spoke) finish();
        };

        if (!audioBlob) {
          speakWithWebSpeech();
          return;
        }

        deepgramAudioRef.current
          .speak(audioBlob, text, {
            volume: voicePrefsRef.current.volume,
            rate: voicePrefsRef.current.rate,
            onStart: () => {
              setStatus('speaking');
            },
            onLevel: (level, freqData) => {
              setAudioLevel(level);
              setFrequencyData(freqData);
            },
            onSubtitle: (subtitle) => {
              setSpeakingTranscript(subtitle);
            },
            onEnd: () => finish(),
            onError: () => speakWithWebSpeech(),
          })
          .then((played) => {
            if (!played) speakWithWebSpeech();
          });
      });
    },
    [voicePrefs]
  );

  // Drains the sentence queue one at a time. Each item's audio was already kicked off
  // (prefetched) when it was enqueued, so by the time we reach it here it usually only
  // needs to await a promise that's already resolved (or close to it) — this is what
  // hides TTS network latency behind the previous sentence's playback.
  const drainSpeechQueue = useCallback(
    async (sessionToken: number) => {
      if (queueDrainingRef.current) return;
      queueDrainingRef.current = true;

      try {
        while (sentenceQueueRef.current.length > 0) {
          if (speechSessionRef.current !== sessionToken) {
            sentenceQueueRef.current = [];
            break;
          }

          const item = sentenceQueueRef.current.shift()!;
          setIsSynthesizingTTS(true);
          let blob: Blob | null = null;
          try {
            blob = await item.audioPromise;
          } catch {
            blob = null;
          }
          setIsSynthesizingTTS(false);

          if (speechSessionRef.current !== sessionToken) {
            sentenceQueueRef.current = [];
            break;
          }

          // Clear the previous sentence's last amplitude frame so the orb doesn't hold a
          // stale level during the brief gap before this sentence's own onLevel starts.
          setAudioLevel(0);
          setFrequencyData(null);

          await playSentence(item.text, blob);
        }
      } finally {
        queueDrainingRef.current = false;
        if (speechSessionRef.current === sessionToken) {
          setAudioLevel(0);
          setFrequencyData(null);
          setSpeakingTranscript('');
          setIsSynthesizingTTS(false);
          setStatus('idle');

          clearTimeout(autoListenTimerRef.current);
          autoListenTimerRef.current = setTimeout(() => {
            startListeningRef.current?.();
          }, 350);
        }
      }
    },
    [playSentence]
  );

  // Enqueues one sentence for incremental playback and immediately starts synthesizing
  // its audio in the background (prefetch), without waiting for its turn in the queue.
  const enqueueSpeechSentence = useCallback(
    (text: string, sessionToken: number) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const audioPromise = synthesizeSentenceAudio(trimmed);
      sentenceQueueRef.current.push({ text: trimmed, audioPromise });
      drainSpeechQueue(sessionToken);
    },
    [synthesizeSentenceAudio, drainSpeechQueue]
  );

  const handleToolExecutions = useCallback(
    (tools: AssistantToolCall[]) => {
      for (const tool of tools) {
        if (tool.tool === 'reminder' && tool.parameters?.title) {
          addReminder(tool.parameters.title, tool.parameters.dueTime, tool.parameters.priority);
        } else if (tool.tool === 'note' && tool.parameters?.title) {
          addNote(tool.parameters.title, tool.parameters.content || '', tool.parameters.tags);
        } else if (tool.tool === 'device_control' && tool.parameters?.setting) {
          const setting = tool.parameters.setting.toLowerCase();
          if (setting.includes('focus')) updateDeviceSetting('focusMode', tool.parameters.action === 'enabled');
          if (setting.includes('disturb')) updateDeviceSetting('doNotDisturb', tool.parameters.action === 'enabled');
        }
      }
    },
    [addReminder, addNote, updateDeviceSetting]
  );

  const sendMessage = useCallback(
    async (prompt: string) => {
      const cleanPrompt = prompt.trim();
      if (!cleanPrompt) return;

      if (isSendingMessageRef.current) {
        return;
      }
      isSendingMessageRef.current = true;

      speechRecRef.current.stop();
      audioAnalyserRef.current.stopMicrophone();
      speechSimulatorRef.current.stop();

      // Record STT Telemetry
      const wordCount = cleanPrompt.split(/\s+/).filter(Boolean).length;
      const updatedVoice = StorageService.recordVoiceSTT(wordCount, cleanPrompt.length);
      setVoiceTelemetry(updatedVoice);

      const userMsg: ChatMessage = {
        id: 'msg_' + Date.now(),
        role: 'user',
        content: cleanPrompt,
        timestamp: Date.now(),
      };

      const updatedWithUser = [...messages, userMsg];
      setMessages(updatedWithUser);
      setCurrentTranscript('');
      setStatus('thinking');

      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === activeSessionId) {
            const isFirstUserMsg = (s.messages || []).filter((m) => m.role === 'user').length === 0;
            const newTitle = isFirstUserMsg
              ? cleanPrompt.slice(0, 36) + (cleanPrompt.length > 36 ? '...' : '')
              : s.title;
            return {
              ...s,
              title: newTitle,
              previewText: cleanPrompt,
              updatedAt: Date.now(),
              messages: [...(s.messages || []), userMsg],
            };
          }
          return s;
        })
      );

      try {
        if (!voicePrefs.autoSpeak) {
          // Voice output disabled: unchanged blocking request, reveal entire text immediately
          const response = await fetchAssistantChat(
            cleanPrompt,
            messages,
            enginePrefs.systemPrompt,
            enginePrefs.model,
            enginePrefs.provider
          );
          if (!response.success || !response.data) {
            throw new Error(response.error || 'Failed to get response');
          }

          const msgId = 'ast_' + Date.now();
          const fullText = response.data.text;
          const toolsDetected = response.data.toolsDetected;
          const sources = response.data.sources;

          if (response.data.tokens) {
            const updatedEngine = StorageService.recordEngineUsage(
              response.data.tokens.inputTokens || 0,
              response.data.tokens.outputTokens || 0,
              (toolsDetected || []).length,
              response.data.durationMs || 0
            );
            setEngineTelemetry(updatedEngine);
          } else {
            const inTok = Math.max(1, Math.round(cleanPrompt.length / 3.8));
            const outTok = Math.max(1, Math.round((fullText || '').length / 3.8));
            const updatedEngine = StorageService.recordEngineUsage(inTok, outTok, (toolsDetected || []).length, 650);
            setEngineTelemetry(updatedEngine);
          }

          if (toolsDetected && toolsDetected.length > 0) {
            handleToolExecutions(toolsDetected);
          }

          const assistantMsg: ChatMessage = {
            id: msgId,
            role: 'assistant',
            content: fullText,
            timestamp: Date.now(),
            tools: toolsDetected,
            sources: sources,
          };
          setMessages([...updatedWithUser, assistantMsg]);
          setSessions((prev) =>
            prev.map((s) =>
              s.id === activeSessionId
                ? { ...s, updatedAt: Date.now(), messages: [...(s.messages || []), assistantMsg] }
                : s
            )
          );
          setStatus('idle');
          return;
        }

        // Voice output enabled: stream the LLM response token-by-token, and start speaking
        // each sentence as soon as it's complete instead of waiting for the whole reply.
        // cancelSpeaking() resets status to 'idle' as a side effect, so restore 'thinking'
        // right after — otherwise the UI briefly shows the idle "How can I assist you?"
        // screen instead of the thinking indicator while the stream connects.
        cancelSpeaking();
        setStatus('thinking');
        const sessionToken = speechSessionRef.current;

        const msgId = 'ast_' + Date.now();
        const initialStreamingMsg: ChatMessage = {
          id: msgId,
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
          isStreaming: true,
        };
        setMessages([...updatedWithUser, initialStreamingMsg]);

        const updateMessageText = (revealed: string, isDone = false) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === msgId ? { ...m, content: revealed, isStreaming: !isDone } : m
            )
          );
          setSessions((prev) =>
            prev.map((s) => {
              if (s.id === activeSessionId) {
                return {
                  ...s,
                  previewText: revealed,
                  updatedAt: Date.now(),
                  messages: (s.messages || []).map((m) =>
                    m.id === msgId ? { ...m, content: revealed, isStreaming: !isDone } : m
                  ),
                };
              }
              return s;
            })
          );
        };

        let fullText = '';
        let sentenceBuffer = '';
        const SENTENCE_RE = /[^.!?\n]*[.!?\n]+\s*/g;

        await new Promise<void>((resolveStream) => {
          streamAssistantChat(
            cleanPrompt,
            messages,
            enginePrefs.systemPrompt,
            (chunk) => {
              if (speechSessionRef.current !== sessionToken) return;
              // Note: status stays 'thinking' here on purpose. Flipping to 'speaking'
              // before real audio has actually started playing shows a "Speaking..."
              // caption over silence, and if that sentence's synthesis then fails, no
              // audio ever plays despite the label. 'speaking' is only set from
              // playSentence's onStart, once audio genuinely begins.
              fullText += chunk;
              sentenceBuffer += chunk;
              updateMessageText(fullText, false);

              SENTENCE_RE.lastIndex = 0;
              let consumed = 0;
              let match: RegExpExecArray | null;
              while ((match = SENTENCE_RE.exec(sentenceBuffer)) !== null) {
                const sentence = match[0];
                if (sentence.trim()) {
                  enqueueSpeechSentence(sentence, sessionToken);
                }
                consumed = SENTENCE_RE.lastIndex;
              }
              sentenceBuffer = sentenceBuffer.slice(consumed);
            },
            () => {
              if (speechSessionRef.current === sessionToken && sentenceBuffer.trim()) {
                enqueueSpeechSentence(sentenceBuffer, sessionToken);
              }
              sentenceBuffer = '';
              updateMessageText(fullText, true);
              resolveStream();
            },
            (streamErr) => {
              console.error('Streaming chat failed:', streamErr);
              resolveStream();
            },
            enginePrefs.model,
            enginePrefs.provider
          );
        });

        if (!fullText.trim()) {
          throw new Error('Empty response from streaming chat');
        }

        // Estimated telemetry (streaming doesn't return real token counts)
        const inTok = Math.max(1, Math.round(cleanPrompt.length / 3.8));
        const outTok = Math.max(1, Math.round(fullText.length / 3.8));
        setEngineTelemetry(StorageService.recordEngineUsage(inTok, outTok, 0, 0));

        const wordCountTTS = fullText.split(/\s+/).filter(Boolean).length;
        const estimatedSecs = Math.max(0.5, Math.round(wordCountTTS * 0.28 * 10) / 10);
        setVoiceTelemetry(StorageService.recordVoiceTTS(fullText.length, estimatedSecs));

        // Tool-intent detection happens after the fact and doesn't block audio playback
        fetchDetectTools(cleanPrompt, fullText)
          .then((res) => {
            if (speechSessionRef.current !== sessionToken) return;
            const toolsDetected = res.toolsDetected || [];
            if (toolsDetected.length === 0) return;
            handleToolExecutions(toolsDetected);
            setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, tools: toolsDetected } : m)));
            setSessions((prev) =>
              prev.map((s) =>
                s.id === activeSessionId
                  ? {
                      ...s,
                      messages: (s.messages || []).map((m) =>
                        m.id === msgId ? { ...m, tools: toolsDetected } : m
                      ),
                    }
                  : s
              )
            );
          })
          .catch(() => {});
      } catch (err: any) {
        console.error('Failed to send message:', err);
        const errorMsg: ChatMessage = {
          id: 'err_' + Date.now(),
          role: 'assistant',
          content: "I'm right here. How can I help you today?",
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errorMsg]);
        setStatus('idle');
      } finally {
        isSendingMessageRef.current = false;
      }
    },
    [messages, activeSessionId, handleToolExecutions, cancelSpeaking, enqueueSpeechSentence, enginePrefs, voicePrefs]
  );

  const usePromptTemplate = useCallback(
    (prompt: string) => {
      sendMessage(prompt);
    },
    [sendMessage]
  );

  const startListening = useCallback(async () => {
    cancelSpeaking();
    isSpeechFinalDispatchedRef.current = false;
    setCurrentTranscript('');

    const micOk = await audioAnalyserRef.current.startMicrophone(
      (level, freqData) => {
        setAudioLevel(level);
        setFrequencyData(freqData);
      }
    );

    if (!micOk) {
      speechSimulatorRef.current.start((simLevel) => setAudioLevel(simLevel));
    }

    // Only claim "listening" once the mic (or its fallback) is actually active — setting
    // this before startMicrophone() resolves would show "Listening..." while getUserMedia
    // is still initializing, silently dropping anything said in that gap.
    setStatus('listening');

    speechRecRef.current.start({
      onResult: (transcript, isFinal) => {
        setCurrentTranscript(transcript);
        if (isFinal && transcript.trim().length > 1) {
          if (isSpeechFinalDispatchedRef.current) return;
          isSpeechFinalDispatchedRef.current = true;
          speechRecRef.current.stop();
          audioAnalyserRef.current.stopMicrophone();
          speechSimulatorRef.current.stop();
          sendMessage(transcript);
        }
      },
      onError: (err) => {
        console.warn('Speech recognition error:', err);
        audioAnalyserRef.current.stopMicrophone();
        speechSimulatorRef.current.stop();
        setStatus('idle');
      },
      onEnd: () => {
        audioAnalyserRef.current.stopMicrophone();
        speechSimulatorRef.current.stop();
      },
    });
  }, [cancelSpeaking, sendMessage]);

  useEffect(() => {
    startListeningRef.current = startListening;
  }, [startListening]);

  useEffect(() => {
    if (deviceSettings.wakeWordEnabled) {
      void refreshSystemCapabilities();
    }
  }, [deviceSettings.wakeWordEnabled, refreshSystemCapabilities]);

  // Self-heal after a backend outage: refreshSystemCapabilities() only ever runs once
  // on mount and once when the toggle changes, so if the wake-word service was down
  // when the page loaded, wakeWordServiceHealthy stays stuck false forever even after
  // the backend recovers — nothing would ever prompt a re-check. Poll while enabled but
  // unhealthy so it picks the recovery up on its own instead of requiring a page reload.
  useEffect(() => {
    if (!deviceSettings.wakeWordEnabled || wakeWordServiceHealthy) {
      return;
    }

    const intervalId = setInterval(() => {
      void refreshSystemCapabilities();
    }, 20000);

    return () => clearInterval(intervalId);
  }, [deviceSettings.wakeWordEnabled, wakeWordServiceHealthy, refreshSystemCapabilities]);

  useEffect(() => {
    if (!deviceSettings.wakeWordEnabled) {
      wakeWordConnectingRef.current = false;
      wakeWordActiveUrlRef.current = null;
      void wakeWordRef.current.stop(false);
      setWakeWordState('disabled');
      return;
    }

    if (!wakeWordServiceHealthy || !wakeWordWebSocketUrl) {
      wakeWordConnectingRef.current = false;
      wakeWordActiveUrlRef.current = null;
      void wakeWordRef.current.stop(false);
      setWakeWordState('unavailable');
      return;
    }

    if (status !== 'idle') {
      wakeWordConnectingRef.current = false;
      wakeWordActiveUrlRef.current = null;
      void wakeWordRef.current.stop(false);
      return;
    }

    const alreadyMonitoring =
      wakeWordRef.current.isMonitoring() &&
      wakeWordActiveUrlRef.current === wakeWordWebSocketUrl;
    if (alreadyMonitoring) {
      setWakeWordState((prev) => (prev === 'arming' ? 'armed' : prev));
      return;
    }

    if (
      wakeWordConnectingRef.current &&
      wakeWordActiveUrlRef.current === wakeWordWebSocketUrl
    ) {
      return;
    }

    let cancelled = false;
    wakeWordConnectingRef.current = true;
    wakeWordActiveUrlRef.current = wakeWordWebSocketUrl;
    setWakeWordState((prev) => (prev === 'armed' ? prev : 'arming'));

    void wakeWordRef.current.start(wakeWordWebSocketUrl, {
      onReady: (phrase) => {
        if (cancelled) return;
        wakeWordConnectingRef.current = false;
        setWakeWordPhrase(phrase);
        setWakeWordLoadError(null);
        setWakeWordState('armed');
      },
      onMonitoring: () => {
        if (cancelled) return;
        wakeWordConnectingRef.current = false;
        setWakeWordState((prev) => (prev === 'triggered' ? prev : 'armed'));
      },
      onDetected: () => {
        if (cancelled) return;
        wakeWordConnectingRef.current = false;
        wakeWordActiveUrlRef.current = null;
        setWakeWordState('triggered');
        if (deviceSettings.soundEffects) {
          SoundFXService.getInstance().playChime('focus');
        }
        void wakeWordRef.current.stop(false);
        void startListeningRef.current?.();
      },
      onUnavailable: (message) => {
        if (cancelled) return;
        wakeWordConnectingRef.current = false;
        wakeWordActiveUrlRef.current = null;
        setWakeWordLoadError(message);
        setWakeWordServiceHealthy(false);
        setWakeWordState('unavailable');
      },
      onError: (error) => {
        if (cancelled) return;
        wakeWordConnectingRef.current = false;
        wakeWordActiveUrlRef.current = null;
        setWakeWordLoadError(error.message);
        setWakeWordState('error');
      },
      onClosed: () => {
        if (cancelled) return;
        wakeWordConnectingRef.current = false;
        wakeWordActiveUrlRef.current = null;
        if (status === 'idle' && deviceSettings.wakeWordEnabled && wakeWordServiceHealthy) {
          setWakeWordState('armed');
        }
      },
    }).then((started) => {
      if (!started && !cancelled) {
        wakeWordConnectingRef.current = false;
        wakeWordActiveUrlRef.current = null;
        setWakeWordState('error');
      }
    });

    return () => {
      cancelled = true;
      wakeWordConnectingRef.current = false;
      wakeWordActiveUrlRef.current = null;
      void wakeWordRef.current.stop(false);
    };
  }, [
    deviceSettings.soundEffects,
    deviceSettings.wakeWordEnabled,
    status,
    wakeWordServiceHealthy,
    wakeWordWebSocketUrl,
  ]);

  const stopListening = useCallback(() => {
    clearTimeout(autoListenTimerRef.current);
    speechRecRef.current.stop();
    audioAnalyserRef.current.stopMicrophone();
    speechSimulatorRef.current.stop();
    setAudioLevel(0);
    setFrequencyData(null);
    setStatus('idle');

    if (!isSpeechFinalDispatchedRef.current && currentTranscript.trim().length > 1) {
      isSpeechFinalDispatchedRef.current = true;
      sendMessage(currentTranscript);
    }
  }, [currentTranscript, sendMessage]);

  const toggleListening = useCallback(() => {
    if (status === 'listening') {
      stopListening();
    } else if (status === 'speaking') {
      cancelSpeaking();
    } else {
      startListening();
    }
  }, [status, startListening, stopListening, cancelSpeaking]);

  const clearChat = useCallback(() => {
    cancelSpeaking();
    const freshId = 'session_' + Date.now();
    const freshSession: ConversationSession = {
      id: freshId,
      title: 'New Chat',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      pinned: false,
      previewText: 'Good day. I am Fox. How can I assist you?',
      messages: [
        {
          id: 'welcome_' + freshId,
          role: 'assistant',
          content: "Good day. I am Fox. How can I assist you with your day?",
          timestamp: Date.now(),
        },
      ],
    };

    setSessions((prev) => [freshSession, ...prev.filter((s) => s.id !== activeSessionId)]);
    setActiveSessionId(freshId);
    setMessages(freshSession.messages);
  }, [cancelSpeaking, activeSessionId]);

  return (
    <AssistantContext.Provider
      value={{
        messages,
        status,
        audioLevel,
        frequencyData,
        accentTheme,
        coreShape,
        setCoreShape,
        reminders,
        notes,
        currentTranscript,
        speakingTranscript,
        isStreaming,
        voicePrefs,
        deviceSettings,
        availableVoices,
        deepgramVoices,
        hasDeepgramKey,
        isSynthesizingTTS,
        wakeWordState,
        wakeWordServiceHealthy,
        wakeWordPhrase,
        wakeWordLoadError,
        appMode,
        setAppMode,
        activeTool,
        setActiveTool,
        openToolPanel,
        settingsTab,
        setSettingsTab,
        openSettingsTab,
        enginePrefs,
        setEnginePrefs,
        engineTelemetry,
        voiceTelemetry,
        resetTelemetry,
        sessions,
        activeSessionId,
        isSidebarOpen,
        activeSidebarTab,
        promptTemplates,
        isSettingsOpen,
        setIsSettingsOpen,
        setIsSidebarOpen,
        toggleSidebar,
        setActiveSidebarTab,
        createNewSession,
        switchSession,
        deleteSession,
        renameSession,
        pinSession,
        usePromptTemplate,
        headerQuickOptions,
        setHeaderQuickOptions,
        isQuickAccessOpen,
        setIsQuickAccessOpen,
        toggleQuickAccess,
        setAccentTheme,
        setVoicePrefs,
        updateDeviceSetting,
        sendMessage,
        startListening,
        stopListening,
        toggleListening,
        cancelSpeaking,
        speakText,
        addReminder,
        toggleReminder,
        deleteReminder,
        addNote,
        deleteNote,
        clearChat,
      }}
    >
      {children}
    </AssistantContext.Provider>
  );
};

export const useAssistant = () => {
  const context = useContext(AssistantContext);
  if (!context) {
    throw new Error('useAssistant must be used within an AssistantProvider');
  }
  return context;
};
