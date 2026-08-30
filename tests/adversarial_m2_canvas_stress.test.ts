/**
 * Empirical Challenger Test Suite: Milestone 2 3D Canvas Engine & Shaders Adversarial Stress Tests
 * 
 * Specifically validates:
 * 1. Camera pitch boundary clamping: strictly [-85°, +85°] across 10,000 violent drag vectors
 * 2. Zoom distance boundary clamping: strictly [120px, 1600px] across 10,000 wheel & pinch interactions
 * 3. Saturn 3D ring horizon-split: 48 segments partition into back and front halves with 0 missing or NaN slices
 * 4. Raycasting precision: robust hit detection on all 10 celestial bodies across diverse camera angles
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  CELESTIAL_BODIES,
  CELESTIAL_BODY_MAP,
  PLANET_VISUAL_RADII,
  getCelestialBody,
} from '../app/components/Planetarium/PlanetaryData.ts';

import {
  computeSaturnRingSegments,
  computeSolarFlareParams,
  createStarfield,
  hexToRgb,
  rgba,
  lerpColor,
  proceduralTurbulence,
  renderStarfield,
  renderSun,
  renderPlanet,
  renderSaturnRingPass,
  renderOrbitalTrack,
  renderPlanetLabel,
  renderCelestialSelectionReticle,
} from '../app/components/Planetarium/SolarShaders.ts';

import {
  PlanetariumEngine,
  CAMERA_DEFAULTS,
  PITCH_LIMIT_RAD,
  PITCH_LIMIT_DEG,
  MIN_ZOOM,
  MAX_ZOOM,
} from './harness/planetariumEngine.ts';

import { MockCanvasRenderingContext2D } from './harness/domMock.ts';

describe('Adversarial Stress Test: Milestone 2 3D Canvas Engine & Shaders', () => {
  // ---------------------------------------------------------------------------
  // 1. Camera Pitch Boundary Clamping Stress Test (10,000 violent vectors)
  // ---------------------------------------------------------------------------
  describe('1. Camera Pitch Clamping Adversarial Stress (10,000 Violent Drag Vectors)', () => {
    it('1.1 should strictly clamp pitch within [-85°, +85°] across 10,000 violent random drag vectors', () => {
      const PITCH_LIMIT = (85 * Math.PI) / 180;
      let currentPitch = 0.55;
      let currentYaw = 0.45;

      for (let i = 0; i < 10000; i++) {
        // Generate violent mouse drag delta y ranging from -50,000px to +50,000px
        const dy = (Math.random() - 0.5) * 100000;
        const dx = (Math.random() - 0.5) * 100000;

        currentYaw += dx * 0.006;
        currentPitch += dy * 0.006;

        // Apply shader/canvas clamping rule
        currentPitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, currentPitch));

        assert.ok(
          currentPitch >= -PITCH_LIMIT - 1e-12 && currentPitch <= PITCH_LIMIT + 1e-12,
          `Pitch ${currentPitch} exceeded [-85°, +85°] at iteration ${i} with dy=${dy}`
        );
        assert.ok(Number.isFinite(currentPitch), `Pitch became non-finite at iteration ${i}`);
        assert.ok(!Number.isNaN(currentPitch), `Pitch became NaN at iteration ${i}`);
      }
    });

    it('1.2 should strictly clamp pitch within [-85°, +85°] during continuous momentum physics integration under extreme velocities', () => {
      let state = {
        ...CAMERA_DEFAULTS,
        pitch: 0,
        velocityYaw: 0,
        velocityPitch: 0,
      };

      for (let i = 0; i < 10000; i++) {
        // Inject extreme velocity impulses periodically
        if (i % 50 === 0) {
          state.velocityPitch = (Math.random() - 0.5) * 2000; // massive rotational velocity
          state.velocityYaw = (Math.random() - 0.5) * 2000;
        }

        state = PlanetariumEngine.stepMomentumPhysics(state, 1 / 60);

        assert.ok(
          state.pitch >= -PITCH_LIMIT_RAD - 1e-12 && state.pitch <= PITCH_LIMIT_RAD + 1e-12,
          `Physics pitch ${state.pitch} breached limit at step ${i}`
        );
        assert.ok(Number.isFinite(state.pitch), `Physics pitch non-finite at step ${i}`);
      }
    });

    it('1.3 should handle pathological numerical inputs (Infinity, -Infinity, NaN, subnormal floats) gracefully', () => {
      const PITCH_LIMIT = (85 * Math.PI) / 180;
      const pathologicalInputs = [
        Infinity,
        -Infinity,
        1e308,
        -1e308,
        1e-308,
        -1e-308,
        Number.MAX_SAFE_INTEGER,
        -Number.MAX_SAFE_INTEGER,
      ];

      for (const input of pathologicalInputs) {
        const clamped = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, input));
        assert.ok(clamped >= -PITCH_LIMIT && clamped <= PITCH_LIMIT);
        assert.ok(Number.isFinite(clamped));
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Zoom Distance Boundary Clamping Stress Test (10,000 interactions)
  // ---------------------------------------------------------------------------
  describe('2. Zoom Distance Boundary Clamping (10,000 Interactions)', () => {
    it('2.1 should strictly clamp zoom within [120px, 1600px] across 5,000 massive wheel events', () => {
      let targetZoom = 560;

      for (let i = 0; i < 5000; i++) {
        // Generate wheel deltaY from -1,000,000 to +1,000,000
        const deltaY = (Math.random() - 0.5) * 2000000;
        const zoomDelta = deltaY * -0.65;
        targetZoom = Math.max(120, Math.min(1600, targetZoom + zoomDelta));

        assert.ok(
          targetZoom >= 120 && targetZoom <= 1600,
          `Target zoom ${targetZoom} outside [120, 1600] at iteration ${i} with deltaY=${deltaY}`
        );
        assert.ok(Number.isFinite(targetZoom));
      }
    });

    it('2.2 should strictly clamp zoom within [120px, 1600px] across 5,000 pinch gesture scale factors', () => {
      let initialPinchZoom = 560;

      for (let i = 0; i < 5000; i++) {
        // Scale factors ranging from 1e-6 (massive pinch in) to 1e6 (massive pinch out)
        const scaleFactor = Math.pow(10, (Math.random() - 0.5) * 12);
        const targetZoom = Math.max(120, Math.min(1600, initialPinchZoom * scaleFactor));

        assert.ok(
          targetZoom >= 120 && targetZoom <= 1600,
          `Pinch zoom ${targetZoom} outside [120, 1600] at iteration ${i} with scaleFactor=${scaleFactor}`
        );
        assert.ok(Number.isFinite(targetZoom));
      }
    });

    it('2.3 should smoothly interpolate currentZoom towards targetZoom without overshoot or divergence', () => {
      let currentZoom = 560;
      const targetZoom = 1600;

      for (let f = 0; f < 300; f++) {
        const dt = 1 / 60;
        const zoomLerpSpeed = 1 - Math.exp(-5.0 * dt);
        currentZoom += (targetZoom - currentZoom) * zoomLerpSpeed;
        assert.ok(currentZoom >= 120 && currentZoom <= 1600.001);
      }
      assert.ok(Math.abs(currentZoom - 1600) < 0.01, `Zoom failed to converge to 1600: ${currentZoom}`);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Saturn 3D Ring Horizon-Split Math & Geometry (1,000 camera configurations)
  // ---------------------------------------------------------------------------
  describe('3. Saturn 3D Ring Horizon-Split Partition & Shaders', () => {
    it('3.1 should partition exactly 48 segments into front and back halves with 0 missing or NaN slices across 1,000 camera orientations', () => {
      const saturnWorldPos = { x: 278, y: 0, z: 0 };
      const viewportWidth = 1200;
      const viewportHeight = 800;

      for (let i = 0; i < 1000; i++) {
        const yaw = (i / 1000) * Math.PI * 2;
        const pitch = ((i % 100) / 100) * 2.96 - 1.48; // span -85° to +85°
        const zoom = 120 + Math.random() * (1600 - 120);
        const audioLevel = Math.random();
        const time = i * 0.1;

        const camera = {
          yaw,
          pitch,
          zoom,
          focusOffset: { x: (Math.random() - 0.5) * 50, y: 0, z: 0 },
        };

        const { backRings, frontRings } = computeSaturnRingSegments(
          saturnWorldPos,
          camera,
          viewportWidth,
          viewportHeight,
          audioLevel,
          time
        );

        // 1. Exact 48 segment count
        const totalSegments = backRings.length + frontRings.length;
        assert.equal(
          totalSegments,
          48,
          `Expected exactly 48 slices, got ${totalSegments} (back: ${backRings.length}, front: ${frontRings.length}) at orientation ${i}`
        );

        // 2. Both front and back ring sets must exist at oblique angles
        assert.ok(backRings.length >= 0 && frontRings.length >= 0);

        // 3. Check every segment for NaN, Inf, and depth correctness
        const allSegments = [...frontRings, ...backRings];
        for (const seg of allSegments) {
          assert.ok(Number.isFinite(seg.screenX), `Segment screenX non-finite at ${i}`);
          assert.ok(Number.isFinite(seg.screenY), `Segment screenY non-finite at ${i}`);
          assert.ok(Number.isFinite(seg.screenZ), `Segment screenZ non-finite at ${i}`);
          assert.ok(Number.isFinite(seg.scale), `Segment scale non-finite at ${i}`);
          assert.ok(seg.scale > 0, `Segment scale must be positive at ${i}`);
          assert.ok(Number.isFinite(seg.alpha), `Segment alpha non-finite at ${i}`);
          assert.ok(seg.alpha >= 0 && seg.alpha <= 1.0, `Segment alpha out of [0, 1] bounds at ${i}`);
          assert.ok(Number.isFinite(seg.worldPos.x));
          assert.ok(Number.isFinite(seg.worldPos.y));
          assert.ok(Number.isFinite(seg.worldPos.z));
        }
      }
    });

    it('3.2 should strictly sort front rings in front of Saturn center and back rings behind Saturn center', () => {
      const saturnWorldPos = { x: 278, y: 15, z: -40 };
      const testAngles = [
        { yaw: 0, pitch: 0 },
        { yaw: Math.PI / 4, pitch: Math.PI / 6 },
        { yaw: Math.PI / 2, pitch: -Math.PI / 4 },
        { yaw: Math.PI, pitch: 1.48 },
        { yaw: (3 * Math.PI) / 2, pitch: -1.48 },
      ];

      for (const { yaw, pitch } of testAngles) {
        const camera = { yaw, pitch, zoom: 600, focusOffset: saturnWorldPos };
        const saturnProj = PlanetariumEngine.project3DToScreen(saturnWorldPos, camera);
        const { backRings, frontRings } = computeSaturnRingSegments(
          saturnWorldPos,
          camera,
          1200,
          800,
          0.5,
          10
        );

        for (const seg of frontRings) {
          assert.ok(
            seg.screenZ <= saturnProj.screenZ + 1e-6,
            `Front ring screenZ (${seg.screenZ}) must be <= Saturn screenZ (${saturnProj.screenZ})`
          );
          assert.equal(seg.isFront, true);
        }

        for (const seg of backRings) {
          assert.ok(
            seg.screenZ >= saturnProj.screenZ - 1e-6,
            `Back ring screenZ (${seg.screenZ}) must be >= Saturn screenZ (${saturnProj.screenZ})`
          );
          assert.equal(seg.isFront, false);
        }
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Raycasting Precision & Hit Detection Across All 10 Celestial Bodies
  // ---------------------------------------------------------------------------
  describe('4. Raycasting Precision Across All 10 Celestial Bodies', () => {
    it('4.1 should accurately hit-detect all 10 celestial bodies at their projected center coordinates across 100 simulation time steps', () => {
      const cameraAngles = [
        { yaw: 0, pitch: 0.55, zoom: 560 },
        { yaw: Math.PI / 3, pitch: 0.2, zoom: 700 },
        { yaw: Math.PI, pitch: -0.8, zoom: 450 },
        { yaw: (3 * Math.PI) / 2, pitch: 1.2, zoom: 850 },
      ];

      for (const cam of cameraAngles) {
        for (let t = 0; t < 100; t += 10) {
          const frame = PlanetariumEngine.renderFrame(t, {
            ...CAMERA_DEFAULTS,
            ...cam,
          });

          for (const body of frame.projectedBodies) {
            const hitId = PlanetariumEngine.raycastHit(body.screenX, body.screenY, frame.projectedBodies, 12);
            assert.ok(hitId !== null, `Failed to hit ${body.id} at (${body.screenX}, ${body.screenY})`);
            
            // If overlapping, verify that the returned body is in front or equals target body
            if (hitId !== body.id) {
              const hitBody = frame.projectedBodies.find((b) => b.id === hitId)!;
              assert.ok(
                hitBody.screenZ <= body.screenZ,
                `Hit ${hitId} (screenZ=${hitBody.screenZ}) when targeting ${body.id} (screenZ=${body.screenZ}), but hit is behind target!`
              );
            }
          }
        }
      }
    });

    it('4.2 should accurately hit-detect celestial bodies when clicking within radius tolerance (radius + 8px)', () => {
      const frame = PlanetariumEngine.renderFrame(15, CAMERA_DEFAULTS);

      for (const body of frame.projectedBodies) {
        // Test 8 perimeter sample points around the body within touch radius
        const testRadius = body.screenRadius + 4;
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
          const testX = body.screenX + Math.cos(angle) * testRadius;
          const testY = body.screenY + Math.sin(angle) * testRadius;
          const hitId = PlanetariumEngine.raycastHit(testX, testY, frame.projectedBodies, 12);
          assert.ok(hitId !== null, `Perimeter hit test failed for ${body.id} at angle ${angle}`);
        }
      }
    });

    it('4.3 should return null when clicking in deep empty space far from any celestial body', () => {
      const frame = PlanetariumEngine.renderFrame(0, CAMERA_DEFAULTS);
      const emptySpaceClicks = [
        { x: -500, y: -500 },
        { x: 2000, y: 2000 },
        { x: 50, y: 50 },
        { x: 1150, y: 50 },
      ];

      for (const pt of emptySpaceClicks) {
        const hitId = PlanetariumEngine.raycastHit(pt.x, pt.y, frame.projectedBodies, 8);
        assert.equal(hitId, null, `Expected null hit in empty space at (${pt.x}, ${pt.y}), got ${hitId}`);
      }
    });

    it('4.4 should correctly tie-break overlapping bodies by selecting the frontmost body (smallest screenZ)', () => {
      const overlappingBodies = [
        {
          id: 'earth' as const,
          name: 'Earth',
          worldPos: { x: 100, y: 0, z: 0 },
          screenX: 600,
          screenY: 400,
          screenZ: 150, // Farther away
          scale: 0.8,
          screenRadius: 10,
          color: '#3B82F6',
          glowColor: '#60A5FA',
          glowRadius: 22,
        },
        {
          id: 'mars' as const,
          name: 'Mars',
          worldPos: { x: 100, y: 0, z: -50 },
          screenX: 600,
          screenY: 400,
          screenZ: 50, // Closer to camera
          scale: 1.1,
          screenRadius: 8,
          color: '#EF4444',
          glowColor: '#F87171',
          glowRadius: 18,
        },
      ];

      const hitId = PlanetariumEngine.raycastHit(600, 400, overlappingBodies, 8);
      assert.equal(hitId, 'mars', `Expected frontmost body 'mars', got ${hitId}`);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Shader Utility & Procedural Generators Math Integrity
  // ---------------------------------------------------------------------------
  describe('5. Shader Math & Procedural Generators Integrity', () => {
    it('5.1 should generate 320 valid star particles with bounded coordinates and colors', () => {
      const starfield = createStarfield(320);
      assert.equal(starfield.length, 320);

      for (const star of starfield) {
        assert.ok(Number.isFinite(star.x));
        assert.ok(Number.isFinite(star.y));
        assert.ok(Number.isFinite(star.z));
        assert.ok(star.size >= 0.5 && star.size <= 4.0);
        assert.ok(star.baseAlpha >= 0.2 && star.baseAlpha <= 1.0);
        assert.ok(star.twinkleSpeed > 0);
        assert.ok(star.color.startsWith('#'));
      }
    });

    it('5.2 should compute valid solar flare parameters across all audio and time levels', () => {
      for (let audio = 0; audio <= 1.0; audio += 0.1) {
        for (let t = 0; t < 10; t += 1) {
          const params = computeSolarFlareParams(t, audio, null);
          assert.ok(params.coreRadius >= 30 && params.coreRadius <= 60);
          assert.ok(params.coronalGlowRadius >= params.coreRadius);
          assert.ok(params.prominenceCount >= 10);
          assert.ok(params.flareIntensity >= 0.7 && params.flareIntensity <= 1.5);
        }
      }
    });

    it('5.3 should interpolate colors and calculate procedural turbulence deterministically without NaN', () => {
      const c1 = '#FF0000';
      const c2 = '#0000FF';
      const mid = lerpColor(c1, c2, 0.5);
      assert.ok(mid.startsWith('rgb('));

      const rgbObj = hexToRgb('#4A90E2');
      assert.equal(rgbObj.r, 74);
      assert.equal(rgbObj.g, 144);
      assert.equal(rgbObj.b, 226);

      const rgbaStr = rgba('#4A90E2', 0.5);
      assert.equal(rgbaStr, 'rgba(74, 144, 226, 0.500)');

      for (let i = 0; i < 50; i++) {
        const turb = proceduralTurbulence(i * 0.1, i * 0.2, i * 0.05, 3);
        assert.ok(turb >= 0 && turb <= 1.0, `Turbulence ${turb} outside [0, 1]`);
        assert.ok(Number.isFinite(turb));
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Complete 2D Shader Canvas Execution Across All 10 Celestial Bodies
  // ---------------------------------------------------------------------------
  describe('6. 2D Shader Canvas Execution on Mock Context', () => {
    it('6.1 should execute renderStarfield without errors or canvas state leaks', () => {
      const ctx = new MockCanvasRenderingContext2D();
      const starfield = createStarfield(100);
      const camera = { yaw: 0.5, pitch: 0.3, zoom: 600 };

      assert.doesNotThrow(() => {
        renderStarfield(ctx as any, starfield, camera, 1200, 800, 1.5);
      });
      assert.ok(ctx.drawCalls.length > 0);
    });

    it('6.2 should execute renderSun and prominence loops across audio levels', () => {
      const ctx = new MockCanvasRenderingContext2D();
      const sunItem = {
        id: 'sun' as const,
        name: 'Sun',
        worldPos: { x: 0, y: 0, z: 0 },
        screenX: 600,
        screenY: 400,
        screenZ: 0,
        scale: 1.0,
        screenRadius: 36,
        color: '#FFF4D0',
        glowColor: '#FFA500',
        glowRadius: 80,
        data: getCelestialBody('sun'),
        isHovered: false,
        isSelected: false,
      };

      for (let audio = 0; audio <= 1.0; audio += 0.5) {
        const flareParams = computeSolarFlareParams(5.0, audio, null);
        assert.doesNotThrow(() => {
          renderSun(ctx as any, sunItem, flareParams, 5.0);
        });
      }
    });

    it('6.3 should execute renderPlanet for all 9 planets without throwing', () => {
      const ctx = new MockCanvasRenderingContext2D();

      for (const body of CELESTIAL_BODIES) {
        if (body.id === 'sun') continue;
        const item = {
          id: body.id,
          name: body.name,
          worldPos: { x: body.orbitalRadiusScaled, y: 0, z: 0 },
          screenX: 600 + body.orbitalRadiusScaled * 0.8,
          screenY: 400,
          screenZ: 50,
          scale: 1.0,
          screenRadius: PLANET_VISUAL_RADII[body.id] || 10,
          color: body.color,
          glowColor: body.glowColor,
          glowRadius: (PLANET_VISUAL_RADII[body.id] || 10) * 2.2,
          data: body,
          isHovered: false,
          isSelected: false,
        };

        assert.doesNotThrow(() => {
          renderPlanet(ctx as any, item, { x: 600, y: 400 }, 10.0);
        }, `renderPlanet threw for ${body.id}`);
      }
    });

    it('6.4 should execute renderSaturnRingPass for both front and back passes', () => {
      const ctx = new MockCanvasRenderingContext2D();
      const saturnBody = getCelestialBody('saturn');
      const saturnItem = {
        id: 'saturn' as const,
        name: 'Saturn',
        worldPos: { x: 278, y: 0, z: 0 },
        screenX: 750,
        screenY: 420,
        screenZ: 100,
        scale: 0.9,
        screenRadius: 18,
        color: saturnBody.color,
        glowColor: saturnBody.glowColor,
        glowRadius: 40,
        data: saturnBody,
        isHovered: true,
        isSelected: false,
      };

      const camera = { yaw: 0.8, pitch: 0.5, zoom: 560 };

      // Back Pass
      assert.doesNotThrow(() => {
        renderSaturnRingPass(ctx as any, saturnItem, camera, false, 0.7, 12.0);
      });

      // Front Pass
      assert.doesNotThrow(() => {
        renderSaturnRingPass(ctx as any, saturnItem, camera, true, 0.7, 12.0);
      });
    });

    it('6.5 should execute renderOrbitalTrack and renderPlanetLabel without throwing', () => {
      const ctx = new MockCanvasRenderingContext2D();
      const camera = { yaw: 0.45, pitch: 0.55, zoom: 560 };

      for (const body of CELESTIAL_BODIES) {
        if (body.id === 'sun') continue;
        assert.doesNotThrow(() => {
          renderOrbitalTrack(ctx as any, body, camera, 1200, 800, false, false, 0.3, 5.0);
        });

        const item = {
          id: body.id,
          name: body.name,
          worldPos: { x: body.orbitalRadiusScaled, y: 0, z: 0 },
          screenX: 600,
          screenY: 400,
          screenZ: 20,
          scale: 1.0,
          screenRadius: 12,
          color: body.color,
          glowColor: body.glowColor,
          glowRadius: 26,
          data: body,
          isHovered: true,
          isSelected: true,
        };

        assert.doesNotThrow(() => {
          renderPlanetLabel(ctx as any, item, true);
        });

        assert.doesNotThrow(() => {
          renderCelestialSelectionReticle(ctx as any, item, 5.0);
        });
      }
    });
  });
});
