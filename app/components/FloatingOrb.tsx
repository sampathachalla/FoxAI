import React, { useRef, useEffect } from 'react';
import { useVoiceAssistant } from '../hooks/useVoiceAssistant';

interface Particle {
  theta: number; // Longitude: 0 to 2*PI
  phi: number;   // Latitude: -PI/2 to PI/2
  row: number;
  col: number;
  seed: number;
  tier: number;  // 0, 1, 2: Central Sphere, 3: Inner Orbital Ring, 4: Outer HUD Ring
  ringRadius: number;
}

interface HoloPulse {
  ringIndex: number;
  angle: number;
  speed: number;
  size: number;
  colorType: 'primary' | 'secondary' | 'white';
}

// Utility to parse hex colors to RGB components
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let clean = (hex || '#99FFFF').replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) {
    return { r: 153, g: 255, b: 255 }; // Safe default #99FFFF
  }
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export const FloatingOrb: React.FC = () => {
  const {
    status,
    audioLevel,
    frequencyData,
    accentTheme,
    toggleListening,
    currentTranscript,
    speakingTranscript,
    messages,
    deviceSettings,
  } = useVoiceAssistant();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isVoiceActive = status === 'listening' || status === 'speaking';

  // Mutable references for the animation frame loop
  const statusRef = useRef(status);
  const audioLevelRef = useRef(audioLevel);
  const frequencyDataRef = useRef(frequencyData);
  const accentThemeRef = useRef(accentTheme);
  const isVoiceActiveRef = useRef(isVoiceActive);
  const ambientGlowEnabledRef = useRef(deviceSettings.ambientGlow);

  useEffect(() => {
    statusRef.current = status;
    audioLevelRef.current = audioLevel;
    frequencyDataRef.current = frequencyData;
    accentThemeRef.current = accentTheme;
    isVoiceActiveRef.current = isVoiceActive;
    ambientGlowEnabledRef.current = deviceSettings.ambientGlow;
  }, [status, audioLevel, frequencyData, accentTheme, isVoiceActive, deviceSettings.ambientGlow]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let time = 0;
    let wavePhase = 0;
    let morphProgress = 0; // 0 = Pure Round Sphere, 1 = J.A.R.V.I.S. Orbital Rings around Central Sphere
    let currentYaw = 0;
    let currentPitch = 0.12;

    // --- Generate 3D Particles for Central Sphere & Orbital Rings ---
    const NUM_ROWS = 40;
    const NUM_COLS = 60;
    const particles: Particle[] = [];

    for (let r = 0; r < NUM_ROWS; r++) {
      const phi = ((r + 0.5) / NUM_ROWS) * Math.PI - Math.PI / 2;
      for (let c = 0; c < NUM_COLS; c++) {
        const theta = (c / NUM_COLS) * Math.PI * 2;
        const seed = Math.sin(r * 12.9898 + c * 78.233);
        const index = r * NUM_COLS + c;

        // Partition: 75% form the central sphere, 25% form orbital gimbal rings in thinking mode
        const tier = index % 5;
        const ringRadius = tier === 3 ? 165 : tier === 4 ? 210 : 0;

        particles.push({
          theta,
          phi,
          row: r,
          col: c,
          seed,
          tier,
          ringRadius,
        });
      }
    }

    // Holographic Laser Pulses traveling around orbital rings
    const holoPulses: HoloPulse[] = Array.from({ length: 16 }, (_, i) => ({
      ringIndex: (i % 2) + 3,
      angle: (i * 0.45) % (Math.PI * 2),
      speed: 0.024 + (i % 2) * 0.015,
      size: 2.0 + (i % 2) * 0.9,
      colorType: i % 3 === 0 ? 'primary' : i % 3 === 1 ? 'white' : 'secondary',
    }));

    // Mouse drag interaction
    let isDragging = false;
    let lastMouseX = 0;
    let lastMouseY = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - lastMouseX;
      const dy = e.clientY - lastMouseY;
      currentYaw += dx * 0.008;
      currentPitch += dy * 0.008;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
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
      const curStatus = statusRef.current;
      const curAudio = audioLevelRef.current || 0;
      const curActive = isVoiceActiveRef.current;
      const isSpeaking = curStatus === 'speaking';
      const isListening = curStatus === 'listening';
      const isThinking = curStatus === 'thinking';
      const curFreq = frequencyDataRef.current;
      const currentTheme = accentThemeRef.current;

      // Extract RGB values for primary and secondary theme colors (#99FFFF default)
      const rgbPrimary = hexToRgb(currentTheme?.primary || '#99FFFF');
      const rgbSecondary = hexToRgb(currentTheme?.secondary || '#00E5FF');

      // Morph progress: Smoothly activates J.A.R.V.I.S. orbital HUD when thinking
      const targetMorph = isThinking ? 1.0 : 0.0;
      morphProgress += (targetMorph - morphProgress) * 0.065;

      // Smooth time progression
      time += 0.012;

      // Dynamic Acoustic wave phase speed (fast traveling waves when speaking)
      const waveSpeed = isSpeaking
        ? 0.038 + curAudio * 0.075
        : isListening
        ? 0.018 + curAudio * 0.035
        : 0.008;
      wavePhase += waveSpeed;

      // Update Holo Pulses
      holoPulses.forEach((pulse) => {
        pulse.angle = (pulse.angle + pulse.speed * (isThinking ? 1.8 : 1.0)) % (Math.PI * 2);
      });

      // Continuous Slow 3D Rotation with subtle pitch undulation
      if (!isDragging) {
        currentYaw += isSpeaking ? 0.0045 : 0.0034;
        currentPitch = 0.12 + Math.sin(time * 0.25) * 0.02;
      }

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
        const ambientGlow = ctx.createRadialGradient(
          centerX,
          centerY,
          8,
          centerX,
          centerY,
          300 + (curActive ? curAudio * 65 : 0) + (morphProgress * 35)
        );

        const glowAlpha1 = isSpeaking ? 0.45 + curAudio * 0.25 : curActive ? 0.38 : 0.25 + morphProgress * 0.12;
        const glowAlpha2 = isSpeaking ? 0.22 + curAudio * 0.15 : curActive ? 0.18 : 0.09 + morphProgress * 0.08;

        ambientGlow.addColorStop(0, `rgba(${rgbPrimary.r}, ${rgbPrimary.g}, ${rgbPrimary.b}, ${glowAlpha1})`);
        ambientGlow.addColorStop(0.48, `rgba(${rgbSecondary.r}, ${rgbSecondary.g}, ${rgbSecondary.b}, ${glowAlpha2})`);
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

        // A. Segmented Inner Gimbal Arc Ring (encircling the central sphere)
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

      // --- 3. PROJECT & RENDER 3D SPHERE PARTICLES & ORBITAL RINGS ---
      const projectedPoints: {
        x: number;
        y: number;
        z: number;
        scale: number;
        color: string;
        glowColor: string;
        size: number;
        alpha: number;
        isLaserPulse: boolean;
        tier: number;
      }[] = [];

      // Base Mathematical Sphere Radius (Enlarged)
      const baseSphereRadius = 148;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // 1. Pristine Pure Mathematical Sphere Geometry with prominent 3D traveling voice waves
        let voiceSoundwave = 0;
        let acousticBrightness = 0;

        const speechEnergy = isSpeaking
          ? Math.max(0.65, (curAudio || 0.4) * 2.4)
          : isListening
          ? Math.max(0.35, (curAudio || 0.2) * 1.8)
          : 0.10;

        const freqIndex = Math.floor(((p.phi + Math.PI / 2) / Math.PI) * (curFreq?.length || 32)) % (curFreq?.length || 32);
        const rawFreq = curFreq && curFreq.length > 0 ? curFreq[freqIndex] : 0;
        const bandEnergy = (rawFreq / 255) * speechEnergy;

        if (isSpeaking) {
          // A. Strong Circumferential Traveling Waves around longitude (circulating around sphere)
          const waveCircumference = Math.sin(p.theta * 4.0 - wavePhase * 3.6) * (speechEnergy * 24.0);

          // B. Vertical Soundwave Ripple cascading through latitude rings
          const waveVertical = Math.cos(p.phi * 5.0 + wavePhase * 4.2) * (speechEnergy * 20.0);

          // C. Vocal Resonance Core Bulge & Breathing
          const voiceBulge = Math.cos(p.phi) * Math.sin(time * 12.0 + p.theta * 2.0) * (speechEnergy * 16.0);

          // D. Physical Vocal Formant Micro-Vibration & High-Frequency Jitter
          const vocalVibration =
            Math.sin(time * 48.0 + p.phi * 14.0) * (speechEnergy * 7.5) +
            Math.cos(time * 72.0 + p.theta * 18.0) * (speechEnergy * 5.5);
          const vocalJitter = (Math.sin(p.seed * 89 + time * 36) * 0.6) * (speechEnergy * 4.0);

          // E. FFT Audio Frequency Resonance
          const freqRipple = (rawFreq / 255) * (speechEnergy * 22.0) * Math.sin(p.theta * 3.0 + time * 8.0);

          voiceSoundwave = waveCircumference + waveVertical + voiceBulge + vocalVibration + vocalJitter + freqRipple;
          acousticBrightness = Math.min(1.0, 0.45 + speechEnergy * 0.45 + Math.abs(voiceSoundwave) / 36);
        } else if (isListening) {
          // Listening mode (responsive acoustic ripples reacting to user speech)
          const wordWave1 = Math.sin(p.phi * 4.0 - wavePhase * 1.8) * (speechEnergy * 12.0);
          const wordWave2 = Math.cos(p.theta * 3.0 - wavePhase * 1.4) * (speechEnergy * 10.0);
          voiceSoundwave = wordWave1 + wordWave2;
          acousticBrightness = speechEnergy * 0.75;
        } else {
          // Gentle resting breathing undulation
          voiceSoundwave = Math.sin(time * 2.0 + p.phi * 2.0 + p.theta * 2.0) * 3.0;
          acousticBrightness = 0.15;
        }

        const rSph = baseSphereRadius + voiceSoundwave;
        const xSph = rSph * Math.cos(p.phi) * Math.sin(p.theta);
        const ySph = rSph * Math.sin(p.phi);
        const zSph = rSph * Math.cos(p.phi) * Math.cos(p.theta);

        // 2. Orbital Rings in J.A.R.V.I.S. Mode (Sphere remains the centerpiece)
        let jX = xSph;
        let jY = ySph;
        let jZ = zSph;

        if (p.tier === 3) {
          // Inner Orbital Gimbal Ring revolving around sphere
          const spinSpeed = -time * 1.2;
          const animatedTheta = p.theta + spinSpeed;
          const rad = p.ringRadius + Math.sin(time * 3 + p.theta * 4) * 1.5;

          const tilt = Math.PI * 0.28;
          const rx = Math.cos(animatedTheta) * rad;
          const rz = Math.sin(animatedTheta) * rad;
          jX = rx;
          jY = rz * Math.sin(tilt);
          jZ = rz * Math.cos(tilt);
        } else if (p.tier === 4) {
          // Outer Gimbal Ring revolving counter-clockwise
          const spinSpeed = time * 0.8;
          const animatedTheta = p.theta + spinSpeed;
          const rad = p.ringRadius + Math.sin(time * 3 + p.theta * 4) * 2.0;

          const tilt = -Math.PI * 0.32;
          const rx = Math.cos(animatedTheta) * rad;
          const rz = Math.sin(animatedTheta) * rad;
          jX = rx * Math.cos(tilt);
          jY = rx * Math.sin(tilt);
          jZ = rz;
        } else {
          // Central Sphere Core: stays pure and spherical with energy pulsation
          const breath = Math.sin(time * 2.5 + p.seed * 3) * (0.8 + morphProgress * 1.2);
          jX = (baseSphereRadius + breath + voiceSoundwave) * Math.cos(p.phi) * Math.sin(p.theta);
          jY = (baseSphereRadius + breath + voiceSoundwave) * Math.sin(p.phi);
          jZ = (baseSphereRadius + breath + voiceSoundwave) * Math.cos(p.phi) * Math.cos(p.theta);
        }

        // 3. Smooth Morphing Interpolation
        const easeMorph =
          morphProgress < 0.5
            ? 2 * morphProgress * morphProgress
            : 1 - Math.pow(-2 * morphProgress + 2, 2) / 2;

        const x0 = xSph * (1 - easeMorph) + jX * easeMorph;
        const y0 = ySph * (1 - easeMorph) + jY * easeMorph;
        const z0 = zSph * (1 - easeMorph) + jZ * easeMorph;

        // 4. 3D Camera Rotation
        const x1 = x0 * cosYaw - z0 * sinYaw;
        const z1 = x0 * sinYaw + z0 * cosYaw;

        const y2 = y0 * cosPitch - z1 * sinPitch;
        const z2 = y0 * sinPitch + z1 * cosPitch;

        // 5. Perspective Projection
        const scale = fov / (fov + z2);
        const screenX = centerX + x1 * scale;
        const screenY = centerY + y2 * scale;

        // 6. Laser Energy Pulse Check in J.A.R.V.I.S. Rings
        let isPulseActive = false;
        let pulseIntensity = 0;
        let pulseColorType: 'primary' | 'secondary' | 'white' = 'primary';

        if (morphProgress > 0.2 && (p.tier === 3 || p.tier === 4)) {
          for (let k = 0; k < holoPulses.length; k++) {
            const pulse = holoPulses[k];
            if (pulse.ringIndex !== p.tier) continue;

            const animatedTheta = p.theta + (p.tier === 3 ? -time * 1.2 : time * 0.8);
            const dAngle = Math.abs(Math.sin((animatedTheta - pulse.angle) / 2));
            if (dAngle < 0.12) {
              isPulseActive = true;
              pulseIntensity = Math.max(pulseIntensity, 1 - dAngle / 0.12);
              pulseColorType = pulse.colorType;
            }
          }
        }

        // 7. Dynamic Palette Bound to #99FFFF Theme
        const normalizedElevation = (y0 + baseSphereRadius) / (baseSphereRadius * 2);
        let rColor: number;
        let gColor: number;
        let bColor: number;
        let pSize = 1.45 * scale;
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
        } else if (morphProgress > 0.4 && (p.tier === 3 || p.tier === 4)) {
          // Orbital Rings
          if (p.tier === 3) {
            rColor = rgbSecondary.r;
            gColor = rgbSecondary.g;
            bColor = rgbSecondary.b;
            pSize = 1.45 * scale;
            alpha = 0.85;
          } else {
            rColor = Math.floor(rgbPrimary.r * 0.85);
            gColor = Math.floor(rgbPrimary.g * 0.95);
            bColor = Math.floor(rgbPrimary.b);
            pSize = 1.35 * scale;
            alpha = 0.75;
          }
        } else {
          // Central Sphere Core Coloring (#99FFFF)
          if (isSpeaking) {
            // High energy luminescent wave peak coloring when talking
            const peakGlow = acousticBrightness;
            rColor = Math.min(255, Math.floor(rgbPrimary.r + (255 - rgbPrimary.r) * peakGlow * 0.85));
            gColor = Math.min(255, Math.floor(rgbPrimary.g + (255 - rgbPrimary.g) * peakGlow * 0.85));
            bColor = Math.min(255, Math.floor(rgbPrimary.b + (255 - rgbPrimary.b) * peakGlow * 0.85));
            pSize = (1.5 + peakGlow * 1.2) * scale;
            alpha = Math.min(1.0, 0.65 + peakGlow * 0.35);
          } else if (normalizedElevation > 0.65 || (curActive && curAudio > 0.35)) {
            const peakGlow = curActive ? acousticBrightness : 0.25;
            rColor = Math.min(255, Math.floor(rgbPrimary.r + (255 - rgbPrimary.r) * peakGlow));
            gColor = Math.min(255, Math.floor(rgbPrimary.g + (255 - rgbPrimary.g) * peakGlow));
            bColor = Math.min(255, Math.floor(rgbPrimary.b + (255 - rgbPrimary.b) * peakGlow));
            pSize = (1.6 + (curActive ? acousticBrightness * 0.5 : 0)) * scale;
            alpha = Math.min(1.0, alpha + (curActive ? acousticBrightness * 0.25 : 0));
          } else if (normalizedElevation > 0.3) {
            const elevBlend = (normalizedElevation - 0.3) / 0.35;
            rColor = Math.floor(rgbSecondary.r * (1 - elevBlend) + rgbPrimary.r * elevBlend);
            gColor = Math.floor(rgbSecondary.g * (1 - elevBlend) + rgbPrimary.r * elevBlend);
            bColor = Math.floor(rgbSecondary.b * (1 - elevBlend) + rgbPrimary.b * elevBlend);
            pSize = 1.45 * scale;
          } else {
            rColor = Math.floor(rgbSecondary.r * 0.8);
            gColor = Math.floor(rgbSecondary.g * 0.9);
            bColor = Math.floor(rgbSecondary.b);
            pSize = 1.38 * scale;
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
          tier: p.tier,
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

        if (pt.isLaserPulse || (curActive && pt.size > 1.7) || (morphProgress > 0.5 && pt.tier < 3)) {
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

  // Subtitle text for speech: only the currently spoken subtitle words
  const spokenSubtitle = speakingTranscript.trim();

  return (
    <div className="relative flex flex-col items-center justify-center select-none w-full max-w-3xl mx-auto py-1">
      {/* 3D Pristine Particle Sphere - Enlarged */}
      <div
        id="main-assistant-orb-stage"
        onClick={toggleListening}
        className="relative w-[340px] h-[320px] sm:w-[440px] sm:h-[400px] md:w-[520px] md:h-[460px] lg:w-[580px] lg:h-[500px] flex items-center justify-center cursor-grab active:cursor-grabbing transition-transform hover:scale-[1.02] active:scale-[0.98]"
        role="button"
        tabIndex={0}
        aria-label="3D Pristine Particle Sphere"
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
          <h1 className="text-xl md:text-2xl lg:text-3xl font-semibold tracking-tight text-neutral-200 animate-pulse">
            Thinking...
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
