import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useVoiceAssistant } from '../hooks/useVoiceAssistant';
import { ACCENT_THEMES } from '../utils/formatters';
import { HeaderQuickOptionId } from '../types';
import { SoundFXService } from '../utils/audio';
import {
  SlidersHorizontal,
  Volume2,
  VolumeX,
  Palette,
  Settings,
  Mic,
  LayoutGrid,
  Moon,
  Sun,
  Sparkles,
  Play,
  Square,
  X,
  Check,
  Zap,
  Clock,
  Calendar as CalendarIcon,
  FileText,
  StickyNote,
  Sliders,
  ChevronRight,
  ChevronDown,
  Shield,
  Radio,
  RotateCcw,
  Bell,
  CheckCircle2,
  Cpu,
} from 'lucide-react';
import { ModelSelectorDropdown } from './ModelSelectorDropdown';
import { getModelById } from '../utils/aiModels';

export const ALL_QUICK_OPTIONS: {
  id: HeaderQuickOptionId;
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    id: 'time_display',
    label: 'Live Clock & Time',
    shortLabel: 'Time Component',
    description: 'Real-time clock display with live minutes & seconds',
    icon: Clock,
  },
  {
    id: 'color_theme',
    label: 'Theme & Accent Palette',
    shortLabel: 'Color Theme',
    description: 'Quick color spectrum orb & preset switcher',
    icon: Palette,
  },
  {
    id: 'sound_toggle',
    label: 'Audio & Voice Output',
    shortLabel: 'Sound Toggle',
    description: 'Instant auto-speech voice mute toggle',
    icon: Volume2,
  },
  {
    id: 'voice_mic',
    label: 'Voice Assistant Mic',
    shortLabel: 'Voice Mic',
    description: 'Toggle speech recognition instantly',
    icon: Mic,
  },
  {
    id: 'settings_view',
    label: 'System Settings View',
    shortLabel: 'Settings',
    description: 'Direct link to full system preferences',
    icon: Settings,
  },
];

interface QuickAccessPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickAccessPanel: React.FC<QuickAccessPanelProps> = ({ isOpen, onClose }) => {
  const {
    accentTheme,
    setAccentTheme,
    voicePrefs,
    setVoicePrefs,
    deviceSettings,
    updateDeviceSetting,
    status,
    cancelSpeaking,
    openSettingsTab,
    openToolPanel,
    enginePrefs,
    availableVoices,
    hasDeepgramKey,
    headerQuickOptions,
    setHeaderQuickOptions,
  } = useVoiceAssistant();

  const [isPlayingTest, setIsPlayingTest] = useState(false);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [editingHeaderSlot, setEditingHeaderSlot] = useState<number | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<{ message: string; icon: string } | null>(null);

  const activeModelMeta = getModelById(enginePrefs.model);

  const showFeedback = (message: string, icon: string = 'check') => {
    setFeedbackToast({ message, icon });
    setTimeout(() => {
      setFeedbackToast((current) => (current?.message === message ? null : current));
    }, 2400);
  };

  // Toggle 1: Audio Output / Auto Speech Handler
  const handleToggleAudio = () => {
    const nextVal = !voicePrefs.autoSpeak;
    setVoicePrefs({ ...voicePrefs, autoSpeak: nextVal });
    if (deviceSettings.soundEffects) {
      SoundFXService.getInstance().playChime(nextVal ? 'toggle_on' : 'toggle_off');
    }
    if (!nextVal) {
      cancelSpeaking();
      showFeedback('Voice Speech Muted (Auto-speak Off)', 'muted');
    } else {
      showFeedback(`Voice Speech Enabled (${Math.round(voicePrefs.volume * 100)}% Volume)`, 'audio');
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance('Voice output active');
        u.rate = voicePrefs.rate;
        u.volume = Math.max(0.4, voicePrefs.volume);
        window.speechSynthesis.speak(u);
      }
    }
  };

  // Toggle 2: Focus Mode (Do Not Disturb) Handler
  const handleToggleFocus = () => {
    const nextVal = !deviceSettings.focusMode;
    updateDeviceSetting('focusMode', nextVal);
    if (deviceSettings.soundEffects || nextVal) {
      SoundFXService.getInstance().playChime(nextVal ? 'focus' : 'toggle_off');
    }
    showFeedback(
      nextVal ? 'Focus Mode Active: Minimal UI & DND' : 'Focus Mode Disabled: Standard UI',
      'focus'
    );
  };

  // Toggle 3: Ambient 3D Glow Handler
  const handleToggleAmbientGlow = () => {
    const nextVal = !deviceSettings.ambientGlow;
    updateDeviceSetting('ambientGlow', nextVal);
    if (deviceSettings.soundEffects) {
      SoundFXService.getInstance().playChime(nextVal ? 'ambient' : 'toggle_off');
    }
    showFeedback(
      nextVal ? '3D Atmospheric Glow Active' : 'Minimal Deep Black Canvas Active',
      'ambient'
    );
  };

  // Toggle 4: Sound FX Handler
  const handleToggleSoundFX = () => {
    const nextVal = !deviceSettings.soundEffects;
    updateDeviceSetting('soundEffects', nextVal);
    if (nextVal) {
      SoundFXService.getInstance().playChime('toggle_on');
      showFeedback('UI Sound FX & Chimes Activated', 'sound');
    } else {
      SoundFXService.getInstance().playChime('toggle_off');
      showFeedback('UI Sound FX Muted (Silent Mode)', 'sound');
    }
  };

  // Quick Test Voice
  const handleTestSpeech = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (isPlayingTest) {
      window.speechSynthesis.cancel();
      setIsPlayingTest(false);
      return;
    }
    window.speechSynthesis.cancel();
    const testPhrase = `Fox Intelligence Core online. Audio output set to ${Math.round(
      voicePrefs.volume * 100
    )} percent.`;
    const utterance = new SpeechSynthesisUtterance(testPhrase);
    utterance.rate = voicePrefs.rate;
    utterance.volume = voicePrefs.volume;
    if (voicePrefs.voiceURI && availableVoices.length > 0) {
      const v = availableVoices.find((x) => x.voiceURI === voicePrefs.voiceURI);
      if (v) utterance.voice = v;
    }
    setIsPlayingTest(true);
    utterance.onend = () => setIsPlayingTest(false);
    utterance.onerror = () => setIsPlayingTest(false);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />

          {/* Control Center Popover */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="fixed top-16 right-3 sm:right-6 z-50 w-[calc(100vw-24px)] sm:w-[380px] max-h-[85vh] overflow-y-auto no-scrollbar rounded-3xl bg-[#121316]/95 border border-white/15 p-4 shadow-2xl shadow-black/80 backdrop-blur-2xl text-white select-none"
            style={{
              boxShadow: `0 20px 50px -10px rgba(0, 0, 0, 0.8), 0 0 30px -10px ${accentTheme.glow}`,
            }}
          >
            {/* Top Bar Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center space-x-2">
                <div
                  className="w-7 h-7 rounded-xl flex items-center justify-center text-white shadow-sm"
                  style={{
                    background: `linear-gradient(135deg, ${accentTheme.primary}, ${accentTheme.secondary})`,
                  }}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight leading-none">
                    Control Center
                  </h3>
                  <p className="text-[10px] text-neutral-400 font-mono mt-0.5">
                    Live System Controls & Engine
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Close Control Center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Live Feedback Toast Alert */}
            <AnimatePresence>
              {feedbackToast && (
                <motion.div
                  initial={{ opacity: 0, y: -6, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -6, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="mt-2.5 px-3 py-1.5 rounded-xl bg-white/15 border border-white/25 text-white flex items-center justify-between text-xs font-semibold backdrop-blur-md shadow-lg"
                >
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-[11px] font-medium tracking-tight text-neutral-100">
                      {feedbackToast.message}
                    </span>
                  </div>
                  <span className="text-[9px] font-mono uppercase text-emerald-300 font-bold">
                    Applied
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-3.5 space-y-3.5">
                {/* 1. Status & Interactive Model / Provider Dropdown Card */}
                <div className="space-y-2">
                  <div
                    className={`rounded-2xl border transition-all p-3 relative overflow-hidden group ${
                      isModelDropdownOpen
                        ? 'bg-white/[0.08] border-white/25 shadow-lg'
                        : 'bg-white/[0.04] hover:bg-white/[0.07] border-white/[0.08]'
                    }`}
                  >
                    <div
                      className="absolute -right-8 -top-8 w-24 h-24 rounded-full blur-2xl pointer-events-none opacity-20"
                      style={{ backgroundColor: activeModelMeta.iconColor || accentTheme.primary }}
                    />
                    <div className="flex items-center justify-between">
                      {/* Clickable Model Info & Dropdown Trigger */}
                      <button
                        onClick={() => setIsModelDropdownOpen((prev) => !prev)}
                        className="flex items-center space-x-2.5 min-w-0 flex-1 text-left cursor-pointer group/btn"
                        title="Click to select AI provider & model"
                      >
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-inner transition-transform group-hover/btn:scale-105"
                          style={{
                            background: `linear-gradient(135deg, ${activeModelMeta.iconColor}40, ${accentTheme.primary}30)`,
                            border: `1px solid ${activeModelMeta.iconColor}60`,
                          }}
                        >
                          <Zap
                            className="w-4 h-4"
                            style={{ color: activeModelMeta.iconColor || accentTheme.primary }}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-1.5">
                            <span className="text-xs font-bold text-white truncate group-hover/btn:text-white">
                              {enginePrefs.model}
                            </span>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                            <ChevronDown
                              className={`w-3.5 h-3.5 text-neutral-400 group-hover/btn:text-white transition-transform duration-200 shrink-0 ${
                                isModelDropdownOpen ? 'rotate-180 text-white' : ''
                              }`}
                            />
                          </div>
                          <div className="flex items-center space-x-1.5 mt-0.5">
                            <span
                              className="text-[9px] font-mono px-1.5 py-0.2 rounded border truncate"
                              style={{
                                backgroundColor: `${activeModelMeta.iconColor}15`,
                                color: activeModelMeta.iconColor,
                                borderColor: `${activeModelMeta.iconColor}30`,
                              }}
                            >
                              {activeModelMeta.providerName}
                            </span>
                            <p className="text-[10px] text-neutral-400 truncate">
                              {status === 'speaking'
                                ? 'Speaking response...'
                                : status === 'listening'
                                ? 'Listening for speech...'
                                : status === 'thinking'
                                ? 'Processing inference...'
                                : activeModelMeta.badge || 'Ready & standby'}
                            </p>
                          </div>
                        </div>
                      </button>

                      {/* Audio Test / Stop Action */}
                      <div className="flex items-center space-x-1 shrink-0 ml-2">
                        {status === 'speaking' ? (
                          <button
                            onClick={cancelSpeaking}
                            className="px-2 py-1 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[10px] font-bold flex items-center space-x-1 border border-rose-500/30 transition-all cursor-pointer"
                          >
                            <Square className="w-2.5 h-2.5 fill-current" />
                            <span>Stop</span>
                          </button>
                        ) : (
                          <button
                            onClick={handleTestSpeech}
                            className={`p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
                              isPlayingTest
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-white/[0.08] hover:bg-white/15 text-white border border-white/10'
                            }`}
                            title={isPlayingTest ? 'Stop audio test' : 'Preview voice synthesizer'}
                          >
                            {isPlayingTest ? (
                              <Square className="w-3.5 h-3.5 fill-current text-amber-400" />
                            ) : (
                              <Play className="w-3.5 h-3.5 fill-current text-neutral-300" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Dropdown Container */}
                  <AnimatePresence>
                    {isModelDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, y: -10 }}
                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -10 }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                        className="overflow-hidden"
                      >
                        <ModelSelectorDropdown
                          variant="embedded"
                          onClose={() => setIsModelDropdownOpen(false)}
                          onModelSelected={(model) => {
                            showFeedback(`Switched to ${model.name} (${model.providerName})`, 'engine');
                          }}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* 2. Quick Toggle Matrix (Frosted Glass macOS Buttons) */}
                <div className="grid grid-cols-3 gap-2">
                  {/* Toggle 1: Sound Output */}
                  <button
                    id="quick-toggle-sound"
                    onClick={handleToggleAudio}
                    className={`p-2.5 rounded-2xl flex flex-col items-center justify-center space-y-1.5 transition-all text-center cursor-pointer border ${
                      voicePrefs.autoSpeak
                        ? 'bg-white/[0.09] border-white/15 hover:bg-white/[0.14] text-white'
                        : 'bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/15 text-neutral-300'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-transform active:scale-95 ${
                        voicePrefs.autoSpeak
                          ? 'bg-white/15 text-white shadow-sm'
                          : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {voicePrefs.autoSpeak ? (
                        <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                      )}
                    </div>
                    <div className="min-w-0 w-full">
                      <div className="text-[10px] font-bold text-white truncate">
                        {voicePrefs.autoSpeak ? 'Audio On' : 'Muted'}
                      </div>
                      <div className="text-[8.5px] text-neutral-400 truncate">
                        {voicePrefs.autoSpeak
                          ? `${Math.round(voicePrefs.volume * 100)}% Vol`
                          : 'Off'}
                      </div>
                    </div>
                  </button>

                  {/* Toggle 2: Ambient Core Glow */}
                  <button
                    id="quick-toggle-ambient"
                    onClick={handleToggleAmbientGlow}
                    className={`p-2.5 rounded-2xl flex flex-col items-center justify-center space-y-1.5 transition-all text-center cursor-pointer border ${
                      deviceSettings.ambientGlow
                        ? 'bg-amber-500/15 border-amber-500/30 hover:bg-amber-500/20 text-white shadow-sm'
                        : 'bg-white/[0.03] border-white/[0.06] text-neutral-400'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-transform active:scale-95 ${
                        deviceSettings.ambientGlow
                          ? 'bg-amber-400/25 text-amber-300 shadow-sm'
                          : 'bg-white/5 text-neutral-500'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 w-full">
                      <div className="text-[10px] font-bold text-white truncate">
                        Aura Glow
                      </div>
                      <div className="text-[8.5px] text-neutral-400 truncate">
                        {deviceSettings.ambientGlow ? '3D Active' : 'Off'}
                      </div>
                    </div>
                  </button>

                  {/* Toggle 3: Sound Effects & Haptics */}
                  <button
                    id="quick-toggle-soundfx"
                    onClick={handleToggleSoundFX}
                    className={`p-2.5 rounded-2xl flex flex-col items-center justify-center space-y-1.5 transition-all text-center cursor-pointer border ${
                      deviceSettings.soundEffects
                        ? 'bg-cyan-500/15 border-cyan-500/30 hover:bg-cyan-500/20 text-white shadow-sm'
                        : 'bg-white/[0.03] border-white/[0.06] text-neutral-400'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-transform active:scale-95 ${
                        deviceSettings.soundEffects
                          ? 'bg-cyan-400/25 text-cyan-300 shadow-sm'
                          : 'bg-white/5 text-neutral-500'
                      }`}
                    >
                      <Radio className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 w-full">
                      <div className="text-[10px] font-bold text-white truncate">
                        Sound FX
                      </div>
                      <div className="text-[8.5px] text-neutral-400 truncate">
                        {deviceSettings.soundEffects ? 'Active' : 'Muted'}
                      </div>
                    </div>
                  </button>
                </div>

                {/* 3. Interactive Apple-Style Horizontal Sliders */}
                <div className="space-y-2.5 bg-white/[0.03] border border-white/[0.08] p-3 rounded-2xl">
                  {/* Volume Slider */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-neutral-300 font-medium flex items-center space-x-1.5">
                        <Volume2 className="w-3.5 h-3.5 text-neutral-400" />
                        <span>Voice Volume</span>
                      </span>
                      <span className="font-mono text-white font-bold">
                        {Math.round(voicePrefs.volume * 100)}%
                      </span>
                    </div>
                    <div className="relative flex items-center">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={voicePrefs.volume}
                        onChange={(e) => {
                          const newVol = parseFloat(e.target.value);
                          setVoicePrefs({
                            ...voicePrefs,
                            volume: newVol,
                            autoSpeak: newVol > 0 ? voicePrefs.autoSpeak : false,
                          });
                          if (deviceSettings.soundEffects) {
                            SoundFXService.getInstance().playChime('volume');
                          }
                        }}
                        className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white"
                      />
                    </div>
                  </div>

                  {/* Speech Rate Slider */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-neutral-300 font-medium flex items-center space-x-1.5">
                        <Clock className="w-3.5 h-3.5 text-neutral-400" />
                        <span>Speech Speed</span>
                      </span>
                      <span className="font-mono text-white font-bold">
                        {voicePrefs.rate.toFixed(2)}x
                      </span>
                    </div>
                    <div className="relative flex items-center">
                      <input
                        type="range"
                        min="0.5"
                        max="2.0"
                        step="0.05"
                        value={voicePrefs.rate}
                        onChange={(e) => {
                          const newRate = parseFloat(e.target.value);
                          setVoicePrefs({ ...voicePrefs, rate: newRate });
                        }}
                        className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white"
                      />
                    </div>
                  </div>
                </div>

                {/* 3b. TTS Engine Toggle: Deepgram Aura vs Hermes (Edge / Piper) TTS */}
                <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-white flex items-center space-x-1.5">
                      <Mic className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Voice Engine</span>
                    </span>
                    {!hasDeepgramKey && (
                      <span className="text-[9px] text-amber-400/80">No Deepgram key</span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setVoicePrefs({ ...voicePrefs, provider: 'deepgram' })}
                      disabled={!hasDeepgramKey}
                      className={`px-2 py-2 rounded-xl text-[10px] font-bold transition-all border cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${
                        voicePrefs.provider === 'deepgram' || (voicePrefs.provider === 'auto' && hasDeepgramKey)
                          ? 'bg-cyan-500/20 border-cyan-500/40 text-white shadow-sm'
                          : 'bg-white/[0.03] border-white/[0.06] text-neutral-400 hover:text-white'
                      }`}
                    >
                      Deepgram
                    </button>
                    <button
                      onClick={() => setVoicePrefs({ ...voicePrefs, provider: 'hermes-edge' })}
                      className={`px-2 py-2 rounded-xl text-[10px] font-bold transition-all border cursor-pointer ${
                        voicePrefs.provider === 'hermes-edge'
                          ? 'bg-cyan-500/20 border-cyan-500/40 text-white shadow-sm'
                          : 'bg-white/[0.03] border-white/[0.06] text-neutral-400 hover:text-white'
                      }`}
                    >
                      Edge TTS
                    </button>
                    <button
                      onClick={() => setVoicePrefs({ ...voicePrefs, provider: 'hermes-piper' })}
                      className={`px-2 py-2 rounded-xl text-[10px] font-bold transition-all border cursor-pointer ${
                        voicePrefs.provider === 'hermes-piper'
                          ? 'bg-cyan-500/20 border-cyan-500/40 text-white shadow-sm'
                          : 'bg-white/[0.03] border-white/[0.06] text-neutral-400 hover:text-white'
                      }`}
                    >
                      Piper TTS
                    </button>
                  </div>
                </div>

                {/* 4. Fast Theme Palette Swatches (Apple Color Circles) */}
                <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-white flex items-center space-x-1.5">
                      <Palette className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Theme Accent</span>
                    </span>
                    <span className="text-[10px] text-neutral-400">{accentTheme.name}</span>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {ACCENT_THEMES.map((theme) => {
                      const isSelected = accentTheme.id === theme.id;
                      return (
                        <button
                          key={theme.id}
                          onClick={() => {
                            setAccentTheme(theme);
                            if (deviceSettings.soundEffects) {
                              SoundFXService.getInstance().playChime('click');
                            }
                            showFeedback(`Applied Theme: ${theme.name}`, 'theme');
                          }}
                          className={`group flex flex-col items-center p-1.5 rounded-xl transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-white/15 ring-2 ring-white/60 shadow-md'
                              : 'hover:bg-white/5'
                          }`}
                          title={theme.name}
                        >
                          <span
                            className="w-6 h-6 rounded-full shadow-inner ring-1 ring-white/20 transition-transform group-hover:scale-110 flex items-center justify-center"
                            style={{
                              background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
                            }}
                          >
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </span>
                          <span className="text-[9px] text-neutral-300 mt-1 truncate max-w-full font-medium">
                            {theme.name.split(' ')[0]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 5. Header Shortcuts (Top 3 Icons Configuration) */}
                <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="text-[11px] font-bold text-white">Header Top 3 Icons</span>
                    </div>
                    <button
                      onClick={() => {
                        onClose();
                        openSettingsTab('theme');
                      }}
                      className="text-[10px] text-cyan-400 hover:text-cyan-300 underline font-medium cursor-pointer"
                    >
                      Settings View →
                    </button>
                  </div>

                  {/* 3 Active Slot Buttons */}
                  <div className="grid grid-cols-3 gap-2">
                    {headerQuickOptions.slice(0, 3).map((optId, idx) => {
                      const optDef = ALL_QUICK_OPTIONS.find((o) => o.id === optId) || ALL_QUICK_OPTIONS[0];
                      const Icon = optDef.icon;
                      const isEditing = editingHeaderSlot === idx;

                      return (
                        <button
                          key={`slot-${idx}`}
                          type="button"
                          onClick={() => {
                            if (deviceSettings.soundEffects) {
                              SoundFXService.getInstance().playChime('click');
                            }
                            setEditingHeaderSlot(isEditing ? null : idx);
                          }}
                          className={`p-2 rounded-xl border flex flex-col items-center justify-center space-y-1 transition-all cursor-pointer text-center relative ${
                            isEditing
                              ? 'bg-white/20 border-white/50 ring-2 ring-cyan-400/40 shadow-sm'
                              : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.08]'
                          }`}
                          title={`Slot #${idx + 1}: ${optDef.label} (Click to change)`}
                        >
                          <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-cyan-300">
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-[9px] font-semibold text-white truncate max-w-full">
                            {optDef.shortLabel}
                          </span>
                          <span className="text-[8px] font-mono text-neutral-400">
                            Slot #{idx + 1}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Tray for choosing new icon if editing a slot */}
                  <AnimatePresence>
                    {editingHeaderSlot !== null && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="p-2 rounded-xl bg-black/40 border border-white/10 space-y-1.5 overflow-hidden"
                      >
                        <div className="flex items-center justify-between text-[10px] text-neutral-300 pb-1 border-b border-white/10">
                          <span className="font-semibold text-cyan-300">
                            Select icon for Slot #{editingHeaderSlot + 1}:
                          </span>
                          <button
                            onClick={() => setEditingHeaderSlot(null)}
                            className="text-neutral-400 hover:text-white"
                          >
                            ✕
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-0.5">
                          {ALL_QUICK_OPTIONS.map((option) => {
                            const Icon = option.icon;
                            const isCurrent = headerQuickOptions[editingHeaderSlot] === option.id;

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
                                  showFeedback(`Slot #${editingHeaderSlot + 1} set to ${option.shortLabel}`, 'check');
                                  setEditingHeaderSlot(null);
                                }}
                                className={`p-1.5 rounded-lg text-left text-xs flex items-center space-x-2 transition-all cursor-pointer ${
                                  isCurrent
                                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                                    : 'bg-white/[0.03] hover:bg-white/10 text-neutral-300'
                                }`}
                              >
                                <Icon className="w-3.5 h-3.5 shrink-0" />
                                <span className="text-[10px] truncate">{option.shortLabel}</span>
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* 6. Quick Tools Fast-Launcher (Notes, Sticky Notes, Calendar, Events) */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'notes', label: 'Notes', icon: FileText, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                    { id: 'sticky_notes', label: 'Sticky', icon: StickyNote, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                    { id: 'calendar', label: 'Calendar', icon: CalendarIcon, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                    { id: 'events', label: 'Events', icon: Clock, color: 'text-purple-400', bg: 'bg-purple-500/10' },
                  ].map((tool) => {
                    const ToolIcon = tool.icon;
                    return (
                      <button
                        key={tool.id}
                        onClick={() => {
                          onClose();
                          openToolPanel(tool.id as any);
                        }}
                        className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] flex flex-col items-center justify-center space-y-1 transition-all cursor-pointer group"
                      >
                        <div className={`p-1.5 rounded-xl ${tool.bg} ${tool.color} group-hover:scale-110 transition-transform`}>
                          <ToolIcon className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-medium text-neutral-300 truncate">
                          {tool.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Bottom Bar: Full Settings Link */}
                <div className="pt-2 border-t border-white/[0.08] flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (deviceSettings.soundEffects) {
                        SoundFXService.getInstance().playChime('click');
                      }
                      onClose();
                      openSettingsTab('theme');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/15 text-white text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer border border-white/10 shadow-sm"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>All Settings →</span>
                  </button>
                </div>
              </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
