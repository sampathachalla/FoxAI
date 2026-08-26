import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { useVoiceAssistant } from '../hooks/useVoiceAssistant';
import { formatTime } from '../utils/formatters';
import { ChatMessage } from '../types';
import {
  Sparkles,
  Copy,
  Check,
  Volume2,
  VolumeX,
  RotateCcw,
  ArrowDown,
  Code,
  PenLine,
  Brain,
  Layers,
  Plus,
  Calendar,
  FileText,
  Sun,
  Sliders,
  CheckCircle2,
} from 'lucide-react';

interface CodeBlockProps {
  children?: React.ReactNode;
  className?: string;
  [key: string]: any;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ children, className }) => {
  const [copied, setCopied] = useState(false);
  const codeContent = String(children).replace(/\n$/, '');
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : 'code';

  const handleCopy = () => {
    navigator.clipboard.writeText(codeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-2xl overflow-hidden border border-white/15 bg-neutral-950/90 shadow-xl">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10 text-xs text-neutral-400 font-mono">
        <span className="uppercase font-semibold tracking-wider text-[11px] text-neutral-300">
          {language}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg hover:bg-white/10 text-neutral-300 hover:text-white transition-colors cursor-pointer text-[11px]"
          title="Copy code to clipboard"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-medium">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy code</span>
            </>
          )}
        </button>
      </div>
      {/* Code Content */}
      <div className="p-4 overflow-x-auto text-xs font-mono leading-relaxed text-neutral-200 selection:bg-[#007AFF]">
        <pre className="m-0 font-mono">{codeContent}</pre>
      </div>
    </div>
  );
};

export const ChatModeStage: React.FC = () => {
  const {
    messages,
    status,
    accentTheme,
    sendMessage,
    createNewSession,
    cancelSpeaking,
  } = useVoiceAssistant();

  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomAnchorRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomAnchorRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, status]);

  // Handle scroll detection for floating scroll-to-bottom button
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isFarFromBottom = scrollHeight - scrollTop - clientHeight > 180;
    setShowScrollBottom(isFarFromBottom);
  };

  const scrollToBottom = () => {
    bottomAnchorRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCopyMessage = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const handleSpeakMessage = (content: string, id: string) => {
    if (playingMessageId === id) {
      window.speechSynthesis?.cancel();
      setPlayingMessageId(null);
      return;
    }

    window.speechSynthesis?.cancel();
    const utterance = new SpeechSynthesisUtterance(content.replace(/```[\s\S]*?```/g, 'Code block omitted.'));
    utterance.onend = () => setPlayingMessageId(null);
    utterance.onerror = () => setPlayingMessageId(null);
    setPlayingMessageId(id);
    window.speechSynthesis?.speak(utterance);
  };

  const starterCards = [
    {
      title: 'Executive Briefing',
      description: 'Summarize top priorities, action items, and key decisions.',
      prompt: 'Please provide a crisp executive briefing on current objectives and high-impact action items.',
      icon: Sparkles,
    },
    {
      title: 'Code Architecture',
      description: 'Analyze system patterns, state management, and bottlenecks.',
      prompt: 'Review modern React architecture patterns for state management, API proxy security, and 3D Canvas rendering.',
      icon: Code,
    },
    {
      title: 'Writing Refinement',
      description: 'Polish drafted messages for clarity, warmth, and impact.',
      prompt: 'Help me polish and refine a professional email with clarity and executive tone.',
      icon: PenLine,
    },
    {
      title: 'First-Principles Analysis',
      description: 'Deconstruct complex topics into fundamental truths.',
      prompt: 'Explain how neural action potentials and electrical synapse transmission work from first principles.',
      icon: Brain,
    },
  ];

  return (
    <div className="w-full h-full flex-1 min-h-0 glass-card border border-white/10 rounded-3xl shadow-2xl relative flex flex-col overflow-hidden bg-black/40 backdrop-blur-2xl">
      {/* Top Bar inside Chat Mode Stage */}
      <div className="shrink-0 flex items-center justify-between px-4 md:px-6 py-2.5 border-b border-white/[0.08] bg-black/40 backdrop-blur-xl z-20">
        <div className="flex items-center space-x-2.5">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{
              backgroundColor: accentTheme.primary,
              boxShadow: `0 0 10px ${accentTheme.primary}`,
            }}
          />
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
            Fox Conversation
          </span>
        </div>

        {/* New Chat Button */}
        <button
          onClick={() => createNewSession()}
          className="px-3 py-1.5 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 text-neutral-200 hover:text-white text-xs font-medium flex items-center space-x-1.5 transition-all cursor-pointer shadow-sm hover:border-white/25"
          title="Start a new chat session"
        >
          <Plus className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-[11px]">New Chat</span>
        </button>
      </div>

      {/* Main Chat Scroll Container */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-6 md:px-8 py-6 custom-scrollbar overscroll-contain"
      >
        <div className="max-w-3xl md:max-w-4xl mx-auto w-full space-y-6">
          {/* Welcome Screen when messages array is empty or just starting */}
          {messages.length <= 1 && messages[0]?.id === 'welcome' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="py-6 flex flex-col items-center text-center space-y-6"
            >
              {/* Center Fox Avatar Icon */}
              <div className="relative">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center border border-white/20 shadow-2xl"
                  style={{
                    background: `linear-gradient(135deg, ${accentTheme.primary}40, rgba(0,0,0,0.8))`,
                    boxShadow: `0 0 30px ${accentTheme.glow}`,
                  }}
                >
                  <Sparkles className="w-7 h-7 text-white" />
                </div>
                <span
                  className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-black flex items-center justify-center text-[8px] font-bold text-black"
                  style={{ backgroundColor: accentTheme.primary }}
                >
                  ✓
                </span>
              </div>

              {/* Title & Tagline */}
              <div className="space-y-1.5 max-w-lg">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white font-sans">
                  What can I help you with today?
                </h1>
                <p className="text-xs md:text-sm text-neutral-400 font-light leading-relaxed">
                  Type any request or click a starter suggestion below to begin chatting with Fox.
                </p>
              </div>

              {/* 4 ChatGPT-Style Starter Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full pt-2">
                {starterCards.map((card, idx) => {
                  const Icon = card.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => sendMessage(card.prompt)}
                      className="p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-white/25 transition-all text-left group flex items-start space-x-3 cursor-pointer shadow-lg hover:shadow-xl"
                    >
                      <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-neutral-300 group-hover:text-white transition-colors shrink-0 mt-0.5">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="text-xs font-semibold text-neutral-200 group-hover:text-white transition-colors flex items-center justify-between">
                          <span>{card.title}</span>
                          <span className="text-neutral-500 group-hover:text-white transition-colors text-xs font-mono">
                            →
                          </span>
                        </h2>
                        <p className="text-[11px] text-neutral-400 mt-1 leading-snug line-clamp-2">
                          {card.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Render Full Message Timeline */}
          {messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            const isFox = msg.role === 'assistant';

            return (
              <motion.div
                key={msg.id || index}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22 }}
                className="w-full flex flex-col group"
              >
                {/* User Row (ChatGPT Style: Bubble or clean message row) */}
                {isUser ? (
                  <div className="flex justify-end items-start space-x-2.5">
                    <div className="flex flex-col items-end max-w-[85%] sm:max-w-[78%]">
                      <div className="px-4 py-3 rounded-2xl rounded-tr-xs bg-neutral-800/90 border border-white/15 text-white shadow-md">
                        <p className="text-xs md:text-sm leading-relaxed whitespace-pre-wrap selection:bg-[#007AFF]">
                          {msg.content}
                        </p>
                      </div>
                      <span className="text-[10px] text-neutral-500 mt-1 px-1">
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                  </div>
                ) : (
                  /* Assistant Row (ChatGPT Style: Avatar + Markdown response + Actions) */
                  <div className="flex items-start space-x-3 md:space-x-4 max-w-full">
                    {/* Fox Avatar */}
                    <div
                      className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border border-white/20 shadow-md mt-0.5"
                      style={{
                        background: `linear-gradient(135deg, ${accentTheme.primary}40, #111111)`,
                      }}
                    >
                      <Sparkles
                        className="w-3.5 h-3.5"
                        style={{ color: accentTheme.primary }}
                      />
                    </div>

                    {/* Content Body */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-semibold text-white tracking-wide">
                          Fox
                        </span>
                        <span className="text-[10px] text-neutral-500">
                          {formatTime(msg.timestamp)}
                        </span>
                      </div>

                      {/* Markdown Body */}
                      <div className="text-xs md:text-sm text-neutral-200 leading-relaxed font-normal space-y-3 prose prose-invert max-w-none">
                        <div className="markdown-body">
                          <Markdown
                            components={{
                              code({ node, className, children, ...props }) {
                                const match = /language-(\w+)/.exec(className || '');
                                const isMultiline = String(children).includes('\n') || match;
                                if (isMultiline) {
                                  return (
                                    <CodeBlock className={className} {...props}>
                                      {children}
                                    </CodeBlock>
                                  );
                                }
                                return (
                                  <code
                                    className="px-1.5 py-0.5 rounded-md bg-neutral-800 border border-white/10 text-neutral-200 font-mono text-[11px]"
                                    {...props}
                                  >
                                    {children}
                                  </code>
                                );
                              },
                              table({ children }) {
                                return (
                                  <div className="my-3 overflow-x-auto rounded-xl border border-white/15">
                                    <table className="w-full text-left text-xs border-collapse">
                                      {children}
                                    </table>
                                  </div>
                                );
                              },
                              th({ children }) {
                                return (
                                  <th className="border-b border-white/20 bg-white/5 px-3 py-2 font-semibold text-white text-[11px] uppercase tracking-wider">
                                    {children}
                                  </th>
                                );
                              },
                              td({ children }) {
                                return (
                                  <td className="border-b border-white/10 px-3 py-2 text-neutral-300 text-xs">
                                    {children}
                                  </td>
                                );
                              },
                              ul({ children }) {
                                return (
                                  <ul className="list-disc list-outside pl-4 space-y-1 my-2 text-neutral-200">
                                    {children}
                                  </ul>
                                );
                              },
                              ol({ children }) {
                                return (
                                  <ol className="list-decimal list-outside pl-4 space-y-1 my-2 text-neutral-200">
                                    {children}
                                  </ol>
                                );
                              },
                              p({ children }) {
                                return <p className="mb-2.5 last:mb-0 leading-relaxed">{children}</p>;
                              },
                            }}
                          >
                            {msg.content}
                          </Markdown>
                        </div>
                      </div>

                      {/* Tool Execution Badges */}
                      {msg.tools && msg.tools.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-white/10 space-y-2">
                          {msg.tools.map((tool) => (
                            <div
                              key={tool.id}
                              className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 text-xs flex items-center justify-between space-x-2"
                            >
                              <div className="flex items-center space-x-2.5 truncate">
                                {tool.tool === 'reminder' && (
                                  <Calendar className="w-4 h-4 text-orange-400 shrink-0" />
                                )}
                                {tool.tool === 'note' && (
                                  <FileText className="w-4 h-4 text-yellow-400 shrink-0" />
                                )}
                                {tool.tool === 'weather' && (
                                  <Sun className="w-4 h-4 text-[#007AFF] shrink-0" />
                                )}
                                {tool.tool === 'device_control' && (
                                  <Sliders className="w-4 h-4 text-purple-400 shrink-0" />
                                )}
                                <div className="truncate">
                                  <span className="font-semibold text-white capitalize block truncate">
                                    {tool.tool.replace('_', ' ')} Processed
                                  </span>
                                  <p className="text-[11px] text-neutral-400 truncate">
                                    {tool.parameters?.title ||
                                      tool.parameters?.setting ||
                                      'Action updated'}
                                  </p>
                                </div>
                              </div>
                              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-medium flex items-center space-x-1 shrink-0">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Completed</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Message Bottom Action Toolbar (ChatGPT Style: Copy, TTS, Retry) */}
                      <div className="flex items-center space-x-1 pt-1.5 text-neutral-400 opacity-80 group-hover:opacity-100 transition-opacity">
                        {/* Copy Button */}
                        <button
                          onClick={() => handleCopyMessage(msg.content, msg.id)}
                          className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors cursor-pointer text-xs flex items-center space-x-1"
                          title="Copy response"
                        >
                          {copiedMessageId === msg.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-[10px] text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {/* Read Aloud Button */}
                        <button
                          onClick={() => handleSpeakMessage(msg.content, msg.id)}
                          className={`p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors cursor-pointer text-xs ${
                            playingMessageId === msg.id ? 'text-cyan-400 bg-white/10' : ''
                          }`}
                          title={playingMessageId === msg.id ? 'Stop audio' : 'Read aloud'}
                        >
                          {playingMessageId === msg.id ? (
                            <VolumeX className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                          ) : (
                            <Volume2 className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {/* Retry / Regenerate on last message */}
                        {index === messages.length - 1 && (
                          <button
                            onClick={() => {
                              const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
                              if (lastUserMsg) sendMessage(lastUserMsg.content);
                            }}
                            className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors cursor-pointer text-xs"
                            title="Regenerate response"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}

          {/* Thinking / Streaming Indicator */}
          {status === 'thinking' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start space-x-3 md:space-x-4 max-w-full"
            >
              <div
                className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border border-white/20 shadow-md animate-pulse"
                style={{
                  background: `linear-gradient(135deg, ${accentTheme.primary}40, #111111)`,
                }}
              >
                <Sparkles
                  className="w-3.5 h-3.5 animate-spin"
                  style={{ color: accentTheme.primary, animationDuration: '3s' }}
                />
              </div>
              <div className="flex items-center space-x-2 py-2 px-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.4s]" />
                <span className="text-xs text-neutral-400 font-medium pl-1">Fox is thinking...</span>
              </div>
            </motion.div>
          )}

          {/* Scroll anchor */}
          <div ref={bottomAnchorRef} className="h-4" />
        </div>
      </div>

      {/* Floating Scroll to Bottom Button */}
      <AnimatePresence>
        {showScrollBottom && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            onClick={scrollToBottom}
            className="absolute bottom-4 right-6 z-30 p-2.5 rounded-full bg-black/80 border border-white/20 text-white shadow-2xl hover:bg-neutral-800 hover:border-white/40 transition-all cursor-pointer backdrop-blur-xl"
            title="Scroll to bottom"
            aria-label="Scroll to bottom"
          >
            <ArrowDown className="w-4 h-4" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};
