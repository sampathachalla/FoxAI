/**
 * Interface contracts, types, and constants for Fox AI Visualizer & Settings
 */

export type CoreShapeId = 'sphere' | 'torus' | 'icosahedron' | 'helix' | 'tesseract';

export type AssistantStatus = 'idle' | 'listening' | 'thinking' | 'speaking';

export interface CoreShapeConfig {
  id: CoreShapeId;
  name: string;
  tagline: string;
  description: string;
  iconName: string;
  particleCount: number;
  badge?: string;
}

export interface AccentTheme {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  glow: string;
  backgroundGlow: string;
  cssClass: string;
}

export const STORAGE_KEYS = {
  CORE_SHAPE: 'fox_core_shape_preference',
  SESSIONS: 'fox_sessions_v3',
  THEME: 'fox_accent_theme_v1',
  APP_MODE: 'fox_app_mode_v1',
  SETTINGS_TAB: 'fox_settings_tab_v1',
};

export const CORE_SHAPES: CoreShapeConfig[] = [
  {
    id: 'sphere',
    name: 'Holographic Sphere',
    tagline: 'Classic Intelligence Singularity',
    description: 'Multi-tiered particle sphere with voice wave cadences and J.A.R.V.I.S. orbital gimbal rings.',
    iconName: 'Globe',
    particleCount: 2400,
    badge: 'Pristine Core',
  },
  {
    id: 'torus',
    name: 'Quantum Torus',
    tagline: 'Toroidal Magnetic Flux Flow',
    description: 'Pulsing donut ring of continuous particle streams, accretion halos, and orbital laser pulses.',
    iconName: 'Disc',
    particleCount: 2408,
    badge: 'Vortex Ring',
  },
  {
    id: 'icosahedron',
    name: 'Cyber Icosahedron',
    tagline: '20-Faceted Crystalline Geometry',
    description: 'Geometric holographic crystal polyhedron with glowing vertices and rotating facet edges.',
    iconName: 'Hexagon',
    particleCount: 1680,
    badge: 'Holo Crystal',
  },
  {
    id: 'helix',
    name: 'Neural DNA Helix',
    tagline: 'Bio-Synthetic Neural Ladder',
    description: 'Dual braided particle waves undulating and twisting in 3D space with connecting base-pair rungs.',
    iconName: 'Dna',
    particleCount: 1324,
    badge: 'Dual Strand',
  },
  {
    id: 'tesseract',
    name: 'Hypercube Tesseract',
    tagline: '4-Dimensional Spatial Lattice',
    description: '4D-to-3D perspective projection of rotating nested hypercube lattices and cubic cells.',
    iconName: 'Boxes',
    particleCount: 1536,
    badge: '4D Projection',
  },
];

export const ACCENT_THEMES: AccentTheme[] = [
  {
    id: 'fox-cyan',
    name: 'Fox Cyan',
    primary: '#99FFFF',
    secondary: '#00E5FF',
    glow: 'rgba(153, 255, 255, 0.8)',
    backgroundGlow: 'radial-gradient(circle at 50% 50%, rgba(153, 255, 255, 0.28) 0%, rgba(0, 229, 255, 0.15) 35%, transparent 70%)',
    cssClass: 'theme-cyan',
  },
  {
    id: 'artistic-flair',
    name: 'Electric Azure',
    primary: '#007AFF',
    secondary: '#5856D6',
    glow: 'rgba(0, 122, 255, 0.75)',
    backgroundGlow: 'radial-gradient(circle at 50% 50%, rgba(0, 122, 255, 0.25) 0%, rgba(88, 86, 214, 0.15) 35%, transparent 70%)',
    cssClass: 'theme-azure',
  },
  {
    id: 'siri-intelligence',
    name: 'Apple Intelligence',
    primary: '#7B61FF',
    secondary: '#00F0FF',
    glow: 'rgba(123, 97, 255, 0.65)',
    backgroundGlow: 'radial-gradient(circle at 50% 50%, rgba(123, 97, 255, 0.22) 0%, rgba(0, 240, 255, 0.12) 35%, transparent 70%)',
    cssClass: 'theme-intelligence',
  },
  {
    id: 'siri-classic',
    name: 'Cosmic Violet',
    primary: '#9D4EDD',
    secondary: '#E0AAFF',
    glow: 'rgba(157, 78, 221, 0.65)',
    backgroundGlow: 'radial-gradient(circle at 50% 50%, rgba(157, 78, 221, 0.25) 0%, rgba(224, 170, 255, 0.10) 35%, transparent 70%)',
    cssClass: 'theme-violet',
  },
  {
    id: 'emerald-aura',
    name: 'Emerald Mint',
    primary: '#30D158',
    secondary: '#66D4CF',
    glow: 'rgba(48, 209, 88, 0.65)',
    backgroundGlow: 'radial-gradient(circle at 50% 50%, rgba(48, 209, 88, 0.25) 0%, rgba(102, 212, 207, 0.10) 35%, transparent 70%)',
    cssClass: 'theme-emerald',
  },
  {
    id: 'solar-amber',
    name: 'Solar Amber',
    primary: '#FF9F0A',
    secondary: '#FF453A',
    glow: 'rgba(255, 159, 10, 0.65)',
    backgroundGlow: 'radial-gradient(circle at 50% 50%, rgba(255, 159, 10, 0.25) 0%, rgba(255, 69, 58, 0.10) 35%, transparent 70%)',
    cssClass: 'theme-amber',
  },
  {
    id: 'titanium-frost',
    name: 'Titanium Frost',
    primary: '#E5E5EA',
    secondary: '#8E8E93',
    glow: 'rgba(229, 229, 234, 0.55)',
    backgroundGlow: 'radial-gradient(circle at 50% 50%, rgba(229, 229, 234, 0.15) 0%, rgba(142, 142, 147, 0.08) 35%, transparent 70%)',
    cssClass: 'theme-frost',
  },
];

export function isValidCoreShapeId(val: unknown): val is CoreShapeId {
  return (
    val === 'sphere' ||
    val === 'torus' ||
    val === 'icosahedron' ||
    val === 'helix' ||
    val === 'tesseract' ||
    val === 'dna_helix' // legacy alias
  );
}

export function normalizeCoreShapeId(val: unknown, fallback: CoreShapeId = 'sphere'): CoreShapeId {
  if (val === 'dna_helix' || val === 'helix') return 'helix';
  if (isValidCoreShapeId(val)) {
    return val as CoreShapeId;
  }
  return fallback;
}
