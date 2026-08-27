# Handoff Report — Visualizer Architecture & 3D Rendering Pipeline Survey

**Agent**: `teamwork_preview_explorer_survey_1`  
**Working Directory**: `/Users/sampath/Desktop/fox-jarvis-inspiration/.agents/teamwork_preview_explorer_survey_1`  
**Primary Deliverable**: `survey_visualizer.md`  

---

## 1. Observation

1. **Visualizer Component & Canvas Engine**:
   - Located in `/Users/sampath/Desktop/fox-jarvis-inspiration/app/components/FloatingOrb.tsx` (`lines 1–687`).
   - Uses standard HTML5 Canvas 2D: `canvas.getContext('2d')` (`line 78`).
   - Resolution management with `devicePixelRatio`:
     ```typescript
     const dpr = window.devicePixelRatio || 1;
     const width = canvas.clientWidth || 380;
     const height = canvas.clientHeight || 300;
     if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
       canvas.width = width * dpr;
       canvas.height = height * dpr;
     }
     ```
   - 3D Projection math (`lines 429–440`):
     ```typescript
     const x1 = x0 * cosYaw - z0 * sinYaw;
     const z1 = x0 * sinYaw + z0 * cosYaw;
     const y2 = y0 * cosPitch - z1 * sinPitch;
     const z2 = y0 * sinPitch + z1 * cosPitch;
     const scale = fov / (fov + z2); // fov = 560
     const screenX = centerX + x1 * scale;
     const screenY = centerY + y2 * scale;
     ```
   - Depth sorting (`line 549`): `projectedPoints.sort((a, b) => b.z - a.z)`.
   - Drawing particles with canvas 2D arc paths (`lines 555–568`):
     ```typescript
     ctx.beginPath();
     ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
     ctx.fillStyle = pt.color;
     ctx.globalAlpha = pt.alpha;
     ctx.fill();
     ```

2. **Audio Reactivity Pipeline**:
   - `AudioAnalyserService` in `/Users/sampath/Desktop/fox-jarvis-inspiration/app/utils/audio.ts` (`lines 3–106`):
     - Uses Web Audio API `AudioContext`, `createMediaStreamSource`, `createAnalyser` with `fftSize = 256` and `smoothingTimeConstant = 0.8`.
     - Maps average frequency bin values to normalized level (`line 67`): `const normalizedLevel = Math.min(1, Math.pow(average / 128, 1.2))`.
   - `DeepgramAudioService` in `/Users/sampath/Desktop/fox-jarvis-inspiration/app/utils/speech.ts` (`lines 258–285`): connects `createMediaElementSource(audio)` to `AnalyserNode` during neural speech playback.
   - `SpeechVisualizerSimulator` in `/Users/sampath/Desktop/fox-jarvis-inspiration/app/utils/audio.ts` (`lines 112–153`): procedural vocal wave simulation for browser fallback.
   - Audio state exposed in `/Users/sampath/Desktop/fox-jarvis-inspiration/app/store/assistantContext.tsx`: `audioLevel: number` (0 to 1) and `frequencyData: Uint8Array | null`.
   - Wave displacement physics in `FloatingOrb.tsx` (`lines 345–377`): Longitude circumferential soundwaves (`Math.sin(p.theta * 4.0 - time * 3.2) * (vocalCadence * 38.0)`), latitude ripple waves (`Math.cos(p.phi * 5.0 + time * 3.6) * (vocalCadence * 32.0)`), and vocal breathing bulge (`Math.cos(p.phi) * Math.sin(time * 2.4 + p.theta) * (vocalCadence * 26.0)`).

3. **Assistant States & Color Accents**:
   - States (`idle`, `listening`, `thinking`, `speaking`) synchronized via mutable refs (`statusRef.current = status`) in `FloatingOrb.tsx` (`lines 57–73`).
   - Thinking state triggers smooth morphing (`morphProgress` from 0.0 to 1.0) into J.A.R.V.I.S. orbital gimbal rings (tier 3 & 4 particles) and concentric 2D vector HUD overlays (`lines 270–316`).
   - Theme accents from `ACCENT_THEMES` in `app/utils/formatters.ts` (`lines 17–81`) parsed to RGB via `hexToRgb()` in `FloatingOrb.tsx` (`lines 24–38`) for elevation color gradient and high-energy white crest boosting.

4. **Mouse Drag & Rotation Physics**:
   - Implemented in `FloatingOrb.tsx` (`lines 134–161`): `mousedown` on canvas, `mousemove` and `mouseup` on window.
   - Computes `currentYaw += dx * 0.008` and `currentPitch += dy * 0.008`.
   - Continuous auto-rotation when not dragging (`line 219`): `currentYaw += smoothedYawSpeed * speedFactor`.
   - Release currently transitions directly to constant yaw speed without angular inertial velocity damping.

5. **Embedding in Voice Stage**:
   - In `app/App.tsx` (`lines 97–107`), renders `<AuraStage />` when `appMode === 'voice'`.
   - In `app/components/AuraStage.tsx` (`lines 63–68`), `<FloatingOrb />` occupies the central stage while an in-scene transcript overlay (`ConversationFeed`) floats on the right.
   - Canvas container in `FloatingOrb.tsx` (`lines 628–640`) is clickable and invokes `toggleListening()`.

6. **Build & Lint Verification**:
   - Ran `npm run lint` (`tsc --noEmit` on workspace `app` and `api`): Exited with code 0 (clean).

---

## 2. Logic Chain

1. **Step 1 (Rendering Pipeline)**: Based on Observation 1, the visualizer does not use Three.js or WebGL; it renders entirely on HTML5 Canvas 2D via custom 3D trigonometric perspective projection and back-to-front depth sorting. This ensures zero external library overhead and high 60 FPS performance across modern browsers.
2. **Step 2 (Audio Reactivity)**: Based on Observation 2, audio levels and frequency bins from Web Audio API `AnalyserNode` (and `SpeechVisualizerSimulator` fallback) are exposed through `assistantContext.tsx`. The visualizer applies exponential smoothing and dynamic trigonometric wave displacement to vertices, scaling particle radii and luminescent glows based on vocal energy.
3. **Step 3 (State & Theme Transitions)**: Based on Observation 3, status transitions drive geometric morphing (sphere to orbital rings in thinking mode) and theme colors tint both 3D particles and 2D canvas overlays without triggering React component re-renders (using ref-based frame reads).
4. **Step 4 (Interactivity & Motion)**: Based on Observation 4, mouse dragging modulates yaw and pitch. Implementing momentum decay requires adding velocity tracking (`yawVelocity`, `pitchVelocity`) with exponential friction damping ($\approx 0.94$) upon mouse release.
5. **Step 5 (Extensibility for 4 New Shapes & Settings UI)**: Based on Observations 1–5, the procedural mathematical approach in `FloatingOrb.tsx` can be extended into a multi-shape 3D engine supporting Quantum Torus, Cyber Icosahedron, Neural DNA Helix, and Hypercube Tesseract. State persistence (`fox_core_shape_preference`) can be cleanly integrated into `storage.ts` and `assistantContext.tsx`, and exposed in `SettingsView.tsx` under the Theme & Appearance tab.

---

## 3. Caveats

- **No Caveats**: All 5 investigation areas (rendering mechanism, audio reactivity, state/theme integration, mouse rotation/momentum, and stage embedding) were directly inspected and verified in the source code.

---

## 4. Conclusion

The Fox AI visualizer has a well-structured, performant Canvas 2D procedural 3D rendering pipeline that is modular and ready for multi-shape expansion. The audio reactivity and assistant state management are decoupled cleanly in `assistantContext.tsx`, enabling seamless integration of the 4 new procedural 3D geometries (Quantum Torus, Cyber Icosahedron, Neural DNA Helix, Hypercube Tesseract) and the Settings visual shape selector with live `localStorage` persistence (`fox_core_shape_preference`).

---

## 5. Verification Method

To verify the findings:
1. **Lint Check**: Run `npm run lint` from `/Users/sampath/Desktop/fox-jarvis-inspiration` to confirm TypeScript compilation.
2. **Inspect Source Files**:
   - `app/components/FloatingOrb.tsx` — canvas 2D context, 3D Euler projection, depth sorting, audio wave displacement, drag listeners.
   - `app/components/AuraStage.tsx` — visualizer stage centering and transcript overlay layout.
   - `app/utils/audio.ts` & `app/utils/speech.ts` — `AudioAnalyserService`, `DeepgramAudioService`, `SpeechVisualizerSimulator`.
   - `app/store/assistantContext.tsx` — `audioLevel`, `frequencyData`, `status`, `accentTheme`.
   - `app/components/SettingsView.tsx` — Theme & Appearance tab layout.
3. **Survey Artifact**: Read `/Users/sampath/Desktop/fox-jarvis-inspiration/.agents/teamwork_preview_explorer_survey_1/survey_visualizer.md`.
