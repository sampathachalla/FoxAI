/**
 * Interface contracts, types, and constants for Fox AI 3D Planetarium Mode Testing
 */

export type AppMode = 'voice' | 'chat' | 'settings' | 'tools' | 'planetarium';

export type CelestialId =
  | 'sun'
  | 'mercury'
  | 'venus'
  | 'earth'
  | 'mars'
  | 'jupiter'
  | 'saturn'
  | 'uranus'
  | 'neptune'
  | 'pluto';

export type CelestialType =
  | 'star'
  | 'terrestrial'
  | 'gas_giant'
  | 'ice_giant'
  | 'dwarf_planet';

export interface CelestialBodyData {
  id: CelestialId;
  name: string;
  subtitle: string;
  type: CelestialType;
  color: string;
  secondaryColor: string;
  glowColor: string;
  diameterKm: number;
  relativeDiameter: number;
  distanceFromSunMillionKm: number;
  distanceAu: number;
  orbitalRadiusScaled: number;
  orbitalPeriodDays: number;
  orbitalPeriodYears: number;
  orbitalSpeedKmS: number;
  rotationPeriodHours: number;
  surfaceTemperatureC: string;
  surfaceTemperatureK: string;
  gravityMs2: number;
  gravityG: number;
  moonsCount: number;
  axialTiltDeg: number;
  orbitalInclinationDeg: number;
  hasRings?: boolean;
  tagline: string;
  description: string;
  facts: [string, string, string];
}

export const STORAGE_KEYS = {
  APP_MODE: 'fox_app_mode_v1',
  PLANETARIUM_TARGET: 'fox_planetarium_focused_target',
  SESSIONS: 'fox_sessions_v3',
  THEME: 'fox_accent_theme_v1',
  SETTINGS_TAB: 'fox_settings_tab_v1',
};

export const CELESTIAL_BODIES: CelestialBodyData[] = [
  {
    id: 'sun',
    name: 'Sun',
    subtitle: 'Yellow Dwarf Star (G2V)',
    type: 'star',
    color: '#FFB703',
    secondaryColor: '#FB8500',
    glowColor: 'rgba(255, 183, 3, 0.85)',
    diameterKm: 1392700,
    relativeDiameter: 109.2,
    distanceFromSunMillionKm: 0,
    distanceAu: 0,
    orbitalRadiusScaled: 0,
    orbitalPeriodDays: 0,
    orbitalPeriodYears: 0,
    orbitalSpeedKmS: 0,
    rotationPeriodHours: 609.12, // ~25.38 days differential equator
    surfaceTemperatureC: '5,500°C',
    surfaceTemperatureK: '5,778 K',
    gravityMs2: 274.0,
    gravityG: 27.9,
    moonsCount: 0,
    axialTiltDeg: 7.25,
    orbitalInclinationDeg: 0,
    tagline: 'Luminous Solar Core',
    description: 'The gravitational anchor and primary energy powerhouse of the solar system, generating multi-tiered plasma flares and coronal mass ejections.',
    facts: [
      'Accounts for 99.86% of all mass in the entire Solar System.',
      'Core temperature exceeds 15 million °C, sustaining continuous hydrogen-to-helium nuclear fusion.',
      'Emits solar wind that sculpts the heliosphere across interstellar space.',
    ],
  },
  {
    id: 'mercury',
    name: 'Mercury',
    subtitle: 'Swift Swift-Winged Terrestrial',
    type: 'terrestrial',
    color: '#A89F91',
    secondaryColor: '#D4AF37',
    glowColor: 'rgba(168, 159, 145, 0.65)',
    diameterKm: 4879,
    relativeDiameter: 0.383,
    distanceFromSunMillionKm: 57.9,
    distanceAu: 0.387,
    orbitalRadiusScaled: 62,
    orbitalPeriodDays: 88.0,
    orbitalPeriodYears: 0.24,
    orbitalSpeedKmS: 47.4,
    rotationPeriodHours: 1407.6,
    surfaceTemperatureC: '-180°C to 430°C',
    surfaceTemperatureK: '93 K to 703 K',
    gravityMs2: 3.7,
    gravityG: 0.38,
    moonsCount: 0,
    axialTiltDeg: 0.034,
    orbitalInclinationDeg: 7.0,
    tagline: 'Innermost Cratering Relic',
    description: 'The smallest and innermost planet, possessing extreme temperature swings between day and night and a heavily cratered silicate crust.',
    facts: [
      'Has the shortest orbital year of any planet in the solar system (88 Earth days).',
      'Exhibits a 3:2 spin-orbit resonance, rotating three times for every two orbits around the Sun.',
      'Contains water ice in permanently shadowed polar craters despite searing daytime temperatures.',
    ],
  },
  {
    id: 'venus',
    name: 'Venus',
    subtitle: 'Sulfuric Greenhouse Inferno',
    type: 'terrestrial',
    color: '#E0A96D',
    secondaryColor: '#C47B2B',
    glowColor: 'rgba(224, 169, 109, 0.70)',
    diameterKm: 12104,
    relativeDiameter: 0.949,
    distanceFromSunMillionKm: 108.2,
    distanceAu: 0.723,
    orbitalRadiusScaled: 92,
    orbitalPeriodDays: 224.7,
    orbitalPeriodYears: 0.615,
    orbitalSpeedKmS: 35.0,
    rotationPeriodHours: -5832.5, // Retrograde
    surfaceTemperatureC: '464°C',
    surfaceTemperatureK: '737 K',
    gravityMs2: 8.87,
    gravityG: 0.90,
    moonsCount: 0,
    axialTiltDeg: 177.36,
    orbitalInclinationDeg: 3.39,
    tagline: 'Shrouded Volcanic Sister',
    description: 'Earth’s twin in size and mass, wrapped in dense toxic carbon dioxide clouds and sulfuric acid haze that produce a runaway greenhouse effect.',
    facts: [
      'Hottest planet in the solar system, hot enough to melt lead at 464°C.',
      'Rotates backwards (retrograde) compared to most planets; the Sun rises in the west and sets in the east.',
      'Surface atmospheric pressure is 92 times greater than Earth’s sea level.',
    ],
  },
  {
    id: 'earth',
    name: 'Earth',
    subtitle: 'The Blue Marble Oasis',
    type: 'terrestrial',
    color: '#4CC9F0',
    secondaryColor: '#4361EE',
    glowColor: 'rgba(76, 201, 240, 0.80)',
    diameterKm: 12742,
    relativeDiameter: 1.0,
    distanceFromSunMillionKm: 149.6,
    distanceAu: 1.0,
    orbitalRadiusScaled: 126,
    orbitalPeriodDays: 365.25,
    orbitalPeriodYears: 1.0,
    orbitalSpeedKmS: 29.8,
    rotationPeriodHours: 23.93,
    surfaceTemperatureC: '15°C (mean)',
    surfaceTemperatureK: '288 K',
    gravityMs2: 9.81,
    gravityG: 1.0,
    moonsCount: 1,
    axialTiltDeg: 23.44,
    orbitalInclinationDeg: 0.0,
    tagline: 'Biosphere Sanctuary & Moon',
    description: 'The only known world to harbor active biological life, dynamic liquid water oceans, protective magnetic field, and a large natural satellite.',
    facts: [
      'Only planet in the universe confirmed to support life and liquid surface oceans.',
      'Protected by a dynamic magnetosphere generated by a molten iron-nickel outer core.',
      'Orbited by the Moon, which stabilizes Earth’s axial tilt and drives oceanic tides.',
    ],
  },
  {
    id: 'mars',
    name: 'Mars',
    subtitle: 'The Red Planet',
    type: 'terrestrial',
    color: '#E63946',
    secondaryColor: '#9D0208',
    glowColor: 'rgba(230, 57, 70, 0.75)',
    diameterKm: 6779,
    relativeDiameter: 0.532,
    distanceFromSunMillionKm: 227.9,
    distanceAu: 1.524,
    orbitalRadiusScaled: 162,
    orbitalPeriodDays: 687.0,
    orbitalPeriodYears: 1.88,
    orbitalSpeedKmS: 24.1,
    rotationPeriodHours: 24.62,
    surfaceTemperatureC: '-63°C',
    surfaceTemperatureK: '210 K',
    gravityMs2: 3.71,
    gravityG: 0.38,
    moonsCount: 2,
    axialTiltDeg: 25.19,
    orbitalInclinationDeg: 1.85,
    tagline: 'Iron Oxide Desert',
    description: 'A rusty desert world of towering dormant volcanoes, gargantuan canyon rift systems, and polar ice caps with ancient river valley networks.',
    facts: [
      'Home to Olympus Mons, the tallest planetary shield volcano in the solar system (22 km high).',
      'Valles Marineris canyon stretches over 4,000 km, spanning almost a quarter of Mars’s circumference.',
      'Possesses two tiny irregularly shaped captured asteroid moons: Phobos and Deimos.',
    ],
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    subtitle: 'King of the Gas Giants',
    type: 'gas_giant',
    color: '#F4A261',
    secondaryColor: '#E76F51',
    glowColor: 'rgba(244, 162, 97, 0.75)',
    diameterKm: 139820,
    relativeDiameter: 10.97,
    distanceFromSunMillionKm: 778.6,
    distanceAu: 5.204,
    orbitalRadiusScaled: 218,
    orbitalPeriodDays: 4332.6,
    orbitalPeriodYears: 11.86,
    orbitalSpeedKmS: 13.1,
    rotationPeriodHours: 9.93,
    surfaceTemperatureC: '-108°C',
    surfaceTemperatureK: '165 K',
    gravityMs2: 24.79,
    gravityG: 2.53,
    moonsCount: 95,
    axialTiltDeg: 3.13,
    orbitalInclinationDeg: 1.30,
    tagline: 'Great Red Spot Storm Engine',
    description: 'The solar system’s most massive planet, featuring turbulent cloud bands, an immense persistent anticyclonic storm, and a miniature solar system of 95 moons.',
    facts: [
      'More than twice as massive as all other solar system planets combined.',
      'The Great Red Spot is a persistent high-pressure storm larger than the entire planet Earth.',
      'Generates an enormous magnetosphere emitting intense synchrotron radiation belts.',
    ],
  },
  {
    id: 'saturn',
    name: 'Saturn',
    subtitle: 'The Ringed Jewel',
    type: 'gas_giant',
    color: '#F9C74F',
    secondaryColor: '#DDA15E',
    glowColor: 'rgba(249, 199, 79, 0.80)',
    diameterKm: 116460,
    relativeDiameter: 9.14,
    distanceFromSunMillionKm: 1433.5,
    distanceAu: 9.582,
    orbitalRadiusScaled: 278,
    orbitalPeriodDays: 10759.2,
    orbitalPeriodYears: 29.45,
    orbitalSpeedKmS: 9.7,
    rotationPeriodHours: 10.7,
    surfaceTemperatureC: '-139°C',
    surfaceTemperatureK: '134 K',
    gravityMs2: 10.44,
    gravityG: 1.06,
    moonsCount: 146,
    axialTiltDeg: 26.73,
    orbitalInclinationDeg: 2.49,
    hasRings: true,
    tagline: '3D Concentric Ring System',
    description: 'A pale golden gas giant celebrated for its stunning, intricate system of thousands of concentric ice and rock rings divided by the Cassini gap.',
    facts: [
      'Has the most extensive ring system in the solar system, spanning up to 282,000 km yet only ~10-30 meters thick.',
      'Lowest mean density of any planet (0.687 g/cm³)—it would float in a sufficiently large ocean of water.',
      'Hosts 146 recognized moons, including Titan with methane lakes and Enceladus with subsurface geysers.',
    ],
  },
  {
    id: 'uranus',
    name: 'Uranus',
    subtitle: 'The Sideways Ice Giant',
    type: 'ice_giant',
    color: '#70E0D8',
    secondaryColor: '#48CAE4',
    glowColor: 'rgba(112, 224, 216, 0.75)',
    diameterKm: 50724,
    relativeDiameter: 3.98,
    distanceFromSunMillionKm: 2872.5,
    distanceAu: 19.2,
    orbitalRadiusScaled: 342,
    orbitalPeriodDays: 30687.2,
    orbitalPeriodYears: 84.0,
    orbitalSpeedKmS: 6.8,
    rotationPeriodHours: -17.24, // Retrograde
    surfaceTemperatureC: '-197°C',
    surfaceTemperatureK: '76 K',
    gravityMs2: 8.69,
    gravityG: 0.89,
    moonsCount: 28,
    axialTiltDeg: 97.77,
    orbitalInclinationDeg: 0.77,
    tagline: 'Extreme 97.8° Axial Tilt',
    description: 'An aquamarine ice giant dominated by atmospheric methane, ammonia, and water ices, famous for rolling almost entirely on its side along its 84-year orbit.',
    facts: [
      'Axial tilt of 97.77° means its poles point almost directly at the Sun, causing 42 years of continuous daylight followed by 42 years of night.',
      'Possesses the coldest planetary atmosphere in the solar system, dipping to -224°C (49 K).',
      'Surrounded by 13 faint concentric rings and 28 known icy moons named after Shakespearean characters.',
    ],
  },
  {
    id: 'neptune',
    name: 'Neptune',
    subtitle: 'The Supersonic Storm Giant',
    type: 'ice_giant',
    color: '#0077B6',
    secondaryColor: '#03045E',
    glowColor: 'rgba(0, 119, 182, 0.80)',
    diameterKm: 49244,
    relativeDiameter: 3.86,
    distanceFromSunMillionKm: 4495.1,
    distanceAu: 30.05,
    orbitalRadiusScaled: 406,
    orbitalPeriodDays: 60190.0,
    orbitalPeriodYears: 164.8,
    orbitalSpeedKmS: 5.4,
    rotationPeriodHours: 16.11,
    surfaceTemperatureC: '-201°C',
    surfaceTemperatureK: '72 K',
    gravityMs2: 11.15,
    gravityG: 1.14,
    moonsCount: 16,
    axialTiltDeg: 28.32,
    orbitalInclinationDeg: 1.77,
    tagline: 'Azure Supersonic Winds',
    description: 'The outermost major planet, a deep cobalt ice giant wracked by the fastest recorded winds in the solar system reaching supersonic speeds up to 2,100 km/h.',
    facts: [
      'First planet mathematically predicted by orbital perturbations before being visually discovered in 1846.',
      'Features supersonic winds exceeding 2,100 km/h (1,300 mph), faster than the speed of sound on Earth.',
      'Orbited retrograde by Triton, a geologically active icy moon with cryovolcanoes that was likely captured from the Kuiper Belt.',
    ],
  },
  {
    id: 'pluto',
    name: 'Pluto',
    subtitle: 'The Kuiper Belt Outpost',
    type: 'dwarf_planet',
    color: '#C6AC8F',
    secondaryColor: '#5E503F',
    glowColor: 'rgba(198, 172, 143, 0.65)',
    diameterKm: 2376,
    relativeDiameter: 0.186,
    distanceFromSunMillionKm: 5906.4,
    distanceAu: 39.48,
    orbitalRadiusScaled: 472,
    orbitalPeriodDays: 90560.0,
    orbitalPeriodYears: 248.0,
    orbitalSpeedKmS: 4.7,
    rotationPeriodHours: -153.3,
    surfaceTemperatureC: '-229°C',
    surfaceTemperatureK: '44 K',
    gravityMs2: 0.62,
    gravityG: 0.06,
    moonsCount: 5,
    axialTiltDeg: 122.53,
    orbitalInclinationDeg: 17.16,
    tagline: 'Extreme 17.16° Inclination',
    description: 'A complex dwarf planet of nitrogen ice plains, towering water-ice mountain ranges, and an exceptionally inclined (17.16°) eccentric orbit.',
    facts: [
      'Possesses a highly inclined orbit (17.16°) that brings it closer to the Sun than Neptune for 20 years of its 248-year orbit.',
      'Features Tombaugh Regio, a massive bright heart-shaped glacier primarily composed of frozen nitrogen.',
      'Forms a binary system with its giant moon Charon; they are tidally locked, facing the exact same side toward each other perpetually.',
    ],
  },
];

export const CELESTIAL_BODY_MAP: Record<CelestialId, CelestialBodyData> = {
  sun: CELESTIAL_BODIES[0],
  mercury: CELESTIAL_BODIES[1],
  venus: CELESTIAL_BODIES[2],
  earth: CELESTIAL_BODIES[3],
  mars: CELESTIAL_BODIES[4],
  jupiter: CELESTIAL_BODIES[5],
  saturn: CELESTIAL_BODIES[6],
  uranus: CELESTIAL_BODIES[7],
  neptune: CELESTIAL_BODIES[8],
  pluto: CELESTIAL_BODIES[9],
};

export function isValidCelestialId(val: unknown): val is CelestialId {
  return (
    val === 'sun' ||
    val === 'mercury' ||
    val === 'venus' ||
    val === 'earth' ||
    val === 'mars' ||
    val === 'jupiter' ||
    val === 'saturn' ||
    val === 'uranus' ||
    val === 'neptune' ||
    val === 'pluto'
  );
}

export function normalizeCelestialId(val: unknown, fallback: CelestialId = 'sun'): CelestialId {
  if (isValidCelestialId(val)) {
    return val as CelestialId;
  }
  return fallback;
}

export function isValidAppMode(val: unknown): val is AppMode {
  return (
    val === 'voice' ||
    val === 'chat' ||
    val === 'settings' ||
    val === 'tools' ||
    val === 'planetarium'
  );
}

export function normalizeAppMode(val: unknown, fallback: AppMode = 'voice'): AppMode {
  if (isValidAppMode(val)) {
    return val as AppMode;
  }
  return fallback;
}
