import { useAssistant } from '../store/assistantContext';

export function useVoiceAssistant() {
  const assistant = useAssistant();

  const handleQuickPrompt = (promptText: string) => {
    assistant.sendMessage(promptText);
  };

  return {
    ...assistant,
    handleQuickPrompt,
    isBusy: assistant.status === 'thinking' || assistant.status === 'speaking',
    isListening: assistant.status === 'listening',
    isSpeaking: assistant.status === 'speaking',
    isThinking: assistant.status === 'thinking',
  };
}
