import React, { useState, useEffect } from 'react';
import { useVoiceAssistant } from '../hooks/useVoiceAssistant';
import { ACCENT_THEMES } from '../utils/formatters';
import { ModeSwitcher } from './ModeSwitcher';
import { QuickAccessPanel } from './QuickAccessPanel';
import { SoundFXService } from '../utils/audio';
import {
  Volume2,
  VolumeX,
  Palette,
  Check,
  Settings,
  FileText,
  StickyNote,
  Calendar as CalendarIcon,
  Clock,
  X,
  SlidersHorizontal,
  Mic,
} from 'lucide-react';
import { ActiveToolType, HeaderQuickOptionId } from '../types';

interface HeaderProps {
  onOpenSettings?: () => void;
}

const TOOL_CONFIG: Record<
  ActiveToolType,
  { label: string; subtitle: string; icon: React.ElementType; color: string }
> = {
  notes: {
    label: 'Rich Notes Manager',
    subtitle: 'Organize notes & transcripts',
    icon: FileText,
    color: 'text-blue-400',
  },
  sticky_notes: {
    label: 'Sticky Notes Board',
    subtitle: 'Quick visual memo cards',
    icon: StickyNote,
    color: 'text-amber-400',
  },
  calendar: {
    label: 'Interactive Calendar',
    subtitle: 'Month schedule & planner',
    icon: CalendarIcon,
    color: 'text-emerald-400',
  },
  events: {
    label: 'Events & Schedule Timeline',
    subtitle: 'Deadlines & reminders',
    icon: Clock,
    color: 'text-purple-400',
  },
};

export const Header: React.FC<HeaderProps> = () => {
  const {
    accentTheme,
    setAccentTheme,
    voicePrefs,
    setVoicePrefs,
    sessions,
    activeSessionId,
    openSettingsTab,
    appMode,
    setAppMode,
    activeTool,
    setActiveSidebarTab,
    headerQuickOptions,
    isQuickAccessOpen,
    setIsQuickAccessOpen,
    toggleQuickAccess,
    deviceSettings,
    updateDeviceSetting,
    isListening,
    toggleListening,
    openToolPanel,
    cancelSpeaking,
  } = useVoiceAssistant();

  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [showThemePicker, setShowThemePicker] = useState(false);

  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const currentToolInfo = TOOL_CONFIG[activeTool] || TOOL_CONFIG.notes;
  const ToolIcon = currentToolInfo.icon;

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
      setCurrentDate(
        now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  // Dynamic Renderer for each configured Top 3 Header option
  const renderQuickOptionButton = (optionId: HeaderQuickOptionId, index: number) => {
    switch (optionId) {
      case 'time_display':
        return (
          <div
            key={`opt-${optionId}-${index}`}
            className="flex items-center space-x-2 px-2.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-neutral-300 shadow-sm"
            title={`${currentDate || 'Today'} - Live System Time`}
          >
            <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="text-xs font-mono font-medium text-white tracking-wide">
              {currentTime || '10:41 AM'}
            </span>
          </div>
        );

      case 'color_theme':
        return (
          <div key={`opt-${optionId}-${index}`} className="relative">
            <button
              onClick={() => setShowThemePicker(!showThemePicker)}
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors flex items-center space-x-1.5 text-xs cursor-pointer group"
              title="Theme Palette"
              aria-label="Color theme"
            >
              <span
                className="w-3.5 h-3.5 rounded-full ring-2 ring-white/20 shadow-sm inline-block group-hover:scale-110 transition-transform"
                style={{
                  background: `linear-gradient(135deg, ${accentTheme.primary}, ${accentTheme.secondary})`,
                }}
              />
              <Palette className="w-3.5 h-3.5 hidden sm:inline text-neutral-400 group-hover:text-white" />
            </button>

            {showThemePicker && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowThemePicker(false)}
                />
                <div className="absolute right-0 mt-2 w-56 rounded-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150 border border-white/20 shadow-2xl bg-black/90 backdrop-blur-xl">
                  <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-white/10 mb-1">
                    <span
                      className="text-[10px] uppercase font-bold tracking-[0.1em]"
                      style={{ color: accentTheme.primary }}
                    >
                      Color Themes
                    </span>
                    <button
                      onClick={() => {
                        setShowThemePicker(false);
                        openSettingsTab('theme');
                      }}
                      className="text-[10px] text-neutral-400 hover:text-white underline cursor-pointer"
                    >
                      All Settings →
                    </button>
                  </div>
                  <div className="space-y-1">
                    {ACCENT_THEMES.map((theme) => (
                      <button
                        key={theme.id}
                        onClick={() => {
                          setAccentTheme(theme);
                          setShowThemePicker(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
                          accentTheme.id === theme.id
                            ? 'bg-white/15 text-white font-semibold'
                            : 'text-neutral-400 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5">
                          <span
                            className="w-3.5 h-3.5 rounded-full ring-1 ring-white/30"
                            style={{
                              background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
                            }}
                          />
                          <span>{theme.name}</span>
                        </div>
                        {accentTheme.id === theme.id && (
                          <Check className="w-3.5 h-3.5 text-white" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        );

      case 'sound_toggle':
        return (
          <button
            key={`opt-${optionId}-${index}`}
            onClick={() => {
              const nextVal = !voicePrefs.autoSpeak;
              setVoicePrefs({ ...voicePrefs, autoSpeak: nextVal });
              if (deviceSettings.soundEffects) {
                SoundFXService.getInstance().playChime(nextVal ? 'toggle_on' : 'toggle_off');
              }
              if (!nextVal) {
                cancelSpeaking();
              }
            }}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              voicePrefs.autoSpeak
                ? 'text-neutral-300 hover:text-white hover:bg-white/10'
                : 'text-rose-400 bg-rose-500/10 hover:bg-rose-500/20'
            }`}
            title={voicePrefs.autoSpeak ? 'Mute Voice Responses' : 'Unmute Voice Responses'}
            aria-label={voicePrefs.autoSpeak ? 'Mute audio' : 'Unmute audio'}
          >
            {voicePrefs.autoSpeak ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
          </button>
        );

      case 'settings_view':
        return (
          <button
            key={`opt-${optionId}-${index}`}
            onClick={() => {
              if (deviceSettings.soundEffects) {
                SoundFXService.getInstance().playChime('click');
              }
              if (appMode === 'settings') {
                setAppMode('chat');
                setActiveSidebarTab('chats');
              } else {
                openSettingsTab('theme');
              }
            }}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              appMode === 'settings'
                ? 'bg-white/15 text-white font-semibold shadow-inner'
                : 'text-neutral-400 hover:text-white hover:bg-white/10'
            }`}
            title={appMode === 'settings' ? 'Close Settings' : 'Open Settings'}
            aria-label={appMode === 'settings' ? 'Close Settings' : 'Open Settings'}
          >
            <Settings
              className="w-4 h-4"
              style={{ color: appMode === 'settings' ? accentTheme.primary : undefined }}
            />
          </button>
        );

      case 'voice_mic':
        return (
          <button
            key={`opt-${optionId}-${index}`}
            onClick={() => {
              if (deviceSettings.soundEffects) {
                SoundFXService.getInstance().playChime('click');
              }
              toggleListening();
            }}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              isListening
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30 animate-pulse'
                : 'text-neutral-300 hover:text-white hover:bg-white/10'
            }`}
            title={isListening ? 'Stop listening' : 'Start voice recognition'}
            aria-label="Toggle voice mic"
          >
            <Mic className="w-4 h-4" />
          </button>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <nav className="w-full px-4 md:px-7 py-3 flex justify-between items-center z-30 bg-[#0c0d0f]/90 backdrop-blur-xl border-b border-white/[0.08] transition-all relative">
        {/* Brand Identity & Active Context Info */}
        <div className="flex items-center space-x-3 min-w-0">
          {/* Brand Logo */}
          <button
            onClick={() => setAppMode('chat')}
            className="flex items-center space-x-2 shrink-0 cursor-pointer group"
            title="Fox Assistant Home"
          >
            <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm shrink-0 group-hover:scale-105 transition-transform">
              <div className="w-2 h-2 bg-black rounded-full" />
            </div>
            <span className="text-sm md:text-base font-bold tracking-tight text-white font-sans">
              FOX
            </span>
          </button>

          {/* Dynamic Context Header Details */}
          {appMode === 'tools' ? (
            <div className="flex items-center space-x-2 min-w-0 pl-2 border-l border-white/10">
              <div
                className="w-7 h-7 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm"
                style={{
                  background: `linear-gradient(135deg, ${accentTheme.primary}, ${accentTheme.secondary})`,
                }}
              >
                <ToolIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs md:text-sm font-semibold text-white truncate leading-tight">
                    {currentToolInfo.label}
                  </span>
                  <span
                    className="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold uppercase tracking-wider shrink-0"
                    style={{
                      backgroundColor: `${accentTheme.primary}25`,
                      color: accentTheme.primary,
                    }}
                  >
                    Tools
                  </span>
                </div>
                <p className="text-[10px] text-neutral-400 hidden lg:block truncate leading-tight">
                  {currentToolInfo.subtitle}
                </p>
              </div>
            </div>
          ) : appMode === 'settings' ? (
            <div className="flex items-center space-x-2 min-w-0 pl-2 border-l border-white/10">
              <span className="text-xs md:text-sm font-semibold text-white truncate">
                System Settings & Preferences
              </span>
              <span
                className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-[0.1em] shrink-0"
                style={{
                  backgroundColor: `${accentTheme.primary}25`,
                  color: accentTheme.primary,
                }}
              >
                Settings
              </span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 min-w-0 pl-2 border-l border-white/10">
              {activeSession && (
                <span className="text-xs text-neutral-300 font-medium hidden sm:inline truncate max-w-[200px] md:max-w-[280px]">
                  {activeSession.title}
                </span>
              )}
              <span
                className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-[0.1em] shrink-0"
                style={{
                  backgroundColor: `${accentTheme.primary}25`,
                  color: accentTheme.primary,
                }}
              >
                Active
              </span>
            </div>
          )}
        </div>

        {/* Center Sliding Mode Switcher Carousel (Voice, Chat, Tools) */}
        <div className="flex items-center space-x-4">
          <ModeSwitcher size="sm" />
          <div className="hidden 2xl:flex items-center space-x-3 text-xs font-medium text-neutral-400 pl-2 border-l border-white/10">
            <span className="text-white font-mono">{currentTime || '10:41 AM'}</span>
            <span>{currentDate || 'Tuesday, July 12'}</span>
          </div>
        </div>

        {/* Right Controls: Exit Tools + Dynamic Configurable Quick Options + Permanent Rightmost Control Center */}
        <div className="flex items-center space-x-1.5 shrink-0">
          {/* Exit Tools Button (conditional when in tools view) */}
          {appMode === 'tools' && (
            <button
              onClick={() => setAppMode('chat')}
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Close Tools & Return to Chat"
              aria-label="Close tools"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Configurable Quick Options */}
          {headerQuickOptions
            .slice(0, 3)
            .map((optionId, idx) => renderQuickOptionButton(optionId, idx))}

          {/* Permanent Rightmost Control Center Button */}
          <div className="pl-1 border-l border-white/10 ml-0.5">
            <button
              id="permanent-control-center-btn"
              onClick={toggleQuickAccess}
              className={`p-2 rounded-xl transition-all cursor-pointer relative ${
                isQuickAccessOpen
                  ? 'bg-white/20 text-white shadow-inner ring-1 ring-white/30'
                  : 'text-neutral-300 hover:text-white hover:bg-white/10'
              }`}
              title="Quick Access Control Center"
              aria-label="Control Center"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span
                className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: accentTheme.primary }}
              />
            </button>
          </div>
        </div>
      </nav>

      {/* Floating Control Center Popover */}
      <QuickAccessPanel
        isOpen={isQuickAccessOpen}
        onClose={() => setIsQuickAccessOpen(false)}
      />
    </>
  );
};
