/**
 * Milestone 2 Reviewer Adversarial & Edge Case Verification Suite
 * Stress tests SolarShaders.ts, PlanetaryData.ts, math stability, touch handling,
 * audio reactivity edge cases, and canvas rendering boundaries.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  CELESTIAL_BODIES,
  CELESTIAL_BODY_MAP,
  PLANET_VISUAL_RADII,
  RELATIVE_ORBITAL_SPEEDS,
  getCelestialBody,
} from '../app/components/Planetarium/PlanetaryData.ts';

import {
  hexToRgb,
  rgba,
  lerpColor,
  proceduralTurbulence,
  createStarfield,
  renderStarfield,
  computeSolarFlareParams,
  renderSun,
  renderPlanet,
  computeSaturnRingSegments,
  renderSaturnRingPass,
  renderOrbitalTrack,
  renderCelestialSelectionReticle,
  renderPlanetLabel,
  type ProjectedBodyItem,
  type Point3D,
} from '../app/components/Planetarium/SolarShaders.ts';

// Mock Canvas 2D Rendering Context
function createMockCanvasContext(): CanvasRenderingContext2D {
  const noop = () => {};
  const mockGradient = {
    addColorStop: noop,
  };

  return {
    save: noop,
    restore: noop,
    beginPath: noop,
    closePath: noop,
    moveTo: noop,
    lineTo: noop,
    arc: noop,
    ellipse: noop,
    rect: noop,
    quadraticCurveTo: noop,
    bezierCurveTo: noop,
    fill: noop,
    stroke: noop,
    clip: noop,
    fillRect: noop,
    clearRect: noop,
    strokeRect: noop,
    translate: noop,
    rotate: noop,
    scale: noop,
    setLineDash: noop,
    fillText: noop,
    strokeText: noop,
    measureText: (text: string) => ({ width: text.length * 7 } as TextMetrics),
    createLinearGradient: () => mockGradient as unknown as CanvasGradient,
    createRadialGradient: () => mockGradient as unknown as CanvasGradient,
    globalCompositeOperation: 'source-over',
    fillStyle: '#FFFFFF',
    strokeStyle: '#FFFFFF',
    lineWidth: 1,
    font: '10px sans-serif',
  } as unknown as CanvasRenderingContext2D;
}

describe('M2 Reviewer Adversarial & Robustness Test Suite', () => {
  // ---------------------------------------------------------------------------
  // 1. Color and Math Utilities Stress Tests
  // ---------------------------------------------------------------------------
  describe('1. Color & Math Utilities', () => {
    it('1.1 hexToRgb should handle valid 6-char, 3-char, missing hash, and invalid hex safely', () => {
      assert.deepEqual(hexToRgb('#FF0000'), { r: 255, g: 0, b: 0 });
      assert.deepEqual(hexToRgb('00FF00'), { r: 0, g: 255, b: 0 });
      assert.deepEqual(hexToRgb('#00F'), { r: 0, g: 0, b: 255 });
      assert.deepEqual(hexToRgb('FFF'), { r: 255, g: 255, b: 255 });
      assert.deepEqual(hexToRgb(''), { r: 255, g: 255, b: 255 });
      assert.deepEqual(hexToRgb('invalid-hex'), { r: 255, g: 255, b: 255 });
      assert.deepEqual(hexToRgb(null as unknown as string), { r: 255, g: 255, b: 255 });
    });

    it('1.2 rgba should clamp alpha to [0, 1] range and format safely', () => {
      assert.equal(rgba('#FF0000', 0.5), 'rgba(255, 0, 0, 0.500)');
      assert.equal(rgba('#00FF00', -0.5), 'rgba(0, 255, 0, 0.000)');
      assert.equal(rgba('#0000FF', 1.5), 'rgba(0, 0, 255, 1.000)');
      assert.equal(rgba('#FFFFFF', 0), 'rgba(255, 255, 255, 0.000)');
      assert.equal(rgba('#FFFFFF', 1), 'rgba(255, 255, 255, 1.000)');
    });

    it('1.3 lerpColor should interpolate colors smoothly across factor [0, 1] with boundary clamping', () => {
      assert.equal(lerpColor('#000000', '#FFFFFF', 0), 'rgb(0, 0, 0)');
      assert.equal(lerpColor('#000000', '#FFFFFF', 1), 'rgb(255, 255, 255)');
      assert.equal(lerpColor('#000000', '#FFFFFF', 0.5), 'rgb(128, 128, 128)');
      assert.equal(lerpColor('#000000', '#FFFFFF', -2), 'rgb(0, 0, 0)');
      assert.equal(lerpColor('#000000', '#FFFFFF', 5), 'rgb(255, 255, 255)');
    });

    it('1.4 proceduralTurbulence should produce bounded [0, 1] numbers with zero NaNs for extreme inputs', () => {
      const testCases = [
        { x: 0, y: 0, t: 0 },
        { x: 100000, y: -100000, t: 9999 },
        { x: -50.5, y: 23.4, t: -100 },
        { x: 1e6, y: 1e6, t: 1e6 },
      ];
      for (const tc of testCases) {
        const val = proceduralTurbulence(tc.x, tc.y, tc.t, 3);
        assert.ok(!isNaN(val), `Turbulence was NaN for (${tc.x}, ${tc.y}, ${tc.t})`);
        assert.ok(val >= 0 && val <= 1, `Turbulence (${val}) out of [0, 1] bounds`);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Audio Reactivity & Flare Parameter Stress Tests
  // ---------------------------------------------------------------------------
  describe('2. Audio Reactivity Extremes', () => {
    it('2.1 computeSolarFlareParams should handle zero, full, negative, NaN, and extreme audio levels', () => {
      const inputs = [0, 0.5, 1.0, -1.0, 50.0, NaN, undefined, null];
      for (const audio of inputs) {
        const p = computeSolarFlareParams(10.0, audio as number);
        assert.ok(Number.isFinite(p.coreRadius), `coreRadius not finite for audio=${audio}`);
        assert.ok(Number.isFinite(p.coronalGlowRadius), `coronalGlowRadius not finite for audio=${audio}`);
        assert.ok(Number.isFinite(p.prominenceCount), `prominenceCount not finite for audio=${audio}`);
        assert.ok(Number.isFinite(p.prominenceScale), `prominenceScale not finite for audio=${audio}`);
        assert.ok(Number.isFinite(p.flareIntensity), `flareIntensity not finite for audio=${audio}`);
        assert.ok(Number.isFinite(p.bassEnergy), `bassEnergy not finite for audio=${audio}`);

        assert.ok(p.coreRadius > 0, `coreRadius must be positive`);
        assert.ok(p.coronalGlowRadius > p.coreRadius, `coronal glow must extend beyond core`);
        assert.ok(p.prominenceCount >= 14, `prominence count must have base minimum of 14`);
      }
    });

    it('2.2 computeSolarFlareParams should correctly extract bass energy from frequencyData', () => {
      const freqQuiet = new Uint8Array(128).fill(0);
      const freqLoud = new Uint8Array(128).fill(255);
      const freqEmpty = new Uint8Array(0);

      const pQuiet = computeSolarFlareParams(0, 0, freqQuiet);
      const pLoud = computeSolarFlareParams(0, 1.0, freqLoud);
      const pEmpty = computeSolarFlareParams(0, 0.5, freqEmpty);

      assert.equal(pQuiet.bassEnergy, 0);
      assert.equal(pLoud.bassEnergy, 1.0);
      assert.equal(pEmpty.bassEnergy, 0.5);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. 3D Saturn Ring Geometry & Occlusion Tests
  // ---------------------------------------------------------------------------
  describe('3. 3D Saturn Ring Geometry & Occlusion', () => {
    it('3.1 computeSaturnRingSegments should return exactly 48 slices partitioned into front and back segments', () => {
      const saturnPos: Point3D = { x: 278, y: 0, z: 0 };
      const camera = { yaw: 0.45, pitch: 0.55, zoom: 560 };

      const { backRings, frontRings } = computeSaturnRingSegments(
        saturnPos,
        camera,
        1200,
        800,
        0.5,
        10
      );

      assert.equal(backRings.length + frontRings.length, 48);
      assert.ok(frontRings.length > 0, 'Must have front ring segments');
      assert.ok(backRings.length > 0, 'Must have back ring segments');

      frontRings.forEach((seg) => {
        assert.ok(Number.isFinite(seg.screenX));
        assert.ok(Number.isFinite(seg.screenY));
        assert.ok(Number.isFinite(seg.screenZ));
        assert.equal(seg.isFront, true);
      });

      backRings.forEach((seg) => {
        assert.ok(Number.isFinite(seg.screenX));
        assert.ok(Number.isFinite(seg.screenY));
        assert.ok(Number.isFinite(seg.screenZ));
        assert.equal(seg.isFront, false);
      });
    });

    it('3.2 renderSaturnRingPass should render both front and back passes without throwing', () => {
      const ctx = createMockCanvasContext();
      const saturnItem: ProjectedBodyItem = {
        id: 'saturn',
        name: 'Saturn',
        worldPos: { x: 278, y: 0, z: 0 },
        screenX: 600,
        screenY: 400,
        screenZ: 100,
        scale: 0.8,
        screenRadius: 18 * 0.8,
        color: '#E0C080',
        glowColor: 'rgba(235, 212, 157, 0.55)',
        glowRadius: 30,
        data: CELESTIAL_BODY_MAP.saturn,
        isHovered: false,
        isSelected: false,
      };
      const camera = { yaw: 0.45, pitch: 0.55, zoom: 560 };

      assert.doesNotThrow(() => {
        renderSaturnRingPass(ctx, saturnItem, camera, false, 0.5, 1.0);
        renderSaturnRingPass(ctx, saturnItem, camera, true, 0.5, 1.0);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Procedural Planetary Shaders Execution
  // ---------------------------------------------------------------------------
  describe('4. Procedural Planetary Shaders', () => {
    it('4.1 should render procedural shaders for all 10 celestial bodies with zero exceptions', () => {
      const ctx = createMockCanvasContext();
      const sunScreenPos = { x: 600, y: 400 };

      CELESTIAL_BODIES.forEach((body) => {
        const item: ProjectedBodyItem = {
          id: body.id,
          name: body.name,
          worldPos: { x: body.orbitalRadiusScaled, y: 0, z: 0 },
          screenX: 600 + body.orbitalRadiusScaled * 0.5,
          screenY: 400,
          screenZ: 50,
          scale: 1.0,
          screenRadius: PLANET_VISUAL_RADII[body.id] || 8,
          color: body.color,
          glowColor: body.glowColor,
          glowRadius: 20,
          data: body,
          isHovered: true,
          isSelected: true,
        };

        assert.doesNotThrow(() => {
          if (body.id === 'sun') {
            const flareParams = computeSolarFlareParams(0, 0.5);
            renderSun(ctx, item, flareParams, 1.0);
          } else {
            renderPlanet(ctx, item, sunScreenPos, 1.0);
          }
        }, `Shader execution failed for ${body.name}`);
      });
    });

    it('4.2 renderOrbitalTrack should render Keplerian tracks with velocity photon markers for all 9 planets', () => {
      const ctx = createMockCanvasContext();
      const camera = { yaw: 0.45, pitch: 0.55, zoom: 560 };

      CELESTIAL_BODIES.forEach((body) => {
        if (body.id === 'sun') return;
        assert.doesNotThrow(() => {
          renderOrbitalTrack(ctx, body, camera, 1200, 800, false, false, 0.3, 10);
          renderOrbitalTrack(ctx, body, camera, 1200, 800, true, true, 0.8, 10);
        }, `Orbital track failed for ${body.name}`);
      });
    });

    it('4.3 renderPlanetLabel and renderCelestialSelectionReticle should execute cleanly', () => {
      const ctx = createMockCanvasContext();
      const earthItem: ProjectedBodyItem = {
        id: 'earth',
        name: 'Earth',
        worldPos: { x: 120, y: 0, z: 0 },
        screenX: 500,
        screenY: 300,
        screenZ: 20,
        scale: 1.0,
        screenRadius: 8,
        color: '#3498DB',
        glowColor: 'rgba(52, 152, 219, 0.60)',
        glowRadius: 18,
        data: CELESTIAL_BODY_MAP.earth,
        isHovered: true,
        isSelected: true,
      };

      assert.doesNotThrow(() => {
        renderPlanetLabel(ctx, earthItem, true);
        renderPlanetLabel(ctx, earthItem, false);
        renderCelestialSelectionReticle(ctx, 500, 300, 8, '#3498DB', 1.0, true);
        renderCelestialSelectionReticle(ctx, 500, 300, 8, '#3498DB', 1.0, false);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Starfield Generation & Parallax
  // ---------------------------------------------------------------------------
  describe('5. Starfield Generation & Parallax', () => {
    it('5.1 createStarfield should generate 320 particles distributed on 3D spherical shell', () => {
      const stars = createStarfield(320);
      assert.equal(stars.length, 320);

      stars.forEach((s) => {
        assert.ok(Number.isFinite(s.x) && Number.isFinite(s.y) && Number.isFinite(s.z));
        const dist = Math.hypot(s.x, s.y, s.z);
        assert.ok(dist >= 1200 && dist <= 2400, `Star radius (${dist}) out of [1200, 2400]`);
        assert.ok(s.size > 0);
        assert.ok(s.baseAlpha >= 0.35 && s.baseAlpha <= 0.90);
      });
    });

    it('5.2 renderStarfield should execute under extreme camera yaw, pitch, and zoom', () => {
      const ctx = createMockCanvasContext();
      const stars = createStarfield(100);
      const cameras = [
        { yaw: 0, pitch: 0, zoom: 560 },
        { yaw: Math.PI * 4, pitch: (85 * Math.PI) / 180, zoom: 1600 },
        { yaw: -Math.PI * 4, pitch: -(85 * Math.PI) / 180, zoom: 120 },
      ];

      for (const cam of cameras) {
        assert.doesNotThrow(() => {
          renderStarfield(ctx, stars, cam, 1920, 1080, 5.0);
        });
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Scientific Database Accuracy & Consistency
  // ---------------------------------------------------------------------------
  describe('6. Scientific Database Integrity', () => {
    it('6.1 all 10 celestial bodies must be present in CELESTIAL_BODIES and CELESTIAL_BODY_MAP', () => {
      const expectedIds = [
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
      assert.equal(CELESTIAL_BODIES.length, 10);
      expectedIds.forEach((id) => {
        assert.ok(CELESTIAL_BODY_MAP[id], `Missing ID ${id} in CELESTIAL_BODY_MAP`);
        const body = getCelestialBody(id as any);
        assert.equal(body.id, id);
        assert.ok(body.facts.length === 3, `${id} must have exactly 3 facts`);
        assert.ok(body.tagline.length > 0, `${id} must have tagline`);
        assert.ok(body.description.length > 0, `${id} must have description`);
      });
    });

    it('6.2 getCelestialBody should safely fall back to sun for unknown IDs', () => {
      const fallback = getCelestialBody('unknown_planet' as any);
      assert.equal(fallback.id, 'sun');
    });

    it('6.3 orbital speeds must obey Keplerian relationship (Mercury fastest, Pluto slowest)', () => {
      const mercury = CELESTIAL_BODY_MAP.mercury;
      const earth = CELESTIAL_BODY_MAP.earth;
      const jupiter = CELESTIAL_BODY_MAP.jupiter;
      const pluto = CELESTIAL_BODY_MAP.pluto;

      assert.ok(mercury.orbitalSpeedKmS > earth.orbitalSpeedKmS);
      assert.ok(earth.orbitalSpeedKmS > jupiter.orbitalSpeedKmS);
      assert.ok(jupiter.orbitalSpeedKmS > pluto.orbitalSpeedKmS);
    });
  });
});
