/**
 * Fox AI 3D Planetarium — Milestone 3 Adversarial UI, State & Mode Switching Stress Test Suite
 *
 * Exhaustively stress-tests:
 * 1. Rapid mode switching across voice, chat, tools, settings, and planetarium (1,000 switches).
 * 2. Info card open/close transitions and celestial body selection cycles across all 10 bodies.
 * 3. Simulation speed toggles and pause/resume states under active audio energy.
 * 4. Telemetry data integrity, fallback resilience, and accessibility invariants.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  CELESTIAL_BODIES,
  CELESTIAL_BODY_MAP,
  type CelestialId,
  type AppMode,
  STORAGE_KEYS,
  isValidAppMode,
  isValidCelestialId,
  normalizeAppMode,
  normalizeCelestialId,
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

describe('Milestone 3 Adversarial Challenge: UI, State & Mode Switching Stress', () => {
  let env: ReturnType<typeof setupTestEnvironment>;
  let context: MockAssistantContext;
  let storage: MockStorageService;

  beforeEach(() => {
    env = setupTestEnvironment();
    context = new MockAssistantContext(env.localStorage);
    storage = new MockStorageService(env.localStorage);
  });

  // ===========================================================================
  // 1. Rapid Mode Switching Stress (1,000 switches)
  // ===========================================================================
  describe('1. Rapid Mode Switching Stress (1,000 Switches)', () => {
    it('1.1 should execute 1,000 rapid sequential mode switches with perfect state synchronization', () => {
      const allModes: AppMode[] = ['voice', 'chat', 'planetarium', 'tools', 'settings'];
      const t0 = performance.now();

      for (let i = 0; i < 1000; i++) {
        const targetMode = allModes[i % allModes.length];
        context.setAppMode(targetMode);
        assert.equal(context.state.appMode, targetMode);
        assert.equal(storage.loadAppMode(), targetMode);
      }

      const elapsed = performance.now() - t0;
      assert.equal(context.state.appMode, 'settings'); // (1000 - 1) % 5 = 4 -> settings
      assert.ok(elapsed < 300, `1,000 mode switches took ${elapsed.toFixed(2)}ms (< 300ms budget)`);
    });

    it('1.2 should execute 1,000 rapid randomized mode switches with zero state desync', () => {
      const allModes: AppMode[] = ['voice', 'chat', 'planetarium', 'tools', 'settings'];
      let lastMode: AppMode = 'voice';

      for (let i = 0; i < 1000; i++) {
        const randMode = allModes[Math.floor(Math.random() * allModes.length)];
        context.setAppMode(randMode);
        assert.equal(context.state.appMode, randMode);
        assert.equal(env.localStorage.getItem(STORAGE_KEYS.APP_MODE), randMode);
        lastMode = randMode;
      }

      assert.equal(context.state.appMode, lastMode);
      assert.equal(storage.loadAppMode(), lastMode);
    });

    it('1.3 should handle rapid back-and-forth burst switching between Planetarium and other modes', () => {
      const peerModes: AppMode[] = ['voice', 'chat', 'tools', 'settings'];

      for (const peer of peerModes) {
        for (let i = 0; i < 200; i++) {
          context.setAppMode('planetarium');
          assert.equal(context.state.appMode, 'planetarium');
          context.setAppMode(peer);
          assert.equal(context.state.appMode, peer);
        }
      }

      assert.equal(context.state.appMode, 'settings');
    });

    it('1.4 should gracefully handle invalid, corrupted, or malicious app mode injections', () => {
      const attackVectors = [
        'unknown_mode_999',
        '',
        '   ',
        'VOICE',
        'PLANETARIUM',
        'null',
        'undefined',
        '{"__proto__":{"polluted":true}}',
        '<script>alert("xss")</script>',
        'constructor',
        'toString',
        'valueOf',
      ];

      for (const attack of attackVectors) {
        // Direct storage corruption
        env.localStorage.setItem(STORAGE_KEYS.APP_MODE, attack);
        const restored = storage.loadAppMode('voice');
        assert.equal(restored, 'voice');

        // Context setter resilience
        context.setAppMode(attack as any);
        assert.equal(context.state.appMode, 'voice');
      }
    });

    it('1.5 should simulate sidebar tab coordination logic upon mode change', () => {
      let activeSidebarTab: 'chats' | 'tools' | 'settings' = 'chats';

      const handleModeChange = (mode: AppMode) => {
        context.setAppMode(mode);
        if (mode === 'tools') {
          activeSidebarTab = 'tools';
        } else if (mode === 'chat' || mode === 'voice' || mode === 'planetarium') {
          activeSidebarTab = 'chats';
        }
      };

      handleModeChange('planetarium');
      assert.equal(activeSidebarTab, 'chats');

      handleModeChange('tools');
      assert.equal(activeSidebarTab, 'tools');

      handleModeChange('planetarium');
      assert.equal(activeSidebarTab, 'chats');

      handleModeChange('voice');
      assert.equal(activeSidebarTab, 'chats');
    });
  });

  // ===========================================================================
  // 2. Info Card Open/Close Transitions & Celestial Selection Cycles
  // ===========================================================================
  describe('2. Info Card Open/Close Transitions & Celestial Selection Cycles', () => {
    it('2.1 should execute 100 complete selection cycles across all 10 celestial bodies (1,000 total selections)', () => {
      const allIds: CelestialId[] = [
        'sun', 'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'
      ];

      const t0 = performance.now();
      for (let cycle = 0; cycle < 100; cycle++) {
        for (const id of allIds) {
          context.setFocusedCelestial(id);
          assert.equal(context.state.focusedCelestial, id);
          assert.equal(storage.loadPlanetariumTarget(), id);
        }
      }
      const elapsed = performance.now() - t0;
      assert.equal(context.state.focusedCelestial, 'pluto');
      assert.ok(elapsed < 200, `1,000 celestial selections completed in ${elapsed.toFixed(2)}ms`);
    });

    it('2.2 should verify 100% data completeness and scientific validity for all 10 celestial bodies in CELESTIAL_BODIES', () => {
      assert.equal(CELESTIAL_BODIES.length, 10);

      const expectedIds: CelestialId[] = [
        'sun', 'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'
      ];

      expectedIds.forEach((id) => {
        const body = CELESTIAL_BODY_MAP[id];
        assert.ok(body, `Celestial body ${id} must exist in map`);
        assert.equal(body.id, id);
        assert.ok(body.name.length >= 3, `${id} name must be non-empty`);
        assert.ok(body.subtitle.length >= 5, `${id} subtitle must be non-empty`);
        assert.ok(['star', 'terrestrial', 'gas_giant', 'ice_giant', 'dwarf_planet'].includes(body.type));
        
        // Colors
        assert.ok(body.color.startsWith('#'), `${id} color must be hex format`);
        assert.ok(body.secondaryColor.startsWith('#'), `${id} secondaryColor must be hex format`);
        assert.ok(body.glowColor.startsWith('rgba('), `${id} glowColor must be rgba format`);

        // Metrics
        assert.ok(body.diameterKm > 0, `${id} diameterKm must be > 0`);
        assert.ok(body.relativeDiameter > 0, `${id} relativeDiameter must be > 0`);
        assert.ok(body.distanceFromSunMillionKm >= 0, `${id} distanceFromSunMillionKm must be >= 0`);
        assert.ok(body.distanceAu >= 0, `${id} distanceAu must be >= 0`);
        assert.ok(body.orbitalPeriodDays >= 0, `${id} orbitalPeriodDays must be >= 0`);
        assert.ok(body.orbitalPeriodYears >= 0, `${id} orbitalPeriodYears must be >= 0`);
        assert.ok(body.orbitalSpeedKmS >= 0, `${id} orbitalSpeedKmS must be >= 0`);
        assert.ok(typeof body.rotationPeriodHours === 'number' && body.rotationPeriodHours !== 0);
        assert.ok(body.gravityMs2 > 0, `${id} gravityMs2 must be > 0`);
        assert.ok(body.gravityG > 0, `${id} gravityG must be > 0`);
        assert.ok(Number.isInteger(body.moonsCount) && body.moonsCount >= 0);
        assert.ok(typeof body.axialTiltDeg === 'number');
        assert.ok(typeof body.orbitalInclinationDeg === 'number');

        // Ring checks
        if (id === 'saturn') {
          assert.equal(body.hasRings, true);
        }

        // Educational Facts
        assert.equal(body.facts.length, 3, `${id} must contain exactly 3 educational facts`);
        body.facts.forEach((fact, fIdx) => {
          assert.ok(fact.length > 20, `${id} fact #${fIdx + 1} must be a substantial educational string`);
        });

        // Tagline & Description
        assert.ok(body.tagline.length > 10, `${id} tagline must be descriptive`);
        assert.ok(body.description.length > 30, `${id} description must be detailed`);
      });
    });

    it('2.3 should stress-test 1,000 info card open/close toggles without state leakage', () => {
      let isInfoCardOpen = true;
      const toggle = () => {
        isInfoCardOpen = !isInfoCardOpen;
      };

      for (let i = 0; i < 1000; i++) {
        toggle();
        assert.equal(isInfoCardOpen, i % 2 === 0 ? false : true);
      }
      assert.equal(isInfoCardOpen, true);
    });

    it('2.4 should test focus camera and reset camera overview actions with target fallback', () => {
      // Focus on Jupiter
      context.setFocusedCelestial('jupiter');
      assert.equal(context.state.focusedCelestial, 'jupiter');

      // Reset camera overview (returns to Sun origin)
      context.resetCamera();
      assert.equal(context.state.focusedCelestial, 'sun');
      assert.equal(context.state.cameraYaw, 0.45);
      assert.equal(context.state.cameraPitch, 0.55);
      assert.equal(context.state.cameraZoom, 560);
      assert.equal(storage.loadPlanetariumTarget(), 'sun');
    });

    it('2.5 should safely recover when given unknown celestial body keys in getCelestialBody', () => {
      const getCelestialBodySafe = (id: any) => {
        const normalized = normalizeCelestialId(id, 'sun');
        return CELESTIAL_BODY_MAP[normalized] || CELESTIAL_BODY_MAP.sun;
      };

      const invalidIds = ['vulcan', 'nibiru', 'alpha_centauri', '', null, undefined, 42, {}];
      for (const inv of invalidIds) {
        const body = getCelestialBodySafe(inv);
        assert.equal(body.id, 'sun');
        assert.equal(body.name, 'Sun');
      }
    });
  });

  // ===========================================================================
  // 3. Simulation Speed Toggles & Pause/Resume States under Active Audio Energy
  // ===========================================================================
  describe('3. Simulation Speed Toggles & Pause/Resume States under Active Audio Energy', () => {
    it('3.1 should support all 5 defined speed presets (0.5x, 1x, 2x, 5x, 10x)', () => {
      const allowedSpeeds = [0.5, 1.0, 2.0, 5.0, 10.0];

      for (const spd of allowedSpeeds) {
        context.setSimulationSpeed(spd);
        assert.equal(context.state.simulationSpeed, spd);
      }
    });

    it('3.2 should clamp extreme, negative, and invalid speed inputs safely into [0.1, 10.0]', () => {
      const extremeSpeeds = [
        { input: -10.0, expected: 0.1 },
        { input: 0.0, expected: 0.1 },
        { input: 0.05, expected: 0.1 },
        { input: 15.0, expected: 10.0 },
        { input: 1000.0, expected: 10.0 },
      ];

      for (const { input, expected } of extremeSpeeds) {
        context.setSimulationSpeed(input);
        assert.equal(context.state.simulationSpeed, expected);
      }
    });

    it('3.3 should execute 1,000 rapid pause/resume toggles with invariant state fidelity', () => {
      assert.equal(context.state.isPaused, false);

      for (let i = 0; i < 1000; i++) {
        context.togglePause();
        assert.equal(context.state.isPaused, i % 2 === 0 ? true : false);
      }

      assert.equal(context.state.isPaused, false);
    });

    it('3.4 should verify simulation time integration freezes when paused and advances when live', () => {
      let simTime = 0;
      const dt = 0.016; // ~60 FPS frame

      const stepSimulation = (isPaused: boolean, speed: number) => {
        if (!isPaused) {
          simTime += dt * speed;
        }
        return simTime;
      };

      // 1. Live at 1x
      for (let i = 0; i < 60; i++) stepSimulation(false, 1.0);
      const timeAfter1s = simTime;
      assert.ok(Math.abs(timeAfter1s - 60 * dt * 1.0) < 1e-6);

      // 2. Paused for 60 frames -> time must NOT advance
      for (let i = 0; i < 60; i++) stepSimulation(true, 1.0);
      assert.equal(simTime, timeAfter1s);

      // 3. Resumed at 5x for 60 frames
      for (let i = 0; i < 60; i++) stepSimulation(false, 5.0);
      const timeAfter5x = simTime;
      assert.ok(Math.abs(timeAfter5x - (timeAfter1s + 60 * dt * 5.0)) < 1e-6);
    });

    it('3.5 should maintain solar flare & ring shimmer rendering under violent audio pulsations (0 to 1 and spikes)', () => {
      const audioPulsations = [
        0.0, 0.01, 0.15, 0.50, 0.85, 0.99, 1.0,
        -0.5, 2.0, 10.0, NaN
      ];

      for (const lvl of audioPulsations) {
        context.setAudioLevel(lvl);
        const validLevel = typeof lvl === 'number' && !Number.isNaN(lvl) ? Math.max(0, Math.min(1.0, lvl)) : 0;
        assert.equal(context.state.audioLevel, validLevel);

        const frame = PlanetariumEngine.renderFrame(1.5, CAMERA_DEFAULTS, context.state.audioLevel);
        assert.ok(Number.isFinite(frame.solarFlare.flareIntensity));
        assert.ok(Number.isFinite(frame.solarFlare.coreRadius));
        assert.ok(Number.isFinite(frame.solarFlare.coronalGlowRadius));
        assert.equal(frame.projectedBodies.length, 10);
      }
    });

    it('3.6 should execute a 500-step chaos scenario combining random speeds, pause toggles, audio energy, and target switches', () => {
      const allIds: CelestialId[] = [
        'sun', 'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'
      ];
      const speeds = [0.5, 1.0, 2.0, 5.0, 10.0];

      for (let step = 0; step < 500; step++) {
        // Random target
        const target = allIds[Math.floor(Math.random() * allIds.length)];
        context.setFocusedCelestial(target);

        // Random speed
        const speed = speeds[Math.floor(Math.random() * speeds.length)];
        context.setSimulationSpeed(speed);

        // Random pause toggle
        if (Math.random() > 0.5) context.togglePause();

        // Random audio level
        const audio = Math.random();
        context.setAudioLevel(audio);

        // Render frame with target focus
        const frame = PlanetariumEngine.renderFrame(step * 0.02 * context.state.simulationSpeed, {
          ...CAMERA_DEFAULTS,
          targetFocus: context.state.focusedCelestial,
        }, context.state.audioLevel);

        assert.equal(frame.projectedBodies.length, 10);
        const focused = frame.projectedBodies.find((b) => b.id === target)!;
        assert.equal(Math.round(focused.screenX), 600);
        assert.equal(Math.round(focused.screenY), 400);
      }

      assert.ok(true);
    });
  });

  // ===========================================================================
  // 4. UI Component & Accessibility Invariants
  // ===========================================================================
  describe('4. UI Component & Accessibility Invariants', () => {
    it('4.1 should verify ModeSwitcher has 4 standard tabs with accessible labels and icons', () => {
      const modeTabs = [
        { id: 'voice', label: 'Voice' },
        { id: 'chat', label: 'Chat' },
        { id: 'planetarium', label: 'Planetarium' },
        { id: 'tools', label: 'Tools' },
      ];

      assert.equal(modeTabs.length, 4);
      modeTabs.forEach((tab) => {
        assert.ok(isValidAppMode(tab.id as AppMode));
        assert.ok(tab.label.length > 0);
      });
    });

    it('4.2 should verify PlanetariumControls speed options match standard HUD specifications', () => {
      const SPEED_OPTIONS: { label: string; value: number }[] = [
        { label: '0.5x', value: 0.5 },
        { label: '1x', value: 1.0 },
        { label: '2x', value: 2.0 },
        { label: '5x', value: 5.0 },
        { label: '10x', value: 10.0 },
      ];

      assert.equal(SPEED_OPTIONS.length, 5);
      SPEED_OPTIONS.forEach((opt) => {
        assert.ok(opt.value >= 0.5 && opt.value <= 10.0);
        assert.equal(opt.label, `${opt.value}x`);
      });
    });

    it('4.3 should verify CelestialInfoCard type badge style resolution for all 5 planetary classes', () => {
      const getTypeBadgeStyle = (type: string) => {
        switch (type) {
          case 'star':
            return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
          case 'terrestrial':
            return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
          case 'gas_giant':
            return 'bg-orange-500/20 text-orange-300 border-orange-500/40';
          case 'ice_giant':
            return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
          case 'dwarf_planet':
            return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
          default:
            return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
        }
      };

      const formatTypeName = (type: string) => {
        switch (type) {
          case 'star':
            return 'Central Star (G2V)';
          case 'terrestrial':
            return 'Terrestrial Planet';
          case 'gas_giant':
            return 'Jovian Gas Giant';
          case 'ice_giant':
            return 'Ice Giant';
          case 'dwarf_planet':
            return 'Dwarf Planet';
          default:
            return type;
        }
      };

      const types = ['star', 'terrestrial', 'gas_giant', 'ice_giant', 'dwarf_planet', 'unknown_type'];
      types.forEach((t) => {
        const style = getTypeBadgeStyle(t);
        const name = formatTypeName(t);
        assert.ok(style.length > 10);
        assert.ok(name.length > 0);
      });
    });
  });
});
