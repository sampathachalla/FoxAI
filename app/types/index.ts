export type AssistantStatus = 'idle' | 'listening' | 'thinking' | 'speaking';

export type AppMode = 'voice' | 'chat' | 'settings' | 'tools';

export type ActiveToolType = 'notes' | 'sticky_notes' | 'calendar' | 'events';

export type SettingsTab = 'theme' | 'voice' | 'engine' | 'data';

export type SidebarTab = 'chats' | 'tools' | 'library' | 'settings';

export interface EnginePreferences {
  provider?: string;
  model: string;
  temperature: number;
  personaMode: 'adaptive' | 'executive' | 'technical' | 'creative';
  latencyMode: 'instant' | 'balanced' | 'deep';
  systemPrompt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  tools?: AssistantToolCall[];
  sources?: { title: string; url: string }[];
  isStreaming?: boolean;
}

export interface ConversationSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  pinned?: boolean;
  previewText?: string;
}

export interface PromptTemplate {
  id: string;
  title: string;
  description: string;
  prompt: string;
  category: 'Productivity' | 'Writing' | 'Coding' | 'Analysis' | 'Voice Directives';
  iconName?: string;
  tags?: string[];
}

export interface AssistantToolCall {
  id: string;
  tool: 'reminder' | 'note' | 'timer' | 'weather' | 'device_control' | 'search';
  parameters: Record<string, any>;
  result?: Record<string, any>;
  status: 'pending' | 'completed' | 'failed';
}

export interface ReminderItem {
  id: string;
  title: string;
  dueTime: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
}

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
  tags: string[];
}

export interface AccentTheme {
  id: string;
  name: string;
  primary: string;       // Primary hex color
  secondary: string;     // Gradient blend hex
  glow: string;          // Glow color rgba
  backgroundGlow: string;// Ambient background radial glow
  cssClass: string;
}

export interface DeepgramVoiceItem {
  id: string;
  name: string;
  gender: 'female' | 'male';
  accent: string;
  description: string;
  family: 'Aura-2' | 'Aura-1';
  recommended?: boolean;
}

export interface VoicePreference {
  provider?: 'deepgram' | 'webspeech' | 'auto';
  deepgramVoice?: string;
  voiceURI: string;
  pitch: number;
  rate: number;
  volume: number;
  autoSpeak: boolean;
}

export interface DeviceSettingState {
  focusMode: boolean;
  doNotDisturb: boolean;
  hapticFeedback: boolean;
  ambientGlow: boolean;
  soundEffects: boolean;
}

export type HeaderQuickOptionId =
  | 'color_theme'
  | 'sound_toggle'
  | 'time_display'
  | 'settings_view'
  | 'voice_mic';

export interface HeaderQuickOptionDef {
  id: HeaderQuickOptionId;
  label: string;
  shortLabel: string;
  description: string;
  iconName: string;
}

export interface EngineTelemetry {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  requestCount: number;
  toolInvocationsCount: number;
  totalLatencyMs: number;
  lastRequestTokens?: {
    input: number;
    output: number;
    total: number;
    durationMs: number;
  };
  lastUpdated: number;
}

export interface VoiceTelemetry {
  ttsCharactersSynthesized: number;
  ttsAudioSecondsGenerated: number;
  ttsSynthesisCount: number;
  sttSpokenWords: number;
  sttSpokenCharacters: number;
  sttSessionCount: number;
  lastUpdated: number;
}

export type CoreShapeId = 'sphere' | 'torus' | 'icosahedron' | 'helix' | 'tesseract';

export interface CoreShapeConfig {
  id: CoreShapeId;
  name: string;
  tagline: string;
  description: string;
  iconName: string;
  particleCount: number;
}

export const CORE_SHAPES: CoreShapeConfig[] = [
  {
    id: 'sphere',
    name: 'Holographic Sphere',
    tagline: 'Harmonic Resonance Core',
    description: 'Multi-tier holographic particle sphere with orbital HUD rings',
    iconName: 'Orbit',
    particleCount: 2400,
  },
  {
    id: 'torus',
    name: 'Quantum Torus',
    tagline: 'Subatomic Flux Ring',
    description: 'Pulsing donut ring of continuous particle streams and orbital rings',
    iconName: 'Disc',
    particleCount: 2400,
  },
  {
    id: 'icosahedron',
    name: 'Cyber Icosahedron',
    tagline: 'Holographic Crystal Lattice',
    description: 'Geometric crystal polyhedron with glowing vertices and rotating facet edges',
    iconName: 'Hexagon',
    particleCount: 2400,
  },
  {
    id: 'helix',
    name: 'Neural DNA Helix',
    tagline: 'Biomimetic Neural Wave',
    description: 'Dual braided particle waves undulating and twisting in 3D space with base pair rungs',
    iconName: 'Dna',
    particleCount: 2400,
  },
  {
    id: 'tesseract',
    name: 'Hypercube Tesseract',
    tagline: '4D Dimensional Matrix',
    description: '4D-to-3D perspective projection of rotating nested cube lattices',
    iconName: 'Box',
    particleCount: 2400,
  },
];

export const CORE_SHAPE_CONFIGS: Record<CoreShapeId, CoreShapeConfig> = {
  sphere: CORE_SHAPES[0],
  torus: CORE_SHAPES[1],
  icosahedron: CORE_SHAPES[2],
  helix: CORE_SHAPES[3],
  tesseract: CORE_SHAPES[4],
};

