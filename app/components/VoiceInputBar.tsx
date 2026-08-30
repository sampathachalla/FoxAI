import React, { useState, useEffect } from 'react';
import { useVoiceAssistant } from '../hooks/useVoiceAssistant';
import { useLiveKitVoice } from '../hooks/useLiveKitVoice';
import { Mic, StopCircle, ArrowUp } from 'lucide-react';

const PROMPT_SUGGESTIONS = [
  'Analyze modular architecture in React',
  'Remind me to review UserStore.ts',
  'What is the current backend latency?',
  'What is the weather in Cupertino?',
  'Turn on Focus Mode',
];

export const VoiceInputBar: React.FC = () => {
  const {
    status,
    accentTheme,
    voicePrefs,
    toggleListening,
    sendMessage,
  } = useVoiceAssistant();
  const livekitVoice = useLiveKitVoice(voicePrefs);

  const [inputVal, setInputVal] = useState('');

  // Realtime voice is opt-in. When disabled, the exact existing browser voice
  // behavior remains active, which makes this migration safe to roll out.
  const effectiveStatus = livekitVoice.enabled
    ? livekitVoice.connecting
      ? 'thinking'
      : livekitVoice.connected
      ? 'listening'
      : status
    : status;

  const handleVoiceToggle = () => {
    if (livekitVoice.enabled) {
      void livekitVoice.toggle().catch((err) => {
        console.error('[Fox LiveKit] Voice session failed:', err);
      });
      return;
    }
    toggleListening();
  };

  // Keyboard shortcut listener (Cmd+K / Ctrl+K / /)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const input = document.getElementById('assistant-prompt-input');
        input?.focus();
      } else if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        const input = document.getElementById('assistant-prompt-input');
        input?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputVal.trim() && status !== 'thinking') {
      sendMessage(inputVal.trim());
      setInputVal('');
    }
  };

  const isVoiceActive = effectiveStatus === 'listening' || effectiveStatus === 'speaking';

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-6 pt-2 z-30">
      {/* Main Artistic Flair Input Capsule */}
      <form
        onSubmit={handleSubmit}
        className="glass-card px-5 py-3.5 flex items-center space-x-4 border-white/20 shadow-2xl transition-all focus-within:border-white/40 focus-within:ring-1 focus-within:ring-[#007AFF]/40"
        style={{
          boxShadow: isVoiceActive
            ? `0 0 35px ${accentTheme.glow}`
            : '0 12px 40px rgba(0, 0, 0, 0.7)',
        }}
      >
        {/* Dynamic Voice Toggle / Accent Indicator Dot */}
        <button
          type="button"
          onClick={handleVoiceToggle}
          disabled={livekitVoice.enabled && livekitVoice.connecting}
          className={`relative p-2.5 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            effectiveStatus === 'listening'
              ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.6)] animate-pulse'
              : effectiveStatus === 'speaking'
              ? 'bg-[#007AFF] text-white shadow-[0_0_15px_rgba(0,122,255,0.6)]'
              : 'bg-white/10 hover:bg-white/20 text-white'
          }`}
          title={
            livekitVoice.connecting
              ? 'Connecting realtime voice...'
              : effectiveStatus === 'listening'
              ? 'Stop listening'
              : effectiveStatus === 'speaking'
              ? 'Stop speaking'
              : livekitVoice.enabled
              ? 'Start LiveKit voice session'
              : 'Speak to Fox'
          }
          aria-label="Voice toggle"
        >
          {effectiveStatus === 'listening' ? (
            <Mic className="w-4 h-4 text-white" />
          ) : effectiveStatus === 'speaking' ? (
            <StopCircle className="w-4 h-4 text-white" />
          ) : (
            <Mic className="w-4 h-4 text-neutral-200" />
          )}

          {/* Mini pulse ring when listening */}
          {effectiveStatus === 'listening' && (
            <span
              className="absolute inset-0 rounded-full border-2 border-white/80 animate-ping pointer-events-none"
              style={{ animationDuration: '1.5s' }}
            />
          )}
        </button>

        {/* Accent Glow Dot */}
        <div
          className="w-2.5 h-2.5 rounded-full shrink-0 transition-colors"
          style={{
            backgroundColor: isVoiceActive ? '#ffffff' : accentTheme.primary,
            boxShadow: `0 0 8px ${accentTheme.primary}`,
          }}
        />

        {/* Text Input */}
        <input
          id="assistant-prompt-input"
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder={
            livekitVoice.connecting
              ? 'Connecting realtime voice...'
              : effectiveStatus === 'listening'
              ? 'Listening to your voice...'
              : effectiveStatus === 'speaking'
              ? 'Fox speaking (type to interrupt)...'
              : 'Ask anything or type a prompt...'
          }
          disabled={status === 'thinking'}
          className="bg-transparent border-none text-white focus:outline-none w-full text-base font-light placeholder-neutral-600 selection:bg-[#007AFF]"
        />

        {/* Right Shortcuts & Submit Pill */}
        <div className="flex items-center space-x-2 shrink-0">
          {inputVal.trim() ? (
            <button
              type="submit"
              disabled={status === 'thinking'}
              className="px-3.5 py-1.5 rounded-full bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition-all flex items-center space-x-1 shadow-md"
              aria-label="Send prompt"
            >
              <span>Send</span>
              <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  const input = document.getElementById('assistant-prompt-input');
                  input?.focus();
                }}
                className="w-7 h-7 rounded-full border border-neutral-700 flex items-center justify-center text-[10px] text-neutral-400 font-mono hover:border-neutral-500 hover:text-white transition-colors cursor-pointer"
                title="Press ⌘K or Ctrl+K to focus"
              >
                ⌘
              </button>
              <button
                type="button"
                onClick={() => {
                  const input = document.getElementById('assistant-prompt-input');
                  input?.focus();
                }}
                className="w-7 h-7 rounded-full border border-neutral-700 flex items-center justify-center text-[10px] text-neutral-400 font-mono hover:border-neutral-500 hover:text-white transition-colors cursor-pointer"
                title="Press ⌘K or Ctrl+K to focus"
              >
                K
              </button>
            </>
          )}
        </div>
      </form>
      {livekitVoice.enabled && livekitVoice.error && (
        <p className="mt-2 px-2 text-xs text-red-300" role="status">
          Realtime voice unavailable: {livekitVoice.error}. Existing text chat is still available.
        </p>
      )}
    </div>
  );
};