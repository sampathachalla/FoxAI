import React, { useRef, useEffect, useState } from 'react';
import { useVoiceAssistant } from '../hooks/useVoiceAssistant';
import { SoundFXService } from '../utils/audio';
import { CoreShapeId, AssistantStatus, AccentTheme } from '../types';

interface Point3D {
  x: number;
  y: number;
  z: number;
  tier?: number;
  ringRadius?: number;
  size?: number;
  colorType?: 'primary' | 'secondary' | 'white' | 'accent';
  alpha?: number;
}

interface ProjectedPoint {
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

interface HoloPulse {
  ringIndex: number;
  angle: number;
  speed: number;
  size: number;
  colorType: 'primary' | 'secondary' | 'white';
}

// Utility to parse hex colors to RGB components with safe fallbacks
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let clean = (hex || '#99FFFF').replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) {
    return { r: 153, g: 255, b: 255 }; // Safe default Fox Cyan #99FFFF
  }
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

// --- Procedural Geometry Algorithms ---

// 1. Holographic Sphere Core (2,400 vertices)
function generateSpherePoints(
  time: number,
  status: AssistantStatus,
  audioLevel: number,
  morphProgress: number
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

      // 75% central sphere, 25% orbital rings in thinking mode
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
      } else {
        const breath = Math.sin(time * 2.5 + seed * 3) * (0.8 + morphProgress * 1.2);
        jX = (baseSphereRadius + breath + voiceSoundwave) * Math.cos(phi) * Math.sin(theta);
        jY = (baseSphereRadius + breath + voiceSoundwave) * Math.sin(phi);
        jZ = (baseSphereRadius + breath + voiceSoundwave) * Math.cos(phi) * Math.cos(theta);
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

// 2. Quantum Torus Geometry (2,408 vertices)
function generateTorusPoints(
  time: number,
  status: AssistantStatus,
  audioLevel: number,
  bassEnergy: number = 0
): Point3D[] {
  const N_TOROIDAL = 64;
  const N_POLOIDAL = 32;
  const particles: Point3D[] = [];

  const isSpeaking = status === 'speaking';
  const isListening = status === 'listening';
  const effectiveAudio = Math.max(audioLevel, bassEnergy);
  const vocalCadence = isSpeaking
    ? 0.7 + effectiveAudio * 0.45
    : isListening
    ? 0.4 + effectiveAudio * 0.3
    : 0.08;

  const baseMajorRadius = 135 * (1.0 + 0.22 * effectiveAudio + 0.05 * Math.sin(time * 2.2));
  const baseMinorRadius = Math.max(20, 46 * (1.0 + 0.38 * effectiveAudio * Math.cos(time * 3.0)));

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

      particles.push({ x, y, z, tier: 0, size: 1.4 });
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
      size: 1.45,
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
      size: 1.35,
    });
  }

  return particles;
}

// 3. Cyber Icosahedron Geometry (1,680 elements)
const PHI_GOLDEN = (1 + Math.sqrt(5)) / 2; // ~1.618034
const ICO_EDGES: [number, number][] = [
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

function generateIcosahedronPoints(
  time: number,
  status: AssistantStatus,
  audioLevel: number,
  midEnergy: number = 0
): { particles: Point3D[]; vertices: [number, number, number][]; edges: [number, number][] } {
  const effectiveAudio = Math.max(audioLevel, midEnergy);
  const R_ico = 138 * (1.0 + 0.28 * effectiveAudio * (1.0 + 0.25 * Math.sin(time * 4)));
  const K = R_ico / Math.sqrt(1 + PHI_GOLDEN * PHI_GOLDEN);

  // 12 Base Vertices
  const rawVertices: [number, number, number][] = [
    [-K, PHI_GOLDEN * K, 0],
    [K, PHI_GOLDEN * K, 0],
    [-K, -PHI_GOLDEN * K, 0],
    [K, -PHI_GOLDEN * K, 0],
    [0, -K, PHI_GOLDEN * K],
    [0, K, PHI_GOLDEN * K],
    [0, -K, -PHI_GOLDEN * K],
    [0, K, -PHI_GOLDEN * K],
    [PHI_GOLDEN * K, 0, -K],
    [PHI_GOLDEN * K, 0, K],
    [-PHI_GOLDEN * K, 0, -K],
    [-PHI_GOLDEN * K, 0, K],
  ];

  const particles: Point3D[] = [];

  // 12 Glowing Vertex Nodes (tier 0)
  rawVertices.forEach(([x, y, z]) => {
    particles.push({ x, y, z, tier: 0, size: 4.5, colorType: 'white' });
  });

  // 30 Edges sampled into 16 discrete quantum dot particles each (480 particles, tier 1)
  const DOTS_PER_EDGE = 16;
  ICO_EDGES.forEach(([v1Idx, v2Idx]) => {
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
  const innerK = (65 * (1.0 + 0.15 * effectiveAudio)) / Math.sqrt(1 + PHI_GOLDEN * PHI_GOLDEN);
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

    particles.push({ x: ix1, y: iy0, z: iz1, tier: 2, size: 2.2, colorType: 'secondary' });
  });

  return { particles, vertices: rawVertices, edges: ICO_EDGES };
}

// 4. Neural DNA Helix Geometry (1,324 particles)
function generateHelixPoints(
  time: number,
  status: AssistantStatus,
  audioLevel: number,
  bassEnergy: number = 0
): { particles: Point3D[]; rungs: { pA: Point3D; pB: Point3D }[] } {
  const effectiveAudio = Math.max(audioLevel, bassEnergy);
  const L = 320;
  const baseRadius = 76 * (1.0 + 0.35 * effectiveAudio * Math.sin(time * 3));
  const pitch = (3 * 2 * Math.PI) / L; // 3 full turns along 320px
  const rotationSpeed = status === 'speaking' ? 0.055 : status === 'thinking' ? 0.04 : 0.018;
  const theta0 = time * rotationSpeed * 60;

  const particles: Point3D[] = [];
  const rungEndpoints: { pA: Point3D; pB: Point3D }[] = [];

  // Dual Antiparallel Strands (400 particles each = 800 total, tier 0 & 1)
  const STRAND_POINTS = 400;
  for (let i = 0; i < STRAND_POINTS; i++) {
    const s = -L / 2 + (i / (STRAND_POINTS - 1)) * L;
    const angleA = pitch * s + theta0;
    const angleB = pitch * s + Math.PI + theta0;

    const rWave = baseRadius * (1.0 + 0.2 * effectiveAudio * Math.sin(3 * pitch * s - time * 4.2));

    // Strand A
    particles.push({
      x: rWave * Math.cos(angleA),
      y: s,
      z: rWave * Math.sin(angleA),
      tier: 0,
      size: 1.5,
    });

    // Strand B
    particles.push({
      x: rWave * Math.cos(angleB),
      y: s,
      z: rWave * Math.sin(angleB),
      tier: 1,
      size: 1.5,
      colorType: 'secondary',
    });
  }

  // 28 Base-Pair Ladder Rungs (8 particles each = 224 total, tier 2)
  const RUNGS = 28;
  const NODES_PER_RUNG = 8;
  for (let k = 0; k < RUNGS; k++) {
    const s_k = -L / 2 + (k / (RUNGS - 1)) * L;
    const angleA = pitch * s_k + theta0;
    const angleB = pitch * s_k + Math.PI + theta0;

    const pA: Point3D = { x: baseRadius * Math.cos(angleA), y: s_k, z: baseRadius * Math.sin(angleA) };
    const pB: Point3D = { x: baseRadius * Math.cos(angleB), y: s_k, z: baseRadius * Math.sin(angleB) };
    rungEndpoints.push({ pA, pB });

    for (let m = 0; m < NODES_PER_RUNG; m++) {
      const u = m / (NODES_PER_RUNG - 1);
      const yOsc = Math.sin(Math.PI * u) * Math.sin(time * 6 + k * 0.4) * (18 * effectiveAudio);
      particles.push({
        x: (1 - u) * pA.x + u * pB.x,
        y: (1 - u) * pA.y + u * pB.y + yOsc,
        z: (1 - u) * pA.z + u * pB.z,
        tier: 2,
        size: 1.3,
      });
    }
  }

  // Synaptic Spark Cloud (300 particles, tier 3)
  const SPARKS = 300;
  for (let i = 0; i < SPARKS; i++) {
    const s = -L / 2 + (Math.sin(i * 91.23 + time * 0.2) * 0.5 + 0.5) * L;
    const sparkR = baseRadius * (1.2 + 0.5 * Math.abs(Math.sin(i * 47.11)));
    const sparkAngle = (i * 0.38) + time * 0.5;
    particles.push({
      x: sparkR * Math.cos(sparkAngle),
      y: s + Math.sin(time * 2 + i) * 10,
      z: sparkR * Math.sin(sparkAngle),
      tier: 3,
      size: 1.2,
      colorType: i % 2 === 0 ? 'white' : 'secondary',
    });
  }

  return { particles, rungs: rungEndpoints };
}

// 5. Hypercube / Tesseract 4D-to-3D Geometry (1,536 elements)
const TESSERACT_EDGES: [number, number][] = [];
for (let i = 0; i < 16; i++) {
  for (let bit = 0; bit < 4; bit++) {
    const j = i ^ (1 << bit);
    if (j > i) {
      TESSERACT_EDGES.push([i, j]);
    }
  }
}

function generateTesseractPoints(
  time: number,
  status: AssistantStatus,
  audioLevel: number,
  midEnergy: number = 0
): { particles: Point3D[]; projected3DVertices: [number, number, number][]; edges: [number, number][] } {
  const effectiveAudio = Math.max(audioLevel, midEnergy);
  const S0 = 95 * (1.0 + 0.32 * effectiveAudio);
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
    particles.push({ x, y, z, tier: 0, size: 4.0, colorType: 'white' });
  });

  // 32 Edges sampled into 12 quantum beam particles each (384 particles, tier 1)
  const DOTS_PER_EDGE = 12;
  TESSERACT_EDGES.forEach(([v1Idx, v2Idx]) => {
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

  return { particles, projected3DVertices, edges: TESSERACT_EDGES };
}

export const FloatingOrb: React.FC = () => {
  const {
    status,
    audioLevel,
    frequencyData,
    accentTheme,
    coreShape = 'sphere',
    toggleListening,
    currentTranscript,
    speakingTranscript,
    deviceSettings,
  } = useVoiceAssistant();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isVoiceActive = status === 'listening' || status === 'speaking';

  // Mutable references for the continuous 60fps animation frame loop
  const statusRef = useRef(status);
  const audioLevelRef = useRef(audioLevel);
  const frequencyDataRef = useRef(frequencyData);
  const accentThemeRef = useRef(accentTheme);
  const coreShapeRef = useRef<CoreShapeId>(coreShape);
  const isVoiceActiveRef = useRef(isVoiceActive);
  const ambientGlowEnabledRef = useRef(deviceSettings.ambientGlow);
  const speakingTranscriptRef = useRef(speakingTranscript);

  useEffect(() => {
    statusRef.current = status;
    audioLevelRef.current = audioLevel;
    frequencyDataRef.current = frequencyData;
    accentThemeRef.current = accentTheme;
    coreShapeRef.current = coreShape;
    isVoiceActiveRef.current = isVoiceActive;
    ambientGlowEnabledRef.current = deviceSettings.ambientGlow;
    speakingTranscriptRef.current = speakingTranscript;
  }, [status, audioLevel, frequencyData, accentTheme, coreShape, isVoiceActive, deviceSettings.ambientGlow, speakingTranscript]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let time = 0;
    let morphProgress = 0;
    let currentYaw = 0;
    let currentPitch = 0.10;
    let velocityYaw = 0;
    let velocityPitch = 0;
    let lastFrameTimestamp = performance.now();

    // Continuous Physics & Smoothing Variables
    let smoothedSpeechEnergy = 0.10;
    let smoothedAudioLevel = 0;
    let smoothedYawSpeed = 0.0020;
    let smoothedGlowAlpha = 0.25;

    // Holographic Laser Pulses traveling around orbital rings
    const holoPulses: HoloPulse[] = Array.from({ length: 16 }, (_, i) => ({
      ringIndex: (i % 2) + 3,
      angle: (i * 0.45) % (Math.PI * 2),
      speed: 0.016 + (i % 2) * 0.010,
      size: 2.0 + (i % 2) * 0.9,
      colorType: i % 3 === 0 ? 'primary' : i % 3 === 1 ? 'white' : 'secondary',
    }));

    // Mouse drag 3D rotation & Momentum inertia tracking
    let isDragging = false;
    let lastMouseX = 0;
    let lastMouseY = 0;
    let lastDragTimestamp = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      lastDragTimestamp = performance.now();
      velocityYaw = 0;
      velocityPitch = 0;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const now = performance.now();
      const dtMouse = Math.max(1, now - lastDragTimestamp) / 1000;
      const dx = e.clientX - lastMouseX;
      const dy = e.clientY - lastMouseY;

      currentYaw += dx * 0.008;
      currentPitch += dy * 0.008;

      // Safe pitch clamping
      const maxPitch = Math.PI / 2 - 0.1;
      const minPitch = -Math.PI / 2 + 0.1;
      currentPitch = Math.max(minPitch, Math.min(maxPitch, currentPitch));

      // Calculate instantaneous drag velocity (smoothed)
      const instantVy = (dx * 0.008) / (dtMouse * 60);
      const instantVp = (dy * 0.008) / (dtMouse * 60);
      velocityYaw = velocityYaw * 0.4 + instantVy * 0.6;
      velocityPitch = velocityPitch * 0.4 + instantVp * 0.6;

      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      lastDragTimestamp = now;
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const canvasElem = canvasRef.current;
    if (canvasElem) {
      canvasElem.addEventListener('mousedown', onMouseDown);
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }

    const render = () => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - lastFrameTimestamp) / 1000);
      lastFrameTimestamp = now;
      const speedFactor = dt * 60; // Normalized 60fps delta multiplier

      const curStatus = statusRef.current;
      const curAudio = audioLevelRef.current || 0;
      const curSpeakingTranscript = speakingTranscriptRef.current || '';
      const isSpeaking = curStatus === 'speaking' || curSpeakingTranscript.trim().length > 0;
      const isListening = curStatus === 'listening';
      const isThinking = curStatus === 'thinking' && !isSpeaking;
      const curActive = isVoiceActiveRef.current || isSpeaking || isListening;
      const curFreq = frequencyDataRef.current;
      const currentTheme = accentThemeRef.current;
      const currentShape = coreShapeRef.current || 'sphere';

      // Parse frequency spectrum data if available
      let bassEnergy = 0;
      let midEnergy = 0;
      let trebleEnergy = 0;
      if (curFreq && curFreq.length > 0) {
        const binCount = curFreq.length;
        const bassEnd = Math.max(1, Math.floor(binCount * 0.12));
        const midEnd = Math.max(bassEnd + 1, Math.floor(binCount * 0.45));

        let sumBass = 0;
        for (let i = 0; i < bassEnd; i++) sumBass += curFreq[i];
        bassEnergy = sumBass / (bassEnd * 255);

        let sumMid = 0;
        for (let i = bassEnd; i < midEnd; i++) sumMid += curFreq[i];
        midEnergy = sumMid / ((midEnd - bassEnd) * 255);

        let sumTreble = 0;
        for (let i = midEnd; i < binCount; i++) sumTreble += curFreq[i];
        trebleEnergy = sumTreble / ((binCount - midEnd) * 255);
      }

      // Extract RGB values for primary and secondary theme colors (#99FFFF default)
      const rgbPrimary = hexToRgb(currentTheme?.primary || '#99FFFF');
      const rgbSecondary = hexToRgb(currentTheme?.secondary || '#00E5FF');

      // Morph progress: Smoothly activates J.A.R.V.I.S. orbital HUD when thinking
      const targetMorph = isThinking ? 1.0 : 0.0;
      morphProgress += (targetMorph - morphProgress) * 0.045 * speedFactor;

      // Smooth cinematic time progression
      time += 0.009 * speedFactor;

      // Smooth exponential interpolation for audio level and speech energy
      smoothedAudioLevel += (curAudio - smoothedAudioLevel) * 0.10 * speedFactor;

      const targetSpeechEnergy = isSpeaking
        ? Math.max(0.70, (smoothedAudioLevel || 0.40) * 2.2)
        : isListening
        ? Math.max(0.35, (smoothedAudioLevel || 0.20) * 1.5)
        : 0.08;
      smoothedSpeechEnergy += (targetSpeechEnergy - smoothedSpeechEnergy) * 0.085 * speedFactor;

      // Update Holo Pulses
      holoPulses.forEach((pulse) => {
        pulse.angle = (pulse.angle + pulse.speed * (isThinking ? 1.4 : 0.8) * speedFactor) % (Math.PI * 2);
      });

      // Cinematic slow continuous 3D rotation & Momentum Decay Physics
      const targetYawSpeed = isSpeaking ? 0.0028 : isThinking ? 0.0036 : 0.0020;
      smoothedYawSpeed += (targetYawSpeed - smoothedYawSpeed) * 0.04 * speedFactor;

      if (!isDragging) {
        currentYaw += velocityYaw * speedFactor;
        currentPitch += velocityPitch * speedFactor;

        // Friction decay: ~0.94 multiplier per frame
        velocityYaw *= Math.pow(0.94, speedFactor);
        velocityPitch *= Math.pow(0.94, speedFactor);

        // Revert to gentle idle drift when momentum dissipates
        if (Math.abs(velocityYaw) < 0.0001) {
          velocityYaw = 0;
          currentYaw += smoothedYawSpeed * speedFactor;
        }
        if (Math.abs(velocityPitch) < 0.0001) {
          velocityPitch = 0;
          currentPitch += (0.10 + Math.sin(time * 0.3) * 0.02 - currentPitch) * 0.02 * speedFactor;
        }
      }

      // Safe pitch clamping: [-π/2 + 0.1, π/2 - 0.1]
      const maxPitch = Math.PI / 2 - 0.1;
      const minPitch = -Math.PI / 2 + 0.1;
      currentPitch = Math.max(minPitch, Math.min(maxPitch, currentPitch));

      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth || 380;
      const height = canvas.clientHeight || 300;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;

      // 3D Euler Transformation
      const cosYaw = Math.cos(currentYaw);
      const sinYaw = Math.sin(currentYaw);
      const cosPitch = Math.cos(currentPitch);
      const sinPitch = Math.sin(currentPitch);
      const fov = 560;

      // --- 1. Atmospheric Ambient Radial Glow (#99FFFF) ---
      if (ambientGlowEnabledRef.current) {
        const targetGlowAlpha = isSpeaking
          ? 0.42 + smoothedAudioLevel * 0.22
          : curActive
          ? 0.35
          : 0.24 + morphProgress * 0.10;
        smoothedGlowAlpha += (targetGlowAlpha - smoothedGlowAlpha) * 0.08;

        const ambientGlow = ctx.createRadialGradient(
          centerX,
          centerY,
          8,
          centerX,
          centerY,
          290 + smoothedSpeechEnergy * 55 + morphProgress * 35
        );

        ambientGlow.addColorStop(0, `rgba(${rgbPrimary.r}, ${rgbPrimary.g}, ${rgbPrimary.b}, ${smoothedGlowAlpha})`);
        ambientGlow.addColorStop(0.48, `rgba(${rgbSecondary.r}, ${rgbSecondary.g}, ${rgbSecondary.b}, ${smoothedGlowAlpha * 0.5})`);
        ambientGlow.addColorStop(1, 'transparent');

        ctx.fillStyle = ambientGlow;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 320, 0, Math.PI * 2);
        ctx.fill();
      }

      // --- 2. 2D Vector Marvel J.A.R.V.I.S. Concentric Holographic HUD Overlays (when thinking) ---
      if (morphProgress > 0.15) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';

        const hudAlpha = morphProgress * (curActive ? 0.88 : 0.70);
        const jarvisSpin1 = time * 0.7;
        const jarvisSpin2 = -time * 1.0;
        const jarvisSpin3 = time * 0.35;

        // A. Segmented Inner Gimbal Arc Ring (encircling the central core)
        ctx.strokeStyle = `rgba(${rgbPrimary.r}, ${rgbPrimary.g}, ${rgbPrimary.b}, ${hudAlpha * 0.8})`;
        ctx.lineWidth = 1.8;
        for (let a = 0; a < 3; a++) {
          const startArc = jarvisSpin1 + (a * Math.PI * 2) / 3;
          ctx.beginPath();
          ctx.arc(centerX, centerY, 162, startArc, startArc + Math.PI * 0.42);
          ctx.stroke();
        }

        // B. Mid Tactical Notch Ring
        ctx.strokeStyle = `rgba(${rgbSecondary.r}, ${rgbSecondary.g}, ${rgbSecondary.b}, ${hudAlpha * 0.65})`;
        ctx.lineWidth = 1.4;
        for (let a = 0; a < 6; a++) {
          const startArc = jarvisSpin2 + (a * Math.PI * 2) / 6;
          ctx.beginPath();
          ctx.arc(centerX, centerY, 188, startArc, startArc + Math.PI * 0.20);
          ctx.stroke();
        }

        // C. Outer Tachometer Tick Ring
        const tickRadius = 216;
        ctx.strokeStyle = `rgba(${rgbPrimary.r}, ${rgbPrimary.g}, ${rgbPrimary.b}, ${hudAlpha * 0.55})`;
        ctx.lineWidth = 1.0;
        for (let i = 0; i < 36; i++) {
          const angle = jarvisSpin3 + (i * Math.PI * 2) / 36;
          const isMajor = i % 6 === 0;
          const rInner = tickRadius - (isMajor ? 9 : 4.5);
          const rOuter = tickRadius + (isMajor ? 7 : 2.5);
          ctx.beginPath();
          ctx.moveTo(centerX + Math.cos(angle) * rInner, centerY + Math.sin(angle) * rInner);
          ctx.lineTo(centerX + Math.cos(angle) * rOuter, centerY + Math.sin(angle) * rOuter);
          ctx.stroke();
        }

        ctx.restore();
      }

      ctx.globalCompositeOperation = 'screen';

      // --- 3. GENERATE PROCEDURAL 3D SHAPE PARTICLES & WIREFRAMES ---
      let rawParticles: Point3D[] = [];
      let icoData: { vertices: [number, number, number][]; edges: [number, number][] } | null = null;
      let tesseractData: { projected3DVertices: [number, number, number][]; edges: [number, number][] } | null = null;
      let helixRungs: { pA: Point3D; pB: Point3D }[] | null = null;

      switch (currentShape) {
        case 'torus':
          rawParticles = generateTorusPoints(time, curStatus, smoothedAudioLevel, bassEnergy);
          break;
        case 'icosahedron': {
          const res = generateIcosahedronPoints(time, curStatus, smoothedAudioLevel, midEnergy);
          rawParticles = res.particles;
          icoData = { vertices: res.vertices, edges: res.edges };
          break;
        }
        case 'helix': {
          const res = generateHelixPoints(time, curStatus, smoothedAudioLevel, bassEnergy);
          rawParticles = res.particles;
          helixRungs = res.rungs;
          break;
        }
        case 'tesseract': {
          const res = generateTesseractPoints(time, curStatus, smoothedAudioLevel, midEnergy);
          rawParticles = res.particles;
          tesseractData = { projected3DVertices: res.projected3DVertices, edges: res.edges };
          break;
        }
        case 'sphere':
        default:
          rawParticles = generateSpherePoints(time, curStatus, smoothedAudioLevel, morphProgress);
          break;
      }

      // Helper to project any 3D coordinate through camera
      const project3D = (x0: number, y0: number, z0: number) => {
        const x1 = x0 * cosYaw - z0 * sinYaw;
        const z1 = x0 * sinYaw + z0 * cosYaw;
        const y2 = y0 * cosPitch - z1 * sinPitch;
        const z2 = y0 * sinPitch + z1 * cosPitch;
        const scale = fov / (fov + z2);
        return {
          sx: centerX + x1 * scale,
          sy: centerY + y2 * scale,
          sz: z2,
          scale,
        };
      };

      // --- 4. DRAW CONNECTING WIREFRAME / LATTICE LINES ---

      // A. Icosahedron Glowing Facet Edge Wireframes
      if (icoData) {
        ctx.save();
        ctx.lineWidth = Math.max(0.8, 1.2 * (1.0 + smoothedAudioLevel * 0.5));
        const edgeAlpha = Math.min(0.7, 0.25 + (isSpeaking ? 0.35 : isListening ? 0.2 : 0.1) + smoothedAudioLevel * 0.25);
        ctx.strokeStyle = `rgba(${rgbPrimary.r}, ${rgbPrimary.g}, ${rgbPrimary.b}, ${edgeAlpha})`;

        icoData.edges.forEach(([v1Idx, v2Idx]) => {
          const v1 = icoData!.vertices[v1Idx];
          const v2 = icoData!.vertices[v2Idx];
          const p1 = project3D(v1[0], v1[1], v1[2]);
          const p2 = project3D(v2[0], v2[1], v2[2]);

          ctx.beginPath();
          ctx.moveTo(p1.sx, p1.sy);
          ctx.lineTo(p2.sx, p2.sy);
          ctx.stroke();
        });
        ctx.restore();
      }

      // B. Tesseract 4D Hypercube Edge Wireframes
      if (tesseractData) {
        ctx.save();
        ctx.lineWidth = Math.max(0.8, 1.1 * (1.0 + smoothedAudioLevel * 0.6));
        const edgeAlpha = Math.min(0.65, 0.22 + (isSpeaking ? 0.32 : isListening ? 0.18 : 0.08) + smoothedAudioLevel * 0.2);
        ctx.strokeStyle = `rgba(${rgbPrimary.r}, ${rgbPrimary.g}, ${rgbPrimary.b}, ${edgeAlpha})`;

        tesseractData.edges.forEach(([v1Idx, v2Idx]) => {
          const v1 = tesseractData!.projected3DVertices[v1Idx];
          const v2 = tesseractData!.projected3DVertices[v2Idx];
          const p1 = project3D(v1[0], v1[1], v1[2]);
          const p2 = project3D(v2[0], v2[1], v2[2]);

          ctx.beginPath();
          ctx.moveTo(p1.sx, p1.sy);
          ctx.lineTo(p2.sx, p2.sy);
          ctx.stroke();
        });
        ctx.restore();
      }

      // C. Neural DNA Helix Base-Pair Rung Connecting Lines
      if (helixRungs) {
        ctx.save();
        const rungAlpha = Math.min(0.6, 0.18 + smoothedAudioLevel * 0.35);
        ctx.lineWidth = 1.0;
        ctx.strokeStyle = `rgba(${rgbSecondary.r}, ${rgbSecondary.g}, ${rgbSecondary.b}, ${rungAlpha})`;

        helixRungs.forEach(({ pA, pB }) => {
          const p1 = project3D(pA.x, pA.y, pA.z);
          const p2 = project3D(pB.x, pB.y, pB.z);

          ctx.beginPath();
          ctx.moveTo(p1.sx, p1.sy);
          ctx.lineTo(p2.sx, p2.sy);
          ctx.stroke();
        });
        ctx.restore();
      }

      // --- 5. PROJECT & DEPTH-SORT ALL PARTICLES ---
      const projectedPoints: ProjectedPoint[] = [];

      for (let i = 0; i < rawParticles.length; i++) {
        const p = rawParticles[i];

        // 3D Euler Transformation
        const x1 = p.x * cosYaw - p.z * sinYaw;
        const z1 = p.x * sinYaw + p.z * cosYaw;

        const y2 = p.y * cosPitch - z1 * sinPitch;
        const z2 = y0Pitch(p.y, z1, cosPitch, sinPitch);

        // Perspective Projection
        const scale = fov / (fov + z2);
        const screenX = centerX + x1 * scale;
        const screenY = centerY + y2 * scale;

        // Laser Energy Pulse Check in J.A.R.V.I.S. Rings & Torus Accretion Rings
        let isPulseActive = false;
        let pulseIntensity = 0;
        let pulseColorType: 'primary' | 'secondary' | 'white' = 'primary';

        const tier = p.tier ?? 0;

        if (currentShape === 'sphere' && morphProgress > 0.2 && (tier === 3 || tier === 4)) {
          const theta = Math.atan2(p.x, p.z);
          for (let k = 0; k < holoPulses.length; k++) {
            const pulse = holoPulses[k];
            if (pulse.ringIndex !== tier) continue;

            const animatedTheta = theta + (tier === 3 ? -time * 1.2 : time * 0.8);
            const dAngle = Math.abs(Math.sin((animatedTheta - pulse.angle) / 2));
            if (dAngle < 0.12) {
              isPulseActive = true;
              pulseIntensity = Math.max(pulseIntensity, 1 - dAngle / 0.12);
              pulseColorType = pulse.colorType;
            }
          }
        }

        // Particle Color & Sizing Calculation
        let rColor = rgbPrimary.r;
        let gColor = rgbPrimary.g;
        let bColor = rgbPrimary.b;
        let pSize = (p.size ?? 1.4) * scale;
        let alpha = 0.55 + scale * 0.35;

        if (isPulseActive) {
          if (pulseColorType === 'white') {
            rColor = 255;
            gColor = 255;
            bColor = 255;
          } else if (pulseColorType === 'secondary') {
            rColor = rgbSecondary.r;
            gColor = rgbSecondary.g;
            bColor = rgbSecondary.b;
          } else {
            rColor = rgbPrimary.r;
            gColor = rgbPrimary.g;
            bColor = rgbPrimary.b;
          }
          pSize = (1.9 + pulseIntensity * 1.4) * scale;
          alpha = 1.0;
        } else if (p.colorType === 'white') {
          rColor = 255;
          gColor = 255;
          bColor = 255;
          alpha = Math.min(1.0, alpha + 0.2);
        } else if (p.colorType === 'secondary' || tier === 3 || tier === 4) {
          rColor = rgbSecondary.r;
          gColor = rgbSecondary.g;
          bColor = rgbSecondary.b;
          if (tier === 3) alpha = 0.85;
          if (tier === 4) alpha = 0.75;
        } else if (isSpeaking && smoothedAudioLevel > 0.25) {
          // Luminescent white-hot highlights on vocal audio crests
          const crest = Math.min(1.0, smoothedAudioLevel * 1.5);
          rColor = Math.min(255, Math.floor(rgbPrimary.r + (255 - rgbPrimary.r) * crest));
          gColor = Math.min(255, Math.floor(rgbPrimary.g + (255 - rgbPrimary.g) * crest));
          bColor = 255;
          pSize = (p.size ?? 1.4) * (1.2 + crest * 0.6) * scale;
          alpha = Math.min(1.0, 0.75 + crest * 0.25);
        } else if (tier === 0 && currentShape === 'sphere') {
          // Sphere elevation gradient
          const normY = (p.y + 150) / 300;
          if (normY > 0.6) {
            rColor = Math.min(255, Math.floor(rgbPrimary.r * 1.05));
            gColor = Math.min(255, Math.floor(rgbPrimary.g * 1.05));
            bColor = Math.min(255, Math.floor(rgbPrimary.b * 1.05));
          } else {
            rColor = Math.floor(rgbSecondary.r * 0.85 + rgbPrimary.r * 0.15);
            gColor = Math.floor(rgbSecondary.g * 0.85 + rgbPrimary.g * 0.15);
            bColor = Math.floor(rgbSecondary.b * 0.85 + rgbPrimary.b * 0.15);
          }
        }

        const colorStr = `rgb(${rColor}, ${gColor}, ${bColor})`;
        const glowStr = `rgba(${rColor}, ${gColor}, ${bColor}, ${alpha * 0.6})`;

        projectedPoints.push({
          x: screenX,
          y: screenY,
          z: z2,
          scale,
          color: colorStr,
          glowColor: glowStr,
          size: Math.max(0.8, pSize),
          alpha: Math.min(1, Math.max(0.15, alpha)),
          isLaserPulse: isPulseActive,
          tier,
        });
      }

      // Sort by depth (Z-buffer back-to-front)
      projectedPoints.sort((a, b) => b.z - a.z);

      // Render 3D Particles
      for (let i = 0; i < projectedPoints.length; i++) {
        const pt = projectedPoints[i];

        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fillStyle = pt.color;
        ctx.globalAlpha = pt.alpha;
        ctx.fill();

        if (pt.isLaserPulse || (curActive && pt.size > 1.8) || (morphProgress > 0.5 && pt.tier < 3)) {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pt.size * 1.8, 0, Math.PI * 2);
          ctx.fillStyle = pt.glowColor;
          ctx.globalAlpha = 0.55;
          ctx.fill();
        }
      }

      ctx.restore();
      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
      if (canvasElem) {
        canvasElem.removeEventListener('mousedown', onMouseDown);
      }
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  const isThinking = status === 'thinking';
  const isListening = status === 'listening';
  const isSpeaking = status === 'speaking';

  // Dynamic Thinking Phrases
  const THINKING_PHRASES = [
    'Checking...',
    'Thinking...',
    'Analyzing data...',
    'Synthesizing answer...',
    'Connecting intelligence...',
  ];
  const [thinkingPhraseIndex, setThinkingPhraseIndex] = useState(0);

  useEffect(() => {
    if (!isThinking) {
      setThinkingPhraseIndex(0);
      return;
    }

    // Play initial subtle thinking chime
    if (deviceSettings?.soundEffects !== false) {
      SoundFXService.getInstance().playChime('thinking');
    }

    const interval = setInterval(() => {
      setThinkingPhraseIndex((prev) => (prev + 1) % THINKING_PHRASES.length);
      if (deviceSettings?.soundEffects !== false) {
        SoundFXService.getInstance().playChime('thinking');
      }
    }, 1800);

    return () => clearInterval(interval);
  }, [isThinking, deviceSettings?.soundEffects]);

  // Subtitle text for speech: only the currently spoken subtitle words
  const spokenSubtitle = speakingTranscript.trim();

  return (
    <div className="relative flex flex-col items-center justify-center select-none w-full max-w-3xl mx-auto py-1">
      {/* 3D Multi-Shape Procedural Intelligence Stage */}
      <div
        id="main-assistant-orb-stage"
        onClick={toggleListening}
        className="relative w-[340px] h-[320px] sm:w-[440px] sm:h-[400px] md:w-[520px] md:h-[460px] lg:w-[580px] lg:h-[500px] flex items-center justify-center cursor-grab active:cursor-grabbing transition-transform hover:scale-[1.02] active:scale-[0.98]"
        role="button"
        tabIndex={0}
        aria-label={`3D ${coreShape} Intelligence Core`}
      >
        {/* Canvas Engine */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-auto z-10 rounded-2xl"
        />
      </div>

      {/* Dynamic Live Subtitles Headline */}
      <div className="z-10 flex flex-col items-center text-center px-4 mt-2 w-full min-h-[64px] justify-center">
        {isListening ? (
          <h1 className="text-lg md:text-xl lg:text-2xl font-medium tracking-tight text-white transition-all duration-200 max-w-xl leading-relaxed">
            {currentTranscript ? (
              <span className="inline-flex items-center">
                <span className="text-white/95 font-medium">"{currentTranscript}"</span>
                <span
                  className="inline-block w-2 h-2 rounded-full ml-2 animate-ping"
                  style={{ backgroundColor: accentTheme.primary }}
                />
              </span>
            ) : (
              <span className="text-neutral-300 italic font-normal">Listening...</span>
            )}
          </h1>
        ) : isSpeaking ? (
          <h1 className="text-lg md:text-xl lg:text-2xl font-medium tracking-tight text-white transition-all duration-200 max-w-xl leading-relaxed">
            {spokenSubtitle ? (
              <span className="text-white/95 leading-snug font-medium">
                "{spokenSubtitle}"
              </span>
            ) : (
              <span className="text-neutral-300 italic font-normal">Speaking...</span>
            )}
          </h1>
        ) : isThinking ? (
          <h1 className="text-xl md:text-2xl lg:text-3xl font-semibold tracking-tight text-white flex items-center justify-center space-x-2">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-white to-cyan-400 animate-pulse">
              {THINKING_PHRASES[thinkingPhraseIndex]}
            </span>
            <span
              className="inline-block w-2 h-2 rounded-full animate-ping"
              style={{ backgroundColor: accentTheme.primary }}
            />
          </h1>
        ) : (
          <h1 className="text-xl md:text-2xl lg:text-3xl font-semibold tracking-tight text-white hover:text-white/90 transition-colors">
            How can I assist you?
          </h1>
        )}
      </div>
    </div>
  );
};

// Helper for Euler Pitch Rotation
function y0Pitch(y0: number, z1: number, cosPitch: number, sinPitch: number): number {
  return y0 * sinPitch + z1 * cosPitch;
}
