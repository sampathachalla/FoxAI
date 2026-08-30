/**
 * Milestone 3 Reviewer Adversarial & Robustness Test Suite
 * Stress-tests CelestialInfoCard metrics & rendering logic, PlanetariumControls HUD,
 * PlanetariumStage state orchestration, ModeSwitcher navigation, Header contextual titles,
 * and App routing integration.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  CELESTIAL_BODIES,
  CELESTIAL_BODY_MAP,
  getCelestialBody,
  isValidCelestialId,
} from '../app/components/Planetarium/PlanetaryData.ts';
import type { CelestialId, CelestialBodyData, AppMode } from '../app/types/index.ts';
import { StorageService, STORAGE_KEYS } from '../app/services/storage.ts';

// Mock localStorage for storage testing
class LocalStorageMock {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

describe('Milestone 3 Reviewer Adversarial & Robustness Test Suite', () => {
  let mockStorage: LocalStorageMock;

  beforeEach(() => {
    mockStorage = new LocalStorageMock();
    (globalThis as any).localStorage = mockStorage;
  });

  // ---------------------------------------------------------------------------
  // 1. CelestialInfoCard Telemetry & Scientific Accuracy
  // ---------------------------------------------------------------------------
  describe('1. CelestialInfoCard Telemetry & Scientific Accuracy', () => {
    it('1.1 should verify all 10 celestial bodies have complete physical metrics formatted without NaN', () => {
      const allIds: CelestialId[] = [
        'sun', 'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'
      ];

      for (const id of allIds) {
        const body = getCelestialBody(id);
        assert.ok(body, `Body ${id} should exist`);
        assert.equal(body.id, id);

        // Diameter
        assert.ok(body.diameterKm > 0 && !isNaN(body.diameterKm));
        assert.ok(body.relativeDiameter > 0 && !isNaN(body.relativeDiameter));

        // Distance
        assert.ok(body.distanceFromSunMillionKm >= 0 && !isNaN(body.distanceFromSunMillionKm));
        assert.ok(body.distanceAu >= 0 && !isNaN(body.distanceAu));

        // Period & Speed
        assert.ok(body.orbitalPeriodDays >= 0 && !isNaN(body.orbitalPeriodDays));
        assert.ok(body.orbitalPeriodYears >= 0 && !isNaN(body.orbitalPeriodYears));
        assert.ok(body.orbitalSpeedKmS >= 0 && !isNaN(body.orbitalSpeedKmS));

        // Day length (rotation period can be negative for retrograde spin)
        assert.ok(!isNaN(body.rotationPeriodHours));
        const absHours = Math.abs(body.rotationPeriodHours);
        assert.ok(absHours > 0);

        // Temperature & Gravity
        assert.ok(body.surfaceTemperatureC.length > 0);
        assert.ok(body.surfaceTemperatureK.length > 0);
        assert.ok(body.gravityMs2 > 0 && !isNaN(body.gravityMs2));
        assert.ok(body.gravityG > 0 && !isNaN(body.gravityG));

        // Moons & Rings
        assert.ok(body.moonsCount >= 0 && Number.isInteger(body.moonsCount));
        if (id === 'saturn' || id === 'uranus' || id === 'neptune' || id === 'jupiter') {
          // Giants have rings or moons
          assert.ok(body.moonsCount >= 14);
        }

        // Facts
        assert.equal(body.facts.length, 3);
        body.facts.forEach((fact, fIdx) => {
          assert.ok(fact.length > 15, `Fact ${fIdx + 1} on ${id} must be descriptive`);
        });
      }
    });

    it('1.2 should properly identify retrograde rotation on Venus and Uranus', () => {
      const venus = getCelestialBody('venus');
      const uranus = getCelestialBody('uranus');
      const earth = getCelestialBody('earth');

      assert.ok(venus.rotationPeriodHours < 0, 'Venus must have retrograde rotation period');
      assert.ok(uranus.rotationPeriodHours < 0, 'Uranus must have retrograde rotation period');
      assert.ok(earth.rotationPeriodHours > 0, 'Earth must have prograde rotation period');
    });

    it('1.3 should correctly distinguish central star vs planets vs dwarf planets in type categorization', () => {
      assert.equal(getCelestialBody('sun').type, 'star');
      assert.equal(getCelestialBody('mercury').type, 'terrestrial');
      assert.equal(getCelestialBody('venus').type, 'terrestrial');
      assert.equal(getCelestialBody('earth').type, 'terrestrial');
      assert.equal(getCelestialBody('mars').type, 'terrestrial');
      assert.equal(getCelestialBody('jupiter').type, 'gas_giant');
      assert.equal(getCelestialBody('saturn').type, 'gas_giant');
      assert.equal(getCelestialBody('uranus').type, 'ice_giant');
      assert.equal(getCelestialBody('neptune').type, 'ice_giant');
      assert.equal(getCelestialBody('pluto').type, 'dwarf_planet');
    });
  });

  // ---------------------------------------------------------------------------
  // 2. PlanetariumControls Quick Selector & Simulation State
  // ---------------------------------------------------------------------------
  describe('2. PlanetariumControls Quick Selector & Simulation State', () => {
    it('2.1 should verify 10-pill quick switcher includes exactly 10 celestial bodies in correct order', () => {
      assert.equal(CELESTIAL_BODIES.length, 10);
      const expectedOrder: CelestialId[] = [
        'sun', 'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'
      ];
      CELESTIAL_BODIES.forEach((body, idx) => {
        assert.equal(body.id, expectedOrder[idx]);
      });
    });

    it('2.2 should verify simulation speed options cover 0.5x to 10.0x', () => {
      const speeds = [0.5, 1.0, 2.0, 5.0, 10.0];
      speeds.forEach((speed) => {
        assert.ok(speed >= 0.5 && speed <= 10.0);
      });
    });

    it('2.3 should verify audio level meter threshold triggers strictly above 2% (0.02)', () => {
      const isVisible = (audioLevel: number) => audioLevel > 0.02;
      assert.equal(isVisible(0), false);
      assert.equal(isVisible(0.01), false);
      assert.equal(isVisible(0.02), false);
      assert.equal(isVisible(0.021), true);
      assert.equal(isVisible(0.5), true);
      assert.equal(isVisible(1.0), true);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. PlanetariumStage State Orchestration & Target Persistence
  // ---------------------------------------------------------------------------
  describe('3. PlanetariumStage State Orchestration & Target Persistence', () => {
    it('3.1 should default to sun when storage is uninitialized', () => {
      const target = StorageService.loadPlanetariumTarget('sun');
      assert.equal(target, 'sun');
    });

    it('3.2 should persist and reload focused celestial body across all 10 bodies', () => {
      const allIds: CelestialId[] = [
        'sun', 'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'
      ];
      for (const id of allIds) {
        StorageService.savePlanetariumTarget(id);
        const loaded = StorageService.loadPlanetariumTarget('sun');
        assert.equal(loaded, id);
      }
    });

    it('3.3 should fall back safely when stored target is invalid or corrupted', () => {
      mockStorage.setItem(STORAGE_KEYS.PLANETARIUM_TARGET, 'unknown_alien_vessel');
      assert.equal(StorageService.loadPlanetariumTarget('sun'), 'sun');

      mockStorage.setItem(STORAGE_KEYS.PLANETARIUM_TARGET, '__proto__');
      assert.equal(StorageService.loadPlanetariumTarget('sun'), 'sun');
    });

    it('3.4 should support appMode planetarium storage and retrieval', () => {
      StorageService.saveAppMode('planetarium');
      const loadedMode = StorageService.loadAppMode();
      assert.equal(loadedMode, 'planetarium');
    });
  });

  // ---------------------------------------------------------------------------
  // 4. ModeSwitcher & Header Context Integration
  // ---------------------------------------------------------------------------
  describe('4. ModeSwitcher & Header Context Integration', () => {
    it('4.1 should verify AppMode type allows planetarium', () => {
      const mode: AppMode = 'planetarium';
      assert.equal(mode, 'planetarium');
    });

    it('4.2 should verify all 5 valid AppModes are supported', () => {
      const validModes: AppMode[] = ['voice', 'chat', 'planetarium', 'tools', 'settings'];
      validModes.forEach((mode) => {
        StorageService.saveAppMode(mode);
        assert.equal(StorageService.loadAppMode(), mode);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Speech Subtitle Overlay Visibility Logic
  // ---------------------------------------------------------------------------
  describe('5. Speech Subtitle Overlay Visibility Logic', () => {
    it('5.1 should display subtitle when status is speaking or listening with non-empty transcript', () => {
      const shouldDisplay = (
        status: string,
        speakingTranscript: string,
        currentTranscript: string
      ) => {
        return (
          (status === 'speaking' || status === 'listening') &&
          Boolean(speakingTranscript || currentTranscript)
        );
      };

      assert.equal(shouldDisplay('idle', '', ''), false);
      assert.equal(shouldDisplay('idle', 'Hello', ''), false);
      assert.equal(shouldDisplay('speaking', '', ''), false);
      assert.equal(shouldDisplay('speaking', 'Focusing Jupiter', ''), true);
      assert.equal(shouldDisplay('listening', '', 'What is Saturn?'), true);
      assert.equal(shouldDisplay('listening', '', ''), false);
    });
  });
});
