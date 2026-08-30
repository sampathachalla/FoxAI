/**
 * Fox AI 3D Planetarium Simulation — Procedural Shaders, Plasma Generators,
 * 3D Saturn Ring Rasterizer, Planetary Surface Discs & Holographic Vector Tracks.
 */

import type { CelestialBodyData, CelestialId } from '../../types/index.ts';
import { CELESTIAL_BODY_MAP, PLANET_VISUAL_RADII } from './PlanetaryData.ts';

// ---------------------------------------------------------------------------
// 1. Color and Math Utilities
// ---------------------------------------------------------------------------

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface ProjectedPoint2D {
  screenX: number;
  screenY: number;
  screenZ: number;
  scale: number;
}

export interface StarParticle {
  x: number;
  y: number;
  z: number;
  size: number;
  baseAlpha: number;
  twinkleSpeed: number;
  twinkleOffset: number;
  color: string;
}

export interface SolarFlareParams {
  coreRadius: number;
  coronalGlowRadius: number;
  prominenceCount: number;
  prominenceScale: number;
  flareIntensity: number;
  bassEnergy: number;
}

export interface ProjectedBodyItem {
  id: CelestialId;
  name: string;
  worldPos: Point3D;
  screenX: number;
  screenY: number;
  screenZ: number;
  scale: number;
  screenRadius: number;
  color: string;
  glowColor: string;
  glowRadius: number;
  data: CelestialBodyData;
  isHovered: boolean;
  isSelected: boolean;
}

export interface SaturnRingSegment {
  innerRadius: number;
  outerRadius: number;
  worldPos: Point3D;
  screenX: number;
  screenY: number;
  screenZ: number;
  scale: number;
  isFront: boolean;
  alpha: number;
  color: string;
  angle: number;
}

/**
 * Fast hex to RGB component converter with safe fallback.
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let clean = (hex || '#FFFFFF').replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) {
    return { r: 255, g: 255, b: 255 };
  }
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/**
 * Formats hex color string to rgba string with custom alpha.
 */
export function rgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  const clampedAlpha = Math.max(0, Math.min(1, alpha));
  return `rgba(${r}, ${g}, ${b}, ${clampedAlpha.toFixed(3)})`;
}

/**
 * Linear color interpolation between two hex colors.
 */
export function lerpColor(hexA: string, hexB: string, factor: number): string {
  const f = Math.max(0, Math.min(1, factor));
  const rgbA = hexToRgb(hexA);
  const rgbB = hexToRgb(hexB);
  const r = Math.round(rgbA.r + (rgbB.r - rgbA.r) * f);
  const g = Math.round(rgbA.g + (rgbB.g - rgbA.g) * f);
  const b = Math.round(rgbA.b + (rgbB.b - rgbA.b) * f);
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * 2D Sinusoidal multi-octave turbulence function for fast procedural textures.
 */
export function proceduralTurbulence(
  x: number,
  y: number,
  time: number,
  octaves: number = 3
): number {
  let val = 0;
  let freq = 1.0;
  let amp = 0.5;
  let maxAmp = 0;

  for (let i = 0; i < octaves; i++) {
    val += amp * (
      Math.sin(x * freq + time * 0.8 * (i + 1) + i * 1.7) *
      Math.cos(y * freq * 1.3 - time * 0.6 * (i + 1) + i * 2.3)
    );
    maxAmp += amp;
    freq *= 2.1;
    amp *= 0.5;
  }

  return (val / maxAmp + 1.0) * 0.5; // Normalized to [0, 1]
}

// ---------------------------------------------------------------------------
// 2. Starfield & Deep Space Background Generator
// ---------------------------------------------------------------------------

/**
 * Generates a deterministic multi-depth 3D spherical starfield.
 */
export function createStarfield(count: number = 320): StarParticle[] {
  const stars: StarParticle[] = [];
  const starColors = ['#FFFFFF', '#E0F7FF', '#99FFFF', '#FFE4B5', '#D8BFD8', '#B0E0E6'];

  for (let i = 0; i < count; i++) {
    // Generate uniform random points on sphere shell (radius ~1200 - 2400)
    const u = Math.random() * 2 - 1;
    const phi = Math.random() * Math.PI * 2;
    const r = 1200 + Math.random() * 1200;
    const cosU = Math.sqrt(Math.max(0, 1 - u * u));

    const x = r * cosU * Math.cos(phi);
    const y = r * u;
    const z = r * cosU * Math.sin(phi);

    const size = Math.random() < 0.85 ? 0.75 + Math.random() * 1.0 : 1.8 + Math.random() * 1.4;
    const baseAlpha = 0.35 + Math.random() * 0.55;
    const twinkleSpeed = 1.2 + Math.random() * 3.5;
    const twinkleOffset = Math.random() * Math.PI * 2;
    const color = starColors[i % starColors.length];

    stars.push({
      x,
      y,
      z,
      size,
      baseAlpha,
      twinkleSpeed,
      twinkleOffset,
      color,
    });
  }

  return stars;
}

/**
 * Renders the 3D spherical starfield with camera parallax and subtle twinkling.
 */
export function renderStarfield(
  ctx: CanvasRenderingContext2D,
  stars: StarParticle[],
  camera: { yaw: number; pitch: number; zoom: number },
  width: number,
  height: number,
  time: number
): void {
  const cx = width / 2;
  const cy = height / 2;
  const cosYaw = Math.cos(camera.yaw);
  const sinYaw = Math.sin(camera.yaw);
  const cosPitch = Math.cos(camera.pitch);
  const sinPitch = Math.sin(camera.pitch);

  // 1. Ambient Deep Space Cosmic Nebular Glow (Radial Gradients)
  const nebulaGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, Math.max(width, height) * 0.75);
  nebulaGrad.addColorStop(0, 'rgba(8, 14, 28, 0.40)');
  nebulaGrad.addColorStop(0.5, 'rgba(4, 7, 16, 0.60)');
  nebulaGrad.addColorStop(1, 'rgba(1, 2, 6, 0.95)');
  ctx.fillStyle = nebulaGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Subtle Cyan/Violet Deep Space Galactic Clouds
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  
  const g1 = ctx.createRadialGradient(cx * 0.4, cy * 0.3, 10, cx * 0.4, cy * 0.3, width * 0.5);
  g1.addColorStop(0, 'rgba(0, 180, 255, 0.035)');
  g1.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, width, height);

  const g2 = ctx.createRadialGradient(cx * 1.6, cy * 1.4, 10, cx * 1.6, cy * 1.4, width * 0.45);
  g2.addColorStop(0, 'rgba(180, 80, 255, 0.025)');
  g2.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = g2;
  ctx.fillRect(0, 0, width, height);

  // 3. Render Stars with Euler Camera 3D Parallax Rotation
  for (let i = 0; i < stars.length; i++) {
    const s = stars[i];

    // Euler rotation (yaw around Y, pitch around X)
    const x1 = s.x * cosYaw - s.z * sinYaw;
    const z1 = s.x * sinYaw + s.z * cosYaw;
    const y2 = s.y * cosPitch - z1 * sinPitch;
    const z2 = s.y * sinPitch + z1 * cosPitch;

    // Only render stars in front hemisphere or projected onto skybox dome
    const fov = 1400;
    const depth = Math.max(200, fov + z2 * 0.4);
    const scale = fov / depth;

    const sx = cx + x1 * scale * 0.5;
    const sy = cy + y2 * scale * 0.5;

    if (sx < -20 || sx > width + 20 || sy < -20 || sy > height + 20) continue;

    // Twinkle modulation
    const twinkle = Math.sin(time * s.twinkleSpeed + s.twinkleOffset) * 0.25;
    const alpha = Math.max(0.1, Math.min(1.0, s.baseAlpha + twinkle));
    const starSize = Math.max(0.6, s.size * (scale * 0.6));

    ctx.fillStyle = rgba(s.color, alpha);
    ctx.beginPath();
    ctx.arc(sx, sy, starSize, 0, Math.PI * 2);
    ctx.fill();

    // Occasional bright star halo
    if (s.size > 2.0 && alpha > 0.6) {
      ctx.fillStyle = rgba(s.color, alpha * 0.25);
      ctx.beginPath();
      ctx.arc(sx, sy, starSize * 2.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

// ---------------------------------------------------------------------------
// 3. Central Luminous Sun & Audio-Reactive Coronal Flares
// ---------------------------------------------------------------------------

/**
 * Computes dynamic solar flare and corona expansion parameters.
 */
export function computeSolarFlareParams(
  time: number,
  audioLevel: number = 0,
  frequencyData: Uint8Array | null = null
): SolarFlareParams {
  const rawAudio = typeof audioLevel === 'number' && !isNaN(audioLevel) ? audioLevel : 0;
  const clampedAudio = Math.max(0, Math.min(1.0, rawAudio));

  // Extract bass frequency energy if available
  let bassEnergy = clampedAudio;
  if (frequencyData && frequencyData.length > 0) {
    const bassBins = Math.max(1, Math.floor(frequencyData.length * 0.15));
    let sum = 0;
    for (let i = 0; i < bassBins; i++) sum += frequencyData[i];
    bassEnergy = sum / (bassBins * 255);
  }

  const baseCore = PLANET_VISUAL_RADII.sun; // 34px
  const breathing = Math.sin(time * 3.5) * 1.8;
  const audioPulse = clampedAudio * 6.0 + bassEnergy * 5.0;

  const coreRadius = baseCore + breathing * 0.3 + audioPulse * 0.4;
  const coronalGlowRadius = baseCore * 2.8 + breathing * 3.5 + audioPulse * 3.2;
  const prominenceCount = 14 + Math.floor(clampedAudio * 16);
  const prominenceScale = 1.0 + clampedAudio * 0.95 + bassEnergy * 0.55 + Math.sin(time * 4.8) * 0.15;
  const flareIntensity = 0.75 + clampedAudio * 0.25;

  return {
    coreRadius,
    coronalGlowRadius,
    prominenceCount,
    prominenceScale,
    flareIntensity,
    bassEnergy,
  };
}

/**
 * Renders the Central Luminous Sun with multi-tier plasma core, dynamic
 * coronal prominence loops, convection granulation, and audio reactivity.
 */
export function renderSun(
  ctx: CanvasRenderingContext2D,
  item: ProjectedBodyItem,
  flareParams: SolarFlareParams,
  time: number
): void {
  const { screenX, screenY, scale, isHovered, isSelected } = item;
  const coreRadius = flareParams.coreRadius * scale;
  const glowRadius = flareParams.coronalGlowRadius * scale;

  ctx.save();

  // -------------------------------------------------------------------------
  // A. Multi-Layer Outer Coronal Radial Glow (Additive Blending)
  // -------------------------------------------------------------------------
  ctx.globalCompositeOperation = 'screen';

  // 1. Far Ambient Halo
  const farHaloGrad = ctx.createRadialGradient(
    screenX,
    screenY,
    coreRadius * 0.8,
    screenX,
    screenY,
    glowRadius * 1.8
  );
  farHaloGrad.addColorStop(0, `rgba(255, 140, 0, ${0.45 * flareParams.flareIntensity})`);
  farHaloGrad.addColorStop(0.35, `rgba(255, 90, 0, ${0.22 * flareParams.flareIntensity})`);
  farHaloGrad.addColorStop(0.7, `rgba(200, 30, 0, ${0.08 * flareParams.flareIntensity})`);
  farHaloGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = farHaloGrad;
  ctx.beginPath();
  ctx.arc(screenX, screenY, glowRadius * 1.8, 0, Math.PI * 2);
  ctx.fill();

  // 2. Mid Intense Chromosphere Corona
  const midCoronaGrad = ctx.createRadialGradient(
    screenX,
    screenY,
    coreRadius * 0.5,
    screenX,
    screenY,
    glowRadius
  );
  midCoronaGrad.addColorStop(0, 'rgba(255, 250, 200, 0.95)');
  midCoronaGrad.addColorStop(0.25, 'rgba(255, 215, 0, 0.85)');
  midCoronaGrad.addColorStop(0.55, 'rgba(255, 107, 0, 0.50)');
  midCoronaGrad.addColorStop(0.85, 'rgba(220, 34, 0, 0.18)');
  midCoronaGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = midCoronaGrad;
  ctx.beginPath();
  ctx.arc(screenX, screenY, glowRadius, 0, Math.PI * 2);
  ctx.fill();

  // -------------------------------------------------------------------------
  // B. Dynamic Solar Flare Prominence Loops & Eruption Arcs
  // -------------------------------------------------------------------------
  const count = flareParams.prominenceCount;
  for (let k = 0; k < count; k++) {
    const baseAngle = (k / count) * Math.PI * 2;
    const wave = Math.sin(7 * baseAngle + time * 3.8 + k * 1.3);
    const flareLen = coreRadius * (1.20 + 0.50 * wave * flareParams.prominenceScale);
    const flareSpan = (Math.PI / count) * 1.2;

    const angle1 = baseAngle - flareSpan * 0.5;
    const angle2 = baseAngle + flareSpan * 0.5;

    const p1x = screenX + coreRadius * Math.cos(angle1);
    const p1y = screenY + coreRadius * Math.sin(angle1);
    const p2x = screenX + coreRadius * Math.cos(angle2);
    const p2y = screenY + coreRadius * Math.sin(angle2);

    // Arch apex
    const apexX = screenX + flareLen * Math.cos(baseAngle);
    const apexY = screenY + flareLen * Math.sin(baseAngle);

    // Prominence Bezier Magnetic Loop
    ctx.strokeStyle = `rgba(255, ${Math.floor(140 + wave * 60)}, 0, ${0.75 * flareParams.flareIntensity})`;
    ctx.lineWidth = Math.max(1.2, 2.2 * scale);
    ctx.beginPath();
    ctx.moveTo(p1x, p1y);
    ctx.quadraticCurveTo(apexX, apexY, p2x, p2y);
    ctx.stroke();

    // Hot tip plasma spark
    ctx.fillStyle = `rgba(255, 240, 180, ${0.85 * flareParams.flareIntensity})`;
    ctx.beginPath();
    ctx.arc(apexX, apexY, Math.max(1.0, 2.0 * scale), 0, Math.PI * 2);
    ctx.fill();
  }

  // -------------------------------------------------------------------------
  // C. Incandescent Photosphere Core & Convective Granulation
  // -------------------------------------------------------------------------
  ctx.globalCompositeOperation = 'source-over';

  const coreGrad = ctx.createRadialGradient(
    screenX - coreRadius * 0.15,
    screenY - coreRadius * 0.15,
    0,
    screenX,
    screenY,
    coreRadius
  );
  coreGrad.addColorStop(0, '#FFFFFF');
  coreGrad.addColorStop(0.35, '#FFF6D6');
  coreGrad.addColorStop(0.68, '#FFD700');
  coreGrad.addColorStop(0.88, '#FF6B00');
  coreGrad.addColorStop(1.0, '#CC2200');

  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(screenX, screenY, coreRadius, 0, Math.PI * 2);
  ctx.fill();

  // Subtle plasma granulation swirling overlay
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.clip(); // Clip to solar core sphere

  const numGranules = 12;
  for (let g = 0; g < numGranules; g++) {
    const ga = (g / numGranules) * Math.PI * 2 + time * 0.4;
    const gr = coreRadius * (0.2 + 0.65 * Math.sin(g * 2.7 + time));
    const gx = screenX + gr * Math.cos(ga);
    const gy = screenY + gr * Math.sin(ga);
    const gSize = coreRadius * (0.18 + 0.12 * Math.cos(g * 3.1));

    const granGrad = ctx.createRadialGradient(gx, gy, 0, gx, gy, gSize);
    granGrad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
    granGrad.addColorStop(0.6, 'rgba(255, 180, 0, 0.25)');
    granGrad.addColorStop(1, 'rgba(200, 40, 0, 0)');

    ctx.fillStyle = granGrad;
    ctx.beginPath();
    ctx.arc(gx, gy, gSize, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // -------------------------------------------------------------------------
  // D. Selected / Hovered Holographic Reticle Overlay
  // -------------------------------------------------------------------------
  if (isSelected || isHovered) {
    renderCelestialSelectionReticle(ctx, screenX, screenY, coreRadius, '#FFD700', time, isSelected);
  }

  ctx.restore();
}

// ---------------------------------------------------------------------------
// 4. Procedural Planetary Surface Textures & Shading
// ---------------------------------------------------------------------------

/**
 * Master dispatcher for rendering any planet surface disc with accurate
 * astronomical traits, day/night lighting, and Fresnel atmospheric limbs.
 */
export function renderPlanet(
  ctx: CanvasRenderingContext2D,
  item: ProjectedBodyItem,
  sunScreenPos: { x: number; y: number },
  time: number
): void {
  const { id, screenX, screenY, screenRadius, scale, isHovered, isSelected, data } = item;
  const radius = Math.max(2.5, screenRadius);

  ctx.save();

  // 1. Calculate Sunward Light Vector in Screen Space
  const dxToSun = sunScreenPos.x - screenX;
  const dyToSun = sunScreenPos.y - screenY;
  const distToSun = Math.hypot(dxToSun, dyToSun) || 1;
  const sunDirX = dxToSun / distToSun;
  const sunDirY = dyToSun / distToSun;

  // 2. Render Planet-Specific Surface
  switch (id) {
    case 'mercury':
      renderMercurySurface(ctx, screenX, screenY, radius, sunDirX, sunDirY, time);
      break;
    case 'venus':
      renderVenusSurface(ctx, screenX, screenY, radius, sunDirX, sunDirY, time);
      break;
    case 'earth':
      renderEarthSurface(ctx, screenX, screenY, radius, sunDirX, sunDirY, scale, time);
      break;
    case 'mars':
      renderMarsSurface(ctx, screenX, screenY, radius, sunDirX, sunDirY, time);
      break;
    case 'jupiter':
      renderJupiterSurface(ctx, screenX, screenY, radius, sunDirX, sunDirY, time);
      break;
    case 'saturn':
      renderSaturnSurface(ctx, screenX, screenY, radius, sunDirX, sunDirY, time);
      break;
    case 'uranus':
      renderUranusSurface(ctx, screenX, screenY, radius, sunDirX, sunDirY, time);
      break;
    case 'neptune':
      renderNeptuneSurface(ctx, screenX, screenY, radius, sunDirX, sunDirY, time);
      break;
    case 'pluto':
      renderPlutoSurface(ctx, screenX, screenY, radius, sunDirX, sunDirY, time);
      break;
    default:
      renderGenericPlanetSurface(ctx, screenX, screenY, radius, sunDirX, sunDirY, data.color);
      break;
  }

  // 3. Selection / Hover HUD Reticle
  if (isSelected || isHovered) {
    renderCelestialSelectionReticle(ctx, screenX, screenY, radius, data.color, time, isSelected);
  }

  ctx.restore();
}

/**
 * Mercury: Cratered rocky slate regolith, stark day/night terminator, specular sun highlight.
 */
function renderMercurySurface(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  sunDirX: number,
  sunDirY: number,
  time: number
): void {
  // Base sphere clip
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();

  // Base metallic regolith
  const baseGrad = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
  baseGrad.addColorStop(0, '#A8A5A0');
  baseGrad.addColorStop(0.5, '#7A7772');
  baseGrad.addColorStop(1, '#4A4845');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);

  // Impact craters
  const craters = [
    { cx: -0.3, cy: -0.2, cr: 0.28 },
    { cx: 0.25, cy: 0.35, cr: 0.22 },
    { cx: -0.15, cy: 0.45, cr: 0.18 },
    { cx: 0.4, cy: -0.3, cr: 0.15 },
  ];
  for (const c of craters) {
    const px = x + c.cx * r;
    const py = y + c.cy * r;
    const pr = c.cr * r;

    ctx.fillStyle = '#383633';
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fill();

    // Crater bright rim on sunward side
    ctx.strokeStyle = '#C2BFBA';
    ctx.lineWidth = Math.max(0.6, r * 0.08);
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI);
    ctx.stroke();
  }

  // 3D Spherical Day/Night Terminator Shading
  applySphericalLighting(ctx, x, y, r, sunDirX, sunDirY, 0.0);

  ctx.restore();
}

/**
 * Venus: Dense swirling sulfuric acid clouds, high-albedo golden limb glow.
 */
function renderVenusSurface(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  sunDirX: number,
  sunDirY: number,
  time: number
): void {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();

  // Warm sulfuric base
  const baseGrad = ctx.createLinearGradient(x - r, y, x + r, y);
  baseGrad.addColorStop(0, '#FFF0D0');
  baseGrad.addColorStop(0.4, '#E8C382');
  baseGrad.addColorStop(0.8, '#C49A45');
  baseGrad.addColorStop(1, '#8A6220');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);

  // Swirling retrograde cloud haze bands
  const numBands = 5;
  for (let b = 0; b < numBands; b++) {
    const by = y + ((b - 2) / 2.5) * r;
    const bHeight = r * 0.35;
    const wave = Math.sin(time * 0.8 + b * 1.5) * (r * 0.1);

    ctx.fillStyle = b % 2 === 0 ? 'rgba(255, 245, 220, 0.35)' : 'rgba(180, 130, 50, 0.25)';
    ctx.beginPath();
    ctx.ellipse(x + wave, by, r * 0.95, bHeight, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3D Spherical Day/Night Terminator Shading
  applySphericalLighting(ctx, x, y, r, sunDirX, sunDirY, 0.25);

  ctx.restore();

  // High albedo golden atmospheric Fresnel limb glow
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const limbGrad = ctx.createRadialGradient(x, y, r * 0.7, x, y, r * 1.25);
  limbGrad.addColorStop(0, 'rgba(255, 230, 160, 0)');
  limbGrad.addColorStop(0.75, 'rgba(240, 200, 120, 0.45)');
  limbGrad.addColorStop(1, 'rgba(220, 170, 80, 0)');
  ctx.fillStyle = limbGrad;
  ctx.beginPath();
  ctx.arc(x, y, r * 1.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Earth: Deep azure oceans, emerald/terra continents, dynamic cloud layers,
 * luminous cyan Fresnel atmosphere (#00E5FF), and Moon orbit.
 */
function renderEarthSurface(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  sunDirX: number,
  sunDirY: number,
  scale: number,
  time: number
): void {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();

  // 1. Deep Ocean Azure Base
  const oceanGrad = ctx.createRadialGradient(x, y, 0, x, y, r);
  oceanGrad.addColorStop(0, '#2B7CD3');
  oceanGrad.addColorStop(0.7, '#1A5DA8');
  oceanGrad.addColorStop(1, '#0C3266');
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);

  // 2. Procedural Continents (Emerald/Forest Landmasses)
  const continents = [
    // Eurasia / Africa
    { cx: -0.15, cy: -0.2, rx: 0.55, ry: 0.45, rot: 0.2 },
    // Americas
    { cx: 0.45, cy: 0.15, rx: 0.35, ry: 0.60, rot: -0.3 },
    // Australia / Oceania
    { cx: -0.35, cy: 0.45, rx: 0.25, ry: 0.20, rot: 0.1 },
  ];

  for (const c of continents) {
    const cx = x + c.cx * r;
    const cy = y + c.cy * r;
    ctx.fillStyle = '#2E8B57';
    ctx.beginPath();
    ctx.ellipse(cx, cy, c.rx * r, c.ry * r, c.rot, 0, Math.PI * 2);
    ctx.fill();

    // Continent interior warm terra highlight
    ctx.fillStyle = '#3CB371';
    ctx.beginPath();
    ctx.ellipse(cx, cy, c.rx * r * 0.6, c.ry * r * 0.6, c.rot, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3. Counter-Rotating Cloud Swirls
  const cloudTime = time * 0.5;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.70)';
  for (let cl = 0; cl < 4; cl++) {
    const ca = cl * 1.5 + cloudTime;
    const cDist = r * (0.3 + 0.4 * Math.sin(cl * 2.3));
    const clx = x + Math.cos(ca) * cDist;
    const cly = y + Math.sin(ca) * cDist * 0.6;
    ctx.beginPath();
    ctx.ellipse(clx, cly, r * 0.45, r * 0.18, ca * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4. Day/Night Spherical Lighting
  applySphericalLighting(ctx, x, y, r, sunDirX, sunDirY, 0.15);

  ctx.restore();

  // 5. Luminous Cyan Fresnel Atmosphere (#00E5FF)
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const atmosGrad = ctx.createRadialGradient(x, y, r * 0.75, x, y, r * 1.35);
  atmosGrad.addColorStop(0, 'rgba(0, 229, 255, 0)');
  atmosGrad.addColorStop(0.7, 'rgba(0, 200, 255, 0.45)');
  atmosGrad.addColorStop(1, 'rgba(0, 140, 255, 0)');
  ctx.fillStyle = atmosGrad;
  ctx.beginPath();
  ctx.arc(x, y, r * 1.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 6. Luna (Moon Companion Orbit)
  renderEarthMoon(ctx, x, y, r, scale, sunDirX, sunDirY, time);
}

/**
 * Earth's Moon (Luna) Companion Orbit Renderer.
 */
function renderEarthMoon(
  ctx: CanvasRenderingContext2D,
  earthX: number,
  earthY: number,
  earthRadius: number,
  scale: number,
  sunDirX: number,
  sunDirY: number,
  time: number
): void {
  const moonDist = earthRadius * 2.4;
  const moonSpeed = 2.4;
  const moonAngle = time * moonSpeed;
  const moonX = earthX + moonDist * Math.cos(moonAngle);
  const moonY = earthY + moonDist * Math.sin(moonAngle) * 0.4;
  const moonRadius = Math.max(1.2, earthRadius * 0.27);

  // Moon orbit track line (faint cyan)
  ctx.save();
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.12)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.ellipse(earthX, earthY, moonDist, moonDist * 0.4, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Moon sphere
  ctx.beginPath();
  ctx.arc(moonX, moonY, moonRadius, 0, Math.PI * 2);
  ctx.fillStyle = '#D6D6D6';
  ctx.fill();

  // Moon shading
  applySphericalLighting(ctx, moonX, moonY, moonRadius, sunDirX, sunDirY, 0.0);
  ctx.restore();
}

/**
 * Mars: Rust red, iron oxide ochre, polar ice caps, Valles Marineris canyon.
 */
function renderMarsSurface(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  sunDirX: number,
  sunDirY: number,
  time: number
): void {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();

  // Iron oxide red gradient
  const marsGrad = ctx.createRadialGradient(x, y, 0, x, y, r);
  marsGrad.addColorStop(0, '#E05638');
  marsGrad.addColorStop(0.65, '#C84A22');
  marsGrad.addColorStop(1, '#7A2210');
  ctx.fillStyle = marsGrad;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);

  // Valles Marineris equatorial canyon shadow
  ctx.strokeStyle = '#5E1B0E';
  ctx.lineWidth = Math.max(0.8, r * 0.12);
  ctx.beginPath();
  ctx.moveTo(x - r * 0.6, y + r * 0.08);
  ctx.quadraticCurveTo(x, y + r * 0.18, x + r * 0.5, y + r * 0.05);
  ctx.stroke();

  // Syrtis Major dark volcanic region
  ctx.fillStyle = '#6E2012';
  ctx.beginPath();
  ctx.ellipse(x + r * 0.25, y - r * 0.2, r * 0.35, r * 0.22, -0.4, 0, Math.PI * 2);
  ctx.fill();

  // North & South Frozen Polar Ice Caps (#E8F8FF)
  ctx.fillStyle = '#E8F8FF';
  // North cap
  ctx.beginPath();
  ctx.ellipse(x, y - r * 0.85, r * 0.38, r * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  // South cap
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.88, r * 0.32, r * 0.15, 0, 0, Math.PI * 2);
  ctx.fill();

  // 3D Spherical Day/Night Terminator Shading
  applySphericalLighting(ctx, x, y, r, sunDirX, sunDirY, 0.08);

  ctx.restore();
}

/**
 * Jupiter: Alternating zonal jet stream bands, Great Red Spot vortex with internal swirl.
 */
function renderJupiterSurface(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  sunDirX: number,
  sunDirY: number,
  time: number
): void {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();

  // Base warm ochre
  ctx.fillStyle = '#E0A96D';
  ctx.fillRect(x - r, y - r, r * 2, r * 2);

  // Alternating Jovian Cloud Bands (cream, ochre, russet, dark brown)
  const bands = [
    { pos: -0.75, h: 0.18, color: '#A66A38' }, // Polar zone
    { pos: -0.52, h: 0.14, color: '#F7E7CE' }, // North Temp Zone
    { pos: -0.32, h: 0.22, color: '#8C3A16' }, // North Equatorial Belt
    { pos: -0.05, h: 0.18, color: '#FFF2DB' }, // Equatorial Zone
    { pos: 0.20, h: 0.24, color: '#A64B20' },  // South Equatorial Belt (Hosts GRS)
    { pos: 0.48, h: 0.16, color: '#F5DEB3' },  // South Temp Zone
    { pos: 0.72, h: 0.20, color: '#804018' },  // South Polar Region
  ];

  for (const b of bands) {
    const by = y + b.pos * r;
    const bh = b.h * r;
    const wave = Math.sin(time * 0.4 + b.pos * 4.0) * (r * 0.04);

    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.ellipse(x + wave, by, r * 1.1, bh, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Great Red Spot (GRS) at 22° South with internal swirling vortex
  const grsAngle = time * 0.25;
  const grsX = x + Math.cos(grsAngle) * (r * 0.45);
  const grsY = y + r * 0.25; // 22°S latitude
  const grsRx = r * 0.24;
  const grsRy = r * 0.15;

  // GRS Outer Red Oval
  ctx.fillStyle = '#B3261E';
  ctx.beginPath();
  ctx.ellipse(grsX, grsY, grsRx, grsRy, 0.08, 0, Math.PI * 2);
  ctx.fill();

  // GRS Inner Swirl Core
  ctx.fillStyle = '#E85B42';
  ctx.beginPath();
  ctx.ellipse(grsX, grsY, grsRx * 0.55, grsRy * 0.55, 0.1, 0, Math.PI * 2);
  ctx.fill();

  // GRS White turbulence wake
  ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.beginPath();
  ctx.ellipse(grsX - grsRx * 1.2, grsY, grsRx * 0.4, grsRy * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();

  // 3D Spherical Day/Night Terminator Shading
  applySphericalLighting(ctx, x, y, r, sunDirX, sunDirY, 0.20);

  ctx.restore();
}

/**
 * Saturn: Golden beige/butterscotch atmospheric bands, polar hexagon hint.
 */
function renderSaturnSurface(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  sunDirX: number,
  sunDirY: number,
  time: number
): void {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();

  // Golden beige base
  ctx.fillStyle = '#EBD49D';
  ctx.fillRect(x - r, y - r, r * 2, r * 2);

  // Butterscotch atmospheric bands
  const bands = [
    { pos: -0.65, h: 0.20, color: '#C2A662' },
    { pos: -0.30, h: 0.18, color: '#DFBE7C' },
    { pos: 0.0, h: 0.22, color: '#FFF0C8' },
    { pos: 0.35, h: 0.20, color: '#D4B066' },
    { pos: 0.65, h: 0.25, color: '#A8853D' },
  ];

  for (const b of bands) {
    const by = y + b.pos * r;
    const bh = b.h * r;
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.ellipse(x, by, r * 1.1, bh, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3D Spherical Day/Night Terminator Shading
  applySphericalLighting(ctx, x, y, r, sunDirX, sunDirY, 0.18);

  ctx.restore();
}

/**
 * Uranus: Sideways rotational tilt (97.77°), aquamarine/cyan methane haze, faint polar ring.
 */
function renderUranusSurface(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  sunDirX: number,
  sunDirY: number,
  time: number
): void {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();

  // Aquamarine methane gradient
  const uranusGrad = ctx.createRadialGradient(x, y, 0, x, y, r);
  uranusGrad.addColorStop(0, '#9EF2F2');
  uranusGrad.addColorStop(0.6, '#7DE8E8');
  uranusGrad.addColorStop(1, '#369A9A');
  ctx.fillStyle = uranusGrad;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);

  // Sideways tilted polar atmospheric glow (97.77° tilt)
  const polarGrad = ctx.createLinearGradient(x - r, y, x + r, y);
  polarGrad.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
  polarGrad.addColorStop(0.5, 'rgba(125, 232, 232, 0)');
  polarGrad.addColorStop(1, 'rgba(40, 140, 140, 0.25)');
  ctx.fillStyle = polarGrad;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);

  // 3D Spherical Day/Night Terminator Shading
  applySphericalLighting(ctx, x, y, r, sunDirX, sunDirY, 0.22);

  ctx.restore();

  // Faint tilted polar ring arc
  ctx.save();
  ctx.strokeStyle = 'rgba(125, 232, 232, 0.25)';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.ellipse(x, y, r * 1.6, r * 0.25, Math.PI * 0.48, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/**
 * Neptune: Supersonic deep azure storms, Great Dark Spot, luminous methane cirrus streaks.
 */
function renderNeptuneSurface(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  sunDirX: number,
  sunDirY: number,
  time: number
): void {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();

  // Deep electric azure base
  const neptuneGrad = ctx.createRadialGradient(x, y, 0, x, y, r);
  neptuneGrad.addColorStop(0, '#4B88FF');
  neptuneGrad.addColorStop(0.65, '#265DDE');
  neptuneGrad.addColorStop(1, '#0C2A80');
  ctx.fillStyle = neptuneGrad;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);

  // Great Dark Spot (GDS) storm vortex at 20°S
  const gdsX = x - r * 0.25;
  const gdsY = y + r * 0.25;
  ctx.fillStyle = '#081D5E';
  ctx.beginPath();
  ctx.ellipse(gdsX, gdsY, r * 0.28, r * 0.16, 0.1, 0, Math.PI * 2);
  ctx.fill();

  // Luminous white methane cirrus cloud streaks (#E0E8FF)
  ctx.fillStyle = 'rgba(224, 232, 255, 0.75)';
  const numCirrus = 4;
  for (let c = 0; c < numCirrus; c++) {
    const cyPos = y + ((c - 1.5) / 2.0) * r * 0.7;
    const cWave = Math.sin(time * 1.4 + c * 2.0) * (r * 0.15);
    ctx.beginPath();
    ctx.ellipse(x + cWave, cyPos, r * 0.55, r * 0.08, -0.05, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3D Spherical Day/Night Terminator Shading
  applySphericalLighting(ctx, x, y, r, sunDirX, sunDirY, 0.22);

  ctx.restore();
}

/**
 * Pluto: Steep inclination, Tombaugh Regio "Heart", tholin charcoal terrains.
 */
function renderPlutoSurface(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  sunDirX: number,
  sunDirY: number,
  time: number
): void {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();

  // Bronze/tholin brown base
  const plutoGrad = ctx.createLinearGradient(x - r, y, x + r, y);
  plutoGrad.addColorStop(0, '#C7A783');
  plutoGrad.addColorStop(0.5, '#997354');
  plutoGrad.addColorStop(1, '#5A3E2A');
  ctx.fillStyle = plutoGrad;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);

  // Tombaugh Regio ("The Heart") Bright Nitrogen Ice Plain
  ctx.fillStyle = '#F5E8D8';
  // Left lobe
  ctx.beginPath();
  ctx.ellipse(x - r * 0.12, y + r * 0.05, r * 0.28, r * 0.32, -0.2, 0, Math.PI * 2);
  ctx.fill();
  // Right lobe
  ctx.beginPath();
  ctx.ellipse(x + r * 0.15, y + r * 0.02, r * 0.25, r * 0.28, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Dark Cthulhu Macula region
  ctx.fillStyle = '#40291C';
  ctx.beginPath();
  ctx.ellipse(x - r * 0.45, y + r * 0.35, r * 0.35, r * 0.22, 0.15, 0, Math.PI * 2);
  ctx.fill();

  // 3D Spherical Day/Night Terminator Shading
  applySphericalLighting(ctx, x, y, r, sunDirX, sunDirY, 0.0);

  ctx.restore();
}

/**
 * Fallback generic celestial body surface.
 */
function renderGenericPlanetSurface(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  sunDirX: number,
  sunDirY: number,
  color: string
): void {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  applySphericalLighting(ctx, x, y, r, sunDirX, sunDirY, 0.2);
  ctx.restore();
}

/**
 * Applies realistic 3D spherical lighting & day/night terminator shading to any planet disc.
 */
function applySphericalLighting(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  sunDirX: number,
  sunDirY: number,
  ambientGlow: number = 0.15
): void {
  // Light source highlight center (offset towards sun)
  const hx = x + sunDirX * (r * 0.45);
  const hy = y + sunDirY * (r * 0.45);

  const lightGrad = ctx.createRadialGradient(hx, hy, 0, x, y, r * 1.05);
  lightGrad.addColorStop(0, `rgba(255, 255, 255, ${0.45 + ambientGlow})`);
  lightGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
  lightGrad.addColorStop(0.75, 'rgba(0, 0, 0, 0.25)');
  lightGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.85)');

  ctx.fillStyle = lightGrad;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

// ---------------------------------------------------------------------------
// 5. 3D Saturn Ring Rasterizer (Concentric Bands & Cassini Division)
// ---------------------------------------------------------------------------

/**
 * Computes 3D projected Saturn ring geometry split into front and back segments.
 */
export function computeSaturnRingSegments(
  saturnWorldPos: Point3D,
  camera: { yaw: number; pitch: number; zoom: number; focusOffset?: Point3D },
  viewportWidth: number,
  viewportHeight: number,
  audioLevel: number = 0,
  time: number = 0
): {
  backRings: SaturnRingSegment[];
  frontRings: SaturnRingSegment[];
} {
  const cx = viewportWidth / 2;
  const cy = viewportHeight / 2;
  const fov = camera.zoom;

  const ox = camera.focusOffset?.x || 0;
  const oy = camera.focusOffset?.y || 0;
  const oz = camera.focusOffset?.z || 0;

  const relX = saturnWorldPos.x - ox;
  const relY = saturnWorldPos.y - oy;
  const relZ = saturnWorldPos.z - oz;

  // Saturn center Euler transformation
  const cosYaw = Math.cos(camera.yaw);
  const sinYaw = Math.sin(camera.yaw);
  const cosPitch = Math.cos(camera.pitch);
  const sinPitch = Math.sin(camera.pitch);

  const sx1 = relX * cosYaw - relZ * sinYaw;
  const sz1 = relX * sinYaw + relZ * cosYaw;
  const sy2 = relY * cosPitch - sz1 * sinPitch;
  const sz2 = relY * sinPitch + sz1 * cosPitch;

  const saturnScale = fov / Math.max(10, fov + sz2);
  const saturnScreenZ = sz2;

  const saturnRadius = PLANET_VISUAL_RADII.saturn; // 18px
  const innerRadius = saturnRadius * 1.35;
  const outerRadius = saturnRadius * 2.65;
  const axialTiltRad = (26.73 * Math.PI) / 180;

  const clampedAudio = Math.max(0, Math.min(1.0, audioLevel));
  const shimmerAlpha = 0.70 + clampedAudio * 0.30 * Math.sin(time * 6.0);

  const backRings: SaturnRingSegment[] = [];
  const frontRings: SaturnRingSegment[] = [];

  const SLICES = 48;
  for (let i = 0; i < SLICES; i++) {
    const angle = (i / SLICES) * Math.PI * 2;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    // Ring local coordinate with Saturn axial tilt (26.73°)
    const rx = outerRadius * cosA;
    const ry = outerRadius * sinA * Math.sin(axialTiltRad);
    const rz = outerRadius * sinA * Math.cos(axialTiltRad);

    const segWorld: Point3D = {
      x: saturnWorldPos.x + rx,
      y: saturnWorldPos.y + ry,
      z: saturnWorldPos.z + rz,
    };

    const sRelX = segWorld.x - ox;
    const sRelY = segWorld.y - oy;
    const sRelZ = segWorld.z - oz;

    const x1 = sRelX * cosYaw - sRelZ * sinYaw;
    const z1 = sRelX * sinYaw + sRelZ * cosYaw;
    const y2 = sRelY * cosPitch - z1 * sinPitch;
    const z2 = sRelY * sinPitch + z1 * cosPitch;

    const segScale = fov / Math.max(10, fov + z2);
    const screenX = cx + x1 * segScale;
    const screenY = cy + y2 * segScale;
    const isFront = z2 <= saturnScreenZ;

    const seg: SaturnRingSegment = {
      innerRadius,
      outerRadius,
      worldPos: segWorld,
      screenX,
      screenY,
      screenZ: z2,
      scale: segScale,
      isFront,
      alpha: shimmerAlpha,
      color: '#E0C080',
      angle,
    };

    if (isFront) {
      frontRings.push(seg);
    } else {
      backRings.push(seg);
    }
  }

  return { backRings, frontRings };
}

/**
 * Renders 3D Saturn Concentric Ring System with Cassini Division, Encke Gap,
 * and audio-reactive particle luminescence shimmer.
 * Can render either the back arc or the front arc depending on `isFrontPass`.
 */
export function renderSaturnRingPass(
  ctx: CanvasRenderingContext2D,
  saturnItem: ProjectedBodyItem,
  camera: { yaw: number; pitch: number; zoom: number },
  isFrontPass: boolean,
  audioLevel: number = 0,
  time: number = 0
): void {
  const { screenX, screenY, scale } = saturnItem;
  const saturnRadius = PLANET_VISUAL_RADII.saturn * scale;
  const axialTiltRad = (26.73 * Math.PI) / 180;

  // Ring radii scaled
  const rIn = saturnRadius * 1.30;
  const rCassiniIn = saturnRadius * 1.95;
  const rCassiniOut = saturnRadius * 2.12;
  const rOut = saturnRadius * 2.65;

  // Combined rotation angle in screen space:
  // Ring orientation combines Saturn's axial tilt with camera yaw/pitch
  const cosYaw = Math.cos(camera.yaw);
  const ringTilt = axialTiltRad * cosYaw;
  const ringAspect = Math.abs(Math.sin(camera.pitch + axialTiltRad * Math.sin(camera.yaw))) * 0.75 + 0.18;

  ctx.save();
  ctx.translate(screenX, screenY);
  ctx.rotate(ringTilt);

  // Clip to front or back hemisphere
  ctx.beginPath();
  if (isFrontPass) {
    // Front half (closer to camera)
    ctx.rect(-rOut * 1.2, 0, rOut * 2.4, rOut * 1.5);
  } else {
    // Back half (behind planet)
    ctx.rect(-rOut * 1.2, -rOut * 1.5, rOut * 2.4, rOut * 1.5);
  }
  ctx.clip();

  const clampedAudio = Math.max(0, Math.min(1.0, audioLevel));
  const audioShimmer = 0.75 + clampedAudio * 0.35 * Math.sin(time * 7.5);

  // 1. Ring C (Inner Faint Crepe Ring)
  drawAnnularRing(ctx, rIn, rIn * 1.22, ringAspect, `rgba(180, 150, 100, ${0.30 * audioShimmer})`);

  // 2. Ring B (Bright Dense Inner Gold Ring)
  drawAnnularRing(ctx, rIn * 1.25, rCassiniIn, ringAspect, `rgba(235, 205, 140, ${0.90 * audioShimmer})`);

  // 3. Cassini Division Gap (Dark Space Gap between Ring B and Ring A)
  // Transparent / No fill

  // 4. Ring A (Outer Beige Ring)
  drawAnnularRing(ctx, rCassiniOut, rOut, ringAspect, `rgba(215, 185, 130, ${0.75 * audioShimmer})`);

  // 5. Delicate Encke Gap Sub-Division Stripe
  drawAnnularRing(ctx, rOut * 0.88, rOut * 0.90, ringAspect, `rgba(255, 240, 200, ${0.95 * audioShimmer})`);

  // 6. Planet Shadow Cast onto Ring (on Back Ring Pass)
  if (!isFrontPass) {
    const shadowGrad = ctx.createLinearGradient(0, -saturnRadius, 0, -rOut);
    shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
    shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, rOut, rOut * ringAspect, 0, -Math.PI, 0);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Helper to draw an elliptical annular ring band.
 */
function drawAnnularRing(
  ctx: CanvasRenderingContext2D,
  innerR: number,
  outerR: number,
  aspect: number,
  fillStyle: string
): void {
  ctx.save();
  ctx.fillStyle = fillStyle;
  ctx.beginPath();
  // Outer ellipse clockwise
  ctx.ellipse(0, 0, outerR, outerR * aspect, 0, 0, Math.PI * 2, false);
  // Inner ellipse counter-clockwise for donut cutout
  ctx.ellipse(0, 0, innerR, innerR * aspect, 0, Math.PI * 2, 0, true);
  ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// 6. Holographic Orbital Trajectory Tracks & Velocity Markers
// ---------------------------------------------------------------------------

/**
 * Renders the 3D Keplerian holographic orbital trajectory track with velocity nodes,
 * inclination tilt, and audio-reactive track glow.
 */
export function renderOrbitalTrack(
  ctx: CanvasRenderingContext2D,
  body: CelestialBodyData,
  camera: { yaw: number; pitch: number; zoom: number; focusOffset?: Point3D },
  viewportWidth: number,
  viewportHeight: number,
  isHovered: boolean,
  isSelected: boolean,
  audioLevel: number = 0,
  time: number = 0
): void {
  if (body.id === 'sun' || body.orbitalRadiusScaled === 0) return;

  const cx = viewportWidth / 2;
  const cy = viewportHeight / 2;
  const fov = camera.zoom;

  const ox = camera.focusOffset?.x || 0;
  const oy = camera.focusOffset?.y || 0;
  const oz = camera.focusOffset?.z || 0;

  const cosYaw = Math.cos(camera.yaw);
  const sinYaw = Math.sin(camera.yaw);
  const cosPitch = Math.cos(camera.pitch);
  const sinPitch = Math.sin(camera.pitch);

  const r = body.orbitalRadiusScaled;
  const incRad = (body.orbitalInclinationDeg * Math.PI) / 180;

  const SAMPLES = 72;
  const points: { x: number; y: number; z: number }[] = [];

  for (let s = 0; s <= SAMPLES; s++) {
    const angle = (s / SAMPLES) * Math.PI * 2;
    const wx = r * Math.cos(angle);
    const wy = r * Math.sin(angle) * Math.sin(incRad);
    const wz = r * Math.sin(angle) * Math.cos(incRad);

    const rx = wx - ox;
    const ry = wy - oy;
    const rz = wz - oz;

    const x1 = rx * cosYaw - rz * sinYaw;
    const z1 = rx * sinYaw + rz * cosYaw;
    const y2 = ry * cosPitch - z1 * sinPitch;
    const z2 = ry * sinPitch + z1 * cosPitch;

    const scale = fov / Math.max(10, fov + z2);
    points.push({
      x: cx + x1 * scale,
      y: cy + y2 * scale,
      z: z2,
    });
  }

  const clampedAudio = Math.max(0, Math.min(1.0, audioLevel));
  const baseAlpha = isSelected ? 0.65 : isHovered ? 0.45 : 0.18;
  const shimmer = baseAlpha + clampedAudio * 0.20 * Math.sin(time * 4.0);

  ctx.save();
  ctx.strokeStyle = rgba(body.color, shimmer);
  ctx.lineWidth = isSelected ? 1.8 : isHovered ? 1.4 : 1.0;

  if (!isSelected && !isHovered) {
    ctx.setLineDash([4, 4]); // Sci-Fi dashed trajectory for non-selected
  }

  ctx.beginPath();
  for (let i = 0; i < points.length; i++) {
    if (i === 0) ctx.moveTo(points[i].x, points[i].y);
    else ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();
  ctx.restore();

  // Dynamic Velocity Photon Marker traveling along track
  const speed = (0.45 * (body.orbitalSpeedKmS / 29.8)) / Math.max(1, body.orbitalRadiusScaled * 0.02);
  const pulseAngle = (time * speed + body.distanceAu * 1.85) % (Math.PI * 2);

  const markerWx = r * Math.cos(pulseAngle);
  const markerWy = r * Math.sin(pulseAngle) * Math.sin(incRad);
  const markerWz = r * Math.sin(pulseAngle) * Math.cos(incRad);

  const mrx = markerWx - ox;
  const mry = markerWy - oy;
  const mrz = markerWz - oz;

  const mx1 = mrx * cosYaw - mrz * sinYaw;
  const mz1 = mrx * sinYaw + mrz * cosYaw;
  const my2 = mry * cosPitch - mz1 * sinPitch;
  const mz2 = mry * sinPitch + mz1 * cosPitch;

  const markerScale = fov / Math.max(10, fov + mz2);
  const markerSx = cx + mx1 * markerScale;
  const markerSy = cy + my2 * markerScale;

  ctx.save();
  ctx.fillStyle = rgba(body.color, Math.min(1.0, shimmer * 2.2));
  ctx.beginPath();
  ctx.arc(markerSx, markerSy, Math.max(1.5, 2.5 * markerScale), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// 7. Holographic Selection Reticles & HUD Overlays
// ---------------------------------------------------------------------------

/**
 * Renders futuristic sci-fi HUD selection reticle around focused/hovered body.
 */
export function renderCelestialSelectionReticle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  time: number,
  isSelected: boolean
): void {
  const reticleR = Math.max(radius + 10, 22);
  const spin = time * (isSelected ? 1.2 : 0.6);

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(spin);

  // 1. Segmented Rotating Circular Arc Brackets
  ctx.strokeStyle = color;
  ctx.lineWidth = isSelected ? 1.8 : 1.2;

  for (let b = 0; b < 4; b++) {
    const startA = (b * Math.PI) / 2 + 0.15;
    const endA = ((b + 1) * Math.PI) / 2 - 0.15;
    ctx.beginPath();
    ctx.arc(0, 0, reticleR, startA, endA);
    ctx.stroke();
  }

  // 2. Corner Bracket Ticks
  const cornerR = reticleR + (isSelected ? 5 : 3);
  const tickLen = 4;
  for (let c = 0; c < 4; c++) {
    const angle = (c * Math.PI) / 2;
    const tx = cornerR * Math.cos(angle);
    const ty = cornerR * Math.sin(angle);
    ctx.beginPath();
    ctx.moveTo(tx - tickLen * Math.sin(angle), ty + tickLen * Math.cos(angle));
    ctx.lineTo(tx, ty);
    ctx.lineTo(tx - tickLen * Math.cos(angle), ty - tickLen * Math.sin(angle));
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Renders glassmorphic holographic label and telemetry pin for a celestial body.
 */
export function renderPlanetLabel(
  ctx: CanvasRenderingContext2D,
  item: ProjectedBodyItem,
  isSelected: boolean
): void {
  const { name, screenX, screenY, screenRadius, color, data } = item;
  const labelX = screenX + screenRadius + 14;
  const labelY = screenY - 8;

  ctx.save();
  ctx.font = '600 11px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

  const nameText = name.toUpperCase();
  const subText = `${data.distanceAu > 0 ? `${data.distanceAu.toFixed(2)} AU` : 'Anchor'} • ${data.orbitalSpeedKmS} km/s`;
  const nameWidth = ctx.measureText(nameText).width;
  const subWidth = ctx.measureText(subText).width;
  const boxWidth = Math.max(nameWidth, subWidth) + 16;
  const boxHeight = 32;

  // Connecting Leader Line
  ctx.strokeStyle = isSelected ? rgba(color, 0.8) : 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(screenX + screenRadius + 2, screenY);
  ctx.lineTo(labelX, labelY + boxHeight / 2);
  ctx.stroke();

  // Glassmorphic Label Card Background
  ctx.fillStyle = isSelected ? 'rgba(10, 20, 35, 0.85)' : 'rgba(8, 14, 24, 0.65)';
  ctx.strokeStyle = isSelected ? rgba(color, 0.75) : 'rgba(255, 255, 255, 0.18)';
  ctx.lineWidth = 1;

  roundRect(ctx, labelX, labelY, boxWidth, boxHeight, 4);
  ctx.fill();
  ctx.stroke();

  // Celestial Body Name
  ctx.fillStyle = isSelected ? color : '#FFFFFF';
  ctx.fillText(nameText, labelX + 8, labelY + 14);

  // Scientific Telemetry
  ctx.fillStyle = 'rgba(255, 255, 255, 0.60)';
  ctx.font = '400 9px system-ui, -apple-system, sans-serif';
  ctx.fillText(subText, labelX + 8, labelY + 26);

  ctx.restore();
}

/**
 * Helper to draw rounded rectangle paths.
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
