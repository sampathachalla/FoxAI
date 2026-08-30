export interface AIModelOption {
  id: string;
  name: string;
  providerId: 'gemini' | 'openai' | 'anthropic' | 'deepseek' | 'groq' | 'ollama';
  providerName: string;
  badge: string;
  description: string;
  contextWindow: string;
  speed: 'Ultra Fast' | 'Fast' | 'Balanced' | 'Deep Thinker';
  iconColor: string;
  isPopular?: boolean;
}

export interface AIProviderOption {
  id: 'gemini' | 'openai' | 'anthropic' | 'deepseek' | 'groq' | 'ollama';
  name: string;
  shortName: string;
  badge: string;
  description: string;
  iconColor: string;
  models: AIModelOption[];
}

export const AI_PROVIDERS: AIProviderOption[] = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    shortName: 'Gemini',
    badge: 'Native Core',
    description: 'Ultra-fast multimodal intelligence with live search & tool grounding',
    iconColor: '#38bdf8',
    models: [
      {
        id: 'gemini-3.7-flash',
        name: 'Gemini 3.7 Flash',
        providerId: 'gemini',
        providerName: 'Google Gemini',
        badge: 'Hybrid Reasoning',
        description: 'Next-generation hybrid reasoning, low-latency conversational intelligence & search grounding.',
        contextWindow: '1M Tokens',
        speed: 'Ultra Fast',
        iconColor: '#38bdf8',
        isPopular: true,
      },
      {
        id: 'gemini-3.1-flash-lite',
        name: 'Gemini 3.1 Flash Lite',
        providerId: 'gemini',
        providerName: 'Google Gemini',
        badge: 'Lowest Latency',
        description: 'Ultra-lightweight high-throughput engine optimized for instant voice feedback.',
        contextWindow: '1M Tokens',
        speed: 'Ultra Fast',
        iconColor: '#0ea5e9',
      },
      {
        id: 'gemini-2.5-pro',
        name: 'Gemini 2.5 Pro',
        providerId: 'gemini',
        providerName: 'Google Gemini',
        badge: 'Deep Logic & Code',
        description: 'Advanced reasoning engine with deep multi-step code synthesis and analysis.',
        contextWindow: '2M Tokens',
        speed: 'Deep Thinker',
        iconColor: '#6366f1',
        isPopular: true,
      },
      {
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        providerId: 'gemini',
        providerName: 'Google Gemini',
        badge: 'Adaptive Multimodal',
        description: 'Balanced speed and high quality multimodal audio-visual generation.',
        contextWindow: '1M Tokens',
        speed: 'Fast',
        iconColor: '#818cf8',
      },
      {
        id: 'gemini-2.0-flash',
        name: 'Gemini 2.0 Flash',
        providerId: 'gemini',
        providerName: 'Google Gemini',
        badge: 'Production Ready',
        description: 'Standard workhorse model for daily chat and structured tool actions.',
        contextWindow: '1M Tokens',
        speed: 'Fast',
        iconColor: '#06b6d4',
      },
      {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        providerId: 'gemini',
        providerName: 'Google Gemini',
        badge: 'Massive Context',
        description: 'Massive 2M context window for processing long documents and histories.',
        contextWindow: '2M Tokens',
        speed: 'Balanced',
        iconColor: '#a855f7',
      },
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    shortName: 'OpenAI',
    badge: 'GPT Series',
    description: 'Industry standard omnimodal reasoning and conversational models',
    iconColor: '#10b981',
    models: [
      {
        id: 'gpt-5-nano',
        name: 'GPT-5 Nano',
        providerId: 'openai',
        providerName: 'OpenAI',
        badge: 'Primary Thinking Engine',
        description: 'Next-generation ultra-compact, low-latency reasoning and conversational intelligence model (gpt-5-nano / gpt-5-nano-2025-08-07).',
        contextWindow: '128k Tokens',
        speed: 'Ultra Fast',
        iconColor: '#10b981',
        isPopular: true,
      },
      {
        id: 'gpt-5-nano-2025-08-07',
        name: 'GPT-5 Nano (2025-08-07)',
        providerId: 'openai',
        providerName: 'OpenAI',
        badge: 'Pinned Snapshot',
        description: 'Exact dated snapshot identifier for the GPT-5 Nano reasoning model.',
        contextWindow: '128k Tokens',
        speed: 'Ultra Fast',
        iconColor: '#10b981',
      },
      {
        id: 'gpt-5-mini',
        name: 'GPT-5 Mini',
        providerId: 'openai',
        providerName: 'OpenAI',
        badge: 'Balanced Reasoning',
        description: 'Mid-tier fallback reasoning and conversational intelligence model.',
        contextWindow: '128k Tokens',
        speed: 'Fast',
        iconColor: '#10b981',
      },
      {
        id: 'gpt-5',
        name: 'GPT-5',
        providerId: 'openai',
        providerName: 'OpenAI',
        badge: 'Flagship Reasoning',
        description: 'Flagship reasoning and conversational intelligence model.',
        contextWindow: '128k Tokens',
        speed: 'Balanced',
        iconColor: '#10b981',
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        providerId: 'openai',
        providerName: 'OpenAI',
        badge: 'Legacy Fallback',
        description: 'Fast, lightweight and cost-effective engine used as the final fallback.',
        contextWindow: '128k Tokens',
        speed: 'Ultra Fast',
        iconColor: '#34d399',
      },
    ],
  },
  {
    id: 'ollama',
    name: 'Local Ollama',
    shortName: 'Local LLM',
    badge: 'Self-Hosted / ngrok',
    description: 'On-device and self-hosted private local models running via your custom LLM API endpoint',
    iconColor: '#a855f7',
    models: [
      {
        id: 'qwen2.5:0.5b',
        name: 'Qwen 2.5 (0.5B Local)',
        providerId: 'ollama',
        providerName: 'Local Ollama',
        badge: 'Default Fast',
        description: 'Ultra-compact high-speed local model with exceptional reasoning-per-parameter.',
        contextWindow: '32k Tokens',
        speed: 'Ultra Fast',
        iconColor: '#a855f7',
        isPopular: true,
      },
      {
        id: 'llama3.2:1b',
        name: 'Llama 3.2 (1B Local)',
        providerId: 'ollama',
        providerName: 'Local Ollama',
        badge: 'Edge Mobile',
        description: 'Lightweight on-device Meta model optimized for quick conversational turns.',
        contextWindow: '128k Tokens',
        speed: 'Ultra Fast',
        iconColor: '#c084fc',
        isPopular: true,
      },
      {
        id: 'gemma3:1b',
        name: 'Gemma 3 (1B Local)',
        providerId: 'ollama',
        providerName: 'Local Ollama',
        badge: 'Google Edge',
        description: 'Google next-gen lightweight open model with rich comprehension.',
        contextWindow: '32k Tokens',
        speed: 'Fast',
        iconColor: '#38bdf8',
      },
      {
        id: 'qwen3:1.7b',
        name: 'Qwen 3 (1.7B Local)',
        providerId: 'ollama',
        providerName: 'Local Ollama',
        badge: 'High Accuracy',
        description: 'Enhanced multilingual reasoning and deep contextual recall.',
        contextWindow: '32k Tokens',
        speed: 'Fast',
        iconColor: '#e879f9',
      },
      {
        id: 'smollm2:360m',
        name: 'SmolLM2 (360M Local)',
        providerId: 'ollama',
        providerName: 'Local Ollama',
        badge: 'Micro Edge',
        description: 'Ultra-lightweight micro model for instant offline responses on any device.',
        contextWindow: '8k Tokens',
        speed: 'Ultra Fast',
        iconColor: '#f43f5e',
      },
    ],
  },
];

export const ALL_MODELS: AIModelOption[] = AI_PROVIDERS.flatMap((p) => p.models);

export function getModelById(modelIdOrName: string): AIModelOption {
  const found = ALL_MODELS.find(
    (m) =>
      m.id.toLowerCase() === modelIdOrName.toLowerCase() ||
      m.name.toLowerCase() === modelIdOrName.toLowerCase() ||
      modelIdOrName.toLowerCase().includes(m.id.toLowerCase()) ||
      m.name.toLowerCase().includes(modelIdOrName.toLowerCase())
  );
  return found || ALL_MODELS[0];
}

export function getProviderById(providerId: string): AIProviderOption {
  const found = AI_PROVIDERS.find((p) => p.id === providerId);
  return found || AI_PROVIDERS[0];
}
