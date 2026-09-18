/**
 * Tier 3: Cross-Feature Combinatorial Interaction Test Suite for Fox AI 3D Planetarium Mode
 * Tests pairwise and multi-feature interactions across mode switching, audio reactivity,
 * camera momentum, target focus lerp, simulation speed, and raycasting.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  CELESTIAL_BODIES,
  CELESTIAL_BODY_MAP,
  STORAGE_KEYS,
  type CelestialId,
  type AppMode,
} from './harness/types.ts';

import {
  PlanetariumEngine,
  CAMERA_DEFAULTS,
  PITCH_LIMIT_RAD,
} from './harness/planetariumEngine.ts';

import {
  MockAssistantContext,
  MockStorageService,
} from './harness/stateEngine.ts';

import { setupTestEnvironment } from './harness/domMock.ts';

describe('Tier 3: Cross-Feature Combinations', () => {
  let env: ReturnType<typeof setupTestEnvironment>;
  let context: MockAssistantContext;

  beforeEach(() => {
    env = setupTestEnvironment();
    context = new MockAssistantContext(env.localStorage);
  });

  // ---------------------------------------------------------------------------
  // Combo 1: Mode Switching × Audio Reactivity Subsystem
  // ---------------------------------------------------------------------------
  describe('Combo 1: Mode Switching × Audio Reactivity Subsystem', () => {
    const modes: AppMode[] = ['planetarium', 'voice', 'chat', 'tools'];
    const audioLevels = [0.0, 0.45, 0.95];

    modes.forEach((mode) => {
      audioLevels.forEach((audio) => {
        it(`should maintain coherent solar flares and storage state when in mode [${mode}] with audio [${audio}]`, () => {
          context.setAppMode(mode);
          context.setAudioLevel(audio);

          assert.equal(context.state.appMode, mode);
          assert.equal(context.state.audioLevel, audio);

          const frame = PlanetariumEngine.renderFrame(1.5, CAMERA_DEFAULTS, context.state.audioLevel);
          assert.ok(Number.isFinite(frame.solarFlare.coronalGlowRadius));
          assert.ok(frame.projectedBodies.length === 10);
        });
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Combo 2: Target Focus Selection × Active Camera Momentum
  // ---------------------------------------------------------------------------
  describe('Combo 2: Target Focus Selection × Active Camera Momentum', () => {
    const targetBodies: CelestialId[] = ['mercury', 'earth', 'mars', 'jupiter', 'saturn', 'pluto'];

    targetBodies.forEach((target) => {
      it(`should smoothly capture and center [${target}] even when camera has active angular momentum`, () => {
        // Impart high camera momentum
        let camState = {
          ...CAMERA_DEFAULTS,
          velocityYaw: 0.12,
          velocityPitch: 0.08,
          targetFocus: target,
        };

        context.setFocusedCelestial(target);

        // Step physics 30 frames
        for (let f = 0; f < 30; f++) {
          camState = PlanetariumEngine.stepMomentumPhysics(camState, 1 / 60);
        }

        // Render frame with target centered
        const frame = PlanetariumEngine.renderFrame(5.0, camState);
        const focusedBody = frame.projectedBodies.find((b) => b.id === target)!;

        assert.equal(Math.round(focusedBody.screenX), 600);
        assert.equal(Math.round(focusedBody.screenY), 400);
        assert.ok(camState.velocityYaw < 0.12, 'Angular momentum must decay');
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Combo 3: Simulation Speed Multiplier × Camera Focus Lerp
  // ---------------------------------------------------------------------------
  describe('Combo 3: Simulation Speed Multiplier × Camera Focus Lerp', () => {
    const speedMultipliers = [0.1, 1.0, 5.0, 10.0];

    speedMultipliers.forEach((speed) => {
      it(`should converge focus lerp towards Neptune at [${speed}x] simulation speed`, () => {
        context.setSimulationSpeed(speed);
        context.setFocusedCelestial('neptune');

        let currentOffset = { x: 0, y: 0, z: 0 };
        const neptuneData = CELESTIAL_BODY_MAP.neptune;

        for (let t = 0; t < 60; t++) {
          const simTime = t * 0.016;
          const targetWorld = PlanetariumEngine.getOrbitalPosition(neptuneData, simTime, speed);
          currentOffset = PlanetariumEngine.lerpFocus(currentOffset, targetWorld, 0.15);
        }

        const finalTarget = PlanetariumEngine.getOrbitalPosition(neptuneData, 60 * 0.016, speed);
        const distanceToTarget = Math.hypot(
          currentOffset.x - finalTarget.x,
          currentOffset.y - finalTarget.y,
          currentOffset.z - finalTarget.z
        );

        assert.ok(
          distanceToTarget < 20,
          `Lerp focus distance (${distanceToTarget.toFixed(2)}) should converge near target (<20px)`
        );
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Combo 4: Saturn Centered Focus × Audio Reactivity × Pitch Extremes
  // ---------------------------------------------------------------------------
  describe('Combo 4: Saturn Centered Focus × Audio Reactivity × Pitch Extremes', () => {
    const pitchAngles = [-1.4, 0.0, 1.4]; // Near min pitch, edge-on, near max pitch
    const audioLevels = [0.0, 0.5, 1.0];

    pitchAngles.forEach((pitch) => {
      audioLevels.forEach((audio) => {
        it(`should properly render and depth-sort Saturn rings at pitch [${pitch.toFixed(1)} rad] with audio [${audio}]`, () => {
          const cam = {
            ...CAMERA_DEFAULTS,
            pitch,
            targetFocus: 'saturn' as CelestialId,
          };
          const saturnWorldPos = PlanetariumEngine.getOrbitalPosition(CELESTIAL_BODY_MAP.saturn, 10.0);
          const { backRings, frontRings } = PlanetariumEngine.getSaturnRingSegments(saturnWorldPos, cam, audio, 10.0);

          assert.equal(backRings.length + frontRings.length, 48);
          frontRings.forEach((seg) => {
            assert.ok(Number.isFinite(seg.screenX) && Number.isFinite(seg.screenY));
            assert.ok(seg.alpha >= 0.25 && seg.alpha <= 1.0, `Alpha ${seg.alpha} out of range [0.25, 1.0]`);
          });
        });
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Combo 5: Hover Raycasting × Rapid Camera Rotation
  // ---------------------------------------------------------------------------
  describe('Combo 5: Hover Raycasting × Rapid Camera Rotation', () => {
    it('should accurately raycast celestial bodies as camera rotates through full 360° yaw', () => {
      let detections = 0;
      for (let yaw = 0; yaw < Math.PI * 2; yaw += 0.2) {
        const cam = { ...CAMERA_DEFAULTS, yaw };
        const frame = PlanetariumEngine.renderFrame(0, cam);
        // Raycast at center of screen (where Sun is located)
        const hit = PlanetariumEngine.raycastHit(600, 400, frame.projectedBodies);
        if (hit === 'sun') {
          detections++;
        }
      }
      assert.ok(detections > 10, 'Sun should be detected at screen center across multiple camera yaw angles');
    });
  });

  // ---------------------------------------------------------------------------
  // Combo 6: Storage Target Restoration × Viewport Resizing
  // ---------------------------------------------------------------------------
  describe('Combo 6: Storage Target Restoration × Viewport Resizing', () => {
    const viewports = [
      { w: 375, h: 667, name: 'Mobile Portrait' },
      { w: 768, h: 1024, name: 'Tablet' },
      { w: 1920, h: 1080, name: 'Desktop Full HD' },
      { w: 3840, h: 2160, name: '4K Ultra HD' },
    ];

    viewports.forEach((vp) => {
      it(`should center stored target [Jupiter] correctly on ${vp.name} (${vp.w}x${vp.h})`, () => {
        const storage = new MockStorageService(env.localStorage);
        storage.savePlanetariumTarget('jupiter');

        const reloadedTarget = storage.loadPlanetariumTarget();
        assert.equal(reloadedTarget, 'jupiter');

        const cam = { ...CAMERA_DEFAULTS, targetFocus: reloadedTarget };
        const frame = PlanetariumEngine.renderFrame(5.0, cam, 0, 1.0, vp.w, vp.h);
        const jup = frame.projectedBodies.find((b) => b.id === 'jupiter')!;

        const expectedCenterX = vp.w / 2;
        const expectedCenterY = vp.h / 2;

        assert.ok(Math.abs(jup.screenX - expectedCenterX) < 1.0);
        assert.ok(Math.abs(jup.screenY - expectedCenterY) < 1.0);
      });
    });
  });
});
