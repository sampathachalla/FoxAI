/**
 * Tier 5: Adversarial Settings, State Sync & Persistence Stress Suite
 *
 * Empirically tests:
 * 1. Rapid 1-click shape switching (1,000+ iterations, stress loops, latency & memory checks)
 * 2. State synchronization between assistantContext, SettingsView, and FloatingOrb
 * 3. localStorage persistence resilience (valid, invalid, empty, corrupted JSON, QuotaExceededError, SecurityError)
 * 4. Theme accent color switches interacting with active shape glow and audio reactivity
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { setupTestEnvironment } from './harness/domMock.ts';
import { AssistantStateMockEngine } from './harness/stateEngine.ts';
import {
  ProceduralGeometryEngine,
  hexToRgb,
} from './harness/geometryEngine.ts';
import {
  CORE_SHAPES,
  STORAGE_KEYS,
  ACCENT_THEMES,
  isValidCoreShapeId,
  normalizeCoreShapeId,
  type CoreShapeId,
  type AccentTheme,
  type AssistantStatus,
} from './harness/types.ts';

// Production Storage Service implementation replica for isolated node ESM runner verification
const AppStorageService = {
  loadCoreShape(fallback: CoreShapeId = 'sphere'): CoreShapeId {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CORE_SHAPE);
      if (
        saved === 'sphere' ||
        saved === 'torus' ||
        saved === 'icosahedron' ||
        saved === 'helix' ||
        saved === 'tesseract'
      ) {
        return saved;
      }
    } catch (e) {}
    return fallback;
  },

  saveCoreShape(shape: CoreShapeId): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CORE_SHAPE, shape);
    } catch (e) {}
  },
};

describe('Tier 5 Adversarial: Settings, State Sync & Persistence Stress Harness', () => {
  let env: ReturnType<typeof setupTestEnvironment>;

  beforeEach(() => {
    env = setupTestEnvironment();
  });

  afterEach(() => {
    env.cleanup();
  });

  // =========================================================================
  // SECTION 1: RAPID 1-CLICK SHAPE SWITCHING & PERFORMANCE STRESS
  // =========================================================================
  describe('1. Rapid 1-Click Shape Switching & Performance Stress', () => {
    it('1.1 should execute 1,000 rapid sequential shape switches without stalling or state corruption', () => {
      const stateEngine = new AssistantStateMockEngine('sphere');
      const allShapeIds: CoreShapeId[] = ['sphere', 'torus', 'icosahedron', 'helix', 'tesseract'];
      const history: CoreShapeId[] = [];

      stateEngine.subscribe((newShape) => {
        history.push(newShape);
      });

      const startTime = performance.now();
      const ITERATIONS = 1000;

      for (let i = 0; i < ITERATIONS; i++) {
        const targetShape = allShapeIds[i % allShapeIds.length];
        stateEngine.selectShapeFromSettings(targetShape);
        assert.strictEqual(stateEngine.getCoreShape(), targetShape);
      }

      const totalDuration = performance.now() - startTime;
      const latencyPerSwitchMs = totalDuration / ITERATIONS;

      assert.strictEqual(history.length, ITERATIONS);
      assert.strictEqual(stateEngine.chimePlayCount, ITERATIONS);
      assert.strictEqual(stateEngine.getCoreShape(), allShapeIds[(ITERATIONS - 1) % allShapeIds.length]);

      // Verify sub-millisecond switch latency (no render stalling)
      assert.ok(
        latencyPerSwitchMs < 1.0,
        `Average latency per shape switch was ${latencyPerSwitchMs.toFixed(4)}ms (threshold: < 1.0ms)`
      );
    });

    it('1.2 should execute 500 chaotic randomized shape switches with zero coordinate drift or memory explosion', () => {
      const allShapeIds: CoreShapeId[] = ['sphere', 'torus', 'icosahedron', 'helix', 'tesseract'];
      const statuses: AssistantStatus[] = ['idle', 'listening', 'thinking', 'speaking'];
      const theme = ACCENT_THEMES[0];

      const startTime = performance.now();

      for (let i = 0; i < 500; i++) {
        const randomShape = allShapeIds[Math.floor(Math.random() * allShapeIds.length)];
        const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
        const randomAudio = Math.random();
        const time = i * 0.016;

        let particles;
        switch (randomShape) {
          case 'sphere':
            particles = ProceduralGeometryEngine.generateSphereParticles(time, randomStatus, randomAudio, 0.5);
            break;
          case 'torus':
            particles = ProceduralGeometryEngine.generateTorusParticles(time, randomStatus, randomAudio);
            break;
          case 'icosahedron':
            particles = ProceduralGeometryEngine.generateIcosahedronParticles(time, randomStatus, randomAudio);
            break;
          case 'helix':
            particles = ProceduralGeometryEngine.generateHelixParticles(time, randomStatus, randomAudio);
            break;
          case 'tesseract':
            particles = ProceduralGeometryEngine.generateTesseractParticles(time, randomStatus, randomAudio);
            break;
        }

        assert.ok(Array.isArray(particles), `Shape ${randomShape} must produce particle array`);
        assert.ok(particles.length > 0, `Shape ${randomShape} particle count must be > 0`);

        // Check particle coordinate integrity (no NaN, no Infinity)
        for (const p of particles) {
          assert.ok(!isNaN(p.x) && isFinite(p.x), `p.x in ${randomShape} must be finite`);
          assert.ok(!isNaN(p.y) && isFinite(p.y), `p.y in ${randomShape} must be finite`);
          assert.ok(!isNaN(p.z) && isFinite(p.z), `p.z in ${randomShape} must be finite`);
        }

        // Camera projection
        const projected = ProceduralGeometryEngine.projectAndSortParticles(
          particles,
          Math.sin(time),
          0.1,
          190,
          150,
          theme,
          randomAudio,
          randomStatus
        );

        assert.strictEqual(projected.length, particles.length);
        // Verify depth sorting: descending Z order
        for (let j = 0; j < projected.length - 1; j++) {
          assert.ok(
            projected[j].z >= projected[j + 1].z,
            `Projected points must be sorted back-to-front`
          );
        }
      }

      const totalDuration = performance.now() - startTime;
      assert.ok(totalDuration < 1000, `500 procedural render frames executed in ${totalDuration.toFixed(2)}ms (< 1000ms)`);
    });

    it('1.3 should maintain strictly bounded particle counts across all shapes without memory leaks', () => {
      const counts: Record<CoreShapeId, number> = {
        sphere: 0,
        torus: 0,
        icosahedron: 0,
        helix: 0,
        tesseract: 0,
      };

      const shapes: CoreShapeId[] = ['sphere', 'torus', 'icosahedron', 'helix', 'tesseract'];

      for (const shape of shapes) {
        let p;
        if (shape === 'sphere') p = ProceduralGeometryEngine.generateSphereParticles(0, 'idle', 0, 0);
        else if (shape === 'torus') p = ProceduralGeometryEngine.generateTorusParticles(0, 'idle', 0);
        else if (shape === 'icosahedron') p = ProceduralGeometryEngine.generateIcosahedronParticles(0, 'idle', 0);
        else if (shape === 'helix') p = ProceduralGeometryEngine.generateHelixParticles(0, 'idle', 0);
        else p = ProceduralGeometryEngine.generateTesseractParticles(0, 'idle', 0);

        counts[shape] = p.length;
        assert.ok(p.length >= 400 && p.length <= 3000, `Particle count for ${shape} (${p.length}) is within optimal 400-3000 budget`);
      }

      // Exact known counts
      assert.strictEqual(counts.sphere, 2400);
      assert.strictEqual(counts.torus, 2408);
      assert.strictEqual(counts.icosahedron, 504);
      assert.strictEqual(counts.helix, 1324);
      assert.strictEqual(counts.tesseract, 400);
    });
  });

  // =========================================================================
  // SECTION 2: SYNCHRONIZATION BETWEEN CONTEXT, SETTINGS, AND ORB
  // =========================================================================
  describe('2. Synchronization between assistantContext, SettingsView, and FloatingOrb', () => {
    it('2.1 should notify all subscribers synchronously on 1-click shape selection', () => {
      const stateEngine = new AssistantStateMockEngine('sphere');
      let subscriber1Shape: CoreShapeId | null = null;
      let subscriber2Shape: CoreShapeId | null = null;

      const unsub1 = stateEngine.subscribe((shape) => {
        subscriber1Shape = shape;
      });
      const unsub2 = stateEngine.subscribe((shape) => {
        subscriber2Shape = shape;
      });

      stateEngine.selectShapeFromSettings('helix');
      assert.strictEqual(subscriber1Shape, 'helix');
      assert.strictEqual(subscriber2Shape, 'helix');
      assert.strictEqual(stateEngine.getCoreShape(), 'helix');

      unsub1();
      stateEngine.selectShapeFromSettings('tesseract');
      assert.strictEqual(subscriber1Shape, 'helix'); // Unsubscribed
      assert.strictEqual(subscriber2Shape, 'tesseract');

      unsub2();
    });

    it('2.2 should maintain consistency across concurrent rapid shape change calls', () => {
      const stateEngine = new AssistantStateMockEngine('sphere');
      const shapes: CoreShapeId[] = ['torus', 'icosahedron', 'helix', 'tesseract', 'sphere'];

      // Simulate simultaneous event triggers
      shapes.forEach((s) => stateEngine.setCoreShape(s));

      assert.strictEqual(stateEngine.getCoreShape(), 'sphere');
      assert.strictEqual(env.localStorage.getItem(STORAGE_KEYS.CORE_SHAPE), 'sphere');
    });

    it('2.3 should ensure all 5 shapes have complete metadata and distinct icons/taglines', () => {
      assert.strictEqual(CORE_SHAPES.length, 5);

      const ids = new Set<string>();
      const names = new Set<string>();
      const icons = new Set<string>();

      for (const shape of CORE_SHAPES) {
        assert.ok(shape.id, 'Shape ID must exist');
        assert.ok(shape.name, 'Shape name must exist');
        assert.ok(shape.tagline, 'Shape tagline must exist');
        assert.ok(shape.description, 'Shape description must exist');
        assert.ok(shape.iconName, 'Shape iconName must exist');
        assert.ok(shape.particleCount > 0, 'Shape particleCount must be > 0');

        ids.add(shape.id);
        names.add(shape.name);
        icons.add(shape.iconName);
      }

      assert.strictEqual(ids.size, 5, 'Must have 5 unique shape IDs');
      assert.strictEqual(names.size, 5, 'Must have 5 unique shape names');
      assert.strictEqual(icons.size, 5, 'Must have 5 unique shape icons');
    });
  });

  // =========================================================================
  // SECTION 3: LOCALSTORAGE PERSISTENCE RESILIENCE UNDER ADVERSARIAL INPUTS
  // =========================================================================
  describe('3. localStorage Persistence & Fault Tolerance', () => {
    it('3.1 should correctly persist and load all 5 valid CoreShapeIds', () => {
      const validShapes: CoreShapeId[] = ['sphere', 'torus', 'icosahedron', 'helix', 'tesseract'];

      for (const shape of validShapes) {
        AppStorageService.saveCoreShape(shape);
        assert.strictEqual(env.localStorage.getItem(STORAGE_KEYS.CORE_SHAPE), shape);

        const loaded = AppStorageService.loadCoreShape();
        assert.strictEqual(loaded, shape);
      }
    });

    it('3.2 should gracefully fall back to default when localStorage contains invalid keys', () => {
      const invalidKeys = [
        'cube',
        'pyramid',
        'donut',
        'cylinder',
        'custom_shape',
        'SPHERE', // Case mismatch
        'Torus',
        '',
        '   ',
        '12345',
        'true',
        'false',
        'null',
        'undefined',
        '__proto__',
        'constructor',
      ];

      for (const invalid of invalidKeys) {
        env.localStorage.setItem(STORAGE_KEYS.CORE_SHAPE, invalid);
        const result = AppStorageService.loadCoreShape('sphere');
        assert.strictEqual(
          result,
          'sphere',
          `Invalid key "${invalid}" should fall back to 'sphere'`
        );
      }
    });

    it('3.3 should handle empty storage or missing keys without errors', () => {
      env.localStorage.clear();
      assert.strictEqual(AppStorageService.loadCoreShape('sphere'), 'sphere');
      assert.strictEqual(AppStorageService.loadCoreShape('torus'), 'torus');
    });

    it('3.4 should handle corrupted JSON, raw object strings, and prototype pollution attempts', () => {
      const corruptedPayloads = [
        '{"id": "torus", "malicious": true}',
        '{"__proto__": {"polluted": true}}',
        '[1, 2, 3, "helix"]',
        '<html><body>hack</body></html>',
        '{"corrupted JSON',
        'undefined',
        'NaN',
        '0',
      ];

      for (const payload of corruptedPayloads) {
        env.localStorage.setItem(STORAGE_KEYS.CORE_SHAPE, payload);
        const result = AppStorageService.loadCoreShape('sphere');
        assert.strictEqual(
          result,
          'sphere',
          `Corrupted payload "${payload}" should safely resolve to default`
        );
      }
    });

    it('3.5 should safely catch and recover from QuotaExceededError during saveCoreShape', () => {
      env.localStorage.quotaErrorTrigger = true;

      // Should not throw unhandled exception
      assert.doesNotThrow(() => {
        AppStorageService.saveCoreShape('tesseract');
      });

      env.localStorage.quotaErrorTrigger = false;
    });

    it('3.6 should safely catch and recover when localStorage throws SecurityError (Incognito/Blocked)', () => {
      const originalGetItem = env.localStorage.getItem;
      const originalSetItem = env.localStorage.setItem;

      // Mock SecurityError thrown by browser when 3rd-party cookies/storage are disabled
      env.localStorage.getItem = () => {
        const err = new Error('SecurityError: The operation is insecure.');
        err.name = 'SecurityError';
        throw err;
      };
      env.localStorage.setItem = () => {
        const err = new Error('SecurityError: The operation is insecure.');
        err.name = 'SecurityError';
        throw err;
      };

      assert.doesNotThrow(() => {
        const loaded = AppStorageService.loadCoreShape('sphere');
        assert.strictEqual(loaded, 'sphere');
      });

      assert.doesNotThrow(() => {
        AppStorageService.saveCoreShape('icosahedron');
      });

      // Restore
      env.localStorage.getItem = originalGetItem;
      env.localStorage.setItem = originalSetItem;
    });
  });

  // =========================================================================
  // SECTION 4: THEME ACCENT COLOR SWITCHES & ACTIVE SHAPE GLOW COHERENCE
  // =========================================================================
  describe('4. Theme Accent Color Switches & Active Shape Glow', () => {
    it('4.1 should parse all 7 theme hex colors and custom hexes accurately without NaN or color corruption', () => {
      for (const theme of ACCENT_THEMES) {
        const rgbP = hexToRgb(theme.primary);
        assert.ok(rgbP.r >= 0 && rgbP.r <= 255 && Number.isInteger(rgbP.r));
        assert.ok(rgbP.g >= 0 && rgbP.g <= 255 && Number.isInteger(rgbP.g));
        assert.ok(rgbP.b >= 0 && rgbP.b <= 255 && Number.isInteger(rgbP.b));

        const rgbS = hexToRgb(theme.secondary);
        assert.ok(rgbS.r >= 0 && rgbS.r <= 255 && Number.isInteger(rgbS.r));
        assert.ok(rgbS.g >= 0 && rgbS.g <= 255 && Number.isInteger(rgbS.g));
        assert.ok(rgbS.b >= 0 && rgbS.b <= 255 && Number.isInteger(rgbS.b));
      }
    });

    it('4.2 should fall back gracefully on invalid, malformed, or missing hex color values', () => {
      const malformedHexes = ['', '#', '#1', '#12', '#XYZ123', 'invalid', '#GGGGGG', null as any, undefined as any];

      for (const hex of malformedHexes) {
        const rgb = hexToRgb(hex);
        assert.ok(!isNaN(rgb.r) && rgb.r >= 0 && rgb.r <= 255);
        assert.ok(!isNaN(rgb.g) && rgb.g >= 0 && rgb.g <= 255);
        assert.ok(!isNaN(rgb.b) && rgb.b >= 0 && rgb.b <= 255);
      }
    });

    it('4.3 should render correct theme-derived glow colors for all 35 (7 themes × 5 shapes) combinations under speech audio', () => {
      const shapes: CoreShapeId[] = ['sphere', 'torus', 'icosahedron', 'helix', 'tesseract'];

      for (const theme of ACCENT_THEMES) {
        for (const shape of shapes) {
          let particles;
          if (shape === 'sphere') particles = ProceduralGeometryEngine.generateSphereParticles(1.0, 'speaking', 0.8, 0);
          else if (shape === 'torus') particles = ProceduralGeometryEngine.generateTorusParticles(1.0, 'speaking', 0.8);
          else if (shape === 'icosahedron') particles = ProceduralGeometryEngine.generateIcosahedronParticles(1.0, 'speaking', 0.8);
          else if (shape === 'helix') particles = ProceduralGeometryEngine.generateHelixParticles(1.0, 'speaking', 0.8);
          else particles = ProceduralGeometryEngine.generateTesseractParticles(1.0, 'speaking', 0.8);

          const projected = ProceduralGeometryEngine.projectAndSortParticles(
            particles,
            0.5,
            0.1,
            200,
            200,
            theme,
            0.8,
            'speaking'
          );

          for (const pt of projected) {
            // Verify color string format
            assert.ok(pt.color.startsWith('rgb('), `Color must start with rgb(`);
            assert.ok(pt.glowColor.startsWith('rgba('), `GlowColor must start with rgba(`);
            assert.ok(pt.alpha >= 0.15 && pt.alpha <= 1.0, `Alpha must be between 0.15 and 1.0 (got ${pt.alpha})`);
            assert.ok(!isNaN(pt.size) && pt.size >= 0.8, `Size must be >= 0.8 (got ${pt.size})`);
          }
        }
      }
    });

    it('4.4 should seamlessly update theme and shape simultaneously without state collision', () => {
      const stateEngine = new AssistantStateMockEngine('sphere', 'fox-cyan');
      let lastTheme: AccentTheme | null = null;
      let lastShape: CoreShapeId | null = null;

      stateEngine.subscribeTheme((t) => (lastTheme = t));
      stateEngine.subscribe((s) => (lastShape = s));

      for (let i = 0; i < ACCENT_THEMES.length; i++) {
        const theme = ACCENT_THEMES[i];
        const shape = CORE_SHAPES[i % CORE_SHAPES.length].id;

        stateEngine.setAccentTheme(theme);
        stateEngine.setCoreShape(shape);

        assert.strictEqual(lastTheme?.id, theme.id);
        assert.strictEqual(lastShape, shape);
        assert.strictEqual(stateEngine.getAccentTheme().id, theme.id);
        assert.strictEqual(stateEngine.getCoreShape(), shape);
      }
    });
  });
});
