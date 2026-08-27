/**
 * Mathematical 3D/4D Procedural Geometry, Audio Reactivity, Camera, and Momentum Physics Engine
 */

import type { CoreShapeId, AssistantStatus, AccentTheme } from './types.ts';

export interface Point3D {
  x: number;
  y: number;
  z: number;
  tier?: number;
  ringRadius?: number;
  color?: string;
  size?: number;
  alpha?: number;
}

export interface ProjectedPoint {
  x: number;
  y: number;
  z: number;
  scale: number;
  color: string;
  glowColor: string;
  size: number;
  alpha: number;
  tier: number;
  isLaserPulse?: boolean;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let clean = (hex || '#99FFFF').replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) {
    return { r: 153, g: 255, b: 255 }; // Default Fox Cyan
  }
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export class ProceduralGeometryEngine {
  /**
   * 1. Holographic Sphere Geometry (2,400 vertices)
   */
  static generateSphereParticles(
    time: number,
    status: AssistantStatus,
    audioLevel: number = 0,
    morphProgress: number = 0
  ): Point3D[] {
    const NUM_ROWS = 40;
    const NUM_COLS = 60;
    const baseSphereRadius = 148;
    const particles: Point3D[] = [];

    const isSpeaking = status === 'speaking';
    const isListening = status === 'listening';

    const vocalCadence = isSpeaking
      ? 0.70 + Math.sin(time * 2.8) * 0.22 + Math.cos(time * 4.6) * 0.18 + audioLevel * 0.45
      : isListening
      ? 0.40 + audioLevel * 0.65
      : 0.06;

    for (let r = 0; r < NUM_ROWS; r++) {
      const phi = ((r + 0.5) / NUM_ROWS) * Math.PI - Math.PI / 2;
      for (let c = 0; c < NUM_COLS; c++) {
        const theta = (c / NUM_COLS) * Math.PI * 2;
        const seed = Math.sin(r * 12.9898 + c * 78.233);
        const index = r * NUM_COLS + c;
        const tier = index % 5;
        const ringRadius = tier === 3 ? 165 : tier === 4 ? 210 : 0;

        let voiceSoundwave = 0;
        if (isSpeaking) {
          const waveCircumference = Math.sin(theta * 4.0 - time * 3.2) * (vocalCadence * 38.0);
          const waveVertical = Math.cos(phi * 5.0 + time * 3.6) * (vocalCadence * 32.0);
          const voiceBulge = Math.cos(phi) * Math.sin(time * 2.4 + theta) * (vocalCadence * 26.0);
          const harmonicFlow = Math.sin(time * 4.8 + phi * 3.0 + theta * 2.0) * (vocalCadence * 14.0);
          voiceSoundwave = waveCircumference + waveVertical + voiceBulge + harmonicFlow;
        } else if (isListening) {
          voiceSoundwave =
            Math.sin(phi * 3.5 - time * 2.0) * (vocalCadence * 18.0) +
            Math.cos(theta * 3.0 - time * 1.6) * (vocalCadence * 16.0);
        } else {
          voiceSoundwave = Math.sin(time * 1.6 + phi * 1.5 + theta) * 4.2;
        }

        const rSph = Math.max(20, baseSphereRadius + voiceSoundwave);
        const xSph = rSph * Math.cos(phi) * Math.sin(theta);
        const ySph = rSph * Math.sin(phi);
        const zSph = rSph * Math.cos(phi) * Math.cos(theta);

        let jX = xSph;
        let jY = ySph;
        let jZ = zSph;

        if (tier === 3) {
          const spinSpeed = -time * 1.2;
          const animatedTheta = theta + spinSpeed;
          const rad = ringRadius + Math.sin(time * 3 + theta * 4) * 1.5;
          const tilt = Math.PI * 0.28;
          const rx = Math.cos(animatedTheta) * rad;
          const rz = Math.sin(animatedTheta) * rad;
          jX = rx;
          jY = rz * Math.sin(tilt);
          jZ = rz * Math.cos(tilt);
        } else if (tier === 4) {
          const spinSpeed = time * 0.8;
          const animatedTheta = theta + spinSpeed;
          const rad = ringRadius + Math.sin(time * 3 + theta * 4) * 2.0;
          const tilt = -Math.PI * 0.32;
          const rx = Math.cos(animatedTheta) * rad;
          const rz = Math.sin(animatedTheta) * rad;
          jX = rx * Math.cos(tilt);
          jY = rx * Math.sin(tilt);
          jZ = rz;
        }

        const easeMorph =
          morphProgress < 0.5
            ? 2 * morphProgress * morphProgress
            : 1 - Math.pow(-2 * morphProgress + 2, 2) / 2;

        particles.push({
          x: xSph * (1 - easeMorph) + jX * easeMorph,
          y: ySph * (1 - easeMorph) + jY * easeMorph,
          z: zSph * (1 - easeMorph) + jZ * easeMorph,
          tier,
          ringRadius,
        });
      }
    }

    return particles;
  }

  /**
   * 2. Quantum Torus Geometry (2,408 vertices)
   * Donut ring with toroidal flux, helical particle streaming, and 2 orbital accretion rings
   */
  static generateTorusParticles(
    time: number,
    status: AssistantStatus,
    audioLevel: number = 0
  ): Point3D[] {
    const N_TOROIDAL = 64;
    const N_POLOIDAL = 32;
    const particles: Point3D[] = [];

    const isSpeaking = status === 'speaking';
    const isListening = status === 'listening';
    const vocalCadence = isSpeaking ? 0.7 + audioLevel * 0.45 : isListening ? 0.4 + audioLevel * 0.3 : 0.08;

    const baseMajorRadius = 135 * (1.0 + 0.22 * audioLevel + 0.05 * Math.sin(time * 2.2));
    const baseMinorRadius = Math.max(20, 46 * (1.0 + 0.38 * audioLevel * Math.cos(time * 3.0)));

    const swirlSpeed = status === 'thinking' || isSpeaking ? 4.2 : 1.6;

    // Torus surface particles (64 * 32 = 2,048)
    for (let u = 0; u < N_TOROIDAL; u++) {
      const theta = (u / N_TOROIDAL) * Math.PI * 2;
      for (let v = 0; v < N_POLOIDAL; v++) {
        const phi0 = (v / N_POLOIDAL) * Math.PI * 2;
        const phi = phi0 + swirlSpeed * time * 0.1 + 3 * theta;

        const ripple = vocalCadence * (Math.sin(6 * theta - time * 4.5) * 16 + Math.cos(8 * phi + time * 3.2) * 10);
        const rMinor = Math.max(15, baseMinorRadius + ripple);

        const x = (baseMajorRadius + rMinor * Math.cos(phi)) * Math.cos(theta);
        const y = rMinor * Math.sin(phi);
        const z = (baseMajorRadius + rMinor * Math.cos(phi)) * Math.sin(theta);

        particles.push({ x, y, z, tier: 0 });
      }
    }

    // Concentric Accretion Ring 1: Equatorial (200 particles)
    const ACC1_COUNT = 200;
    const R_ACC1 = 195;
    for (let i = 0; i < ACC1_COUNT; i++) {
      const angle = (i / ACC1_COUNT) * Math.PI * 2 - time * 1.2;
      const r = R_ACC1 + Math.sin(time * 4 + angle * 5) * 3;
      particles.push({
        x: r * Math.cos(angle),
        y: Math.sin(time * 2 + angle * 3) * 4,
        z: r * Math.sin(angle),
        tier: 3,
        ringRadius: R_ACC1,
      });
    }

    // Concentric Accretion Ring 2: Polar Orbit (160 particles)
    const ACC2_COUNT = 160;
    const R_ACC2 = 175;
    const tilt = 62 * (Math.PI / 180);
    for (let i = 0; i < ACC2_COUNT; i++) {
      const angle = (i / ACC2_COUNT) * Math.PI * 2 + time * 0.9;
      const rx = R_ACC2 * Math.cos(angle);
      const rz = R_ACC2 * Math.sin(angle);
      particles.push({
        x: rx,
        y: rz * Math.sin(tilt),
        z: rz * Math.cos(tilt),
        tier: 4,
        ringRadius: R_ACC2,
      });
    }

    return particles;
  }

  /**
   * 3. Cyber Icosahedron Geometry (1,680 elements)
   * 12 golden ratio vertices, 30 edges (16 quantum dots/edge = 480), inner spinning crystal
   */
  static generateIcosahedronParticles(
    time: number,
    status: AssistantStatus,
    audioLevel: number = 0
  ): Point3D[] {
    const phi = (1 + Math.sqrt(5)) / 2; // ~1.618034
    const R_ico = 138 * (1.0 + 0.28 * audioLevel * (1.0 + 0.25 * Math.sin(time * 4)));
    const K = R_ico / Math.sqrt(1 + phi * phi);

    // 12 Base Vertices
    const rawVertices: [number, number, number][] = [
      [-K, phi * K, 0],
      [K, phi * K, 0],
      [-K, -phi * K, 0],
      [K, -phi * K, 0],
      [0, -K, phi * K],
      [0, K, phi * K],
      [0, -K, -phi * K],
      [0, K, -phi * K],
      [phi * K, 0, -K],
      [phi * K, 0, K],
      [-phi * K, 0, -K],
      [-phi * K, 0, K],
    ];

    // 30 Edges topology
    const edges: [number, number][] = [
      [0, 1], [0, 5], [0, 7], [0, 10], [0, 11],
      [1, 5], [1, 7], [1, 8], [1, 9],
      [2, 3], [2, 4], [2, 6], [2, 10], [2, 11],
      [3, 4], [3, 6], [3, 8], [3, 9],
      [4, 5], [4, 9], [4, 11],
      [5, 9], [5, 11],
      [6, 7], [6, 8], [6, 10],
      [7, 8], [7, 10],
      [8, 9],
      [10, 11],
    ];

    const particles: Point3D[] = [];

    // 12 Glowing Vertex Nodes (tier 0)
    rawVertices.forEach(([x, y, z]) => {
      particles.push({ x, y, z, tier: 0, size: 4.5 });
    });

    // 30 Edges sampled into 16 discrete quantum dot particles each (480 particles, tier 1)
    const DOTS_PER_EDGE = 16;
    edges.forEach(([v1Idx, v2Idx]) => {
      const v1 = rawVertices[v1Idx];
      const v2 = rawVertices[v2Idx];
      for (let s = 1; s <= DOTS_PER_EDGE; s++) {
        const u = s / (DOTS_PER_EDGE + 1);
        particles.push({
          x: (1 - u) * v1[0] + u * v2[0],
          y: (1 - u) * v1[1] + u * v2[1],
          z: (1 - u) * v1[2] + u * v2[2],
          tier: 1,
          size: 1.6,
        });
      }
    });

    // Inner Concentric Counter-Rotating Crystalline Core (Radius ~65px, tier 2)
    const innerPhi = phi;
    const innerK = (65 * (1.0 + 0.15 * audioLevel)) / Math.sqrt(1 + innerPhi * innerPhi);
    const innerAngle = -time * 1.8;
    const cosI = Math.cos(innerAngle);
    const sinI = Math.sin(innerAngle);

    rawVertices.forEach(([x0, y0, z0]) => {
      const ratio = innerK / K;
      const ix0 = x0 * ratio;
      const iy0 = y0 * ratio;
      const iz0 = z0 * ratio;

      // Rotate inner crystal around Y-axis
      const ix1 = ix0 * cosI - iz0 * sinI;
      const iz1 = ix0 * sinI + iz0 * cosI;

      particles.push({ x: ix1, y: iy0, z: iz1, tier: 2, size: 2.2 });
    });

    return particles;
  }

  /**
   * 4. Neural DNA Helix Geometry (1,324 particles)
   * Dual braided antiparallel strands, 28 base-pair rungs (8 nodes/rung), synaptic spark cloud
   */
  static generateHelixParticles(
    time: number,
    status: AssistantStatus,
    audioLevel: number = 0
  ): Point3D[] {
    const L = 320;
    const baseRadius = 76 * (1.0 + 0.35 * audioLevel * Math.sin(time * 3));
    const pitch = (3 * 2 * Math.PI) / L; // 3 full turns along 320px
    const rotationSpeed = status === 'speaking' ? 0.055 : status === 'thinking' ? 0.04 : 0.018;
    const theta0 = time * rotationSpeed * 60;

    const particles: Point3D[] = [];

    // Dual Antiparallel Strands (400 particles each = 800 total, tier 0 & 1)
    const STRAND_POINTS = 400;
    for (let i = 0; i < STRAND_POINTS; i++) {
      const s = -L / 2 + (i / (STRAND_POINTS - 1)) * L;
      const angleA = pitch * s + theta0;
      const angleB = pitch * s + Math.PI + theta0;

      const rWave = baseRadius * (1.0 + 0.2 * audioLevel * Math.sin(3 * pitch * s - time * 4.2));

      // Strand A
      particles.push({
        x: rWave * Math.cos(angleA),
        y: s,
        z: rWave * Math.sin(angleA),
        tier: 0,
      });

      // Strand B
      particles.push({
        x: rWave * Math.cos(angleB),
        y: s,
        z: rWave * Math.sin(angleB),
        tier: 1,
      });
    }

    // 28 Base-Pair Ladder Rungs (8 particles each = 224 total, tier 2)
    const RUNGS = 28;
    const NODES_PER_RUNG = 8;
    for (let k = 0; k < RUNGS; k++) {
      const s_k = -L / 2 + (k / (RUNGS - 1)) * L;
      const angleA = pitch * s_k + theta0;
      const angleB = pitch * s_k + Math.PI + theta0;

      const pA = { x: baseRadius * Math.cos(angleA), y: s_k, z: baseRadius * Math.sin(angleA) };
      const pB = { x: baseRadius * Math.cos(angleB), y: s_k, z: baseRadius * Math.sin(angleB) };

      for (let m = 0; m < NODES_PER_RUNG; m++) {
        const u = m / (NODES_PER_RUNG - 1);
        const yOsc = Math.sin(Math.PI * u) * Math.sin(time * 6 + k * 0.4) * (18 * audioLevel);
        particles.push({
          x: (1 - u) * pA.x + u * pB.x,
          y: (1 - u) * pA.y + u * pB.y + yOsc,
          z: (1 - u) * pA.z + u * pB.z,
          tier: 2,
        });
      }
    }

    // Synaptic Spark Cloud (300 particles, tier 3)
    const SPARKS = 300;
    for (let i = 0; i < SPARKS; i++) {
      const s = -L / 2 + Math.random() * L;
      const sparkR = baseRadius * (1.2 + 0.5 * Math.random());
      const sparkAngle = Math.random() * Math.PI * 2 + time * 0.5;
      particles.push({
        x: sparkR * Math.cos(sparkAngle),
        y: s + Math.sin(time * 2 + i) * 10,
        z: sparkR * Math.sin(sparkAngle),
        tier: 3,
        size: 1.2,
      });
    }

    return particles;
  }

  /**
   * 5. Hypercube / Tesseract 4D-to-3D Geometry (1,536 elements)
   * 16 4D vertices rotated in SO(4) XW/YZ planes and projected to 3D with divisor clamp
   */
  static generateTesseractParticles(
    time: number,
    status: AssistantStatus,
    audioLevel: number = 0
  ): Point3D[] {
    const S0 = 95 * (1.0 + 0.32 * audioLevel);
    const D4 = 2.4; // 4D Camera focal distance

    const rotSpeedXW = status === 'speaking' ? 0.045 : 0.015;
    const rotSpeedYZ = status === 'speaking' ? 0.035 : 0.012;

    const thetaXW = time * rotSpeedXW * 60;
    const thetaYZ = time * rotSpeedYZ * 60;

    const cosXW = Math.cos(thetaXW);
    const sinXW = Math.sin(thetaXW);
    const cosYZ = Math.cos(thetaYZ);
    const sinYZ = Math.sin(thetaYZ);

    // 16 4D Vertices: (±S0, ±S0, ±S0, ±S0)
    const vertices4D: [number, number, number, number][] = [];
    for (let i = 0; i < 16; i++) {
      const x = (i & 1 ? 1 : -1) * S0;
      const y = (i & 2 ? 1 : -1) * S0;
      const z = (i & 4 ? 1 : -1) * S0;
      const w = (i & 8 ? 1 : -1) * S0;
      vertices4D.push([x, y, z, w]);
    }

    // 32 4D Edges (Hamming distance = 1)
    const edges4D: [number, number][] = [];
    for (let i = 0; i < 16; i++) {
      for (let bit = 0; bit < 4; bit++) {
        const j = i ^ (1 << bit);
        if (j > i) {
          edges4D.push([i, j]);
        }
      }
    }

    // 4D Rotation + 4D-to-3D Perspective Projection
    const projected3DVertices: [number, number, number][] = vertices4D.map(([x, y, z, w]) => {
      // Rotate in XW plane
      const x1 = x * cosXW - w * sinXW;
      const w1 = x * sinXW + w * cosXW;

      // Rotate in YZ plane
      const y1 = y * cosYZ - z * sinYZ;
      const z1 = y * sinYZ + z * cosYZ;

      // 4D Perspective Projection with division-by-zero safeguard
      const denominator = Math.max(0.25, D4 - w1 / S0);
      const P4 = 1 / denominator;

      return [x1 * P4, y1 * P4, z1 * P4];
    });

    const particles: Point3D[] = [];

    // 16 Primary Hypercube Corner Nodes (tier 0)
    projected3DVertices.forEach(([x, y, z]) => {
      particles.push({ x, y, z, tier: 0, size: 4.0 });
    });

    // 32 Edges sampled into 12 quantum beam particles each (384 particles, tier 1)
    const DOTS_PER_EDGE = 12;
    edges4D.forEach(([v1Idx, v2Idx]) => {
      const v1 = projected3DVertices[v1Idx];
      const v2 = projected3DVertices[v2Idx];
      for (let s = 1; s <= DOTS_PER_EDGE; s++) {
        const u = s / (DOTS_PER_EDGE + 1);
        particles.push({
          x: (1 - u) * v1[0] + u * v2[0],
          y: (1 - u) * v1[1] + u * v2[1],
          z: (1 - u) * v1[2] + u * v2[2],
          tier: 1,
          size: 1.5,
        });
      }
    });

    return particles;
  }

  /**
   * Universal 3D Camera Projection & Depth Sorting
   */
  static projectAndSortParticles(
    particles: Point3D[],
    yaw: number,
    pitch: number,
    centerX: number,
    centerY: number,
    theme: AccentTheme,
    audioLevel: number = 0,
    status: AssistantStatus = 'idle'
  ): ProjectedPoint[] {
    const fov = 560;
    const cosYaw = Math.cos(yaw);
    const sinYaw = Math.sin(yaw);
    const cosPitch = Math.cos(pitch);
    const sinPitch = Math.sin(pitch);

    const rgbPrimary = hexToRgb(theme?.primary || '#99FFFF');
    const rgbSecondary = hexToRgb(theme?.secondary || '#00E5FF');
    const isSpeaking = status === 'speaking';

    const projected: ProjectedPoint[] = [];

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      // Euler 3D Transformation
      const x1 = p.x * cosYaw - p.z * sinYaw;
      const z1 = p.x * sinYaw + p.z * cosYaw;

      const y2 = p.y * cosPitch - z1 * sinPitch;
      const z2 = p.y * sinPitch + z1 * cosPitch;

      // 3D-to-2D Perspective Scaling
      const scale = fov / (fov + z2);
      const screenX = centerX + x1 * scale;
      const screenY = centerY + y2 * scale;

      let pSize = (p.size || 1.4) * scale;
      let alpha = 0.55 + scale * 0.35;

      let rColor = rgbPrimary.r;
      let gColor = rgbPrimary.g;
      let bColor = rgbPrimary.b;

      if (isSpeaking && audioLevel > 0.3) {
        // Luminescent white-hot highlights on vocal audio crests
        const crest = Math.min(1.0, audioLevel * 1.4);
        rColor = Math.min(255, Math.floor(rgbPrimary.r + (255 - rgbPrimary.r) * crest));
        gColor = Math.min(255, Math.floor(rgbPrimary.g + (255 - rgbPrimary.g) * crest));
        bColor = 255;
        pSize *= 1.3;
        alpha = 1.0;
      } else if (p.tier === 3 || p.tier === 4) {
        rColor = rgbSecondary.r;
        gColor = rgbSecondary.g;
        bColor = rgbSecondary.b;
      }

      projected.push({
        x: screenX,
        y: screenY,
        z: z2,
        scale,
        color: `rgb(${rColor}, ${gColor}, ${bColor})`,
        glowColor: `rgba(${rColor}, ${gColor}, ${bColor}, ${alpha * 0.6})`,
        size: Math.max(0.8, pSize),
        alpha: Math.min(1, Math.max(0.15, alpha)),
        tier: p.tier || 0,
      });
    }

    // Depth Sorting (Z-buffer Back-to-Front)
    projected.sort((a, b) => b.z - a.z);

    return projected;
  }

  /**
   * Interactive Momentum Decay Physics Step
   */
  static stepMomentumPhysics(
    state: {
      yaw: number;
      pitch: number;
      velocityYaw: number;
      velocityPitch: number;
      isDragging: boolean;
      time: number;
    },
    dt: number = 1 / 60
  ): {
    yaw: number;
    pitch: number;
    velocityYaw: number;
    velocityPitch: number;
  } {
    const speedFactor = dt * 60;
    let { yaw, pitch, velocityYaw, velocityPitch, isDragging, time } = state;

    if (!isDragging) {
      yaw += velocityYaw * speedFactor;
      pitch += velocityPitch * speedFactor;

      // Friction decay: ~0.94 multiplier per frame
      velocityYaw *= Math.pow(0.94, speedFactor);
      velocityPitch *= Math.pow(0.94, speedFactor);

      // Revert to gentle idle drift when momentum dissipates
      if (Math.abs(velocityYaw) < 0.0001) {
        velocityYaw = 0;
        yaw += 0.002 * speedFactor;
      }
      if (Math.abs(velocityPitch) < 0.0001) {
        velocityPitch = 0;
      }
    }

    // Pitch Clamping to avoid gimbal flip: [-π/2 + 0.1, π/2 - 0.1]
    const maxPitch = Math.PI / 2 - 0.1;
    const minPitch = -Math.PI / 2 + 0.1;
    pitch = Math.max(minPitch, Math.min(maxPitch, pitch));

    return { yaw, pitch, velocityYaw, velocityPitch };
  }
}
