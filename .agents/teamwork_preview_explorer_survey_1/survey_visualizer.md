# Fox AI Visualizer Architecture & 3D Rendering Pipeline Survey

**Author**: `teamwork_preview_explorer_survey_1`  
**Date**: 2026-08-26  
**Scope**: 3D rendering pipeline, audio reactivity, state/theme integration, motion physics, and embedding structure for Fox AI.

---

## 1. Architectural Overview & Executive Summary

The Fox AI visualizer currently centers on a custom, high-performance **HTML5 Canvas 2D procedural 3D particle engine** located in `app/components/FloatingOrb.tsx`. Rather than relying on heavyweight external 3D libraries such as Three.js or Babylon.js, the codebase uses a lightweight, zero-dependency 3D-to-2D perspective projection engine implemented with pure trigonometry, Euler angle transformations, and back-to-front depth sorting.

### Core Architectural Traits
- **Rendering Technology**: HTML5 Canvas 2D context (`canvas.getContext('2d')`) with `devicePixelRatio` retina scaling and `screen` composite blending.
- **Performance**: Capable of 60 FPS animation with minimal CPU/GPU overhead (~2,400 active particles and HUD arcs).
- **Zero External 3D Dependencies**: Pure TypeScript mathematical projections (`Math.sin`, `Math.cos`, perspective scaling `fov / (fov + z)`).
- **Real-Time Audio Reactivity**: Powered by Web Audio API `AnalyserNode` (`fftSize = 256`) with exponential volume scaling and dynamic displacement wave physics.
- **State-Driven Morphing**: Seamlessly interpolates between a pure spherical lattice and a multi-tier Marvel J.A.R.V.I.S. orbital gimbal ring HUD system with traveling laser pulses during AI thinking.
- **Unified Color Theming**: Hex-to-RGB color extraction dynamically tinting particles, ambient radial gradients, and tactical vector HUDs.

---

## 2. 3D Rendering Pipeline & Mathematical Foundations

### 2.1 Canvas Setup & Resolution Scaling
Implemented in `FloatingOrb.tsx` (`lines 223–235`):
```typescript
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
```
- **Retina Crispness**: Scales canvas buffer by `window.devicePixelRatio` while scaling context transform matrix.
- **Fluid Layout**: Dynamically measures `canvas.clientWidth` and `canvas.clientHeight`.

---

### 2.2 Particle Generation & Geometry Partitioning
Implemented in `FloatingOrb.tsx` (`lines 96–122`):
- **Grid Configuration**: 40 rows (`NUM_ROWS = 40`) by 60 columns (`NUM_COLS = 60`), producing **2,400 structured 3D vertices**.
- **Spherical Coordinate Mapping**:
  - Longitude $\theta \in [0, 2\pi]$
  - Latitude $\phi \in [-\pi/2, +\pi/2]$
- **Tier Partitioning**:
  - `tier 0, 1, 2` (75% of vertices): Central core sphere.
  - `tier 3` (12.5% of vertices): Inner orbital gimbal ring ($r = 165\text{px}$, tilted at $\theta = +0.28\pi$).
  - `tier 4` (12.5% of vertices): Outer orbital HUD ring ($r = 210\text{px}$, tilted at $\theta = -0.32\pi$).

---

### 2.3 3D-to-2D Perspective Projection & Depth Sorting
Implemented in `FloatingOrb.tsx` (`lines 429–440, 548–568`):

#### A. 3D Euler Transformation (Yaw around Y-axis, Pitch around X-axis):
$$\begin{aligned}
x_1 &= x_0 \cos(\text{yaw}) - z_0 \sin(\text{yaw}) \\
z_1 &= x_0 \sin(\text{yaw}) + z_0 \cos(\text{yaw}) \\
y_2 &= y_0 \cos(\text{pitch}) - z_1 \sin(\text{pitch}) \\
z_2 &= y_0 \sin(\text{pitch}) + z_1 \cos(\text{pitch})
\end{aligned}$$

#### B. Perspective Projection:
$$\text{scale} = \frac{\text{fov}}{\text{fov} + z_2} \quad (\text{where } \text{fov} = 560)$$
$$\text{screenX} = \text{centerX} + x_1 \cdot \text{scale}$$
$$\text{screenY} = \text{centerY} + y_2 \cdot \text{scale}$$

#### C. Z-Buffer Painter's Algorithm:
```typescript
projectedPoints.sort((a, b) => b.z - a.z); // Back-to-front depth sorting
```
Each particle is rendered via `ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2)` followed by a secondary glow pass (`size * 1.8`, `alpha = 0.55`) for high-energy audio crests or laser pulse nodes.

---

### 2.4 Vector HUD Overlays & Atmospheric Lighting
- **Atmospheric Ambient Glow** (`lines 247–268`): Full radial gradient `ctx.createRadialGradient(centerX, centerY, 8, centerX, centerY, 290 + speechEnergy * 55)` blending from theme primary to secondary to transparent.
- **Concentric Vector HUD Elements** (`lines 270–316`): Rendered with `ctx.globalCompositeOperation = 'screen'`:
  1. *Segmented Inner Gimbal Arc Ring* ($r = 162\text{px}$, 3 segmented arcs rotating at $0.7t$).
  2. *Mid Tactical Notch Ring* ($r = 188\text{px}$, 6 notches rotating counter-clockwise at $-1.0t$).
  3. *Outer Tachometer Tick Ring* ($r = 216\text{px}$, 36 tick lines with major/minor lengths rotating at $0.35t$).

---

## 3. Audio Reactivity Pipeline

The audio reactivity pipeline handles both **inbound microphone input** (user speech) and **outbound audio synthesis** (Deepgram Aura TTS & Web Speech fallback).

```
┌────────────────────────────────────────────────────────┐
│ Microphone Input (User Speech)                         │
│ └── AudioAnalyserService (Web Audio API AnalyserNode)   │
└──────────────────────────┬─────────────────────────────┘
                           │ onLevel(level, freqData)
                           ▼
┌────────────────────────────────────────────────────────┐
│ AssistantContext.tsx                                   │
│ ├── audioLevel (0.0 to 1.0)                            │
│ ├── frequencyData (Uint8Array[128])                    │
│ └── status ('idle' | 'listening' | 'thinking' | ...)   │
└──────────────────────────┬─────────────────────────────┘
                           │ onLevel(level, freqData)
┌──────────────────────────┴─────────────────────────────┐
│ Output TTS Speech (Deepgram Aura / Web Speech)         │
│ └── DeepgramAudioService (MediaElementSource Analyser) │
│ └── SpeechVisualizerSimulator (Fallback Simulation)    │
└────────────────────────────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ FloatingOrb.tsx (requestAnimationFrame Loop)           │
│ ├── smoothedAudioLevel exponential filter               │
│ ├── Harmonic Acoustic Wave Physics                     │
│ └── Vertex displacement + Particle scale/glow boost    │
└────────────────────────────────────────────────────────┘
```

### 3.1 Audio Sources & Services
1. **`AudioAnalyserService` (`app/utils/audio.ts`)**:
   - Initializes `AudioContext` and captures `navigator.mediaDevices.getUserMedia`.
   - Creates `MediaStreamAudioSourceNode` connected to `AnalyserNode` (`fftSize = 256`, `smoothingTimeConstant = 0.8`).
   - Calculates dynamic RMS amplitude mapped exponentially:
     $$\text{normalizedLevel} = \min\left(1.0, \left(\frac{\text{average}}{128}\right)^{1.2}\right)$$
   - Dispatches `(level: number, frequencyData: Uint8Array)` to context on each animation frame.

2. **`DeepgramAudioService` (`app/utils/speech.ts`)**:
   - When playing synthesized Deepgram neural TTS audio blobs, attaches a `MediaElementAudioSourceNode` directly to the `HTMLAudioElement`.
   - Runs real-time FFT frequency bin extraction during playback with zero latency.

3. **`SpeechVisualizerSimulator` (`app/utils/audio.ts`)**:
   - Harmonic multi-frequency sine wave generator ($0.35\sin(\phi) + 0.25\sin(2.3\phi) + 0.15\sin(4.1\phi) + \text{jitter}$) used as a seamless fallback when native browser speech synthesis cannot pipe audio nodes directly.

---

### 3.2 3D Wave Displacement Physics in Visualizer
In `FloatingOrb.tsx` (`lines 345–376`), vertex coordinates are displaced along surface normals by acoustic soundwaves:
- **Circumferential Wave (Longitude)**:
  $$W_{\text{circ}} = \sin(4\theta - 3.2t) \cdot (38.0 \cdot \text{vocalCadence})$$
- **Cascading Vertical Wave (Latitude)**:
  $$W_{\text{vert}} = \cos(5\phi + 3.6t) \cdot (32.0 \cdot \text{vocalCadence})$$
- **Equatorial Vocal Bulge**:
  $$W_{\text{bulge}} = \cos(\phi) \sin(2.4t + \theta) \cdot (26.0 \cdot \text{vocalCadence})$$
- **Harmonic Acoustic Resonance**:
  $$W_{\text{harm}} = \sin(4.8t + 3\phi + 2\theta) \cdot (14.0 \cdot \text{vocalCadence})$$
- **Total Radial Displacement**:
  $$r = r_{\text{base}} + W_{\text{circ}} + W_{\text{vert}} + W_{\text{bulge}} + W_{\text{harm}}$$

During `idle`, it smoothly transitions to gentle fluid breathing ($4.2\sin(1.6t + 1.5\phi + \theta)$).

---

## 4. Assistant States & Theme Color Accents

### 4.1 Assistant Status Mapping

| Assistant Status | Visualizer Motion & Geometry Behavior | Audio Displacement | Subtitle / HUD Presentation |
|---|---|---|---|
| **`idle`** | Gentle continuous breathing ($4.2\text{px}$), slow steady yaw rotation ($0.0020$). Base sphere configuration (`morphProgress = 0`). | None (ambient baseline) | Prompt: *"How can I assist you?"* |
| **`listening`** | Moderate acoustic ripples ($18\text{px}$), higher yaw reactivity. Sphere pulses with microphone input. | Real-time mic FFT response | Live interim user transcript with pulsing theme dot |
| **`thinking`** | Smooth morphing transition (`morphProgress` $\to 1.0$). Outer 25% particles detach into counter-rotating gimbal rings. 16 orbital laser pulses activate. Concentric HUD vector rings appear. | Neural chime audio trigger (every 1.8s) | Animated cycling thinking phrases (*"Checking..."*, *"Synthesizing answer..."*) |
| **`speaking`** | High-energy multi-harmonic soundwaves (up to $38\text{px}$ displacement). Fast yaw rotation ($0.0028$). Crest particles illuminate to bright white. | Real-time TTS frequency analysis | Live karaoke-style spoken phrase subtitles |

---

### 4.2 Theme Color Accents Pipeline
Themes are defined in `app/utils/formatters.ts` (`ACCENT_THEMES`) and selected in `assistantContext.tsx`:
- `fox-cyan`: `#99FFFF` / `#00E5FF`
- `artistic-flair`: `#007AFF` / `#5856D6`
- `siri-intelligence`: `#7B61FF` / `#00F0FF`
- `siri-classic`: `#9D4EDD` / `#E0AAFF`
- `emerald-aura`: `#30D158` / `#66D4CF`
- `solar-amber`: `#FF9F0A` / `#FF453A`
- `titanium-frost`: `#E5E5EA` / `#8E8E93`

In `FloatingOrb.tsx`:
- `hexToRgb(accentTheme.primary)` and `hexToRgb(accentTheme.secondary)` produce `{ r, g, b }`.
- Elevation-based linear gradient:
  $$\text{color} = \text{rgbSecondary} \cdot (1 - \text{blend}) + \text{rgbPrimary} \cdot \text{blend}$$
- High-energy crests interpolate towards white:
  $$r_{\text{peak}} = r_{\text{primary}} + (255 - r_{\text{primary}}) \cdot \text{crestIntensity}$$

---

## 5. Interaction & Motion Physics

### 5.1 Current Drag Interaction
Implemented in `FloatingOrb.tsx` (`lines 134–161, 214–221`):
- Listens for `mousedown` on `canvasRef.current`, and `mousemove` / `mouseup` on `window`.
- On drag:
  $$\Delta x = e.\text{clientX} - \text{lastMouseX}, \quad \text{currentYaw} \mathrel{+}= \Delta x \cdot 0.008$$
  $$\Delta y = e.\text{clientY} - \text{lastMouseY}, \quad \text{currentPitch} \mathrel{+}= \Delta y \cdot 0.008$$
- When not dragging:
  - Auto-rotates yaw: $\text{currentYaw} \mathrel{+}= \text{smoothedYawSpeed} \cdot \text{speedFactor}$.
  - Gentle pitch oscillation: $\text{currentPitch} = 0.10 + \sin(0.3t) \cdot 0.02$.

### 5.2 Momentum Decay Gap & Enhancement Opportunity
- **Current Observation**: When the user releases the mouse, angular velocity immediately snaps back to constant `smoothedYawSpeed` without inertial drift.
- **Enhancement for Multi-Shape Engine**: Introducing angular velocity variables `yawVelocity` and `pitchVelocity` with friction damping ($\mu \approx 0.94$) will provide fluid momentum decay on drag release across all geometries.

---

## 6. Component Hierarchy & Embedding

```
App.tsx
 ├── Header.tsx (Quick actions & Focus mode)
 ├── Sidebar.tsx (Sessions, Tools, Settings navigation)
 └── Main Content Section
      ├── [appMode === 'voice'] ── AuraStage.tsx
      │                            ├── Top Action Bar (New Chat, Toggle Overlay)
      │                            ├── FloatingOrb.tsx (3D Visualizer Canvas & Subtitles)
      │                            └── ConversationFeed.tsx (Floating in-scene transcript overlay)
      ├── [appMode === 'chat'] ── ChatModeStage.tsx + VoiceInputBar.tsx
      ├── [appMode === 'tools'] ── ToolsManagerView.tsx
      └── [appMode === 'settings'] ── SettingsView.tsx
                                      └── Tab: Theme & Appearance (Target for Shape Selector)
```

### Integration Points in `AuraStage.tsx` (`lines 63–68`):
- `AuraStage.tsx` dedicates full stage presence to `<FloatingOrb />` while overlaying responsive conversation feeds in a non-intrusive HUD panel.
- Clicking the visualizer canvas triggers `toggleListening()`.

---

## 7. Architectural Blueprint for 4 New 3D Shapes & Selector

To fulfill the requirements in `ORIGINAL_REQUEST.md`, here is the architectural plan:

### 7.1 Five Core 3D Geometries
1. **Holographic Sphere Core** (Existing): 2,400-particle spherical surface with J.A.R.V.I.S. orbital gimbal ring morphing.
2. **Quantum Torus**: Procedural donut ring $(R + r\cos v)\cos u, (R + r\cos v)\sin u, r\sin v$ with continuous particle streaming and orbital spin.
3. **Cyber Icosahedron**: 12 golden-ratio vertices, 30 glowing facet edges with wireframe facet rendering, pulsating vertex nodes, and inner floating nucleus.
4. **Neural DNA Helix**: Dual intertwined helical particle strands $(\cos(u), \sin(u), u)$ connected by periodic base-pair hydrogen bond rungs undulating with audio frequencies.
5. **Hypercube / Tesseract**: 16 4D vertices $( \pm 1, \pm 1, \pm 1, \pm 1)$ rotated in 4D planes ($XW, YW, ZW$), projected to 3D via 4D perspective $(1 / (d - w))$, and rendered as nested 3D wireframe cube lattices with glowing corner nodes.

### 7.2 State & Storage Integration
- **Shape Type**: `export type VisualizerCoreShape = 'sphere' | 'torus' | 'icosahedron' | 'helix' | 'tesseract';`
- **Storage Key**: `fox_core_shape_preference` in `localStorage`.
- **Context Synchronization**: `coreShape` and `setCoreShape` exposed in `assistantContext.tsx` and consumed in `FloatingOrb.tsx` and `SettingsView.tsx`.
- **Settings UI**: Visual card selector with live preview badges in `app/components/SettingsView.tsx` under the **Theme & Appearance** tab.

---

## 8. Summary of Findings

- **Rendering Engine**: HTML5 Canvas 2D with custom trigonometric 3D Euler projection and Z-sorting depth buffer.
- **Audio Reactivity**: Multi-tiered Web Audio API `AnalyserNode` connected to mic input and Deepgram Aura TTS output, feeding harmonic soundwave physics.
- **State & Theme Integration**: Ref-synchronized animation loop driving dynamic morphing, thinking HUDs, and palette-aware particle coloring.
- **Modular Extensibility**: The existing perspective projection matrix and particle rendering loop can seamlessly accommodate procedural Torus, Icosahedron, DNA Helix, and 4D Tesseract geometries with zero external libraries.
