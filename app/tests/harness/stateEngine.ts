/**
 * Mock Assistant Context & Storage State Engine for Fox AI 3D Planetarium Mode
 */

import {
  type AppMode,
  type CelestialId,
  STORAGE_KEYS,
  isValidAppMode,
  normalizeAppMode,
  isValidCelestialId,
  normalizeCelestialId,
} from './types.ts';

export interface PlanetariumState {
  appMode: AppMode;
  focusedCelestial: CelestialId;
  simulationSpeed: number;
  isPaused: boolean;
  audioLevel: number;
  hoveredCelestial: CelestialId | null;
  cameraYaw: number;
  cameraPitch: number;
  cameraZoom: number;
}

export class MockStorageService {
  private storage: Storage;

  constructor(storage: Storage = (globalThis as any).localStorage) {
    this.storage = storage;
  }

  loadAppMode(fallback: AppMode = 'voice'): AppMode {
    try {
      const val = this.storage.getItem(STORAGE_KEYS.APP_MODE);
      if (!val) return fallback;
      return normalizeAppMode(val, fallback);
    } catch {
      return fallback;
    }
  }

  saveAppMode(mode: AppMode): boolean {
    try {
      if (!isValidAppMode(mode)) return false;
      this.storage.setItem(STORAGE_KEYS.APP_MODE, mode);
      return true;
    } catch {
      return false;
    }
  }

  loadPlanetariumTarget(fallback: CelestialId = 'sun'): CelestialId {
    try {
      const val = this.storage.getItem(STORAGE_KEYS.PLANETARIUM_TARGET);
      if (!val) return fallback;
      return normalizeCelestialId(val, fallback);
    } catch {
      return fallback;
    }
  }

  savePlanetariumTarget(target: CelestialId): boolean {
    try {
      if (!isValidCelestialId(target)) return false;
      this.storage.setItem(STORAGE_KEYS.PLANETARIUM_TARGET, target);
      return true;
    } catch {
      return false;
    }
  }
}

export class MockAssistantContext {
  public state: PlanetariumState;
  private listeners: Set<(state: PlanetariumState) => void> = new Set();
  private storageService: MockStorageService;

  constructor(initialStorage?: Storage) {
    this.storageService = new MockStorageService(initialStorage);
    const initialMode = this.storageService.loadAppMode('voice');
    const initialTarget = this.storageService.loadPlanetariumTarget('sun');

    this.state = {
      appMode: initialMode,
      focusedCelestial: initialTarget,
      simulationSpeed: 1.0,
      isPaused: false,
      audioLevel: 0,
      hoveredCelestial: null,
      cameraYaw: 0.45,
      cameraPitch: 0.55,
      cameraZoom: 560,
    };
  }

  subscribe(listener: (state: PlanetariumState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn({ ...this.state }));
  }

  setAppMode(mode: AppMode): void {
    const validMode = normalizeAppMode(mode, 'voice');
    this.state.appMode = validMode;
    this.storageService.saveAppMode(validMode);
    this.notify();
  }

  setFocusedCelestial(id: CelestialId): void {
    const validId = normalizeCelestialId(id, 'sun');
    this.state.focusedCelestial = validId;
    this.storageService.savePlanetariumTarget(validId);
    this.notify();
  }

  setSimulationSpeed(speed: number): void {
    // Clamped [0.1, 10.0] with NaN fallback
    if (typeof speed !== 'number' || Number.isNaN(speed)) {
      this.state.simulationSpeed = 1.0;
    } else {
      this.state.simulationSpeed = Math.max(0.1, Math.min(10.0, speed));
    }
    this.notify();
  }

  togglePause(): void {
    this.state.isPaused = !this.state.isPaused;
    this.notify();
  }

  setAudioLevel(level: number): void {
    if (typeof level !== 'number' || Number.isNaN(level)) {
      this.state.audioLevel = 0;
    } else {
      this.state.audioLevel = Math.max(0, Math.min(1.0, level));
    }
    this.notify();
  }

  setHoveredCelestial(id: CelestialId | null): void {
    this.state.hoveredCelestial = id ? normalizeCelestialId(id, 'sun') : null;
    this.notify();
  }

  resetCamera(): void {
    this.state.cameraYaw = 0.45;
    this.state.cameraPitch = 0.55;
    this.state.cameraZoom = 560;
    this.state.focusedCelestial = 'sun';
    this.storageService.savePlanetariumTarget('sun');
    this.notify();
  }
}
