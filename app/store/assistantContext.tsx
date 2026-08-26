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
} from '../types';
import { StorageService } from '../services/storage';
import { fetchAssistantChat, fetchDeepgramTTS, fetchDeepgramVoices, fetchSystemStatus } from '../services/api';
import { AudioAnalyserService, SpeechVisualizerSimulator } from '../utils/audio';
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

  setAccentTheme: (theme: AccentTheme) => void;
  setVoicePrefs: (prefs: VoicePreference) => void;
  updateDeviceSetting: (key: keyof DeviceSettingState, value: boolean) => void;
  sendMessage: (prompt: string) => Promise<void>;
  startListening: () => Promise<void>;
  stopListening: () => void;
  toggleListening: () => void;
  cancelSpeaking: () => void;
  speakText: (text: string) => Promise<void>;
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
  const [reminders, setReminders] = useState<ReminderItem[]>(() => StorageService.loadReminders());
  const [notes, setNotes] = useState<NoteItem[]>(() => StorageService.loadNotes());
  const [currentTranscript, setCurrentTranscript] = useState<string>('');
  const [speakingTranscript, setSpeakingTranscript] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [voicePrefs, setVoicePrefsState] = useState<VoicePreference>(() => StorageService.loadVoicePreferences());
  const [deviceSettings, setDeviceSettingsState] = useState<DeviceSettingState>(() => StorageService.loadDeviceSettings());
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [deepgramVoices, setDeepgramVoices] = useState<DeepgramVoiceItem[]>([]);
  const [hasDeepgramKey, setHasDeepgramKey] = useState<boolean>(false);
  const [isSynthesizingTTS, setIsSynthesizingTTS] = useState<boolean>(false);

  // Services references
  const audioAnalyserRef = useRef<AudioAnalyserService>(new AudioAnalyserService());
  const speechSimulatorRef = useRef<SpeechVisualizerSimulator>(new SpeechVisualizerSimulator());
  const speechRecRef = useRef<SpeechRecognitionService>(new SpeechRecognitionService());
  const speechSynthRef = useRef<SpeechSynthesisService>(new SpeechSynthesisService());
  const deepgramAudioRef = useRef<DeepgramAudioService>(new DeepgramAudioService());
  const isSpeechFinalDispatchedRef = useRef<boolean>(false);
  const isSendingMessageRef = useRef<boolean>(false);

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
  useEffect(() => {
    let isMounted = true;

    async function checkDeepgramStatus() {
      try {
        const [voicesRes, statusRes] = await Promise.allSettled([
          fetchDeepgramVoices(),
          fetchSystemStatus(),
        ]);

        if (!isMounted) return;

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
        }
      } catch (err) {
        console.warn('[AssistantContext] Deepgram status check:', err);
      }
    }

    checkDeepgramStatus();

    return () => {
      isMounted = false;
    };
  }, []);

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

  const setVoicePrefs = (prefs: VoicePreference) => {
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
    speechSynthRef.current.stop();
    deepgramAudioRef.current.stop();
    speechSimulatorRef.current.stop();
    setAudioLevel(0);
    setSpeakingTranscript('');
    setIsSynthesizingTTS(false);
    setStatus('idle');
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
    (text: string) => {
      speechSimulatorRef.current.start((simLevel) => {
        setAudioLevel(simLevel);
      });

      const spoke = speechSynthRef.current.speak(text, {
        voiceURI: voicePrefs.voiceURI,
        pitch: voicePrefs.pitch,
        rate: voicePrefs.rate,
        volume: voicePrefs.volume,
        onSubtitle: (subtitle) => {
          setSpeakingTranscript(subtitle);
        },
        onEnd: () => {
          speechSimulatorRef.current.stop();
          setAudioLevel(0);
          setSpeakingTranscript('');
          setStatus('idle');
        },
        onError: () => {
          speechSimulatorRef.current.stop();
          setAudioLevel(0);
          setSpeakingTranscript('');
          setStatus('idle');
        },
      });

      if (!spoke) {
        speechSimulatorRef.current.stop();
        setAudioLevel(0);
        setSpeakingTranscript('');
        setStatus('idle');
      }
    },
    [voicePrefs]
  );

  const speakText = useCallback(
    async (text: string) => {
      if (!voicePrefs.autoSpeak) {
        setStatus('idle');
        setSpeakingTranscript('');
        return;
      }

      cancelSpeaking();
      setStatus('speaking');
      setSpeakingTranscript('');

      // Determine whether to use Deepgram Aura TTS or fallback to browser Web Speech API
      const shouldUseDeepgram =
        (voicePrefs.provider === 'deepgram' ||
          (voicePrefs.provider !== 'webspeech' && hasDeepgramKey)) &&
        hasDeepgramKey;

      if (shouldUseDeepgram) {
        setIsSynthesizingTTS(true);
        speechSimulatorRef.current.start((simLevel) => {
          setAudioLevel(simLevel);
        });

        try {
          const selectedVoice = voicePrefs.deepgramVoice || 'aura-2-asteria-en';
          const audioBlob = await fetchDeepgramTTS(text, selectedVoice);
          setIsSynthesizingTTS(false);

          const played = await deepgramAudioRef.current.speak(audioBlob, text, {
            volume: voicePrefs.volume,
            rate: voicePrefs.rate,
            onSubtitle: (sub) => {
              setSpeakingTranscript(sub);
            },
            onEnd: () => {
              speechSimulatorRef.current.stop();
              setAudioLevel(0);
              setSpeakingTranscript('');
              setStatus('idle');
            },
            onError: (err) => {
              console.warn('[Deepgram TTS] Playback error, falling back to Web Speech:', err);
              fallbackWebSpeech(text);
            },
          });

          if (!played) {
            fallbackWebSpeech(text);
          }
          return;
        } catch (err) {
          console.warn('[Deepgram TTS] Synthesis error, falling back to Web Speech:', err);
          setIsSynthesizingTTS(false);
          fallbackWebSpeech(text);
          return;
        }
      }

      fallbackWebSpeech(text);
    },
    [voicePrefs, hasDeepgramKey, cancelSpeaking, fallbackWebSpeech]
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
    [addReminder, addNote]
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
        const response = await fetchAssistantChat(
          cleanPrompt,
          messages,
          enginePrefs.systemPrompt,
          enginePrefs.model,
          enginePrefs.provider
        );
        if (response.success && response.data) {
          const assistantMsg: ChatMessage = {
            id: 'ast_' + Date.now(),
            role: 'assistant',
            content: response.data.text,
            timestamp: Date.now(),
            tools: response.data.toolsDetected,
            sources: response.data.sources,
          };

          const finalMessages = [...updatedWithUser, assistantMsg];
          setMessages(finalMessages);

          setSessions((prev) =>
            prev.map((s) =>
              s.id === activeSessionId
                ? {
                    ...s,
                    updatedAt: Date.now(),
                    messages: [...(s.messages || []), assistantMsg],
                  }
                : s
            )
          );

          if (response.data.toolsDetected && response.data.toolsDetected.length > 0) {
            handleToolExecutions(response.data.toolsDetected);
          }

          speakText(response.data.text);
        } else {
          throw new Error(response.error || 'Failed to get response');
        }
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
    [messages, activeSessionId, handleToolExecutions, speakText, enginePrefs]
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
    setStatus('listening');
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

  const stopListening = useCallback(() => {
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
