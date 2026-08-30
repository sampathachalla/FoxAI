import type { CelestialBodyData, CelestialId } from '../../types/index.ts';

export const CELESTIAL_IDS: CelestialId[] = [
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

export const PLANET_IDS: CelestialId[] = [
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

export const PLANETARY_DATA: Record<CelestialId, CelestialBodyData> = {
  sun: {
    id: 'sun',
    name: 'Sun',
    subtitle: 'Yellow Dwarf Star (G2V)',
    type: 'star',
    color: '#FFD700',
    secondaryColor: '#FF5500',
    glowColor: 'rgba(255, 180, 0, 0.70)',
    diameterKm: 1392700,
    relativeDiameter: 109.2,
    distanceFromSunMillionKm: 0,
    distanceAu: 0,
    orbitalRadiusScaled: 0,
    orbitalPeriodDays: 0,
    orbitalPeriodYears: 0,
    orbitalSpeedKmS: 0,
    rotationPeriodHours: 609.12, // ~25.38 Earth days at equator
    surfaceTemperatureC: '5,500°C (Photosphere)',
    surfaceTemperatureK: '5,778 K',
    gravityMs2: 274.0,
    gravityG: 27.94,
    moonsCount: 0,
    axialTiltDeg: 7.25,
    orbitalInclinationDeg: 0,
    hasRings: false,
    tagline: 'Luminous Gravitational Anchor of the Solar System',
    description:
      'The Sun is a yellow dwarf star comprising 99.86% of the solar system\'s total mass. Powered by core thermonuclear fusion converting 600 million tons of hydrogen into helium every second, its radiant energy illuminates and sustains all life on Earth.',
    facts: [
      'Contains 99.86% of all mass in the entire solar system, with a core temperature of ~15,000,000°C.',
      'Energy generated in the core takes over 100,000 years to reach the surface, but travels to Earth in just 8 minutes and 20 seconds.',
      'Drives dynamic solar winds, sunspots, and coronal mass ejections that shape the heliosphere across billions of kilometers.',
    ],
  },

  mercury: {
    id: 'mercury',
    name: 'Mercury',
    subtitle: 'Cratered Metallic World',
    type: 'terrestrial',
    color: '#A8A5A0',
    secondaryColor: '#6E6B66',
    glowColor: 'rgba(168, 165, 160, 0.45)',
    diameterKm: 4879,
    relativeDiameter: 0.383,
    distanceFromSunMillionKm: 57.9,
    distanceAu: 0.387,
    orbitalRadiusScaled: 45,
    orbitalPeriodDays: 87.97,
    orbitalPeriodYears: 0.241,
    orbitalSpeedKmS: 47.36,
    rotationPeriodHours: 1407.6, // 58.65 Earth days
    surfaceTemperatureC: '-180°C to 430°C',
    surfaceTemperatureK: '93 K to 703 K',
    gravityMs2: 3.7,
    gravityG: 0.38,
    moonsCount: 0,
    axialTiltDeg: 0.034,
    orbitalInclinationDeg: 7.0,
    hasRings: false,
    tagline: 'Sun-Scorched Innermost Planet with Drastic Extremes',
    description:
      'Mercury is the smallest and innermost planet in the Solar System. With virtually no atmosphere to trap heat, it experiences the most extreme diurnal temperature swings in the solar system, from cryogenic night shadows to molten daytime peaks.',
    facts: [
      'Undergoes extreme temperature swings from -180°C on the night side to 430°C on the sunlit face.',
      'Possesses a colossal iron core occupying ~85% of its total planetary radius.',
      'Locked in a 3:2 spin-orbit resonance, rotating exactly three times on its axis for every two solar orbits.',
    ],
  },

  venus: {
    id: 'venus',
    name: 'Venus',
    subtitle: 'Sulfuric Greenhouse Furnace',
    type: 'terrestrial',
    color: '#E8C382',
    secondaryColor: '#B87333',
    glowColor: 'rgba(232, 195, 130, 0.50)',
    diameterKm: 12104,
    relativeDiameter: 0.949,
    distanceFromSunMillionKm: 108.2,
    distanceAu: 0.723,
    orbitalRadiusScaled: 75,
    orbitalPeriodDays: 224.7,
    orbitalPeriodYears: 0.615,
    orbitalSpeedKmS: 35.02,
    rotationPeriodHours: -5832.5, // 243 Earth days retrograde
    surfaceTemperatureC: '465°C',
    surfaceTemperatureK: '738 K',
    gravityMs2: 8.87,
    gravityG: 0.9,
    moonsCount: 0,
    axialTiltDeg: 177.36,
    orbitalInclinationDeg: 3.39,
    hasRings: false,
    tagline: 'Runaway Greenhouse Cauldron & Earth\'s Volcanic Twin',
    description:
      'Venus is wrapped in a dense, super-rotating atmosphere composed of 96.5% carbon dioxide and shrouded by opaque clouds of sulfuric acid. The extreme runaway greenhouse effect maintains a surface hot enough to melt lead, beneath crushing surface pressures equivalent to ocean depths of 900 meters.',
    facts: [
      'Hottest planet in the Solar System with a steady surface temperature of ~465°C caused by runaway greenhouse gases.',
      'Rotates in retrograde (backward), causing the Sun to rise in the west and set in the east.',
      'Surface atmospheric pressure is 92 times greater than Earth\'s sea level pressure.',
    ],
  },

  earth: {
    id: 'earth',
    name: 'Earth',
    subtitle: 'The Dynamic Living Biosphere',
    type: 'terrestrial',
    color: '#3498DB',
    secondaryColor: '#2ECC71',
    glowColor: 'rgba(52, 152, 219, 0.60)',
    diameterKm: 12742,
    relativeDiameter: 1.0,
    distanceFromSunMillionKm: 149.6,
    distanceAu: 1.0,
    orbitalRadiusScaled: 110,
    orbitalPeriodDays: 365.25,
    orbitalPeriodYears: 1.0,
    orbitalSpeedKmS: 29.78,
    rotationPeriodHours: 23.934,
    surfaceTemperatureC: '-88°C to 58°C (avg 15°C)',
    surfaceTemperatureK: '185 K to 331 K (avg 288 K)',
    gravityMs2: 9.81,
    gravityG: 1.0,
    moonsCount: 1, // Luna
    axialTiltDeg: 23.44,
    orbitalInclinationDeg: 0.0,
    hasRings: false,
    tagline: 'Oasis of Liquid Water and Conscious Life',
    description:
      'Earth is the only known celestial sanctuary harboring conscious life. It features active plate tectonics, a protective magnetosphere powered by a molten iron outer core, nitrogen-oxygen atmosphere, and oceans of liquid water covering 71% of its surface.',
    facts: [
      'Only known planetary home to active surface plate tectonics, abundant liquid water, and conscious life.',
      'Protected by a robust magnetosphere that shields surface organisms from lethal solar coronal radiation.',
      'Accompanied by a disproportionately large natural satellite (the Moon) that stabilizes the 23.44° axial tilt.',
    ],
  },

  mars: {
    id: 'mars',
    name: 'Mars',
    subtitle: 'The Oxidized Red Frontier',
    type: 'terrestrial',
    color: '#E05638',
    secondaryColor: '#8E2812',
    glowColor: 'rgba(224, 86, 56, 0.50)',
    diameterKm: 6779,
    relativeDiameter: 0.532,
    distanceFromSunMillionKm: 227.9,
    distanceAu: 1.524,
    orbitalRadiusScaled: 150,
    orbitalPeriodDays: 686.98,
    orbitalPeriodYears: 1.881,
    orbitalSpeedKmS: 24.07,
    rotationPeriodHours: 24.623,
    surfaceTemperatureC: '-140°C to 20°C (avg -63°C)',
    surfaceTemperatureK: '133 K to 293 K (avg 210 K)',
    gravityMs2: 3.72,
    gravityG: 0.38,
    moonsCount: 2, // Phobos & Deimos
    axialTiltDeg: 25.19,
    orbitalInclinationDeg: 1.85,
    hasRings: false,
    tagline: 'Titan Volcanoes, Vast Canyons & Ancient Ocean Basins',
    description:
      'Mars is a desert world blanketed in iron oxide dust, giving it an iconic crimson appearance. It hosts immense geological formations including Olympus Mons, the solar system\'s highest volcano, and the colossal canyon network of Valles Marineris.',
    facts: [
      'Home to Olympus Mons, an extinct shield volcano standing 21.9 km tall — roughly 2.5 times Mount Everest\'s elevation.',
      'Valles Marineris stretches over 4,000 km across the equator and plunges up to 7 km deep.',
      'Harbors vast reserves of water ice locked within the polar caps and vast subterranean cryo-sheets.',
    ],
  },

  jupiter: {
    id: 'jupiter',
    name: 'Jupiter',
    subtitle: 'King of the Jovian Worlds',
    type: 'gas_giant',
    color: '#E0A96D',
    secondaryColor: '#A66A38',
    glowColor: 'rgba(224, 169, 109, 0.55)',
    diameterKm: 139820,
    relativeDiameter: 10.97,
    distanceFromSunMillionKm: 778.6,
    distanceAu: 5.204,
    orbitalRadiusScaled: 205,
    orbitalPeriodDays: 4332.59,
    orbitalPeriodYears: 11.862,
    orbitalSpeedKmS: 13.07,
    rotationPeriodHours: 9.925,
    surfaceTemperatureC: '-110°C (1 bar level)',
    surfaceTemperatureK: '163 K',
    gravityMs2: 24.79,
    gravityG: 2.53,
    moonsCount: 95,
    axialTiltDeg: 3.13,
    orbitalInclinationDeg: 1.3,
    hasRings: false,
    tagline: 'Colossal Gravitational Sovereign & Great Red Spot Vortex',
    description:
      'Jupiter is an immense gas giant containing more than double the combined mass of all other planets in our solar system. Its dynamic atmosphere is striped with counter-rotating jet streams and punctuated by the Great Red Spot, a vortex that has raged for hundreds of years.',
    facts: [
      'The Great Red Spot is an anticyclonic storm wider than Earth that has raged continuously for over 350 years.',
      'Spins faster than any other planet, completing a full rotation in just 9 hours and 55 minutes.',
      'Features 95 confirmed moons, including Ganymede (the solar system\'s largest moon) and volcanic Io.',
    ],
  },

  saturn: {
    id: 'saturn',
    name: 'Saturn',
    subtitle: 'The Crowned Ringed Wonder',
    type: 'gas_giant',
    color: '#EBD49D',
    secondaryColor: '#C2A662',
    glowColor: 'rgba(235, 212, 157, 0.55)',
    diameterKm: 116460,
    relativeDiameter: 9.14,
    distanceFromSunMillionKm: 1433.5,
    distanceAu: 9.582,
    orbitalRadiusScaled: 260,
    orbitalPeriodDays: 10759.22,
    orbitalPeriodYears: 29.457,
    orbitalSpeedKmS: 9.68,
    rotationPeriodHours: 10.54,
    surfaceTemperatureC: '-140°C (1 bar level)',
    surfaceTemperatureK: '133 K',
    gravityMs2: 10.44,
    gravityG: 1.06,
    moonsCount: 146,
    axialTiltDeg: 26.73,
    orbitalInclinationDeg: 2.49,
    hasRings: true,
    tagline: 'Majestic 3D Concentric Rings of Ice & Dust',
    description:
      'Saturn is world-renowned for its brilliant, extensive ring system composed of billions of water-ice particles, rock fragments, and silicate dust. Despite its colossal volume, it has the lowest mean density of any planet in the solar system, lower even than liquid water.',
    facts: [
      'Its spectacular ring system spans up to 282,000 km in diameter, yet is exceptionally thin at only ~10 to 30 meters.',
      'Has the lowest mean density (0.687 g/cm³) in the Solar System — low enough to float in a hypothetical cosmic bathtub.',
      'Surrounded by 146 known moons, including ocean-bearing Enceladus and haze-veiled Titan.',
    ],
  },

  uranus: {
    id: 'uranus',
    name: 'Uranus',
    subtitle: 'The Rolling Cyan Ice Giant',
    type: 'ice_giant',
    color: '#7DE8E8',
    secondaryColor: '#4AA8A8',
    glowColor: 'rgba(125, 232, 232, 0.50)',
    diameterKm: 50724,
    relativeDiameter: 3.98,
    distanceFromSunMillionKm: 2872.5,
    distanceAu: 19.201,
    orbitalRadiusScaled: 315,
    orbitalPeriodDays: 30685.4,
    orbitalPeriodYears: 84.01,
    orbitalSpeedKmS: 6.8,
    rotationPeriodHours: -17.24, // retrograde
    surfaceTemperatureC: '-195°C to -224°C',
    surfaceTemperatureK: '49 K to 78 K',
    gravityMs2: 8.69,
    gravityG: 0.89,
    moonsCount: 28,
    axialTiltDeg: 97.77,
    orbitalInclinationDeg: 0.77,
    hasRings: true,
    tagline: 'Sideways Orbit, Cryogenic Methane & Coldest World',
    description:
      'Uranus is an ice giant with a dramatic 97.77° axial tilt, causing its rotational axis to lie almost parallel to the plane of its orbit. Its pale cyan tint is created by atmospheric methane, which absorbs red wavelengths of sunlight.',
    facts: [
      'Rotates completely on its side with a 97.77° axial tilt, producing extreme 42-year polar day and night seasons.',
      'Recorded the coldest planetary atmospheric temperature in the Solar System at -224°C (49 K).',
      'The first planet identified using an astronomical telescope, discovered by William Herschel in 1781.',
    ],
  },

  neptune: {
    id: 'neptune',
    name: 'Neptune',
    subtitle: 'The Supersonic Azure Voyager',
    type: 'ice_giant',
    color: '#407BFF',
    secondaryColor: '#1A3B8B',
    glowColor: 'rgba(64, 123, 255, 0.55)',
    diameterKm: 49244,
    relativeDiameter: 3.86,
    distanceFromSunMillionKm: 4495.1,
    distanceAu: 30.047,
    orbitalRadiusScaled: 370,
    orbitalPeriodDays: 60189.0,
    orbitalPeriodYears: 164.79,
    orbitalSpeedKmS: 5.43,
    rotationPeriodHours: 16.11,
    surfaceTemperatureC: '-200°C',
    surfaceTemperatureK: '73 K',
    gravityMs2: 11.15,
    gravityG: 1.14,
    moonsCount: 16,
    axialTiltDeg: 28.32,
    orbitalInclinationDeg: 1.77,
    hasRings: true,
    tagline: 'Supersonic Winds, Deep Azure Storms & Triton Cryovolcanoes',
    description:
      'Neptune is the outermost major planet in the Solar System. Despite its immense distance from the Sun, it features the most violent atmospheric wind systems in the solar system, with wind gusts exceeding 2,100 km/h roaring across deep azure methane storms.',
    facts: [
      'Possesses the fastest atmospheric winds in the Solar System, surging past 2,100 km/h (1,300 mph).',
      'Takes nearly 165 Earth years to complete one orbit around the Sun; it completed its first post-discovery orbit in 2011.',
      'Its largest moon Triton exhibits cryovolcanic geysers that erupt nitrogen gas and icy dust plumes.',
    ],
  },

  pluto: {
    id: 'pluto',
    name: 'Pluto',
    subtitle: 'The Nitrogen Heart of the Kuiper Belt',
    type: 'dwarf_planet',
    color: '#C7A783',
    secondaryColor: '#7A5839',
    glowColor: 'rgba(199, 167, 131, 0.45)',
    diameterKm: 2376,
    relativeDiameter: 0.186,
    distanceFromSunMillionKm: 5906.4,
    distanceAu: 39.482,
    orbitalRadiusScaled: 425,
    orbitalPeriodDays: 90560.0,
    orbitalPeriodYears: 247.94,
    orbitalSpeedKmS: 4.74,
    rotationPeriodHours: -153.29, // retrograde
    surfaceTemperatureC: '-230°C to -223°C',
    surfaceTemperatureK: '43 K to 50 K',
    gravityMs2: 0.62,
    gravityG: 0.063,
    moonsCount: 5,
    axialTiltDeg: 122.53,
    orbitalInclinationDeg: 17.16,
    hasRings: false,
    tagline: 'Glacial Nitrogen Plains & Binary Kuiper Dance',
    description:
      'Pluto is a complex, active world in the Kuiper Belt boasting soaring water-ice mountains, towering dunes, and Tombaugh Regio — a colossal heart-shaped plain of churning nitrogen ice. It forms a unique binary system with its oversized companion moon Charon.',
    facts: [
      'Features Tombaugh Regio ("The Heart"), a vast 1,000-km-wide plain of convective nitrogen and methane ice glaciers.',
      'Forms a binary gravitational system with Charon; their mutual center of mass resides in open space outside Pluto.',
      'Travels along an eccentric, 17.16° inclined orbit that periodically brings it closer to the Sun than Neptune.',
    ],
  },
};

export const CELESTIAL_BODY_MAP: Record<CelestialId, CelestialBodyData> = PLANETARY_DATA;

export const CELESTIAL_BODIES: CelestialBodyData[] = CELESTIAL_IDS.map(
  (id) => PLANETARY_DATA[id]
);

export const PLANETS_ONLY: CelestialBodyData[] = PLANET_IDS.map(
  (id) => PLANETARY_DATA[id]
);

export function getCelestialBody(id: CelestialId): CelestialBodyData {
  return isValidCelestialId(id) ? PLANETARY_DATA[id] : PLANETARY_DATA.sun;
}

export function isValidCelestialId(id: unknown): id is CelestialId {
  return typeof id === 'string' && (CELESTIAL_IDS as readonly string[]).includes(id);
}

/**
 * Relative orbital speed multipliers for simulation animation (normalized relative to Earth = 1.0)
 * Uses Kepler's third law harmonic velocity: v_rel = (1 / sqrt(r_AU))
 */
export const RELATIVE_ORBITAL_SPEEDS: Record<CelestialId, number> = {
  sun: 0,
  mercury: 4.15,
  venus: 1.62,
  earth: 1.0,
  mars: 0.53,
  jupiter: 0.084,
  saturn: 0.034,
  uranus: 0.012,
  neptune: 0.006,
  pluto: 0.004,
};

/**
 * Visual radius multipliers (in canvas pixels) for 3D sphere projection rendering
 */
export const PLANET_VISUAL_RADII: Record<CelestialId, number> = {
  sun: 34,
  mercury: 4.5,
  venus: 8.5,
  earth: 9.0,
  mars: 6.0,
  jupiter: 22.0,
  saturn: 18.0,
  uranus: 13.0,
  neptune: 12.5,
  pluto: 3.5,
};
