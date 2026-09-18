/**
 * Fox AI 3D Planetarium Simulation, Euler Camera, Keplerian Orbital Mechanics,
 * Saturn Ring Projection, and Raycasting Physics Engine for Testing.
 */

import {
  CELESTIAL_BODIES,
  CELESTIAL_BODY_MAP,
  type CelestialBodyData,
  type CelestialId,
} from './types.ts';

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface ProjectedCelestialBody {
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
  isOccluded?: boolean;
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
}

export interface CameraState {
  yaw: number;
  pitch: number;
  zoom: number;
  velocityYaw: number;
  velocityPitch: number;
  isDragging: boolean;
  targetFocus: CelestialId;
  focusOffset: Point3D;
}

export const CAMERA_DEFAULTS: CameraState = {
  yaw: 0.45,
  pitch: 0.55, // ~31.5 degrees top-down perspective
  zoom: 560,
  velocityYaw: 0,
  velocityPitch: 0,
  isDragging: false,
  targetFocus: 'sun',
  focusOffset: { x: 0, y: 0, z: 0 },
};

export const PITCH_LIMIT_DEG = 85;
export const PITCH_LIMIT_RAD = (85 * Math.PI) / 180; // ~1.48353 rad
export const MIN_ZOOM = 120;
export const MAX_ZOOM = 1600;
export const FRICTION_MOMENTUM_DECAY = 0.92;

export class PlanetariumEngine {
  /**
   * Calculate 3D Keplerian position for a celestial body at a given simulation time
   */
  static getOrbitalPosition(
    body: CelestialBodyData,
    time: number,
    speedMultiplier: number = 1.0
  ): Point3D {
    if (body.id === 'sun' || body.orbitalRadiusScaled === 0) {
      return { x: 0, y: 0, z: 0 };
    }

    // Angular velocity: Keplerian scaling (closer planets orbit faster)
    // Relative speed factor normalized to Earth (1.0 rad/year equivalent in sim)
    const baseSpeed = 0.45; // Sim speed constant
    const angularSpeed = (baseSpeed * (body.orbitalSpeedKmS / 29.8) * speedMultiplier) / Math.max(1, body.orbitalRadiusScaled * 0.02);
    const angle = time * angularSpeed + (body.distanceAu * 1.85); // Stagger initial phase

    const r = body.orbitalRadiusScaled;
    const incRad = (body.orbitalInclinationDeg * Math.PI) / 180;

    // 3D Orbital plane with inclination tilt
    const x = r * Math.cos(angle);
    const y = r * Math.sin(angle) * Math.sin(incRad);
    const z = r * Math.sin(angle) * Math.cos(incRad);

    return { x, y, z };
  }

  /**
   * Generate Moon position relative to Earth
   */
  static getEarthMoonPosition(earthPos: Point3D, time: number, speedMultiplier: number = 1.0): Point3D {
    const moonDist = 18; // Scaled visual distance
    const moonSpeed = 4.2 * speedMultiplier;
    const moonAngle = time * moonSpeed;
    const moonInc = (5.14 * Math.PI) / 180;

    return {
      x: earthPos.x + moonDist * Math.cos(moonAngle),
      y: earthPos.y + moonDist * Math.sin(moonAngle) * Math.sin(moonInc),
      z: earthPos.z + moonDist * Math.sin(moonAngle) * Math.cos(moonInc),
    };
  }

  /**
   * Project a 3D world coordinate to 2D Screen coordinates using Euler Camera
   */
  static project3DToScreen(
    pos: Point3D,
    camera: { yaw: number; pitch: number; zoom: number; focusOffset?: Point3D },
    viewportWidth: number = 1200,
    viewportHeight: number = 800
  ): { screenX: number; screenY: number; screenZ: number; scale: number } {
    const cx = viewportWidth / 2;
    const cy = viewportHeight / 2;
    const fov = camera.zoom;

    // Offset relative to camera focus center
    const ox = camera.focusOffset?.x || 0;
    const oy = camera.focusOffset?.y || 0;
    const oz = camera.focusOffset?.z || 0;

    const relX = pos.x - ox;
    const relY = pos.y - oy;
    const relZ = pos.z - oz;

    // 1. Yaw Rotation (around Y axis)
    const cosYaw = Math.cos(camera.yaw);
    const sinYaw = Math.sin(camera.yaw);
    const x1 = relX * cosYaw - relZ * sinYaw;
    const z1 = relX * sinYaw + relZ * cosYaw;

    // 2. Pitch Rotation (around X axis)
    const cosPitch = Math.cos(camera.pitch);
    const sinPitch = Math.sin(camera.pitch);
    const y2 = relY * cosPitch - z1 * sinPitch;
    const z2 = relY * sinPitch + z1 * cosPitch;

    // 3. Perspective Projection
    const depth = Math.max(10, fov + z2);
    const scale = fov / depth;

    const screenX = cx + x1 * scale;
    const screenY = cy + y2 * scale;

    return { screenX, screenY, screenZ: z2, scale };
  }

  /**
   * Compute Visual Radius for celestial body
   */
  static getBaseVisualRadius(body: CelestialBodyData): number {
    switch (body.id) {
      case 'sun': return 32;
      case 'mercury': return 4.5;
      case 'venus': return 7.5;
      case 'earth': return 8.0;
      case 'mars': return 5.5;
      case 'jupiter': return 22.0;
      case 'saturn': return 18.0;
      case 'uranus': return 12.0;
      case 'neptune': return 11.5;
      case 'pluto': return 3.5;
      default: return 6.0;
    }
  }

  /**
   * Calculate Solar Coronal Energy Flare parameters with Audio Reactivity
   */
  static getSolarFlareParameters(
    time: number,
    audioLevel: number = 0
  ): {
    coreRadius: number;
    coronalGlowRadius: number;
    prominenceCount: number;
    prominenceScale: number;
    flareIntensity: number;
  } {
    const rawAudio = typeof audioLevel === 'number' && !isNaN(audioLevel) ? audioLevel : 0;
    const clampedAudio = Math.max(0, Math.min(1.0, rawAudio));
    const baseCore = 32;
    const pulse = Math.sin(time * 3.5) * 2.0;
    const audioExpansion = clampedAudio * 24.0;

    const coreRadius = baseCore + pulse * 0.4 + clampedAudio * 4.0;
    const coronalGlowRadius = baseCore * 2.4 + pulse * 4.0 + audioExpansion * 1.8;
    const prominenceCount = 12 + Math.floor(clampedAudio * 16);
    const prominenceScale = 1.0 + clampedAudio * 0.85 + Math.sin(time * 5.0) * 0.15;
    const flareIntensity = 0.75 + clampedAudio * 0.25;

    return {
      coreRadius,
      coronalGlowRadius,
      prominenceCount,
      prominenceScale,
      flareIntensity,
    };
  }

  /**
   * Generate Saturn Ring Segments with 3D Depth Sorting & Cassini Division
   */
  static getSaturnRingSegments(
    saturnWorldPos: Point3D,
    camera: { yaw: number; pitch: number; zoom: number; focusOffset?: Point3D },
    audioLevel: number = 0,
    time: number = 0
  ): {
    backRings: SaturnRingSegment[];
    frontRings: SaturnRingSegment[];
  } {
    const saturnProj = PlanetariumEngine.project3DToScreen(saturnWorldPos, camera);
    const saturnRadius = PlanetariumEngine.getBaseVisualRadius(CELESTIAL_BODY_MAP.saturn);
    const axialTiltRad = (26.73 * Math.PI) / 180;

    const innerRadius = saturnRadius * 1.45;
    const cassiniInner = saturnRadius * 1.98;
    const cassiniOuter = saturnRadius * 2.18;
    const outerRadius = saturnRadius * 2.65;

    const clampedAudio = Math.max(0, Math.min(1.0, audioLevel));
    const shimmerAlpha = 0.65 + clampedAudio * 0.35 * Math.sin(time * 6.0);

    const backRings: SaturnRingSegment[] = [];
    const frontRings: SaturnRingSegment[] = [];

    // Ring segment sampling (48 radial slices around Saturn's tilted equator)
    const SLICES = 48;
    for (let i = 0; i < SLICES; i++) {
      const angle = (i / SLICES) * Math.PI * 2;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      // Ring local coordinate rotated by Saturn's axial tilt
      const rx = outerRadius * cosA;
      const ry = outerRadius * sinA * Math.sin(axialTiltRad);
      const rz = outerRadius * sinA * Math.cos(axialTiltRad);

      const segmentWorld: Point3D = {
        x: saturnWorldPos.x + rx,
        y: saturnWorldPos.y + ry,
        z: saturnWorldPos.z + rz,
      };

      const segProj = PlanetariumEngine.project3DToScreen(segmentWorld, camera);
      const isFront = segProj.screenZ <= saturnProj.screenZ;

      const segment: SaturnRingSegment = {
        innerRadius,
        outerRadius,
        worldPos: segmentWorld,
        screenX: segProj.screenX,
        screenY: segProj.screenY,
        screenZ: segProj.screenZ,
        scale: segProj.scale,
        isFront,
        alpha: shimmerAlpha,
        color: '#E0C080',
      };

      if (isFront) {
        frontRings.push(segment);
      } else {
        backRings.push(segment);
      }
    }

    return { backRings, frontRings };
  }

  /**
   * Project all 10 celestial bodies and sort by Z-depth (back-to-front)
   */
  static renderFrame(
    time: number,
    camera: CameraState,
    audioLevel: number = 0,
    speedMultiplier: number = 1.0,
    viewportWidth: number = 1200,
    viewportHeight: number = 800
  ): {
    projectedBodies: ProjectedCelestialBody[];
    focusedBodyData: CelestialBodyData;
    solarFlare: ReturnType<typeof PlanetariumEngine.getSolarFlareParameters>;
  } {
    const bodies = CELESTIAL_BODIES;
    const solarFlare = PlanetariumEngine.getSolarFlareParameters(time, audioLevel);

    const projectedBodies: ProjectedCelestialBody[] = [];

    // Calculate current focus world pos for lerp target
    const currentTargetData = CELESTIAL_BODY_MAP[camera.targetFocus] || CELESTIAL_BODY_MAP.sun;
    const targetWorldPos = PlanetariumEngine.getOrbitalPosition(currentTargetData, time, speedMultiplier);

    const activeCamera = {
      ...camera,
      focusOffset: {
        x: targetWorldPos.x,
        y: targetWorldPos.y,
        z: targetWorldPos.z,
      },
    };

    for (const body of bodies) {
      const worldPos = PlanetariumEngine.getOrbitalPosition(body, time, speedMultiplier);
      const proj = PlanetariumEngine.project3DToScreen(worldPos, activeCamera, viewportWidth, viewportHeight);

      const baseRad = PlanetariumEngine.getBaseVisualRadius(body);
      let screenRadius = baseRad * proj.scale;
      let glowRadius = screenRadius * 2.2;

      if (body.id === 'sun') {
        screenRadius = solarFlare.coreRadius * proj.scale;
        glowRadius = solarFlare.coronalGlowRadius * proj.scale;
      }

      projectedBodies.push({
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
      });
    }

    // Depth sort: back-to-front (largest Z first)
    projectedBodies.sort((a, b) => b.screenZ - a.screenZ);

    return {
      projectedBodies,
      focusedBodyData: currentTargetData,
      solarFlare,
    };
  }

  /**
   * Screen-space Raycasting Hit Detection
   * Finds the celestial body under cursor (mx, my) within hit tolerance padding.
   * If multiple bodies overlap, chooses the body with minimum center distance,
   * breaking ties with frontmost depth (smaller screenZ).
   */
  static raycastHit(
    mx: number,
    my: number,
    projectedBodies: ProjectedCelestialBody[],
    hitPaddingPx: number = 8
  ): CelestialId | null {
    let closestId: CelestialId | null = null;
    let closestDistSq = Infinity;
    let closestScreenZ = Infinity;

    for (const body of projectedBodies) {
      const hitRadius = Math.max(body.screenRadius + hitPaddingPx, 16); // Minimum 16px touch/click target
      const dx = mx - body.screenX;
      const dy = my - body.screenY;
      const distSq = dx * dx + dy * dy;

      if (distSq <= hitRadius * hitRadius) {
        if (
          distSq < closestDistSq - 9 ||
          (Math.abs(distSq - closestDistSq) <= 9 && body.screenZ < closestScreenZ)
        ) {
          closestDistSq = distSq;
          closestScreenZ = body.screenZ;
          closestId = body.id;
        }
      }
    }

    return closestId;
  }

  /**
   * Step Camera Euler Momentum Physics
   */
  static stepMomentumPhysics(
    state: CameraState,
    dt: number = 1 / 60
  ): CameraState {
    const speedFactor = dt * 60;
    let { yaw, pitch, zoom, velocityYaw, velocityPitch, isDragging, targetFocus, focusOffset } = state;

    if (!isDragging) {
      yaw += velocityYaw * speedFactor;
      pitch += velocityPitch * speedFactor;

      // Friction decay: 0.92 per frame
      velocityYaw *= Math.pow(FRICTION_MOMENTUM_DECAY, speedFactor);
      velocityPitch *= Math.pow(FRICTION_MOMENTUM_DECAY, speedFactor);

      // Idle drift when momentum dissipates
      if (Math.abs(velocityYaw) < 0.0001) {
        velocityYaw = 0;
        yaw += 0.0015 * speedFactor; // Gentle orbital drift
      }
      if (Math.abs(velocityPitch) < 0.0001) {
        velocityPitch = 0;
      }
    }

    // Pitch Clamping to prevent gimbal flip: strictly [-85°, +85°]
    pitch = Math.max(-PITCH_LIMIT_RAD, Math.min(PITCH_LIMIT_RAD, pitch));

    // Zoom Clamping: strictly [120px, 1600px]
    zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));

    return {
      yaw,
      pitch,
      zoom,
      velocityYaw,
      velocityPitch,
      isDragging,
      targetFocus,
      focusOffset,
    };
  }

  /**
   * Smoothly lerp camera focus offset towards target
   */
  static lerpFocus(
    currentOffset: Point3D,
    targetOffset: Point3D,
    lerpFactor: number = 0.08
  ): Point3D {
    return {
      x: currentOffset.x + (targetOffset.x - currentOffset.x) * lerpFactor,
      y: currentOffset.y + (targetOffset.y - currentOffset.y) * lerpFactor,
      z: currentOffset.z + (targetOffset.z - currentOffset.z) * lerpFactor,
    };
  }
}
