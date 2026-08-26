export interface DeepgramVoiceInfo {
  id: string;
  name: string;
  gender: 'female' | 'male';
  accent: string;
  description: string;
  family: 'Aura-2' | 'Aura-1';
  sampleText?: string;
  recommended?: boolean;
}

export const DEEPGRAM_AURA_VOICES: DeepgramVoiceInfo[] = [
  {
    id: 'aura-2-asteria-en',
    name: 'Asteria (Aura 2)',
    gender: 'female',
    accent: 'US English',
    description: 'Natural, conversational, clear and expressive female voice',
    family: 'Aura-2',
    recommended: true,
  },
  {
    id: 'aura-2-orion-en',
    name: 'Orion (Aura 2)',
    gender: 'male',
    accent: 'US English',
    description: 'Warm, approachable, conversational and confident male voice',
    family: 'Aura-2',
    recommended: true,
  },
  {
    id: 'aura-2-luna-en',
    name: 'Luna (Aura 2)',
    gender: 'female',
    accent: 'US English',
    description: 'Soft, gentle, soothing and empathetic female voice',
    family: 'Aura-2',
  },
  {
    id: 'aura-2-stella-en',
    name: 'Stella (Aura 2)',
    gender: 'female',
    accent: 'US English',
    description: 'Energetic, crisp, engaging and modern female voice',
    family: 'Aura-2',
  },
  {
    id: 'aura-2-athena-en',
    name: 'Athena (Aura 2)',
    gender: 'female',
    accent: 'British English (UK)',
    description: 'Sophisticated, elegant, refined British female voice',
    family: 'Aura-2',
  },
  {
    id: 'aura-2-hera-en',
    name: 'Hera (Aura 2)',
    gender: 'female',
    accent: 'US English',
    description: 'Authoritative, executive, polished professional female voice',
    family: 'Aura-2',
  },
  {
    id: 'aura-2-arcas-en',
    name: 'Arcas (Aura 2)',
    gender: 'male',
    accent: 'US English',
    description: 'Deep, grounded, calm and natural male voice',
    family: 'Aura-2',
  },
  {
    id: 'aura-2-perseus-en',
    name: 'Perseus (Aura 2)',
    gender: 'male',
    accent: 'US English',
    description: 'Friendly, casual, upbeat and engaging male voice',
    family: 'Aura-2',
  },
  {
    id: 'aura-2-angus-en',
    name: 'Angus (Aura 2)',
    gender: 'male',
    accent: 'Irish English',
    description: 'Charismatic, melodic, authentic Irish male voice',
    family: 'Aura-2',
  },
  {
    id: 'aura-2-orpheus-en',
    name: 'Orpheus (Aura 2)',
    gender: 'male',
    accent: 'US English',
    description: 'Dynamic, expressive, versatile male voice',
    family: 'Aura-2',
  },
  {
    id: 'aura-2-helios-en',
    name: 'Helios (Aura 2)',
    gender: 'male',
    accent: 'British English (UK)',
    description: 'Polished, distinguished, articulate British male voice',
    family: 'Aura-2',
  },
  {
    id: 'aura-2-zeus-en',
    name: 'Zeus (Aura 2)',
    gender: 'male',
    accent: 'US English',
    description: 'Resonant, powerful, authoritative male voice',
    family: 'Aura-2',
  },
  {
    id: 'aura-asteria-en',
    name: 'Asteria (Aura 1)',
    gender: 'female',
    accent: 'US English',
    description: 'Classic Aura-1 conversational female voice',
    family: 'Aura-1',
  },
  {
    id: 'aura-orion-en',
    name: 'Orion (Aura 1)',
    gender: 'male',
    accent: 'US English',
    description: 'Classic Aura-1 conversational male voice',
    family: 'Aura-1',
  },
];

export function getDeepgramApiKey(): string | null {
  const key =
    process.env.DEEPGRAM_API_KEY ||
    process.env.deepgram_api_key ||
    process.env.DEEPGRAM_KEY ||
    process.env.deepgram_key;
  return key ? key.trim() : null;
}

export function hasDeepgramKey(): boolean {
  return Boolean(getDeepgramApiKey());
}

export async function synthesizeDeepgramSpeech(
  text: string,
  model: string = 'aura-2-asteria-en'
): Promise<Buffer> {
  const apiKey = getDeepgramApiKey();
  if (!apiKey) {
    throw new Error('Deepgram API key is not configured in environment secrets.');
  }

  // Clean markdown syntax or URLs from text before speaking
  const cleanText = text
    .replace(/[*_~`#\[\]\(\)>]/g, '')
    .replace(/https?:\/\/\S+/g, 'link')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleanText) {
    throw new Error('Text is required for speech synthesis.');
  }

  const selectedModel = model || 'aura-2-asteria-en';
  const url = `https://api.deepgram.com/v1/speak?model=${encodeURIComponent(selectedModel)}&encoding=mp3`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Token ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: cleanText }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => 'Unknown Deepgram error');
    throw new Error(`Deepgram TTS request failed (${response.status}): ${errText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
