import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useVoiceAssistant } from '../hooks/useVoiceAssistant';
import { fetchHermesTTSVoices } from '../services/api';
import { ACCENT_THEMES } from '../utils/formatters';
import { SettingsTab, EnginePreferences, HeaderQuickOptionId, CoreShapeId, CORE_SHAPES } from '../types';
import { ALL_QUICK_OPTIONS } from './QuickAccessPanel';
import { ModelSelectorDropdown } from './ModelSelectorDropdown';
import { SoundFXService } from '../utils/audio';
import {
  Palette,
  Mic,
  Cpu,
  Database,
  ArrowLeft,
  Check,
  Volume2,
  VolumeX,
  Play,
  Square,
  Sparkles,
  Sliders,
  ShieldCheck,
  Trash2,
  Download,
  RotateCcw,
  RefreshCw,
  Zap,
  Layers,
  Activity,
  Terminal,
  FileText,
  Clock,
  ChevronRight,
  Info,
  Orbit,
  Disc,
  Hexagon,
  Dna,
  Box,
  Boxes,
  CircleDot,
  Globe,
} from 'lucide-react';

const SHAPE_ICONS: Record<CoreShapeId, React.ElementType> = {
  sphere: Orbit,
  torus: Disc,
  icosahedron: Hexagon,
  helix: Dna,
  tesseract: Boxes,
  planetarium: Globe,
};

const SHAPE_BADGES: Record<CoreShapeId, { type: string; motion: string }> = {
  sphere: { type: 'Orbital HUD', motion: 'Harmonic Pulse' },
  torus: { type: 'Quantum Toroid', motion: 'Dual-Axis Vortex' },
  icosahedron: { type: 'Crystal Polyhedron', motion: 'Facet Lattice' },
  helix: { type: 'Dual Strand Wave', motion: 'Biomimetic Twist' },
  tesseract: { type: '4D Hypercube Matrix', motion: '4D Perspective Projection' },
  planetarium: { type: '9 Revolving Planets', motion: 'Keplerian Orbits' },
};

export const SettingsView: React.FC = () => {
  const {
    accentTheme,
    setAccentTheme,
    coreShape,
    setCoreShape,
    voicePrefs,
    setVoicePrefs,
    availableVoices,
    deepgramVoices,
    hasDeepgramKey,
    speakText,
    cancelSpeaking,
    updateDeviceSetting,
    settingsTab,
    setSettingsTab,
    setAppMode,
    enginePrefs,
    setEnginePrefs,
    sessions,
    notes,
    reminders,
    clearChat,
    headerQuickOptions,
    setHeaderQuickOptions,
    deviceSettings,
    wakeWordState,
    wakeWordServiceHealthy,
    wakeWordPhrase,
    wakeWordLoadError,
    engineTelemetry,
    voiceTelemetry,
    resetTelemetry,
  } = useVoiceAssistant();

  const [editingHeaderSlot, setEditingHeaderSlot] = useState<number | null>(null);

  const [testingVoiceId, setTestingVoiceId] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const [deepgramFamilyFilter, setDeepgramFamilyFilter] = useState<'Aura-2' | 'Aura-1'>('Aura-2');

  const [hermesVoices, setHermesVoices] = useState<any[]>([]);
  const [hermesVoicesLoading, setHermesVoicesLoading] = useState(false);
  const [hermesVoicesError, setHermesVoicesError] = useState<string | null>(null);
  const [testingHermesVoiceId, setTestingHermesVoiceId] = useState<string | null>(null);

  const isHermesProvider = voicePrefs.provider === 'hermes-edge' || voicePrefs.provider === 'hermes-piper';
  const hermesEngine: 'edge' | 'piper' = voicePrefs.provider === 'hermes-piper' ? 'piper' : 'edge';

  useEffect(() => {
    if (!isHermesProvider) return;
    let cancelled = false;

    setHermesVoicesLoading(true);
    setHermesVoicesError(null);

    fetchHermesTTSVoices(hermesEngine)
      .then((res) => {
        if (cancelled) return;
        setHermesVoices(res.voices || []);
      })
      .catch((err: any) => {
        if (cancelled) return;
        setHermesVoicesError(err?.message || 'Hermes TTS microservice unavailable');
        setHermesVoices([]);
      })
      .finally(() => {
        if (!cancelled) setHermesVoicesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isHermesProvider, hermesEngine]);

  // Tabs configuration
  const tabs: { id: SettingsTab; label: string; icon: React.ElementType; desc: string }[] = [
    {
      id: 'theme',
      label: 'Theme & Appearance',
      icon: Palette,
      desc: 'Accent spectrum, glassmorphism, and visual lighting',
    },
    {
      id: 'voice',
      label: 'Voice & Speech',
      icon: Mic,
      desc: 'Deepgram Aura and Hermes (Edge/Piper) neural synthesis, voice selection, pitch, and rate',
    },
    {
      id: 'engine',
      label: 'Intelligence Engine',
      icon: Cpu,
      desc: 'Gemini 3.7 Flash model tuning, persona, and directives',
    },
    {
      id: 'data',
      label: 'Data & Storage',
      icon: Database,
      desc: 'Conversation history, export tools, and storage metrics',
    },
  ];

  const handlePreviewDeepgramVoice = async (voiceId: string) => {
    if (testingVoiceId === voiceId) {
      cancelSpeaking();
      setTestingVoiceId(null);
      return;
    }

    setTestingVoiceId(voiceId);
    // Temporary set selected voice
    setVoicePrefs({
      ...voicePrefs,
      provider: 'deepgram',
      deepgramVoice: voiceId,
    });

    const voiceObj = deepgramVoices.find((v) => v.id === voiceId);
    const phrase = `Hello! I am ${voiceObj ? voiceObj.name : 'Fox'}, speaking with the Deepgram ${voiceObj?.family || 'Aura'} neural model.`;

    try {
      await speakText(phrase, undefined, { suppressAutoListen: true });
    } finally {
      setTimeout(() => {
        setTestingVoiceId(null);
      }, 3500);
    }
  };

  const handlePreviewHermesVoice = async (voiceId: string) => {
    if (testingHermesVoiceId === voiceId) {
      cancelSpeaking();
      setTestingHermesVoiceId(null);
      return;
    }

    setTestingHermesVoiceId(voiceId);
    setVoicePrefs({
      ...voicePrefs,
      ...(hermesEngine === 'piper' ? { hermesPiperVoice: voiceId } : { hermesEdgeVoice: voiceId }),
    });

    const voiceObj = hermesVoices.find((v) => v.id === voiceId);
    const phrase = `Hello! I am ${voiceObj ? voiceObj.name : 'Fox'}, speaking through Hermes ${
      hermesEngine === 'piper' ? 'Piper' : 'Microsoft Edge'
    } text-to-speech.`;

    try {
      await speakText(phrase, undefined, { suppressAutoListen: true });
    } finally {
      setTimeout(() => {
        setTestingHermesVoiceId(null);
      }, 3500);
    }
  };

  // Export conversations
  const handleExportData = () => {
    const dataToExport = {
      exportDate: new Date().toISOString(),
      assistant: 'Fox AI',
      totalSessions: sessions.length,
      sessions,
      reminders,
      notes,
    };

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fox_conversations_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleUpdateEngine = (updates: Partial<EnginePreferences>) => {
    setEnginePrefs({
      ...enginePrefs,
      ...updates,
    });
  };

  const currentTabInfo = tabs.find((t) => t.id === settingsTab) || tabs[0];

  return (
    <div className="w-full h-full flex flex-col overflow-hidden text-white">
      {/* Top Header Bar */}
      <div className="shrink-0 pb-3 pt-1 border-b border-white/[0.08] flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Back Button & Title */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setAppMode('chat')}
            className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-neutral-300 hover:text-white transition-all cursor-pointer flex items-center space-x-1.5 text-xs font-medium group"
            title="Back to Conversation"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Chat</span>
          </button>

          <div className="h-4 w-px bg-white/15 hidden sm:block" />

          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-lg font-semibold tracking-tight text-white flex items-center space-x-2">
                <span>{currentTabInfo.label}</span>
              </h1>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-mono font-medium uppercase tracking-wider"
                style={{
                  backgroundColor: `${accentTheme.primary}18`,
                  color: accentTheme.primary,
                  border: `1px solid ${accentTheme.primary}35`,
                }}
              >
                Settings
              </span>
            </div>
            <p className="text-xs text-neutral-400 hidden sm:block">
              {currentTabInfo.desc}
            </p>
          </div>
        </div>
      </div>

      {/* Settings Section Nav */}
      <div className="shrink-0 flex items-center gap-2 overflow-x-auto py-3 custom-scrollbar">
        {tabs.map((tab) => {
          const isActive = settingsTab === tab.id;
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setSettingsTab(tab.id)}
              className={`shrink-0 px-3 py-2 rounded-xl border text-xs font-medium flex items-center space-x-1.5 transition-all cursor-pointer ${
                isActive
                  ? 'text-white shadow-sm'
                  : 'bg-white/[0.03] border-white/[0.08] text-neutral-400 hover:text-white hover:bg-white/[0.06]'
              }`}
              style={
                isActive
                  ? {
                      backgroundColor: `${accentTheme.primary}18`,
                      borderColor: `${accentTheme.primary}45`,
                      color: accentTheme.primary,
                    }
                  : undefined
              }
            >
              <TabIcon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Settings Page Content (Scrollable) */}
      <div className="flex-1 min-h-0 overflow-y-auto py-5 pr-1 space-y-6 custom-scrollbar">
        <AnimatePresence mode="wait">
          {/* ========================================================================= */}
          {/* 1. THEME & APPEARANCE VIEW PAGE */}
          {/* ========================================================================= */}
          {settingsTab === 'theme' && (
            <motion.div
              key="tab-theme"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6 max-w-4xl"
            >
              {/* Accent Spectrum Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-white tracking-tight">
                      Accent Color Spectrum
                    </h2>
                    <p className="text-xs text-neutral-400">
                      Select your primary luminescence and 3D visualizer glow signature.
                    </p>
                  </div>
                  <span
                    className="text-xs font-mono font-medium px-2.5 py-1 rounded-lg border border-white/10"
                    style={{ color: accentTheme.primary, backgroundColor: 'rgba(0,0,0,0.5)' }}
                  >
                    Active: {accentTheme.name}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {ACCENT_THEMES.map((theme) => {
                    const isSelected = accentTheme.id === theme.id;
                    return (
                      <div
                        key={theme.id}
                        onClick={() => setAccentTheme(theme)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 text-left relative overflow-hidden group ${
                          isSelected
                            ? 'bg-white/[0.12] border-white/40 shadow-xl'
                            : 'bg-white/[0.03] hover:bg-white/[0.07] border-white/[0.08] hover:border-white/20'
                        }`}
                        style={
                          isSelected
                            ? {
                                boxShadow: `0 0 20px ${theme.glow}`,
                                borderColor: `${theme.primary}80`,
                              }
                            : undefined
                        }
                      >
                        {/* Background subtle sheen */}
                        <div
                          className="absolute -right-8 -top-8 w-24 h-24 rounded-full blur-2xl pointer-events-none opacity-40 group-hover:opacity-70 transition-opacity"
                          style={{ backgroundColor: theme.primary }}
                        />

                        <div className="flex items-center justify-between relative z-10">
                          <div className="flex items-center space-x-2.5">
                            <span
                              className="w-5 h-5 rounded-full ring-2 ring-white/30 shadow-md shrink-0 flex items-center justify-center"
                              style={{
                                background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
                              }}
                            />
                            <span className="text-xs font-semibold text-white truncate">
                              {theme.name}
                            </span>
                          </div>

                          {isSelected && (
                            <div
                              className="w-5 h-5 rounded-full flex items-center justify-center text-black font-bold shrink-0"
                              style={{ backgroundColor: theme.primary }}
                            >
                              <Check className="w-3 h-3 text-black stroke-[3]" />
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono relative z-10">
                          <span>{theme.primary}</span>
                          <span className="opacity-60">{theme.secondary}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3D Intelligence Core Shape Selector */}
              <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/[0.08] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Boxes className="w-4 h-4 text-cyan-400" style={{ color: accentTheme.primary }} />
                      <h2 className="text-sm font-semibold text-white tracking-tight">
                        3D Intelligence Core Shape
                      </h2>
                    </div>
                    <p className="text-xs text-neutral-400">
                      Select the procedural holographic geometry rendered in the neural voice stage.
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 self-start sm:self-auto">
                    <span
                      className="text-xs font-mono font-medium px-2.5 py-1 rounded-lg border border-white/10 flex items-center space-x-1.5"
                      style={{ color: accentTheme.primary, backgroundColor: 'rgba(0,0,0,0.5)' }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full animate-pulse"
                        style={{ backgroundColor: accentTheme.primary }}
                      />
                      <span>Active: {CORE_SHAPES.find((s) => s.id === (coreShape || 'sphere'))?.name || 'Holographic Sphere'}</span>
                    </span>
                  </div>
                </div>

                {/* 5 Core Shapes Visual Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {CORE_SHAPES.map((shape) => {
                    const isSelected = (coreShape || 'sphere') === shape.id;
                    const ShapeIcon = SHAPE_ICONS[shape.id] || Orbit;
                    const badgeInfo = SHAPE_BADGES[shape.id] || { type: '3D Geometry', motion: 'Audio Reactive' };

                    return (
                      <button
                        type="button"
                        key={shape.id}
                        onClick={() => {
                          if (deviceSettings.soundEffects) {
                            SoundFXService.getInstance().playChime('click');
                          }
                          setCoreShape(shape.id);
                        }}
                        className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between gap-3 text-left relative overflow-hidden group ${
                          isSelected
                            ? 'bg-white/[0.12] border-white/40 shadow-xl ring-1 ring-white/20'
                            : 'bg-white/[0.03] hover:bg-white/[0.07] border-white/[0.08] hover:border-white/20 hover:scale-[1.01]'
                        }`}
                        style={
                          isSelected
                            ? {
                                boxShadow: `0 0 24px ${accentTheme.glow}`,
                                borderColor: `${accentTheme.primary}80`,
                              }
                            : undefined
                        }
                      >
                        {/* Background Sheen on Selected / Hover */}
                        <div
                          className="absolute -right-8 -top-8 w-28 h-28 rounded-full blur-2xl pointer-events-none transition-opacity duration-300 opacity-0 group-hover:opacity-30"
                          style={{ backgroundColor: accentTheme.primary }}
                        />
                        {isSelected && (
                          <div
                            className="absolute -right-8 -top-8 w-28 h-28 rounded-full blur-2xl pointer-events-none opacity-50"
                            style={{ backgroundColor: accentTheme.primary }}
                          />
                        )}

                        {/* Top Row: Icon, Titles & Active Indicator */}
                        <div className="flex items-start justify-between gap-2 relative z-10 w-full">
                          <div className="flex items-center space-x-3 min-w-0">
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-105"
                              style={{
                                background: isSelected
                                  ? `linear-gradient(135deg, ${accentTheme.primary}35, ${accentTheme.secondary}35)`
                                  : 'rgba(255,255,255,0.06)',
                                border: isSelected
                                  ? `1px solid ${accentTheme.primary}80`
                                  : '1px solid rgba(255,255,255,0.1)',
                                color: isSelected ? '#ffffff' : accentTheme.primary,
                              }}
                            >
                              <ShapeIcon className="w-5 h-5 transition-transform duration-300 group-hover:rotate-6" />
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-xs font-bold text-white truncate tracking-tight">
                                {shape.name}
                              </h3>
                              <p className="text-[10px] text-neutral-400 font-mono truncate">{shape.tagline}</p>
                            </div>
                          </div>

                          {/* Selection Status Badge */}
                          {isSelected ? (
                            <div className="flex items-center space-x-1.5 shrink-0">
                              <span
                                className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center space-x-1"
                                style={{
                                  backgroundColor: `${accentTheme.primary}25`,
                                  color: accentTheme.primary,
                                  border: `1px solid ${accentTheme.primary}50`,
                                }}
                              >
                                <span
                                  className="w-1.5 h-1.5 rounded-full animate-pulse"
                                  style={{ backgroundColor: accentTheme.primary }}
                                />
                                <span>ACTIVE</span>
                              </span>
                              <div
                                className="w-5 h-5 rounded-full flex items-center justify-center text-black font-bold shrink-0 shadow-sm"
                                style={{ backgroundColor: accentTheme.primary }}
                              >
                                <Check className="w-3 h-3 text-black stroke-[3]" />
                              </div>
                            </div>
                          ) : (
                            <span className="text-[10px] font-medium text-neutral-500 group-hover:text-neutral-300 transition-colors opacity-0 group-hover:opacity-100 shrink-0">
                              Select
                            </span>
                          )}
                        </div>

                        {/* Description */}
                        <p className="text-[11px] text-neutral-300 leading-relaxed relative z-10 line-clamp-2">
                          {shape.description}
                        </p>

                        {/* Badges / Specs Footer */}
                        <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between gap-2 relative z-10 w-full text-[10px]">
                          <div className="flex items-center space-x-1.5">
                            <span className="px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.08] text-neutral-400 font-mono text-[9px] flex items-center space-x-1">
                              <Sparkles className="w-2.5 h-2.5" style={{ color: accentTheme.primary }} />
                              <span>{shape.particleCount.toLocaleString()} pts</span>
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.08] text-neutral-400 text-[9px] truncate">
                              {badgeInfo.type}
                            </span>
                          </div>

                          <span className="text-neutral-500 font-mono text-[9px] truncate">
                            {badgeInfo.motion}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Header Top 3 Quick Access Configuration */}
              <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/[0.08] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Sliders className="w-4 h-4 text-cyan-400" />
                      <h2 className="text-sm font-semibold text-white">Header Top 3 Quick Actions</h2>
                    </div>
                    <p className="text-xs text-neutral-400">
                      Customize which 3 shortcut tools appear permanently in the top navigation header.
                    </p>
                  </div>
                  <span className="text-xs font-mono font-medium px-2.5 py-1 rounded-lg border border-white/10 text-cyan-300 bg-cyan-500/10 self-start sm:self-auto">
                    Fixed 3 Slots
                  </span>
                </div>

                {/* 3 Active Slot Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {headerQuickOptions.slice(0, 3).map((optId, index) => {
                    const def = ALL_QUICK_OPTIONS.find((o) => o.id === optId) || ALL_QUICK_OPTIONS[0];
                    const Icon = def.icon;
                    const isEditing = editingHeaderSlot === index;

                    return (
                      <button
                        type="button"
                        key={index}
                        onClick={() => {
                          if (deviceSettings.soundEffects) {
                            SoundFXService.getInstance().playChime('click');
                          }
                          setEditingHeaderSlot(isEditing ? null : index);
                        }}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 text-left relative group ${
                          isEditing
                            ? 'bg-white/[0.14] border-white/50 shadow-lg ring-2 ring-cyan-400/40'
                            : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.08] hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                            Slot #{index + 1}
                          </span>
                          <span className="text-[10px] font-semibold text-cyan-400 group-hover:text-cyan-300">
                            {isEditing ? 'Selecting...' : 'Change'}
                          </span>
                        </div>

                        <div className="flex items-center space-x-3 w-full">
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm"
                            style={{
                              background: `linear-gradient(135deg, ${accentTheme.primary}40, ${accentTheme.secondary}40)`,
                              border: `1px solid ${accentTheme.primary}60`,
                            }}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-bold text-white truncate">{def.label}</h4>
                            <p className="text-[10px] text-neutral-400 truncate">{def.shortLabel}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Selection Tray if Editing a Slot */}
                {editingHeaderSlot !== null && (
                  <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/15 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-white mb-2">
                      <span>Choose Action for Slot #{editingHeaderSlot + 1}:</span>
                      <button
                        onClick={() => setEditingHeaderSlot(null)}
                        className="text-neutral-400 hover:text-white underline cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto no-scrollbar">
                      {ALL_QUICK_OPTIONS.map((option) => {
                        const Icon = option.icon;
                        const activeIdx = headerQuickOptions.indexOf(option.id);
                        const isSelected = headerQuickOptions[editingHeaderSlot] === option.id;

                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => {
                              const newOpts = [...headerQuickOptions];
                              const swapIdx = newOpts.indexOf(option.id);
                              if (swapIdx !== -1 && swapIdx !== editingHeaderSlot) {
                                newOpts[swapIdx] = newOpts[editingHeaderSlot];
                              }
                              newOpts[editingHeaderSlot] = option.id;
                              setHeaderQuickOptions(newOpts);
                              if (deviceSettings.soundEffects) {
                                SoundFXService.getInstance().playChime('click');
                              }
                              setEditingHeaderSlot(null);
                            }}
                            className={`p-2.5 rounded-xl border flex items-center justify-between text-left transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-cyan-500/20 border-cyan-400/40 text-white font-bold'
                                : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/10 text-neutral-300'
                            }`}
                          >
                            <div className="flex items-center space-x-2.5 min-w-0">
                              <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                                <Icon className="w-3.5 h-3.5 text-white" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-semibold truncate">{option.label}</div>
                                <div className="text-[9px] text-neutral-400 truncate">{option.description}</div>
                              </div>
                            </div>

                            {activeIdx !== -1 && (
                              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 shrink-0 ml-1">
                                #{activeIdx + 1}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ========================================================================= */}
          {/* 2. VOICE & SPEECH VIEW PAGE */}
          {/* ========================================================================= */}
          {settingsTab === 'voice' && (
            <motion.div
              key="tab-voice"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6 max-w-4xl"
            >
              {/* Voice Synthesis Master Toggle */}
              <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <Volume2 className="w-4 h-4 text-cyan-400" />
                    <h2 className="text-sm font-semibold text-white">Voice Synthesis Auto-Speak</h2>
                  </div>
                  <p className="text-xs text-neutral-400">
                    Automatically speak Fox's replies aloud upon generation in Voice and Chat modes.
                  </p>
                </div>

                <button
                  onClick={() =>
                    setVoicePrefs({ ...voicePrefs, autoSpeak: !voicePrefs.autoSpeak })
                  }
                  className={`w-14 h-8 rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                    voicePrefs.autoSpeak ? 'bg-[#007AFF]' : 'bg-neutral-800'
                  }`}
                  style={voicePrefs.autoSpeak ? { backgroundColor: accentTheme.primary } : undefined}
                >
                  <div
                    className={`w-6 h-6 rounded-full bg-white transition-transform shadow-md ${
                      voicePrefs.autoSpeak ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/[0.08] space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <CircleDot className="w-4 h-4 text-cyan-400" />
                      <h2 className="text-sm font-semibold text-white">Wake Word Activation</h2>
                    </div>
                    <p className="text-xs text-neutral-400">
                      Stream low-latency microphone audio to OpenWakeWord and wake Fox when you say {`"${wakeWordPhrase}"`}.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      const nextValue = !deviceSettings.wakeWordEnabled;
                      updateDeviceSetting('wakeWordEnabled', nextValue);
                      if (deviceSettings.soundEffects) {
                        SoundFXService.getInstance().playChime(nextValue ? 'toggle_on' : 'toggle_off');
                      }
                    }}
                    className={`w-14 h-8 rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                      deviceSettings.wakeWordEnabled ? 'bg-[#007AFF]' : 'bg-neutral-800'
                    }`}
                    style={deviceSettings.wakeWordEnabled ? { backgroundColor: accentTheme.primary } : undefined}
                  >
                    <div
                      className={`w-6 h-6 rounded-full bg-white transition-transform shadow-md ${
                        deviceSettings.wakeWordEnabled ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-neutral-500 mb-1">Phrase</div>
                    <div className="text-sm font-semibold text-white">{wakeWordPhrase}</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-neutral-500 mb-1">Service</div>
                    <div className={`text-sm font-semibold ${wakeWordServiceHealthy ? 'text-emerald-300' : 'text-amber-300'}`}>
                      {wakeWordServiceHealthy ? 'Online' : 'Unavailable'}
                    </div>
                  </div>
                  <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-neutral-500 mb-1">State</div>
                    <div className="text-sm font-semibold text-white capitalize">
                      {wakeWordState.replace('_', ' ')}
                    </div>
                  </div>
                </div>

                {wakeWordLoadError && (
                  <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                    {wakeWordLoadError}
                  </div>
                )}
              </div>

              {/* TTS Engine Provider Selector */}
              <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/[0.08] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Zap className="w-4 h-4 text-cyan-400" />
                      <h2 className="text-sm font-semibold text-white">Text-to-Speech Engine Provider</h2>
                    </div>
                    <p className="text-xs text-neutral-400">
                      Select between cloud-powered Deepgram Aura neural models or browser native synthesis.
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 self-start sm:self-auto">
                    {hasDeepgramKey ? (
                      <span className="text-[10px] font-mono font-medium px-2.5 py-1 rounded-full border border-emerald-500/30 text-emerald-300 bg-emerald-500/10 flex items-center space-x-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Deepgram API Active</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono font-medium px-2.5 py-1 rounded-full border border-amber-500/30 text-amber-300 bg-amber-500/10">
                        Browser Mode Active
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {/* Deepgram Aura Provider Card */}
                  <button
                    type="button"
                    onClick={() => {
                      setVoicePrefs({
                        ...voicePrefs,
                        provider: 'deepgram',
                        deepgramVoice: voicePrefs.deepgramVoice || 'aura-2-asteria-en',
                      });
                    }}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col justify-between space-y-3 ${
                      (voicePrefs.provider === 'deepgram' || (voicePrefs.provider === 'auto' && hasDeepgramKey))
                        ? 'bg-cyan-950/30 border-cyan-400/50 shadow-lg ring-1 ring-cyan-400/30'
                        : 'bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.05] text-neutral-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-white"
                          style={{
                            backgroundColor: `${accentTheme.primary}25`,
                            border: `1px solid ${accentTheme.primary}50`,
                          }}
                        >
                          <Sparkles className="w-4 h-4" style={{ color: accentTheme.primary }} />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white flex items-center space-x-1.5">
                            <span>Deepgram Aura Neural TTS</span>
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-400/20 text-cyan-300">
                              Aura-2 & 1
                            </span>
                          </div>
                          <div className="text-[10px] text-neutral-400">High-fidelity conversational AI voice</div>
                        </div>
                      </div>
                      {(voicePrefs.provider === 'deepgram' || (voicePrefs.provider === 'auto' && hasDeepgramKey)) && (
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-black"
                          style={{ backgroundColor: accentTheme.primary }}
                        >
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      Studio-quality neural voices with low latency (&lt;250ms), conversational inflections, and natural breathing pauses.
                    </p>
                  </button>

                  {/* Hermes Microsoft Edge TTS Card */}
                  <button
                    type="button"
                    onClick={() => {
                      setVoicePrefs({
                        ...voicePrefs,
                        provider: 'hermes-edge',
                      });
                    }}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col justify-between space-y-3 ${
                      voicePrefs.provider === 'hermes-edge'
                        ? 'bg-cyan-950/30 border-cyan-400/50 shadow-lg ring-1 ring-cyan-400/30'
                        : 'bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.05] text-neutral-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white border border-white/15">
                          <Mic className="w-4 h-4 text-neutral-300" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">Hermes Edge TTS</div>
                          <div className="text-[10px] text-neutral-400">Microsoft Edge neural voices</div>
                        </div>
                      </div>
                      {voicePrefs.provider === 'hermes-edge' && (
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-black"
                          style={{ backgroundColor: accentTheme.primary }}
                        >
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      Routed through the Hermes agent microservice. Free Microsoft neural voices; requires network access.
                    </p>
                  </button>

                  {/* Hermes Piper TTS Card */}
                  <button
                    type="button"
                    onClick={() => {
                      setVoicePrefs({
                        ...voicePrefs,
                        provider: 'hermes-piper',
                      });
                    }}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col justify-between space-y-3 ${
                      voicePrefs.provider === 'hermes-piper'
                        ? 'bg-cyan-950/30 border-cyan-400/50 shadow-lg ring-1 ring-cyan-400/30'
                        : 'bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.05] text-neutral-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white border border-white/15">
                          <Mic className="w-4 h-4 text-neutral-300" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">Hermes Piper TTS</div>
                          <div className="text-[10px] text-neutral-400">Local offline neural synthesizer</div>
                        </div>
                      </div>
                      {voicePrefs.provider === 'hermes-piper' && (
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-black"
                          style={{ backgroundColor: accentTheme.primary }}
                        >
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      Routed through the Hermes agent microservice. Runs fully offline on the Hermes host once voice models are installed.
                    </p>
                  </button>
                </div>
              </div>

              {/* Deepgram Aura Voice Library Grid (When Deepgram is active) */}
              {(voicePrefs.provider === 'deepgram' || (voicePrefs.provider === 'auto' && hasDeepgramKey)) && (
                <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/[0.08] space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <Sparkles className="w-4 h-4 text-cyan-400" />
                        <h3 className="text-sm font-semibold text-white">Deepgram Aura Voice Library</h3>
                      </div>
                      <p className="text-xs text-neutral-400">
                        Choose your primary neural persona. Preview voices directly before selecting.
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-neutral-400 self-start sm:self-auto">
                      Active: {voicePrefs.deepgramVoice || 'aura-2-asteria-en'}
                    </span>
                  </div>

                  {/* Aura-2 / Aura-1 Family Toggle */}
                  <div className="inline-flex p-1 rounded-2xl bg-black/40 border border-white/[0.08]">
                    {(['Aura-2', 'Aura-1'] as const).map((family) => {
                      const isActive = deepgramFamilyFilter === family;
                      return (
                        <button
                          key={family}
                          type="button"
                          onClick={() => setDeepgramFamilyFilter(family)}
                          className={`px-4 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                            isActive
                              ? 'text-black shadow-sm'
                              : 'text-neutral-400 hover:text-white'
                          }`}
                          style={isActive ? { backgroundColor: accentTheme.primary } : undefined}
                        >
                          {family}
                        </button>
                      );
                    })}
                  </div>

                  {/* Voices Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
                    {deepgramVoices.filter((voice) => voice.family === deepgramFamilyFilter).map((voice) => {
                      const isSelected = (voicePrefs.deepgramVoice || 'aura-2-asteria-en') === voice.id;
                      const isTestingThis = testingVoiceId === voice.id;

                      return (
                        <div
                          key={voice.id}
                          onClick={() => {
                            setVoicePrefs({
                              ...voicePrefs,
                              provider: 'deepgram',
                              deepgramVoice: voice.id,
                            });
                          }}
                          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5 relative ${
                            isSelected
                              ? 'bg-cyan-500/15 border-cyan-400/50 shadow-md ring-1 ring-cyan-400/40'
                              : 'bg-white/[0.02] hover:bg-white/[0.06] border-white/[0.08] hover:border-white/20'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                                <span className="text-xs font-bold text-white">{voice.name}</span>
                                <span
                                  className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                                    voice.family === 'Aura-2'
                                      ? 'bg-cyan-400/20 text-cyan-300 border border-cyan-400/30'
                                      : 'bg-white/10 text-neutral-300'
                                  }`}
                                >
                                  {voice.family}
                                </span>
                                {voice.recommended && (
                                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                                    Top Pick
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-neutral-400 capitalize flex items-center space-x-1 mt-0.5">
                                <span>{voice.gender}</span>
                                <span>•</span>
                                <span>{voice.accent}</span>
                              </div>
                            </div>

                            {isSelected && (
                              <div
                                className="w-5 h-5 rounded-full flex items-center justify-center text-black shrink-0"
                                style={{ backgroundColor: accentTheme.primary }}
                              >
                                <Check className="w-3 h-3 stroke-[3]" />
                              </div>
                            )}
                          </div>

                          <p className="text-[11px] text-neutral-300 leading-snug line-clamp-2">
                            {voice.description}
                          </p>

                          <div className="pt-1 border-t border-white/[0.06] flex items-center justify-between">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePreviewDeepgramVoice(voice.id);
                              }}
                              className={`px-2.5 py-1 rounded-xl text-[10px] font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                                isTestingThis
                                  ? 'bg-rose-500 text-white'
                                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
                              }`}
                            >
                              {isTestingThis ? (
                                <>
                                  <Square className="w-2.5 h-2.5 fill-current" />
                                  <span>Stop</span>
                                </>
                              ) : (
                                <>
                                  <Play className="w-2.5 h-2.5 fill-current" />
                                  <span>Listen Sample</span>
                                </>
                              )}
                            </button>

                            <span className="text-[9px] font-mono text-neutral-500 truncate max-w-[110px]">
                              {voice.id}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Hermes TTS Voice Library (When Hermes Edge/Piper is active) */}
              {isHermesProvider && (
                <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/[0.08] space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <Mic className="w-4 h-4 text-cyan-400" />
                        <h3 className="text-sm font-semibold text-white">
                          Hermes {hermesEngine === 'piper' ? 'Piper' : 'Microsoft Edge'} Voice Library
                        </h3>
                      </div>
                      <p className="text-xs text-neutral-400">
                        {hermesEngine === 'piper'
                          ? 'Voices installed on the Hermes host in api/agent/Tts/piper_models.'
                          : 'Live catalog fetched from the Hermes agent microservice.'}
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-neutral-400 self-start sm:self-auto">
                      Active: {(hermesEngine === 'piper' ? voicePrefs.hermesPiperVoice : voicePrefs.hermesEdgeVoice) || 'default'}
                    </span>
                  </div>

                  {hermesVoicesLoading && (
                    <div className="text-xs text-neutral-400">Loading voices from Hermes agent...</div>
                  )}

                  {!hermesVoicesLoading && hermesVoicesError && (
                    <div className="text-xs text-amber-400/90 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
                      {hermesVoicesError}. Make sure the Hermes Python microservice is running.
                    </div>
                  )}

                  {!hermesVoicesLoading && !hermesVoicesError && hermesVoices.length === 0 && (
                    <div className="text-xs text-neutral-400">
                      No voices found{hermesEngine === 'piper' ? ' in api/agent/Tts/piper_models' : ''}.
                    </div>
                  )}

                  {!hermesVoicesLoading && hermesVoices.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
                      {hermesVoices.map((voice) => {
                        const isSelected =
                          (hermesEngine === 'piper' ? voicePrefs.hermesPiperVoice : voicePrefs.hermesEdgeVoice) === voice.id;
                        const isTestingThis = testingHermesVoiceId === voice.id;
                        return (
                          <div
                            key={voice.id}
                            onClick={() =>
                              setVoicePrefs({
                                ...voicePrefs,
                                ...(hermesEngine === 'piper' ? { hermesPiperVoice: voice.id } : { hermesEdgeVoice: voice.id }),
                              })
                            }
                            className={`p-3 rounded-2xl border cursor-pointer space-y-2 transition-all ${
                              isSelected
                                ? 'bg-cyan-950/30 border-cyan-400/50 ring-1 ring-cyan-400/30'
                                : 'bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.05]'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-white truncate">{voice.name || voice.id}</div>
                                {(voice.country || voice.locale) && (
                                  <div className="text-[10px] text-neutral-400 mt-0.5">
                                    {voice.country || voice.locale}
                                    {voice.gender ? ` • ${voice.gender}` : ''}
                                  </div>
                                )}
                              </div>
                              {isSelected && (
                                <div
                                  className="w-5 h-5 rounded-full flex items-center justify-center text-black shrink-0"
                                  style={{ backgroundColor: accentTheme.primary }}
                                >
                                  <Check className="w-3 h-3 stroke-[3]" />
                                </div>
                              )}
                            </div>

                            <div className="pt-1 border-t border-white/[0.06] flex items-center justify-between">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePreviewHermesVoice(voice.id);
                                }}
                                className={`px-2.5 py-1 rounded-xl text-[10px] font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                                  isTestingThis
                                    ? 'bg-rose-500 text-white'
                                    : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
                                }`}
                              >
                                {isTestingThis ? (
                                  <>
                                    <Square className="w-2.5 h-2.5 fill-current" />
                                    <span>Stop</span>
                                  </>
                                ) : (
                                  <>
                                    <Play className="w-2.5 h-2.5 fill-current" />
                                    <span>Listen Sample</span>
                                  </>
                                )}
                              </button>

                              <span className="text-[9px] font-mono text-neutral-500 truncate max-w-[110px]">
                                {voice.id}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Web Speech Voice Selector (When Web Speech is active) */}
              {voicePrefs.provider === 'webspeech' && (
                <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/[0.08] space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Browser Synthesizer Voice Profile</h3>
                    <p className="text-xs text-neutral-400">
                      Choose from local voice profiles installed on your operating system.
                    </p>
                  </div>

                  <select
                    value={voicePrefs.voiceURI}
                    onChange={(e) => setVoicePrefs({ ...voicePrefs, voiceURI: e.target.value })}
                    className="w-full bg-black/60 border border-white/15 rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    <option value="">Default System Natural Voice</option>
                    {availableVoices
                      .filter((v) => v.lang.startsWith('en'))
                      .map((v) => (
                        <option key={v.voiceURI} value={v.voiceURI}>
                          {v.name} ({v.lang})
                        </option>
                      ))}
                    {availableVoices.filter((v) => !v.lang.startsWith('en')).length > 0 && (
                      <optgroup label="International Voices">
                        {availableVoices
                          .filter((v) => !v.lang.startsWith('en'))
                          .map((v) => (
                            <option key={v.voiceURI} value={v.voiceURI}>
                              {v.name} ({v.lang})
                            </option>
                          ))}
                      </optgroup>
                    )}
                  </select>
                </div>
              )}

              {/* Sliders Grid: Rate, Pitch, Volume */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Rate */}
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-2.5">
                  <div className="flex justify-between items-center text-xs font-medium">
                    <span className="text-neutral-300">Speaking Rate</span>
                    <span
                      className="font-mono px-2 py-0.5 rounded bg-white/10 text-white text-[11px]"
                      style={{ color: accentTheme.primary }}
                    >
                      {voicePrefs.rate}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.75"
                    max="1.5"
                    step="0.05"
                    value={voicePrefs.rate}
                    onChange={(e) =>
                      setVoicePrefs({ ...voicePrefs, rate: parseFloat(e.target.value) })
                    }
                    className="w-full accent-cyan-400 bg-neutral-800 rounded-lg h-2 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-neutral-500 font-mono">
                    <span>0.75x (Relaxed)</span>
                    <span>1.5x (Fast)</span>
                  </div>
                </div>

                {/* Pitch */}
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-2.5">
                  <div className="flex justify-between items-center text-xs font-medium">
                    <span className="text-neutral-300">Voice Pitch</span>
                    <span
                      className="font-mono px-2 py-0.5 rounded bg-white/10 text-white text-[11px]"
                      style={{ color: accentTheme.primary }}
                    >
                      {voicePrefs.pitch}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.8"
                    max="1.3"
                    step="0.05"
                    value={voicePrefs.pitch}
                    onChange={(e) =>
                      setVoicePrefs({ ...voicePrefs, pitch: parseFloat(e.target.value) })
                    }
                    className="w-full accent-cyan-400 bg-neutral-800 rounded-lg h-2 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-neutral-500 font-mono">
                    <span>0.8x (Deep)</span>
                    <span>1.3x (Higher)</span>
                  </div>
                </div>

                {/* Volume */}
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-2.5">
                  <div className="flex justify-between items-center text-xs font-medium">
                    <span className="text-neutral-300">Speech Volume</span>
                    <span
                      className="font-mono px-2 py-0.5 rounded bg-white/10 text-white text-[11px]"
                      style={{ color: accentTheme.primary }}
                    >
                      {Math.round(voicePrefs.volume * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="1.0"
                    step="0.05"
                    value={voicePrefs.volume}
                    onChange={(e) =>
                      setVoicePrefs({ ...voicePrefs, volume: parseFloat(e.target.value) })
                    }
                    className="w-full accent-cyan-400 bg-neutral-800 rounded-lg h-2 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-neutral-500 font-mono">
                    <span>20%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>

            </motion.div>
          )}

          {/* ========================================================================= */}
          {/* 3. INTELLIGENCE ENGINE VIEW PAGE */}
          {/* ========================================================================= */}
          {settingsTab === 'engine' && (
            <motion.div
              key="tab-engine"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6 max-w-4xl"
            >
              {/* Provider & Model Selection Matrix */}
              <ModelSelectorDropdown variant="embedded" />

              {/* Live Intelligence Core & Token Telemetry Dashboard */}
              <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/[0.08] space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Activity className="w-4 h-4 text-cyan-400" />
                      <h3 className="text-sm font-semibold text-white">Agent & LLM Token Telemetry</h3>
                    </div>
                    <p className="text-xs text-neutral-400">
                      Real-time accounting of input prompt tokens, output reasoning completions, and tool executions.
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-mono px-2.5 py-1 rounded-full border border-cyan-500/30 text-cyan-300 bg-cyan-500/10 flex items-center space-x-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                      <span>Live Telemetry Active</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => resetTelemetry()}
                      className="px-2.5 py-1 rounded-xl text-[10px] font-mono text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex items-center space-x-1 cursor-pointer"
                      title="Reset token metrics"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      <span>Reset</span>
                    </button>
                  </div>
                </div>

                {/* Primary 3-Metric Token Counter Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Input Tokens */}
                  <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/20 space-y-1">
                    <div className="text-[11px] font-medium text-cyan-300/80 flex items-center justify-between">
                      <span>Input / Prompt Tokens</span>
                      <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                    </div>
                    <div className="text-2xl font-bold font-mono text-white">
                      {(engineTelemetry?.inputTokens || 0).toLocaleString()}
                    </div>
                    <div className="text-[10px] text-neutral-400">
                      User queries, chat history & tool schemas
                    </div>
                  </div>

                  {/* Output Tokens */}
                  <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/20 space-y-1">
                    <div className="text-[11px] font-medium text-purple-300/80 flex items-center justify-between">
                      <span>Output / Completion Tokens</span>
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    </div>
                    <div className="text-2xl font-bold font-mono text-white">
                      {(engineTelemetry?.outputTokens || 0).toLocaleString()}
                    </div>
                    <div className="text-[10px] text-neutral-400">
                      Hermes thoughts & answers generated
                    </div>
                  </div>

                  {/* Total Tokens */}
                  <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.12] space-y-1">
                    <div className="text-[11px] font-medium text-neutral-300 flex items-center justify-between">
                      <span>Total Consumed</span>
                      <Cpu className="w-3.5 h-3.5 text-neutral-400" />
                    </div>
                    <div
                      className="text-2xl font-bold font-mono text-white"
                      style={{ color: accentTheme.primary }}
                    >
                      {(engineTelemetry?.totalTokens || 0).toLocaleString()}
                    </div>
                    <div className="text-[10px] text-neutral-400">
                      Across all conversation threads
                    </div>
                  </div>
                </div>

                {/* Token Distribution Bar */}
                {(engineTelemetry?.totalTokens || 0) > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-[10px] font-mono text-neutral-400">
                      <span className="text-cyan-300">
                        Input: {Math.round(((engineTelemetry?.inputTokens || 0) / (engineTelemetry?.totalTokens || 1)) * 100)}%
                      </span>
                      <span className="text-purple-300">
                        Output: {Math.round(((engineTelemetry?.outputTokens || 0) / (engineTelemetry?.totalTokens || 1)) * 100)}%
                      </span>
                    </div>
                    <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden flex">
                      <div
                        className="bg-cyan-400 transition-all duration-500"
                        style={{
                          width: `${Math.max(5, Math.round(((engineTelemetry?.inputTokens || 0) / (engineTelemetry?.totalTokens || 1)) * 100))}%`,
                        }}
                      />
                      <div
                        className="bg-purple-400 transition-all duration-500"
                        style={{
                          width: `${Math.max(5, Math.round(((engineTelemetry?.outputTokens || 0) / (engineTelemetry?.totalTokens || 1)) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Performance & Execution Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/[0.06]">
                  <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                    <div className="text-[10px] text-neutral-400">Requests Processed</div>
                    <div className="text-sm font-semibold font-mono text-white">
                      {engineTelemetry?.requestCount || 0}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                    <div className="text-[10px] text-neutral-400">Tools Executed</div>
                    <div className="text-sm font-semibold font-mono text-white">
                      {engineTelemetry?.toolInvocationsCount || 0} calls
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                    <div className="text-[10px] text-neutral-400">Avg Latency</div>
                    <div className="text-sm font-semibold font-mono text-white">
                      {engineTelemetry?.requestCount
                        ? Math.round(engineTelemetry.totalLatencyMs / engineTelemetry.requestCount)
                        : 0}{' '}
                      ms
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                    <div className="text-[10px] text-neutral-400">Last Query</div>
                    <div className="text-sm font-semibold font-mono text-emerald-400 truncate">
                      {engineTelemetry?.lastRequestTokens
                        ? `+${engineTelemetry.lastRequestTokens.total} tok (${engineTelemetry.lastRequestTokens.durationMs}ms)`
                        : 'Ready'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Voice & Speech Models Telemetry Dashboard */}
              <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/[0.08] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Mic className="w-4 h-4 text-emerald-400" />
                      <h3 className="text-sm font-semibold text-white">Voice & Speech Models Telemetry</h3>
                    </div>
                    <p className="text-xs text-neutral-400">
                      Real-time usage metrics for Deepgram Aura TTS neural synthesis and Web Speech recognition.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* TTS Characters */}
                  <div className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 space-y-1">
                    <div className="text-[10px] text-emerald-300/80 font-medium">TTS Characters Spoken</div>
                    <div className="text-lg font-bold font-mono text-white">
                      {(voiceTelemetry?.ttsCharactersSynthesized || 0).toLocaleString()}
                    </div>
                    <div className="text-[9px] text-neutral-400">Neural vocalizations</div>
                  </div>

                  {/* TTS Audio Duration */}
                  <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-1">
                    <div className="text-[10px] text-neutral-300 font-medium">Audio Time Generated</div>
                    <div className="text-lg font-bold font-mono text-white">
                      {voiceTelemetry?.ttsAudioSecondsGenerated || 0}s
                    </div>
                    <div className="text-[9px] text-neutral-400">
                      ~{Math.round(((voiceTelemetry?.ttsAudioSecondsGenerated || 0) / 60) * 10) / 10} minutes
                    </div>
                  </div>

                  {/* STT Words Spoken */}
                  <div className="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-500/20 space-y-1">
                    <div className="text-[10px] text-amber-300/80 font-medium">User Words Transcribed</div>
                    <div className="text-lg font-bold font-mono text-white">
                      {(voiceTelemetry?.sttSpokenWords || 0).toLocaleString()}
                    </div>
                    <div className="text-[9px] text-neutral-400">Microphone speech input</div>
                  </div>

                  {/* Voice Syntheses Count */}
                  <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-1">
                    <div className="text-[10px] text-neutral-300 font-medium">Speech Sessions</div>
                    <div className="text-lg font-bold font-mono text-white">
                      {voiceTelemetry?.ttsSynthesisCount || 0} calls
                    </div>
                    <div className="text-[9px] text-neutral-400">Duplex voice responses</div>
                  </div>
                </div>
              </div>

              {/* Persona / Behavioral Presets */}
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-white">Persona & Response Mode</h3>
                  <p className="text-xs text-neutral-400">
                    Select how Fox structures answers, tone, and technical depth.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    {
                      id: 'adaptive',
                      title: 'Adaptive Conversational',
                      desc: 'Natural, intelligent, and context-sensitive assistant.',
                      badge: 'Default',
                    },
                    {
                      id: 'executive',
                      title: 'Executive Briefing',
                      desc: 'Crisp bullet points, high-impact decisions, zero filler.',
                      badge: 'Concise',
                    },
                    {
                      id: 'technical',
                      title: 'Code & Technical Architect',
                      desc: 'Strict code blocks, architectural patterns, and debugging.',
                      badge: 'Deep Tech',
                    },
                    {
                      id: 'creative',
                      title: 'Creative & Brainstorming',
                      desc: 'Expansive idea generation and articulate storytelling.',
                      badge: 'Exploratory',
                    },
                  ].map((preset) => {
                    const isSelected = enginePrefs.personaMode === preset.id;
                    return (
                      <div
                        key={preset.id}
                        onClick={() =>
                          handleUpdateEngine({
                            personaMode: preset.id as EnginePreferences['personaMode'],
                          })
                        }
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-2 text-left ${
                          isSelected
                            ? 'bg-white/[0.12] border-white/40 shadow-md'
                            : 'bg-white/[0.03] hover:bg-white/[0.07] border-white/[0.08]'
                        }`}
                        style={
                          isSelected
                            ? {
                                borderColor: accentTheme.primary,
                                boxShadow: `0 0 16px ${accentTheme.glow}`,
                              }
                            : undefined
                        }
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-white">{preset.title}</span>
                          <span
                            className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: isSelected ? `${accentTheme.primary}25` : 'rgba(255,255,255,0.05)',
                              color: isSelected ? accentTheme.primary : '#a3a3a3',
                            }}
                          >
                            {preset.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-400 leading-relaxed">{preset.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Temperature & Latency Sliders */}
              <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/[0.08] space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Creativity & Temperature</h3>
                    <p className="text-xs text-neutral-400">
                      Higher values increase idea variability; lower values ensure deterministic precision.
                    </p>
                  </div>
                  <span
                    className="font-mono text-xs px-2.5 py-1 rounded-lg bg-white/10 text-white"
                    style={{ color: accentTheme.primary }}
                  >
                    {enginePrefs.temperature}
                  </span>
                </div>

                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={enginePrefs.temperature}
                  onChange={(e) =>
                    handleUpdateEngine({ temperature: parseFloat(e.target.value) })
                  }
                  className="w-full accent-cyan-400 bg-neutral-800 rounded-lg h-2 cursor-pointer"
                />

                <div className="flex justify-between text-[11px] text-neutral-500 font-mono">
                  <span>0.1 (Strict & Precise)</span>
                  <span>0.7 (Balanced)</span>
                  <span>1.0 (Creative)</span>
                </div>
              </div>

              {/* Custom System Directives */}
              <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/[0.08] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Custom System Directives</h3>
                    <p className="text-xs text-neutral-400">
                      Persistent instructions embedded into every prompt context.
                    </p>
                  </div>
                </div>

                <textarea
                  rows={3}
                  value={enginePrefs.systemPrompt}
                  onChange={(e) => handleUpdateEngine({ systemPrompt: e.target.value })}
                  placeholder="e.g. Always respond in markdown format and provide concise action steps."
                  className="w-full bg-black/60 border border-white/15 rounded-2xl p-3 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-cyan-400 leading-relaxed font-mono"
                />
              </div>
            </motion.div>
          )}

          {/* ========================================================================= */}
          {/* 4. DATA & STORAGE VIEW PAGE */}
          {/* ========================================================================= */}
          {settingsTab === 'data' && (
            <motion.div
              key="tab-data"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6 max-w-4xl"
            >
              {/* Storage Overview Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-1">
                  <span className="text-[10px] font-mono text-neutral-400 uppercase">Conversations</span>
                  <div className="text-xl font-bold text-white">{sessions.length}</div>
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-1">
                  <span className="text-[10px] font-mono text-neutral-400 uppercase">Captured Notes</span>
                  <div className="text-xl font-bold text-white">{notes.length}</div>
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-1">
                  <span className="text-[10px] font-mono text-neutral-400 uppercase">Reminders</span>
                  <div className="text-xl font-bold text-white">{reminders.length}</div>
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-1">
                  <span className="text-[10px] font-mono text-neutral-400 uppercase">Persistence</span>
                  <div className="text-xs font-semibold text-emerald-400 pt-1">Active LocalSync</div>
                </div>
              </div>

              {/* Export Data */}
              <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-white">Export Conversation Archives</h3>
                  <p className="text-xs text-neutral-400">
                    Download complete chat sessions, captured notes, and reminders as structured JSON.
                  </p>
                </div>

                <button
                  onClick={handleExportData}
                  className="px-4 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/15 border border-white/15 text-white text-xs font-medium transition-all flex items-center space-x-2 cursor-pointer shrink-0"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Exported!</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Export All Data</span>
                    </>
                  )}
                </button>
              </div>

              {/* Danger Zone: Clear History */}
              <div className="p-5 rounded-3xl bg-rose-500/[0.04] border border-rose-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-rose-400">Clear Conversation History</h3>
                    <p className="text-xs text-neutral-400">
                      Reset all current conversation threads and start fresh.
                    </p>
                  </div>

                  {!showClearConfirm ? (
                    <button
                      onClick={() => setShowClearConfirm(true)}
                      className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-medium transition-all cursor-pointer"
                    >
                      Clear History
                    </button>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          clearChat();
                          setShowClearConfirm(false);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-all cursor-pointer"
                      >
                        Confirm Delete
                      </button>
                      <button
                        onClick={() => setShowClearConfirm(false)}
                        className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-neutral-300 text-xs font-medium cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
