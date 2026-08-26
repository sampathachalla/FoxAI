import React from 'react';
import { motion } from 'motion/react';
import { useVoiceAssistant } from '../hooks/useVoiceAssistant';
import { Mic, MessageSquare, Layers } from 'lucide-react';
import { AppMode } from '../types';

interface ModeSwitcherProps {
  className?: string;
  size?: 'sm' | 'md';
}

export const ModeSwitcher: React.FC<ModeSwitcherProps> = ({ className = '' }) => {
  const { appMode, setAppMode, accentTheme, status, setActiveSidebarTab } = useVoiceAssistant();

  const modes: { id: AppMode; label: string; icon: React.ElementType; title: string }[] = [
    {
      id: 'voice',
      label: 'Voice',
      icon: Mic,
      title: 'Switch to 3D Voice Visualizer Mode',
    },
    {
      id: 'chat',
      label: 'Chat',
      icon: MessageSquare,
      title: 'Switch to Full Text Chat Mode',
    },
    {
      id: 'tools',
      label: 'Tools',
      icon: Layers,
      title: 'Open Tools Workspace (Notes, Sticky Notes, Calendar, Events)',
    },
  ];

  const handleModeChange = (mode: AppMode) => {
    setAppMode(mode);
    if (mode === 'tools') {
      setActiveSidebarTab('tools');
    } else if (mode === 'chat' || mode === 'voice') {
      setActiveSidebarTab('chats');
    }
  };

  return (
    <div
      className={`relative inline-flex items-center p-0.5 rounded-full bg-white/[0.06] border border-white/10 backdrop-blur-md shadow-sm ${className}`}
      role="tablist"
      aria-label="Mode Switcher"
    >
      {modes.map((mode) => {
        const isActive = appMode === mode.id;
        const Icon = mode.icon;

        return (
          <button
            key={mode.id}
            onClick={() => handleModeChange(mode.id)}
            role="tab"
            aria-selected={isActive}
            title={mode.title}
            className={`relative z-10 flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer select-none ${
              isActive
                ? 'text-white font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {/* Active Sliding Background Capsule */}
            {isActive && (
              <motion.div
                layoutId="activeModeSlidePill"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                className="absolute inset-0 rounded-full z-[-1] border border-white/20"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.14)',
                  boxShadow: `0 0 10px ${accentTheme.glow}`,
                }}
              />
            )}

            <Icon
              className={`w-3 h-3 transition-transform ${
                isActive ? 'scale-105' : 'opacity-70'
              }`}
              style={{
                color: isActive ? accentTheme.primary : undefined,
              }}
            />
            <span className="leading-none tracking-tight whitespace-nowrap">{mode.label}</span>

            {/* Pulsing indicator when voice is active in voice mode */}
            {mode.id === 'voice' && (status === 'listening' || status === 'speaking') && (
              <span
                className="w-1.5 h-1.5 rounded-full animate-ping ml-0.5"
                style={{ backgroundColor: accentTheme.primary }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
};

