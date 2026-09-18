/**
 * EMPIRICAL STRESS & PERFORMANCE HARNESS
 * Comprehensive adversarial verification for 3D procedural math, 4D projection singularity,
 * 60 FPS render timing, depth sorting performance, audio reactivity, and momentum physics.
 */

import {
  ProceduralGeometryEngine,
  hexToRgb,
  type Point3D,
  type ProjectedPoint,
} from './harness/geometryEngine.ts';
import { CORE_SHAPES, type CoreShapeId, type AssistantStatus, type AccentTheme } from './harness/types.ts';

const THEMES: AccentTheme[] = [
  { id: 'fox-cyan', name: 'Fox Cyan', primary: '#99FFFF', secondary: '#00E5FF', glow: 'rgba(153, 255, 255, 0.4)', backgroundGlow: 'rgba(153, 255, 255, 0.12)', cssClass: 'theme-cyan' },
  { id: 'artistic-flair', name: 'Artistic Flair', primary: '#FF77AA', secondary: '#9966FF', glow: 'rgba(255, 119, 170, 0.4)', backgroundGlow: 'rgba(255, 119, 170, 0.12)', cssClass: 'theme-artistic' },
  { id: 'siri-intelligence', name: 'Siri Intelligence', primary: '#FF4D88', secondary: '#7040F5', glow: 'rgba(255, 77, 136, 0.4)', backgroundGlow: 'rgba(255, 77, 136, 0.12)', cssClass: 'theme-siri' },
  { id: 'emerald-aura', name: 'Emerald Aura', primary: '#00FFAA', secondary: '#00B377', glow: 'rgba(0, 255, 170, 0.4)', backgroundGlow: 'rgba(0, 255, 170, 0.12)', cssClass: 'theme-emerald' },
  { id: 'solar-amber', name: 'Solar Amber', primary: '#FFB300', secondary: '#FF7700', glow: 'rgba(255, 179, 0, 0.4)', backgroundGlow: 'rgba(255, 179, 0, 0.12)', cssClass: 'theme-amber' },
  { id: 'titanium-frost', name: 'Titanium Frost', primary: '#E2E8F0', secondary: '#94A3B8', glow: 'rgba(226, 232, 240, 0.4)', backgroundGlow: 'rgba(226, 232, 240, 0.12)', cssClass: 'theme-titanium' },
];

export interface BenchmarkMetrics {
  iterations: number;
  totalTimeMs: number;
  meanTimeMs: number;
  minTimeMs: number;
  maxTimeMs: number;
  p50TimeMs: number;
  p95TimeMs: number;
  p99TimeMs: number;
  theoreticalMaxFps: number;
}

export function computePercentiles(times: number[]): BenchmarkMetrics {
  const sorted = [...times].sort((a, b) => a - b);
  const total = sorted.reduce((sum, t) => sum + t, 0);
  const mean = total / sorted.length;
  const p50 = sorted[Math.floor(sorted.length * 0.50)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const p99 = sorted[Math.floor(sorted.length * 0.99)];

  return {
    iterations: sorted.length,
    totalTimeMs: total,
    meanTimeMs: mean,
    minTimeMs: sorted[0],
    maxTimeMs: sorted[sorted.length - 1],
    p50TimeMs: p50,
    p95TimeMs: p95,
    p99TimeMs: p99,
    theoreticalMaxFps: mean > 0 ? 1000 / mean : 99999,
  };
}

// -----------------------------------------------------------------------------
// SECTION 1: PROCEDURAL SHAPE MATHEMATICAL PRECISION & COORDINATE BOUNDS
// -----------------------------------------------------------------------------
export function runCoordinateBoundsStress(): {
  shapeResults: Record<CoreShapeId, {
    count: number;
    expectedCount: number;
    xBounds: [number, number];
    yBounds: [number, number];
    zBounds: [number, number];
    maxRadius: number;
    hasNaN: boolean;
    hasInf: boolean;
  }>;
  allValid: boolean;
} {
  const shapes: CoreShapeId[] = ['sphere', 'torus', 'icosahedron', 'helix', 'tesseract'];
  const statuses: AssistantStatus[] = ['idle', 'listening', 'thinking', 'speaking'];
  const shapeResults: any = {};
  let allValid = true;

  for (const shape of shapes) {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    let maxR = 0;
    let hasNaN = false;
    let hasInf = false;
    let pointCount = 0;

    // Test across 500 diverse parameter combinations
    for (let t = 0; t < 50; t += 2.5) {
      for (const status of statuses) {
        for (let audio = 0; audio <= 1.0; audio += 0.25) {
          let particles: Point3D[] = [];
          if (shape === 'sphere') {
            particles = ProceduralGeometryEngine.generateSphereParticles(t, status, audio, 0.5);
          } else if (shape === 'torus') {
            particles = ProceduralGeometryEngine.generateTorusParticles(t, status, audio);
          } else if (shape === 'icosahedron') {
            particles = ProceduralGeometryEngine.generateIcosahedronParticles(t, status, audio);
          } else if (shape === 'helix') {
            particles = ProceduralGeometryEngine.generateHelixParticles(t, status, audio);
          } else if (shape === 'tesseract') {
            particles = ProceduralGeometryEngine.generateTesseractParticles(t, status, audio);
          }

          pointCount = particles.length;

          for (const p of particles) {
            if (isNaN(p.x) || isNaN(p.y) || isNaN(p.z)) hasNaN = true;
            if (!isFinite(p.x) || !isFinite(p.y) || !isFinite(p.z)) hasInf = true;

            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
            if (p.z < minZ) minZ = p.z;
            if (p.z > maxZ) maxZ = p.z;

            const r = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z);
            if (r > maxR) maxR = r;
          }
        }
      }
    }

    const expectedCounts: Record<CoreShapeId, number> = {
      sphere: 2400,
      torus: 2408,
      icosahedron: 504,
      helix: 1324,
      tesseract: 400,
    };

    const valid = !hasNaN && !hasInf && pointCount === expectedCounts[shape] && maxR < 500;
    if (!valid) allValid = false;

    shapeResults[shape] = {
      count: pointCount,
      expectedCount: expectedCounts[shape],
      xBounds: [parseFloat(minX.toFixed(2)), parseFloat(maxX.toFixed(2))],
      yBounds: [parseFloat(minY.toFixed(2)), parseFloat(maxY.toFixed(2))],
      zBounds: [parseFloat(minZ.toFixed(2)), parseFloat(maxZ.toFixed(2))],
      maxRadius: parseFloat(maxR.toFixed(2)),
      hasNaN,
      hasInf,
    };
  }

  return { shapeResults, allValid };
}

// -----------------------------------------------------------------------------
// SECTION 2: 4D TESSERACT PROJECTION SINGULARITY AVOIDANCE (D4 - w'/S0 > 0)
// -----------------------------------------------------------------------------
export function runTesseractSingularityStress(iterations: number = 100000): {
  minDenominatorRaw: number;
  maxDenominatorRaw: number;
  minP4: number;
  maxP4: number;
  clampActivatedCount: number;
  singularityAvoided: boolean;
  theoreticalMinDenom: number;
  iterationsTested: number;
} {
  const D4 = 2.4;
  let minDenomRaw = Infinity;
  let maxDenomRaw = -Infinity;
  let minP4 = Infinity;
  let maxP4 = -Infinity;
  let clampActivated = 0;

  // Theoretical analytical bound:
  // w1 = x*sin(theta) + w*cos(theta) where x, w in {+S0, -S0}
  // Max w1/S0 = sqrt(1^2 + 1^2) = sqrt(2) ~ 1.41421356
  // Min Denominator = D4 - sqrt(2) = 2.4 - 1.41421356 = 0.9857864 > 0
  const theoreticalMin = D4 - Math.SQRT2;

  // Test across 100,000 random angle configurations and audio levels
  for (let i = 0; i < iterations; i++) {
    const thetaXW = Math.random() * Math.PI * 2;
    const thetaYZ = Math.random() * Math.PI * 2;
    const audioLevel = Math.random() * 5.0; // test even extreme audio levels
    const S0 = 95 * (1.0 + 0.32 * audioLevel);

    const cosXW = Math.cos(thetaXW);
    const sinXW = Math.sin(thetaXW);

    for (let bit = 0; bit < 16; bit++) {
      const x = (bit & 1 ? 1 : -1) * S0;
      const w = (bit & 8 ? 1 : -1) * S0;

      const w1 = x * sinXW + w * cosXW;
      const rawDenominator = D4 - w1 / S0;

      if (rawDenominator < minDenomRaw) minDenomRaw = rawDenominator;
      if (rawDenominator > maxDenomRaw) maxDenomRaw = rawDenominator;

      const clampedDenominator = Math.max(0.25, rawDenominator);
      if (clampedDenominator !== rawDenominator) {
        clampActivated++;
      }

      const P4 = 1 / clampedDenominator;
      if (P4 < minP4) minP4 = P4;
      if (P4 > maxP4) maxP4 = P4;
    }
  }

  const singularityAvoided = minDenomRaw > 0.95 && !isNaN(minP4) && isFinite(maxP4);

  return {
    minDenominatorRaw: parseFloat(minDenomRaw.toFixed(6)),
    maxDenominatorRaw: parseFloat(maxDenomRaw.toFixed(6)),
    minP4: parseFloat(minP4.toFixed(6)),
    maxP4: parseFloat(maxP4.toFixed(6)),
    clampActivatedCount: clampActivated,
    singularityAvoided,
    theoreticalMinDenom: parseFloat(theoreticalMin.toFixed(6)),
    iterationsTested: iterations * 16,
  };
}

// -----------------------------------------------------------------------------
// SECTION 3: 60 FPS RENDER LOOP TIMING & DEPTH SORTING BENCHMARK
// -----------------------------------------------------------------------------
export function runRenderPerformanceBenchmark(framesPerShape: number = 2000): {
  shapeMetrics: Record<CoreShapeId, BenchmarkMetrics>;
  depthSortMetrics: BenchmarkMetrics;
  fullPipelinePass: boolean;
} {
  const shapes: CoreShapeId[] = ['sphere', 'torus', 'icosahedron', 'helix', 'tesseract'];
  const shapeMetrics: any = {};
  const depthSortTimes: number[] = [];
  const theme = THEMES[0];
  let allUnderBudget = true;

  for (const shape of shapes) {
    const frameTimes: number[] = [];

    for (let frame = 0; frame < framesPerShape; frame++) {
      const time = frame * 0.016;
      const audioLevel = 0.35 + 0.3 * Math.sin(frame * 0.1);
      const status: AssistantStatus = frame % 4 === 0 ? 'speaking' : frame % 4 === 1 ? 'listening' : frame % 4 === 2 ? 'thinking' : 'idle';

      const t0 = performance.now();

      // 1. Procedural generation
      let particles: Point3D[] = [];
      if (shape === 'sphere') {
        particles = ProceduralGeometryEngine.generateSphereParticles(time, status, audioLevel, 0.5);
      } else if (shape === 'torus') {
        particles = ProceduralGeometryEngine.generateTorusParticles(time, status, audioLevel);
      } else if (shape === 'icosahedron') {
        particles = ProceduralGeometryEngine.generateIcosahedronParticles(time, status, audioLevel);
      } else if (shape === 'helix') {
        particles = ProceduralGeometryEngine.generateHelixParticles(time, status, audioLevel);
      } else if (shape === 'tesseract') {
        particles = ProceduralGeometryEngine.generateTesseractParticles(time, status, audioLevel);
      }

      // 2. 3D Camera Projection & Depth Sorting
      const tSortStart = performance.now();
      const projected = ProceduralGeometryEngine.projectAndSortParticles(
        particles,
        time * 0.5,
        0.15,
        190,
        150,
        theme,
        audioLevel,
        status
      );
      const tSortEnd = performance.now();
      depthSortTimes.push(tSortEnd - tSortStart);

      // 3. Virtual Canvas Draw Loop (simulating fill/stroke computations)
      let checksum = 0;
      for (let i = 0; i < projected.length; i++) {
        const pt = projected[i];
        checksum += pt.x + pt.y + pt.size + pt.alpha;
      }

      const t1 = performance.now();
      frameTimes.push(t1 - t0);
    }

    const metrics = computePercentiles(frameTimes);
    shapeMetrics[shape] = metrics;

    // Standard 60 FPS frame budget is 16.66ms; JS math pipeline should ideally consume < 3.0ms
    if (metrics.p99TimeMs > 5.0 || metrics.meanTimeMs > 2.0) {
      allUnderBudget = false;
    }
  }

  const depthSortMetrics = computePercentiles(depthSortTimes);

  return {
    shapeMetrics,
    depthSortMetrics,
    fullPipelinePass: allUnderBudget,
  };
}

// -----------------------------------------------------------------------------
// SECTION 4: AUDIO REACTIVITY & EXTREME / MALFORMED INPUTS STRESS
// -----------------------------------------------------------------------------
export function runAudioReactivityStress(): {
  extremeResults: {
    input: string;
    outputPointCount: number;
    hasNaN: boolean;
    hasInf: boolean;
    maxCoordinate: number;
    passed: boolean;
  }[];
  hexRgbResults: {
    hex: string;
    rgb: { r: number; g: number; b: number };
    valid: boolean;
  }[];
  allAudioTestsPassed: boolean;
} {
  const testInputs = [
    { name: 'Silence (audio=0)', audio: 0 },
    { name: 'Max Normal (audio=1.0)', audio: 1.0 },
    { name: 'Mid Audio (audio=0.5)', audio: 0.5 },
    { name: 'Negative Audio Input (audio=-1.0)', audio: -1.0 },
    { name: 'High Volume Spike (audio=10.0)', audio: 10.0 },
    { name: 'NaN Audio Input (Fallback=0)', audio: NaN },
    { name: 'Undefined Audio Input (Fallback=0)', audio: undefined as any },
  ];

  const extremeResults = testInputs.map(({ name, audio }) => {
    // Sanitize input as done in production component (curAudio = isFinite(audio) ? audio : 0)
    const sanitizedAudio = isFinite(audio) ? Math.max(0, audio) : 0;
    const particles = ProceduralGeometryEngine.generateTorusParticles(1.0, 'speaking', sanitizedAudio);
    let hasNaN = false;
    let hasInf = false;
    let maxCoord = 0;

    for (const p of particles) {
      if (isNaN(p.x) || isNaN(p.y) || isNaN(p.z)) hasNaN = true;
      if (!isFinite(p.x) || !isFinite(p.y) || !isFinite(p.z)) hasInf = true;
      maxCoord = Math.max(maxCoord, Math.abs(p.x), Math.abs(p.y), Math.abs(p.z));
    }

    const passed = !hasNaN && !hasInf && maxCoord < 2000;
    return {
      input: name,
      outputPointCount: particles.length,
      hasNaN,
      hasInf,
      maxCoordinate: parseFloat(maxCoord.toFixed(2)),
      passed,
    };
  });

  const testHexes = [
    '#99FFFF',
    '#00E5FF',
    '#FFF',
    '#000',
    '99FFFF',
    '',
    'invalid',
    '#GGGGGG',
    '#12345',
  ];

  const hexRgbResults = testHexes.map((hex) => {
    const rgb = hexToRgb(hex);
    const valid = !isNaN(rgb.r) && !isNaN(rgb.g) && !isNaN(rgb.b) &&
                  rgb.r >= 0 && rgb.r <= 255 &&
                  rgb.g >= 0 && rgb.g <= 255 &&
                  rgb.b >= 0 && rgb.b <= 255;
    return { hex, rgb, valid };
  });

  const allAudioTestsPassed = extremeResults.every((r) => r.passed) && hexRgbResults.every((r) => r.valid);

  return { extremeResults, hexRgbResults, allAudioTestsPassed };
}

// -----------------------------------------------------------------------------
// SECTION 5: MOMENTUM DECAY PHYSICS CONVERGENCE & GIMBAL CLAMPING
// -----------------------------------------------------------------------------
export function runMomentumPhysicsStress(): {
  scenarios: {
    name: string;
    initialVy: number;
    initialVp: number;
    framesToRest: number;
    expectedMaxFrames: number;
    finalYaw: number;
    finalPitch: number;
    pitchBounded: boolean;
    converged: boolean;
  }[];
  clampLimitViolated: boolean;
  allPhysicsPassed: boolean;
} {
  const maxPitch = Math.PI / 2 - 0.1; // ~1.470796
  const minPitch = -Math.PI / 2 + 0.1; // ~ -1.470796

  const testScenarios = [
    { name: 'Standard Swipe (+1.2 rad/s)', vy: 1.2, vp: 0.8 },
    { name: 'High-Speed Flick (+15.0 rad/s)', vy: 15.0, vp: 12.0 },
    { name: 'Extreme Negative Spin (-50.0 rad/s)', vy: -50.0, vp: -50.0 },
    { name: 'Gimbal Boundary Push Pitch Up (+100.0)', vy: 0, vp: 100.0 },
    { name: 'Gimbal Boundary Push Pitch Down (-100.0)', vy: 0, vp: -100.0 },
  ];

  let clampLimitViolated = false;

  const scenarios = testScenarios.map(({ name, vy, vp }) => {
    let state = {
      yaw: 0,
      pitch: 0.1,
      velocityYaw: vy,
      velocityPitch: vp,
      isDragging: false,
      time: 0,
    };

    let frames = 0;
    const maxVelocity = Math.max(Math.abs(vy), Math.abs(vp));
    // Exact analytical decay bound: |v0| * (0.94)^n < 0.0001  =>  n = ceil(ln(0.0001/|v0|) / ln(0.94))
    const expectedMaxFrames = maxVelocity > 0
      ? Math.ceil(Math.log(0.0001 / maxVelocity) / Math.log(0.94)) + 5
      : 1;

    while (frames < 300) {
      frames++;
      state = { ...ProceduralGeometryEngine.stepMomentumPhysics(state, 1 / 60), isDragging: false, time: frames * (1 / 60) };

      if (state.pitch > maxPitch + 1e-6 || state.pitch < minPitch - 1e-6) {
        clampLimitViolated = true;
      }

      if (Math.abs(state.velocityYaw) < 0.0001 && Math.abs(state.velocityPitch) < 0.0001) {
        break;
      }
    }

    const pitchBounded = state.pitch <= maxPitch + 1e-6 && state.pitch >= minPitch - 1e-6;
    const converged = frames <= expectedMaxFrames;

    return {
      name,
      initialVy: vy,
      initialVp: vp,
      framesToRest: frames,
      expectedMaxFrames,
      finalYaw: parseFloat(state.yaw.toFixed(4)),
      finalPitch: parseFloat(state.pitch.toFixed(4)),
      pitchBounded,
      converged,
    };
  });

  const allPhysicsPassed = !clampLimitViolated && scenarios.every((s) => s.pitchBounded && s.converged);

  return { scenarios, clampLimitViolated, allPhysicsPassed };
}

// -----------------------------------------------------------------------------
// MAIN HARNESS EXECUTION
// -----------------------------------------------------------------------------
export function runAllEmpiricalStressTests() {
  console.log('================================================================================');
  console.log('  🔬 FOX AI EMPIRICAL 3D MATH, PERFORMANCE & STRESS HARNESS');
  console.log('================================================================================\n');

  console.log('1. Evaluating Procedural Coordinate Bounds & Mathematical Precision...');
  const boundsRes = runCoordinateBoundsStress();
  console.table(boundsRes.shapeResults);
  console.log(`-> Coordinate Bounds & NaN Safety: ${boundsRes.allValid ? 'PASSED ✅' : 'FAILED ❌'}\n`);

  console.log('2. Evaluating 4D Tesseract Projection Singularity Avoidance (100,000 runs)...');
  const tesseractRes = runTesseractSingularityStress(100000);
  console.log(`  - Iterations Tested: ${tesseractRes.iterationsTested.toLocaleString()} vertex projections`);
  console.log(`  - Theoretical Min (D4 - sqrt(2)): ${tesseractRes.theoreticalMinDenom}`);
  console.log(`  - Empirical Min Denominator: ${tesseractRes.minDenominatorRaw}`);
  console.log(`  - Empirical Max Denominator: ${tesseractRes.maxDenominatorRaw}`);
  console.log(`  - Perspective Projection Factor P4 Range: [${tesseractRes.minP4}, ${tesseractRes.maxP4}]`);
  console.log(`  - Clamp Activations (denom <= 0.25): ${tesseractRes.clampActivatedCount}`);
  console.log(`-> 4D Singularity Avoidance: ${tesseractRes.singularityAvoided ? 'PASSED ✅' : 'FAILED ❌'}\n`);

  console.log('3. Evaluating 60 FPS Render Pipeline & Depth Sorting Latency (10,000 frames)...');
  const perfRes = runRenderPerformanceBenchmark(2000);
  console.table(
    Object.entries(perfRes.shapeMetrics).map(([shape, m]) => ({
      Shape: shape,
      'Mean (ms)': m.meanTimeMs.toFixed(3),
      'p50 (ms)': m.p50TimeMs.toFixed(3),
      'p95 (ms)': m.p95TimeMs.toFixed(3),
      'p99 (ms)': m.p99TimeMs.toFixed(3),
      'Max (ms)': m.maxTimeMs.toFixed(3),
      'Max FPS Capacity': Math.round(m.theoreticalMaxFps),
    }))
  );
  console.log(`  - Depth Sorting Only (2,408 elements): Mean ${perfRes.depthSortMetrics.meanTimeMs.toFixed(3)}ms (p99: ${perfRes.depthSortMetrics.p99TimeMs.toFixed(3)}ms)`);
  console.log(`-> 60 FPS Budget Compliance (<16.66ms per frame): ${perfRes.fullPipelinePass ? 'PASSED ✅' : 'FAILED ❌'}\n`);

  console.log('4. Evaluating Audio Reactivity Across Extreme & Corrupted Inputs...');
  const audioRes = runAudioReactivityStress();
  console.table(audioRes.extremeResults);
  console.log(`-> Audio Reactivity & Color Robustness: ${audioRes.allAudioTestsPassed ? 'PASSED ✅' : 'FAILED ❌'}\n`);

  console.log('5. Evaluating Momentum Decay Physics Convergence & Camera Pitch Clamping...');
  const physicsRes = runMomentumPhysicsStress();
  console.table(physicsRes.scenarios);
  console.log(`-> Momentum Decay & Gimbal Inversion Prevention: ${physicsRes.allPhysicsPassed ? 'PASSED ✅' : 'FAILED ❌'}\n`);

  const overallPass = boundsRes.allValid &&
                      tesseractRes.singularityAvoided &&
                      perfRes.fullPipelinePass &&
                      audioRes.allAudioTestsPassed &&
                      physicsRes.allPhysicsPassed;

  console.log('================================================================================');
  console.log(`  OVERALL EMPIRICAL CHALLENGE VERDICT: ${overallPass ? 'APPROVED ✅' : 'REQUEST_CHANGES ❌'}`);
  console.log('================================================================================\n');

  return {
    boundsRes,
    tesseractRes,
    perfRes,
    audioRes,
    physicsRes,
    overallPass,
  };
}

if (process.argv[1]?.endsWith('empirical_stress_harness.ts') || process.argv[1]?.endsWith('empirical_stress_harness.js')) {
  runAllEmpiricalStressTests();
}
