import { AssistantToolCall } from '../models/assistant.types';

/**
 * Detects tool intents from the user prompt and assistant response.
 * Centralized here to avoid duplication between gemini.service.ts and openai.service.ts.
 */
export function detectToolsFromPromptAndResponse(
  prompt: string,
  responseText: string
): AssistantToolCall[] {
  const tools: AssistantToolCall[] = [];
  const lowerPrompt = prompt.toLowerCase();

  // Reminder intent
  if (
    lowerPrompt.includes('remind me') ||
    lowerPrompt.includes('set a reminder') ||
    lowerPrompt.includes('create reminder')
  ) {
    const cleanTitle = prompt
      .replace(/remind me to |set a reminder to |create a reminder for |remind me /i, '')
      .trim();
    tools.push({
      id: 'rem_' + Date.now(),
      tool: 'reminder',
      parameters: {
        title: cleanTitle || 'Scheduled Task',
        dueTime: 'Today at 5:00 PM',
        priority: 'high',
      },
      status: 'completed',
    });
  }

  // Note intent
  if (
    lowerPrompt.includes('take a note') ||
    lowerPrompt.includes('note down') ||
    lowerPrompt.includes('create note') ||
    lowerPrompt.includes('write note')
  ) {
    const cleanContent = prompt
      .replace(/take a note that |take a note: |note down: |create a note: |write a note: /i, '')
      .trim();
    tools.push({
      id: 'note_' + Date.now(),
      tool: 'note',
      parameters: {
        title: (cleanContent.slice(0, 30) || 'Quick Note') + '...',
        content: cleanContent || responseText,
        tags: ['Voice Note', 'Fox'],
      },
      status: 'completed',
    });
  }

  // Weather intent — avoid false positives on generic use of "temperature"
  if (
    lowerPrompt.includes('weather') ||
    lowerPrompt.includes('forecast') ||
    lowerPrompt.includes('rain') ||
    (lowerPrompt.includes('temperature') &&
      (lowerPrompt.includes('outside') ||
        lowerPrompt.includes('today') ||
        lowerPrompt.includes('weather')))
  ) {
    tools.push({
      id: 'wx_' + Date.now(),
      tool: 'weather',
      parameters: {
        location: 'Current Location',
        condition: 'Partly Cloudy',
        temperature: '72\u00b0F',
        humidity: '48%',
        high: '76\u00b0F',
        low: '58\u00b0F',
      },
      status: 'completed',
    });
  }

  // Device control intent
  if (
    lowerPrompt.includes('focus mode') ||
    lowerPrompt.includes('do not disturb') ||
    lowerPrompt.includes('flashlight') ||
    lowerPrompt.includes('dark mode')
  ) {
    let setting = 'Focus Mode';
    if (lowerPrompt.includes('flashlight')) setting = 'Flashlight';
    if (lowerPrompt.includes('dark mode')) setting = 'Appearance';
    if (lowerPrompt.includes('do not disturb')) setting = 'Do Not Disturb';

    tools.push({
      id: 'dev_' + Date.now(),
      tool: 'device_control',
      parameters: {
        setting,
        action:
          lowerPrompt.includes('off') || lowerPrompt.includes('disable')
            ? 'disabled'
            : 'enabled',
      },
      status: 'completed',
    });
  }

  return tools;
}
