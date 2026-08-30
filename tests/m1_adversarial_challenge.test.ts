/**
 * Milestone 1 Adversarial Challenge & Verification Test Suite
 * Evaluates:
 * 1. Scientific Data Completeness, Physics Bounds & Fact Checks for all 10 Celestial Bodies.
 * 2. Prototype Pollution & Type Guard Robustness for `isValidCelestialId` and `getCelestialBody`.
 * 3. Storage Service Resilience: malformed JSON, corrupted values, prototype pollution, QuotaExceededError, SecurityError.
 * 4. AppMode & Planetarium Target persistence and fallback mechanics.
 */

import { describe, it, beforeEach } from 'node:test';
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

import {
  StorageService,
  STORAGE_KEYS,
} from '../app/services/storage.ts';

import type { CelestialId, CelestialType, AppMode } from '../app/types/index.ts';

// In-memory mock localStorage for storage testing
class MockLocalStorage implements Storage {
  private store: Map<string, string> = new Map();
  public shouldThrowOnGet: boolean = false;
  public shouldThrowOnSet: boolean = false;
  public throwErrorType: Error = new Error('Storage access denied');

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    if (this.shouldThrowOnGet) throw this.throwErrorType;
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    if (this.shouldThrowOnSet) throw this.throwErrorType;
    this.store.set(key, String(value));
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys());
    return keys[index] || null;
  }
}

describe('M1 Challenger: Planetary Data Verification & Scientific Completeness', () => {
  const expectedAllIds: CelestialId[] = [
    'sun', 'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'
  ];

  const expectedPlanetIds: CelestialId[] = [
    'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'
  ];

  it('1.1 Array integrity and ID sets must match specifications exactly', () => {
    assert.equal(CELESTIAL_IDS.length, 10, 'CELESTIAL_IDS must have exactly 10 bodies');
    assert.deepEqual(CELESTIAL_IDS, expectedAllIds);
    assert.equal(PLANET_IDS.length, 9, 'PLANET_IDS must have exactly 9 planets');
    assert.deepEqual(PLANET_IDS, expectedPlanetIds);
    assert.equal(CELESTIAL_BODIES.length, 10);
    assert.equal(PLANETS_ONLY.length, 9);
    assert.equal(Object.keys(PLANETARY_DATA).length, 10);
  });

  it('1.2 Every celestial body must have complete non-empty string metadata and valid type', () => {
    const validTypes: CelestialType[] = ['star', 'terrestrial', 'gas_giant', 'ice_giant', 'dwarf_planet'];

    CELESTIAL_BODIES.forEach((body) => {
      assert.ok(body.id, 'id must be present');
      assert.ok(body.name && body.name.trim().length > 0, `${body.id}: name must be non-empty`);
      assert.ok(body.subtitle && body.subtitle.trim().length > 0, `${body.id}: subtitle must be non-empty`);
      assert.ok(validTypes.includes(body.type), `${body.id}: type ${body.type} must be one of CelestialType`);
      assert.ok(body.tagline && body.tagline.trim().length > 0, `${body.id}: tagline must be non-empty`);
      assert.ok(body.description && body.description.trim().length > 20, `${body.id}: description must be descriptive`);
      assert.ok(body.color && body.color.startsWith('#'), `${body.id}: color must be a hex string`);
      assert.ok(body.secondaryColor && body.secondaryColor.startsWith('#'), `${body.id}: secondaryColor must be a hex string`);
      assert.ok(body.glowColor && body.glowColor.startsWith('rgba('), `${body.id}: glowColor must be an rgba string`);
    });
  });

  it('1.3 Every celestial body must have exactly 3 rich, educational facts', () => {
    CELESTIAL_BODIES.forEach((body) => {
      assert.ok(Array.isArray(body.facts), `${body.id}: facts must be an array`);
      assert.equal(body.facts.length, 3, `${body.id}: facts must contain exactly 3 items`);
      body.facts.forEach((fact, idx) => {
        assert.equal(typeof fact, 'string', `${body.id}: fact[${idx}] must be a string`);
        assert.ok(fact.trim().length >= 20, `${body.id}: fact[${idx}] must be substantive (>20 chars): "${fact}"`);
      });
    });
  });

  it('1.4 Physical parameters must be strictly positive and mathematically valid', () => {
    CELESTIAL_BODIES.forEach((body) => {
      // Diameter
      assert.ok(body.diameterKm > 0, `${body.id}: diameterKm must be > 0 (got ${body.diameterKm})`);
      assert.ok(body.relativeDiameter > 0, `${body.id}: relativeDiameter must be > 0 (got ${body.relativeDiameter})`);
      assert.ok(Number.isFinite(body.diameterKm), `${body.id}: diameterKm must be finite`);

      // Gravity
      assert.ok(body.gravityMs2 > 0, `${body.id}: gravityMs2 must be > 0 (got ${body.gravityMs2})`);
      assert.ok(body.gravityG > 0, `${body.id}: gravityG must be > 0 (got ${body.gravityG})`);

      // Moons & Tilts
      assert.ok(body.moonsCount >= 0 && Number.isInteger(body.moonsCount), `${body.id}: moonsCount must be non-negative integer`);
      assert.ok(body.axialTiltDeg >= 0 && Number.isFinite(body.axialTiltDeg), `${body.id}: axialTiltDeg must be non-negative`);
      assert.ok(body.orbitalInclinationDeg >= 0 && Number.isFinite(body.orbitalInclinationDeg), `${body.id}: orbitalInclinationDeg must be non-negative`);

      // Rotation Period (can be negative for retrograde, but non-zero)
      assert.ok(body.rotationPeriodHours !== 0 && Number.isFinite(body.rotationPeriodHours), `${body.id}: rotationPeriodHours must be non-zero finite`);

      // Temperatures
      assert.ok(body.surfaceTemperatureC && body.surfaceTemperatureC.trim().length > 0);
      assert.ok(body.surfaceTemperatureK && body.surfaceTemperatureK.trim().length > 0);

      // Rings
      assert.equal(typeof body.hasRings, 'boolean', `${body.id}: hasRings must be boolean`);
    });
  });

  it('1.5 Orbital mechanics must conform to Keplerian sequence & monotonic distances', () => {
    const sun = PLANETARY_DATA.sun;
    assert.equal(sun.distanceFromSunMillionKm, 0);
    assert.equal(sun.distanceAu, 0);
    assert.equal(sun.orbitalRadiusScaled, 0);
    assert.equal(sun.orbitalPeriodDays, 0);
    assert.equal(sun.orbitalPeriodYears, 0);
    assert.equal(sun.orbitalSpeedKmS, 0);

    const planets = PLANETS_ONLY;
    for (let i = 0; i < planets.length - 1; i++) {
      const curr = planets[i];
      const next = planets[i + 1];

      // Distance from Sun must increase monotonically
      assert.ok(
        curr.distanceFromSunMillionKm < next.distanceFromSunMillionKm,
        `Distance Million Km must be monotonic: ${curr.id} (${curr.distanceFromSunMillionKm}) < ${next.id} (${next.distanceFromSunMillionKm})`
      );
      assert.ok(
        curr.distanceAu < next.distanceAu,
        `Distance AU must be monotonic: ${curr.id} (${curr.distanceAu}) < ${next.id} (${next.distanceAu})`
      );
      assert.ok(
        curr.orbitalRadiusScaled < next.orbitalRadiusScaled,
        `orbitalRadiusScaled must be monotonic: ${curr.id} (${curr.orbitalRadiusScaled}) < ${next.id} (${next.orbitalRadiusScaled})`
      );
      assert.ok(
        curr.orbitalPeriodDays < next.orbitalPeriodDays,
        `orbitalPeriodDays must be monotonic: ${curr.id} (${curr.orbitalPeriodDays}) < ${next.id} (${next.orbitalPeriodDays})`
      );

      // Orbital speed must decrease with distance (v ~ 1/sqrt(r))
      assert.ok(
        curr.orbitalSpeedKmS > next.orbitalSpeedKmS,
        `orbitalSpeedKmS must decrease with distance: ${curr.id} (${curr.orbitalSpeedKmS}) > ${next.id} (${next.orbitalSpeedKmS})`
      );
    }
  });

  it('1.6 Specific planetary physical benchmarks must match ground truth', () => {
    // Earth: 1.0 AU, 1 moon, ~365.25 days, ~23.44° tilt
    assert.equal(PLANETARY_DATA.earth.distanceAu, 1.0);
    assert.equal(PLANETARY_DATA.earth.moonsCount, 1);
    assert.equal(PLANETARY_DATA.earth.axialTiltDeg, 23.44);

    // Saturn: hasRings = true, 146 moons, 26.73° tilt
    assert.equal(PLANETARY_DATA.saturn.hasRings, true);
    assert.equal(PLANETARY_DATA.saturn.moonsCount, 146);

    // Uranus: hasRings = true, 97.77° tilt, retrograde rotation (<0)
    assert.equal(PLANETARY_DATA.uranus.hasRings, true);
    assert.equal(PLANETARY_DATA.uranus.axialTiltDeg, 97.77);
    assert.ok(PLANETARY_DATA.uranus.rotationPeriodHours < 0);

    // Pluto: dwarf_planet, 17.16° inclination, retrograde rotation (<0)
    assert.equal(PLANETARY_DATA.pluto.type, 'dwarf_planet');
    assert.equal(PLANETARY_DATA.pluto.orbitalInclinationDeg, 17.16);
    assert.ok(PLANETARY_DATA.pluto.rotationPeriodHours < 0);

    // Jupiter: 95 moons, largest diameter (>100,000 km)
    assert.equal(PLANETARY_DATA.jupiter.moonsCount, 95);
    assert.ok(PLANETARY_DATA.jupiter.diameterKm > 100000);
  });

  it('1.7 RELATIVE_ORBITAL_SPEEDS and PLANET_VISUAL_RADII constants coverage', () => {
    expectedAllIds.forEach((id) => {
      assert.ok(id in RELATIVE_ORBITAL_SPEEDS, `RELATIVE_ORBITAL_SPEEDS must contain ${id}`);
      assert.ok(typeof RELATIVE_ORBITAL_SPEEDS[id] === 'number');
      assert.ok(id in PLANET_VISUAL_RADII, `PLANET_VISUAL_RADII must contain ${id}`);
      assert.ok(PLANET_VISUAL_RADII[id] > 0, `PLANET_VISUAL_RADII[${id}] must be > 0`);
    });
    assert.equal(RELATIVE_ORBITAL_SPEEDS.sun, 0);
    assert.equal(RELATIVE_ORBITAL_SPEEDS.earth, 1.0);
  });
});

describe('M1 Challenger: Adversarial Stress on Type Guards & Accessors', () => {
  it('2.1 isValidCelestialId against valid celestial IDs', () => {
    const validIds = ['sun', 'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
    validIds.forEach((id) => {
      assert.equal(isValidCelestialId(id), true, `isValidCelestialId('${id}') should be true`);
    });
  });

  it('2.2 isValidCelestialId against invalid strings, casing, and whitespace', () => {
    const invalidStrings = [
      '', ' ', '   ', 'SUN', 'Sun', 'Mercury', 'EARTH', 'moon', 'ceres', 'titan',
      'andromeda', 'milkyway', 'galaxy', '123', 'null', 'undefined', 'sun ', ' earth'
    ];
    invalidStrings.forEach((str) => {
      assert.equal(isValidCelestialId(str), false, `isValidCelestialId('${str}') must be false`);
    });
  });

  it('2.3 isValidCelestialId against non-string datatypes', () => {
    const nonStrings = [
      null, undefined, 0, 1, -1, NaN, Infinity, -Infinity, true, false,
      {}, [], { id: 'sun' }, ['sun'], () => 'sun', Symbol('sun'), new Date(), /sun/
    ];
    nonStrings.forEach((val) => {
      assert.equal(isValidCelestialId(val), false, `isValidCelestialId(${String(val)}) must be false`);
    });
  });

  it('2.4 ADVERSARIAL: isValidCelestialId against Object Prototype Pollution keys', () => {
    const prototypeKeys = [
      'toString',
      'valueOf',
      'constructor',
      '__proto__',
      'hasOwnProperty',
      'isPrototypeOf',
      'propertyIsEnumerable',
      'toLocaleString',
    ];

    const failures: string[] = [];
    prototypeKeys.forEach((key) => {
      const result = isValidCelestialId(key);
      if (result === true) {
        failures.push(key);
      }
    });

    // NOTE: This documents whether isValidCelestialId correctly rejects prototype keys
    console.log('Prototype keys accepted by isValidCelestialId:', failures);
    assert.equal(
      failures.length,
      0,
      `VULNERABILITY: isValidCelestialId accepted prototype keys: ${failures.join(', ')}`
    );
  });

  it('2.5 ADVERSARIAL: getCelestialBody fallback behavior against prototype keys and unknown IDs', () => {
    // Valid access
    assert.equal(getCelestialBody('sun').name, 'Sun');
    assert.equal(getCelestialBody('earth').name, 'Earth');

    // Unknown string should safely return Sun data
    const fallbackUnknown = getCelestialBody('unknown_galaxy' as any);
    assert.equal(fallbackUnknown.id, 'sun', 'Unrecognized id should default to sun');
    assert.equal(fallbackUnknown.name, 'Sun');

    // Prototype keys should safely return Sun data (not Function or prototype object)
    const prototypeKeys = ['toString', 'valueOf', 'constructor', '__proto__', 'hasOwnProperty'];
    const invalidReturns: { key: string; returnedType: string; returnedVal: any }[] = [];

    prototypeKeys.forEach((key) => {
      const result = getCelestialBody(key as any);
      if (!result || typeof result !== 'object' || result.id !== 'sun' || typeof result.facts === 'undefined') {
        invalidReturns.push({
          key,
          returnedType: typeof result,
          returnedVal: result,
        });
      }
    });

    console.log('getCelestialBody prototype key test failures:', invalidReturns.map(f => `${f.key} => ${f.returnedType}`));
    assert.equal(
      invalidReturns.length,
      0,
      `VULNERABILITY: getCelestialBody returned non-celestial object on prototype keys: ${JSON.stringify(invalidReturns.map(f => f.key))}`
    );
  });
});

describe('M1 Challenger: Storage Service Adversarial Stress & Error Recovery', () => {
  let mockStorage: MockLocalStorage;

  beforeEach(() => {
    mockStorage = new MockLocalStorage();
    (globalThis as any).localStorage = mockStorage;
  });

  it('3.1 STORAGE_KEYS constants must match interface contract', () => {
    assert.equal(STORAGE_KEYS.APP_MODE, 'fox_app_mode_v1');
    assert.equal(STORAGE_KEYS.PLANETARIUM_TARGET, 'fox_planetarium_focused_target');
  });

  it('3.2 loadAppMode validates all 5 valid AppModes', () => {
    const validModes: AppMode[] = ['voice', 'chat', 'settings', 'tools', 'planetarium'];
    validModes.forEach((mode) => {
      mockStorage.setItem(STORAGE_KEYS.APP_MODE, mode);
      assert.equal(StorageService.loadAppMode(), mode, `Should load mode ${mode}`);
    });
  });

  it('3.3 loadAppMode handles corrupted, malformed, and prototype pollution storage values', () => {
    const corruptedValues = [
      '', '   ', 'PLANETARIUM', 'VOICE', 'game', 'dashboard', 'admin',
      '{"mode":"voice"}', '[1,2,3]', 'null', 'undefined', 'NaN',
      '__proto__', 'constructor', 'toString', 'valueOf', 'hasOwnProperty'
    ];

    corruptedValues.forEach((val) => {
      mockStorage.setItem(STORAGE_KEYS.APP_MODE, val);
      assert.equal(
        StorageService.loadAppMode(),
        'voice',
        `Corrupted mode value "${val}" must fall back to "voice"`
      );
    });
  });

  it('3.4 loadAppMode handles missing localStorage key gracefully', () => {
    mockStorage.clear();
    assert.equal(StorageService.loadAppMode(), 'voice');
  });

  it('3.5 saveAppMode persists modes and handles storage exceptions', () => {
    StorageService.saveAppMode('planetarium');
    assert.equal(mockStorage.getItem(STORAGE_KEYS.APP_MODE), 'planetarium');

    // Simulate QuotaExceededError / SecurityError
    mockStorage.shouldThrowOnSet = true;
    mockStorage.throwErrorType = new DOMException('QuotaExceededError', 'QuotaExceededError');

    // Should not throw
    assert.doesNotThrow(() => {
      StorageService.saveAppMode('chat');
    });
  });

  it('3.6 loadPlanetariumTarget validates all 10 CelestialIds', () => {
    const allIds: CelestialId[] = [
      'sun', 'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'
    ];
    allIds.forEach((id) => {
      mockStorage.setItem(STORAGE_KEYS.PLANETARIUM_TARGET, id);
      assert.equal(StorageService.loadPlanetariumTarget(), id, `Should load target ${id}`);
    });
  });

  it('3.7 loadPlanetariumTarget falls back on corrupted strings, missing keys, and prototype pollution', () => {
    const corruptedValues = [
      '', '  ', 'SUN', 'EARTH', 'moon', 'titan', 'ceres', 'andromeda',
      '{"target":"earth"}', '123', 'true', 'null', 'undefined',
      '__proto__', 'constructor', 'toString', 'valueOf', 'hasOwnProperty'
    ];

    corruptedValues.forEach((val) => {
      mockStorage.setItem(STORAGE_KEYS.PLANETARIUM_TARGET, val);
      assert.equal(
        StorageService.loadPlanetariumTarget('earth'),
        'earth',
        `Corrupted target "${val}" must return specified fallback "earth"`
      );
      assert.equal(
        StorageService.loadPlanetariumTarget(),
        'sun',
        `Corrupted target "${val}" must return default fallback "sun"`
      );
    });
  });

  it('3.8 savePlanetariumTarget persists target and catches storage exceptions', () => {
    StorageService.savePlanetariumTarget('saturn');
    assert.equal(mockStorage.getItem(STORAGE_KEYS.PLANETARIUM_TARGET), 'saturn');

    // Simulate SecurityError
    mockStorage.shouldThrowOnSet = true;
    mockStorage.throwErrorType = new DOMException('The operation is insecure.', 'SecurityError');

    // Should not throw
    assert.doesNotThrow(() => {
      StorageService.savePlanetariumTarget('jupiter');
    });
  });

  it('3.9 StorageService handles storage read exceptions gracefully (SecurityError in private mode)', () => {
    mockStorage.shouldThrowOnGet = true;
    mockStorage.throwErrorType = new DOMException('SecurityError', 'SecurityError');

    assert.equal(StorageService.loadAppMode(), 'voice');
    assert.equal(StorageService.loadPlanetariumTarget('mars'), 'mars');
    assert.equal(StorageService.loadPlanetariumTarget(), 'sun');
    assert.ok(Array.isArray(StorageService.loadSessions()));
    assert.ok(Array.isArray(StorageService.loadMessages()));
    assert.ok(Array.isArray(StorageService.loadReminders()));
    assert.ok(Array.isArray(StorageService.loadNotes()));
    assert.ok(Array.isArray(StorageService.loadPromptTemplates()));
    assert.ok(StorageService.loadTheme());
    assert.equal(StorageService.loadCoreShape(), 'sphere');
    assert.ok(StorageService.loadVoicePreferences());
    assert.ok(StorageService.loadDeviceSettings());
    assert.equal(StorageService.loadSettingsTab(), 'theme');
    assert.ok(StorageService.loadEnginePreferences());
    assert.ok(Array.isArray(StorageService.loadHeaderQuickOptions()));
    assert.ok(StorageService.loadEngineTelemetry());
    assert.ok(StorageService.loadVoiceTelemetry());
  });
});
