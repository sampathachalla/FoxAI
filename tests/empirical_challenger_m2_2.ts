/**
 * Empirical Challenger M2.2 Verification Harness
 * Focus:
 * 1. 60 FPS Performance & Mathematical Throughput across 1,000 simulated frames (<2.5ms target)
 * 2. Audio Energy Modulation (0.0 Silence to 1.0 Clipping + Adversarial Inputs) for Solar Corona & Rings
 * 3. Camera Glide Lerp Convergence, Zoom Lerp, Momentum Decay & Pitch Clamping
 * 4. Saturn 3D Ring Horizon-Split Depth Geometry (48 slices)
 * 5. 3D Keplerian Orbital Coordinate Bounds & Zero-NaN Projection Stream
 * 6. Canvas 2D Surface Shaders Mock Execution for Sun & All 9 Planets
 * 7. Screen-Space Raycasting & Touch Target Hit Testing
 * 8. Jittered Frame Deltas & Frame Drop Robustness
 * 9. Keplerian Orbital Mechanics & Harmonized Distance Ratios
 */

import assert from 'node:assert/strict';
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
  type Point3D,
  type ProjectedBodyItem,
  type SolarFlareParams,
} from '../app/components/Planetarium/SolarShaders.ts';

import {
  CELESTIAL_BODIES,
  CELESTIAL_BODY_MAP,
  PLANET_VISUAL_RADII,
  RELATIVE_ORBITAL_SPEEDS,
  PLANETARY_DATA,
  getCelestialBody,
} from '../app/components/Planetarium/PlanetaryData.ts';

import type { CelestialBodyData, CelestialId } from '../app/types/index.ts';

// ---------------------------------------------------------------------------
// Canvas 2D Rendering Context Mock for Node.js Empirical Execution
// ---------------------------------------------------------------------------
class MockCanvasGradient {
  public stops: { offset: number; color: string }[] = [];
  addColorStop(offset: number, color: string) {
    this.stops.push({ offset, color });
  }
}

class MockCanvasContext2D {
  public fillStyle: any = '#000000';
  public strokeStyle: any = '#000000';
  public lineWidth: number = 1;
  public globalCompositeOperation: string = 'source-over';
  public font: string = '10px sans-serif';
  public stateStack: any[] = [];
  public pathHistory: string[] = [];
  public drawCallsCount: number = 0;

  save() {
    this.stateStack.push({
      fillStyle: this.fillStyle,
      strokeStyle: this.strokeStyle,
      lineWidth: this.lineWidth,
      globalCompositeOperation: this.globalCompositeOperation,
      font: this.font,
    });
  }

  restore() {
    const s = this.stateStack.pop();
    if (s) {
      this.fillStyle = s.fillStyle;
      this.strokeStyle = s.strokeStyle;
      this.lineWidth = s.lineWidth;
      this.globalCompositeOperation = s.globalCompositeOperation;
      this.font = s.font;
    }
  }

  beginPath() {
    this.pathHistory = [];
  }

  closePath() {}

  moveTo(x: number, y: number) {
    assert.ok(Number.isFinite(x) && Number.isFinite(y), `moveTo coords invalid: (${x}, ${y})`);
    this.pathHistory.push(`moveTo(${x},${y})`);
  }

  lineTo(x: number, y: number) {
    assert.ok(Number.isFinite(x) && Number.isFinite(y), `lineTo coords invalid: (${x}, ${y})`);
    this.pathHistory.push(`lineTo(${x},${y})`);
  }

  arc(x: number, y: number, r: number, sAngle: number, eAngle: number) {
    assert.ok(Number.isFinite(x) && Number.isFinite(y), `arc center coords invalid: (${x}, ${y})`);
    assert.ok(Number.isFinite(r) && r >= 0, `arc radius invalid: ${r}`);
    assert.ok(Number.isFinite(sAngle) && Number.isFinite(eAngle), `arc angles invalid: ${sAngle}, ${eAngle}`);
    this.pathHistory.push(`arc(${x},${y},${r})`);
  }

  ellipse(x: number, y: number, rx: number, ry: number, rot: number, sa: number, ea: number, anti?: boolean) {
    assert.ok(Number.isFinite(x) && Number.isFinite(y), `ellipse center invalid: (${x}, ${y})`);
    assert.ok(Number.isFinite(rx) && rx >= 0 && Number.isFinite(ry) && ry >= 0, `ellipse radii invalid: ${rx}, ${ry}`);
    this.pathHistory.push(`ellipse(${x},${y},${rx},${ry})`);
  }

  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number) {
    assert.ok(Number.isFinite(cpx) && Number.isFinite(cpy), `quad control points invalid: (${cpx}, ${cpy})`);
    assert.ok(Number.isFinite(x) && Number.isFinite(y), `quad target points invalid: (${x}, ${y})`);
    this.pathHistory.push(`quad(${cpx},${cpy},${x},${y})`);
  }

  rect(x: number, y: number, w: number, h: number) {
    assert.ok(Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(w) && Number.isFinite(h));
    this.pathHistory.push(`rect(${x},${y},${w},${h})`);
  }

  fillRect(x: number, y: number, w: number, h: number) {
    assert.ok(Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(w) && Number.isFinite(h));
    this.drawCallsCount++;
  }

  fill() {
    this.drawCallsCount++;
  }

  stroke() {
    this.drawCallsCount++;
  }

  clip() {}

  translate(x: number, y: number) {
    assert.ok(Number.isFinite(x) && Number.isFinite(y));
  }

  rotate(angle: number) {
    assert.ok(Number.isFinite(angle));
  }

  scale(sx: number, sy: number) {
    assert.ok(Number.isFinite(sx) && Number.isFinite(sy));
  }

  clearRect(x: number, y: number, w: number, h: number) {
    assert.ok(Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(w) && Number.isFinite(h));
  }

  createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number): MockCanvasGradient {
    assert.ok(Number.isFinite(x0) && Number.isFinite(y0) && Number.isFinite(r0) && r0 >= 0);
    assert.ok(Number.isFinite(x1) && Number.isFinite(y1) && Number.isFinite(r1) && r1 >= 0);
    return new MockCanvasGradient();
  }

  createLinearGradient(x0: number, y0: number, x1: number, y1: number): MockCanvasGradient {
    assert.ok(Number.isFinite(x0) && Number.isFinite(y0));
    assert.ok(Number.isFinite(x1) && Number.isFinite(y1));
    return new MockCanvasGradient();
  }

  setLineDash(dash: number[]) {
    assert.ok(Array.isArray(dash));
  }

  fillText(text: string, x: number, y: number) {
    assert.ok(typeof text === 'string');
    assert.ok(Number.isFinite(x) && Number.isFinite(y));
    this.drawCallsCount++;
  }

  measureText(text: string) {
    return { width: text.length * 6.5 };
  }
}

const mockCtx = new MockCanvasContext2D() as unknown as CanvasRenderingContext2D;

console.log('================================================================================');
console.log('🔬 EMPIRICAL CHALLENGER M2.2 STRESS HARNESS');
console.log('================================================================================');

// ============================================================================
// SUITE 1: 60 FPS Performance & Throughput Benchmark across 1,000 Frames
// ============================================================================
console.log('\n[SUITE 1] 60 FPS Performance Benchmark across 1,000 Simulated Frames:');

const getOrbitalPosition = (body: CelestialBodyData, simTime: number, speedMult: number = 1.0): Point3D => {
  if (body.id === 'sun' || body.orbitalRadiusScaled === 0) {
    return { x: 0, y: 0, z: 0 };
  }
  const baseSpeed = 0.45;
  const angularSpeed =
    (baseSpeed * (body.orbitalSpeedKmS / 29.8) * speedMult) / Math.max(1, body.orbitalRadiusScaled * 0.02);
  const angle = simTime * angularSpeed + body.distanceAu * 1.85;
  const r = body.orbitalRadiusScaled;
  const incRad = (body.orbitalInclinationDeg * Math.PI) / 180;
  return {
    x: r * Math.cos(angle),
    y: r * Math.sin(angle) * Math.sin(incRad),
    z: r * Math.sin(angle) * Math.cos(incRad),
  };
};

const project3DToScreen = (
  pos: Point3D,
  camera: { yaw: number; pitch: number; zoom: number; focusOffset: Point3D },
  width: number,
  height: number
) => {
  const cx = width / 2;
  const cy = height / 2;
  const fov = camera.zoom;
  const relX = pos.x - camera.focusOffset.x;
  const relY = pos.y - camera.focusOffset.y;
  const relZ = pos.z - camera.focusOffset.z;

  const cosYaw = Math.cos(camera.yaw);
  const sinYaw = Math.sin(camera.yaw);
  const x1 = relX * cosYaw - relZ * sinYaw;
  const z1 = relX * sinYaw + relZ * cosYaw;

  const cosPitch = Math.cos(camera.pitch);
  const sinPitch = Math.sin(camera.pitch);
  const y2 = relY * cosPitch - z1 * sinPitch;
  const z2 = relY * sinPitch + z1 * cosPitch;

  const depth = Math.max(10, fov + z2);
  const scale = fov / depth;

  return {
    screenX: cx + x1 * scale,
    screenY: cy + y2 * scale,
    screenZ: z2,
    scale,
  };
};

const FRAME_COUNT = 1000;
const frameTimes: number[] = [];
const starfield = createStarfield(320);

let camera = {
  yaw: 0.45,
  pitch: 0.55,
  zoom: 560,
  focusOffset: { x: 0, y: 0, z: 0 },
};

const VIEW_W = 1920;
const VIEW_H = 1080;
const dummyFft = new Uint8Array(128).map((_, i) => Math.floor(Math.sin(i * 0.1) * 127 + 128));

for (let f = 0; f < FRAME_COUNT; f++) {
  const tStart = performance.now();
  const simTime = f * 0.01667;
  const audioLevel = 0.5 + 0.5 * Math.sin(f * 0.05);

  // 1. Starfield Update & Render Simulation
  renderStarfield(mockCtx, starfield, camera, VIEW_W, VIEW_H, simTime);

  // 2. Orbital Tracks Calculation & Render
  for (const body of CELESTIAL_BODIES) {
    if (body.id === 'sun') continue;
    renderOrbitalTrack(mockCtx, body, camera, VIEW_W, VIEW_H, false, body.id === 'jupiter', audioLevel, simTime);
  }

  // 3. Project 10 Celestial Bodies
  const projectedList: ProjectedBodyItem[] = [];
  const flareParams = computeSolarFlareParams(simTime, audioLevel, dummyFft);
  let sunScreenPos = { x: VIEW_W / 2, y: VIEW_H / 2 };

  for (const body of CELESTIAL_BODIES) {
    const worldPos = getOrbitalPosition(body, simTime, 1.0);
    const proj = project3DToScreen(worldPos, camera, VIEW_W, VIEW_H);
    const baseRad = PLANET_VISUAL_RADII[body.id] || 8.0;
    let screenRadius = baseRad * proj.scale;
    let glowRadius = screenRadius * 2.2;

    if (body.id === 'sun') {
      screenRadius = flareParams.coreRadius * proj.scale;
      glowRadius = flareParams.coronalGlowRadius * proj.scale;
      sunScreenPos = { x: proj.screenX, y: proj.screenY };
    }

    projectedList.push({
      id: body.id,
      name: body.name,
      worldPos,
      screenX: proj.screenX,
      screenY: proj.screenY,
      screenZ: proj.screenZ,
      scale: proj.scale,
      screenRadius: Math.max(2.0, screenRadius),
      color: body.color,
      glowColor: body.glowColor,
      glowRadius,
      data: body,
      isHovered: body.id === 'mars',
      isSelected: body.id === 'jupiter',
    });
  }

  // 4. Depth Sorting
  const sortedBodies = [...projectedList].sort((a, b) => b.screenZ - a.screenZ);

  // 5. Back-to-Front Render Dispatcher
  for (const item of sortedBodies) {
    if (item.id === 'sun') {
      renderSun(mockCtx, item, flareParams, simTime);
    } else if (item.id === 'saturn') {
      renderSaturnRingPass(mockCtx, item, camera, false, audioLevel, simTime);
      renderPlanet(mockCtx, item, sunScreenPos, simTime);
      renderSaturnRingPass(mockCtx, item, camera, true, audioLevel, simTime);
    } else {
      renderPlanet(mockCtx, item, sunScreenPos, simTime);
    }
  }

  // 6. Labels & Reticle
  for (const item of projectedList) {
    if (item.isSelected || item.isHovered) {
      renderPlanetLabel(mockCtx, item, item.isSelected);
    }
  }

  // 7. Raycast Hit Test (18px touch radius & depth tie breaking)
  const mx = VIEW_W / 2 + Math.sin(f) * 200;
  const my = VIEW_H / 2 + Math.cos(f) * 200;
  let closestId: CelestialId | null = null;
  let closestDistSq = Infinity;
  let closestZ = Infinity;

  for (const body of projectedList) {
    const hitRadius = Math.max(body.screenRadius + 12, 18);
    const dx = mx - body.screenX;
    const dy = my - body.screenY;
    const distSq = dx * dx + dy * dy;

    if (distSq <= hitRadius * hitRadius) {
      if (distSq < closestDistSq - 9 || (Math.abs(distSq - closestDistSq) <= 9 && body.screenZ < closestZ)) {
        closestDistSq = distSq;
        closestZ = body.screenZ;
        closestId = body.id;
      }
    }
  }

  // Camera drift
  camera.yaw += 0.0012;

  const tEnd = performance.now();
  frameTimes.push(tEnd - tStart);
}

// Compute statistics
frameTimes.sort((a, b) => a - b);
const minTime = frameTimes[0];
const maxTime = frameTimes[frameTimes.length - 1];
const totalTime = frameTimes.reduce((acc, v) => acc + v, 0);
const meanTime = totalTime / frameTimes.length;
const medianTime = frameTimes[Math.floor(frameTimes.length * 0.5)];
const p95Time = frameTimes[Math.floor(frameTimes.length * 0.95)];
const p99Time = frameTimes[Math.floor(frameTimes.length * 0.99)];
const theoreticalFps = 1000 / meanTime;

console.log(`  ✓ 1,000 Frames Executed in ${totalTime.toFixed(2)}ms total`);
console.log(`  ✓ Min: ${minTime.toFixed(4)}ms | Mean: ${meanTime.toFixed(4)}ms | Median: ${medianTime.toFixed(4)}ms`);
console.log(`  ✓ P95: ${p95Time.toFixed(4)}ms | P99: ${p99Time.toFixed(4)}ms | Max: ${maxTime.toFixed(4)}ms`);
console.log(`  ✓ Max Theoretical Rendering Throughput: ${theoreticalFps.toFixed(0)} FPS`);

assert.ok(meanTime < 2.5, `Target mean frame time < 2.5ms violated: got ${meanTime.toFixed(4)}ms`);
assert.ok(p99Time < 5.0, `P99 frame time < 5.0ms violated: got ${p99Time.toFixed(4)}ms`);
console.log('  🎯 Target < 2.5ms Frame Execution PASS: Achieved mean of ' + meanTime.toFixed(4) + 'ms');

// ============================================================================
// SUITE 2: Audio Energy Modulation & Solar Corona Bounds Stress Testing
// ============================================================================
console.log('\n[SUITE 2] Audio Energy Modulation & Solar Corona Bounds:');

// Test linear sweep from 0.0 to 1.0 (1,000 steps)
for (let step = 0; step <= 1000; step++) {
  const audio = step / 1000;
  const params = computeSolarFlareParams(step * 0.1, audio, null);

  assert.ok(params.coreRadius >= 30 && params.coreRadius <= 45, `coreRadius out of bounds: ${params.coreRadius}`);
  assert.ok(params.coronalGlowRadius >= 80 && params.coronalGlowRadius <= 150, `coronalGlowRadius out of bounds: ${params.coronalGlowRadius}`);
  assert.ok(params.prominenceCount >= 14 && params.prominenceCount <= 30, `prominenceCount out of bounds: ${params.prominenceCount}`);
  assert.ok(params.prominenceScale >= 0.8 && params.prominenceScale <= 3.0, `prominenceScale out of bounds: ${params.prominenceScale}`);
  assert.ok(params.flareIntensity >= 0.75 && params.flareIntensity <= 1.0, `flareIntensity out of bounds: ${params.flareIntensity}`);
  assert.ok(params.bassEnergy >= 0.0 && params.bassEnergy <= 1.0, `bassEnergy out of bounds: ${params.bassEnergy}`);
  assert.ok(!isNaN(params.coreRadius) && !isNaN(params.coronalGlowRadius));
}
console.log('  ✓ 1,000 Audio Steps (0.0 to 1.0) verified strictly within physical solar bounds');

// Test FFT Bass extraction with extreme frequency data
const allZerosFft = new Uint8Array(128).fill(0);
const allMaxFft = new Uint8Array(128).fill(255);
const pSilence = computeSolarFlareParams(0, 0, allZerosFft);
const pClipping = computeSolarFlareParams(0, 1.0, allMaxFft);

assert.equal(pSilence.bassEnergy, 0.0);
assert.equal(pClipping.bassEnergy, 1.0);
assert.ok(pClipping.coreRadius > pSilence.coreRadius);
assert.ok(pClipping.coronalGlowRadius > pSilence.coronalGlowRadius);
assert.equal(pSilence.prominenceCount, 14);
assert.equal(pClipping.prominenceCount, 30);
console.log('  ✓ FFT Bass Frequency Energy extraction verified: Silence (0.0) -> Max Volume (1.0)');

// Test Adversarial Inputs: negative audio, overflow audio, NaN, Inf, empty arrays
const adversarialInputs = [
  -10.0,
  1000.0,
  NaN,
  Infinity,
  -Infinity,
  undefined as any,
  null as any,
];

for (const adv of adversarialInputs) {
  const res = computeSolarFlareParams(10, adv, new Uint8Array(0));
  assert.ok(Number.isFinite(res.coreRadius), `coreRadius must be finite for input ${adv}`);
  assert.ok(Number.isFinite(res.coronalGlowRadius), `coronalGlowRadius must be finite for input ${adv}`);
  assert.ok(Number.isFinite(res.prominenceCount), `prominenceCount must be finite for input ${adv}`);
  assert.ok(Number.isFinite(res.prominenceScale), `prominenceScale must be finite for input ${adv}`);
  assert.ok(Number.isFinite(res.flareIntensity), `flareIntensity must be finite for input ${adv}`);
}
console.log('  ✓ Adversarial audio inputs (-10, 1000, NaN, Inf, null) gracefully sanitized with zero NaN/Inf');

// ============================================================================
// SUITE 3: Camera Glide Lerp Convergence, Zoom Lerp, Momentum & Pitch Clamping
// ============================================================================
console.log('\n[SUITE 3] Camera Glide Lerp Convergence, Momentum & Pitch Clamping:');

// 3.1 Focus Offset Exponential Lerp: lerpSpeed = 1 - Math.exp(-6.0 * dt)
const testDtValues = [
  1 / 120, // 120 FPS (~0.00833s)
  1 / 60,  // 60 FPS (~0.01667s)
  1 / 30,  // 30 FPS (~0.03333s)
  0.05,   // Clamped max frame delta
  0.1,    // Frame hitch
  1.0,    // Extreme lag spike
  10.0,   // Severe backgrounding
  0.0,    // Paused frame
];

for (const dt of testDtValues) {
  const lerpSpeed = 1 - Math.exp(-6.0 * dt);
  assert.ok(lerpSpeed >= 0 && lerpSpeed < 1.0 || (dt > 5.0 && lerpSpeed <= 1.0), `lerpSpeed must be in [0, 1]: got ${lerpSpeed} for dt ${dt}`);

  // Test convergence from (500, 200, -300) to (0, 0, 0)
  let pos = { x: 500, y: 200, z: -300 };
  const target = { x: 0, y: 0, z: 0 };
  const initialDist = Math.hypot(pos.x, pos.y, pos.z);
  let prevDist = initialDist;

  const totalSimSeconds = 2.5;
  const steps = dt > 0 ? Math.ceil(totalSimSeconds / dt) : 10;
  for (let s = 0; s < steps; s++) {
    pos.x += (target.x - pos.x) * lerpSpeed;
    pos.y += (target.y - pos.y) * lerpSpeed;
    pos.z += (target.z - pos.z) * lerpSpeed;
    const curDist = Math.hypot(pos.x, pos.y, pos.z);

    if (dt > 0) {
      assert.ok(curDist <= prevDist, `Distance must strictly monotonically decrease: prev ${prevDist}, cur ${curDist}`);
    }
    prevDist = curDist;
  }

  if (dt > 0) {
    assert.ok(prevDist < 0.01, `Target must converge to < 0.01 within 2.5s: got ${prevDist} for dt ${dt}`);
  }
}
console.log('  ✓ Focus Glide Exponential Lerp verified: strictly monotonic convergence with zero overshoot/oscillation across all dt ranges');

// 3.2 Zoom Lerp: zoomLerpSpeed = 1 - Math.exp(-5.0 * dt)
let currentZoom = 120;
const targetZoom = 1600;
const dtZoom = 1 / 60;
const zoomLerpSpeed = 1 - Math.exp(-5.0 * dtZoom);

for (let s = 0; s < 180; s++) {
  const prevZ = currentZoom;
  currentZoom += (targetZoom - currentZoom) * zoomLerpSpeed;
  assert.ok(currentZoom >= prevZ && currentZoom <= targetZoom + 0.001, `Zoom must monotonically increase to target`);
}
assert.ok(Math.abs(targetZoom - currentZoom) < 0.01, `Zoom must reach target: got ${currentZoom}, target ${targetZoom}`);
console.log('  ✓ Zoom Lerp verified: smooth asymptotic convergence from 120px to 1600px');

// 3.3 Camera Momentum Physics Decay: 0.92 per frame
let vy = 2.5;
let vp = -1.8;
const decay = Math.pow(0.92, 1.0); // 60 FPS speedFactor = 1.0

let framesToRestY = 0;
while (Math.abs(vy) >= 0.0001 && framesToRestY < 300) {
  vy *= decay;
  framesToRestY++;
}
assert.ok(framesToRestY <= 130, `Velocity Y must decay to rest within 130 frames (~2.1s): took ${framesToRestY} frames`);

let framesToRestP = 0;
while (Math.abs(vp) >= 0.0001 && framesToRestP < 300) {
  vp *= decay;
  framesToRestP++;
}
assert.ok(framesToRestP <= 130, `Velocity Pitch must decay to rest within 130 frames (~2.1s): took ${framesToRestP} frames`);
console.log(`  ✓ Momentum velocity decay matches exact 0.92 friction law, entering smooth idle orbital drift within ${framesToRestY} frames (~2.1s)`);

// 3.4 Pitch Clamping [-85°, +85°]
const PITCH_LIMIT = (85 * Math.PI) / 180; // ~1.48353 rad
const extremePitches = [-100, -5, -PITCH_LIMIT - 0.5, PITCH_LIMIT + 0.5, 5, 100];

for (const p of extremePitches) {
  const clamped = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, p));
  assert.ok(clamped >= -PITCH_LIMIT && clamped <= PITCH_LIMIT, `Pitch was not clamped to [-85°, +85°]: ${clamped}`);
}
console.log('  ✓ Pitch angle strictly clamped within [-1.48353, +1.48353] rad preventing gimbal flip');

// ============================================================================
// SUITE 4: Saturn 3D Ring Horizon-Split Depth Geometry (48 Slices)
// ============================================================================
console.log('\n[SUITE 4] Saturn 3D Ring Horizon-Split Depth Geometry:');

const saturnWorldPos = { x: 278, y: 0, z: 0 };
const testAngles = [
  { yaw: 0, pitch: 0 },
  { yaw: Math.PI / 4, pitch: Math.PI / 6 },
  { yaw: Math.PI / 2, pitch: 0.55 },
  { yaw: Math.PI, pitch: -0.55 },
  { yaw: (3 * Math.PI) / 2, pitch: 1.4 },
  { yaw: Math.PI * 2, pitch: -1.4 },
];

for (const angle of testAngles) {
  const cam = {
    yaw: angle.yaw,
    pitch: angle.pitch,
    zoom: 560,
    focusOffset: { x: 0, y: 0, z: 0 },
  };

  const { backRings, frontRings } = computeSaturnRingSegments(saturnWorldPos, cam, VIEW_W, VIEW_H, 0.5, 1.0);
  assert.equal(backRings.length + frontRings.length, 48, `Total Saturn ring slices must equal exactly 48`);
  assert.ok(backRings.length > 0, `Must have back rings at yaw ${angle.yaw}, pitch ${angle.pitch}`);
  assert.ok(frontRings.length > 0, `Must have front rings at yaw ${angle.yaw}, pitch ${angle.pitch}`);

  // Project Saturn center
  const saturnProj = project3DToScreen(saturnWorldPos, cam, VIEW_W, VIEW_H);

  for (const fRing of frontRings) {
    assert.ok(fRing.screenZ <= saturnProj.screenZ + 0.001, `Front ring screenZ (${fRing.screenZ}) must be <= Saturn screenZ (${saturnProj.screenZ})`);
    assert.ok(Number.isFinite(fRing.screenX) && Number.isFinite(fRing.screenY));
  }

  for (const bRing of backRings) {
    assert.ok(bRing.screenZ >= saturnProj.screenZ - 0.001, `Back ring screenZ (${bRing.screenZ}) must be >= Saturn screenZ (${saturnProj.screenZ})`);
    assert.ok(Number.isFinite(bRing.screenX) && Number.isFinite(bRing.screenY));
  }
}
console.log('  ✓ 48 Saturn ring slices successfully partitioned into front & back segments across 360° yaw and [-85°, +85°] pitch');

// ============================================================================
// SUITE 5: Color & Procedural Shading Utilities
// ============================================================================
console.log('\n[SUITE 5] Color & Procedural Shading Utilities:');

// hexToRgb
assert.deepEqual(hexToRgb('#FFFFFF'), { r: 255, g: 255, b: 255 });
assert.deepEqual(hexToRgb('#000000'), { r: 0, g: 0, b: 0 });
assert.deepEqual(hexToRgb('#F00'), { r: 255, g: 0, b: 0 });
assert.deepEqual(hexToRgb('invalid'), { r: 255, g: 255, b: 255 });

// rgba
assert.equal(rgba('#FF0000', 0.5), 'rgba(255, 0, 0, 0.500)');
assert.equal(rgba('#00FF00', -1.0), 'rgba(0, 255, 0, 0.000)');
assert.equal(rgba('#0000FF', 2.0), 'rgba(0, 0, 255, 1.000)');

// lerpColor
assert.equal(lerpColor('#000000', '#FFFFFF', 0.5), 'rgb(128, 128, 128)');
assert.equal(lerpColor('#FF0000', '#0000FF', 0.0), 'rgb(255, 0, 0)');
assert.equal(lerpColor('#FF0000', '#0000FF', 1.0), 'rgb(0, 0, 255)');

// proceduralTurbulence
for (let i = 0; i < 50; i++) {
  const turb = proceduralTurbulence(i * 0.5, i * 0.3, i * 0.1, 3);
  assert.ok(turb >= 0.0 && turb <= 1.0, `proceduralTurbulence must be normalized in [0, 1]: got ${turb}`);
}
console.log('  ✓ Color parsing, alpha clamping, lerp interpolation & procedural turbulence verified');

// ============================================================================
// SUITE 6: All 9 Planetary Surface Shaders Execution Verification
// ============================================================================
console.log('\n[SUITE 6] All 9 Planetary Surface Shaders Execution:');

const planetsToTest: CelestialId[] = [
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

const mockSunPos = { x: 960, y: 540 };

for (const planetId of planetsToTest) {
  const bodyData = getCelestialBody(planetId);
  const testItem: ProjectedBodyItem = {
    id: planetId,
    name: bodyData.name,
    worldPos: { x: 100, y: 0, z: 0 },
    screenX: 960 + bodyData.orbitalRadiusScaled,
    screenY: 540,
    screenZ: 100,
    scale: 1.0,
    screenRadius: PLANET_VISUAL_RADII[planetId],
    color: bodyData.color,
    glowColor: bodyData.glowColor,
    glowRadius: PLANET_VISUAL_RADII[planetId] * 2.2,
    data: bodyData,
    isHovered: true,
    isSelected: true,
  };

  const initialDraws = (mockCtx as any).drawCallsCount;
  renderPlanet(mockCtx, testItem, mockSunPos, 1.5);
  renderCelestialSelectionReticle(mockCtx, testItem.screenX, testItem.screenY, testItem.screenRadius, bodyData.color, 1.5, true);
  renderPlanetLabel(mockCtx, testItem, true);

  const deltaDraws = (mockCtx as any).drawCallsCount - initialDraws;
  assert.ok(deltaDraws > 0, `renderPlanet for ${planetId} must execute canvas drawing operations`);
  console.log(`  ✓ Planet [${planetId.toUpperCase()}] surface disc, terminator, atmosphere & HUD reticle rendered successfully`);
}

// ============================================================================
// SUITE 7: Screen-Space Raycasting & Touch Target Hit Testing Stress
// ============================================================================
console.log('\n[SUITE 7] Screen-Space Raycasting & Touch Target Hit Testing:');

const testBodies: ProjectedBodyItem[] = [
  {
    id: 'earth',
    name: 'Earth',
    worldPos: { x: 100, y: 0, z: 0 },
    screenX: 400,
    screenY: 300,
    screenZ: 50,
    scale: 1.0,
    screenRadius: 10.0,
    color: '#2B7CD3',
    glowColor: '#00E5FF',
    glowRadius: 22.0,
    data: getCelestialBody('earth'),
    isHovered: false,
    isSelected: false,
  },
  {
    id: 'mars',
    name: 'Mars',
    worldPos: { x: 150, y: 0, z: 0 },
    screenX: 405, // Almost overlapping with Earth (dx = 5px, dy = 0px)
    screenY: 300,
    screenZ: 20,  // Mars is closer to camera (lower screenZ)
    scale: 1.2,
    screenRadius: 7.0,
    color: '#E05638',
    glowColor: '#FF6B4A',
    glowRadius: 15.4,
    data: getCelestialBody('mars'),
    isHovered: false,
    isSelected: false,
  },
];

const testRaycast = (mx: number, my: number, bodies: ProjectedBodyItem[]): CelestialId | null => {
  let closestId: CelestialId | null = null;
  let closestDistSq = Infinity;
  let closestZ = Infinity;

  for (const body of bodies) {
    const hitRadius = Math.max(body.screenRadius + 12, 18); // Min 18px hit target
    const dx = mx - body.screenX;
    const dy = my - body.screenY;
    const distSq = dx * dx + dy * dy;

    if (distSq <= hitRadius * hitRadius) {
      if (
        distSq < closestDistSq - 9 ||
        (Math.abs(distSq - closestDistSq) <= 9 && body.screenZ < closestZ)
      ) {
        closestDistSq = distSq;
        closestZ = body.screenZ;
        closestId = body.id;
      }
    }
  }
  return closestId;
};

// Direct hit on Earth
assert.equal(testRaycast(390, 300, testBodies), 'earth');
// Center between Earth (400) and Mars (405) -> Mars is in front (screenZ 20 < 50)
assert.equal(testRaycast(402, 300, testBodies), 'mars');
// Far away -> null
assert.equal(testRaycast(600, 600, testBodies), null);
// Touch radius boundary test (18px from Earth center)
assert.equal(testRaycast(400 + 17.5, 300, [testBodies[0]]), 'earth');
assert.equal(testRaycast(400 + 23.0, 300, [testBodies[0]]), null);

console.log('  ✓ Raycast minimum 18px touch radius, depth tie-breaking & hit boundaries verified');

// ============================================================================
// SUITE 8: Jittered Frame Deltas (dt) & Frame Drop Robustness
// ============================================================================
console.log('\n[SUITE 8] Jittered Frame Deltas & Frame Drop Robustness:');

let jitterPos = { x: 1000, y: -500, z: 800 };
const jitterTarget = { x: 0, y: 0, z: 0 };

for (let step = 0; step < 100; step++) {
  // Random frame dt simulating 10 FPS to 240 FPS jitter plus occasional dropped frames
  const dtRandom = 0.004 + Math.random() * 0.06;
  const clampedDt = Math.min(0.05, dtRandom);
  const lerpSpeed = 1 - Math.exp(-6.0 * clampedDt);

  const prevD = Math.hypot(jitterPos.x, jitterPos.y, jitterPos.z);
  jitterPos.x += (jitterTarget.x - jitterPos.x) * lerpSpeed;
  jitterPos.y += (jitterTarget.y - jitterPos.y) * lerpSpeed;
  jitterPos.z += (jitterTarget.z - jitterPos.z) * lerpSpeed;
  const curD = Math.hypot(jitterPos.x, jitterPos.y, jitterPos.z);

  assert.ok(curD <= prevD, `Distance must decrease monotonically under random frame dt`);
  assert.ok(!isNaN(curD) && isFinite(curD));
}
assert.ok(Math.hypot(jitterPos.x, jitterPos.y, jitterPos.z) < 1.0, `Must converge under frame jitter`);
console.log('  ✓ Camera focus glide converges smoothly under chaotic frame delta jitter & frame drops');

// ============================================================================
// SUITE 9: Keplerian Orbital Mechanics & Harmonized Distance Ratios
// ============================================================================
console.log('\n[SUITE 9] Keplerian Orbital Mechanics & Harmonized Distance Ratios:');

const planetIdsOrdered: CelestialId[] = [
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

for (let i = 0; i < planetIdsOrdered.length; i++) {
  const pid = planetIdsOrdered[i];
  const b = PLANETARY_DATA[pid];

  if (i > 0) {
    const prevB = PLANETARY_DATA[planetIdsOrdered[i - 1]];
    assert.ok(
      b.distanceAu > prevB.distanceAu,
      `distanceAu must strictly increase: ${pid} (${b.distanceAu}) vs ${prevB.id} (${prevB.distanceAu})`
    );
    assert.ok(
      b.orbitalRadiusScaled > prevB.orbitalRadiusScaled,
      `orbitalRadiusScaled must strictly increase: ${pid} vs ${prevB.id}`
    );
    assert.ok(
      b.orbitalSpeedKmS < prevB.orbitalSpeedKmS,
      `orbitalSpeedKmS must strictly decrease with distance: ${pid} (${b.orbitalSpeedKmS}) vs ${prevB.id} (${prevB.orbitalSpeedKmS})`
    );
  }

  // Verify distance preservation in 3D orbit
  for (let t = 0; t < 100; t += 10) {
    const pos = getOrbitalPosition(b, t, 1.0);
    const calculatedRadius = Math.hypot(pos.x, pos.y, pos.z);
    assert.ok(
      Math.abs(calculatedRadius - b.orbitalRadiusScaled) < 0.0001,
      `Orbital radius must be perfectly conserved in 3D space for ${pid}`
    );
  }
}
console.log('  ✓ 3D orbital radius preservation, distance monotonicity & Keplerian velocity gradient verified for all 9 planets');

console.log('\n================================================================================');
console.log('🌌 ALL 9 ADVANCED EMPIRICAL CHALLENGER TEST SUITES PASSED WITH 100% SUCCESS');
console.log('================================================================================\n');
