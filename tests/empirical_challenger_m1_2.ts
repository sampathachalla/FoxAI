/**
 * Empirical Challenger M1.2 Verification Harness
 * Focus:
 * 1. Physical Consistency & Keplerian Mechanics of Planetary Data
 * 2. Storage Load/Save Idempotence & Fault Tolerance
 */

import assert from 'node:assert/strict';
import {
  CELESTIAL_IDS,
  PLANET_IDS,
  PLANETARY_DATA,
  CELESTIAL_BODY_MAP,
  CELESTIAL_BODIES,
  PLANETS_ONLY,
  getCelestialBody,
  isValidCelestialId,
  RELATIVE_ORBITAL_SPEEDS,
  PLANET_VISUAL_RADII,
} from '../app/components/Planetarium/PlanetaryData.ts';

import { StorageService, STORAGE_KEYS } from '../app/services/storage.ts';
import type { CelestialId, AppMode } from '../app/types/index.ts';

// In-memory mock localStorage for Node environment
class MockLocalStorage implements Storage {
  private store: Map<string, string> = new Map();
  public throwOnSet = false;
  public throwSecurityError = false;

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    if (this.throwSecurityError) {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    }
    return this.store.get(key) ?? null;
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys());
    return keys[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    if (this.throwSecurityError) {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    }
    if (this.throwOnSet) {
      throw new DOMException('QuotaExceededError', 'QuotaExceededError');
    }
    this.store.set(key, String(value));
  }
}

const mockStorage = new MockLocalStorage();
(globalThis as any).localStorage = mockStorage;

// ============================================================================
// SUITE 1: Physical Consistency & Keplerian Mechanics
// ============================================================================
console.log('--------------------------------------------------------------------------------');
console.log('🔭 Running Suite 1: Physical Consistency & Keplerian Mechanics');
console.log('--------------------------------------------------------------------------------');

// 1.1 Complete Set of 10 Celestial Bodies
assert.equal(CELESTIAL_IDS.length, 10, 'Must have 10 celestial IDs');
assert.equal(PLANET_IDS.length, 9, 'Must have 9 planet IDs');
assert.equal(CELESTIAL_BODIES.length, 10, 'CELESTIAL_BODIES array must have 10 elements');
assert.equal(PLANETS_ONLY.length, 9, 'PLANETS_ONLY array must have 9 elements');

// 1.2 Orbital Radii Monotonicity (Mercury -> Pluto)
const planetOrder: CelestialId[] = [
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

console.log('\n[1.2] Checking Orbital Distance Monotonicity:');
for (let i = 0; i < planetOrder.length - 1; i++) {
  const current = PLANETARY_DATA[planetOrder[i]];
  const next = PLANETARY_DATA[planetOrder[i + 1]];

  console.log(
    `  ${current.name} (${current.distanceAu} AU / ${current.distanceFromSunMillionKm}M km / ${current.orbitalRadiusScaled}px) < ` +
      `${next.name} (${next.distanceAu} AU / ${next.distanceFromSunMillionKm}M km / ${next.orbitalRadiusScaled}px)`
  );

  // Strictly increasing distanceFromSunMillionKm
  assert.ok(
    next.distanceFromSunMillionKm > current.distanceFromSunMillionKm,
    `distanceFromSunMillionKm must be strictly increasing: ${current.name} (${current.distanceFromSunMillionKm}) >= ${next.name} (${next.distanceFromSunMillionKm})`
  );

  // Strictly increasing distanceAu
  assert.ok(
    next.distanceAu > current.distanceAu,
    `distanceAu must be strictly increasing: ${current.name} (${current.distanceAu}) >= ${next.name} (${next.distanceAu})`
  );

  // Strictly increasing orbitalRadiusScaled
  assert.ok(
    next.orbitalRadiusScaled > current.orbitalRadiusScaled,
    `orbitalRadiusScaled must be strictly increasing: ${current.name} (${current.orbitalRadiusScaled}) >= ${next.name} (${next.orbitalRadiusScaled})`
  );
}

// 1.3 Astronomical Unit (AU) Scaling Consistency
console.log('\n[1.3] Checking AU to Million Km Consistency (1 AU ≈ 149.6M km):');
const KM_PER_AU_MILLION = 149.59787;
for (const pid of planetOrder) {
  const p = PLANETARY_DATA[pid];
  const calculatedAu = p.distanceFromSunMillionKm / KM_PER_AU_MILLION;
  const discrepancy = Math.abs(calculatedAu - p.distanceAu) / p.distanceAu;
  console.log(
    `  ${p.name.padEnd(8)}: distanceAu = ${p.distanceAu}, calculated = ${calculatedAu.toFixed(3)}, relative error = ${(discrepancy * 100).toFixed(2)}%`
  );
  assert.ok(
    discrepancy < 0.05,
    `Discrepancy between distanceAu and distanceFromSunMillionKm for ${p.name} exceeds 5% (${(discrepancy * 100).toFixed(2)}%)`
  );
}

// 1.4 Kepler's Third Law of Planetary Periods: T^2 / a^3 ≈ 1 (for T in Earth years, a in AU)
console.log("\n[1.4] Checking Kepler's Third Law for Orbital Periods (T^2 / a^3 ≈ 1.0):");
for (const pid of planetOrder) {
  const p = PLANETARY_DATA[pid];
  const T = p.orbitalPeriodYears;
  const a = p.distanceAu;
  const keplerRatio = (T * T) / Math.pow(a, 3);
  console.log(
    `  ${p.name.padEnd(8)}: T = ${T.toFixed(3)} yrs, a = ${a.toFixed(3)} AU -> T^2/a^3 = ${keplerRatio.toFixed(4)}`
  );
  // Real orbits have slight eccentricities and gravitational perturbations, but T^2 / a^3 should be ~ 1.00 ± 0.05
  assert.ok(
    Math.abs(keplerRatio - 1.0) < 0.05,
    `Kepler's 3rd law ratio (T^2 / a^3) for ${p.name} deviated from 1.0 by more than 5%: ${keplerRatio}`
  );
}

// 1.5 Orbital Period Days vs Years consistency: Days ≈ Years * 365.25
console.log('\n[1.5] Checking Orbital Period Days vs Years Conversion:');
for (const pid of planetOrder) {
  const p = PLANETARY_DATA[pid];
  const expectedDays = p.orbitalPeriodYears * 365.25;
  const diffPercent = Math.abs(expectedDays - p.orbitalPeriodDays) / p.orbitalPeriodDays;
  console.log(
    `  ${p.name.padEnd(8)}: ${p.orbitalPeriodDays} days vs ${p.orbitalPeriodYears} yrs * 365.25 = ${expectedDays.toFixed(2)} (diff ${(diffPercent * 100).toFixed(2)}%)`
  );
  assert.ok(
    diffPercent < 0.02,
    `Days vs Years mismatch for ${p.name} exceeds 2%`
  );
}

// 1.6 Orbital Speed Monotonicity & Keplerian Harmonic Velocity (v ∝ r^-0.5)
console.log('\n[1.6] Checking Orbital Speeds & Keplerian Harmonic Velocity (v ∝ r^-0.5):');
for (let i = 0; i < planetOrder.length - 1; i++) {
  const current = PLANETARY_DATA[planetOrder[i]];
  const next = PLANETARY_DATA[planetOrder[i + 1]];

  // Speeds must strictly decrease with distance from Sun
  assert.ok(
    current.orbitalSpeedKmS > next.orbitalSpeedKmS,
    `Orbital speed km/s must strictly decrease: ${current.name} (${current.orbitalSpeedKmS}) <= ${next.name} (${next.orbitalSpeedKmS})`
  );

  // Relative orbital speeds in RELATIVE_ORBITAL_SPEEDS must strictly decrease
  const currentRel = RELATIVE_ORBITAL_SPEEDS[planetOrder[i]];
  const nextRel = RELATIVE_ORBITAL_SPEEDS[planetOrder[i + 1]];
  assert.ok(
    currentRel > nextRel,
    `Relative orbital speed must strictly decrease: ${current.name} (${currentRel}) <= ${next.name} (${nextRel})`
  );
}

// Check v_rel ≈ 1 / sqrt(a_AU) harmonic progression
for (const pid of planetOrder) {
  const p = PLANETARY_DATA[pid];
  const theoreticalRelSpeed = 1 / Math.sqrt(p.distanceAu);
  const actualKmSpeedRatio = p.orbitalSpeedKmS / PLANETARY_DATA.earth.orbitalSpeedKmS;
  console.log(
    `  ${p.name.padEnd(8)}: km/s = ${p.orbitalSpeedKmS.toFixed(2)}, speedRatioToEarth = ${actualKmSpeedRatio.toFixed(3)}, 1/sqrt(a) = ${theoreticalRelSpeed.toFixed(3)}, configuredRel = ${RELATIVE_ORBITAL_SPEEDS[pid]}`
  );
  // Check that real km/s ratio matches 1 / sqrt(a) within 5%
  assert.ok(
    Math.abs(actualKmSpeedRatio - theoreticalRelSpeed) / theoreticalRelSpeed < 0.05,
    `Orbital speed km/s for ${p.name} does not follow Keplerian 1/sqrt(r) law`
  );
}

// 1.7 Axial Tilts, Rotational Direction & Extreme Physics
console.log('\n[1.7] Checking Axial Tilts & Special Physical Characteristics:');
// Uranus extreme tilt > 90°
assert.ok(
  PLANETARY_DATA.uranus.axialTiltDeg > 90 && PLANETARY_DATA.uranus.axialTiltDeg < 100,
  `Uranus axial tilt must be ~97.77°, got ${PLANETARY_DATA.uranus.axialTiltDeg}`
);
// Venus extreme retrograde tilt ~177.36°
assert.ok(
  PLANETARY_DATA.venus.axialTiltDeg > 170 && PLANETARY_DATA.venus.axialTiltDeg < 180,
  `Venus axial tilt must be ~177.36°, got ${PLANETARY_DATA.venus.axialTiltDeg}`
);
// Pluto retrograde tilt ~122.53°
assert.ok(
  PLANETARY_DATA.pluto.axialTiltDeg > 120 && PLANETARY_DATA.pluto.axialTiltDeg < 130,
  `Pluto axial tilt must be ~122.53°, got ${PLANETARY_DATA.pluto.axialTiltDeg}`
);
// Earth tilt ~23.44°
assert.ok(
  Math.abs(PLANETARY_DATA.earth.axialTiltDeg - 23.44) < 0.1,
  `Earth axial tilt must be ~23.44°, got ${PLANETARY_DATA.earth.axialTiltDeg}`
);
// Mars tilt ~25.19°
assert.ok(
  Math.abs(PLANETARY_DATA.mars.axialTiltDeg - 25.19) < 0.1,
  `Mars axial tilt must be ~25.19°, got ${PLANETARY_DATA.mars.axialTiltDeg}`
);
// Saturn tilt ~26.73°
assert.ok(
  Math.abs(PLANETARY_DATA.saturn.axialTiltDeg - 26.73) < 0.1,
  `Saturn axial tilt must be ~26.73°, got ${PLANETARY_DATA.saturn.axialTiltDeg}`
);

// Retrograde rotations have negative rotationPeriodHours
assert.ok(PLANETARY_DATA.venus.rotationPeriodHours < 0, 'Venus must have negative rotation period (retrograde)');
assert.ok(PLANETARY_DATA.uranus.rotationPeriodHours < 0, 'Uranus must have negative rotation period (retrograde)');
assert.ok(PLANETARY_DATA.pluto.rotationPeriodHours < 0, 'Pluto must have negative rotation period (retrograde)');

// Prograde rotations have positive rotationPeriodHours
assert.ok(PLANETARY_DATA.mercury.rotationPeriodHours > 0, 'Mercury rotation period must be positive');
assert.ok(PLANETARY_DATA.earth.rotationPeriodHours > 0, 'Earth rotation period must be positive');
assert.ok(PLANETARY_DATA.mars.rotationPeriodHours > 0, 'Mars rotation period must be positive');
assert.ok(PLANETARY_DATA.jupiter.rotationPeriodHours > 0, 'Jupiter rotation period must be positive');
assert.ok(PLANETARY_DATA.saturn.rotationPeriodHours > 0, 'Saturn rotation period must be positive');
assert.ok(PLANETARY_DATA.neptune.rotationPeriodHours > 0, 'Neptune rotation period must be positive');

// 1.8 Saturn Ring Flag & Planetary Ring Systems
console.log('\n[1.8] Checking Ring System Flags:');
assert.equal(PLANETARY_DATA.saturn.hasRings, true, 'Saturn must have hasRings = true');
assert.equal(PLANETARY_DATA.uranus.hasRings, true, 'Uranus must have hasRings = true');
assert.equal(PLANETARY_DATA.neptune.hasRings, true, 'Neptune must have hasRings = true');
assert.equal(PLANETARY_DATA.earth.hasRings, false, 'Earth hasRings = false');
assert.equal(PLANETARY_DATA.mars.hasRings, false, 'Mars hasRings = false');
assert.equal(PLANETARY_DATA.mercury.hasRings, false, 'Mercury hasRings = false');
assert.equal(PLANETARY_DATA.venus.hasRings, false, 'Venus hasRings = false');
assert.equal(PLANETARY_DATA.pluto.hasRings, false, 'Pluto hasRings = false');
assert.equal(PLANETARY_DATA.sun.hasRings, false, 'Sun hasRings = false');

// 1.9 Physical Diameters and Relative Diameters Consistency
console.log('\n[1.9] Checking Diameters vs Relative Diameters:');
const earthDiameter = PLANETARY_DATA.earth.diameterKm;
assert.equal(earthDiameter, 12742, 'Earth diameter must be 12,742 km');
for (const id of CELESTIAL_IDS) {
  const b = PLANETARY_DATA[id];
  const expectedRel = b.diameterKm / earthDiameter;
  const relDiff = Math.abs(expectedRel - b.relativeDiameter) / b.relativeDiameter;
  console.log(
    `  ${b.name.padEnd(8)}: diameter = ${b.diameterKm} km, relativeDiameter = ${b.relativeDiameter}, calculated = ${expectedRel.toFixed(3)} (diff ${(relDiff * 100).toFixed(2)}%)`
  );
  assert.ok(
    relDiff < 0.02,
    `Relative diameter for ${b.name} has discrepancy > 2% vs Earth baseline`
  );
}

// 1.10 Visual Scaled Pixel Radii Hierarchy
console.log('\n[1.10] Checking Visual Radii Hierarchy:');
assert.ok(PLANET_VISUAL_RADII.sun > PLANET_VISUAL_RADII.jupiter, 'Sun must be visually largest');
assert.ok(PLANET_VISUAL_RADII.jupiter > PLANET_VISUAL_RADII.saturn, 'Jupiter > Saturn visual radius');
assert.ok(PLANET_VISUAL_RADII.saturn > PLANET_VISUAL_RADII.uranus, 'Saturn > Uranus visual radius');
assert.ok(PLANET_VISUAL_RADII.uranus > PLANET_VISUAL_RADII.neptune, 'Uranus > Neptune visual radius');
assert.ok(PLANET_VISUAL_RADII.neptune > PLANET_VISUAL_RADII.earth, 'Neptune > Earth visual radius');
assert.ok(PLANET_VISUAL_RADII.earth > PLANET_VISUAL_RADII.venus, 'Earth > Venus visual radius');
assert.ok(PLANET_VISUAL_RADII.venus > PLANET_VISUAL_RADII.mars, 'Venus > Mars visual radius');
assert.ok(PLANET_VISUAL_RADII.mars > PLANET_VISUAL_RADII.mercury, 'Mars > Mercury visual radius');
assert.ok(PLANET_VISUAL_RADII.mercury > PLANET_VISUAL_RADII.pluto, 'Mercury > Pluto visual radius');

// 1.11 Gravity and Surface Acceleration (gravityG = gravityMs2 / 9.81)
console.log('\n[1.11] Checking Gravity Ms2 vs G-force:');
for (const id of CELESTIAL_IDS) {
  const b = PLANETARY_DATA[id];
  const calculatedG = b.gravityMs2 / 9.81;
  const gDiff = Math.abs(calculatedG - b.gravityG);
  console.log(
    `  ${b.name.padEnd(8)}: ${b.gravityMs2} m/s² -> ${b.gravityG} g (calculated ${calculatedG.toFixed(2)} g)`
  );
  assert.ok(
    gDiff < 0.05 || (gDiff / b.gravityG) < 0.05,
    `Gravity G-force for ${b.name} has discrepancy > 5%`
  );
}

// 1.12 Metadata Completeness & Scientific Facts
console.log('\n[1.12] Checking Descriptions, Taglines & Facts:');
for (const id of CELESTIAL_IDS) {
  const b = PLANETARY_DATA[id];
  assert.ok(b.name && b.name.length > 0, `${id} missing name`);
  assert.ok(b.subtitle && b.subtitle.length > 0, `${id} missing subtitle`);
  assert.ok(b.tagline && b.tagline.length > 0, `${id} missing tagline`);
  assert.ok(b.description && b.description.length > 50, `${id} description too short`);
  assert.equal(b.facts.length, 3, `${id} must have exactly 3 facts`);
  for (let f = 0; f < 3; f++) {
    assert.ok(b.facts[f].length > 20, `${id} fact ${f + 1} too short`);
  }
}

// 1.13 Helper Accessors & Type Guard
assert.equal(getCelestialBody('earth').id, 'earth');
assert.equal(getCelestialBody('unknown_xyz' as any).id, 'sun', 'Fallback to sun for unknown ID');
assert.equal(isValidCelestialId('jupiter'), true);
assert.equal(isValidCelestialId('sun'), true);
assert.equal(isValidCelestialId('nebula'), false);
assert.equal(isValidCelestialId(null), false);
assert.equal(isValidCelestialId(123), false);

console.log('\n✅ Suite 1 (Physical Consistency & Keplerian Mechanics) Passed 100%!\n');

// ============================================================================
// SUITE 2: Storage Load/Save Idempotence & Multi-Round Stress
// ============================================================================
console.log('--------------------------------------------------------------------------------');
console.log('💾 Running Suite 2: Storage Load/Save Idempotence & Multi-Round Stress');
console.log('--------------------------------------------------------------------------------');

mockStorage.clear();

// 2.1 Multi-Round Planetarium Target Idempotence (1,000 rounds)
console.log('\n[2.1] Testing 1,000 Rounds Target Save/Load Idempotence:');
for (let round = 0; round < 1000; round++) {
  const targetId = CELESTIAL_IDS[round % CELESTIAL_IDS.length];
  StorageService.savePlanetariumTarget(targetId);
  const loaded = StorageService.loadPlanetariumTarget();
  assert.equal(loaded, targetId, `Round ${round}: Expected ${targetId}, got ${loaded}`);

  // Idempotence check: loading repeatedly without saving yields identical value
  for (let repeat = 0; repeat < 5; repeat++) {
    assert.equal(StorageService.loadPlanetariumTarget(), targetId);
  }
}
console.log('  -> 1,000 target save/load cycles passed.');

// 2.2 Multi-Round AppMode Idempotence (1,000 rounds)
console.log('\n[2.2] Testing 1,000 Rounds AppMode Save/Load Idempotence:');
const validModes: AppMode[] = ['voice', 'chat', 'settings', 'tools', 'planetarium'];
for (let round = 0; round < 1000; round++) {
  const mode = validModes[round % validModes.length];
  StorageService.saveAppMode(mode);
  const loaded = StorageService.loadAppMode();
  assert.equal(loaded, mode, `Round ${round}: Expected ${mode}, got ${loaded}`);

  // Idempotence check
  for (let repeat = 0; repeat < 5; repeat++) {
    assert.equal(StorageService.loadAppMode(), mode);
  }
}
console.log('  -> 1,000 AppMode save/load cycles passed.');

// 2.3 Cross-Key Independence & Interleaved Writes (500 cycles)
console.log('\n[2.3] Testing Interleaved Concurrent Key Modifications:');
for (let i = 0; i < 500; i++) {
  const targetId = CELESTIAL_IDS[i % CELESTIAL_IDS.length];
  const mode = validModes[(i * 3) % validModes.length];

  StorageService.savePlanetariumTarget(targetId);
  StorageService.saveAppMode(mode);

  assert.equal(StorageService.loadPlanetariumTarget(), targetId);
  assert.equal(StorageService.loadAppMode(), mode);

  // Raw storage inspection
  assert.equal(mockStorage.getItem(STORAGE_KEYS.PLANETARIUM_TARGET), targetId);
  assert.equal(mockStorage.getItem(STORAGE_KEYS.APP_MODE), mode);
}
console.log('  -> 500 interleaved cross-key operations verified.');

// 2.4 Corrupted Storage Values & Fallback Idempotence
console.log('\n[2.4] Testing Fault Tolerance & Fallback Recovery:');
const corruptedValues = [
  '',
  '   ',
  'null',
  'undefined',
  'NaN',
  '{}',
  '{"id": "earth"}',
  '["earth"]',
  'supernova',
  'blackhole',
  'andromeda',
  '__proto__',
  'constructor',
  'toString',
  'hasOwnProperty',
  '12345',
  '<script>alert(1)</script>',
  'sun\0evil',
  'EARTH', // uppercase invalid
  'Mercury ', // trailing space
];

for (const badValue of corruptedValues) {
  mockStorage.setItem(STORAGE_KEYS.PLANETARIUM_TARGET, badValue);
  const loaded = StorageService.loadPlanetariumTarget('mars');
  assert.equal(
    loaded,
    'mars',
    `Should have fallen back to 'mars' for corrupted value "${badValue}", got "${loaded}"`
  );

  // Default fallback is 'sun'
  const loadedDefault = StorageService.loadPlanetariumTarget();
  assert.equal(
    loadedDefault,
    'sun',
    `Should have fallen back to default 'sun' for corrupted value "${badValue}", got "${loadedDefault}"`
  );

  // AppMode fallback
  mockStorage.setItem(STORAGE_KEYS.APP_MODE, badValue);
  const loadedMode = StorageService.loadAppMode();
  assert.equal(
    loadedMode,
    'voice',
    `Should have fallen back to default 'voice' for corrupted mode "${badValue}", got "${loadedMode}"`
  );
}
console.log(`  -> Handled ${corruptedValues.length} adversarial/corrupted strings safely.`);

// 2.5 Storage Exceptions (QuotaExceededError & SecurityError)
console.log('\n[2.5] Testing Storage Exceptions:');

// QuotaExceededError
mockStorage.throwOnSet = true;
assert.doesNotThrow(() => {
  StorageService.savePlanetariumTarget('jupiter');
}, 'savePlanetariumTarget must swallow QuotaExceededError');
assert.doesNotThrow(() => {
  StorageService.saveAppMode('planetarium');
}, 'saveAppMode must swallow QuotaExceededError');
mockStorage.throwOnSet = false;

// SecurityError
mockStorage.throwSecurityError = true;
assert.doesNotThrow(() => {
  const t = StorageService.loadPlanetariumTarget('earth');
  assert.equal(t, 'earth');
}, 'loadPlanetariumTarget must swallow SecurityError and return fallback');

assert.doesNotThrow(() => {
  const m = StorageService.loadAppMode();
  assert.equal(m, 'voice');
}, 'loadAppMode must swallow SecurityError and return fallback');

assert.doesNotThrow(() => {
  StorageService.savePlanetariumTarget('saturn');
}, 'savePlanetariumTarget must swallow SecurityError');
mockStorage.throwSecurityError = false;

console.log('  -> Exception tolerance verified.');
console.log('\n✅ Suite 2 (Storage Idempotence & Fault Tolerance) Passed 100%!\n');

console.log('================================================================================');
console.log('🎉 ALL EMPIRICAL VERIFICATION TESTS PASSED WITHOUT DEFECTS (100%)');
console.log('================================================================================');
