/**
 * Tier 4: Real-World Application Workload Scenarios E2E Test Suite
 * Validates complete end-to-end user journeys matching TEST_INFRA.md
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { setupTestEnvironment } from './harness/domMock.ts';
import type { CoreShapeId } from './harness/types.ts';
import {
  CORE_SHAPES,
  STORAGE_KEYS,
  ACCENT_THEMES,
} from './harness/types.ts';
import { ProceduralGeometryEngine } from './harness/geometryEngine.ts';
import { AssistantStateMockEngine } from './harness/stateEngine.ts';

describe('Tier 4: Real-World Workload Scenarios', () => {
  let env: ReturnType<typeof setupTestEnvironment>;

  beforeEach(() => {
    env = setupTestEnvironment();
  });

  afterEach(() => {
    env.cleanup();
  });

  // =========================================================================
  // Scenario 1: Complete User Lifecycle: Cold Boot -> Default Sphere ->
  // Select Torus in Settings -> Browser Reload -> Torus Restored in Voice Stage
  // =========================================================================
  it('Scenario 1: Full Application Lifecycle & Persistence Journey', () => {
    // 1. Cold boot with clean state
    env.localStorage.clear();
    const appSession1 = new AssistantStateMockEngine();
    assert.strictEqual(appSession1.getCoreShape(), 'sphere', 'Default cold boot shape must be Sphere');

    // 2. User opens Settings -> Theme & Appearance tab
    env.localStorage.setItem(STORAGE_KEYS.SETTINGS_TAB, 'theme');
    const availableShapes = appSession1.getAvailableShapes();
    assert.strictEqual(availableShapes.length, 5);

    // 3. User clicks Quantum Torus preview card
    appSession1.selectShapeFromSettings('torus');
    assert.strictEqual(appSession1.getCoreShape(), 'torus');
    assert.strictEqual(appSession1.chimePlayCount, 1, 'Click chime should play');
    assert.strictEqual(env.localStorage.getItem(STORAGE_KEYS.CORE_SHAPE), 'torus');

    // 4. Voice stage immediately mounts Quantum Torus visualizer
    const voiceStageParticles = ProceduralGeometryEngine.generateTorusParticles(0, 'idle', 0);
    assert.strictEqual(voiceStageParticles.length, 2408);
    const projected = ProceduralGeometryEngine.projectAndSortParticles(
      voiceStageParticles,
      0,
      0.1,
      190,
      150,
      appSession1.getAccentTheme()
    );
    assert.strictEqual(projected.length, 2408);

    // 5. Browser refresh / cold restart simulation
    const appSession2 = new AssistantStateMockEngine();
    assert.strictEqual(appSession2.getCoreShape(), 'torus', 'Persisted Torus shape must be restored on restart');
  });

  // =========================================================================
  // Scenario 2: Conversational Audio Reactivity Across All 5 Geometries
  // (Idle -> Listening to User -> Thinking with Orbital Rings -> Speaking TTS)
  // =========================================================================
  it('Scenario 2: Complete Conversational Voice Stage State Progression across all 5 Geometries', () => {
    const allShapes: CoreShapeId[] = ['sphere', 'torus', 'icosahedron', 'helix', 'tesseract'];

    allShapes.forEach((shape) => {
      const state = new AssistantStateMockEngine(shape);

      // Phase 1: Idle
      state.setStatus('idle');
      state.setAudioLevel(0);
      let pts = ProceduralGeometryEngine.generateSphereParticles(0, 'idle', 0);
      assert.ok(pts.length > 0);

      // Phase 2: User starts speaking (Listening state with mic audio)
      state.setStatus('listening');
      state.setAudioLevel(0.45);
      if (shape === 'torus') {
        pts = ProceduralGeometryEngine.generateTorusParticles(0.5, 'listening', 0.45);
      } else if (shape === 'helix') {
        pts = ProceduralGeometryEngine.generateHelixParticles(0.5, 'listening', 0.45);
      }
      assert.ok(pts.length > 0);

      // Phase 3: AI Thinking (Morphing / Orbital Rings / Faster Rotation)
      state.setStatus('thinking');
      state.setAudioLevel(0.1);
      state.playChime('thinking');
      assert.strictEqual(state.lastChimeType, 'thinking');

      // Phase 4: AI Speaking TTS Output (High audio level wave pulses)
      state.setStatus('speaking');
      state.setAudioLevel(0.85);

      let projected;
      if (shape === 'tesseract') {
        pts = ProceduralGeometryEngine.generateTesseractParticles(1.0, 'speaking', 0.85);
        projected = ProceduralGeometryEngine.projectAndSortParticles(pts, 0.2, 0.1, 190, 150, state.getAccentTheme(), 0.85, 'speaking');
      } else if (shape === 'icosahedron') {
        pts = ProceduralGeometryEngine.generateIcosahedronParticles(1.0, 'speaking', 0.85);
        projected = ProceduralGeometryEngine.projectAndSortParticles(pts, 0.2, 0.1, 190, 150, state.getAccentTheme(), 0.85, 'speaking');
      } else {
        projected = ProceduralGeometryEngine.projectAndSortParticles(pts, 0.2, 0.1, 190, 150, state.getAccentTheme(), 0.85, 'speaking');
      }

      assert.ok(projected.length > 0);
      assert.ok(projected.some((p) => p.color.includes('255')), 'Luminescent crest highlights present during speech');
    });
  });

  // =========================================================================
  // Scenario 3: Rapid Interactive Exploration & Settings Theme Switching
  // =========================================================================
  it('Scenario 3: Rapid Shape Exploration & Simultaneous Theme Switching', () => {
    const state = new AssistantStateMockEngine('sphere');
    const shapeSequence: CoreShapeId[] = ['torus', 'icosahedron', 'helix', 'tesseract', 'sphere'];
    const themeSequence = ACCENT_THEMES.slice(0, 5);

    shapeSequence.forEach((targetShape, idx) => {
      const targetTheme = themeSequence[idx];

      // Switch shape
      state.selectShapeFromSettings(targetShape);
      // Switch theme
      state.setAccentTheme(targetTheme);

      assert.strictEqual(state.getCoreShape(), targetShape);
      assert.strictEqual(state.getAccentTheme().id, targetTheme.id);
      assert.strictEqual(env.localStorage.getItem(STORAGE_KEYS.CORE_SHAPE), targetShape);
    });

    assert.strictEqual(state.chimePlayCount, 5);
  });

  // =========================================================================
  // Scenario 4: Multi-Axis Drag Rotation with Smooth Momentum Inertia Decay
  // =========================================================================
  it('Scenario 4: Interactive Orbit Drag & Smooth 0.94 Friction Momentum Decay', () => {
    const state = new AssistantStateMockEngine('tesseract');

    // 1. User grabs visualizer and drags diagonally (+200px X, +100px Y)
    const dragDeltaX = 200;
    const dragDeltaY = 100;
    const initialYawVelocity = dragDeltaX * 0.008; // 1.6 rad/s
    const initialPitchVelocity = dragDeltaY * 0.008; // 0.8 rad/s

    let cameraState = {
      yaw: 0,
      pitch: 0,
      velocityYaw: initialYawVelocity,
      velocityPitch: initialPitchVelocity,
      isDragging: false, // Released
      time: 0,
    };

    // 2. Simulate 45 frames (~750ms) of inertial momentum decay
    const yawHistory: number[] = [];
    const velocityHistory: number[] = [];

    for (let frame = 0; frame < 45; frame++) {
      cameraState = {
        ...ProceduralGeometryEngine.stepMomentumPhysics(cameraState, 1 / 60),
        isDragging: false,
        time: frame / 60,
      };
      yawHistory.push(cameraState.yaw);
      velocityHistory.push(cameraState.velocityYaw);
    }

    // 3. Verify monotonic position advancement and exponential velocity decay
    assert.ok(yawHistory[yawHistory.length - 1] > yawHistory[0], 'Visualizer rotated forward');
    assert.ok(
      velocityHistory[velocityHistory.length - 1] < velocityHistory[0] * 0.1,
      'Velocity decayed by >90% after 45 frames'
    );
    // Pitch is strictly clamped
    assert.ok(cameraState.pitch <= Math.PI / 2 - 0.1);
  });

  // =========================================================================
  // Scenario 5: Storage Corruption Recovery & Automatic Self-Healing
  // =========================================================================
  it('Scenario 5: Storage Corruption Resilience, Fallback & Self-Healing', () => {
    // 1. Corrupted localStorage with arbitrary garbage data
    env.localStorage.setItem(STORAGE_KEYS.CORE_SHAPE, '{"corrupt_prototype": true, broken:');

    // 2. Application safely boots without crashing and falls back to Sphere
    const app = new AssistantStateMockEngine();
    assert.strictEqual(app.getCoreShape(), 'sphere', 'Must fallback safely to sphere');

    // 3. User chooses Cyber Icosahedron
    app.selectShapeFromSettings('icosahedron');
    assert.strictEqual(app.getCoreShape(), 'icosahedron');

    // 4. Storage is cleanly healed and rewritten with valid identifier
    assert.strictEqual(env.localStorage.getItem(STORAGE_KEYS.CORE_SHAPE), 'icosahedron');

    // 5. Subsequent boot loads healed preference perfectly
    const rebootedApp = new AssistantStateMockEngine();
    assert.strictEqual(rebootedApp.getCoreShape(), 'icosahedron');
  });
});
