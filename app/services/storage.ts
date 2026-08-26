import {
  ChatMessage,
  ReminderItem,
  NoteItem,
  AccentTheme,
  VoicePreference,
  DeviceSettingState,
  ConversationSession,
  PromptTemplate,
  AppMode,
  SettingsTab,
  EnginePreferences,
  HeaderQuickOptionId,
} from '../types';
import { ACCENT_THEMES } from '../utils/formatters';

const STORAGE_KEYS = {
  SESSIONS: 'fox_sessions_v3',
  ACTIVE_SESSION: 'fox_active_session_v3',
  MESSAGES: 'fox_messages_v1',
  REMINDERS: 'fox_reminders_v1',
  NOTES: 'fox_notes_v1',
  THEME: 'fox_accent_theme_v1',
  VOICE: 'fox_voice_pref_v1',
  DEVICE: 'fox_device_settings_v1',
  PROMPT_LIBRARY: 'fox_prompt_library_v1',
  SIDEBAR_OPEN: 'fox_sidebar_open_v1',
  APP_MODE: 'fox_app_mode_v1',
  SETTINGS_TAB: 'fox_settings_tab_v1',
  ENGINE_PREFS: 'fox_engine_prefs_v1',
  HEADER_QUICK_OPTIONS: 'fox_header_quick_options_v1',
};

export const DEFAULT_PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'p1',
    title: 'Executive Briefing',
    description: 'Synthesize complex updates into actionable bullet points with high-impact decisions.',
    prompt: 'Please provide a crisp executive briefing summarizing our core objectives, top priorities, and immediate action items.',
    category: 'Productivity',
    iconName: 'Sparkles',
    tags: ['Summary', 'Productivity'],
  },
  {
    id: 'p2',
    title: 'Code Architecture Review',
    description: 'Analyze system patterns, performance bottlenecks, and modular separation of concerns.',
    prompt: 'Review the architecture of a full-stack web application. Suggest modern patterns for state management, API proxy security, and 3D Canvas performance.',
    category: 'Coding',
    iconName: 'Code',
    tags: ['Engineering', 'Architecture'],
  },
  {
    id: 'p3',
    title: 'Tone Polish & Refinement',
    description: 'Elevate drafts into articulate, confident, and professional correspondence.',
    prompt: 'Please polish this message for clarity, warmth, and executive presence without making it overly verbose.',
    category: 'Writing',
    iconName: 'PenLine',
    tags: ['Writing', 'Email'],
  },
  {
    id: 'p4',
    title: 'First-Principles Deconstruction',
    description: 'Break down complex questions into foundational truths and logical building blocks.',
    prompt: 'Explain the core physics and mathematics behind neural action potentials and electrical synapse firing from first principles.',
    category: 'Analysis',
    iconName: 'Brain',
    tags: ['Deep Dive', 'Science'],
  },
  {
    id: 'p5',
    title: 'Concise Voice Persona',
    description: 'Instruct Fox to answer using short, crisp sentences optimal for fast voice delivery.',
    prompt: 'For all subsequent answers, adopt an ultra-concise voice format: max 2-3 sentences, direct and clear.',
    category: 'Voice Directives',
    iconName: 'Mic',
    tags: ['Voice', 'Persona'],
  },
  {
    id: 'p6',
    title: 'Task & Schedule Breakdown',
    description: 'Organize a busy day with time-blocking, priority matrix, and energy management.',
    prompt: 'Help me plan my daily schedule with time-blocked focus sessions, reminders for key meetings, and intentional breaks.',
    category: 'Productivity',
    iconName: 'Calendar',
    tags: ['Schedule', 'Focus'],
  },
];

export const StorageService = {
  loadSessions(): ConversationSession[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SESSIONS);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}

    const oldMessages = StorageService.loadMessages();
    const defaultSession: ConversationSession = {
      id: 'session_fox_1',
      title: 'Fox Intelligence Core',
      createdAt: Date.now() - 3600000 * 2,
      updatedAt: Date.now(),
      pinned: true,
      previewText: 'Good day. I am Fox. Tap the 3D intelligence sphere or speak anytime...',
      messages: oldMessages.length > 0 ? oldMessages : [
        {
          id: 'welcome',
          role: 'assistant',
          content: "Good day. I am Fox. Tap the 3D intelligence core or speak anytime to manage reminders, capture notes, or ask anything.",
          timestamp: Date.now(),
        },
      ],
    };

    const sampleSession2: ConversationSession = {
      id: 'session_fox_2',
      title: 'Marvel J.A.R.V.I.S. Hologram Protocol',
      createdAt: Date.now() - 86400000 * 1.5,
      updatedAt: Date.now() - 86400000 * 1.5,
      pinned: false,
      previewText: 'Initialize J.A.R.V.I.S. holographic gimbal matrix and arc core diagnostics.',
      messages: [
        {
          id: 'm1',
          role: 'user',
          content: 'Initialize J.A.R.V.I.S. holographic gimbal matrix and arc core diagnostics.',
          timestamp: Date.now() - 86400000 * 1.5,
        },
        {
          id: 'm2',
          role: 'assistant',
          content: 'J.A.R.V.I.S. holographic matrix initialized. Concentric gimbal rings aligned, central arc reactor singularity online at 100% capacity, and tactical HUD radar stream active.',
          timestamp: Date.now() - 86400000 * 1.5 + 2000,
        },
      ],
    };

    const sampleSession3: ConversationSession = {
      id: 'session_fox_3',
      title: 'Daily Schedule & Reminders Plan',
      createdAt: Date.now() - 86400000 * 4,
      updatedAt: Date.now() - 86400000 * 4,
      pinned: false,
      previewText: 'Set a reminder to review quarterly proposals and check afternoon weather.',
      messages: [
        {
          id: 'm3',
          role: 'user',
          content: 'Set a reminder to review quarterly proposals and check afternoon weather.',
          timestamp: Date.now() - 86400000 * 4,
        },
        {
          id: 'm4',
          role: 'assistant',
          content: "I've scheduled your reminder for 4:30 PM today. Cupertino is currently 72°F and partly sunny with mild afternoon breezes.",
          timestamp: Date.now() - 86400000 * 4 + 1500,
        },
      ],
    };

    const initial = [defaultSession, sampleSession2, sampleSession3];
    StorageService.saveSessions(initial);
    return initial;
  },

  saveSessions(sessions: ConversationSession[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
    } catch (e) {}
  },

  loadActiveSessionId(): string {
    try {
      const id = localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION);
      if (id) return id;
    } catch (e) {}
    return 'session_fox_1';
  },

  saveActiveSessionId(id: string) {
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, id);
    } catch (e) {}
  },

  loadSidebarOpen(): boolean {
    try {
      const val = localStorage.getItem(STORAGE_KEYS.SIDEBAR_OPEN);
      if (val !== null) return val === 'true';
    } catch (e) {}
    return typeof window !== 'undefined' ? window.innerWidth >= 1024 : true;
  },

  saveSidebarOpen(isOpen: boolean) {
    try {
      localStorage.setItem(STORAGE_KEYS.SIDEBAR_OPEN, String(isOpen));
    } catch (e) {}
  },

  loadMessages(): ChatMessage[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MESSAGES);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  saveMessages(messages: ChatMessage[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages.slice(-50)));
    } catch (e) {}
  },

  loadReminders(): ReminderItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.REMINDERS);
      if (data) return JSON.parse(data);
    } catch (e) {}
    return [
      { id: '1', title: 'Review quarterly project proposal', dueTime: 'Today at 4:30 PM', completed: false, priority: 'high' },
      { id: '2', title: 'Prepare for team sync & design sprint', dueTime: 'Tomorrow at 10:00 AM', completed: false, priority: 'medium' },
      { id: '3', title: 'Meditation & focus break', dueTime: 'Daily at 8:00 PM', completed: true, priority: 'low' },
    ];
  },

  saveReminders(reminders: ReminderItem[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(reminders));
    } catch (e) {}
  },

  loadNotes(): NoteItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.NOTES);
      if (data) return JSON.parse(data);
    } catch (e) {}
    return [
      {
        id: '1',
        title: 'Project Fox Architecture',
        content: 'Clean modular separation between React frontend (components, hooks, services, store) and Node Express backend (routes, controllers, models).',
        updatedAt: Date.now() - 3600000 * 2,
        tags: ['Architecture', 'Ideas'],
      },
      {
        id: '2',
        title: 'Voice Assistant Design Principles',
        content: 'Pristine aesthetic, fluid responsive 3D sphere, low-latency voice interaction, contextual task cards.',
        updatedAt: Date.now() - 3600000 * 24,
        tags: ['Design', 'Fox'],
      },
    ];
  },

  saveNotes(notes: NoteItem[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notes));
    } catch (e) {}
  },

  loadPromptTemplates(): PromptTemplate[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PROMPT_LIBRARY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_PROMPT_TEMPLATES;
  },

  savePromptTemplates(templates: PromptTemplate[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.PROMPT_LIBRARY, JSON.stringify(templates));
    } catch (e) {}
  },

  loadTheme(): AccentTheme {
    try {
      const savedId = localStorage.getItem(STORAGE_KEYS.THEME);
      if (savedId) {
        const found = ACCENT_THEMES.find((t) => t.id === savedId);
        if (found) return found;
      }
    } catch (e) {}
    return ACCENT_THEMES[0]; // Fox Cyan #99FFFF
  },

  saveTheme(theme: AccentTheme) {
    try {
      localStorage.setItem(STORAGE_KEYS.THEME, theme.id);
    } catch (e) {}
  },

  loadVoicePreferences(): VoicePreference {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.VOICE);
      if (data) {
        const parsed = JSON.parse(data);
        return {
          provider: parsed.provider || 'auto',
          deepgramVoice: parsed.deepgramVoice || 'aura-2-asteria-en',
          voiceURI: parsed.voiceURI || '',
          pitch: parsed.pitch ?? 1.0,
          rate: parsed.rate ?? 1.05,
          volume: parsed.volume ?? 1.0,
          autoSpeak: parsed.autoSpeak ?? true,
        };
      }
    } catch (e) {}
    return {
      provider: 'auto',
      deepgramVoice: 'aura-2-asteria-en',
      voiceURI: '',
      pitch: 1.0,
      rate: 1.05,
      volume: 1.0,
      autoSpeak: true,
    };
  },

  saveVoicePreferences(prefs: VoicePreference) {
    try {
      localStorage.setItem(STORAGE_KEYS.VOICE, JSON.stringify(prefs));
    } catch (e) {}
  },

  loadDeviceSettings(): DeviceSettingState {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DEVICE);
      if (data) return JSON.parse(data);
    } catch (e) {}
    return {
      focusMode: false,
      doNotDisturb: false,
      hapticFeedback: true,
      ambientGlow: true,
      soundEffects: true,
    };
  },

  saveDeviceSettings(settings: DeviceSettingState) {
    try {
      localStorage.setItem(STORAGE_KEYS.DEVICE, JSON.stringify(settings));
    } catch (e) {}
  },

  loadAppMode(): AppMode {
    try {
      const mode = localStorage.getItem(STORAGE_KEYS.APP_MODE);
      if (mode === 'voice' || mode === 'chat' || mode === 'settings') return mode;
    } catch (e) {}
    return 'voice';
  },

  saveAppMode(mode: AppMode) {
    try {
      localStorage.setItem(STORAGE_KEYS.APP_MODE, mode);
    } catch (e) {}
  },

  loadSettingsTab(): SettingsTab {
    try {
      const tab = localStorage.getItem(STORAGE_KEYS.SETTINGS_TAB);
      if (tab === 'theme' || tab === 'voice' || tab === 'engine' || tab === 'data') return tab;
    } catch (e) {}
    return 'theme';
  },

  saveSettingsTab(tab: SettingsTab) {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS_TAB, tab);
    } catch (e) {}
  },

  loadEnginePreferences(): EnginePreferences {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ENGINE_PREFS);
      if (data) return JSON.parse(data);
    } catch (e) {}
    return {
      provider: 'gemini',
      model: 'Gemini 3.7 Flash',
      temperature: 0.7,
      personaMode: 'adaptive',
      latencyMode: 'instant',
      systemPrompt: 'You are Fox, an ultra-intelligent, precise, and articulate AI executive assistant. Maintain a calm, sophisticated tone with clear structured explanations.',
    };
  },

  saveEnginePreferences(prefs: EnginePreferences) {
    try {
      localStorage.setItem(STORAGE_KEYS.ENGINE_PREFS, JSON.stringify(prefs));
    } catch (e) {}
  },

  loadHeaderQuickOptions(): HeaderQuickOptionId[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.HEADER_QUICK_OPTIONS);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const validOptions: HeaderQuickOptionId[] = [
            'time_display',
            'color_theme',
            'sound_toggle',
            'settings_view',
            'voice_mic',
          ];
          const filtered = parsed
            .map((item) => {
              if (item === 'control_center' || item === 'focus_mode' || item === 'tools_panel') {
                return 'time_display';
              }
              return item;
            })
            .filter((item): item is HeaderQuickOptionId => validOptions.includes(item));
          if (filtered.length > 0) {
            return filtered.slice(0, 3);
          }
        }
      }
    } catch (e) {}
    return ['time_display', 'color_theme', 'sound_toggle'];
  },

  saveHeaderQuickOptions(options: HeaderQuickOptionId[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.HEADER_QUICK_OPTIONS, JSON.stringify(options.slice(0, 3)));
    } catch (e) {}
  },
};
