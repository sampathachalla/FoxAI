export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  toolCalls?: AssistantToolCall[];
  groundingSources?: { title: string; url: string }[];
  audioLevel?: number;
}

export interface AssistantToolCall {
  id: string;
  tool: 'reminder' | 'note' | 'timer' | 'weather' | 'device_control' | 'search';
  parameters: Record<string, any>;
  result?: Record<string, any>;
  status: 'pending' | 'completed' | 'failed';
}

export interface AssistantReminder {
  id: string;
  title: string;
  dueTime: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
}

export interface AssistantNote {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
  tags: string[];
}

export interface AssistantPersona {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  accentColor: string;
  voicePitch: number;
  voiceRate: number;
}
