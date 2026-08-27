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
        id: 'gpt-4o',
        name: 'GPT-4o Omnimodal',
        providerId: 'openai',
        providerName: 'OpenAI',
        badge: 'Flagship Omni',
        description: 'High-speed flagship multimodal model across text, audio, and visual reasoning.',
        contextWindow: '128k Tokens',
        speed: 'Fast',
        iconColor: '#10b981',
        isPopular: true,
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        providerId: 'openai',
        providerName: 'OpenAI',
        badge: 'Fast & Efficient',
        description: 'Fast, lightweight and cost-effective engine for quick tasks and queries.',
        contextWindow: '128k Tokens',
        speed: 'Ultra Fast',
        iconColor: '#34d399',
        isPopular: true,
      },
      {
        id: 'o3-mini',
        name: 'o3-mini Reasoning',
        providerId: 'openai',
        providerName: 'OpenAI',
        badge: 'STEM & Math Logic',
        description: 'Specialized low-latency reasoning model for math, coding, and science.',
        contextWindow: '200k Tokens',
        speed: 'Deep Thinker',
        iconColor: '#059669',
      },
      {
        id: 'o1',
        name: 'o1 Deliberative',
        providerId: 'openai',
        providerName: 'OpenAI',
        badge: 'Full Reasoning',
        description: 'Full-deliberation reasoning model designed to solve complex system architectures.',
        contextWindow: '200k Tokens',
        speed: 'Deep Thinker',
        iconColor: '#047857',
      },
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        providerId: 'openai',
        providerName: 'OpenAI',
        badge: 'High Precision',
        description: 'Classic high-fidelity instruction follower with rich general knowledge.',
        contextWindow: '128k Tokens',
        speed: 'Balanced',
        iconColor: '#6ee7b7',
      },
    ],
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    shortName: 'Claude',
    badge: 'Constitutional AI',
    description: 'Nuanced writing, precise coding, and state-of-the-art reasoning',
    iconColor: '#f97316',
    models: [
      {
        id: 'claude-3-7-sonnet',
        name: 'Claude 3.7 Sonnet',
        providerId: 'anthropic',
        providerName: 'Anthropic Claude',
        badge: 'Hybrid Thinking',
        description: 'Leading-edge hybrid reasoning with instant response or deep extended thought.',
        contextWindow: '200k Tokens',
        speed: 'Fast',
        iconColor: '#f97316',
        isPopular: true,
      },
      {
        id: 'claude-3-5-sonnet',
        name: 'Claude 3.5 Sonnet',
        providerId: 'anthropic',
        providerName: 'Anthropic Claude',
        badge: 'Top Code & Logic',
        description: 'Benchmark-leading coding and complex analytical synthesis.',
        contextWindow: '200k Tokens',
        speed: 'Fast',
        iconColor: '#fb923c',
        isPopular: true,
      },
      {
        id: 'claude-3-5-haiku',
        name: 'Claude 3.5 Haiku',
        providerId: 'anthropic',
        providerName: 'Anthropic Claude',
        badge: 'Rapid Response',
        description: 'Ultra-fast conversational latency with crisp, nuanced articulation.',
        contextWindow: '200k Tokens',
        speed: 'Ultra Fast',
        iconColor: '#fdba74',
      },
      {
        id: 'claude-3-opus',
        name: 'Claude 3 Opus',
        providerId: 'anthropic',
        providerName: 'Anthropic Claude',
        badge: 'Deep Synthesis',
        description: 'Comprehensive research and high-complexity long-form synthesis.',
        contextWindow: '200k Tokens',
        speed: 'Balanced',
        iconColor: '#ea580c',
      },
    ],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    shortName: 'DeepSeek',
    badge: 'Open Weights',
    description: 'Open-architecture reasoning and high-efficiency MoE models',
    iconColor: '#3b82f6',
    models: [
      {
        id: 'deepseek-r1',
        name: 'DeepSeek R1',
        providerId: 'deepseek',
        providerName: 'DeepSeek',
        badge: 'Open Reasoning',
        description: 'Advanced open-weight reasoning model with full chain-of-thought distillation.',
        contextWindow: '128k Tokens',
        speed: 'Deep Thinker',
        iconColor: '#3b82f6',
        isPopular: true,
      },
      {
        id: 'deepseek-v3',
        name: 'DeepSeek V3',
        providerId: 'deepseek',
        providerName: 'DeepSeek',
        badge: '671B MoE',
        description: 'Massive mixture-of-experts general intelligence engine for broad tasks.',
        contextWindow: '128k Tokens',
        speed: 'Fast',
        iconColor: '#60a5fa',
      },
    ],
  },
  {
    id: 'groq',
    name: 'Groq LPUs',
    shortName: 'Groq',
    badge: 'Lightning LPU',
    description: 'Extreme speed inference powered by Language Processing Units',
    iconColor: '#f59e0b',
    models: [
      {
        id: 'llama-3.3-70b-versatile',
        name: 'Llama 3.3 70B (Groq)',
        providerId: 'groq',
        providerName: 'Groq LPUs',
        badge: '500+ Tokens/s',
        description: 'Meta flagship open intelligence hosted on ultra-low latency LPUs.',
        contextWindow: '128k Tokens',
        speed: 'Ultra Fast',
        iconColor: '#f59e0b',
        isPopular: true,
      },
      {
        id: 'mixtral-8x7b-32768',
        name: 'Mixtral 8x7B (Groq)',
        providerId: 'groq',
        providerName: 'Groq LPUs',
        badge: 'High Throughput',
        description: 'Fast 8-expert routing architecture for rapid conversational Q&A.',
        contextWindow: '32k Tokens',
        speed: 'Ultra Fast',
        iconColor: '#fbbf24',
      },
      {
        id: 'gemma2-9b-it',
        name: 'Gemma 2 9B (Groq)',
        providerId: 'groq',
        providerName: 'Groq LPUs',
        badge: 'Compact & Crisp',
        description: 'Google open weights running at sub-millisecond per-token latency.',
        contextWindow: '8k Tokens',
        speed: 'Ultra Fast',
        iconColor: '#d97706',
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
