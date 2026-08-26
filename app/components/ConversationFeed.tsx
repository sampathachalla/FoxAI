import React from 'react';
import { motion } from 'motion/react';
import { ChatMessage } from '../types';
import { useVoiceAssistant } from '../hooks/useVoiceAssistant';
import { formatTime } from '../utils/formatters';
import {
  Sparkles,
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
  Calendar,
  FileText,
  Sun,
  Sliders,
  MessageSquare,
} from 'lucide-react';

interface ConversationFeedProps {
  messages?: ChatMessage[];
  containerRef?: React.RefObject<HTMLDivElement | null>;
}

export const ConversationFeed: React.FC<ConversationFeedProps> = ({
  messages: propMessages,
  containerRef,
}) => {
  const { accentTheme, status, currentTranscript, messages: contextMessages } = useVoiceAssistant();
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  // Safe fallback to context messages or empty array to completely prevent undefined errors
  const messages: ChatMessage[] = Array.isArray(propMessages)
    ? propMessages
    : Array.isArray(contextMessages)
    ? contextMessages
    : [];

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 w-full overflow-y-auto px-2 py-2 space-y-3.5 scroll-smooth"
    >
      {messages.length === 0 && (
        <div className="h-full min-h-[160px] flex flex-col items-center justify-center text-center p-4 text-neutral-400">
          <div className="p-3 rounded-2xl bg-black/50 border border-white/10 backdrop-blur-xl shadow-xl flex flex-col items-center max-w-[280px]">
            <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-2">
              <MessageSquare className="w-3.5 h-3.5 text-neutral-300" />
            </div>
            <p className="text-xs text-white font-medium">Ready for voice or text</p>
            <p className="text-[11px] text-neutral-400 mt-1">
              Ask anything or click the microphone to speak with Fox.
            </p>
          </div>
        </div>
      )}

      {messages.map((msg, index) => {
        const isUser = msg.role === 'user';
        return (
          <motion.div
            key={msg.id || index}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.2 }}
            className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
          >
            {/* Sender Label & Timestamp */}
            <div className="flex items-center space-x-1.5 mb-1 px-1.5 text-[10px] text-neutral-400 font-medium">
              {isUser ? (
                <>
                  <span className="text-neutral-300 font-semibold">You</span>
                  <span>•</span>
                  <span>{formatTime(msg.timestamp)}</span>
                </>
              ) : (
                <>
                  <div
                    className="w-3 h-3 rounded-full flex items-center justify-center text-[7px] text-white font-bold"
                    style={{
                      backgroundColor: accentTheme.primary,
                    }}
                  >
                    ✦
                  </div>
                  <span className="font-semibold text-white">FOX</span>
                  <span>•</span>
                  <span>{formatTime(msg.timestamp)}</span>
                </>
              )}
            </div>

            {/* In-Scene Floating Transcript Bubble (Netflix / Cinematic Subtitle HUD) */}
            <div
              className={`relative max-w-[95%] p-3.5 transition-all shadow-2xl backdrop-blur-xl border ${
                isUser
                  ? 'bg-black/60 border-white/20 text-white rounded-2xl rounded-tr-xs'
                  : 'bg-black/75 border-white/15 text-neutral-100 rounded-2xl rounded-tl-xs'
              }`}
            >
              {/* Message Content */}
              <div className="text-xs md:text-[13px] leading-relaxed whitespace-pre-wrap font-normal selection:bg-[#007AFF] text-neutral-100">
                {msg.content}
              </div>

              {/* Tool Execution Cards */}
              {msg.tools && msg.tools.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-white/10 space-y-1.5">
                  {msg.tools.map((tool) => (
                    <div
                      key={tool.id}
                      className="p-2.5 rounded-xl bg-black/40 border border-white/10 text-[11px] flex items-center justify-between space-x-2"
                    >
                      <div className="flex items-center space-x-2 truncate">
                        {tool.tool === 'reminder' && (
                          <Calendar className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                        )}
                        {tool.tool === 'note' && (
                          <FileText className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                        )}
                        {tool.tool === 'weather' && (
                          <Sun className="w-3.5 h-3.5 text-[#007AFF] shrink-0" />
                        )}
                        {tool.tool === 'device_control' && (
                          <Sliders className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        )}
                        <div className="truncate">
                          <span className="font-semibold text-white capitalize text-[11px] block truncate">
                            {tool.tool.replace('_', ' ')} Processed
                          </span>
                          <p className="text-[10px] text-neutral-400 truncate">
                            {tool.parameters?.title ||
                              tool.parameters?.setting ||
                              'Action updated'}
                          </p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-medium flex items-center space-x-1 shrink-0">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        <span>Done</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Grounding Web Search Citations */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-white/10">
                  <span
                    className="text-[9px] uppercase font-bold tracking-[0.1em] block mb-1"
                    style={{ color: accentTheme.primary }}
                  >
                    Sources
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {msg.sources.map((src, i) => (
                      <a
                        key={i}
                        href={src.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] text-neutral-300 hover:text-white transition-colors"
                      >
                        <span className="truncate max-w-[120px]">{src.title}</span>
                        <ExternalLink className="w-2.5 h-2.5 text-neutral-400" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Message Actions */}
              {!isUser && (
                <div className="mt-2 pt-1.5 flex items-center justify-end space-x-1.5 border-t border-white/5 text-neutral-400">
                  <button
                    onClick={() => handleCopy(msg.content, msg.id)}
                    className="p-1 rounded-md hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                    title="Copy response"
                    aria-label="Copy text"
                  >
                    {copiedId === msg.id ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        );
      })}

      {/* Live Interim Transcript when listening */}
      {status === 'listening' && currentTranscript && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-end"
        >
          <div className="text-[10px] text-neutral-400 mb-1">Transcribing voice...</div>
          <div className="max-w-[88%] rounded-2xl p-3 glass-card border-[#007AFF]/40 text-white rounded-br-sm shadow-lg flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#007AFF] animate-ping shrink-0" />
            <p className="text-xs font-light italic truncate">{currentTranscript}</p>
          </div>
        </motion.div>
      )}

      {/* Assistant Thinking Loading Indicator */}
      {status === 'thinking' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center space-x-2.5 p-3 rounded-2xl glass-card w-fit border-white/10"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#007AFF] animate-spin" />
          <div className="flex space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#007AFF] animate-bounce" />
            <span
              className="w-1.5 h-1.5 rounded-full bg-white animate-bounce"
              style={{ animationDelay: '0.15s' }}
            />
            <span
              className="w-1.5 h-1.5 rounded-full bg-neutral-500 animate-bounce"
              style={{ animationDelay: '0.3s' }}
            />
          </div>
          <span className="text-[11px] text-neutral-300 font-medium ml-1">
            Thinking...
          </span>
        </motion.div>
      )}
    </div>
  );
};
