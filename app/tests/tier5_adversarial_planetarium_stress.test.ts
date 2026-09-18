/**
 * Tier 5 Adversarial: Planetarium Navigation, State Sync, Persistence & Stress Harness
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  CELESTIAL_BODIES,
  CELESTIAL_BODY_MAP,
  type CelestialId,
  STORAGE_KEYS,
} from './harness/types.ts';

import {
  PlanetariumEngine,
  CAMERA_DEFAULTS,
} from './harness/planetariumEngine.ts';

import {
  MockAssistantContext,
  MockStorageService,
} from './harness/stateEngine.ts';

import { setupTestEnvironment } from './harness/domMock.ts';

describe('Tier 5 Adversarial: Planetarium Navigation, State Sync & Persistence Stress', () => {
  let env: ReturnType<typeof setupTestEnvironment>;
  let context: MockAssistantContext;

  beforeEach(() => {
    env = setupTestEnvironment();
    context = new MockAssistantContext(env.localStorage);
  });

  // ---------------------------------------------------------------------------
  // 1. Rapid 1-Click Planet Carousel Switching & Performance Stress
  // ---------------------------------------------------------------------------
  describe('1. Rapid 1-Click Planet Carousel Switching & Performance Stress', () => {
    it('1.1 should execute 1,000 rapid sequential planet switches without stalling or state corruption', () => {
      const allIds: CelestialId[] = [
        'sun', 'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'
      ];
      const t0 = performance.now();
      for (let i = 0; i < 1000; i++) {
        const target = allIds[i % allIds.length];
        context.setFocusedCelestial(target);
      }
      const duration = performance.now() - t0;
      assert.equal(context.state.focusedCelestial, 'pluto');
      assert.ok(duration < 250, `1,000 switches took ${duration.toFixed(2)}ms (< 250ms budget)`);
    });

    it('1.2 should execute 500 chaotic randomized planet switches with zero coordinate drift', () => {
      const allIds: CelestialId[] = [
        'sun', 'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'
      ];
      for (let i = 0; i < 500; i++) {
        const randIdx = Math.floor(Math.random() * allIds.length);
        const target = allIds[randIdx];
        context.setFocusedCelestial(target);
        const frame = PlanetariumEngine.renderFrame(i * 0.1, {
          ...CAMERA_DEFAULTS,
          targetFocus: target,
        });
        const centered = frame.projectedBodies.find((b) => b.id === target)!;
        assert.equal(Math.round(centered.screenX), 600);
        assert.equal(Math.round(centered.screenY), 400);
      }
      assert.ok(true);
    });

    it('1.3 should maintain strictly bounded body counts (10) across continuous updates', () => {
      for (let i = 0; i < 100; i++) {
        const frame = PlanetariumEngine.renderFrame(i * 0.05, CAMERA_DEFAULTS);
        assert.equal(frame.projectedBodies.length, 10);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Synchronization between AssistantContext, Controls, Info Card, and Canvas
  // ---------------------------------------------------------------------------
  describe('2. Synchronization between AssistantContext, Controls, Info Card, and Canvas', () => {
    it('2.1 should notify all subscribers synchronously on 1-click planet selection', () => {
      let notifiedCount = 0;
      let lastTarget = '';

      context.subscribe((state) => {
        notifiedCount++;
        lastTarget = state.focusedCelestial;
      });

      context.setFocusedCelestial('saturn');
      assert.equal(notifiedCount, 1);
      assert.equal(lastTarget, 'saturn');
    });

    it('2.2 should ensure all 10 celestial bodies have complete metadata, descriptions, and 3 facts', () => {
      CELESTIAL_BODIES.forEach((body) => {
        assert.ok(body.tagline.length > 5);
        assert.ok(body.description.length > 20);
        assert.equal(body.facts.length, 3);
        assert.ok(body.color.startsWith('#'));
        assert.ok(body.glowColor.startsWith('rgba('));
      });
    });

    it('2.3 should preserve state consistency across concurrent mode and target switches', () => {
      context.setAppMode('planetarium');
      context.setFocusedCelestial('jupiter');
      context.setSimulationSpeed(2.5);

      assert.equal(context.state.appMode, 'planetarium');
      assert.equal(context.state.focusedCelestial, 'jupiter');
      assert.equal(context.state.simulationSpeed, 2.5);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. localStorage Persistence & Fault Tolerance
  // ---------------------------------------------------------------------------
  describe('3. localStorage Persistence & Fault Tolerance', () => {
    it('3.1 should correctly persist and load all 10 valid CelestialIds', () => {
      const storage = new MockStorageService(env.localStorage);
      CELESTIAL_BODIES.forEach((body) => {
        storage.savePlanetariumTarget(body.id);
        assert.equal(storage.loadPlanetariumTarget(), body.id);
      });
    });

    it('3.2 should gracefully fall back to default when localStorage contains invalid keys', () => {
      const storage = new MockStorageService(env.localStorage);
      env.localStorage.setItem(STORAGE_KEYS.PLANETARIUM_TARGET, 'unknown_exoplanet_99');
      assert.equal(storage.loadPlanetariumTarget(), 'sun');
    });

    it('3.3 should safely handle corrupted JSON, raw object strings, and prototype pollution attempts', () => {
      const storage = new MockStorageService(env.localStorage);
      const attackStrings = [
        '{"__proto__":{"polluted":true}}',
        'constructor',
        'toString',
        '<script>alert("hack")</script>',
        'null',
        'undefined',
        'NaN',
        '99999',
      ];
      attackStrings.forEach((attack) => {
        env.localStorage.setItem(STORAGE_KEYS.PLANETARIUM_TARGET, attack);
        assert.equal(storage.loadPlanetariumTarget(), 'sun');
      });
    });

    it('3.4 should safely catch and recover from QuotaExceededError during savePlanetariumTarget', () => {
      env.localStorage.quotaErrorTrigger = true;
      const storage = new MockStorageService(env.localStorage);
      const ok = storage.savePlanetariumTarget('mars');
      assert.equal(ok, false);
    });

    it('3.5 should safely catch and recover when localStorage throws SecurityError', () => {
      const blockedStorage: Storage = {
        getItem: () => { throw new Error('SecurityError: Access Denied'); },
        setItem: () => { throw new Error('SecurityError: Access Denied'); },
        removeItem: () => { throw new Error('SecurityError: Access Denied'); },
        clear: () => { throw new Error('SecurityError: Access Denied'); },
        key: () => null,
        length: 0,
      };
      const storage = new MockStorageService(blockedStorage);
      assert.equal(storage.loadPlanetariumTarget(), 'sun');
      assert.equal(storage.loadAppMode(), 'voice');
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Audio Reactivity Spectrum & Solar/Ring Shimmer
  // ---------------------------------------------------------------------------
  describe('4. Audio Reactivity Spectrum & Solar/Ring Shimmer', () => {
    it('4.1 should smoothly handle silence, max volume, spikes, and malformed audio inputs', () => {
      const levels = [0.0, 0.001, 0.35, 0.70, 0.99, 1.0, -5.0, 10.0, NaN];
      levels.forEach((lvl) => {
        const flares = PlanetariumEngine.getSolarFlareParameters(1.0, lvl as number);
        assert.ok(Number.isFinite(flares.coreRadius));
        assert.ok(Number.isFinite(flares.coronalGlowRadius));
        assert.ok(Number.isFinite(flares.prominenceCount));
      });
    });

    it('4.2 should render correct Saturn ring shimmer modulation across audio frequency range', () => {
      const saturnPos = { x: 278, y: 0, z: 0 };
      for (let audio = 0.0; audio <= 1.0; audio += 0.2) {
        const { frontRings, backRings } = PlanetariumEngine.getSaturnRingSegments(saturnPos, CAMERA_DEFAULTS, audio, 5.0);
        assert.equal(frontRings.length + backRings.length, 48);
      }
    });

    it('4.3 should update audio reactivity and planet focus simultaneously without race condition', () => {
      context.setAudioLevel(0.85);
      context.setFocusedCelestial('saturn');
      const frame = PlanetariumEngine.renderFrame(2.0, {
        ...CAMERA_DEFAULTS,
        targetFocus: context.state.focusedCelestial,
      }, context.state.audioLevel);

      const saturnProj = frame.projectedBodies.find((b) => b.id === 'saturn')!;
      assert.equal(Math.round(saturnProj.screenX), 600);
      assert.equal(Math.round(saturnProj.screenY), 400);
      assert.ok(frame.solarFlare.flareIntensity > 0.85);
    });
  });
});
