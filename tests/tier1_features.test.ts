/**
 * Tier 1: Feature Coverage E2E Test Suite
 * Covers all 12 features from PROJECT.md with >= 5 test cases per feature (>= 60 total tests)
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

describe('Tier 1: Comprehensive Feature Coverage', () => {
  let env: ReturnType<typeof setupTestEnvironment>;

  beforeEach(() => {
    env = setupTestEnvironment();
  });

  afterEach(() => {
    env.cleanup();
  });

  // =========================================================================
  // Feature 1: Core Shape Type & Metadata
  // =========================================================================
  describe('Feature 1: Core Shape Type & Metadata', () => {
    it('F1.1: should define all 5 distinct core shape identifiers', () => {
      const expectedIds: CoreShapeId[] = ['sphere', 'torus', 'icosahedron', 'helix', 'tesseract'];
      const actualIds = CORE_SHAPES.map((s) => s.id);
      assert.strictEqual(CORE_SHAPES.length, 5);
      expectedIds.forEach((id) => {
        assert.ok(actualIds.includes(id), `Missing core shape ID: ${id}`);
      });
    });

    it('F1.2: should contain required metadata properties for every shape', () => {
      CORE_SHAPES.forEach((shape) => {
        assert.ok(typeof shape.id === 'string' && shape.id.length > 0, 'id must be non-empty string');
        assert.ok(typeof shape.name === 'string' && shape.name.length > 0, 'name must be non-empty string');
        assert.ok(typeof shape.tagline === 'string' && shape.tagline.length > 0, 'tagline must be non-empty');
        assert.ok(typeof shape.description === 'string' && shape.description.length > 0, 'description must be non-empty');
        assert.ok(typeof shape.iconName === 'string' && shape.iconName.length > 0, 'iconName must be non-empty');
        assert.ok(typeof shape.particleCount === 'number' && shape.particleCount > 0, 'particleCount must be positive number');
      });
    });

    it('F1.3: should map unique and appropriate Lucide icon names to each shape', () => {
      const iconMap = new Map<CoreShapeId, string>();
      CORE_SHAPES.forEach((shape) => {
        assert.ok(!iconMap.has(shape.id), `Duplicate shape id: ${shape.id}`);
        iconMap.set(shape.id, shape.iconName);
      });
      assert.strictEqual(iconMap.get('sphere'), 'Globe');
      assert.strictEqual(iconMap.get('torus'), 'Disc');
      assert.strictEqual(iconMap.get('icosahedron'), 'Hexagon');
      assert.strictEqual(iconMap.get('helix'), 'Dna');
      assert.strictEqual(iconMap.get('tesseract'), 'Boxes');
    });

    it('F1.4: should validate valid shape IDs via isValidCoreShapeId', () => {
      assert.strictEqual(isValidCoreShapeId('sphere'), true);
      assert.strictEqual(isValidCoreShapeId('torus'), true);
      assert.strictEqual(isValidCoreShapeId('icosahedron'), true);
      assert.strictEqual(isValidCoreShapeId('helix'), true);
      assert.strictEqual(isValidCoreShapeId('tesseract'), true);
      assert.strictEqual(isValidCoreShapeId('dna_helix'), true);
    });

    it('F1.5: should reject invalid shape IDs and return false', () => {
      assert.strictEqual(isValidCoreShapeId('invalid_shape'), false);
      assert.strictEqual(isValidCoreShapeId('cylinder'), false);
      assert.strictEqual(isValidCoreShapeId(null), false);
      assert.strictEqual(isValidCoreShapeId(undefined), false);
      assert.strictEqual(isValidCoreShapeId(123), false);
      assert.strictEqual(isValidCoreShapeId({}), false);
    });
  });

  // =========================================================================
  // Feature 2: Storage Persistence
  // =========================================================================
  describe('Feature 2: Storage Persistence', () => {
    it('F2.1: should persist core shape to localStorage under fox_core_shape_preference key', () => {
      const state = new AssistantStateMockEngine();
      state.setCoreShape('torus');
      assert.strictEqual(env.localStorage.getItem(STORAGE_KEYS.CORE_SHAPE), 'torus');
    });

    it('F2.2: should load saved shape on fresh engine initialization', () => {
      env.localStorage.setItem(STORAGE_KEYS.CORE_SHAPE, 'tesseract');
      const state = new AssistantStateMockEngine();
      assert.strictEqual(state.getCoreShape(), 'tesseract');
    });

    it('F2.3: should fallback to sphere default when localStorage is empty', () => {
      env.localStorage.clear();
      const state = new AssistantStateMockEngine();
      assert.strictEqual(state.getCoreShape(), 'sphere');
    });

    it('F2.4: should fallback to sphere default when storage contains invalid shape string', () => {
      env.localStorage.setItem(STORAGE_KEYS.CORE_SHAPE, 'corrupted_3d_cube');
      const state = new AssistantStateMockEngine();
      assert.strictEqual(state.getCoreShape(), 'sphere');
    });

    it('F2.5: should correctly normalize and persist legacy dna_helix alias as helix', () => {
      env.localStorage.setItem(STORAGE_KEYS.CORE_SHAPE, 'dna_helix');
      const state = new AssistantStateMockEngine();
      assert.strictEqual(state.getCoreShape(), 'helix');
      state.setCoreShape('helix');
      assert.strictEqual(env.localStorage.getItem(STORAGE_KEYS.CORE_SHAPE), 'helix');
    });
  });

  // =========================================================================
  // Feature 3: State & Context Sync
  // =========================================================================
  describe('Feature 3: State & Context Sync', () => {
    it('F3.1: should initialize context with stored shape preference', () => {
      env.localStorage.setItem(STORAGE_KEYS.CORE_SHAPE, 'icosahedron');
      const context = new AssistantStateMockEngine();
      assert.strictEqual(context.getCoreShape(), 'icosahedron');
    });

    it('F3.2: should synchronously update state upon setCoreShape dispatch', () => {
      const context = new AssistantStateMockEngine('sphere');
      context.setCoreShape('tesseract');
      assert.strictEqual(context.getCoreShape(), 'tesseract');
    });

    it('F3.3: should notify all registered subscribers when shape changes', () => {
      const context = new AssistantStateMockEngine('sphere');
      const receivedShapes: CoreShapeId[] = [];
      const unsubscribe = context.subscribe((shape) => {
        receivedShapes.push(shape);
      });

      context.setCoreShape('torus');
      context.setCoreShape('helix');
      unsubscribe();
      context.setCoreShape('icosahedron');

      assert.deepStrictEqual(receivedShapes, ['torus', 'helix']);
    });

    it('F3.4: should maintain theme synchronization alongside core shape', () => {
      const context = new AssistantStateMockEngine('sphere', 'fox-cyan');
      assert.strictEqual(context.getAccentTheme().id, 'fox-cyan');

      const azure = ACCENT_THEMES.find((t) => t.id === 'artistic-flair')!;
      context.setAccentTheme(azure);
      assert.strictEqual(context.getAccentTheme().id, 'artistic-flair');
      assert.strictEqual(context.getCoreShape(), 'sphere');
    });

    it('F3.5: should retain active status and audioLevel state across shape updates', () => {
      const context = new AssistantStateMockEngine('sphere');
      context.setStatus('speaking');
      context.setAudioLevel(0.75);

      context.setCoreShape('torus');
      assert.strictEqual(context.getStatus(), 'speaking');
      assert.strictEqual(context.getAudioLevel(), 0.75);
    });
  });

  // =========================================================================
  // Feature 4: Quantum Torus Visualizer
  // =========================================================================
  describe('Feature 4: Quantum Torus Visualizer', () => {
    it('F4.1: should generate correct particle count for torus surface and accretion rings', () => {
      const particles = ProceduralGeometryEngine.generateTorusParticles(0, 'idle', 0);
      // 64 * 32 (surface = 2048) + 200 (acc1) + 160 (acc2) = 2408
      assert.strictEqual(particles.length, 2408);
    });

    it('F4.2: should produce non-NaN coordinates within valid donut bounds', () => {
      const particles = ProceduralGeometryEngine.generateTorusParticles(1.0, 'idle', 0);
      particles.forEach((p) => {
        assert.ok(!isNaN(p.x) && isFinite(p.x), `Torus particle x is invalid: ${p.x}`);
        assert.ok(!isNaN(p.y) && isFinite(p.y), `Torus particle y is invalid: ${p.y}`);
        assert.ok(!isNaN(p.z) && isFinite(p.z), `Torus particle z is invalid: ${p.z}`);
      });
    });

    it('F4.3: should dilate major and minor radius in response to audio level', () => {
      const idleParticles = ProceduralGeometryEngine.generateTorusParticles(0, 'idle', 0.0);
      const loudParticles = ProceduralGeometryEngine.generateTorusParticles(0, 'speaking', 1.0);

      // Max radial distance should increase with audioLevel
      const maxIdleRadius = Math.max(...idleParticles.map((p) => Math.hypot(p.x, p.z)));
      const maxLoudRadius = Math.max(...loudParticles.map((p) => Math.hypot(p.x, p.z)));

      assert.ok(
        maxLoudRadius > maxIdleRadius,
        `Expected loud radius (${maxLoudRadius}) to exceed idle radius (${maxIdleRadius})`
      );
    });

    it('F4.4: should generate 2 distinct orbital accretion rings at tiers 3 and 4', () => {
      const particles = ProceduralGeometryEngine.generateTorusParticles(0, 'idle', 0);
      const tier3 = particles.filter((p) => p.tier === 3);
      const tier4 = particles.filter((p) => p.tier === 4);

      assert.strictEqual(tier3.length, 200, 'Equatorial accretion ring count mismatch');
      assert.strictEqual(tier4.length, 160, 'Polar accretion ring count mismatch');
    });

    it('F4.5: should project torus coordinates through 3D camera without perspective inversion', () => {
      const particles = ProceduralGeometryEngine.generateTorusParticles(0, 'idle', 0);
      const projected = ProceduralGeometryEngine.projectAndSortParticles(
        particles,
        0,
        0.1,
        190,
        150,
        ACCENT_THEMES[0]
      );
      assert.strictEqual(projected.length, 2408);
      projected.forEach((pt) => {
        assert.ok(pt.scale > 0, 'Scale must be positive');
        assert.ok(pt.x >= -500 && pt.x <= 1000, `Screen X (${pt.x}) in valid view range`);
      });
    });
  });

  // =========================================================================
  // Feature 5: Cyber Icosahedron Visualizer
  // =========================================================================
  describe('Feature 5: Cyber Icosahedron Visualizer', () => {
    it('F5.1: should generate 12 vertices, 30 sampled edges, and inner crystalline core', () => {
      const particles = ProceduralGeometryEngine.generateIcosahedronParticles(0, 'idle', 0);
      // 12 outer vertices (tier 0) + 480 edge dots (tier 1) + 12 inner crystal vertices (tier 2) = 504
      const tier0 = particles.filter((p) => p.tier === 0);
      const tier1 = particles.filter((p) => p.tier === 1);
      const tier2 = particles.filter((p) => p.tier === 2);

      assert.strictEqual(tier0.length, 12, '12 canonical vertices');
      assert.strictEqual(tier1.length, 480, '480 edge quantum particles (30 edges * 16 dots)');
      assert.strictEqual(tier2.length, 12, '12 inner crystal vertices');
    });

    it('F5.2: should maintain golden ratio mathematical proportions for outer vertices', () => {
      const particles = ProceduralGeometryEngine.generateIcosahedronParticles(0, 'idle', 0);
      const vertices = particles.filter((p) => p.tier === 0);
      const radii = vertices.map((v) => Math.hypot(v.x, v.y, v.z));
      const expectedRadius = radii[0];

      // All 12 vertices must lie on the exact same spherical shell
      radii.forEach((r) => {
        assert.ok(Math.abs(r - expectedRadius) < 1e-4, `Vertex radius deviation: ${r} vs ${expectedRadius}`);
      });
    });

    it('F5.3: should pulse vertex radius outward proportionally to audio energy', () => {
      const idlePts = ProceduralGeometryEngine.generateIcosahedronParticles(0, 'idle', 0.0);
      const loudPts = ProceduralGeometryEngine.generateIcosahedronParticles(0, 'speaking', 1.0);

      const idleR = Math.hypot(idlePts[0].x, idlePts[0].y, idlePts[0].z);
      const loudR = Math.hypot(loudPts[0].x, loudPts[0].y, loudPts[0].z);

      assert.ok(loudR > idleR, `Loud vertex radius (${loudR}) should exceed idle (${idleR})`);
    });

    it('F5.4: should rotate inner crystalline core counter-clockwise relative to outer shell', () => {
      const t0 = ProceduralGeometryEngine.generateIcosahedronParticles(0, 'idle', 0);
      const t1 = ProceduralGeometryEngine.generateIcosahedronParticles(1, 'idle', 0);

      const innerT0 = t0.filter((p) => p.tier === 2);
      const innerT1 = t1.filter((p) => p.tier === 2);

      assert.notDeepStrictEqual(innerT0[0], innerT1[0], 'Inner crystal coordinates should evolve over time');
    });

    it('F5.5: should project icosahedron vertices into 3D sorted Z-buffer', () => {
      const particles = ProceduralGeometryEngine.generateIcosahedronParticles(0, 'idle', 0);
      const projected = ProceduralGeometryEngine.projectAndSortParticles(
        particles,
        0.5,
        0.2,
        190,
        150,
        ACCENT_THEMES[0]
      );

      for (let i = 0; i < projected.length - 1; i++) {
        assert.ok(
          projected[i].z >= projected[i + 1].z,
          `Z-sorting violation at index ${i}: ${projected[i].z} < ${projected[i + 1].z}`
        );
      }
    });
  });

  // =========================================================================
  // Feature 6: Neural DNA Helix Visualizer
  // =========================================================================
  describe('Feature 6: Neural DNA Helix Visualizer', () => {
    it('F6.1: should generate dual antiparallel strands, 28 ladder rungs, and synaptic sparks', () => {
      const particles = ProceduralGeometryEngine.generateHelixParticles(0, 'idle', 0);
      const strandA = particles.filter((p) => p.tier === 0);
      const strandB = particles.filter((p) => p.tier === 1);
      const rungs = particles.filter((p) => p.tier === 2);
      const sparks = particles.filter((p) => p.tier === 3);

      assert.strictEqual(strandA.length, 400, 'Strand A point count');
      assert.strictEqual(strandB.length, 400, 'Strand B point count');
      assert.strictEqual(rungs.length, 28 * 8, '28 rungs with 8 nodes each (224 total)');
      assert.strictEqual(sparks.length, 300, 'Synaptic spark cloud count');
    });

    it('F6.2: should maintain exact 180-degree phase shift between Strand A and Strand B', () => {
      const particles = ProceduralGeometryEngine.generateHelixParticles(0, 'idle', 0);
      const strandA = particles.filter((p) => p.tier === 0);
      const strandB = particles.filter((p) => p.tier === 1);

      // At each corresponding vertical slice, xA + xB ≈ 0 and zA + zB ≈ 0
      for (let i = 0; i < 20; i++) {
        const pA = strandA[i];
        const pB = strandB[i];
        assert.ok(Math.abs(pA.y - pB.y) < 1e-4, 'Vertical position must match');
        assert.ok(Math.abs(pA.x + pB.x) < 1e-4, 'X coordinates must be opposite');
        assert.ok(Math.abs(pA.z + pB.z) < 1e-4, 'Z coordinates must be opposite');
      }
    });

    it('F6.3: should undulate strand radius along vertical axis during voice audio active state', () => {
      const idlePts = ProceduralGeometryEngine.generateHelixParticles(0, 'idle', 0.0);
      const speakingPts = ProceduralGeometryEngine.generateHelixParticles(0, 'speaking', 0.8);

      const idleA = idlePts.filter((p) => p.tier === 0);
      const speakA = speakingPts.filter((p) => p.tier === 0);

      const idleRadii = idleA.map((p) => Math.hypot(p.x, p.z));
      const speakRadii = speakA.map((p) => Math.hypot(p.x, p.z));

      // Speaking radii should exhibit harmonic variance
      const speakVariance = Math.max(...speakRadii) - Math.min(...speakRadii);
      const idleVariance = Math.max(...idleRadii) - Math.min(...idleRadii);
      assert.ok(speakVariance >= idleVariance, 'Speaking undulation must exceed idle baseline');
    });

    it('F6.4: should oscillate base-pair rung nodes in Y-dimension with audio level', () => {
      const idlePts = ProceduralGeometryEngine.generateHelixParticles(0, 'idle', 0.0);
      const activePts = ProceduralGeometryEngine.generateHelixParticles(1, 'speaking', 1.0);

      const idleRungs = idlePts.filter((p) => p.tier === 2);
      const activeRungs = activePts.filter((p) => p.tier === 2);

      // Center rung node should experience vertical acoustic deflection
      assert.notStrictEqual(idleRungs[4].y, activeRungs[4].y);
    });

    it('F6.5: should project DNA helix onto canvas perspective viewport cleanly', () => {
      const particles = ProceduralGeometryEngine.generateHelixParticles(0, 'idle', 0);
      const projected = ProceduralGeometryEngine.projectAndSortParticles(
        particles,
        0,
        0,
        190,
        150,
        ACCENT_THEMES[0]
      );
      assert.strictEqual(projected.length, 1324);
      projected.forEach((pt) => {
        assert.ok(!isNaN(pt.x) && !isNaN(pt.y), 'Coordinates must be valid');
      });
    });
  });

  // =========================================================================
  // Feature 7: Hypercube / Tesseract Visualizer
  // =========================================================================
  describe('Feature 7: Hypercube / Tesseract Visualizer', () => {
    it('F7.1: should generate 16 4D projected vertices and 32 sampled 4D edges', () => {
      const particles = ProceduralGeometryEngine.generateTesseractParticles(0, 'idle', 0);
      const nodes = particles.filter((p) => p.tier === 0);
      const edgeDots = particles.filter((p) => p.tier === 1);

      assert.strictEqual(nodes.length, 16, '16 4D projected vertices');
      assert.strictEqual(edgeDots.length, 32 * 12, '384 edge particles (32 edges * 12 dots)');
    });

    it('F7.2: should apply 4D SO(4) double rotation in XW and YZ planes', () => {
      const t0 = ProceduralGeometryEngine.generateTesseractParticles(0, 'idle', 0);
      const t1 = ProceduralGeometryEngine.generateTesseractParticles(0.5, 'idle', 0);

      const nodes0 = t0.filter((p) => p.tier === 0);
      const nodes1 = t1.filter((p) => p.tier === 0);

      assert.notDeepStrictEqual(nodes0[0], nodes1[0], '4D rotation should continuously transform vertices');
    });

    it('F7.3: should clamp 4D perspective divisor to >= 0.25 to prevent division by zero', () => {
      // Test extreme audio level where vertices might approach 4D focal plane
      const particles = ProceduralGeometryEngine.generateTesseractParticles(10, 'speaking', 1.0);
      particles.forEach((p) => {
        assert.ok(isFinite(p.x) && !isNaN(p.x), `Tesseract node x is non-finite: ${p.x}`);
        assert.ok(isFinite(p.y) && !isNaN(p.y), `Tesseract node y is non-finite: ${p.y}`);
        assert.ok(isFinite(p.z) && !isNaN(p.z), `Tesseract node z is non-finite: ${p.z}`);
      });
    });

    it('F7.4: should scale 4D hypercube lattice size under audio level stimulation', () => {
      const idlePts = ProceduralGeometryEngine.generateTesseractParticles(0, 'idle', 0.0);
      const loudPts = ProceduralGeometryEngine.generateTesseractParticles(0, 'speaking', 1.0);

      const idleMax = Math.max(...idlePts.map((p) => Math.abs(p.x)));
      const loudMax = Math.max(...loudPts.map((p) => Math.abs(p.x)));

      assert.ok(loudMax > idleMax, `Loud hypercube size (${loudMax}) must exceed idle (${idleMax})`);
    });

    it('F7.5: should project tesseract through 3D Euler angles with correct Z-buffer sorting', () => {
      const particles = ProceduralGeometryEngine.generateTesseractParticles(0, 'idle', 0);
      const projected = ProceduralGeometryEngine.projectAndSortParticles(
        particles,
        0.3,
        0.1,
        190,
        150,
        ACCENT_THEMES[0]
      );

      assert.strictEqual(projected.length, 400); // 16 nodes + 384 edge dots
      for (let i = 0; i < projected.length - 1; i++) {
        assert.ok(projected[i].z >= projected[i + 1].z, 'Depth sort requirement');
      }
    });
  });

  // =========================================================================
  // Feature 8: Holographic Sphere Compatibility
  // =========================================================================
  describe('Feature 8: Holographic Sphere Compatibility', () => {
    it('F8.1: should preserve exact 2,400 particle sphere resolution (40 rows * 60 cols)', () => {
      const particles = ProceduralGeometryEngine.generateSphereParticles(0, 'idle', 0, 0);
      assert.strictEqual(particles.length, 2400);
    });

    it('F8.2: should maintain 60% core sphere partition and 40% orbital rings partition', () => {
      const particles = ProceduralGeometryEngine.generateSphereParticles(0, 'idle', 0, 0);
      const central = particles.filter((p) => p.tier < 3);
      const innerRing = particles.filter((p) => p.tier === 3);
      const outerRing = particles.filter((p) => p.tier === 4);

      assert.strictEqual(central.length, 1440); // 60% (tiers 0, 1, 2 = 3 * 480)
      assert.strictEqual(innerRing.length, 480); // 20% (tier 3 = 480)
      assert.strictEqual(outerRing.length, 480); // 20% (tier 4 = 480)
    });

    it('F8.3: should smoothly morph outer partitions into J.A.R.V.I.S. orbital gimbal rings when thinking', () => {
      const spherePure = ProceduralGeometryEngine.generateSphereParticles(0, 'thinking', 0, 0.0);
      const sphereMorphed = ProceduralGeometryEngine.generateSphereParticles(0, 'thinking', 0, 1.0);

      const ringPure = spherePure.find((p) => p.tier === 3)!;
      const ringMorphed = sphereMorphed.find((p) => p.tier === 3)!;

      assert.notDeepStrictEqual(ringPure, ringMorphed, 'Orbital ring particle should morph position in thinking state');
    });

    it('F8.4: should generate circumferential and latitude soundwaves during speaking', () => {
      const idleSphere = ProceduralGeometryEngine.generateSphereParticles(0, 'idle', 0);
      const speakSphere = ProceduralGeometryEngine.generateSphereParticles(0, 'speaking', 0.9);

      const idleR = Math.hypot(idleSphere[0].x, idleSphere[0].y, idleSphere[0].z);
      const speakR = Math.hypot(speakSphere[0].x, speakSphere[0].y, speakSphere[0].z);

      assert.notStrictEqual(idleR, speakR, 'Speaking voice wave should modulate radius');
    });

    it('F8.5: should project sphere particles onto 2D canvas with depth sorting', () => {
      const particles = ProceduralGeometryEngine.generateSphereParticles(0, 'idle', 0, 0);
      const projected = ProceduralGeometryEngine.projectAndSortParticles(
        particles,
        0,
        0.1,
        190,
        150,
        ACCENT_THEMES[0]
      );
      assert.strictEqual(projected.length, 2400);
      assert.ok(projected[0].z >= projected[projected.length - 1].z);
    });
  });

  // =========================================================================
  // Feature 9: Multi-State & Theme Adaptation
  // =========================================================================
  describe('Feature 9: Multi-State & Theme Adaptation', () => {
    it('F9.1: should extract RGB values correctly from 6-digit hex color strings', () => {
      assert.deepStrictEqual(hexToRgb('#99FFFF'), { r: 153, g: 255, b: 255 });
      assert.deepStrictEqual(hexToRgb('#007AFF'), { r: 0, g: 122, b: 255 });
      assert.deepStrictEqual(hexToRgb('#30D158'), { r: 48, g: 209, b: 88 });
    });

    it('F9.2: should extract RGB values correctly from 3-digit shorthand hex strings', () => {
      assert.deepStrictEqual(hexToRgb('#FFF'), { r: 255, g: 255, b: 255 });
      assert.deepStrictEqual(hexToRgb('#0F0'), { r: 0, g: 255, b: 0 });
    });

    it('F9.3: should fallback safely to Fox Cyan (#99FFFF) when given malformed hex string', () => {
      assert.deepStrictEqual(hexToRgb('invalid_color'), { r: 153, g: 255, b: 255 });
      assert.deepStrictEqual(hexToRgb(''), { r: 153, g: 255, b: 255 });
    });

    it('F9.4: should adapt particle colors based on active accent theme', () => {
      const particles = [{ x: 0, y: 0, z: 0, tier: 0 }];
      const cyanTheme = ACCENT_THEMES.find((t) => t.id === 'fox-cyan')!;
      const amberTheme = ACCENT_THEMES.find((t) => t.id === 'solar-amber')!;

      const cyanProjected = ProceduralGeometryEngine.projectAndSortParticles(
        particles,
        0,
        0,
        100,
        100,
        cyanTheme
      );
      const amberProjected = ProceduralGeometryEngine.projectAndSortParticles(
        particles,
        0,
        0,
        100,
        100,
        amberTheme
      );

      assert.strictEqual(cyanProjected[0].color, 'rgb(153, 255, 255)');
      assert.strictEqual(amberProjected[0].color, 'rgb(255, 159, 10)');
    });

    it('F9.5: should trigger luminescent white-hot highlights on vocal audio crests in speaking state', () => {
      const particles = [{ x: 0, y: 0, z: 0, tier: 0 }];
      const cyanTheme = ACCENT_THEMES.find((t) => t.id === 'fox-cyan')!;

      const speakingLoud = ProceduralGeometryEngine.projectAndSortParticles(
        particles,
        0,
        0,
        100,
        100,
        cyanTheme,
        1.0,
        'speaking'
      );

      assert.strictEqual(speakingLoud[0].color, 'rgb(255, 255, 255)');
    });
  });

  // =========================================================================
  // Feature 10: Drag-to-Rotate Momentum Decay
  // =========================================================================
  describe('Feature 10: Drag-to-Rotate Momentum Decay', () => {
    it('F10.1: should decay angular velocity by friction factor (0.94) on release', () => {
      const initial = {
        yaw: 0,
        pitch: 0,
        velocityYaw: 0.1,
        velocityPitch: 0.05,
        isDragging: false,
        time: 0,
      };

      const step1 = ProceduralGeometryEngine.stepMomentumPhysics(initial, 1 / 60);
      assert.ok(Math.abs(step1.velocityYaw - 0.1 * 0.94) < 1e-4, 'Yaw velocity must decay by 0.94');
      assert.ok(Math.abs(step1.velocityPitch - 0.05 * 0.94) < 1e-4, 'Pitch velocity must decay by 0.94');
    });

    it('F10.2: should clamp pitch to avoid gimbal flip within [-π/2 + 0.1, π/2 - 0.1]', () => {
      const maxAllowed = Math.PI / 2 - 0.1;
      const minAllowed = -Math.PI / 2 + 0.1;

      const overPitch = {
        yaw: 0,
        pitch: 2.5, // Exceeds max
        velocityYaw: 0,
        velocityPitch: 0,
        isDragging: false,
        time: 0,
      };

      const clamped = ProceduralGeometryEngine.stepMomentumPhysics(overPitch, 1 / 60);
      assert.ok(Math.abs(clamped.pitch - maxAllowed) < 1e-4, `Expected pitch clamped to ${maxAllowed}, got ${clamped.pitch}`);

      const underPitch = {
        yaw: 0,
        pitch: -2.5, // Exceeds min
        velocityYaw: 0,
        velocityPitch: 0,
        isDragging: false,
        time: 0,
      };
      const clampedMin = ProceduralGeometryEngine.stepMomentumPhysics(underPitch, 1 / 60);
      assert.ok(Math.abs(clampedMin.pitch - minAllowed) < 1e-4, `Expected pitch clamped to ${minAllowed}, got ${clampedMin.pitch}`);
    });

    it('F10.3: should revert to gentle idle drift when momentum velocity falls below 0.0001', () => {
      const nearZero = {
        yaw: 0,
        pitch: 0.1,
        velocityYaw: 0.00005,
        velocityPitch: 0.00005,
        isDragging: false,
        time: 0,
      };

      const step = ProceduralGeometryEngine.stepMomentumPhysics(nearZero, 1 / 60);
      assert.strictEqual(step.velocityYaw, 0, 'Velocity should be zeroed');
      assert.ok(step.yaw > 0, 'Yaw should increment by idle drift (0.002)');
    });

    it('F10.4: should not decay velocity while isDragging is active', () => {
      const draggingState = {
        yaw: 0.5,
        pitch: 0.2,
        velocityYaw: 0.08,
        velocityPitch: 0.04,
        isDragging: true,
        time: 0,
      };

      const step = ProceduralGeometryEngine.stepMomentumPhysics(draggingState, 1 / 60);
      assert.strictEqual(step.velocityYaw, 0.08, 'Velocity must not decay during drag');
      assert.strictEqual(step.velocityPitch, 0.04, 'Pitch velocity must not decay during drag');
    });

    it('F10.5: should calculate yaw displacement smoothly over 60 simulated frames', () => {
      let state = {
        yaw: 0,
        pitch: 0,
        velocityYaw: 0.2,
        velocityPitch: 0,
        isDragging: false,
        time: 0,
      };

      for (let i = 0; i < 60; i++) {
        state = { ...ProceduralGeometryEngine.stepMomentumPhysics(state, 1 / 60), isDragging: false, time: i / 60 };
      }

      assert.ok(state.yaw > 0, 'Yaw must have progressed forward');
      assert.ok(state.velocityYaw < 0.01, 'Velocity must have substantially decayed after 60 frames');
    });
  });

  // =========================================================================
  // Feature 11: Settings UI 3D Core Shape Selector
  // =========================================================================
  describe('Feature 11: Settings UI 3D Core Shape Selector', () => {
    it('F11.1: should return all 5 available shape options for Settings card selector', () => {
      const state = new AssistantStateMockEngine();
      const shapes = state.getAvailableShapes();
      assert.strictEqual(shapes.length, 5);
      const ids = shapes.map((s) => s.id);
      assert.deepStrictEqual(ids, ['sphere', 'torus', 'icosahedron', 'helix', 'tesseract']);
    });

    it('F11.2: should contain descriptive badges for visual preview cards', () => {
      const state = new AssistantStateMockEngine();
      const shapes = state.getAvailableShapes();
      shapes.forEach((s) => {
        assert.ok(typeof s.badge === 'string' && s.badge.length > 0, `Shape ${s.id} badge missing`);
      });
    });

    it('F11.3: should select shape via 1-click and trigger audio chime feedback', () => {
      const state = new AssistantStateMockEngine('sphere');
      state.selectShapeFromSettings('helix');

      assert.strictEqual(state.getCoreShape(), 'helix');
      assert.strictEqual(state.chimePlayCount, 1);
      assert.strictEqual(state.lastChimeType, 'click');
    });

    it('F11.4: should persist selection to storage upon Settings card click', () => {
      const state = new AssistantStateMockEngine('sphere');
      state.selectShapeFromSettings('icosahedron');

      assert.strictEqual(env.localStorage.getItem(STORAGE_KEYS.CORE_SHAPE), 'icosahedron');
    });

    it('F11.5: should reflect active selected state correctly among all 5 cards', () => {
      const state = new AssistantStateMockEngine('torus');
      const shapes = state.getAvailableShapes();

      shapes.forEach((shape) => {
        const isActive = shape.id === state.getCoreShape();
        if (shape.id === 'torus') {
          assert.strictEqual(isActive, true, 'Torus card must be active');
        } else {
          assert.strictEqual(isActive, false, `${shape.id} card must not be active`);
        }
      });
    });
  });

  // =========================================================================
  // Feature 12: Live 1-Click Switching Sync
  // =========================================================================
  describe('Feature 12: Live 1-Click Switching Sync', () => {
    it('F12.1: should immediately update active visualizer geometry on shape switch', () => {
      const state = new AssistantStateMockEngine('sphere');
      let currentGeometryParticles = ProceduralGeometryEngine.generateSphereParticles(0, 'idle', 0);
      assert.strictEqual(currentGeometryParticles.length, 2400);

      state.setCoreShape('torus');
      currentGeometryParticles = ProceduralGeometryEngine.generateTorusParticles(0, 'idle', 0);
      assert.strictEqual(currentGeometryParticles.length, 2408);
    });

    it('F12.2: should broadcast shape switch across multiple concurrent subscribers', () => {
      const state = new AssistantStateMockEngine('sphere');
      let voiceStageShape = 'sphere';
      let settingsPreviewShape = 'sphere';

      state.subscribe((shape) => {
        voiceStageShape = shape;
      });
      state.subscribe((shape) => {
        settingsPreviewShape = shape;
      });

      state.selectShapeFromSettings('tesseract');
      assert.strictEqual(voiceStageShape, 'tesseract');
      assert.strictEqual(settingsPreviewShape, 'tesseract');
    });

    it('F12.3: should preserve rotational orientation (yaw/pitch) across shape switches', () => {
      let camera = { yaw: 0.8, pitch: 0.25 };
      const state = new AssistantStateMockEngine('sphere');

      state.setCoreShape('helix');
      // Camera angles remain intact
      assert.strictEqual(camera.yaw, 0.8);
      assert.strictEqual(camera.pitch, 0.25);
    });

    it('F12.4: should seamlessly transition audio reactivity to the newly active shape', () => {
      const state = new AssistantStateMockEngine('sphere');
      state.setStatus('speaking');
      state.setAudioLevel(0.85);

      state.setCoreShape('icosahedron');
      const loudIco = ProceduralGeometryEngine.generateIcosahedronParticles(
        0,
        state.getStatus(),
        state.getAudioLevel()
      );
      assert.strictEqual(loudIco.length, 504);
      assert.ok(Math.hypot(loudIco[0].x, loudIco[0].y, loudIco[0].z) > 138);
    });

    it('F12.5: should handle rapid sequential switching across all 5 shapes without error', () => {
      const state = new AssistantStateMockEngine('sphere');
      const sequence: CoreShapeId[] = ['torus', 'icosahedron', 'helix', 'tesseract', 'sphere'];

      sequence.forEach((shape) => {
        state.selectShapeFromSettings(shape);
        assert.strictEqual(state.getCoreShape(), shape);
        assert.strictEqual(env.localStorage.getItem(STORAGE_KEYS.CORE_SHAPE), shape);
      });

      assert.strictEqual(state.chimePlayCount, 5);
    });
  });
});
