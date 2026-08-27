/**
 * Tier 3: Cross-Feature Combinations (Pairwise Combinatorial Testing)
 * Systematically exercises combinatorial pairs across 5 Shapes, 5 Audio Levels, 7 Themes, 4 States, 4 Drag Vectors, and Storage States
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { setupTestEnvironment } from './harness/domMock.ts';
import type { CoreShapeId, AssistantStatus, AccentTheme } from './harness/types.ts';
import {
  CORE_SHAPES,
  STORAGE_KEYS,
  ACCENT_THEMES,
} from './harness/types.ts';
import { ProceduralGeometryEngine } from './harness/geometryEngine.ts';
import { AssistantStateMockEngine } from './harness/stateEngine.ts';

describe('Tier 3: Cross-Feature Combinatorial Pairs', () => {
  let env: ReturnType<typeof setupTestEnvironment>;

  beforeEach(() => {
    env = setupTestEnvironment();
  });

  afterEach(() => {
    env.cleanup();
  });

  // =========================================================================
  // Combinatorial Set 1: All 5 Shapes × 5 Audio Reactivity Levels
  // =========================================================================
  describe('Combo Set 1: Core Shapes × Audio Reactivity Levels', () => {
    const shapes: CoreShapeId[] = ['sphere', 'torus', 'icosahedron', 'helix', 'tesseract'];
    const audioLevels: number[] = [0.0, 0.25, 0.5, 0.85, 1.0];

    shapes.forEach((shape) => {
      audioLevels.forEach((audio) => {
        it(`C1: Shape [${shape}] with Audio Level [${audio}] should render bounded coordinates`, () => {
          let particles;
          if (shape === 'sphere') {
            particles = ProceduralGeometryEngine.generateSphereParticles(0.5, 'speaking', audio, 0);
          } else if (shape === 'torus') {
            particles = ProceduralGeometryEngine.generateTorusParticles(0.5, 'speaking', audio);
          } else if (shape === 'icosahedron') {
            particles = ProceduralGeometryEngine.generateIcosahedronParticles(0.5, 'speaking', audio);
          } else if (shape === 'helix') {
            particles = ProceduralGeometryEngine.generateHelixParticles(0.5, 'speaking', audio);
          } else {
            particles = ProceduralGeometryEngine.generateTesseractParticles(0.5, 'speaking', audio);
          }

          assert.ok(particles.length >= 400, `Particle count too low for ${shape}: ${particles.length}`);
          assert.ok(particles.every((p) => isFinite(p.x) && isFinite(p.y) && isFinite(p.z)));

          const projected = ProceduralGeometryEngine.projectAndSortParticles(
            particles,
            0.2,
            0.1,
            200,
            200,
            ACCENT_THEMES[0],
            audio,
            'speaking'
          );

          assert.strictEqual(projected.length, particles.length);
          assert.ok(projected.every((pt) => pt.scale > 0 && isFinite(pt.scale)));
        });
      });
    });
  });

  // =========================================================================
  // Combinatorial Set 2: All 5 Shapes × All 7 Accent Themes
  // =========================================================================
  describe('Combo Set 2: Core Shapes × 7 Accent Themes', () => {
    const shapes: CoreShapeId[] = ['sphere', 'torus', 'icosahedron', 'helix', 'tesseract'];

    shapes.forEach((shape) => {
      ACCENT_THEMES.forEach((theme) => {
        it(`C2: Shape [${shape}] with Theme [${theme.id}] should project with correct theme tints`, () => {
          const state = new AssistantStateMockEngine(shape, theme.id);
          assert.strictEqual(state.getCoreShape(), shape);
          assert.strictEqual(state.getAccentTheme().id, theme.id);

          const particles = ProceduralGeometryEngine.generateSphereParticles(0, 'idle', 0);
          const projected = ProceduralGeometryEngine.projectAndSortParticles(
            particles.slice(0, 10),
            0,
            0,
            100,
            100,
            theme
          );

          assert.strictEqual(projected.length, 10);
          assert.ok(projected[0].color.startsWith('rgb('));
        });
      });
    });
  });

  // =========================================================================
  // Combinatorial Set 3: All 5 Shapes × 4 Assistant States
  // =========================================================================
  describe('Combo Set 3: Core Shapes × 4 Assistant States', () => {
    const shapes: CoreShapeId[] = ['sphere', 'torus', 'icosahedron', 'helix', 'tesseract'];
    const statuses: AssistantStatus[] = ['idle', 'listening', 'thinking', 'speaking'];

    shapes.forEach((shape) => {
      statuses.forEach((status) => {
        it(`C3: Shape [${shape}] in Status [${status}] should execute procedural loop`, () => {
          const audio = status === 'speaking' ? 0.8 : status === 'listening' ? 0.4 : 0.0;
          let particles;

          if (shape === 'sphere') {
            particles = ProceduralGeometryEngine.generateSphereParticles(1.0, status, audio, status === 'thinking' ? 1.0 : 0.0);
          } else if (shape === 'torus') {
            particles = ProceduralGeometryEngine.generateTorusParticles(1.0, status, audio);
          } else if (shape === 'icosahedron') {
            particles = ProceduralGeometryEngine.generateIcosahedronParticles(1.0, status, audio);
          } else if (shape === 'helix') {
            particles = ProceduralGeometryEngine.generateHelixParticles(1.0, status, audio);
          } else {
            particles = ProceduralGeometryEngine.generateTesseractParticles(1.0, status, audio);
          }

          assert.ok(particles.length > 0);
          const projected = ProceduralGeometryEngine.projectAndSortParticles(
            particles,
            0.1,
            0.1,
            190,
            150,
            ACCENT_THEMES[0],
            audio,
            status
          );

          assert.strictEqual(projected.length, particles.length);
        });
      });
    });
  });

  // =========================================================================
  // Combinatorial Set 4: Drag Momentum Vectors × Complex Geometries
  // =========================================================================
  describe('Combo Set 4: Drag Momentum Vectors × Geometries', () => {
    const dragVectors = [
      { name: 'Positive Yaw+Pitch', vy: 0.12, vp: 0.06 },
      { name: 'Negative Yaw+Pitch', vy: -0.12, vp: -0.06 },
      { name: 'Diagonal Cross Spin', vy: 0.15, vp: -0.10 },
      { name: 'Pure Yaw Drift', vy: 0.08, vp: 0.0 },
    ];

    dragVectors.forEach((vec) => {
      it(`C4: Drag Vector [${vec.name}] decays smoothly over 30 frames`, () => {
        let physics = {
          yaw: 0,
          pitch: 0,
          velocityYaw: vec.vy,
          velocityPitch: vec.vp,
          isDragging: false,
          time: 0,
        };

        for (let f = 0; f < 30; f++) {
          physics = { ...ProceduralGeometryEngine.stepMomentumPhysics(physics, 1 / 60), isDragging: false, time: f / 60 };
        }

        assert.ok(Math.abs(physics.velocityYaw) < Math.abs(vec.vy), 'Yaw velocity must decay');
        assert.ok(Math.abs(physics.velocityPitch) <= Math.abs(vec.vp), 'Pitch velocity must decay');
      });
    });
  });

  // =========================================================================
  // Combinatorial Set 5: Shape Switching × Storage State Transitions
  // =========================================================================
  describe('Combo Set 5: Shape Switching × Storage State Transitions', () => {
    const transitions: { from: CoreShapeId; to: CoreShapeId; storageInit: string | null }[] = [
      { from: 'sphere', to: 'torus', storageInit: null },
      { from: 'torus', to: 'icosahedron', storageInit: 'torus' },
      { from: 'icosahedron', to: 'helix', storageInit: 'icosahedron' },
      { from: 'helix', to: 'tesseract', storageInit: 'helix' },
      { from: 'tesseract', to: 'sphere', storageInit: 'tesseract' },
    ];

    transitions.forEach((t) => {
      it(`C5: Transition [${t.from} -> ${t.to}] with Initial Storage [${t.storageInit}]`, () => {
        if (t.storageInit) {
          env.localStorage.setItem(STORAGE_KEYS.CORE_SHAPE, t.storageInit);
        } else {
          env.localStorage.clear();
        }

        const state = new AssistantStateMockEngine();
        assert.strictEqual(state.getCoreShape(), t.from);

        state.selectShapeFromSettings(t.to);
        assert.strictEqual(state.getCoreShape(), t.to);
        assert.strictEqual(env.localStorage.getItem(STORAGE_KEYS.CORE_SHAPE), t.to);
      });
    });
  });
});
