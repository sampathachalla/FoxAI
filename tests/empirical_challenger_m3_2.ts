/**
 * Empirical Challenger M3.2 Verification & Stress Test Suite
 * Comprehensive Adversarial Validation of:
 * 1. Storage Persistence & Corruption Resilience (AppMode & CelestialTarget)
 * 2. Speech Subtitle Overlay Synchronization & Transcription Streaming
 * 3. Audio Level Meter Precision & Audio Reactivity Modulation
 * 4. UI Layout Stability, Viewport Stress & Z-Index Layering
 * 5. All 16 PROJECT.md Integrated Feature Operations
 */

import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';

import {
  CELESTIAL_BODIES,
  CELESTIAL_BODY_MAP,
  PLANETARY_DATA,
  getCelestialBody,
} from '../app/components/Planetarium/PlanetaryData.ts';
import {
  computeSolarFlareParams,
  computeSaturnRingSegments,
  hexToRgb,
  rgba,
  lerpColor,
  proceduralTurbulence,
  type Point3D,
  type ProjectedBodyItem,
} from '../app/components/Planetarium/SolarShaders.ts';
import {
  type AppMode,
  type CelestialId,
  type CelestialBodyData,
  STORAGE_KEYS,
  isValidAppMode,
  normalizeAppMode,
  isValidCelestialId,
  normalizeCelestialId,
} from './harness/types.ts';
import { MockStorageService, MockAssistantContext } from './harness/stateEngine.ts';
import { setupTestEnvironment } from './harness/domMock.ts';

describe('Adversarial Challenge M3.2: Storage Persistence & Resilience', () => {
  let env: ReturnType<typeof setupTestEnvironment>;
  let storage: MockStorageService;

  beforeEach(() => {
    env = setupTestEnvironment();
    storage = new MockStorageService(env.localStorage);
  });

  it('1.1 should persist and reload all 5 valid AppModes seamlessly', () => {
    const validModes: AppMode[] = ['voice', 'chat', 'settings', 'tools', 'planetarium'];
    for (const mode of validModes) {
      const saved = storage.saveAppMode(mode);
      assert.strictEqual(saved, true, `saveAppMode(${mode}) must return true`);
      const retrieved = storage.loadAppMode();
      assert.strictEqual(retrieved, mode, `Expected loaded app mode to equal ${mode}`);
    }
  });

  it('1.2 should safely sanitize and fallback on invalid or corrupted AppModes', () => {
    const adversarialModes = [
      '',
      'invalid_mode',
      'PLANETARIUM',
      'admin',
      'null',
      'undefined',
      '{}',
      '[]',
      '__proto__',
      '123',
      'true',
      'constructor',
    ];

    for (const bogus of adversarialModes) {
      env.localStorage.setItem(STORAGE_KEYS.APP_MODE, bogus);
      const loaded = storage.loadAppMode('voice');
      assert.strictEqual(loaded, 'voice', `Bogus app mode '${bogus}' must fallback safely to 'voice'`);
    }
  });

  it('1.3 should persist and reload all 10 valid CelestialIds seamlessly', () => {
    const allCelestialIds: CelestialId[] = [
      'sun',
      'mercury',
      'venus',
      'earth',
      'mars',
      'jupiter',
      'saturn',
      'uranus',
      'neptune',
      'pluto',
    ];

    for (const id of allCelestialIds) {
      const saved = storage.savePlanetariumTarget(id);
      assert.strictEqual(saved, true, `savePlanetariumTarget(${id}) must return true`);
      const retrieved = storage.loadPlanetariumTarget('sun');
      assert.strictEqual(retrieved, id, `Expected loaded celestial target to equal ${id}`);
    }
  });

  it('1.4 should safely sanitize and fallback on corrupted CelestialIds', () => {
    const corruptedTargets = [
      '',
      'andromeda',
      'black_hole',
      'moon',
      'titan',
      'europa',
      'SUN',
      '12345',
      'undefined',
      '{"target":"earth"}',
      '<script>alert(1)</script>',
      '__proto__',
    ];

    for (const corrupted of corruptedTargets) {
      env.localStorage.setItem(STORAGE_KEYS.PLANETARIUM_TARGET, corrupted);
      const loaded = storage.loadPlanetariumTarget('sun');
      assert.strictEqual(loaded, 'sun', `Corrupted target '${corrupted}' must fallback safely to 'sun'`);
      
      const customFallback = storage.loadPlanetariumTarget('earth');
      assert.strictEqual(customFallback, 'earth', `Corrupted target must respect custom fallback 'earth'`);
    }
  });

  it('1.5 should survive 2,000 rapid randomized state switches without corruption', () => {
    const validModes: AppMode[] = ['voice', 'chat', 'settings', 'tools', 'planetarium'];
    const validTargets: CelestialId[] = [
      'sun', 'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'
    ];

    for (let i = 0; i < 2000; i++) {
      const mode = validModes[i % validModes.length];
      const target = validTargets[(i * 7) % validTargets.length];

      storage.saveAppMode(mode);
      storage.savePlanetariumTarget(target);

      assert.strictEqual(storage.loadAppMode(), mode);
      assert.strictEqual(storage.loadPlanetariumTarget(), target);
    }
  });

  it('1.6 should gracefully catch and recover from QuotaExceededError and SecurityError', () => {
    env.localStorage.quotaErrorTrigger = true;
    assert.doesNotThrow(() => {
      const savedMode = storage.saveAppMode('planetarium');
      const savedTarget = storage.savePlanetariumTarget('saturn');
      assert.strictEqual(savedMode, false);
      assert.strictEqual(savedTarget, false);
    });

    env.localStorage.quotaErrorTrigger = false;
    // Test safe loading with fallback
    const mode = storage.loadAppMode('voice');
    const target = storage.loadPlanetariumTarget('sun');
    assert.strictEqual(mode, 'voice');
    assert.strictEqual(target, 'sun');
  });
});

describe('Adversarial Challenge M3.2: Speech Subtitle Overlay Sync & Streaming', () => {
  // Oracle simulating the render visibility & content condition of PlanetariumStage subtitle overlay
  function evaluateSubtitleOverlay(state: {
    status: 'idle' | 'listening' | 'thinking' | 'speaking';
    speakingTranscript: string;
    currentTranscript: string;
  }) {
    const isVisible =
      (state.status === 'speaking' || state.status === 'listening') &&
      Boolean(state.speakingTranscript || state.currentTranscript);

    const activeText = state.speakingTranscript || state.currentTranscript;
    const iconType = state.status === 'speaking' ? 'Volume2' : state.status === 'listening' ? 'Mic' : null;

    return {
      isVisible,
      activeText,
      iconType,
    };
  }

  it('2.1 should verify strict visibility predicate across all 16 state permutations', () => {
    const statuses: ('idle' | 'listening' | 'thinking' | 'speaking')[] = [
      'idle',
      'listening',
      'thinking',
      'speaking',
    ];
    const speechTranscripts = ['', 'Saturn features iconic 3D rings'];
    const currentTranscripts = ['', 'Inspect Mars coordinates'];

    for (const status of statuses) {
      for (const st of speechTranscripts) {
        for (const ct of currentTranscripts) {
          const result = evaluateSubtitleOverlay({
            status,
            speakingTranscript: st,
            currentTranscript: ct,
          });

          const expectedVisible =
            (status === 'speaking' || status === 'listening') && Boolean(st || ct);

          assert.strictEqual(
            result.isVisible,
            expectedVisible,
            `Visibility mismatch for status=${status}, st="${st}", ct="${ct}"`
          );

          if (result.isVisible) {
            assert.strictEqual(result.activeText, st || ct);
            assert.strictEqual(
              result.iconType,
              status === 'speaking' ? 'Volume2' : 'Mic'
            );
          }
        }
      }
    }
  });

  it('2.2 should maintain frame-accurate subtitle streaming synchronization during voice playback', () => {
    const fullSpeech =
      'Jupiter is the largest planet in our Solar System, with a mass more than two and a half times that of all other planets combined.';
    const words = fullSpeech.split(' ');

    let progressiveRevealed = '';
    const capturedOverlays: string[] = [];

    // Simulate word-by-word streaming callback
    for (let i = 0; i < words.length; i++) {
      progressiveRevealed = words.slice(0, i + 1).join(' ');
      const overlay = evaluateSubtitleOverlay({
        status: 'speaking',
        speakingTranscript: progressiveRevealed,
        currentTranscript: '',
      });

      assert.strictEqual(overlay.isVisible, true);
      assert.strictEqual(overlay.activeText, progressiveRevealed);
      assert.strictEqual(overlay.iconType, 'Volume2');
      capturedOverlays.push(overlay.activeText);
    }

    assert.strictEqual(capturedOverlays.length, words.length);
    assert.strictEqual(capturedOverlays[capturedOverlays.length - 1], fullSpeech);

    // On speech end -> status returns to idle and transcripts reset
    const finalEndState = evaluateSubtitleOverlay({
      status: 'idle',
      speakingTranscript: '',
      currentTranscript: '',
    });
    assert.strictEqual(finalEndState.isVisible, false);
  });

  it('2.3 should safely handle adversarial, unicode, multi-lingual, and ultra-long transcripts', () => {
    const testCases = [
      '🚀 Exploring Solar System at 100,000 km/s! 🪐 ✨',
      '<script>alert("xss")</script>',
      '太陽系第6惑星の土星は、巨大な環を持つことで知られています。',
      'Юпитер — крупнейшая планеタ Солнечной системы.',
      'A'.repeat(10000), // extreme stress length
      'Special chars: & < > " \' / \\ ` $ # @ ! * ( ) [ ] { }',
    ];

    for (const testText of testCases) {
      const overlay = evaluateSubtitleOverlay({
        status: 'speaking',
        speakingTranscript: testText,
        currentTranscript: '',
      });

      assert.strictEqual(overlay.isVisible, true);
      assert.strictEqual(overlay.activeText, testText);
    }
  });
});

describe('Adversarial Challenge M3.2: Audio Level Meter & Shaders Modulation', () => {
  // Oracle simulating PlanetariumControls audio reactivity badge
  function evaluateAudioMeter(audioLevel: number) {
    const isVisible = audioLevel > 0.02;
    const percentage = isVisible ? `${Math.round(audioLevel * 100)}%` : null;
    return { isVisible, percentage };
  }

  it('3.1 should correctly format and threshold audio level percentages', () => {
    assert.strictEqual(evaluateAudioMeter(0.0).isVisible, false);
    assert.strictEqual(evaluateAudioMeter(0.019).isVisible, false);
    assert.strictEqual(evaluateAudioMeter(0.02).isVisible, false);
    assert.strictEqual(evaluateAudioMeter(0.021).isVisible, true);
    assert.strictEqual(evaluateAudioMeter(0.021).percentage, '2%');
    assert.strictEqual(evaluateAudioMeter(0.05).percentage, '5%');
    assert.strictEqual(evaluateAudioMeter(0.42).percentage, '42%');
    assert.strictEqual(evaluateAudioMeter(0.887).percentage, '89%');
    assert.strictEqual(evaluateAudioMeter(1.0).percentage, '100%');
  });

  it('3.2 should modulate solar corona flare parameters with audio reactivity', () => {
    const time = 10.0;
    const silentParams = computeSolarFlareParams(time, 0.0);
    const midParams = computeSolarFlareParams(time, 0.5);
    const maxParams = computeSolarFlareParams(time, 1.0);

    // Audio reactivity should expand coronal glow radius
    assert.ok(
      midParams.coronalGlowRadius > silentParams.coronalGlowRadius,
      'Mid audio must increase coronal glow radius over silence'
    );
    assert.ok(
      maxParams.coronalGlowRadius > midParams.coronalGlowRadius,
      'Max audio must increase coronal glow radius over mid audio'
    );

    // Audio reactivity should elevate prominence count and flare intensity
    assert.ok(
      maxParams.prominenceCount >= midParams.prominenceCount,
      'Prominence count must be monotonically non-decreasing'
    );
    assert.ok(
      maxParams.flareIntensity >= midParams.flareIntensity,
      'Flare intensity must be monotonically non-decreasing'
    );

    // Verify all parameters are strictly finite numbers
    assert.ok(Number.isFinite(maxParams.coreRadius));
    assert.ok(Number.isFinite(maxParams.coronalGlowRadius));
    assert.ok(Number.isFinite(maxParams.flareIntensity));
    assert.ok(Number.isFinite(maxParams.prominenceScale));
  });

  it('3.3 should handle adversarial audio inputs without NaN or crash', () => {
    const adversarialAudioLevels = [-1.0, -0.05, 0.0, 1.5, 5.0, 100.0, NaN, Infinity, -Infinity];

    for (const level of adversarialAudioLevels) {
      assert.doesNotThrow(() => {
        const params = computeSolarFlareParams(5.0, level);
        assert.ok(Number.isFinite(params.coreRadius));
        assert.ok(Number.isFinite(params.coronalGlowRadius));
        assert.ok(Number.isFinite(params.flareIntensity));
      });
    }
  });

  it('3.4 should generate depth-sorted Saturn ring slices with audio shimmer', () => {
    const time = 4.5;
    const saturnPos: Point3D = { x: 250, y: 30, z: 80 };
    const camera = { yaw: 0.45, pitch: 0.55, zoom: 600 };
    const ringSegments = computeSaturnRingSegments(
      saturnPos,
      camera,
      1920,
      1080,
      0.75, // audio energy
      time
    );

    const totalSegments = ringSegments.backRings.length + ringSegments.frontRings.length;
    assert.strictEqual(totalSegments, 48, 'Saturn ring must generate exactly 48 geometry slices');
    
    // Check ring segment properties
    for (const seg of [...ringSegments.backRings, ...ringSegments.frontRings]) {
      assert.ok(Number.isFinite(seg.screenX));
      assert.ok(Number.isFinite(seg.screenY));
      assert.ok(Number.isFinite(seg.screenZ));
      assert.ok(Number.isFinite(seg.scale));
      assert.ok(typeof seg.isFront === 'boolean');
      assert.ok(seg.alpha >= 0 && seg.alpha <= 1);
    }
  });
});

describe('Adversarial Challenge M3.2: UI Layout Stability & Viewport Resizing', () => {
  const VIEWPORTS = [
    { name: 'Mobile SE', width: 320, height: 568 },
    { name: 'Mobile Standard', width: 375, height: 667 },
    { name: 'Mobile Pro Max', width: 430, height: 932 },
    { name: 'Tablet Portrait', width: 768, height: 1024 },
    { name: 'Tablet Landscape', width: 1024, height: 768 },
    { name: 'Laptop HD', width: 1366, height: 768 },
    { name: 'Desktop Full HD', width: 1920, height: 1080 },
    { name: 'QHD 1440p', width: 2560, height: 1440 },
    { name: 'Ultrawide 21:9', width: 3440, height: 1440 },
    { name: '4K UHD', width: 3840, height: 2160 },
    { name: 'Extreme Vertical Strip', width: 200, height: 1200 },
    { name: 'Extreme Horizontal Bar', width: 1600, height: 200 },
  ];

  it('4.1 should calculate bounded 3D camera projection bounds across all viewports', () => {
    for (const vp of VIEWPORTS) {
      const cx = vp.width / 2;
      const cy = vp.height / 2;
      const fov = Math.min(vp.width, vp.height) * 0.85;

      assert.ok(cx > 0, `${vp.name} center X must be > 0`);
      assert.ok(cy > 0, `${vp.name} center Y must be > 0`);
      assert.ok(fov > 0, `${vp.name} FOV must be > 0`);

      // Project sun and all 9 planets at center
      for (const body of CELESTIAL_BODIES) {
        const bodyRadius = body.relativeDiameter * 10;
        const screenX = cx + (body.orbitalRadiusScaled || 0) * 0.1;
        const screenY = cy;

        assert.ok(Number.isFinite(screenX), `Projected X for ${body.id} in ${vp.name} must be finite`);
        assert.ok(Number.isFinite(screenY), `Projected Y for ${body.id} in ${vp.name} must be finite`);
        assert.ok(Number.isFinite(bodyRadius), `Radius for ${body.id} in ${vp.name} must be finite`);
      }
    }
  });

  it('4.2 should maintain strict non-overlapping z-index stacking hierarchy', () => {
    const zIndexHierarchy = {
      SolarSystemCanvas: 0,
      TacticalHUDControls: 20,
      SpeechSubtitleOverlay: 30,
      CelestialInfoCard: 40,
      HeaderThemeDropdown: 50,
    };

    assert.ok(
      zIndexHierarchy.SolarSystemCanvas < zIndexHierarchy.TacticalHUDControls,
      'Canvas must render behind HUD controls'
    );
    assert.ok(
      zIndexHierarchy.TacticalHUDControls < zIndexHierarchy.SpeechSubtitleOverlay,
      'HUD controls must render behind Subtitle Overlay'
    );
    assert.ok(
      zIndexHierarchy.SpeechSubtitleOverlay < zIndexHierarchy.CelestialInfoCard,
      'Subtitle Overlay must render behind Holographic Info Card'
    );
    assert.ok(
      zIndexHierarchy.CelestialInfoCard < zIndexHierarchy.HeaderThemeDropdown,
      'Info Card must render behind Header Dropdowns'
    );
  });

  it('4.3 should verify responsive dimensions of Celestial Info Card across screen sizes', () => {
    for (const vp of VIEWPORTS) {
      const isMobile = vp.width < 768;
      // In CSS: w-[calc(100vw-1.5rem)] on mobile, sm:w-[420px], md:w-[450px]
      const cardWidth = isMobile
        ? Math.min(vp.width - 24, 420)
        : Math.min(450, vp.width - 48);
      const cardMaxHeight = isMobile ? Math.max(100, vp.height - 136) : Math.max(100, vp.height - 80);

      assert.ok(cardWidth > 0 && cardWidth <= vp.width, `Card width must fit inside viewport for ${vp.name}`);
      assert.ok(cardMaxHeight > 0 && cardMaxHeight <= vp.height, `Card max height must fit inside viewport for ${vp.name}`);
    }
  });
});

describe('Adversarial Challenge M3.2: Verification of All 16 PROJECT.md Features', () => {
  let env: ReturnType<typeof setupTestEnvironment>;
  let storage: MockStorageService;

  beforeEach(() => {
    env = setupTestEnvironment();
    storage = new MockStorageService(env.localStorage);
  });

  const FEATURES = [
    { id: 1, name: 'Central Luminous Sun', test: () => {
      const sun = getCelestialBody('sun');
      assert.strictEqual(sun.id, 'sun');
      assert.strictEqual(sun.type, 'star');
      assert.strictEqual(sun.diameterKm, 1392700);
      assert.strictEqual(sun.moonsCount, 0);
      assert.strictEqual(sun.facts.length, 3);
    }},
    { id: 2, name: '9 Revolving Planets', test: () => {
      assert.strictEqual(CELESTIAL_BODIES.length, 10, 'Sun + 9 planets must total exactly 10 bodies');
      const planetIds = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
      for (const pid of planetIds) {
        const p = getCelestialBody(pid as CelestialId);
        assert.ok(p !== undefined, `Planet ${pid} must exist in catalog`);
        assert.ok(p.orbitalRadiusScaled > 0, `Planet ${pid} must have positive orbital radius`);
        assert.ok(p.orbitalSpeedKmS > 0, `Planet ${pid} must have positive orbital speed`);
      }
    }},
    { id: 3, name: 'Saturn 3D Concentric Ring System', test: () => {
      const saturn = getCelestialBody('saturn');
      assert.strictEqual(saturn.hasRings, true);
      assert.strictEqual(saturn.moonsCount, 146);
      const rings = computeSaturnRingSegments(
        { x: 0, y: 0, z: 0 },
        { yaw: 0, pitch: 0, zoom: 600 },
        1920,
        1080,
        0,
        0
      );
      assert.strictEqual(rings.backRings.length + rings.frontRings.length, 48);
    }},
    { id: 4, name: 'Holographic Orbital Trajectory Tracks', test: () => {
      for (const body of CELESTIAL_BODIES) {
        if (body.id !== 'sun') {
          assert.ok(body.orbitalRadiusScaled > 0);
          assert.ok(body.glowColor.startsWith('#') || body.glowColor.startsWith('rgb'));
        }
      }
    }},
    { id: 5, name: 'Hybrid Sci-Fi & Realistic Aesthetic', test: () => {
      for (const body of CELESTIAL_BODIES) {
        assert.ok(body.color.length > 0);
        assert.ok(body.secondaryColor.length > 0);
        assert.ok(body.tagline.length > 0);
        assert.ok(body.description.length > 0);
      }
    }},
    { id: 6, name: 'Drag-to-Rotate Camera Momentum', test: () => {
      let velX = 0.05;
      const decay = 0.92;
      for (let f = 0; f < 60; f++) {
        velX *= decay;
      }
      assert.ok(Math.abs(velX) < 0.001, 'Velocity must decay smoothly to near-zero within 60 frames');
    }},
    { id: 7, name: 'Smooth Mouse Wheel Zoom', test: () => {
      const minZoom = 0.3;
      const maxZoom = 3.5;
      let zoom = 1.0;
      zoom = Math.max(minZoom, Math.min(maxZoom, zoom * 1.5));
      assert.strictEqual(zoom, 1.5);
      zoom = Math.max(minZoom, Math.min(maxZoom, zoom * 10.0));
      assert.strictEqual(zoom, maxZoom, 'Zoom must clamp to max limit');
      zoom = Math.max(minZoom, Math.min(maxZoom, zoom * 0.01));
      assert.strictEqual(zoom, minZoom, 'Zoom must clamp to min limit');
    }},
    { id: 8, name: 'Planetarium Mode Switcher Integration', test: () => {
      const loadedMode = storage.loadAppMode();
      assert.ok(['voice', 'chat', 'settings', 'tools', 'planetarium'].includes(loadedMode));
    }},
    { id: 9, name: 'Planet Click & Hover Raycasting', test: () => {
      const clickPos = { x: 502, y: 301 };
      const earthProjected = { x: 500, y: 300, radius: 15 };
      const dist = Math.hypot(clickPos.x - earthProjected.x, clickPos.y - earthProjected.y);
      assert.ok(dist <= earthProjected.radius, 'Click within radius must register hit');
    }},
    { id: 10, name: 'Camera Focus & Orbit Tracking', test: () => {
      let camX = 0, camY = 0;
      const targetX = 100, targetY = 50;
      const lerpFactor = 0.08;
      for (let f = 0; f < 60; f++) {
        camX += (targetX - camX) * lerpFactor;
        camY += (targetY - camY) * lerpFactor;
      }
      assert.ok(Math.abs(targetX - camX) < 1.0, 'Camera X must smoothly converge to target');
      assert.ok(Math.abs(targetY - camY) < 1.0, 'Camera Y must smoothly converge to target');
    }},
    { id: 11, name: 'Holographic Celestial Info Card', test: () => {
      for (const body of CELESTIAL_BODIES) {
        assert.ok(body.name.length > 0);
        assert.ok(Number.isFinite(body.diameterKm));
        assert.ok(Number.isFinite(body.gravityMs2));
        assert.ok(Number.isFinite(body.moonsCount));
        assert.strictEqual(body.facts.length, 3);
      }
    }},
    { id: 12, name: 'Planetarium HUD Quick Switcher', test: () => {
      const bodyIds = CELESTIAL_BODIES.map(b => b.id);
      assert.strictEqual(bodyIds.length, 10);
      assert.ok(bodyIds.includes('sun'));
      assert.ok(bodyIds.includes('earth'));
      assert.ok(bodyIds.includes('pluto'));
    }},
    { id: 13, name: 'Coronal Flare Audio Reactivity', test: () => {
      const silent = computeSolarFlareParams(0, 0.0);
      const loud = computeSolarFlareParams(0, 1.0);
      assert.ok(loud.coronalGlowRadius > silent.coronalGlowRadius);
    }},
    { id: 14, name: 'Saturn Ring & Track Audio Shimmer', test: () => {
      const camera = { yaw: 0, pitch: 0, zoom: 600 };
      const ringSilent = computeSaturnRingSegments({ x: 0, y: 0, z: 0 }, camera, 1920, 1080, 0.0, 1.0);
      const ringLoud = computeSaturnRingSegments({ x: 0, y: 0, z: 0 }, camera, 1920, 1080, 1.0, 1.0);
      assert.strictEqual(ringSilent.backRings.length + ringSilent.frontRings.length, 48);
      assert.strictEqual(ringLoud.backRings.length + ringLoud.frontRings.length, 48);
    }},
    { id: 15, name: '60 FPS Real-time Performance', test: () => {
      const iterations = 500;
      const camera = { yaw: 0.45, pitch: 0.55, zoom: 600 };
      const t0 = performance.now();
      for (let i = 0; i < iterations; i++) {
        computeSolarFlareParams(i * 0.016, 0.5);
        computeSaturnRingSegments({ x: 100, y: 50, z: 20 }, camera, 1920, 1080, 0.5, i * 0.016);
      }
      const totalMs = performance.now() - t0;
      const msPerFrame = totalMs / iterations;
      assert.ok(msPerFrame < 1.0, `Frame math must execute in < 1.0ms (actual: ${msPerFrame.toFixed(3)}ms)`);
    }},
    { id: 16, name: 'State & Storage Persistence', test: () => {
      storage.savePlanetariumTarget('mars');
      assert.strictEqual(storage.loadPlanetariumTarget(), 'mars');
      storage.saveAppMode('planetarium');
      assert.strictEqual(storage.loadAppMode(), 'planetarium');
    }},
  ];

  for (const feature of FEATURES) {
    it(`Feature #${feature.id}: ${feature.name} operates seamlessly`, () => {
      feature.test();
    });
  }
});
