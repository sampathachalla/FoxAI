import { AccentTheme } from '../types';

export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export const ACCENT_THEMES: AccentTheme[] = [
  {
    id: 'fox-cyan',
    name: 'Fox Cyan (#99FFFF)',
    primary: '#99FFFF',
    secondary: '#00E5FF',
    glow: 'rgba(153, 255, 255, 0.8)',
    backgroundGlow: 'radial-gradient(circle at 50% 40%, rgba(153, 255, 255, 0.28) 0%, rgba(0, 229, 255, 0.15) 45%, transparent 75%)',
    cssClass: 'from-[#99FFFF] via-[#00E5FF] to-[#38BDF8]',
  },
  {
    id: 'artistic-flair',
    name: 'Electric Azure',
    primary: '#007AFF',
    secondary: '#5856D6',
    glow: 'rgba(0, 122, 255, 0.75)',
    backgroundGlow: 'radial-gradient(circle at 50% 40%, rgba(0, 122, 255, 0.25) 0%, rgba(88, 86, 214, 0.15) 45%, transparent 75%)',
    cssClass: 'from-[#007AFF] via-[#5856D6] to-[#00F0FF]',
  },
  {
    id: 'siri-intelligence',
    name: 'Apple Intelligence',
    primary: '#7B61FF',
    secondary: '#00F0FF',
    glow: 'rgba(123, 97, 255, 0.65)',
    backgroundGlow: 'radial-gradient(circle at 50% 40%, rgba(123, 97, 255, 0.22) 0%, rgba(0, 240, 255, 0.12) 40%, transparent 75%)',
    cssClass: 'from-indigo-500 via-purple-500 to-cyan-400',
  },
  {
    id: 'siri-classic',
    name: 'Cosmic Violet',
    primary: '#9D4EDD',
    secondary: '#E0AAFF',
    glow: 'rgba(157, 78, 221, 0.65)',
    backgroundGlow: 'radial-gradient(circle at 50% 40%, rgba(157, 78, 221, 0.25) 0%, rgba(224, 170, 255, 0.1) 40%, transparent 75%)',
    cssClass: 'from-purple-600 via-fuchsia-500 to-pink-400',
  },
  {
    id: 'emerald-aura',
    name: 'Emerald Mint',
    primary: '#30D158',
    secondary: '#66D4CF',
    glow: 'rgba(48, 209, 88, 0.65)',
    backgroundGlow: 'radial-gradient(circle at 50% 40%, rgba(48, 209, 88, 0.25) 0%, rgba(102, 212, 207, 0.1) 40%, transparent 75%)',
    cssClass: 'from-emerald-500 via-teal-400 to-cyan-300',
  },
  {
    id: 'solar-amber',
    name: 'Solar Amber',
    primary: '#FF9F0A',
    secondary: '#FF453A',
    glow: 'rgba(255, 159, 10, 0.65)',
    backgroundGlow: 'radial-gradient(circle at 50% 40%, rgba(255, 159, 10, 0.25) 0%, rgba(255, 69, 58, 0.1) 40%, transparent 75%)',
    cssClass: 'from-amber-500 via-orange-500 to-rose-400',
  },
  {
    id: 'titanium-frost',
    name: 'Titanium Frost',
    primary: '#E5E5EA',
    secondary: '#8E8E93',
    glow: 'rgba(229, 229, 234, 0.55)',
    backgroundGlow: 'radial-gradient(circle at 50% 40%, rgba(255, 255, 255, 0.15) 0%, rgba(142, 142, 147, 0.08) 40%, transparent 75%)',
    cssClass: 'from-zinc-200 via-slate-400 to-zinc-600',
  },
];
