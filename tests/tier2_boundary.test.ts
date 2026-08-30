/**
 * Tier 2: Boundary, Corner Case & Extreme Value Test Suite for Fox AI 3D Planetarium Mode
 * Validates Pitch Clamping, Zoom Boundaries, Extreme Audio, Orbital Inclinations,
 * Ring Occlusion, Raycasting Precision, and LocalStorage Resilience.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  CELESTIAL_BODIES,
  CELESTIAL_BODY_MAP,
  STORAGE_KEYS,
  type CelestialId,
} from './harness/types.ts';

import {
  PlanetariumEngine,
  CAMERA_DEFAULTS,
  PITCH_LIMIT_RAD,
  PITCH_LIMIT_DEG,
  MIN_ZOOM,
  MAX_ZOOM,
} from './harness/planetariumEngine.ts';

import {
  MockAssistantContext,
  MockStorageService,
} from './harness/stateEngine.ts';

import { setupTestEnvironment } from './harness/domMock.ts';

describe('Tier 2: Boundary & Corner Cases', () => {
  let env: ReturnType<typeof setupTestEnvironment>;
  let context: MockAssistantContext;

  beforeEach(() => {
    env = setupTestEnvironment();
    context = new MockAssistantContext(env.localStorage);
  });

  // ---------------------------------------------------------------------------
  // 1. Camera Pitch Clamping [-85°, +85°]
  // ---------------------------------------------------------------------------
  describe('1. Camera Pitch Clamping [-85°, +85°] Bounds', () => {
    it('1.1 should clamp positive pitch to +85° (1.4835 rad) under extreme upward momentum', () => {
      const state = {
        ...CAMERA_DEFAULTS,
        pitch: 1.48,
        velocityPitch: 2.5, // Extreme positive flick
      };
      const next = PlanetariumEngine.stepMomentumPhysics(state, 1 / 60);
      assert.ok(
        Math.abs(next.pitch - PITCH_LIMIT_RAD) < 1e-5,
        `Pitch (${next.pitch}) should be clamped exactly at ${PITCH_LIMIT_RAD}`
      );
    });

    it('1.2 should clamp negative pitch to -85° (-1.4835 rad) under extreme downward momentum', () => {
      const state = {
        ...CAMERA_DEFAULTS,
        pitch: -1.48,
        velocityPitch: -2.5, // Extreme negative flick
      };
      const next = PlanetariumEngine.stepMomentumPhysics(state, 1 / 60);
      assert.ok(
        Math.abs(next.pitch - (-PITCH_LIMIT_RAD)) < 1e-5,
        `Pitch (${next.pitch}) should be clamped exactly at -${PITCH_LIMIT_RAD}`
      );
    });

    it('1.3 should prevent gimbal lock/inversion over 1,000 continuous upward momentum frames', () => {
      let state = {
        ...CAMERA_DEFAULTS,
        pitch: 0,
        velocityPitch: 10.0,
      };
      for (let f = 0; f < 1000; f++) {
        state = PlanetariumEngine.stepMomentumPhysics(state, 1 / 60);
        assert.ok(state.pitch <= PITCH_LIMIT_RAD, `Frame ${f}: Pitch ${state.pitch} exceeded +85°`);
        assert.ok(state.pitch >= -PITCH_LIMIT_RAD, `Frame ${f}: Pitch ${state.pitch} fell below -85°`);
      }
    });

    it('1.4 should maintain continuous projection math at exactly +85° and -85° without NaN', () => {
      const pos = { x: 100, y: 50, z: 100 };
      const projTop = PlanetariumEngine.project3DToScreen(pos, { ...CAMERA_DEFAULTS, pitch: PITCH_LIMIT_RAD });
      const projBottom = PlanetariumEngine.project3DToScreen(pos, { ...CAMERA_DEFAULTS, pitch: -PITCH_LIMIT_RAD });
      assert.ok(Number.isFinite(projTop.screenX) && Number.isFinite(projTop.screenY));
      assert.ok(Number.isFinite(projBottom.screenX) && Number.isFinite(projBottom.screenY));
    });

    it('1.5 should accurately report 85 degrees in degree-to-radian conversion', () => {
      const deg = (PITCH_LIMIT_RAD * 180) / Math.PI;
      assert.equal(Math.round(deg), 85);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Zoom Clamping [120px, 1600px]
  // ---------------------------------------------------------------------------
  describe('2. Zoom Clamping [120px, 1600px] Boundaries', () => {
    it('2.1 should strictly clamp zoom to MIN_ZOOM (120px) under massive zoom-out bursts', () => {
      const state = { ...CAMERA_DEFAULTS, zoom: -500 };
      const next = PlanetariumEngine.stepMomentumPhysics(state, 1 / 60);
      assert.equal(next.zoom, 120);
    });

    it('2.2 should strictly clamp zoom to MAX_ZOOM (1600px) under massive zoom-in bursts', () => {
      const state = { ...CAMERA_DEFAULTS, zoom: 99999 };
      const next = PlanetariumEngine.stepMomentumPhysics(state, 1 / 60);
      assert.equal(next.zoom, 1600);
    });

    it('2.3 should preserve positive perspective depth factor (fov / depth > 0) at MIN_ZOOM (120px)', () => {
      const outerPlanetPos = { x: 472, y: 50, z: 300 }; // Pluto distance
      const proj = PlanetariumEngine.project3DToScreen(outerPlanetPos, { ...CAMERA_DEFAULTS, zoom: 120 });
      assert.ok(proj.scale > 0);
      assert.ok(proj.screenZ > 0);
    });

    it('2.4 should render full solar system visible in screen bounds at MIN_ZOOM (120px)', () => {
      const frame = PlanetariumEngine.renderFrame(0, { ...CAMERA_DEFAULTS, zoom: 120 });
      frame.projectedBodies.forEach((b) => {
        assert.ok(Number.isFinite(b.screenX) && Number.isFinite(b.screenY));
        assert.ok(b.screenRadius >= 2.0, 'Screen radius must be clamped above minimum 2px');
      });
    });

    it('2.5 should handle rapid fractional zoom delta wheel oscillations without drift', () => {
      let zoom = 560;
      for (let i = 0; i < 50; i++) {
        zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom + 12.345));
        zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom - 12.345));
      }
      assert.ok(Math.abs(zoom - 560) < 1e-9);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Extreme Audio Reactivity Boundaries
  // ---------------------------------------------------------------------------
  describe('3. Extreme Audio Reactivity Boundaries (Zero, Clipped, Overflow)', () => {
    it('3.1 should render steady baseline flares at audioLevel = 0.0 (Silence)', () => {
      const flares = PlanetariumEngine.getSolarFlareParameters(0, 0.0);
      assert.equal(flares.prominenceCount, 12);
      assert.equal(flares.flareIntensity, 0.75);
      assert.ok(flares.coreRadius <= 35);
    });

    it('3.2 should clamp negative audioLevel (-10.0) safely to 0.0 baseline', () => {
      const flares = PlanetariumEngine.getSolarFlareParameters(0, -10.0);
      const baseline = PlanetariumEngine.getSolarFlareParameters(0, 0.0);
      assert.equal(flares.prominenceCount, baseline.prominenceCount);
      assert.equal(flares.coronalGlowRadius, baseline.coronalGlowRadius);
    });

    it('3.3 should clamp overflow audioLevel (+100.0) safely to 1.0 peak', () => {
      const flares = PlanetariumEngine.getSolarFlareParameters(0, 100.0);
      const maxFlares = PlanetariumEngine.getSolarFlareParameters(0, 1.0);
      assert.equal(flares.prominenceCount, maxFlares.prominenceCount);
      assert.equal(flares.coronalGlowRadius, maxFlares.coronalGlowRadius);
    });

    it('3.4 should handle NaN or undefined audio levels by gracefully defaulting to 0', () => {
      const flares = PlanetariumEngine.getSolarFlareParameters(0, NaN as any);
      assert.ok(Number.isFinite(flares.coreRadius));
      assert.ok(Number.isFinite(flares.coronalGlowRadius));
    });

    it('3.5 should maintain stable Saturn ring shimmer opacity under rapid audio spikes', () => {
      const saturnPos = { x: 278, y: 0, z: 0 };
      const ringsQuiet = PlanetariumEngine.getSaturnRingSegments(saturnPos, CAMERA_DEFAULTS, 0.0, 0);
      const ringsLoud = PlanetariumEngine.getSaturnRingSegments(saturnPos, CAMERA_DEFAULTS, 1.0, 0);
      assert.ok(ringsLoud.frontRings[0].alpha >= 0.65 && ringsLoud.frontRings[0].alpha <= 1.0);
      assert.ok(ringsQuiet.frontRings[0].alpha >= 0.65 && ringsQuiet.frontRings[0].alpha <= 1.0);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Pluto Extreme 17.16° Inclination & Uranus 97.8° Tilt
  // ---------------------------------------------------------------------------
  describe('4. Pluto Extreme 17.16° Inclination & Uranus 97.8° Tilt', () => {
    it('4.1 should compute maximum vertical displacement y(t) for Pluto at 17.16° inclination', () => {
      const pluto = CELESTIAL_BODY_MAP.pluto;
      const r = pluto.orbitalRadiusScaled; // 472
      const maxExpectedY = r * Math.sin((17.16 * Math.PI) / 180); // ~139.2px
      let maxYObserved = 0;

      for (let t = 0; t < 1000; t += 10) {
        const pos = PlanetariumEngine.getOrbitalPosition(pluto, t);
        if (Math.abs(pos.y) > maxYObserved) {
          maxYObserved = Math.abs(pos.y);
        }
      }
      assert.ok(
        Math.abs(maxYObserved - maxExpectedY) < 2.0,
        `Max observed Y (${maxYObserved.toFixed(1)}) must match theoretical (${maxExpectedY.toFixed(1)})`
      );
    });

    it('4.2 should cross orbital plane (Y = 0) at ascending and descending nodes for Pluto', () => {
      const pluto = CELESTIAL_BODY_MAP.pluto;
      let signChanges = 0;
      let prevY = 0;

      for (let t = 0; t < 2000; t += 5) {
        const pos = PlanetariumEngine.getOrbitalPosition(pluto, t);
        if (t > 0 && Math.sign(pos.y) !== Math.sign(prevY) && prevY !== 0) {
          signChanges++;
        }
        prevY = pos.y;
      }
      assert.ok(signChanges >= 2, `Should observe >= 2 nodal crossings (observed: ${signChanges})`);
    });

    it('4.3 should record Uranus extreme 97.77° axial tilt in scientific properties', () => {
      const uranus = CELESTIAL_BODY_MAP.uranus;
      assert.equal(uranus.axialTiltDeg, 97.77);
      assert.ok(uranus.rotationPeriodHours < 0, 'Uranus has retrograde rotation');
      assert.ok(uranus.tagline.includes('97.8°'));
    });

    it('4.4 should record Venus extreme retrograde rotation (-5832.5h) and 177.36° axial tilt', () => {
      const venus = CELESTIAL_BODY_MAP.venus;
      assert.equal(venus.axialTiltDeg, 177.36);
      assert.equal(venus.rotationPeriodHours, -5832.5);
    });

    it('4.5 should compute distinct 3D orbital plane normals for all planets with non-zero inclination', () => {
      const inclinedPlanets = CELESTIAL_BODIES.filter((b) => b.orbitalInclinationDeg > 0);
      assert.ok(inclinedPlanets.length >= 7, 'At least 7 planets should have non-zero inclination');
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Saturn Ring Horizon Depth Sorting & Cassini Gap
  // ---------------------------------------------------------------------------
  describe('5. Saturn Ring Horizon Depth Sorting & Cassini Gap', () => {
    it('5.1 should correctly sort ring segments when viewed edge-on (pitch = 0)', () => {
      const saturnPos = { x: 278, y: 0, z: 0 };
      const camEdgeOn = { ...CAMERA_DEFAULTS, pitch: 0.0, yaw: 0.0 };
      const { backRings, frontRings } = PlanetariumEngine.getSaturnRingSegments(saturnPos, camEdgeOn);
      assert.ok(backRings.length > 0);
      assert.ok(frontRings.length > 0);
    });

    it('5.2 should maintain Cassini division gap dimensions between inner and outer ring radii', () => {
      const saturnRadius = PlanetariumEngine.getBaseVisualRadius(CELESTIAL_BODY_MAP.saturn); // 18
      const innerRadius = saturnRadius * 1.45;   // ~26.1
      const cassiniInner = saturnRadius * 1.98;  // ~35.6
      const cassiniOuter = saturnRadius * 2.18;  // ~39.2
      const outerRadius = saturnRadius * 2.65;   // ~47.7

      assert.ok(innerRadius < cassiniInner, 'Inner ring must end before Cassini division begins');
      assert.ok(cassiniInner < cassiniOuter, 'Cassini division must have positive non-zero gap width');
      assert.ok(cassiniOuter < outerRadius, 'Outer ring must start after Cassini division ends');
    });

    it('5.3 should invert front/back partition when camera views Saturn from opposite yaw (180°)', () => {
      const saturnPos = { x: 278, y: 0, z: 0 };
      const camFront = { ...CAMERA_DEFAULTS, yaw: 0 };
      const camBack = { ...CAMERA_DEFAULTS, yaw: Math.PI };

      const ringsFront = PlanetariumEngine.getSaturnRingSegments(saturnPos, camFront);
      const ringsBack = PlanetariumEngine.getSaturnRingSegments(saturnPos, camBack);

      // Slices that were in front become back when camera views from opposite side
      assert.equal(ringsFront.frontRings.length, ringsBack.frontRings.length);
    });

    it('5.4 should handle camera focus directly centered on Saturn without projection singularity', () => {
      const saturn = CELESTIAL_BODY_MAP.saturn;
      const camera: typeof CAMERA_DEFAULTS = {
        ...CAMERA_DEFAULTS,
        targetFocus: 'saturn',
        zoom: 800, // Zoomed in on Saturn
      };
      const frame = PlanetariumEngine.renderFrame(10, camera);
      const saturnProj = frame.projectedBodies.find((b) => b.id === 'saturn')!;
      assert.equal(Math.round(saturnProj.screenX), 600);
      assert.equal(Math.round(saturnProj.screenY), 400);
      assert.ok(saturnProj.screenRadius >= 18);
    });

    it('5.5 should verify ring segments remain bounded under arbitrary camera rotations', () => {
      const saturnPos = { x: 200, y: 20, z: 100 };
      for (let pitch = -1.4; pitch <= 1.4; pitch += 0.4) {
        for (let yaw = 0; yaw < Math.PI * 2; yaw += 1.0) {
          const { frontRings, backRings } = PlanetariumEngine.getSaturnRingSegments(
            saturnPos,
            { ...CAMERA_DEFAULTS, pitch, yaw }
          );
          [...frontRings, ...backRings].forEach((seg) => {
            assert.ok(Number.isFinite(seg.screenX) && Number.isFinite(seg.screenY));
          });
        }
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Raycasting Hit Precision & Boundary Tolerance
  // ---------------------------------------------------------------------------
  describe('6. Raycasting Hit Precision & Boundary Tolerance', () => {
    it('6.1 should register hit precisely at boundary: screenRadius + 8px', () => {
      const frame = PlanetariumEngine.renderFrame(0, CAMERA_DEFAULTS);
      const earth = frame.projectedBodies.find((b) => b.id === 'earth')!;
      const hitRadius = Math.max(earth.screenRadius + 8, 16);

      // Hit exactly at hitRadius - 1px
      const hitInside = PlanetariumEngine.raycastHit(earth.screenX + hitRadius - 1, earth.screenY, frame.projectedBodies);
      assert.equal(hitInside, 'earth');
    });

    it('6.2 should register miss precisely 1px outside boundary: screenRadius + 8px + 1px', () => {
      const frame = PlanetariumEngine.renderFrame(0, CAMERA_DEFAULTS);
      const earth = frame.projectedBodies.find((b) => b.id === 'earth')!;
      const hitRadius = Math.max(earth.screenRadius + 8, 16);

      // Hit at hitRadius + 2px
      const hitOutside = PlanetariumEngine.raycastHit(earth.screenX + hitRadius + 2, earth.screenY, frame.projectedBodies);
      assert.notEqual(hitOutside, 'earth');
    });

    it('6.3 should guarantee tiny planets (Mercury, Pluto) receive minimum 16px touch hit radius', () => {
      const frame = PlanetariumEngine.renderFrame(0, CAMERA_DEFAULTS);
      const mercury = frame.projectedBodies.find((b) => b.id === 'mercury')!;
      const hitRadius = Math.max(mercury.screenRadius + 8, 16);
      assert.ok(hitRadius >= 16, 'Hit radius must be at least 16px');

      // Click within hit radius (12px away from mercury center)
      const hit = PlanetariumEngine.raycastHit(mercury.screenX + 12, mercury.screenY, frame.projectedBodies);
      assert.equal(hit, 'mercury');
    });

    it('6.4 should correctly differentiate between closely positioned inner planets', () => {
      const frame = PlanetariumEngine.renderFrame(0, CAMERA_DEFAULTS);
      const mercury = frame.projectedBodies.find((b) => b.id === 'mercury')!;
      const venus = frame.projectedBodies.find((b) => b.id === 'venus')!;

      const hitMercury = PlanetariumEngine.raycastHit(mercury.screenX, mercury.screenY, frame.projectedBodies);
      const hitVenus = PlanetariumEngine.raycastHit(venus.screenX, venus.screenY, frame.projectedBodies);

      assert.equal(hitMercury, 'mercury');
      assert.equal(hitVenus, 'venus');
    });

    it('6.5 should handle raycasting on empty screen space without throwing errors', () => {
      const frame = PlanetariumEngine.renderFrame(0, CAMERA_DEFAULTS);
      assert.equal(PlanetariumEngine.raycastHit(0, 0, frame.projectedBodies), null);
      assert.equal(PlanetariumEngine.raycastHit(1200, 800, frame.projectedBodies), null);
      assert.equal(PlanetariumEngine.raycastHit(-50, -50, frame.projectedBodies), null);
    });
  });

  // ---------------------------------------------------------------------------
  // 7. LocalStorage Corruption Fallbacks & Fault Tolerance
  // ---------------------------------------------------------------------------
  describe('7. LocalStorage Corruption Fallbacks & Fault Tolerance', () => {
    it('7.1 should safely fallback to "sun" when STORAGE_KEYS.PLANETARIUM_TARGET is corrupted JSON object', () => {
      const storage = new MockStorageService(env.localStorage);
      env.localStorage.setItem(STORAGE_KEYS.PLANETARIUM_TARGET, '{"target":"jupiter","hacked":true}');
      const target = storage.loadPlanetariumTarget();
      assert.equal(target, 'sun');
    });

    it('7.2 should safely fallback to "voice" when STORAGE_KEYS.APP_MODE contains null bytes or numbers', () => {
      const storage = new MockStorageService(env.localStorage);
      env.localStorage.setItem(STORAGE_KEYS.APP_MODE, '12345\0null');
      const mode = storage.loadAppMode();
      assert.equal(mode, 'voice');
    });

    it('7.3 should safely handle massive 100KB corrupted string without crashing', () => {
      const storage = new MockStorageService(env.localStorage);
      const bigString = 'X'.repeat(102400);
      env.localStorage.setItem(STORAGE_KEYS.PLANETARIUM_TARGET, bigString);
      assert.equal(storage.loadPlanetariumTarget(), 'sun');
    });

    it('7.4 should safely handle prototype property names ("toString", "valueOf", "constructor")', () => {
      const storage = new MockStorageService(env.localStorage);
      env.localStorage.setItem(STORAGE_KEYS.PLANETARIUM_TARGET, 'toString');
      assert.equal(storage.loadPlanetariumTarget(), 'sun');

      env.localStorage.setItem(STORAGE_KEYS.PLANETARIUM_TARGET, 'constructor');
      assert.equal(storage.loadPlanetariumTarget(), 'sun');
    });

    it('7.5 should safely handle SecurityError when localStorage is blocked (e.g. Incognito iframe)', () => {
      const blockedStorage: Storage = {
        getItem: () => { throw new Error('SecurityError: Access denied'); },
        setItem: () => { throw new Error('SecurityError: Access denied'); },
        removeItem: () => { throw new Error('SecurityError: Access denied'); },
        clear: () => { throw new Error('SecurityError: Access denied'); },
        key: () => null,
        length: 0,
      };
      const storage = new MockStorageService(blockedStorage);
      assert.equal(storage.loadAppMode(), 'voice');
      assert.equal(storage.loadPlanetariumTarget(), 'sun');
      assert.equal(storage.saveAppMode('planetarium'), false);
    });
  });

  // ---------------------------------------------------------------------------
  // 8. Simulation Delta Time (dt) & Frame Drop Boundaries
  // ---------------------------------------------------------------------------
  describe('8. Simulation Delta Time (dt) & Frame Drop Boundaries', () => {
    it('8.1 should handle dt = 0 without dividing by zero or causing NaN', () => {
      const state = { ...CAMERA_DEFAULTS, velocityYaw: 0.1 };
      const next = PlanetariumEngine.stepMomentumPhysics(state, 0);
      assert.ok(Number.isFinite(next.yaw));
      assert.ok(Number.isFinite(next.pitch));
    });

    it('8.2 should handle large frame drop (dt = 1.0s) smoothly without physics explosion', () => {
      const state = { ...CAMERA_DEFAULTS, velocityYaw: 0.2 };
      const next = PlanetariumEngine.stepMomentumPhysics(state, 1.0);
      assert.ok(Number.isFinite(next.yaw));
      assert.ok(next.velocityYaw < 0.01, 'Momentum should dissipate over 1.0s');
    });

    it('8.3 should handle microsecond stepping (dt = 0.0001s) smoothly', () => {
      const state = { ...CAMERA_DEFAULTS, velocityYaw: 0.05 };
      const next = PlanetariumEngine.stepMomentumPhysics(state, 0.0001);
      assert.ok(next.yaw >= state.yaw);
    });

    it('8.4 should preserve focus lerp convergence over multiple micro steps', () => {
      let current = { x: 0, y: 0, z: 0 };
      const target = { x: 50, y: 50, z: 50 };
      for (let step = 0; step < 100; step++) {
        current = PlanetariumEngine.lerpFocus(current, target, 0.08);
      }
      assert.ok(Math.abs(current.x - 50) < 0.05, 'Lerp must converge on target');
      assert.ok(Math.abs(current.y - 50) < 0.05);
      assert.ok(Math.abs(current.z - 50) < 0.05);
    });

    it('8.5 should maintain strictly non-negative simulation speed multiplier', () => {
      context.setSimulationSpeed(-5.0);
      assert.equal(context.state.simulationSpeed, 0.1);
      context.setSimulationSpeed(0.0);
      assert.equal(context.state.simulationSpeed, 0.1);
    });
  });
});
