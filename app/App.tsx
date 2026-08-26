import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AssistantProvider, useAssistant } from './store/assistantContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { AuraStage } from './components/AuraStage';
import { ChatModeStage } from './components/ChatModeStage';
import { ToolsManagerView } from './components/ToolsManagerView';
import { SettingsView } from './components/SettingsView';
import { VoiceInputBar } from './components/VoiceInputBar';
import { Moon, X } from 'lucide-react';

const AssistantMain: React.FC = () => {
  const {
    appMode,
    setAppMode,
    accentTheme,
    openSettingsTab,
    createNewSession,
    toggleSidebar,
    deviceSettings,
    updateDeviceSetting,
  } = useAssistant();

  // Global Keyboard Shortcuts (⌘K for New Chat, ⌘B for Toggle Sidebar, ⌘, for Settings)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      if (isCmdOrCtrl && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        createNewSession();
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebar();
      } else if (isCmdOrCtrl && e.key === ',') {
        e.preventDefault();
        openSettingsTab('theme');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [createNewSession, toggleSidebar, openSettingsTab]);

  return (
    <div
      className="h-screen max-h-screen w-full flex text-white font-sans selection:bg-[#007AFF] overflow-hidden relative bg-[#000000] transition-colors duration-500"
      style={{
        backgroundImage: deviceSettings.ambientGlow
          ? `
          radial-gradient(circle at 35% 30%, ${accentTheme.glow.replace(/[\d\.]+\)$/, '0.12)')} 0%, transparent 60%),
          radial-gradient(circle at 15% 85%, rgba(0, 122, 255, 0.05) 0%, transparent 50%),
          radial-gradient(circle at 85% 85%, rgba(88, 86, 214, 0.05) 0%, transparent 50%)
        `
          : 'none',
      }}
    >
      {/* 1. Left Side Control Panel (Chats, Library, Settings Categories List) */}
      <Sidebar />

      {/* 2. Main Workspace & Stage */}
      <div className="flex-1 min-w-0 h-full flex flex-col justify-between overflow-hidden relative">
        {/* Top Header */}
        <div className="shrink-0 z-30 flex flex-col">
          <Header onOpenSettings={() => openSettingsTab('theme')} />
          
          {/* Focus Mode (Do Not Disturb) Live Status Pill */}
          <AnimatePresence>
            {deviceSettings.focusMode && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="self-center -mt-1.5 mb-1 px-3.5 py-1 rounded-full bg-indigo-950/80 border border-indigo-500/40 text-indigo-200 text-xs flex items-center space-x-2 backdrop-blur-xl shadow-lg z-20"
              >
                <Moon className="w-3.5 h-3.5 text-indigo-400 fill-indigo-400 animate-pulse" />
                <span className="font-semibold tracking-tight text-[11px]">
                  Focus Mode Active (Do Not Disturb)
                </span>
                <button
                  onClick={() => updateDeviceSetting('focusMode', false)}
                  className="ml-1.5 px-2 py-0.5 rounded-full bg-indigo-500/30 hover:bg-indigo-500/50 text-[10px] text-white transition-colors cursor-pointer flex items-center space-x-1"
                  title="Turn off Focus Mode"
                >
                  <span>Turn Off</span>
                  <X className="w-2.5 h-2.5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Main Stage Container - Animated Transitions between Voice Mode, Chat Mode, and Dedicated Settings View */}
        <main className="flex-1 min-h-0 w-full max-w-[1700px] mx-auto px-3 md:px-6 py-2 flex flex-col gap-2.5 relative z-10 overflow-hidden">
          <section className="flex-1 min-h-0 w-full flex items-stretch overflow-hidden relative">
            <AnimatePresence mode="wait">
              {appMode === 'voice' ? (
                <motion.div
                  key="voice-mode-stage"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="w-full h-full flex-1 flex items-stretch"
                >
                  <AuraStage />
                </motion.div>
              ) : appMode === 'chat' ? (
                <motion.div
                  key="chat-mode-stage"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="w-full h-full flex-1 flex items-stretch"
                >
                  <ChatModeStage />
                </motion.div>
              ) : appMode === 'tools' ? (
                <motion.div
                  key="tools-stage"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="w-full h-full flex-1 flex items-stretch"
                >
                  <ToolsManagerView />
                </motion.div>
              ) : (
                <motion.div
                  key="settings-view-stage"
                  initial={{ opacity: 0, y: 15, scale: 0.99 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -15, scale: 0.99 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="w-full h-full flex-1 flex items-stretch p-1 sm:p-2"
                >
                  <SettingsView />
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </main>

        {/* Bottom Sticky Input Capsule (Visible ONLY during Chat mode) */}
        {appMode === 'chat' && (
          <footer className="shrink-0 z-20 w-full backdrop-blur-2xl bg-black/80 border-t border-white/[0.08] pt-1 animate-in fade-in duration-200">
            <VoiceInputBar />
          </footer>
        )}
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AssistantProvider>
      <AssistantMain />
    </AssistantProvider>
  );
}
