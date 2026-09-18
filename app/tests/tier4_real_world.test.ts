/**
 * Tier 4: Real-World Workload Scenarios Test Suite for Fox AI 3D Planetarium Mode
 * Validates complete end-to-end user journeys: Grand Tour, inspection, speech pulses,
 * drag-momentum physics, and cold-start lifecycle persistence.
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

describe('Tier 4: Real-World Workload Scenarios', () => {
  let env: ReturnType<typeof setupTestEnvironment>;
  let context: MockAssistantContext;

  beforeEach(() => {
    env = setupTestEnvironment();
    context = new MockAssistantContext(env.localStorage);
  });

  // ---------------------------------------------------------------------------
  // Scenario 1: Planetary Grand Tour Journey
  // ---------------------------------------------------------------------------
  it('Scenario 1: Full Planetary Grand Tour Journey (Sun -> 9 Planets -> Reset)', () => {
    // 1. Enter Planetarium mode
    context.setAppMode('planetarium');
    assert.equal(context.state.appMode, 'planetarium');

    // 2. Start at Sun
    assert.equal(context.state.focusedCelestial, 'sun');

    // 3. Sequentially visit all 9 planets
    const grandTourPlanets: CelestialId[] = [
      'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'
    ];

    grandTourPlanets.forEach((planetId) => {
      // Focus target
      context.setFocusedCelestial(planetId);
      assert.equal(context.state.focusedCelestial, planetId);

      // Verify scientific metadata is complete and populated
      const planetData = CELESTIAL_BODY_MAP[planetId];
      assert.ok(planetData.diameterKm > 0);
      assert.ok(planetData.distanceFromSunMillionKm > 0);
      assert.ok(planetData.facts.length === 3);

      // Simulate 30 ticks of smooth tracking
      for (let tick = 0; tick < 30; tick++) {
        const time = tick * 0.05;
        const frame = PlanetariumEngine.renderFrame(time, {
          ...CAMERA_DEFAULTS,
          targetFocus: planetId,
        });
        const targetProj = frame.projectedBodies.find((b) => b.id === planetId)!;
        assert.equal(Math.round(targetProj.screenX), 600);
        assert.equal(Math.round(targetProj.screenY), 400);
      }
    });

    // 4. Return to Sun via Reset View
    context.resetCamera();
    assert.equal(context.state.focusedCelestial, 'sun');
    assert.equal(context.state.cameraZoom, 560);
  });

  // ---------------------------------------------------------------------------
  // Scenario 2: Interactive Celestial Inspection & Holographic HUD Telemetry
  // ---------------------------------------------------------------------------
  it('Scenario 2: Interactive Celestial Inspection (Earth + Moon, Speed Slider & Pause)', () => {
    context.setAppMode('planetarium');
    context.setFocusedCelestial('earth');

    const earthData = CELESTIAL_BODY_MAP.earth;
    assert.equal(earthData.distanceAu, 1.0);
    assert.equal(earthData.moonsCount, 1);
    assert.equal(earthData.gravityG, 1.0);

    // Initial Moon and Earth positions at 1x speed
    const earthPos1 = PlanetariumEngine.getOrbitalPosition(earthData, 5.0, 1.0);
    const moonPos1 = PlanetariumEngine.getEarthMoonPosition(earthPos1, 5.0, 1.0);

    // Speed up simulation to 5x
    context.setSimulationSpeed(5.0);
    assert.equal(context.state.simulationSpeed, 5.0);

    const earthPos5x = PlanetariumEngine.getOrbitalPosition(earthData, 5.0, 5.0);
    const moonPos5x = PlanetariumEngine.getEarthMoonPosition(earthPos5x, 5.0, 5.0);

    assert.notDeepEqual(moonPos1, moonPos5x, 'Moon position must differ under 5x speed multiplier');

    // Pause simulation
    context.togglePause();
    assert.equal(context.state.isPaused, true);

    // Check that frozen time produces exact matching coordinates
    const frozenPosA = PlanetariumEngine.getOrbitalPosition(earthData, 12.0, 1.0);
    const frozenPosB = PlanetariumEngine.getOrbitalPosition(earthData, 12.0, 1.0);
    assert.deepEqual(frozenPosA, frozenPosB);
  });

  // ---------------------------------------------------------------------------
  // Scenario 3: Live Voice Speech Pulse & Audio Reactivity Simulation
  // ---------------------------------------------------------------------------
  it('Scenario 3: Live Voice Speech Pulse Simulation (Idle -> Thinking -> Speaking -> Silence)', () => {
    context.setAppMode('planetarium');

    // Phase 1: Idle (audio = 0)
    context.setAudioLevel(0.0);
    const idleFlares = PlanetariumEngine.getSolarFlareParameters(0, context.state.audioLevel);
    assert.equal(idleFlares.prominenceCount, 12);
    assert.equal(idleFlares.flareIntensity, 0.75);

    // Phase 2: Thinking (audio = 0.25)
    context.setAudioLevel(0.25);
    const thinkingFlares = PlanetariumEngine.getSolarFlareParameters(1.0, context.state.audioLevel);
    assert.ok(thinkingFlares.coronalGlowRadius > idleFlares.coronalGlowRadius);

    // Phase 3: Speaking Voice Cadence (audio wave: 0.5 to 0.95)
    const speakingSamples = [0.55, 0.75, 0.95, 0.80, 0.60];
    speakingSamples.forEach((audio, idx) => {
      context.setAudioLevel(audio);
      const frame = PlanetariumEngine.renderFrame(2.0 + idx * 0.1, CAMERA_DEFAULTS, context.state.audioLevel);
      assert.ok(frame.solarFlare.flareIntensity > 0.85);
      assert.ok(frame.solarFlare.prominenceCount >= 20);
    });

    // Phase 4: Return to Silence (audio = 0)
    context.setAudioLevel(0.0);
    const quietFlares = PlanetariumEngine.getSolarFlareParameters(5.0, context.state.audioLevel);
    assert.equal(quietFlares.prominenceCount, 12);
  });

  // ---------------------------------------------------------------------------
  // Scenario 4: User Drag Interaction, Momentum Physics & Orbit Exploration
  // ---------------------------------------------------------------------------
  it('Scenario 4: User Drag Interaction & Smooth Momentum Decay Physics', () => {
    let camState = { ...CAMERA_DEFAULTS };

    // 1. User starts dragging
    camState.isDragging = true;
    camState.velocityYaw = 0.08;
    camState.velocityPitch = 0.05;

    // While dragging, coordinates are driven by user pointer (no auto drift)
    camState = PlanetariumEngine.stepMomentumPhysics(camState, 1 / 60);
    assert.equal(camState.yaw, CAMERA_DEFAULTS.yaw);

    // 2. User releases pointer (isDragging = false) -> momentum kicks in
    camState.isDragging = false;
    const releaseYaw = camState.yaw;

    // Simulate 60 frames of momentum decay
    for (let f = 0; f < 60; f++) {
      camState = PlanetariumEngine.stepMomentumPhysics(camState, 1 / 60);
    }

    assert.ok(camState.yaw > releaseYaw, 'Yaw must have progressed under drag momentum');
    assert.ok(camState.velocityYaw < 0.08 * 0.05, 'Angular velocity must have decayed >95% after 1 second');

    // 3. User zooms in on Jupiter
    camState.zoom = 1200;
    camState.targetFocus = 'jupiter';
    const frame = PlanetariumEngine.renderFrame(10.0, camState);
    const jupiterProj = frame.projectedBodies.find((b) => b.id === 'jupiter')!;
    assert.ok(jupiterProj.screenRadius >= 22, 'Jupiter visual radius must be at least 22px');
  });

  // ---------------------------------------------------------------------------
  // Scenario 5: Application Cold Start, Mode Transition & Storage Persistence
  // ---------------------------------------------------------------------------
  it('Scenario 5: Cold Start -> Mode Transition -> Persistence Recovery & Self-Healing', () => {
    // 1. Cold start with empty localStorage
    env.localStorage.clear();
    const freshContext = new MockAssistantContext(env.localStorage);
    assert.equal(freshContext.state.appMode, 'voice');
    assert.equal(freshContext.state.focusedCelestial, 'sun');

    // 2. User switches to Planetarium and selects Saturn
    freshContext.setAppMode('planetarium');
    freshContext.setFocusedCelestial('saturn');

    // Verify localStorage keys were updated
    assert.equal(env.localStorage.getItem(STORAGE_KEYS.APP_MODE), 'planetarium');
    assert.equal(env.localStorage.getItem(STORAGE_KEYS.PLANETARIUM_TARGET), 'saturn');

    // 3. Simulate browser reload by initializing a new context instance
    const reloadedContext = new MockAssistantContext(env.localStorage);
    assert.equal(reloadedContext.state.appMode, 'planetarium');
    assert.equal(reloadedContext.state.focusedCelestial, 'saturn');

    // 4. Test self-healing on corrupted storage values
    env.localStorage.setItem(STORAGE_KEYS.PLANETARIUM_TARGET, 'invalid_corrupted_planet');
    env.localStorage.setItem(STORAGE_KEYS.APP_MODE, 'malicious_eval()');

    const healedContext = new MockAssistantContext(env.localStorage);
    assert.equal(healedContext.state.appMode, 'voice', 'Must safely fall back to voice on corrupted mode');
    assert.equal(healedContext.state.focusedCelestial, 'sun', 'Must safely fall back to sun on corrupted target');
  });
});
