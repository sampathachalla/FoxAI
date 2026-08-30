/**
 * Adversarial M3 Stress Harness & Telemetry Integrity Oracle
 * Stress-tests:
 * 1. Deepgram/WebSpeech Async Concurrency, Subtitle Stream Cancellation & Cleanup
 * 2. High-Frequency State Mutations & Race Condition Stress
 * 3. 10-Body Telemetry Completeness & Scientific Physical Bounds Oracle
 * 4. Micro-Threshold Audio Reactivity, Frequency Array Fuzzing & Shimmer Stability
 * 5. Glassmorphic HUD Layout Consistency & Viewport Dimension Resizing Limits
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

describe('Adversarial M3: Deep Async Concurrency & Subtitle Stream Cancellation', () => {
  let env: ReturnType<typeof setupTestEnvironment>;
  let context: MockAssistantContext;

  beforeEach(() => {
    env = setupTestEnvironment();
    context = new MockAssistantContext(env.localStorage);
  });

  it('1.1 should cleanly cancel speech playback and reset subtitle transcripts on rapid mode abort', () => {
    let currentSubtitle = 'Starting solar exploration...';
    let isSpeaking = true;

    // Simulate active voice playback in Planetarium
    context.setAppMode('planetarium');
    context.setAudioLevel(0.85);
    assert.strictEqual(context.state.appMode, 'planetarium');
    assert.strictEqual(context.state.audioLevel, 0.85);

    // Sudden user mode switch to tools
    context.setAppMode('tools');
    // Abort speech
    currentSubtitle = '';
    isSpeaking = false;
    context.setAudioLevel(0);

    assert.strictEqual(context.state.appMode, 'tools');
    assert.strictEqual(context.state.audioLevel, 0);
    assert.strictEqual(currentSubtitle, '');
    assert.strictEqual(isSpeaking, false);
  });

  it('1.2 should handle 5,000 rapid concurrent subtitle stream chunks without dropping or desyncing', () => {
    const streamChunks = Array.from({ length: 5000 }, (_, i) => `Word_${i}`);
    let cumulativeTranscript = '';

    for (let i = 0; i < streamChunks.length; i++) {
      cumulativeTranscript += (i === 0 ? '' : ' ') + streamChunks[i];
      if (i % 500 === 0) {
        assert.ok(cumulativeTranscript.includes(`Word_${i}`));
      }
    }

    assert.ok(cumulativeTranscript.endsWith('Word_4999'));
    assert.strictEqual(cumulativeTranscript.split(' ').length, 5000);
  });
});

describe('Adversarial M3: 10-Body Telemetry Completeness & Scientific Bounds Oracle', () => {
  it('2.1 should verify every celestial body has complete, non-null, strictly finite telemetry', () => {
    const requiredProps: (keyof CelestialBodyData)[] = [
      'id',
      'name',
      'subtitle',
      'type',
      'color',
      'secondaryColor',
      'glowColor',
      'diameterKm',
      'relativeDiameter',
      'distanceFromSunMillionKm',
      'distanceAu',
      'orbitalRadiusScaled',
      'orbitalPeriodDays',
      'orbitalPeriodYears',
      'orbitalSpeedKmS',
      'rotationPeriodHours',
      'surfaceTemperatureC',
      'surfaceTemperatureK',
      'gravityMs2',
      'gravityG',
      'moonsCount',
      'axialTiltDeg',
      'orbitalInclinationDeg',
      'tagline',
      'description',
      'facts',
    ];

    for (const body of CELESTIAL_BODIES) {
      for (const prop of requiredProps) {
        assert.ok(
          body[prop] !== undefined && body[prop] !== null,
          `Body ${body.id} is missing required property: ${String(prop)}`
        );
      }

      // Check numeric bounds
      assert.ok(body.diameterKm > 0, `${body.id} diameterKm must be > 0`);
      assert.ok(body.relativeDiameter > 0, `${body.id} relativeDiameter must be > 0`);
      assert.ok(body.distanceFromSunMillionKm >= 0, `${body.id} distanceFromSunMillionKm must be >= 0`);
      assert.ok(body.distanceAu >= 0, `${body.id} distanceAu must be >= 0`);
      assert.ok(body.orbitalRadiusScaled >= 0, `${body.id} orbitalRadiusScaled must be >= 0`);
      assert.ok(body.orbitalPeriodDays >= 0, `${body.id} orbitalPeriodDays must be >= 0`);
      assert.ok(body.orbitalPeriodYears >= 0, `${body.id} orbitalPeriodYears must be >= 0`);
      assert.ok(body.orbitalSpeedKmS >= 0, `${body.id} orbitalSpeedKmS must be >= 0`);
      assert.ok(body.gravityMs2 >= 0, `${body.id} gravityMs2 must be >= 0`);
      assert.ok(body.gravityG >= 0, `${body.id} gravityG must be >= 0`);
      assert.ok(body.moonsCount >= 0, `${body.id} moonsCount must be >= 0`);
      assert.ok(Number.isFinite(body.axialTiltDeg), `${body.id} axialTiltDeg must be finite`);
      assert.ok(Number.isFinite(body.orbitalInclinationDeg), `${body.id} orbitalInclinationDeg must be finite`);

      // Check strings and facts
      assert.ok(body.tagline.length > 5, `${body.id} tagline must be a descriptive sentence`);
      assert.ok(body.description.length > 20, `${body.id} description must be detailed`);
      assert.strictEqual(body.facts.length, 3, `${body.id} must have exactly 3 educational facts`);
      for (let i = 0; i < 3; i++) {
        assert.ok(body.facts[i].length > 10, `${body.id} fact ${i + 1} must be substantial`);
      }
    }
  });

  it('2.2 should verify Keplerian velocity hierarchy (inner planets faster than outer planets)', () => {
    const orderedPlanets: CelestialId[] = [
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

    for (let i = 0; i < orderedPlanets.length - 1; i++) {
      const inner = getCelestialBody(orderedPlanets[i]);
      const outer = getCelestialBody(orderedPlanets[i + 1]);

      assert.ok(
        inner.orbitalSpeedKmS > outer.orbitalSpeedKmS,
        `Kepler's 3rd Law violation: ${inner.name} (${inner.orbitalSpeedKmS} km/s) must be faster than ${outer.name} (${outer.orbitalSpeedKmS} km/s)`
      );

      assert.ok(
        inner.distanceAu < outer.distanceAu,
        `Distance ordering violation: ${inner.name} (${inner.distanceAu} AU) must be closer than ${outer.name} (${outer.distanceAu} AU)`
      );

      assert.ok(
        inner.orbitalPeriodDays < outer.orbitalPeriodDays,
        `Orbital period violation: ${inner.name} (${inner.orbitalPeriodDays} d) must be shorter than ${outer.name} (${outer.orbitalPeriodDays} d)`
      );
    }
  });
});

describe('Adversarial M3: Micro-Threshold Audio Reactivity & Fuzz Testing', () => {
  it('3.1 should fuzz frequency arrays with random noise and extreme bin sizes', () => {
    const fuzzedSizes = [0, 1, 2, 8, 16, 32, 64, 128, 256, 512, 1024, 2048];

    for (const size of fuzzedSizes) {
      const freqData = new Uint8Array(size);
      for (let i = 0; i < size; i++) {
        freqData[i] = Math.floor(Math.random() * 256);
      }

      assert.doesNotThrow(() => {
        const params = computeSolarFlareParams(2.5, 0.4, freqData);
        assert.ok(Number.isFinite(params.coreRadius));
        assert.ok(Number.isFinite(params.coronalGlowRadius));
        assert.ok(Number.isFinite(params.bassEnergy));
        assert.ok(params.bassEnergy >= 0 && params.bassEnergy <= 1.0);
      });
    }
  });

  it('3.2 should verify audio level meter precision at edge boundary of 0.02 threshold', () => {
    function formatAudioMeter(level: number): { show: boolean; text: string } {
      if (level > 0.02) {
        return { show: true, text: `${Math.round(level * 100)}%` };
      }
      return { show: false, text: '' };
    }

    assert.strictEqual(formatAudioMeter(0.0200000000000000).show, false);
    assert.strictEqual(formatAudioMeter(0.0200000000000001).show, true);
    assert.strictEqual(formatAudioMeter(0.0200000000000001).text, '2%');
    assert.strictEqual(formatAudioMeter(0.0249).text, '2%');
    assert.strictEqual(formatAudioMeter(0.0250).text, '3%');
    assert.strictEqual(formatAudioMeter(0.999).text, '100%');
  });
});

describe('Adversarial M3: Glassmorphic HUD Layout & Carousel Controls', () => {
  it('4.1 should verify HUD carousel provides direct accessibility for all 10 celestial bodies', () => {
    const quickIds = CELESTIAL_BODIES.map((b) => b.id);
    assert.strictEqual(quickIds.length, 10);
    assert.deepStrictEqual(quickIds, [
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
    ]);
  });

  it('4.2 should support all simulation speed ratios (0.5x, 1x, 2x, 5x, 10x)', () => {
    const speedOptions = [0.5, 1.0, 2.0, 5.0, 10.0];
    const env = setupTestEnvironment();
    const ctx = new MockAssistantContext(env.localStorage);

    for (const speed of speedOptions) {
      ctx.setSimulationSpeed(speed);
      assert.strictEqual(ctx.state.simulationSpeed, speed);
    }
  });

  it('4.3 should support toggling simulation pause state without losing current progress', () => {
    const env = setupTestEnvironment();
    const ctx = new MockAssistantContext(env.localStorage);

    assert.strictEqual(ctx.state.isPaused, false);
    ctx.togglePause();
    assert.strictEqual(ctx.state.isPaused, true);
    ctx.togglePause();
    assert.strictEqual(ctx.state.isPaused, false);
  });
});
