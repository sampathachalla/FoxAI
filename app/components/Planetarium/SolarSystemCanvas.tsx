/**
 * Fox AI 3D Planetarium Simulation — 60 FPS HTML5 Canvas 3D Rendering Core.
 * Implements Euler Orbit Camera, Drag Momentum Physics, Screen-Space Raycasting,
 * Keplerian Planetary Orbits, 3D Saturn Ring Depth Sorting & Audio Reactivity.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { CelestialId, CelestialBodyData } from '../../types/index.ts';
import {
  CELESTIAL_BODIES,
  CELESTIAL_BODY_MAP,
  PLANET_VISUAL_RADII,
  RELATIVE_ORBITAL_SPEEDS,
  getCelestialBody,
} from './PlanetaryData.ts';
import {
  type Point3D,
  type ProjectedBodyItem,
  createStarfield,
  renderStarfield,
  computeSolarFlareParams,
  renderSun,
  renderPlanet,
  renderSaturnRingPass,
  renderOrbitalTrack,
  renderPlanetLabel,
} from './SolarShaders.ts';
import { useVoiceAssistant } from '../../hooks/useVoiceAssistant';

export interface SolarSystemCanvasProps {
  focusedId?: CelestialId;
  onSelectCelestial?: (id: CelestialId) => void;
  simulationSpeed?: number;
  isPaused?: boolean;
  audioLevel?: number;
  frequencyData?: Uint8Array | null;
  showOrbits?: boolean;
  showLabels?: boolean;
  showGrid?: boolean;
  onResetCamera?: () => void;
  className?: string;
}

export const SolarSystemCanvas: React.FC<SolarSystemCanvasProps> = ({
  focusedId = 'sun',
  onSelectCelestial,
  simulationSpeed = 1.0,
  isPaused = false,
  audioLevel: propAudioLevel,
  frequencyData: propFrequencyData,
  showOrbits = true,
  showLabels = true,
  showGrid = true,
  onResetCamera,
  className = '',
}) => {
  // Voice Assistant Audio Context
  const { audioLevel: contextAudioLevel, frequencyData: contextFrequencyData } = useVoiceAssistant();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Synchronized Mutable References for the 60 FPS render loop
  const focusedIdRef = useRef<CelestialId>(focusedId);
  const simulationSpeedRef = useRef<number>(simulationSpeed);
  const isPausedRef = useRef<boolean>(isPaused);
  const showOrbitsRef = useRef<boolean>(showOrbits);
  const showLabelsRef = useRef<boolean>(showLabels);
  const audioLevelRef = useRef<number>(propAudioLevel ?? contextAudioLevel ?? 0);
  const frequencyDataRef = useRef<Uint8Array | null>(propFrequencyData ?? contextFrequencyData ?? null);

  useEffect(() => {
    focusedIdRef.current = focusedId;
    simulationSpeedRef.current = simulationSpeed;
    isPausedRef.current = isPaused;
    showOrbitsRef.current = showOrbits;
    showLabelsRef.current = showLabels;
    audioLevelRef.current = propAudioLevel ?? contextAudioLevel ?? 0;
    frequencyDataRef.current = propFrequencyData ?? contextFrequencyData ?? null;
  }, [
    focusedId,
    simulationSpeed,
    isPaused,
    showOrbits,
    showLabels,
    propAudioLevel,
    contextAudioLevel,
    propFrequencyData,
    contextFrequencyData,
  ]);

  // Hovered Body State for Cursor
  const [hoveredBodyId, setHoveredBodyId] = useState<CelestialId | null>(null);
  const hoveredBodyIdRef = useRef<CelestialId | null>(null);
  hoveredBodyIdRef.current = hoveredBodyId;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let time = 0;
    let lastFrameTimestamp = performance.now();

    // -------------------------------------------------------------------------
    // 1. 3D Camera State & Physics Constants
    // -------------------------------------------------------------------------
    let currentYaw = 0.45;
    let currentPitch = 0.55; // ~31.5° elevated orbital perspective
    let currentZoom = 560;

    let targetZoom = 560;
    let velocityYaw = 0;
    let velocityPitch = 0;

    // Smoothed Focus Offset Tracking (world coordinates being centered)
    let currentFocusOffset: Point3D = { x: 0, y: 0, z: 0 };
    let targetFocusOffset: Point3D = { x: 0, y: 0, z: 0 };

    // Starfield Particle Cache
    const starfield = createStarfield(320);

    // Projected Bodies Cache for Raycasting
    let currentProjectedBodies: ProjectedBodyItem[] = [];

    // Drag Interaction State
    let isDragging = false;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let lastPointerTimestamp = 0;
    let hasDraggedSignificantly = false;

    // Pinch-to-zoom multi-touch tracking
    let initialPinchDistance = 0;
    let initialPinchZoom = currentZoom;

    // -------------------------------------------------------------------------
    // 2. 3D Keplerian Position Calculation Helper
    // -------------------------------------------------------------------------
    const getOrbitalPosition = (
      body: CelestialBodyData,
      simTime: number,
      speedMult: number
    ): Point3D => {
      if (body.id === 'sun' || body.orbitalRadiusScaled === 0) {
        return { x: 0, y: 0, z: 0 };
      }

      // Angular velocity following Keplerian harmonic scaling
      const baseSpeed = 0.45;
      const angularSpeed =
        (baseSpeed * (body.orbitalSpeedKmS / 29.8) * speedMult) /
        Math.max(1, body.orbitalRadiusScaled * 0.02);
      const angle = simTime * angularSpeed + body.distanceAu * 1.85;

      const r = body.orbitalRadiusScaled;
      const incRad = (body.orbitalInclinationDeg * Math.PI) / 180;

      // 3D coordinates with orbital plane inclination
      const x = r * Math.cos(angle);
      const y = r * Math.sin(angle) * Math.sin(incRad);
      const z = r * Math.sin(angle) * Math.cos(incRad);

      return { x, y, z };
    };

    // -------------------------------------------------------------------------
    // 3. 3D Euler Perspective Projection Helper
    // -------------------------------------------------------------------------
    const project3DToScreen = (
      pos: Point3D,
      camera: { yaw: number; pitch: number; zoom: number; focusOffset: Point3D },
      width: number,
      height: number
    ): { screenX: number; screenY: number; screenZ: number; scale: number } => {
      const cx = width / 2;
      const cy = height / 2;
      const fov = camera.zoom;

      const relX = pos.x - camera.focusOffset.x;
      const relY = pos.y - camera.focusOffset.y;
      const relZ = pos.z - camera.focusOffset.z;

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

      // 3. Perspective Scale
      const depth = Math.max(10, fov + z2);
      const scale = fov / depth;

      const screenX = cx + x1 * scale;
      const screenY = cy + y2 * scale;

      return { screenX, screenY, screenZ: z2, scale };
    };

    // -------------------------------------------------------------------------
    // 4. Raycasting / Hit Detection
    // -------------------------------------------------------------------------
    const raycastHit = (mx: number, my: number): CelestialId | null => {
      let closestId: CelestialId | null = null;
      let closestDistSq = Infinity;
      let closestZ = Infinity;

      for (const body of currentProjectedBodies) {
        const hitRadius = Math.max(body.screenRadius + 12, 18); // Minimum 18px hit target
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

    // -------------------------------------------------------------------------
    // 5. Pointer & Touch Event Handlers
    // -------------------------------------------------------------------------
    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      hasDraggedSignificantly = false;
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
      lastPointerTimestamp = performance.now();
      velocityYaw = 0;
      velocityPitch = 0;
      if (canvasElem) canvasElem.style.cursor = 'grabbing';
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      if (!isDragging) {
        // Hover Raycast
        const hit = raycastHit(mx, my);
        if (hit !== hoveredBodyIdRef.current) {
          setHoveredBodyId(hit);
        }
        if (canvasElem) {
          canvasElem.style.cursor = hit ? 'pointer' : 'grab';
        }
        return;
      }

      // Drag 3D Rotation
      const now = performance.now();
      const dtPointer = Math.max(0.001, (now - lastPointerTimestamp) / 1000);
      const dx = e.clientX - lastPointerX;
      const dy = e.clientY - lastPointerY;

      if (Math.hypot(dx, dy) > 3) {
        hasDraggedSignificantly = true;
      }

      currentYaw += dx * 0.006;
      currentPitch += dy * 0.006;

      // Safe Pitch Clamping: [-85°, +85°]
      const PITCH_LIMIT = (85 * Math.PI) / 180;
      currentPitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, currentPitch));

      // Instantaneous Drag Velocity with smoothing
      const instVy = (dx * 0.006) / (dtPointer * 60);
      const instVp = (dy * 0.006) / (dtPointer * 60);
      velocityYaw = velocityYaw * 0.4 + instVy * 0.6;
      velocityPitch = velocityPitch * 0.4 + instVp * 0.6;

      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
      lastPointerTimestamp = now;
    };

    const onPointerUp = (e: PointerEvent) => {
      isDragging = false;
      if (canvasElem) {
        canvasElem.style.cursor = hoveredBodyIdRef.current ? 'pointer' : 'grab';
      }

      // If user clicked without dragging, select clicked celestial body
      if (!hasDraggedSignificantly) {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const hit = raycastHit(mx, my);
        if (hit && onSelectCelestial) {
          onSelectCelestial(hit);
        }
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomDelta = e.deltaY * -0.65;
      targetZoom = Math.max(120, Math.min(1600, targetZoom + zoomDelta));
    };

    // Touch Event Handlers for Mobile Gestures
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        // Pinch zoom start
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        initialPinchDistance = Math.hypot(dx, dy);
        initialPinchZoom = currentZoom;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && initialPinchDistance > 0) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        const scaleFactor = dist / initialPinchDistance;
        targetZoom = Math.max(120, Math.min(1600, initialPinchZoom * scaleFactor));
      }
    };

    const canvasElem = canvasRef.current;
    if (canvasElem) {
      canvasElem.addEventListener('pointerdown', onPointerDown);
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      canvasElem.addEventListener('wheel', onWheel, { passive: false });
      canvasElem.addEventListener('touchstart', onTouchStart, { passive: true });
      canvasElem.addEventListener('touchmove', onTouchMove, { passive: false });
    }

    // -------------------------------------------------------------------------
    // 6. Main 60 FPS Render Loop
    // -------------------------------------------------------------------------
    const render = () => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - lastFrameTimestamp) / 1000);
      lastFrameTimestamp = now;
      const speedFactor = dt * 60;

      // Time progression with pause / speed support
      if (!isPausedRef.current) {
        time += 0.012 * simulationSpeedRef.current * speedFactor;
      }

      const activeTargetId = focusedIdRef.current;
      const activeAudio = audioLevelRef.current || 0;
      const activeFreq = frequencyDataRef.current;
      const shouldShowOrbits = showOrbitsRef.current;
      const shouldShowLabels = showLabelsRef.current;
      const activeHovered = hoveredBodyIdRef.current;

      // Dynamic Focus Target Calculation
      const targetBodyData = getCelestialBody(activeTargetId);
      const calculatedTargetPos = getOrbitalPosition(
        targetBodyData,
        time,
        simulationSpeedRef.current
      );
      targetFocusOffset = calculatedTargetPos;

      // Smooth Camera Focus Glide Lerp
      const lerpSpeed = 1 - Math.exp(-6.0 * dt);
      currentFocusOffset.x += (targetFocusOffset.x - currentFocusOffset.x) * lerpSpeed;
      currentFocusOffset.y += (targetFocusOffset.y - currentFocusOffset.y) * lerpSpeed;
      currentFocusOffset.z += (targetFocusOffset.z - currentFocusOffset.z) * lerpSpeed;

      // Smooth Zoom Interpolation
      const zoomLerpSpeed = 1 - Math.exp(-5.0 * dt);
      currentZoom += (targetZoom - currentZoom) * zoomLerpSpeed;

      // Camera Momentum Physics & Friction Decay
      if (!isDragging) {
        currentYaw += velocityYaw * speedFactor;
        currentPitch += velocityPitch * speedFactor;

        // Friction decay: 0.92 per frame
        velocityYaw *= Math.pow(0.92, speedFactor);
        velocityPitch *= Math.pow(0.92, speedFactor);

        // Gentle idle orbital drift when momentum dissipates
        if (Math.abs(velocityYaw) < 0.0001) {
          velocityYaw = 0;
          currentYaw += 0.0012 * speedFactor;
        }
        if (Math.abs(velocityPitch) < 0.0001) {
          velocityPitch = 0;
        }
      }

      // Safe Pitch Clamping: [-85°, +85°]
      const PITCH_LIMIT = (85 * Math.PI) / 180;
      currentPitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, currentPitch));

      // High-DPI Canvas Buffer Scaling
      const dpr = Math.min(window.devicePixelRatio || 1, 2.0);
      const width = canvas.clientWidth || 800;
      const height = canvas.clientHeight || 600;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const activeCamera = {
        yaw: currentYaw,
        pitch: currentPitch,
        zoom: currentZoom,
        focusOffset: currentFocusOffset,
      };

      // -----------------------------------------------------------------------
      // Step 1: Render Starfield & Deep Space Backdrop
      // -----------------------------------------------------------------------
      renderStarfield(ctx, starfield, activeCamera, width, height, time);

      // -----------------------------------------------------------------------
      // Step 2: Render 3D Holographic Orbital Trajectory Tracks
      // -----------------------------------------------------------------------
      if (shouldShowOrbits) {
        for (const body of CELESTIAL_BODIES) {
          if (body.id === 'sun') continue;
          renderOrbitalTrack(
            ctx,
            body,
            activeCamera,
            width,
            height,
            body.id === activeHovered,
            body.id === activeTargetId,
            activeAudio,
            time
          );
        }
      }

      // -----------------------------------------------------------------------
      // Step 3: Project All 10 Celestial Bodies
      // -----------------------------------------------------------------------
      const projectedList: ProjectedBodyItem[] = [];
      const solarFlareParams = computeSolarFlareParams(time, activeAudio, activeFreq);

      let sunScreenPos = { x: width / 2, y: height / 2 };

      for (const body of CELESTIAL_BODIES) {
        const worldPos = getOrbitalPosition(body, time, simulationSpeedRef.current);
        const proj = project3DToScreen(worldPos, activeCamera, width, height);

        const baseRad = PLANET_VISUAL_RADII[body.id] || 8.0;
        let screenRadius = baseRad * proj.scale;
        let glowRadius = screenRadius * 2.2;

        if (body.id === 'sun') {
          screenRadius = solarFlareParams.coreRadius * proj.scale;
          glowRadius = solarFlareParams.coronalGlowRadius * proj.scale;
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
          isHovered: body.id === activeHovered,
          isSelected: body.id === activeTargetId,
        });
      }

      // Save for raycasting hit tests
      currentProjectedBodies = projectedList;

      // -----------------------------------------------------------------------
      // Step 4: Depth-Sorted Rendering (Back-to-Front)
      // -----------------------------------------------------------------------
      const sortedBodies = [...projectedList].sort((a, b) => b.screenZ - a.screenZ);
      const saturnItem = projectedList.find((b) => b.id === 'saturn');

      for (const item of sortedBodies) {
        if (item.id === 'sun') {
          // Central Luminous Star
          renderSun(ctx, item, solarFlareParams, time);
        } else if (item.id === 'saturn') {
          // Saturn 3D Horizon-Split: Far Rings -> Globe -> Near Rings
          renderSaturnRingPass(ctx, item, activeCamera, false, activeAudio, time);
          renderPlanet(ctx, item, sunScreenPos, time);
          renderSaturnRingPass(ctx, item, activeCamera, true, activeAudio, time);
        } else {
          // Standard Planet
          renderPlanet(ctx, item, sunScreenPos, time);
        }
      }

      // -----------------------------------------------------------------------
      // Step 5: Render Planet Labels & Scientific Telemetry
      // -----------------------------------------------------------------------
      if (shouldShowLabels) {
        for (const item of projectedList) {
          if (item.isSelected || item.isHovered) {
            renderPlanetLabel(ctx, item, item.isSelected);
          }
        }
      }

      ctx.restore();
      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);

    // Cleanup on component unmount
    return () => {
      cancelAnimationFrame(animationId);
      if (canvasElem) {
        canvasElem.removeEventListener('pointerdown', onPointerDown);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        canvasElem.removeEventListener('wheel', onWheel);
        canvasElem.removeEventListener('touchstart', onTouchStart);
        canvasElem.removeEventListener('touchmove', onTouchMove);
      }
    };
  }, [onSelectCelestial]);

  return (
    <div className={`relative w-full h-full overflow-hidden select-none touch-none ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full block cursor-grab active:cursor-grabbing"
      />
    </div>
  );
};
