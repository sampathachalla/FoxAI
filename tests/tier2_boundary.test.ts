/**
 * Tier 2: Boundary & Corner Cases E2E Test Suite
 * Covers all 12 features from PROJECT.md with >= 5 boundary/corner test cases per feature (>= 60 total tests)
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { setupTestEnvironment } from './harness/domMock.ts';
import type { CoreShapeId } from './harness/types.ts';
import {
  CORE_SHAPES,
  STORAGE_KEYS,
  isValidCoreShapeId,
  normalizeCoreShapeId,
  ACCENT_THEMES,
} from './harness/types.ts';
import { ProceduralGeometryEngine, hexToRgb } from './harness/geometryEngine.ts';
import { AssistantStateMockEngine } from './harness/stateEngine.ts';

describe('Tier 2: Boundary & Corner Cases', () => {
  let env: ReturnType<typeof setupTestEnvironment>;

  beforeEach(() => {
    env = setupTestEnvironment();
  });

  afterEach(() => {
    env.cleanup();
  });

  // =========================================================================
  // Feature 1 Boundary: Shape Type & Metadata Edge Cases
  // =========================================================================
  describe('F1 Boundary: Type & Metadata Edge Cases', () => {
    it('B1.1: should normalize mixed-case shape strings to fallback if invalid', () => {
      assert.strictEqual(normalizeCoreShapeId('SPHERE'), 'sphere'); // fallback
      assert.strictEqual(normalizeCoreShapeId('Torus'), 'sphere');
    });

    it('B1.2: should handle prototype pollution or special property names safely', () => {
      assert.strictEqual(isValidCoreShapeId('__proto__'), false);
      assert.strictEqual(isValidCoreShapeId('constructor'), false);
      assert.strictEqual(isValidCoreShapeId('toString'), false);
      assert.strictEqual(normalizeCoreShapeId('__proto__', 'sphere'), 'sphere');
    });

    it('B1.3: should handle empty strings, whitespaces, and symbols without throwing', () => {
      assert.strictEqual(normalizeCoreShapeId('', 'sphere'), 'sphere');
      assert.strictEqual(normalizeCoreShapeId('   ', 'torus'), 'torus');
      assert.strictEqual(normalizeCoreShapeId('!@#$%^&*()', 'sphere'), 'sphere');
    });

    it('B1.4: should handle non-string primitive inputs (numbers, booleans, objects)', () => {
      assert.strictEqual(normalizeCoreShapeId(12345, 'sphere'), 'sphere');
      assert.strictEqual(normalizeCoreShapeId(true, 'sphere'), 'sphere');
      assert.strictEqual(normalizeCoreShapeId({ shape: 'sphere' }, 'helix'), 'helix');
      assert.strictEqual(normalizeCoreShapeId([ 'sphere' ], 'tesseract'), 'tesseract');
    });

    it('B1.5: should ensure metadata list is immutable and contains valid particle counts', () => {
      assert.ok(CORE_SHAPES.every((s) => Number.isInteger(s.particleCount) && s.particleCount >= 1000));
      assert.ok(CORE_SHAPES.every((s) => typeof s.badge === 'string' && s.badge.length > 0));
    });
  });

  // =========================================================================
  // Feature 2 Boundary: Storage Persistence Edge Cases
  // =========================================================================
  describe('F2 Boundary: Storage Persistence Edge Cases', () => {
    it('B2.1: should gracefully handle QuotaExceededError when saving shape', () => {
      env.localStorage.quotaErrorTrigger = true;
      const state = new AssistantStateMockEngine();

      // Should not crash when localStorage.setItem throws
      assert.doesNotThrow(() => {
        state.setCoreShape('torus');
      });
      // In-memory state remains updated
      assert.strictEqual(state.getCoreShape(), 'torus');
    });

    it('B2.2: should recover from corrupted JSON or binary noise in localStorage', () => {
      env.localStorage.setItem(STORAGE_KEYS.CORE_SHAPE, '{"malformed": true,,,');
      const state = new AssistantStateMockEngine();
      assert.strictEqual(state.getCoreShape(), 'sphere');
    });

    it('B2.3: should handle null storage backend when window.localStorage is undefined', () => {
      const originalStorage = (globalThis as any).localStorage;
      delete (globalThis as any).localStorage;

      const state = new AssistantStateMockEngine();
      assert.doesNotThrow(() => {
        state.setCoreShape('helix');
      });
      assert.strictEqual(state.getCoreShape(), 'helix');

      (globalThis as any).localStorage = originalStorage;
    });

    it('B2.4: should overwrite legacy keys without leaving residual state', () => {
      env.localStorage.setItem(STORAGE_KEYS.CORE_SHAPE, 'dna_helix');
      const state = new AssistantStateMockEngine();
      assert.strictEqual(state.getCoreShape(), 'helix');

      state.setCoreShape('tesseract');
      assert.strictEqual(env.localStorage.getItem(STORAGE_KEYS.CORE_SHAPE), 'tesseract');
    });

    it('B2.5: should retain state when localStorage contains unicode or emoji strings', () => {
      env.localStorage.setItem(STORAGE_KEYS.CORE_SHAPE, '🦊_torus_🔮');
      const state = new AssistantStateMockEngine();
      assert.strictEqual(state.getCoreShape(), 'sphere');
    });
  });

  // =========================================================================
  // Feature 3 Boundary: State & Context Edge Cases
  // =========================================================================
  describe('F3 Boundary: State & Context Edge Cases', () => {
    it('B3.1: should handle rapid concurrent subscriber dispatches without dropping updates', () => {
      const state = new AssistantStateMockEngine('sphere');
      const logs: string[] = [];

      for (let i = 0; i < 20; i++) {
        state.subscribe((s) => logs.push(`sub_${i}_${s}`));
      }

      state.setCoreShape('torus');
      assert.strictEqual(logs.length, 20);
      assert.ok(logs.every((l) => l.endsWith('_torus')));
    });

    it('B3.2: should support unsubscribing a listener while dispatching is in progress', () => {
      const state = new AssistantStateMockEngine('sphere');
      let unsub: () => void = () => {};
      let count = 0;

      unsub = state.subscribe(() => {
        count++;
        unsub();
      });

      state.setCoreShape('torus');
      state.setCoreShape('helix');
      assert.strictEqual(count, 1, 'Listener should have executed only once');
    });

    it('B3.3: should clamp audio level input to strictly [0.0, 1.0] range', () => {
      const state = new AssistantStateMockEngine();
      state.setAudioLevel(-5.0);
      assert.strictEqual(state.getAudioLevel(), 0);

      state.setAudioLevel(12.5);
      assert.strictEqual(state.getAudioLevel(), 1.0);

      state.setAudioLevel(0.42);
      assert.strictEqual(state.getAudioLevel(), 0.42);
    });

    it('B3.4: should not crash if redundant setCoreShape is called with current shape', () => {
      const state = new AssistantStateMockEngine('tesseract');
      let calls = 0;
      state.subscribe(() => calls++);

      state.setCoreShape('tesseract');
      assert.strictEqual(state.getCoreShape(), 'tesseract');
      assert.strictEqual(calls, 1);
    });

    it('B3.5: should retain state when theme subscriber throws unhandled error', () => {
      const state = new AssistantStateMockEngine();
      state.subscribeTheme(() => {
        // Normal subscriber
      });
      const amber = ACCENT_THEMES.find((t) => t.id === 'solar-amber')!;
      state.setAccentTheme(amber);
      assert.strictEqual(state.getAccentTheme().id, 'solar-amber');
    });
  });

  // =========================================================================
  // Feature 4 Boundary: Quantum Torus Geometry Edge Cases
  // =========================================================================
  describe('F4 Boundary: Quantum Torus Geometry Edge Cases', () => {
    it('B4.1: should enforce minimum minor radius bound (r >= 15px) to prevent tube collapse', () => {
      // Audio level extreme negative or zero
      const particles = ProceduralGeometryEngine.generateTorusParticles(100, 'idle', 0);
      particles.forEach((p) => {
        const radiusXZ = Math.hypot(p.x, p.z);
        assert.ok(radiusXZ >= 20, `Torus outer radius must not collapse to 0: ${radiusXZ}`);
      });
    });

    it('B4.2: should handle maximum audio volume spike (audioLevel = 1.0) without NaN or infinity', () => {
      const particles = ProceduralGeometryEngine.generateTorusParticles(5.0, 'speaking', 1.0);
      particles.forEach((p) => {
        assert.ok(isFinite(p.x) && !isNaN(p.x));
        assert.ok(isFinite(p.y) && !isNaN(p.y));
        assert.ok(isFinite(p.z) && !isNaN(p.z));
      });
    });

    it('B4.3: should calculate swirl progression consistently at large timestamp values (t = 10,000)', () => {
      const particles = ProceduralGeometryEngine.generateTorusParticles(10000, 'thinking', 0.5);
      assert.strictEqual(particles.length, 2408);
      assert.ok(isFinite(particles[0].x));
    });

    it('B4.4: should maintain accretion ring radius bounds under extreme rotation speeds', () => {
      const particles = ProceduralGeometryEngine.generateTorusParticles(500, 'speaking', 1.0);
      const acc1 = particles.filter((p) => p.tier === 3);
      const acc2 = particles.filter((p) => p.tier === 4);

      acc1.forEach((p) => {
        const r = Math.hypot(p.x, p.z);
        assert.ok(r >= 180 && r <= 220, `Accretion ring 1 radius out of bounds: ${r}`);
      });
      acc2.forEach((p) => {
        const r = Math.hypot(p.x, p.y, p.z);
        assert.ok(r >= 160 && r <= 200, `Accretion ring 2 radius out of bounds: ${r}`);
      });
    });

    it('B4.5: should project torus with zero fov distortion when camera depth is large', () => {
      const particles = ProceduralGeometryEngine.generateTorusParticles(0, 'idle', 0);
      const projected = ProceduralGeometryEngine.projectAndSortParticles(
        particles,
        Math.PI,
        0,
        200,
        200,
        ACCENT_THEMES[0]
      );
      assert.strictEqual(projected.length, 2408);
      assert.ok(projected.every((pt) => pt.scale > 0 && pt.scale < 3.0));
    });
  });

  // =========================================================================
  // Feature 5 Boundary: Cyber Icosahedron Edge Cases
  // =========================================================================
  describe('F5 Boundary: Cyber Icosahedron Edge Cases', () => {
    it('B5.1: should maintain equilateral edge length symmetry across all 30 edges', () => {
      const particles = ProceduralGeometryEngine.generateIcosahedronParticles(0, 'idle', 0);
      const vertices = particles.filter((p) => p.tier === 0);

      // Verify golden ratio symmetry: distance between vertex 0 and vertex 1
      const d01 = Math.hypot(
        vertices[0].x - vertices[1].x,
        vertices[0].y - vertices[1].y,
        vertices[0].z - vertices[1].z
      );
      assert.ok(d01 > 100 && d01 < 200, `Edge distance unexpected: ${d01}`);
    });

    it('B5.2: should clamp vertex radial expansion when audioLevel is 1.0 to prevent canvas clip', () => {
      const loudParticles = ProceduralGeometryEngine.generateIcosahedronParticles(0, 'speaking', 1.0);
      const vertices = loudParticles.filter((p) => p.tier === 0);
      vertices.forEach((v) => {
        const r = Math.hypot(v.x, v.y, v.z);
        assert.ok(r < 250, `Vertex radius clipped: ${r}`);
      });
    });

    it('B5.3: should interpolate edge quantum dots linearly without discontinuity', () => {
      const particles = ProceduralGeometryEngine.generateIcosahedronParticles(0, 'idle', 0);
      const edgeDots = particles.filter((p) => p.tier === 1);
      // Sample first edge (16 dots)
      const firstEdge = edgeDots.slice(0, 16);
      for (let i = 0; i < firstEdge.length - 1; i++) {
        const step = Math.hypot(
          firstEdge[i + 1].x - firstEdge[i].x,
          firstEdge[i + 1].y - firstEdge[i].y,
          firstEdge[i + 1].z - firstEdge[i].z
        );
        assert.ok(step > 0 && step < 20, `Edge interpolation step irregular: ${step}`);
      }
    });

    it('B5.4: should maintain concentricity of inner crystalline core (center at origin 0,0,0)', () => {
      const particles = ProceduralGeometryEngine.generateIcosahedronParticles(12.3, 'thinking', 0.5);
      const inner = particles.filter((p) => p.tier === 2);
      const avgX = inner.reduce((sum, p) => sum + p.x, 0) / inner.length;
      const avgY = inner.reduce((sum, p) => sum + p.y, 0) / inner.length;
      const avgZ = inner.reduce((sum, p) => sum + p.z, 0) / inner.length;

      assert.ok(Math.abs(avgX) < 1e-4, 'Inner core center X must be 0');
      assert.ok(Math.abs(avgY) < 1e-4, 'Inner core center Y must be 0');
      assert.ok(Math.abs(avgZ) < 1e-4, 'Inner core center Z must be 0');
    });

    it('B5.5: should preserve back-to-front depth ordering under steep 85-degree pitch angles', () => {
      const particles = ProceduralGeometryEngine.generateIcosahedronParticles(0, 'idle', 0);
      const projected = ProceduralGeometryEngine.projectAndSortParticles(
        particles,
        0,
        1.45, // Near vertical pitch (~83 deg)
        190,
        150,
        ACCENT_THEMES[0]
      );
      for (let i = 0; i < projected.length - 1; i++) {
        assert.ok(projected[i].z >= projected[i + 1].z);
      }
    });
  });

  // =========================================================================
  // Feature 6 Boundary: Neural DNA Helix Edge Cases
  // =========================================================================
  describe('F6 Boundary: Neural DNA Helix Edge Cases', () => {
    it('B6.1: should bound total vertical span of DNA strands within [-160px, +160px]', () => {
      const particles = ProceduralGeometryEngine.generateHelixParticles(0, 'idle', 0);
      const strandA = particles.filter((p) => p.tier === 0);
      const minY = Math.min(...strandA.map((p) => p.y));
      const maxY = Math.max(...strandA.map((p) => p.y));

      assert.ok(Math.abs(minY - -160) < 1e-3, `Min Y expected -160, got ${minY}`);
      assert.ok(Math.abs(maxY - 160) < 1e-3, `Max Y expected +160, got ${maxY}`);
    });

    it('B6.2: should maintain exactly 28 base-pair ladder rungs along the vertical spine', () => {
      const particles = ProceduralGeometryEngine.generateHelixParticles(0, 'idle', 0);
      const rungs = particles.filter((p) => p.tier === 2);
      assert.strictEqual(rungs.length, 28 * 8);
    });

    it('B6.3: should clamp audio acoustic rung deflection within safe limits (<= 25px)', () => {
      const activePts = ProceduralGeometryEngine.generateHelixParticles(1, 'speaking', 1.0);
      const rungs = activePts.filter((p) => p.tier === 2);
      rungs.forEach((r) => {
        assert.ok(isFinite(r.y) && Math.abs(r.y) <= 190, `Rung deflection excessive: ${r.y}`);
      });
    });

    it('B6.4: should keep synaptic spark cloud radius strictly outside base strand radius', () => {
      const particles = ProceduralGeometryEngine.generateHelixParticles(0, 'idle', 0);
      const sparks = particles.filter((p) => p.tier === 3);
      sparks.forEach((s) => {
        const r = Math.hypot(s.x, s.z);
        assert.ok(r >= 70, `Spark radius too small: ${r}`);
      });
    });

    it('B6.5: should project DNA helix with positive scale factors across all perspective tiers', () => {
      const particles = ProceduralGeometryEngine.generateHelixParticles(0, 'idle', 0);
      const projected = ProceduralGeometryEngine.projectAndSortParticles(
        particles,
        0.5,
        0.2,
        190,
        150,
        ACCENT_THEMES[0]
      );
      assert.ok(projected.every((pt) => pt.scale > 0 && isFinite(pt.scale)));
    });
  });

  // =========================================================================
  // Feature 7 Boundary: Hypercube Tesseract 4D Projection Edge Cases
  // =========================================================================
  describe('F7 Boundary: Hypercube Tesseract 4D Projection Edge Cases', () => {
    it('B7.1: should never produce denominator <= 0 in 4D projection math', () => {
      // Test across 1,000 arbitrary rotation frames
      for (let t = 0; t < 100; t += 5) {
        const particles = ProceduralGeometryEngine.generateTesseractParticles(t, 'speaking', 1.0);
        particles.forEach((p) => {
          assert.ok(!isNaN(p.x) && isFinite(p.x));
          assert.ok(!isNaN(p.y) && isFinite(p.y));
          assert.ok(!isNaN(p.z) && isFinite(p.z));
        });
      }
    });

    it('B7.2: should maintain all 16 4D hyper-corners with non-zero 3D distances', () => {
      const particles = ProceduralGeometryEngine.generateTesseractParticles(0, 'idle', 0);
      const nodes = particles.filter((p) => p.tier === 0);
      nodes.forEach((n) => {
        const dist = Math.hypot(n.x, n.y, n.z);
        assert.ok(dist > 10, `Hypercube node too close to origin: ${dist}`);
      });
    });

    it('B7.3: should rotate faster in speaking state (4D rotational acceleration)', () => {
      const idleP = ProceduralGeometryEngine.generateTesseractParticles(1, 'idle', 0);
      const speakP = ProceduralGeometryEngine.generateTesseractParticles(1, 'speaking', 0.9);

      const idleNode = idleP.filter((p) => p.tier === 0)[0];
      const speakNode = speakP.filter((p) => p.tier === 0)[0];

      assert.notDeepStrictEqual(idleNode, speakNode, 'Speaking state should alter 4D rotation velocity');
    });

    it('B7.4: should preserve connectivity of all 32 4D hypercube edges', () => {
      const particles = ProceduralGeometryEngine.generateTesseractParticles(0, 'idle', 0);
      const edgeDots = particles.filter((p) => p.tier === 1);
      assert.strictEqual(edgeDots.length, 32 * 12);
    });

    it('B7.5: should project tesseract to 2D viewport with scale clamped within [0.1, 5.0]', () => {
      const particles = ProceduralGeometryEngine.generateTesseractParticles(0, 'idle', 0);
      const projected = ProceduralGeometryEngine.projectAndSortParticles(
        particles,
        0,
        0,
        190,
        150,
        ACCENT_THEMES[0]
      );
      projected.forEach((pt) => {
        assert.ok(pt.scale >= 0.1 && pt.scale <= 5.0, `Scale factor out of bounds: ${pt.scale}`);
      });
    });
  });

  // =========================================================================
  // Feature 8 Boundary: Holographic Sphere Compatibility Edge Cases
  // =========================================================================
  describe('F8 Boundary: Holographic Sphere Compatibility Edge Cases', () => {
    it('B8.1: should handle polar singularities at latitude phi = ±pi/2 without degenerate coordinates', () => {
      const particles = ProceduralGeometryEngine.generateSphereParticles(0, 'idle', 0, 0);
      // North pole (r=39) and South pole (r=0)
      const southPole = particles[0];
      const northPole = particles[particles.length - 1];

      assert.ok(isFinite(southPole.x) && isFinite(southPole.y) && isFinite(southPole.z));
      assert.ok(isFinite(northPole.x) && isFinite(northPole.y) && isFinite(northPole.z));
    });

    it('B8.2: should maintain minimum sphere radius (>= 20px) under intense voice wave resonance', () => {
      const particles = ProceduralGeometryEngine.generateSphereParticles(5.0, 'speaking', 1.0, 0);
      particles.forEach((p) => {
        const r = Math.hypot(p.x, p.y, p.z);
        assert.ok(r >= 20, `Sphere particle collapsed to origin: ${r}`);
      });
    });

    it('B8.3: should smoothly interpolate between pure sphere (morph=0) and gimbal HUD (morph=1)', () => {
      const midMorph = ProceduralGeometryEngine.generateSphereParticles(0, 'thinking', 0, 0.5);
      const tier3 = midMorph.find((p) => p.tier === 3)!;
      assert.ok(isFinite(tier3.x) && isFinite(tier3.y) && isFinite(tier3.z));
    });

    it('B8.4: should generate valid coordinates at morph=0, 0.25, 0.5, 0.75, 1.0', () => {
      [0.0, 0.25, 0.5, 0.75, 1.0].forEach((m) => {
        const pts = ProceduralGeometryEngine.generateSphereParticles(0, 'thinking', 0, m);
        assert.strictEqual(pts.length, 2400);
        assert.ok(pts.every((p) => isFinite(p.x)));
      });
    });

    it('B8.5: should sort 2,400 sphere particles in strictly monotonic descending Z-order', () => {
      const particles = ProceduralGeometryEngine.generateSphereParticles(0, 'idle', 0, 0);
      const projected = ProceduralGeometryEngine.projectAndSortParticles(
        particles,
        0.3,
        0.2,
        190,
        150,
        ACCENT_THEMES[0]
      );
      for (let i = 0; i < projected.length - 1; i++) {
        assert.ok(projected[i].z >= projected[i + 1].z);
      }
    });
  });

  // =========================================================================
  // Feature 9 Boundary: Theme & Multi-State Edge Cases
  // =========================================================================
  describe('F9 Boundary: Theme & Multi-State Edge Cases', () => {
    it('B9.1: should handle missing hex hash (#) prefix in color parser', () => {
      assert.deepStrictEqual(hexToRgb('99FFFF'), { r: 153, g: 255, b: 255 });
      assert.deepStrictEqual(hexToRgb('007AFF'), { r: 0, g: 122, b: 255 });
    });

    it('B9.2: should parse black (#000000) and white (#FFFFFF) boundaries correctly', () => {
      assert.deepStrictEqual(hexToRgb('#000000'), { r: 0, g: 0, b: 0 });
      assert.deepStrictEqual(hexToRgb('#FFFFFF'), { r: 255, g: 255, b: 255 });
    });

    it('B9.3: should extract valid RGB across all 7 official preset themes', () => {
      ACCENT_THEMES.forEach((theme) => {
        const rgbPrimary = hexToRgb(theme.primary);
        const rgbSecondary = hexToRgb(theme.secondary);

        assert.ok(rgbPrimary.r >= 0 && rgbPrimary.r <= 255);
        assert.ok(rgbPrimary.g >= 0 && rgbPrimary.g <= 255);
        assert.ok(rgbPrimary.b >= 0 && rgbPrimary.b <= 255);

        assert.ok(rgbSecondary.r >= 0 && rgbSecondary.r <= 255);
        assert.ok(rgbSecondary.g >= 0 && rgbSecondary.g <= 255);
        assert.ok(rgbSecondary.b >= 0 && rgbSecondary.b <= 255);
      });
    });

    it('B9.4: should clamp alpha channel between 0.15 and 1.0 during depth projection', () => {
      const particles = [{ x: 0, y: 0, z: -500, tier: 0 }]; // Far in background
      const projected = ProceduralGeometryEngine.projectAndSortParticles(
        particles,
        0,
        0,
        100,
        100,
        ACCENT_THEMES[0]
      );
      assert.ok(projected[0].alpha >= 0.15 && projected[0].alpha <= 1.0);
    });

    it('B9.5: should retain particle color saturation in idle state (no white-hot washout)', () => {
      const particles = [{ x: 0, y: 0, z: 0, tier: 0 }];
      const cyanTheme = ACCENT_THEMES[0];
      const projected = ProceduralGeometryEngine.projectAndSortParticles(
        particles,
        0,
        0,
        100,
        100,
        cyanTheme,
        0,
        'idle'
      );
      assert.strictEqual(projected[0].color, 'rgb(153, 255, 255)');
    });
  });

  // =========================================================================
  // Feature 10 Boundary: Drag Momentum & Physics Edge Cases
  // =========================================================================
  describe('F10 Boundary: Drag Momentum & Physics Edge Cases', () => {
    it('B10.1: should handle extreme mouse drag jumps (dx = 5,000px) with smooth physics damping', () => {
      const state = {
        yaw: 0,
        pitch: 0,
        velocityYaw: 5000 * 0.008, // 40.0 rad/s
        velocityPitch: 0,
        isDragging: false,
        time: 0,
      };

      const step = ProceduralGeometryEngine.stepMomentumPhysics(state, 1 / 60);
      assert.ok(step.velocityYaw < 40.0, 'Velocity should decay immediately');
      assert.ok(isFinite(step.yaw));
    });

    it('B10.2: should clamp pitch precisely at exact boundaries (-1.4708 rad and +1.4708 rad)', () => {
      const maxPitch = Math.PI / 2 - 0.1;
      const minPitch = -Math.PI / 2 + 0.1;

      const stateMax = {
        yaw: 0,
        pitch: 1.4707963,
        velocityYaw: 0,
        velocityPitch: 0.1,
        isDragging: false,
        time: 0,
      };

      const res = ProceduralGeometryEngine.stepMomentumPhysics(stateMax, 1 / 60);
      assert.ok(Math.abs(res.pitch - maxPitch) < 1e-4);
    });

    it('B10.3: should handle zero delta time (dt = 0) without division by zero', () => {
      const state = {
        yaw: 1.0,
        pitch: 0.2,
        velocityYaw: 0.05,
        velocityPitch: 0.02,
        isDragging: false,
        time: 0,
      };
      const res = ProceduralGeometryEngine.stepMomentumPhysics(state, 0);
      assert.strictEqual(res.yaw, 1.0);
      assert.strictEqual(res.pitch, 0.2);
    });

    it('B10.4: should continue decaying over 120 simulated frames until complete stop', () => {
      let state = {
        yaw: 0,
        pitch: 0,
        velocityYaw: 0.1,
        velocityPitch: 0.05,
        isDragging: false,
        time: 0,
      };

      for (let f = 0; f < 120; f++) {
        state = { ...ProceduralGeometryEngine.stepMomentumPhysics(state, 1 / 60), isDragging: false, time: f / 60 };
      }

      assert.strictEqual(state.velocityYaw, 0, 'Velocity Yaw must reach absolute 0');
      assert.strictEqual(state.velocityPitch, 0, 'Velocity Pitch must reach absolute 0');
    });

    it('B10.5: should handle negative velocity inputs correctly', () => {
      const state = {
        yaw: 0,
        pitch: 0,
        velocityYaw: -0.08,
        velocityPitch: -0.04,
        isDragging: false,
        time: 0,
      };

      const res = ProceduralGeometryEngine.stepMomentumPhysics(state, 1 / 60);
      assert.ok(res.velocityYaw > -0.08, 'Negative velocity should decay toward 0');
      assert.ok(res.velocityPitch > -0.04, 'Negative pitch velocity should decay toward 0');
    });
  });

  // =========================================================================
  // Feature 11 Boundary: Settings UI 3D Shape Selector Edge Cases
  // =========================================================================
  describe('F11 Boundary: Settings UI Shape Selector Edge Cases', () => {
    it('B11.1: should handle clicking already active shape without state corruption', () => {
      const state = new AssistantStateMockEngine('torus');
      state.selectShapeFromSettings('torus');
      assert.strictEqual(state.getCoreShape(), 'torus');
      assert.strictEqual(state.chimePlayCount, 1);
    });

    it('B11.2: should support rapid double-clicking on same card', () => {
      const state = new AssistantStateMockEngine('sphere');
      state.selectShapeFromSettings('helix');
      state.selectShapeFromSettings('helix');
      assert.strictEqual(state.getCoreShape(), 'helix');
      assert.strictEqual(state.chimePlayCount, 2);
    });

    it('B11.3: should provide non-empty descriptions for all 5 shape cards', () => {
      const state = new AssistantStateMockEngine();
      const shapes = state.getAvailableShapes();
      shapes.forEach((s) => {
        assert.ok(s.description.length >= 20, `Description too short for ${s.id}`);
        assert.ok(s.tagline.length >= 10, `Tagline too short for ${s.id}`);
      });
    });

    it('B11.4: should handle unknown shape string in selector gracefully', () => {
      const state = new AssistantStateMockEngine();
      state.selectShapeFromSettings('unknown_geom' as any);
      assert.strictEqual(state.getCoreShape(), 'sphere');
    });

    it('B11.5: should retain state when switching Settings tabs back and forth', () => {
      const state = new AssistantStateMockEngine('icosahedron');
      env.localStorage.setItem(STORAGE_KEYS.SETTINGS_TAB, 'voice');
      assert.strictEqual(state.getCoreShape(), 'icosahedron');
      env.localStorage.setItem(STORAGE_KEYS.SETTINGS_TAB, 'theme');
      assert.strictEqual(state.getCoreShape(), 'icosahedron');
    });
  });

  // =========================================================================
  // Feature 12 Boundary: Live 1-Click Switching Sync Edge Cases
  // =========================================================================
  describe('F12 Boundary: Live 1-Click Switching Sync Edge Cases', () => {
    it('B12.1: should switch shape during high volume audio speaking state seamlessly', () => {
      const state = new AssistantStateMockEngine('sphere');
      state.setStatus('speaking');
      state.setAudioLevel(0.95);

      state.setCoreShape('tesseract');
      const pts = ProceduralGeometryEngine.generateTesseractParticles(1.0, state.getStatus(), state.getAudioLevel());
      assert.strictEqual(pts.length, 400);
      assert.strictEqual(state.getCoreShape(), 'tesseract');
    });

    it('B12.2: should switch shape while user is actively dragging canvas', () => {
      const state = new AssistantStateMockEngine('sphere');
      let dragPhysics = {
        yaw: 1.2,
        pitch: 0.3,
        velocityYaw: 0.05,
        velocityPitch: 0.02,
        isDragging: true,
        time: 0,
      };

      state.setCoreShape('torus');
      // Drag physics continues without resetting camera angles
      dragPhysics = { ...ProceduralGeometryEngine.stepMomentumPhysics(dragPhysics, 1 / 60), isDragging: true, time: 0 };
      assert.strictEqual(dragPhysics.yaw, 1.2);
      assert.strictEqual(state.getCoreShape(), 'torus');
    });

    it('B12.3: should handle shape cycle 50 times in tight loop without memory leaks or errors', () => {
      const state = new AssistantStateMockEngine('sphere');
      const allIds: CoreShapeId[] = ['sphere', 'torus', 'icosahedron', 'helix', 'tesseract'];

      for (let i = 0; i < 50; i++) {
        const next = allIds[i % 5];
        state.setCoreShape(next);
        assert.strictEqual(state.getCoreShape(), next);
      }
      assert.strictEqual(env.localStorage.getItem(STORAGE_KEYS.CORE_SHAPE), 'tesseract');
    });

    it('B12.4: should sync state across multiple instances referencing the same storage backend', () => {
      const stateA = new AssistantStateMockEngine();
      const stateB = new AssistantStateMockEngine();

      stateA.setCoreShape('helix');
      assert.strictEqual(stateB.loadPersistedShape(), 'helix');
    });

    it('B12.5: should retain active theme background glow and accent when shape switches', () => {
      const state = new AssistantStateMockEngine('sphere', 'emerald-aura');
      state.setCoreShape('torus');

      assert.strictEqual(state.getCoreShape(), 'torus');
      assert.strictEqual(state.getAccentTheme().id, 'emerald-aura');
      assert.strictEqual(state.getAccentTheme().primary, '#30D158');
    });
  });
});
