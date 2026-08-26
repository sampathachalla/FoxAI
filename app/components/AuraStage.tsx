import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FloatingOrb } from './FloatingOrb';
import { ConversationFeed } from './ConversationFeed';
import { useVoiceAssistant } from '../hooks/useVoiceAssistant';
import { useScrollToBottom } from '../hooks/useScrollToBottom';
import {
  PanelRightClose,
  PanelRightOpen,
  Plus,
} from 'lucide-react';

export const AuraStage: React.FC = () => {
  const { messages = [], createNewSession } = useVoiceAssistant();
  const [isChatOpen, setIsChatOpen] = useState(true);
  const scrollRef = useScrollToBottom(messages);

  return (
    <div className="w-full h-full flex-1 min-h-0 glass-card border border-white/10 rounded-3xl p-2 md:p-3 shadow-2xl relative flex flex-col items-stretch overflow-hidden transition-all duration-300">
      {/* Top Floating Control Bar */}
      <div className="absolute top-3 right-3 z-30 flex items-center space-x-2">
        {/* Add New Chat Button */}
        <button
          onClick={() => createNewSession()}
          className="px-3 py-1.5 rounded-full border border-white/20 bg-black/60 hover:bg-black/80 text-white text-xs font-medium flex items-center space-x-1.5 transition-all cursor-pointer backdrop-blur-xl shadow-lg hover:border-white/30"
          title="Start a new chat or conversation"
          aria-label="Start a new chat"
        >
          <Plus className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-[11px] font-medium tracking-wide">New Chat</span>
        </button>

        {/* Toggle Conversation Overlay Button */}
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className={`px-3 py-1.5 rounded-full border text-xs font-medium flex items-center space-x-1.5 transition-all cursor-pointer backdrop-blur-xl shadow-lg ${
            isChatOpen
              ? 'bg-black/60 border-white/20 text-white hover:bg-black/80 hover:border-white/30'
              : 'bg-black/50 border-white/15 text-neutral-300 hover:text-white hover:bg-black/70 hover:border-white/30'
          }`}
          title={isChatOpen ? 'Collapse conversation overlay' : 'Show conversation overlay'}
          aria-label={isChatOpen ? 'Collapse conversation overlay' : 'Show conversation overlay'}
        >
          {isChatOpen ? (
            <>
              <PanelRightClose className="w-3.5 h-3.5" />
              <span className="text-[11px] font-medium tracking-wide">Hide Conversation</span>
            </>
          ) : (
            <>
              <PanelRightOpen className="w-3.5 h-3.5 text-[#007AFF]" />
              <span className="text-[11px] text-white font-medium tracking-wide">Show Conversation</span>
              {messages.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-[#007AFF] text-white text-[9px] font-bold">
                  {messages.length}
                </span>
              )}
            </>
          )}
        </button>
      </div>

      {/* Main Unified Content Stage: 3D Visualizer fills the component while transcripts float in-scene on the side */}
      <div className="w-full h-full flex-1 min-h-0 relative flex items-center justify-center overflow-hidden">
        {/* 3D Visualizer Section - Full Stage Presence */}
        <div className="w-full h-full flex items-center justify-center relative">
          <FloatingOrb />
        </div>

        {/* In-Scene Floating Transcript Overlay (Movie / Netflix Subtitle Style) */}
        <AnimatePresence initial={false}>
          {isChatOpen && (
            <motion.div
              key="aura-inscene-conversation"
              initial={{ opacity: 0, x: 40, scale: 0.96 }}
              animate={{
                opacity: 1,
                x: 0,
                scale: 1,
                transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] },
              }}
              exit={{
                opacity: 0,
                x: 30,
                scale: 0.96,
                transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
              }}
              className="absolute right-2 md:right-4 top-12 bottom-2 w-full sm:w-[380px] md:w-[420px] lg:w-[450px] max-w-[94vw] z-20 flex flex-col pointer-events-none"
            >
              {/* Messages feed container with smooth independent scroll & pointer events */}
              <div
                ref={scrollRef}
                tabIndex={0}
                aria-label="Conversation stream"
                className="flex-1 min-h-0 overflow-y-auto pr-1.5 custom-scrollbar space-y-2 overscroll-contain focus:outline-none pointer-events-auto py-1"
              >
                <ConversationFeed messages={messages} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
