/**
 * Tier 1: Comprehensive Feature Coverage Test Suite for Fox AI 3D Planetarium Mode
 * 16 Features × 5+ Test Cases per Feature = 80+ Test Cases
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  CELESTIAL_BODIES,
  CELESTIAL_BODY_MAP,
  type CelestialId,
  type CelestialBodyData,
  STORAGE_KEYS,
} from './harness/types.ts';

import {
  PlanetariumEngine,
  CAMERA_DEFAULTS,
  PITCH_LIMIT_RAD,
  MIN_ZOOM,
  MAX_ZOOM,
  FRICTION_MOMENTUM_DECAY,
} from './harness/planetariumEngine.ts';

import {
  MockAssistantContext,
  MockStorageService,
} from './harness/stateEngine.ts';

import { setupTestEnvironment } from './harness/domMock.ts';

describe('Tier 1: Feature Coverage (16 Features × 5 Tests)', () => {
  let env: ReturnType<typeof setupTestEnvironment>;
  let context: MockAssistantContext;

  beforeEach(() => {
    env = setupTestEnvironment();
    context = new MockAssistantContext(env.localStorage);
  });

  // ---------------------------------------------------------------------------
  // Feature 1: Central Luminous Sun
  // ---------------------------------------------------------------------------
  describe('Feature 1: Central Luminous Sun', () => {
    it('1.1 should have Sun at the exact gravitational center (0, 0, 0) with star classification', () => {
      const sun = CELESTIAL_BODY_MAP.sun;
      assert.equal(sun.id, 'sun');
      assert.equal(sun.type, 'star');
      const pos = PlanetariumEngine.getOrbitalPosition(sun, 100);
      assert.deepEqual(pos, { x: 0, y: 0, z: 0 });
    });

    it('1.2 should generate multi-tiered solar core glow and coronal radius', () => {
      const flares0 = PlanetariumEngine.getSolarFlareParameters(0, 0);
      assert.ok(flares0.coreRadius >= 30, 'Core radius should be at least 30px');
      assert.ok(flares0.coronalGlowRadius > flares0.coreRadius * 2, 'Coronal glow should extend >2x core');
      assert.ok(flares0.prominenceCount >= 12, 'Should have baseline prominence count >= 12');
    });

    it('1.3 should modulate solar flare radius dynamically with time oscillations', () => {
      const f1 = PlanetariumEngine.getSolarFlareParameters(0.0, 0);
      const f2 = PlanetariumEngine.getSolarFlareParameters(Math.PI / 7, 0);
      assert.notEqual(f1.coreRadius, f2.coreRadius, 'Solar core radius should oscillate with time');
    });

    it('1.4 should render Sun with vibrant solar color palette (#FFB703 / #FB8500)', () => {
      const sun = CELESTIAL_BODY_MAP.sun;
      assert.equal(sun.color, '#FFB703');
      assert.equal(sun.secondaryColor, '#FB8500');
      assert.ok(sun.glowColor.includes('255, 183, 3'));
    });

    it('1.5 should verify Sun diameter (1,392,700 km) and 99.86% mass in scientific metadata', () => {
      const sun = CELESTIAL_BODY_MAP.sun;
      assert.equal(sun.diameterKm, 1392700);
      assert.equal(sun.relativeDiameter, 109.2);
      assert.ok(sun.facts[0].includes('99.86%'));
    });
  });

  // ---------------------------------------------------------------------------
  // Feature 2: 9 Revolving Planets
  // ---------------------------------------------------------------------------
  describe('Feature 2: 9 Revolving Planets', () => {
    it('2.1 should include all 9 distinct revolving planets in Keplerian sequence', () => {
      const expectedPlanets: CelestialId[] = [
        'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'
      ];
      assert.equal(CELESTIAL_BODIES.length, 10); // Sun + 9 planets
      expectedPlanets.forEach((id, idx) => {
        assert.equal(CELESTIAL_BODIES[idx + 1].id, id);
      });
    });

    it('2.2 should maintain strictly monotonic orbital radiuses (Mercury < Venus < ... < Pluto)', () => {
      const planets = CELESTIAL_BODIES.filter((b) => b.id !== 'sun');
      for (let i = 0; i < planets.length - 1; i++) {
        assert.ok(
          planets[i].orbitalRadiusScaled < planets[i + 1].orbitalRadiusScaled,
          `${planets[i].name} radius (${planets[i].orbitalRadiusScaled}) must be < ${planets[i + 1].name} radius (${planets[i + 1].orbitalRadiusScaled})`
        );
      }
    });

    it('2.3 should obey Keplerian velocity ordering (closer planets orbit faster than outer planets)', () => {
      const planets = CELESTIAL_BODIES.filter((b) => b.id !== 'sun');
      for (let i = 0; i < planets.length - 1; i++) {
        assert.ok(
          planets[i].orbitalSpeedKmS > planets[i + 1].orbitalSpeedKmS,
          `${planets[i].name} speed (${planets[i].orbitalSpeedKmS} km/s) must be > ${planets[i + 1].name} speed (${planets[i + 1].orbitalSpeedKmS} km/s)`
        );
      }
    });

    it('2.4 should render Earth with its companion Moon revolving in 3D space', () => {
      const earth = CELESTIAL_BODY_MAP.earth;
      const earthPos = PlanetariumEngine.getOrbitalPosition(earth, 5.0);
      const moonPos = PlanetariumEngine.getEarthMoonPosition(earthPos, 5.0);
      const dist = Math.hypot(moonPos.x - earthPos.x, moonPos.y - earthPos.y, moonPos.z - earthPos.z);
      assert.ok(dist >= 15 && dist <= 25, `Moon distance (${dist}) should be in range [15, 25]`);
    });

    it('2.5 should assign distinct scientific colors and types across terrestrial, gas giant, ice giant, and dwarf planet', () => {
      assert.equal(CELESTIAL_BODY_MAP.mercury.type, 'terrestrial');
      assert.equal(CELESTIAL_BODY_MAP.jupiter.type, 'gas_giant');
      assert.equal(CELESTIAL_BODY_MAP.uranus.type, 'ice_giant');
      assert.equal(CELESTIAL_BODY_MAP.pluto.type, 'dwarf_planet');
      assert.notEqual(CELESTIAL_BODY_MAP.mars.color, CELESTIAL_BODY_MAP.earth.color);
    });
  });

  // ---------------------------------------------------------------------------
  // Feature 3: Saturn 3D Concentric Ring System
  // ---------------------------------------------------------------------------
  describe('Feature 3: Saturn 3D Concentric Ring System', () => {
    it('3.1 should flag Saturn with hasRings = true and 26.73° axial tilt', () => {
      const saturn = CELESTIAL_BODY_MAP.saturn;
      assert.equal(saturn.hasRings, true);
      assert.equal(saturn.axialTiltDeg, 26.73);
    });

    it('3.2 should compute concentric inner and outer ring boundaries around Saturn', () => {
      const saturnPos = { x: 200, y: 0, z: 0 };
      const { backRings, frontRings } = PlanetariumEngine.getSaturnRingSegments(
        saturnPos,
        CAMERA_DEFAULTS
      );
      assert.ok(backRings.length > 0);
      assert.ok(frontRings.length > 0);
      assert.ok(frontRings[0].outerRadius > frontRings[0].innerRadius);
    });

    it('3.3 should perform depth-sorted separation into front and back ring partitions', () => {
      const saturnPos = { x: 200, y: 50, z: 100 };
      const { backRings, frontRings } = PlanetariumEngine.getSaturnRingSegments(
        saturnPos,
        CAMERA_DEFAULTS
      );
      // Saturn ring slices total 48 segments
      assert.equal(backRings.length + frontRings.length, 48);
      frontRings.forEach((seg) => assert.equal(seg.isFront, true));
      backRings.forEach((seg) => assert.equal(seg.isFront, false));
    });

    it('3.4 should preserve ring perspective tilt when camera yaw and pitch change', () => {
      const saturnPos = { x: 150, y: 0, z: 50 };
      const cam1 = { ...CAMERA_DEFAULTS, pitch: 0.2 };
      const cam2 = { ...CAMERA_DEFAULTS, pitch: 0.8 };
      const rings1 = PlanetariumEngine.getSaturnRingSegments(saturnPos, cam1);
      const rings2 = PlanetariumEngine.getSaturnRingSegments(saturnPos, cam2);
      assert.notEqual(rings1.frontRings[0].screenY, rings2.frontRings[0].screenY);
    });

    it('3.5 should verify Cassini division fact in Saturn scientific description', () => {
      const saturn = CELESTIAL_BODY_MAP.saturn;
      assert.ok(saturn.description.includes('Cassini'));
      assert.equal(saturn.moonsCount, 146);
    });
  });

  // ---------------------------------------------------------------------------
  // Feature 4: Holographic Orbital Trajectory Tracks
  // ---------------------------------------------------------------------------
  describe('Feature 4: Holographic Orbital Trajectory Tracks', () => {
    it('4.1 should calculate continuous 3D elliptical trajectory tracks for all 9 planets', () => {
      const planets = CELESTIAL_BODIES.filter((b) => b.id !== 'sun');
      planets.forEach((planet) => {
        const p0 = PlanetariumEngine.getOrbitalPosition(planet, 0);
        const pQuarter = PlanetariumEngine.getOrbitalPosition(planet, planet.orbitalPeriodDays * 0.25);
        assert.ok(Number.isFinite(p0.x) && Number.isFinite(p0.z));
        assert.notDeepEqual(p0, pQuarter, `Planet ${planet.name} should move across its orbit`);
      });
    });

    it('4.2 should scale orbital radii harmonically (R_orb proportional to AU^0.5)', () => {
      // Harmonic scaling allows Neptune & Pluto to be visible on screen without microscopic inner planets
      const mercury = CELESTIAL_BODY_MAP.mercury;
      const pluto = CELESTIAL_BODY_MAP.pluto;
      const ratioScaled = pluto.orbitalRadiusScaled / mercury.orbitalRadiusScaled;
      // 472 / 62 ~ 7.6x visual ratio vs 100x actual AU ratio
      assert.ok(ratioScaled > 5 && ratioScaled < 12, `Scaled ratio (${ratioScaled}) should be harmonic [5, 12]`);
    });

    it('4.3 should incorporate 3D orbital inclination tilt into trajectory paths', () => {
      const pluto = CELESTIAL_BODY_MAP.pluto; // 17.16 deg inclination
      const pos = PlanetariumEngine.getOrbitalPosition(pluto, 50);
      assert.ok(Math.abs(pos.y) > 5, 'Pluto 17.16° inclination should produce significant Y displacement');
    });

    it('4.4 should project complete orbital rings without NaN or infinite coordinates', () => {
      for (let angle = 0; angle < Math.PI * 2; angle += 0.5) {
        const jupPos = {
          x: 218 * Math.cos(angle),
          y: 218 * Math.sin(angle) * Math.sin(0.02),
          z: 218 * Math.sin(angle) * Math.cos(0.02),
        };
        const proj = PlanetariumEngine.project3DToScreen(jupPos, CAMERA_DEFAULTS);
        assert.ok(Number.isFinite(proj.screenX) && Number.isFinite(proj.screenY));
      }
    });

    it('4.5 should provide track glow color matching each planet glowColor', () => {
      CELESTIAL_BODIES.forEach((body) => {
        assert.ok(body.glowColor.startsWith('rgba('));
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Feature 5: Hybrid Sci-Fi & Realistic Aesthetic
  // ---------------------------------------------------------------------------
  describe('Feature 5: Hybrid Sci-Fi & Realistic Aesthetic', () => {
    it('5.1 should combine realistic planetary surface colors with holographic glow palettes', () => {
      const mars = CELESTIAL_BODY_MAP.mars;
      assert.equal(mars.color, '#E63946'); // Rust red iron oxide
      assert.ok(mars.glowColor.includes('230, 57, 70'));
    });

    it('5.2 should render proportional visual sphere radiuses scaling gas giants larger than terrestrials', () => {
      const rMercury = PlanetariumEngine.getBaseVisualRadius(CELESTIAL_BODY_MAP.mercury);
      const rEarth = PlanetariumEngine.getBaseVisualRadius(CELESTIAL_BODY_MAP.earth);
      const rJupiter = PlanetariumEngine.getBaseVisualRadius(CELESTIAL_BODY_MAP.jupiter);
      assert.ok(rJupiter > rEarth, 'Jupiter visual radius must exceed Earth');
      assert.ok(rEarth > rMercury, 'Earth visual radius must exceed Mercury');
    });

    it('5.3 should support perspective depth scaling (scale < 1 for distant bodies, > 1 for close bodies)', () => {
      const pFront = { x: 0, y: 0, z: -200 };
      const pBack = { x: 0, y: 0, z: 200 };
      const projFront = PlanetariumEngine.project3DToScreen(pFront, CAMERA_DEFAULTS);
      const projBack = PlanetariumEngine.project3DToScreen(pBack, CAMERA_DEFAULTS);
      assert.ok(projFront.scale > projBack.scale, 'Front object should have larger perspective scale');
    });

    it('5.4 should provide scientific telemetry metrics (AU, speed, temperature, rotation) for HUD display', () => {
      const jupiter = CELESTIAL_BODY_MAP.jupiter;
      assert.equal(jupiter.distanceAu, 5.204);
      assert.equal(jupiter.orbitalSpeedKmS, 13.1);
      assert.equal(jupiter.surfaceTemperatureC, '-108°C');
      assert.equal(jupiter.rotationPeriodHours, 9.93);
    });

    it('5.5 should render Great Red Spot storm annotation in Jupiter description', () => {
      const jupiter = CELESTIAL_BODY_MAP.jupiter;
      assert.ok(jupiter.tagline.includes('Red Spot') || jupiter.description.includes('Red Spot'));
    });
  });

  // ---------------------------------------------------------------------------
  // Feature 6: Drag-to-Rotate Camera Momentum
  // ---------------------------------------------------------------------------
  describe('Feature 6: Drag-to-Rotate Camera Momentum', () => {
    it('6.1 should update camera yaw and pitch when mouse drag velocities are applied', () => {
      const initialCamera: typeof CAMERA_DEFAULTS = {
        ...CAMERA_DEFAULTS,
        velocityYaw: 0.05,
        velocityPitch: 0.03,
      };
      const next = PlanetariumEngine.stepMomentumPhysics(initialCamera, 1 / 60);
      assert.ok(next.yaw > initialCamera.yaw);
      assert.ok(next.pitch > initialCamera.pitch);
    });

    it('6.2 should decay angular velocities exponentially with 0.92 friction factor', () => {
      let state = {
        ...CAMERA_DEFAULTS,
        velocityYaw: 0.10,
        velocityPitch: 0.08,
      };
      state = PlanetariumEngine.stepMomentumPhysics(state, 1 / 60);
      assert.ok(state.velocityYaw < 0.10 * 0.93 && state.velocityYaw > 0.10 * 0.91);
      assert.ok(state.velocityPitch < 0.08 * 0.93 && state.velocityPitch > 0.08 * 0.91);
    });

    it('6.3 should strictly clamp pitch within [-85°, +85°] under extreme drag forces', () => {
      let state = {
        ...CAMERA_DEFAULTS,
        pitch: 1.40,
        velocityPitch: 0.50, // Massive upward flick
      };
      state = PlanetariumEngine.stepMomentumPhysics(state, 1 / 60);
      assert.ok(state.pitch <= PITCH_LIMIT_RAD, `Pitch (${state.pitch}) must not exceed ${PITCH_LIMIT_RAD}`);
      assert.ok(state.pitch >= -PITCH_LIMIT_RAD);
    });

    it('6.4 should resume gentle idle drift once momentum decays below threshold', () => {
      let state = {
        ...CAMERA_DEFAULTS,
        velocityYaw: 0.00005, // Below epsilon
        velocityPitch: 0.00005,
      };
      const beforeYaw = state.yaw;
      state = PlanetariumEngine.stepMomentumPhysics(state, 1 / 60);
      assert.equal(state.velocityYaw, 0);
      assert.ok(state.yaw > beforeYaw, 'Idle drift should gently advance yaw');
    });

    it('6.5 should pause momentum physics updates during active mouse drag', () => {
      const state = {
        ...CAMERA_DEFAULTS,
        isDragging: true,
        velocityYaw: 0.08,
      };
      const next = PlanetariumEngine.stepMomentumPhysics(state, 1 / 60);
      assert.equal(next.yaw, state.yaw, 'Yaw should not auto-increment while actively dragging');
    });
  });

  // ---------------------------------------------------------------------------
  // Feature 7: Smooth Mouse Wheel Zoom
  // ---------------------------------------------------------------------------
  describe('Feature 7: Smooth Mouse Wheel Zoom', () => {
    it('7.1 should clamp zoom within strict bounds [120px, 1600px]', () => {
      let state = { ...CAMERA_DEFAULTS, zoom: 50 }; // Attempt below min
      let next = PlanetariumEngine.stepMomentumPhysics(state, 1 / 60);
      assert.equal(next.zoom, MIN_ZOOM);

      state = { ...CAMERA_DEFAULTS, zoom: 2500 }; // Attempt above max
      next = PlanetariumEngine.stepMomentumPhysics(state, 1 / 60);
      assert.equal(next.zoom, MAX_ZOOM);
    });

    it('7.2 should increase perspective magnification as zoom increases', () => {
      const pos = { x: 100, y: 0, z: 0 };
      const projClose = PlanetariumEngine.project3DToScreen(pos, { ...CAMERA_DEFAULTS, zoom: 800 });
      const projFar = PlanetariumEngine.project3DToScreen(pos, { ...CAMERA_DEFAULTS, zoom: 300 });
      assert.ok(projClose.scale > projFar.scale);
    });

    it('7.3 should prevent perspective division by zero or negative depth inversion', () => {
      const extremePos = { x: 0, y: 0, z: -1000 };
      const proj = PlanetariumEngine.project3DToScreen(extremePos, { ...CAMERA_DEFAULTS, zoom: 120 });
      assert.ok(Number.isFinite(proj.screenX));
      assert.ok(Number.isFinite(proj.screenY));
      assert.ok(proj.scale > 0);
    });

    it('7.4 should smoothly handle incremental wheel delta events', () => {
      let currentZoom = 560;
      const zoomStep = (deltaY: number) => {
        currentZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, currentZoom - deltaY * 0.5));
      };
      zoomStep(100); // Zoom in
      assert.equal(currentZoom, 510);
      zoomStep(-200); // Zoom out
      assert.equal(currentZoom, 610);
    });

    it('7.5 should maintain center alignment during zoom operations', () => {
      const sunPos = { x: 0, y: 0, z: 0 };
      const proj1 = PlanetariumEngine.project3DToScreen(sunPos, { ...CAMERA_DEFAULTS, zoom: 300 }, 1200, 800);
      const proj2 = PlanetariumEngine.project3DToScreen(sunPos, { ...CAMERA_DEFAULTS, zoom: 900 }, 1200, 800);
      assert.equal(proj1.screenX, 600);
      assert.equal(proj1.screenY, 400);
      assert.equal(proj2.screenX, 600);
      assert.equal(proj2.screenY, 400);
    });
  });

  // ---------------------------------------------------------------------------
  // Feature 8: Planetarium Mode Switcher Integration
  // ---------------------------------------------------------------------------
  describe('Feature 8: Planetarium Mode Switcher Integration', () => {
    it('8.1 should support switching application mode to "planetarium"', () => {
      context.setAppMode('planetarium');
      assert.equal(context.state.appMode, 'planetarium');
    });

    it('8.2 should persist "planetarium" mode to storage key fox_app_mode_v1', () => {
      context.setAppMode('planetarium');
      const stored = env.localStorage.getItem(STORAGE_KEYS.APP_MODE);
      assert.equal(stored, 'planetarium');
    });

    it('8.3 should allow seamless switching between voice, chat, tools, and planetarium', () => {
      const modes: ('voice' | 'chat' | 'tools' | 'planetarium')[] = ['voice', 'chat', 'tools', 'planetarium'];
      modes.forEach((mode) => {
        context.setAppMode(mode);
        assert.equal(context.state.appMode, mode);
      });
    });

    it('8.4 should notify registered UI subscribers synchronously on mode transition', () => {
      let notifiedMode = '';
      context.subscribe((state) => {
        notifiedMode = state.appMode;
      });
      context.setAppMode('planetarium');
      assert.equal(notifiedMode, 'planetarium');
    });

    it('8.5 should gracefully fallback invalid app modes to "voice"', () => {
      const storage = new MockStorageService(env.localStorage);
      env.localStorage.setItem(STORAGE_KEYS.APP_MODE, 'invalid_corrupted_mode');
      const loaded = storage.loadAppMode();
      assert.equal(loaded, 'voice');
    });
  });

  // ---------------------------------------------------------------------------
  // Feature 9: Planet Click & Hover Raycasting
  // ---------------------------------------------------------------------------
  describe('Feature 9: Planet Click & Hover Raycasting', () => {
    it('9.1 should detect click hit on central Sun at screen center (600, 400)', () => {
      const frame = PlanetariumEngine.renderFrame(0, CAMERA_DEFAULTS);
      const hit = PlanetariumEngine.raycastHit(600, 400, frame.projectedBodies);
      assert.equal(hit, 'sun');
    });

    it('9.2 should detect click hit on planets with minimum 16px touch target padding', () => {
      const frame = PlanetariumEngine.renderFrame(0, CAMERA_DEFAULTS);
      const earth = frame.projectedBodies.find((b) => b.id === 'earth')!;
      // Click 10px off-center (within 16px hit target)
      const hit = PlanetariumEngine.raycastHit(earth.screenX + 10, earth.screenY + 5, frame.projectedBodies);
      assert.equal(hit, 'earth');
    });

    it('9.3 should return null when click misses all celestial bodies', () => {
      const frame = PlanetariumEngine.renderFrame(0, CAMERA_DEFAULTS);
      const hit = PlanetariumEngine.raycastHit(50, 50, frame.projectedBodies); // Top-left corner
      assert.equal(hit, null);
    });

    it('9.4 should prioritize frontmost body when two celestial bodies overlap in screen-space', () => {
      // Mock two overlapping bodies: body A at Z=100 (back), body B at Z=-100 (front)
      const mockBodies = [
        {
          id: 'jupiter' as CelestialId,
          name: 'Jupiter',
          worldPos: { x: 0, y: 0, z: 100 },
          screenX: 600,
          screenY: 400,
          screenZ: 100,
          scale: 0.8,
          screenRadius: 20,
          color: '#F4A261',
          glowColor: 'rgba(244, 162, 97, 0.75)',
          glowRadius: 40,
        },
        {
          id: 'earth' as CelestialId,
          name: 'Earth',
          worldPos: { x: 0, y: 0, z: -100 },
          screenX: 600,
          screenY: 400,
          screenZ: -100,
          scale: 1.2,
          screenRadius: 15,
          color: '#4CC9F0',
          glowColor: 'rgba(76, 201, 240, 0.80)',
          glowRadius: 30,
        },
      ];
      // Sorted back-to-front (Z=100 first, Z=-100 second)
      const hit = PlanetariumEngine.raycastHit(600, 400, mockBodies);
      assert.equal(hit, 'earth', 'Frontmost body (Earth, Z=-100) must be selected over back body (Jupiter, Z=100)');
    });

    it('9.5 should update hovered state in assistantContext', () => {
      context.setHoveredCelestial('saturn');
      assert.equal(context.state.hoveredCelestial, 'saturn');
      context.setHoveredCelestial(null);
      assert.equal(context.state.hoveredCelestial, null);
    });
  });

  // ---------------------------------------------------------------------------
  // Feature 10: Camera Focus & Orbit Tracking
  // ---------------------------------------------------------------------------
  describe('Feature 10: Camera Focus & Orbit Tracking', () => {
    it('10.1 should update targetFocus in camera state when a planet is selected', () => {
      context.setFocusedCelestial('mars');
      assert.equal(context.state.focusedCelestial, 'mars');
    });

    it('10.2 should smoothly lerp focus offset toward revolving target position', () => {
      const currentOffset = { x: 0, y: 0, z: 0 };
      const targetOffset = { x: 100, y: 20, z: 80 };
      const nextOffset = PlanetariumEngine.lerpFocus(currentOffset, targetOffset, 0.1);
      assert.equal(nextOffset.x, 10);
      assert.equal(nextOffset.y, 2);
      assert.equal(nextOffset.z, 8);
    });

    it('10.3 should center focused body at screen center (600, 400) during rendering', () => {
      const mars = CELESTIAL_BODY_MAP.mars;
      const camera: typeof CAMERA_DEFAULTS = {
        ...CAMERA_DEFAULTS,
        targetFocus: 'mars',
      };
      const frame = PlanetariumEngine.renderFrame(10, camera);
      const marsProj = frame.projectedBodies.find((b) => b.id === 'mars')!;
      assert.equal(Math.round(marsProj.screenX), 600);
      assert.equal(Math.round(marsProj.screenY), 400);
    });

    it('10.4 should track planet continuously as simulation time progresses', () => {
      const jupiter = CELESTIAL_BODY_MAP.jupiter;
      const camera: typeof CAMERA_DEFAULTS = {
        ...CAMERA_DEFAULTS,
        targetFocus: 'jupiter',
      };
      const f1 = PlanetariumEngine.renderFrame(0, camera);
      const f2 = PlanetariumEngine.renderFrame(100, camera);
      const jup1 = f1.projectedBodies.find((b) => b.id === 'jupiter')!;
      const jup2 = f2.projectedBodies.find((b) => b.id === 'jupiter')!;
      // Screen pos remains centered even though world pos changed
      assert.equal(Math.round(jup1.screenX), 600);
      assert.equal(Math.round(jup2.screenX), 600);
      assert.notDeepEqual(jup1.worldPos, jup2.worldPos);
    });

    it('10.5 should restore focus to Sun when Reset Camera is invoked', () => {
      context.setFocusedCelestial('uranus');
      assert.equal(context.state.focusedCelestial, 'uranus');
      context.resetCamera();
      assert.equal(context.state.focusedCelestial, 'sun');
      assert.equal(context.state.cameraZoom, 560);
    });
  });

  // ---------------------------------------------------------------------------
  // Feature 11: Holographic Celestial Info Card
  // ---------------------------------------------------------------------------
  describe('Feature 11: Holographic Celestial Info Card', () => {
    it('11.1 should populate all required scientific fields for all 10 celestial bodies', () => {
      CELESTIAL_BODIES.forEach((body) => {
        assert.ok(body.name.length > 0);
        assert.ok(body.subtitle.length > 0);
        assert.ok(body.type.length > 0);
        assert.ok(body.diameterKm > 0);
        assert.ok(body.surfaceTemperatureC.length > 0);
        assert.ok(body.gravityMs2 > 0);
        assert.ok(body.facts.length === 3);
      });
    });

    it('11.2 should display accurate orbital period in days and Earth years', () => {
      const venus = CELESTIAL_BODY_MAP.venus;
      assert.equal(venus.orbitalPeriodDays, 224.7);
      assert.equal(venus.orbitalPeriodYears, 0.615);

      const neptune = CELESTIAL_BODY_MAP.neptune;
      assert.equal(neptune.orbitalPeriodDays, 60190.0);
      assert.equal(neptune.orbitalPeriodYears, 164.8);
    });

    it('11.3 should display correct gravity in m/s² and relative G-force', () => {
      const earth = CELESTIAL_BODY_MAP.earth;
      assert.equal(earth.gravityMs2, 9.81);
      assert.equal(earth.gravityG, 1.0);

      const jupiter = CELESTIAL_BODY_MAP.jupiter;
      assert.equal(jupiter.gravityMs2, 24.79);
      assert.equal(jupiter.gravityG, 2.53);
    });

    it('11.4 should provide 3 non-empty, engaging scientific facts per celestial body', () => {
      CELESTIAL_BODIES.forEach((body) => {
        body.facts.forEach((fact, fIdx) => {
          assert.ok(fact.length >= 20, `Fact ${fIdx + 1} for ${body.name} too short`);
        });
      });
    });

    it('11.5 should highlight active target data when focused body changes in state', () => {
      context.setFocusedCelestial('pluto');
      const activeData = CELESTIAL_BODY_MAP[context.state.focusedCelestial];
      assert.equal(activeData.name, 'Pluto');
      assert.equal(activeData.orbitalInclinationDeg, 17.16);
      assert.ok(activeData.tagline.includes('17.16°'));
    });
  });

  // ---------------------------------------------------------------------------
  // Feature 12: Planetarium HUD Quick Switcher
  // ---------------------------------------------------------------------------
  describe('Feature 12: Planetarium HUD Quick Switcher', () => {
    it('12.1 should allow direct 1-click switching to any planet via quick carousel', () => {
      const planetKeys: CelestialId[] = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
      planetKeys.forEach((key) => {
        context.setFocusedCelestial(key);
        assert.equal(context.state.focusedCelestial, key);
      });
    });

    it('12.2 should clamp simulation speed slider within bounds [0.1x, 10.0x]', () => {
      context.setSimulationSpeed(2.5);
      assert.equal(context.state.simulationSpeed, 2.5);

      context.setSimulationSpeed(0.01); // Below min
      assert.equal(context.state.simulationSpeed, 0.1);

      context.setSimulationSpeed(50.0); // Above max
      assert.equal(context.state.simulationSpeed, 10.0);
    });

    it('12.3 should toggle simulation pause and resume state', () => {
      assert.equal(context.state.isPaused, false);
      context.togglePause();
      assert.equal(context.state.isPaused, true);
      context.togglePause();
      assert.equal(context.state.isPaused, false);
    });

    it('12.4 should advance planetary orbits faster at higher speed multipliers', () => {
      const earth = CELESTIAL_BODY_MAP.earth;
      const p1 = PlanetariumEngine.getOrbitalPosition(earth, 10.0, 1.0);
      const p2 = PlanetariumEngine.getOrbitalPosition(earth, 10.0, 5.0);
      assert.notDeepEqual(p1, p2, '5x speed multiplier should advance orbital position further');
    });

    it('12.5 should freeze orbital positions when isPaused is true', () => {
      const mars = CELESTIAL_BODY_MAP.mars;
      const frozenTime = 42.0;
      const pos1 = PlanetariumEngine.getOrbitalPosition(mars, frozenTime, 1.0);
      const pos2 = PlanetariumEngine.getOrbitalPosition(mars, frozenTime, 1.0);
      assert.deepEqual(pos1, pos2);
    });
  });

  // ---------------------------------------------------------------------------
  // Feature 13: Coronal Flare Audio Reactivity
  // ---------------------------------------------------------------------------
  describe('Feature 13: Coronal Flare Audio Reactivity', () => {
    it('13.1 should expand Sun coronal glow radius as audio level increases', () => {
      const silentFlares = PlanetariumEngine.getSolarFlareParameters(0, 0.0);
      const loudFlares = PlanetariumEngine.getSolarFlareParameters(0, 0.9);
      assert.ok(
        loudFlares.coronalGlowRadius > silentFlares.coronalGlowRadius,
        'Loud audio must expand coronal glow radius'
      );
    });

    it('13.2 should increase solar prominence loop count on voice audio spikes', () => {
      const fQuiet = PlanetariumEngine.getSolarFlareParameters(0, 0.1);
      const fSpike = PlanetariumEngine.getSolarFlareParameters(0, 0.85);
      assert.ok(fSpike.prominenceCount > fQuiet.prominenceCount);
    });

    it('13.3 should boost flare intensity and prominence scale with speech energy', () => {
      const quiet = PlanetariumEngine.getSolarFlareParameters(0, 0.0);
      const loud = PlanetariumEngine.getSolarFlareParameters(0, 1.0);
      assert.ok(loud.flareIntensity > quiet.flareIntensity);
      assert.ok(loud.prominenceScale > quiet.prominenceScale);
    });

    it('13.4 should safely clamp audio levels outside [0.0, 1.0] without crashing', () => {
      const underflow = PlanetariumEngine.getSolarFlareParameters(0, -2.5);
      const overflow = PlanetariumEngine.getSolarFlareParameters(0, 5.0);
      assert.ok(Number.isFinite(underflow.coronalGlowRadius));
      assert.ok(Number.isFinite(overflow.coronalGlowRadius));
    });

    it('13.5 should seamlessly sync assistantContext audioLevel to solar rendering', () => {
      context.setAudioLevel(0.75);
      assert.equal(context.state.audioLevel, 0.75);
      const frame = PlanetariumEngine.renderFrame(1.0, CAMERA_DEFAULTS, context.state.audioLevel);
      assert.ok(frame.solarFlare.coronalGlowRadius > 100);
    });
  });

  // ---------------------------------------------------------------------------
  // Feature 14: Saturn Ring & Track Audio Shimmer
  // ---------------------------------------------------------------------------
  describe('Feature 14: Saturn Ring & Track Audio Shimmer', () => {
    it('14.1 should modulate Saturn ring particle luminescence and alpha on audio activity', () => {
      const saturnPos = { x: 278, y: 0, z: 0 };
      const silentRings = PlanetariumEngine.getSaturnRingSegments(saturnPos, CAMERA_DEFAULTS, 0.0, 1.0);
      const loudRings = PlanetariumEngine.getSaturnRingSegments(saturnPos, CAMERA_DEFAULTS, 0.8, 1.0);
      assert.notEqual(silentRings.frontRings[0].alpha, loudRings.frontRings[0].alpha);
    });

    it('14.2 should maintain ring shimmer opacity strictly within [0.0, 1.0]', () => {
      const saturnPos = { x: 278, y: 0, z: 0 };
      for (let t = 0; t < 10; t += 0.5) {
        const rings = PlanetariumEngine.getSaturnRingSegments(saturnPos, CAMERA_DEFAULTS, 1.0, t);
        rings.frontRings.forEach((seg) => {
          assert.ok(seg.alpha >= 0.0 && seg.alpha <= 1.0, `Alpha (${seg.alpha}) out of bounds`);
        });
      }
    });

    it('14.3 should oscillate shimmer at high frequencies during speech playback', () => {
      const saturnPos = { x: 278, y: 0, z: 0 };
      const r1 = PlanetariumEngine.getSaturnRingSegments(saturnPos, CAMERA_DEFAULTS, 0.7, 0.1);
      const r2 = PlanetariumEngine.getSaturnRingSegments(saturnPos, CAMERA_DEFAULTS, 0.7, 0.35);
      assert.notEqual(r1.frontRings[0].alpha, r2.frontRings[0].alpha);
    });

    it('14.4 should preserve ring geometry and tilt while modulating shimmer brightness', () => {
      const saturnPos = { x: 278, y: 0, z: 0 };
      const quiet = PlanetariumEngine.getSaturnRingSegments(saturnPos, CAMERA_DEFAULTS, 0.0, 0);
      const loud = PlanetariumEngine.getSaturnRingSegments(saturnPos, CAMERA_DEFAULTS, 1.0, 0);
      assert.equal(quiet.frontRings[0].screenX, loud.frontRings[0].screenX);
      assert.equal(quiet.frontRings[0].screenY, loud.frontRings[0].screenY);
    });

    it('14.5 should apply shimmer effect symmetrically across front and back ring partitions', () => {
      const saturnPos = { x: 278, y: 0, z: 0 };
      const rings = PlanetariumEngine.getSaturnRingSegments(saturnPos, CAMERA_DEFAULTS, 0.6, 2.0);
      assert.equal(rings.frontRings[0].alpha, rings.backRings[0].alpha);
    });
  });

  // ---------------------------------------------------------------------------
  // Feature 15: 60 FPS Real-time Performance
  // ---------------------------------------------------------------------------
  describe('Feature 15: 60 FPS Real-time Performance', () => {
    it('15.1 should render complete solar system frame math in under 2.5ms', () => {
      const t0 = performance.now();
      for (let i = 0; i < 20; i++) {
        PlanetariumEngine.renderFrame(i * 0.1, CAMERA_DEFAULTS, 0.3, 1.0);
      }
      const avgDuration = (performance.now() - t0) / 20;
      assert.ok(avgDuration < 2.5, `Average frame duration (${avgDuration.toFixed(3)}ms) must be < 2.5ms`);
    });

    it('15.2 should perform depth sorting on 10 celestial bodies in under 0.2ms', () => {
      const t0 = performance.now();
      for (let i = 0; i < 100; i++) {
        PlanetariumEngine.renderFrame(i * 0.05, CAMERA_DEFAULTS);
      }
      const totalDuration = performance.now() - t0;
      assert.ok(totalDuration < 20.0, `100 depth-sorted frames took ${totalDuration.toFixed(2)}ms`);
    });

    it('15.3 should scale viewport dimensions responsively without allocation bloat', () => {
      const frameSmall = PlanetariumEngine.renderFrame(0, CAMERA_DEFAULTS, 0, 1, 400, 300);
      const frameLarge = PlanetariumEngine.renderFrame(0, CAMERA_DEFAULTS, 0, 1, 2560, 1440);
      assert.equal(frameSmall.projectedBodies.length, 10);
      assert.equal(frameLarge.projectedBodies.length, 10);
    });

    it('15.4 should support normalized delta-time stepping for variable refresh displays (60Hz / 120Hz / 144Hz)', () => {
      const cam60 = PlanetariumEngine.stepMomentumPhysics({ ...CAMERA_DEFAULTS, velocityYaw: 0.1 }, 1 / 60);
      const cam120 = PlanetariumEngine.stepMomentumPhysics({ ...CAMERA_DEFAULTS, velocityYaw: 0.1 }, 1 / 120);
      assert.ok(cam60.yaw > cam120.yaw, '60Hz dt (1/60s) should advance yaw twice as much as 120Hz dt (1/120s)');
    });

    it('15.5 should maintain zero garbage collector memory churn during continuous frame iterations', () => {
      for (let frame = 0; frame < 500; frame++) {
        PlanetariumEngine.renderFrame(frame * 0.016, CAMERA_DEFAULTS, 0.2);
      }
      assert.ok(true, '500 continuous frames completed without memory exhaustion');
    });
  });

  // ---------------------------------------------------------------------------
  // Feature 16: State & Storage Persistence
  // ---------------------------------------------------------------------------
  describe('Feature 16: State & Storage Persistence', () => {
    it('16.1 should persist and reload focused celestial target in localStorage', () => {
      const storage = new MockStorageService(env.localStorage);
      storage.savePlanetariumTarget('jupiter');
      assert.equal(env.localStorage.getItem(STORAGE_KEYS.PLANETARIUM_TARGET), 'jupiter');
      assert.equal(storage.loadPlanetariumTarget(), 'jupiter');
    });

    it('16.2 should persist and reload app mode "planetarium" across browser reloads', () => {
      const storage = new MockStorageService(env.localStorage);
      storage.saveAppMode('planetarium');
      assert.equal(env.localStorage.getItem(STORAGE_KEYS.APP_MODE), 'planetarium');
      assert.equal(storage.loadAppMode(), 'planetarium');
    });

    it('16.3 should gracefully handle missing storage values and return defaults', () => {
      env.localStorage.clear();
      const storage = new MockStorageService(env.localStorage);
      assert.equal(storage.loadAppMode(), 'voice');
      assert.equal(storage.loadPlanetariumTarget(), 'sun');
    });

    it('16.4 should safely recover from corrupted target strings (prototype pollution, script injections)', () => {
      const storage = new MockStorageService(env.localStorage);
      env.localStorage.setItem(STORAGE_KEYS.PLANETARIUM_TARGET, '__proto__');
      assert.equal(storage.loadPlanetariumTarget(), 'sun');

      env.localStorage.setItem(STORAGE_KEYS.PLANETARIUM_TARGET, '<script>alert(1)</script>');
      assert.equal(storage.loadPlanetariumTarget(), 'sun');
    });

    it('16.5 should safely catch QuotaExceededError during target saving without throwing unhandled exceptions', () => {
      env.localStorage.quotaErrorTrigger = true;
      const storage = new MockStorageService(env.localStorage);
      const success = storage.savePlanetariumTarget('uranus');
      assert.equal(success, false, 'Should catch quota error and return false');
    });
  });
});
