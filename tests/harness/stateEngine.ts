/**
 * State & Persistence Mock Engine for Assistant Context & Settings UI Testing
 */

import type { CoreShapeId, CoreShapeConfig, AccentTheme } from './types.ts';
import {
  CORE_SHAPES,
  STORAGE_KEYS,
  isValidCoreShapeId,
  normalizeCoreShapeId,
  ACCENT_THEMES,
} from './types.ts';

export class AssistantStateMockEngine {
  private currentShape: CoreShapeId;
  private currentTheme: AccentTheme;
  private currentStatus: 'idle' | 'listening' | 'thinking' | 'speaking' = 'idle';
  private audioLevel: number = 0;
  private subscribers: Array<(shape: CoreShapeId) => void> = [];
  private themeSubscribers: Array<(theme: AccentTheme) => void> = [];
  public chimePlayCount: number = 0;
  public lastChimeType: string | null = null;

  constructor(initialShape?: CoreShapeId, initialThemeId: string = 'fox-cyan') {
    this.currentShape = initialShape || this.loadPersistedShape();
    this.currentTheme = ACCENT_THEMES.find((t) => t.id === initialThemeId) || ACCENT_THEMES[0];
  }

  loadPersistedShape(fallback: CoreShapeId = 'sphere'): CoreShapeId {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem(STORAGE_KEYS.CORE_SHAPE);
        if (saved) {
          return normalizeCoreShapeId(saved, fallback);
        }
      }
    } catch (e) {
      console.warn('[Storage] Error loading core shape:', e);
    }
    return fallback;
  }

  savePersistedShape(shape: CoreShapeId): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.CORE_SHAPE, shape);
      }
    } catch (e) {
      console.warn('[Storage] Error saving core shape:', e);
    }
  }

  getCoreShape(): CoreShapeId {
    return this.currentShape;
  }

  setCoreShape(shape: CoreShapeId): void {
    const validated = normalizeCoreShapeId(shape, 'sphere');
    this.currentShape = validated;
    this.savePersistedShape(validated);
    this.notifySubscribers(validated);
  }

  // 1-Click Settings Switch with Audio Chime Simulation
  selectShapeFromSettings(shape: CoreShapeId): void {
    this.playChime('click');
    this.setCoreShape(shape);
  }

  playChime(type: string = 'click'): void {
    this.chimePlayCount++;
    this.lastChimeType = type;
  }

  getAccentTheme(): AccentTheme {
    return this.currentTheme;
  }

  setAccentTheme(theme: AccentTheme): void {
    this.currentTheme = theme;
    this.notifyThemeSubscribers(theme);
  }

  getStatus(): 'idle' | 'listening' | 'thinking' | 'speaking' {
    return this.currentStatus;
  }

  setStatus(status: 'idle' | 'listening' | 'thinking' | 'speaking'): void {
    this.currentStatus = status;
  }

  getAudioLevel(): number {
    return this.audioLevel;
  }

  setAudioLevel(level: number): void {
    this.audioLevel = Math.max(0, Math.min(1, level));
  }

  subscribe(callback: (shape: CoreShapeId) => void): () => void {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter((cb) => cb !== callback);
    };
  }

  subscribeTheme(callback: (theme: AccentTheme) => void): () => void {
    this.themeSubscribers.push(callback);
    return () => {
      this.themeSubscribers = this.themeSubscribers.filter((cb) => cb !== callback);
    };
  }

  private notifySubscribers(shape: CoreShapeId): void {
    for (const sub of this.subscribers) {
      sub(shape);
    }
  }

  private notifyThemeSubscribers(theme: AccentTheme): void {
    for (const sub of this.themeSubscribers) {
      sub(theme);
    }
  }

  getAvailableShapes(): CoreShapeConfig[] {
    return CORE_SHAPES;
  }
}
