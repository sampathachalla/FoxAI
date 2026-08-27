# 3D Intelligence Core Visualizer Engine & Settings Integration Specification

> **Document Version**: 1.0.0  
> **Status**: APPROVED TECHNICAL SPECIFICATION  
> **Target System**: Fox AI Voice & Chat Assistant (`fox-jarvis-inspiration`)  
> **Author**: Specification Miner Agent (Survey 3)  
> **Date**: 2026-08-27  

---

## Executive Summary

This technical specification defines the complete mathematical geometry, procedural 3D/4D rendering pipelines, audio-reactive mechanics, state machine transitions, interactive momentum physics, and Settings UI integration for **5 distinct 3D visualizer shapes** in Fox AI:
1. **Holographic Sphere Core** (Full backward compatibility baseline)
2. **Quantum Torus** (Pulsing donut ring with continuous particle streams and orbital rings)
3. **Cyber Icosahedron** (Geometric holographic crystal polyhedron with glowing vertices and rotating facet edges)
4. **Neural DNA Helix** (Dual braided particle waves with connecting base-pair rungs)
5. **Hypercube / Tesseract** (4D-to-3D perspective projection of rotating nested cube lattices)

In addition, this specification standardizes the state synchronization in `assistantContext.tsx`, local storage persistence under the key `fox_core_shape_preference`, and the dedicated **"3D Intelligence Core Shape"** selection section in `SettingsView.tsx` under the **Theme & Appearance** tab.

---

## Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Core Architecture | Multi-Shape Type System | Standardized `CoreShape` union type (`'sphere' \| 'torus' \| 'icosahedron' \| 'dna_helix' \| 'tesseract'`) | String identifier | Strongly-typed shape enum | Defaults to `'sphere'` on invalid string | `app/types/index.ts`, `ORIGINAL_REQUEST.md` |
| 2 | Persistence | Core Shape Storage | Persistent storage of active shape in `localStorage` under `fox_core_shape_preference` | Shape ID string | Stored string in LocalStorage | Fallback to `'sphere'` if null/corrupt | `app/services/storage.ts` |
| 3 | State Management | Assistant Context Synchronization | Global reactive `coreShape` state and `setCoreShape(shape)` dispatcher in `AssistantContext` | User selection or loaded preference | React state broadcast to all views | Retains current valid shape on error | `app/store/assistantContext.tsx` |
| 4 | Geometry 3D | Holographic Sphere Core | Multi-tier particle sphere with voice wave cadences and J.A.R.V.I.S. orbital gimbal rings | Latitude/Longitude angles, audio level | 2,400 3D particle projections | Clamped wave displacement to prevent singularity | `app/components/FloatingOrb.tsx` |
| 5 | Geometry 3D | Quantum Torus Geometry | Continuous particle stream donut ring with toroidal flux and 2 concentric orbital accretion rings | Toroidal $(\theta)$ & Poloidal $(\phi)$ angles | 2,408 particle stream coordinates | Bounded minor radius $(r > 0)$ | Mathematical Parametric Torus Modeling |
| 6 | Geometry 3D | Cyber Icosahedron Geometry | 12 vertices, 30 glowing facet edges, 20 semi-transparent triangular faces, and nested inner crystal core | 12 golden ratio coordinates, edge indices | Projected vertices, edge particles, facet polygons | Deterministic face normal sorting | 3D Polyhedral Geometry Spec |
| 7 | Geometry 3D | Neural DNA Helix Geometry | Dual braided antiparallel helical strands with 28 base-pair ladder rungs and synaptic spark cloud | Curve parameter $s \in [-L/2, L/2]$, pitch $\omega_h$ | 1,324 helical & rung particles | Clamped twist frequency | Differential Geometry of Curves |
| 8 | Geometry 4D | Hypercube (Tesseract) Projection | 4D Euclidean hypercube (16 vertices, 32 edges, 8 cells) projected via 4D SO(4) double rotation into 3D and 2D | 4D coordinates $(\pm 1, \pm 1, \pm 1, \pm 1)$, angles $\theta_{xw}, \theta_{yz}$ | 3D projected vertices and 384 edge particles | 4D perspective divisor clamped $(D_4 - w > 0.2)$ to prevent division by zero | 4D Euclidean Geometry & Perspective Math |
| 9 | Audio Reactivity | Real-Time Acoustic Deformation | Procedural deformation driven by Web Audio API `audioLevel` (0–1) and `frequencyData` bins (128 bins) | Mic analyser buffer / Speech simulator level | Dynamic wave amplitude, particle size, glow alpha | Fallback to smooth synthetic breathing wave if audio is 0 | `app/utils/audio.ts` |
| 10 | Theming | Accent Theme Luminescence | Theme color mapping (`primary`, `secondary`, `glow`, `backgroundGlow`) across all 7 preset themes | `AccentTheme` object | RGB vertex coloring, glow halos, gradient background | Safe fallback to `#99FFFF` / `#00E5FF` | `app/utils/formatters.ts` |
| 11 | Assistant States | Multi-State Visual Signatures | Distinct visual modes for `idle`, `listening`, `thinking`, and `speaking` | `AssistantStatus` enum | Morph factors, rotation speeds, pulse rates, HUD overlays | Seamless exponential lerping between states | `app/types/index.ts`, `FloatingOrb.tsx` |
| 12 | Interaction | Drag-to-Rotate Momentum Decay | Natural 3D orbital camera drag with angular momentum decay $(\mu = 0.94)$ and auto-reversion to idle drift | Mouse/touch $\Delta x, \Delta y$ drag events | Updated Euler angles $(\text{yaw}, \text{pitch})$ | Pitch clamped $[-\frac{\pi}{2}+0.1, \frac{\pi}{2}-0.1]$ to prevent gimbal flip | Interactive Physics Engine Spec |
| 13 | Rendering | 60 FPS Canvas Pipeline | High-performance HTML5 2D Canvas rendering with Retina DPR scaling and back-to-front depth sorting | Delta time $(dt)$, Canvas dimensions | 60 FPS fluid rendering, zero memory allocations in loop | Frame delta clamped to $50\text{ms}$ to prevent frame jumps | `app/components/FloatingOrb.tsx` |
| 14 | UI Integration | Settings Shape Selector | 5 interactive visual preview cards under "Theme & Appearance" tab with animated icons, badges, descriptions, and active state | User click interaction | Immediate 1-click shape switch, sound chime, state update | Disabled during modal transitions | `app/components/SettingsView.tsx` |
| 15 | Audio FX | UI Sound Chimes | Tactile audio feedback chime triggered on shape selection | `SoundFXService.playChime('click')` | Synthesized Web Audio sine chime | Silent fallback if audio context fails or sound disabled | `app/utils/audio.ts` |

---

## Edge Cases

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | Hypercube 4D Projection | Point with $w' \approx D_4 \cdot S_4$ (singularity at 4D camera plane) | Projection denominator $(D_4 - w'/S_4)$ evaluates to near-zero. Algorithm clamps denominator to $\ge 0.25$ to prevent coordinate explosion or NaN. |
| 2 | Icosahedron Face Rendering | Camera looks edge-on or backward through faces | Back-face culling / normal dot product $(\vec{n} \cdot \vec{v}_{\text{cam}} < 0)$ renders facets with reduced ambient translucency $(\alpha \approx 0.04)$ to maintain crystal transparency without visual clutter. |
| 3 | DNA Helix Twist | Rapid audio spikes with $A_{\text{audio}} > 0.9$ | Twist velocity acceleration is clamped to maximum $\omega_{\text{max}} = 0.08\text{ rad/frame}$ to prevent visual strobing/aliasing. |
| 4 | Torus Minor Radius | Violent voice wave resonance | Minor radius $r(t)$ has a lower bound $r_{\text{min}} \ge 20\text{px}$ so the torus donut tube never collapses into a degenerate 1D singularity. |
| 5 | Drag Interaction | User drags cursor outside browser window and releases | Global `window.addEventListener('mouseup')` and `'touchend'` ensure `isDragging` resets cleanly and momentum decay activates smoothly without getting stuck. |
| 6 | Storage Key Migration | LocalStorage is empty or contains an invalid legacy shape string | `StorageService.loadCoreShape()` validates against `['sphere', 'torus', 'icosahedron', 'dna_helix', 'tesseract']` and safely returns `'sphere'`. |
| 7 | Canvas Resizing | High-DPI screen resizing (e.g. dragging between 1x and 2x displays) | Internal canvas buffer dimensions are dynamically scaled by `window.devicePixelRatio || 1` on every animation frame, preserving crystal clarity. |
| 8 | Audio Service Suspension | Microphone permission denied or audio context suspended | `AudioAnalyserService` and `SpeechVisualizerSimulator` gracefully fall back to zero/synthetic harmonic breathing waves without throwing runtime errors. |

---

## Section 1: Architectural Foundation, State Management & Persistence

### 1.1 Type Definitions (`app/types/index.ts`)

```typescript
export type CoreShape = 'sphere' | 'torus' | 'icosahedron' | 'dna_helix' | 'tesseract';

export interface CoreShapeDefinition {
  id: CoreShape;
  name: string;
  badge: string;
  iconName: 'Globe' | 'Disc' | 'Hexagon' | 'Dna' | 'Boxes';
  description: string;
  tagline: string;
  particleCount: number;
}
```

### 1.2 Core Shape Metadata Catalog

```typescript
export const CORE_SHAPES: CoreShapeDefinition[] = [
  {
    id: 'sphere',
    name: 'Holographic Sphere',
    badge: 'Pristine Core',
    iconName: 'Globe',
    description: 'Multi-tiered particle sphere with voice wave cadences and J.A.R.V.I.S. orbital gimbal rings.',
    tagline: 'Classic Intelligence Singularity',
    particleCount: 2400,
  },
  {
    id: 'torus',
    name: 'Quantum Torus',
    badge: 'Vortex Ring',
    iconName: 'Disc',
    description: 'Pulsing donut ring of continuous particle streams, accretion halos, and orbital laser pulses.',
    tagline: 'Toroidal Magnetic Flux Flow',
    particleCount: 2408,
  },
  {
    id: 'icosahedron',
    name: 'Cyber Icosahedron',
    badge: 'Holo Crystal',
    iconName: 'Hexagon',
    description: 'Geometric holographic crystal polyhedron with glowing vertices and rotating facet edges.',
    tagline: '20-Faceted Crystalline Geometry',
    particleCount: 1680,
  },
  {
    id: 'dna_helix',
    name: 'Neural DNA Helix',
    badge: 'Dual Strand',
    iconName: 'Dna',
    description: 'Dual braided particle waves undulating and twisting in 3D space with connecting base-pair rungs.',
    tagline: 'Bio-Synthetic Neural Ladder',
    particleCount: 1324,
  },
  {
    id: 'tesseract',
    name: 'Hypercube Tesseract',
    badge: '4D Projection',
    iconName: 'Boxes',
    description: '4D-to-3D perspective projection of rotating nested hypercube lattices and cubic cells.',
    tagline: '4-Dimensional Spatial Lattice',
    particleCount: 1536,
  },
];
```

### 1.3 LocalStorage Persistence Layer (`app/services/storage.ts`)

```typescript
const STORAGE_KEYS = {
  // ... existing keys
  CORE_SHAPE: 'fox_core_shape_preference',
};

export const StorageService = {
  // ... existing methods

  loadCoreShape(): CoreShape {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CORE_SHAPE);
      if (
        saved === 'sphere' ||
        saved === 'torus' ||
        saved === 'icosahedron' ||
        saved === 'dna_helix' ||
        saved === 'tesseract'
      ) {
        return saved;
      }
    } catch (e) {
      console.warn('Failed to load core shape preference:', e);
    }
    return 'sphere';
  },

  saveCoreShape(shape: CoreShape): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CORE_SHAPE, shape);
    } catch (e) {
      console.warn('Failed to save core shape preference:', e);
    }
  },
};
```

### 1.4 Assistant Context Integration (`app/store/assistantContext.tsx`)

```typescript
interface AssistantContextType {
  // ... existing properties
  coreShape: CoreShape;
  setCoreShape: (shape: CoreShape) => void;
}

export const AssistantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // ... existing state
  const [coreShape, setCoreShapeState] = useState<CoreShape>(() => StorageService.loadCoreShape());

  const setCoreShape = useCallback((shape: CoreShape) => {
    setCoreShapeState(shape);
    StorageService.saveCoreShape(shape);
  }, []);

  // Provide coreShape & setCoreShape in context value
};
```

---

## Section 2: Mathematical Geometry, Vertex Topologies & Procedural 3D/4D Algorithms

### 2.1 Common 3D Camera & Projection Pipeline

Every geometry transforms 3D world coordinates $(x_0, y_0, z_0)$ into screen coordinates $(screenX, screenY)$ and depth $z_2$:

1. **Yaw (Y-Axis) Rotation**:
   $$x_1 = x_0 \cos(\text{yaw}) - z_0 \sin(\text{yaw})$$
   $$z_1 = x_0 \sin(\text{yaw}) + z_0 \cos(\text{yaw})$$

2. **Pitch (X-Axis) Rotation**:
   $$y_2 = y_0 \cos(\text{pitch}) - z_1 \sin(\text{pitch})$$
   $$z_2 = y_0 \sin(\text{pitch}) + z_1 \cos(\text{pitch})$$

3. **Perspective Projection**:
   $$\text{scale} = \frac{\text{fov}}{\text{fov} + z_2}, \quad \text{fov} = 560$$
   $$\text{screenX} = \text{centerX} + x_1 \cdot \text{scale}$$
   $$\text{screenY} = \text{centerY} + y_2 \cdot \text{scale}$$

4. **Depth Ordering**:
   All projected elements (particles, lines, polygons) are sorted back-to-front by $z_2$ descending before rendering to ensure correct occlusion.

---

### 2.2 Shape 1: Holographic Sphere Core (Baseline Backward Compatibility)

#### Geometry Parameters
- Base Radius: $R_{\text{sph}} = 148\text{px}$
- Resolution: $N_{\text{rows}} = 40, N_{\text{cols}} = 60 \implies 2,400\text{ particles}$
- Partitions:
  - Tiers 0, 1, 2 (75%): Central Sphere Core
  - Tier 3 (12.5%): Inner Gimbal Ring ($R_3 = 165\text{px}$, tilt $\psi = 0.28\pi$)
  - Tier 4 (12.5%): Outer HUD Ring ($R_4 = 210\text{px}$, tilt $\psi = -0.32\pi$)

#### Acoustic Wave Equation
$$\phi_r = \frac{r + 0.5}{N_{\text{rows}}} \pi - \frac{\pi}{2}, \quad \theta_c = \frac{c}{N_{\text{cols}}} 2\pi$$

$$W_{\text{speaking}} = \sin(4\theta - 3.2t)(38 A_{\text{vocal}}) + \cos(5\phi + 3.6t)(32 A_{\text{vocal}}) + \cos(\phi)\sin(2.4t + \theta)(26 A_{\text{vocal}}) + \sin(4.8t + 3\phi + 2\theta)(14 A_{\text{vocal}})$$

$$R(\phi, \theta, t) = R_{\text{sph}} + W_{\text{speaking}}$$
$$x_{\text{sph}} = R \cos(\phi) \sin(\theta), \quad y_{\text{sph}} = R \sin(\phi), \quad z_{\text{sph}} = R \cos(\phi) \cos(\theta)$$

#### Thinking State 2D HUD Overlays
- Inner Gimbal 3-Segment Arc Ring ($R = 162\text{px}$, line width $1.8\text{px}$)
- Mid Tactical 6-Notch Ring ($R = 188\text{px}$, line width $1.4\text{px}$)
- Outer 36-Tick Tachometer Ring ($R = 216\text{px}$, major ticks every 6 ticks)

---

### 2.3 Shape 2: Quantum Torus (Pulsing Donut Ring with Particle Streams & Orbital Rings)

#### Mathematical Parametric Formulation
A 3D torus is defined by major radius $R$ (distance from center of hole to center of tube) and minor radius $r$ (radius of the tube).

$$x(\theta, \phi) = (R + r \cos\phi) \cos\theta$$
$$y(\theta, \phi) = r \sin\phi$$
$$z(\theta, \phi) = (R + r \cos\phi) \sin\theta$$

where $\theta \in [0, 2\pi)$ is the toroidal azimuth angle, and $\phi \in [0, 2\pi)$ is the poloidal section angle.

#### Dimensions & Particle Layout
- Major Radius: $R_0 = 135\text{px}$
- Minor Radius: $r_0 = 46\text{px}$
- Torus Surface Mesh: $N_{\text{toroidal}} = 64$ rings, $N_{\text{poloidal}} = 32$ particles/ring ($2,048\text{ particles}$).
- Quantum Vortex Stream: Particles advance along a helical winding path:
  $$\phi_i(t) = \phi_{i,0} + \omega_{\text{swirl}} t + 3 \theta_i$$
  where $\omega_{\text{swirl}} = 1.6 \text{ rad/s}$ in idle, increasing to $4.2 \text{ rad/s}$ during thinking/speaking.

#### Concentric Orbital Rings
- **Accretion Ring 1 (Equatorial Quantum Flux)**:
  - Radius: $R_{\text{acc1}} = 195\text{px}$
  - Particle count: 200 particles
  - Tilt: Horizontal plane $(y = 0)$ with continuous counter-clockwise rotation ($\omega = -1.2 t$).
- **Accretion Ring 2 (Polar Orbit Energy Ring)**:
  - Radius: $R_{\text{acc2}} = 175\text{px}$
  - Particle count: 160 particles
  - Tilt: $\alpha = 62^\circ$ ($y = R_{\text{acc2}} \sin(\theta) \sin\alpha$, $z = R_{\text{acc2}} \sin(\theta) \cos\alpha$).

#### Dynamic Audio Reactivity on Torus
1. **Major Radius Breathing Expansion**:
   $$R(t) = R_0 \cdot \left[1.0 + 0.22 A_{\text{audio}} + 0.05 \sin(2.2t)\right]$$
2. **Poloidal Tube Dilation**:
   $$r(t) = r_0 \cdot \left[1.0 + 0.38 A_{\text{audio}} \cos(4\theta - 3.0t)\right]$$
3. **Toroidal Traveling Ripple Wave**:
   $$\Delta r = A_{\text{vocal}} \cdot \left[ \sin(6\theta - 4.5t) \cdot 16\text{px} + \cos(8\phi + 3.2t) \cdot 10\text{px} \right]$$
4. **Quantum Laser Pulses**:
   12 high-luminance energy packets racing along the major circumference with speeds $v_p = 0.03\text{ rad/frame}$.

---

### 2.4 Shape 3: Cyber Icosahedron (Holographic Crystal Polyhedron)

#### Polyhedral Topology Definition
A regular icosahedron has 12 vertices, 30 edges, and 20 equilateral triangular faces.

#### Golden Ratio Coordinate Generation
Let $\varphi = \frac{1 + \sqrt{5}}{2} \approx 1.61803398875$. The 12 canonical vertices on the unit sphere normalized to radius $R_{\text{ico}} = 138\text{px}$ are:

$$K = \frac{R_{\text{ico}}}{\sqrt{1 + \varphi^2}} \approx \frac{138}{1.902113} \approx 72.55\text{px}$$

$$\begin{aligned}
V_0 &= (-K, \varphi K, 0), & V_1 &= (K, \varphi K, 0), & V_2 &= (-K, -\varphi K, 0), & V_3 &= (K, -\varphi K, 0), \\
V_4 &= (0, -K, \varphi K), & V_5 &= (0, K, \varphi K), & V_6 &= (0, -K, -\varphi K), & V_7 &= (0, K, -\varphi K), \\
V_8 &= (\varphi K, 0, -K), & V_9 &= (\varphi K, 0, K), & V_{10} &= (-\varphi K, 0, -K), & V_{11} &= (-\varphi K, 0, K)
\end{aligned}$$

#### 30 Edges Topology Matrix
Edges connect pairs $(V_i, V_j)$ where Euclidean distance $\|V_i - V_j\| = 2K$:
```
(0,1), (0,5), (0,7), (0,10), (0,11), (1,5), (1,7), (1,8), (1,9), (2,3),
(2,4), (2,6), (2,10), (2,11), (3,4), (3,6), (3,8), (3,9), (4,5), (4,9),
(4,11), (5,9), (5,11), (6,7), (6,8), (6,10), (7,8), (7,10), (8,9), (10,11)
```

#### 20 Triangular Faces Grouping
```
(0,11,5), (0,5,1), (0,1,7), (0,7,10), (0,10,11),
(1,5,9), (5,11,4), (11,10,2), (10,7,6), (7,1,8),
(3,9,4), (3,4,2), (3,2,6), (3,6,8), (3,8,9),
(4,9,5), (2,4,11), (6,2,10), (8,6,7), (9,8,1)
```

#### Dual Concentric Shell & Rendering Elements
1. **Outer Icosahedron Wireframe**:
   - 12 Primary Vertex Nodes: Rendered with glowing halo discs ($r = 4.5\text{px} \cdot \text{scale}$).
   - 30 Edge Subdivisions: Each edge is sampled into 16 discrete quantum dot particles ($30 \times 16 = 480\text{ particles}$).
   - 20 Holographic Facet Polygons: Semi-transparent fills with depth-based lighting:
     $$I_{\text{facet}} = \max\left(0, \vec{n}_{\text{face}} \cdot \vec{v}_{\text{light}}\right), \quad \alpha_{\text{facet}} = 0.08 + 0.20 A_{\text{audio}} + 0.15 I_{\text{facet}}$$
2. **Inner Rotating Stellated Core**:
   - Concentric dual dodecahedron/icosahedron crystal of radius $R_{\text{inner}} = 65\text{px}$ spinning in counter-phase ($\text{yaw}_{\text{inner}} = -1.8 t$).
3. **Audio Reactivity**:
   - Vertex Radial Pulsation: Vertices displace radially during speech:
     $$\vec{V}_i(t) = \vec{V}_{i,0} \cdot \left[1.0 + 0.28 A_{\text{audio}} \cdot \left(1.0 + 0.25 \sin(4t + i)\right)\right]$$
   - Edge laser beams traverse the 30 edges between vertices.

---

### 2.5 Shape 4: Neural DNA Helix (Dual Braided Waves with Base-Pair Rungs)

#### Mathematical Parametric Formulation
The double helix is modeled as two intertwined helical strands along vertical axis $s \in [-L/2, L/2]$:

- Total Vertical Span: $L = 320\text{px}$
- Base Helical Radius: $R_h = 76\text{px}$
- Helical Wavenumber / Pitch: $\omega_h = \frac{3 \times 2\pi}{L} \approx 0.0589\text{ rad/px}$ (3 complete $360^\circ$ turns)
- Base Rotation Angle: $\theta_0(t) = 0.018 \cdot t_{\text{frame}}$

#### Dual Antiparallel Strands
$$\begin{aligned}
\text{Strand A: } \quad x_A(s) &= R_h(s, t) \cos(\omega_h s + \theta_0(t)), & y_A(s) &= s, & z_A(s) &= R_h(s, t) \sin(\omega_h s + \theta_0(t)) \\
\text{Strand B: } \quad x_B(s) &= R_h(s, t) \cos(\omega_h s + \pi + \theta_0(t)), & y_B(s) &= s, & z_B(s) &= R_h(s, t) \sin(\omega_h s + \pi + \theta_0(t))
\end{aligned}$$

#### 28 Horizontal Base-Pair Rungs
- Rung positions along $Y$-axis:
  $$s_k = -\frac{L}{2} + k \cdot \frac{L}{K - 1}, \quad k \in [0, 27] \quad (K = 28)$$
- Each rung is interpolated with $M = 8$ particle nodes linearly connecting Strand A to Strand B:
  $$P_k(u) = (1 - u) \cdot P_{A}(s_k) + u \cdot P_{B}(s_k), \quad u \in \left\{0, \frac{1}{7}, \frac{2}{7}, \dots, 1\right\}$$
- Total Rung Nodes: $28 \times 8 = 224\text{ particles}$.
- Continuous Strand Particles: 400 particles per strand ($800\text{ particles total}$).
- Floating Synaptic Spark Cloud: 300 ambient particles orbiting the DNA helix in Gaussian distributed ellipsoids.

#### Dynamic Audio Reactivity on DNA Helix
1. **Undulating Ribbon Wave**:
   $$R_h(s, t) = R_h \cdot \left[1.0 + 0.35 A_{\text{audio}} \cdot \sin(3 \omega_h s - 4.2 t)\right]$$
2. **Base-Pair Acoustic Harmonic Resonance**:
   Rung particles oscillate with frequency data bins:
   $$\Delta y_k(u) = \sin(\pi u) \cdot \sin(6t + k \cdot 0.4) \cdot \left(18\text{px} \cdot A_{\text{audio}}\right)$$
3. **Twist Acceleration**:
   Rotation speed accelerates from $\omega_{\text{idle}} = 0.015\text{ rad/s}$ to $\omega_{\text{speaking}} = 0.055\text{ rad/s}$.

---

### 2.6 Shape 5: Hypercube / Tesseract (4D-to-3D-to-2D Perspective Projection)

#### 4D Euclidean Hypercube Vertex Set
A 4D hypercube in $\mathbb{R}^4 = (x, y, z, w)$ has 16 vertices, 32 edges, 24 square faces, and 8 cubic boundary cells.

Let half-edge length $S = 95\text{px}$. The 16 4D vertices are all combinations of:
$$V_{i} = (\pm S, \pm S, \pm S, \pm S), \quad i \in [0, 15]$$

#### 32 4D Edges (Hamming Distance = 1)
Two vertices $V_i$ and $V_j$ are connected by an edge if and only if they differ in exactly one coordinate:
```
Pairs (i, j) where bitwise_popcount(i ^ j) == 1 (32 total edges)
```

#### 4D SO(4) Double Rotation Matrix
The 4D object undergoes simultaneous independent rotations in two orthogonal planes ($XW$-plane and $YZ$-plane):

$$\begin{pmatrix} x' \\ w' \end{pmatrix} = \begin{pmatrix} \cos\theta_{xw} & -\sin\theta_{xw} \\ \sin\theta_{xw} & \cos\theta_{xw} \end{pmatrix} \begin{pmatrix} x \\ w \end{pmatrix}$$

$$\begin{pmatrix} y' \\ z' \end{pmatrix} = \begin{pmatrix} \cos\theta_{yz} & -\sin\theta_{yz} \\ \sin\theta_{yz} & \cos\theta_{yz} \end{pmatrix} \begin{pmatrix} y \\ z \end{pmatrix}$$

$$\theta_{xw}(t) = \theta_{xw,0} + \omega_{xw} t, \quad \theta_{yz}(t) = \theta_{yz,0} + \omega_{yz} t$$

#### 4D-to-3D Perspective Projection Algorithm
- 4D Camera Focal Distance: $D_4 = 2.4$
- 4D Perspective Projection Divisor:
  $$P_4 = \frac{1}{\max\left(0.25, D_4 - \frac{w'}{S}\right)}$$
- Projected 3D Coordinates:
  $$X_3 = x' \cdot P_4, \quad Y_3 = y' \cdot P_4, \quad Z_3 = z' \cdot P_4$$

This projection generates the classic, mesmerizing 4D geometric phenomenon where the inner nested cube continuously inverts through the outer cube lattices.

#### 3D-to-2D Rendering Representation
- 16 Primary Hyper-Nodes: Rendered with glowing spherical vertices.
- 32 4D Edges: Each edge is sampled into 12 quantum beam particles ($32 \times 12 = 384\text{ particles}$).
- 8 Cubic Cell Volumetric Haloes: Rendered with translucent depth-graded lines and glow strokes.
- Audio Reactivity:
  - 4D Hyper-Dilation: $S(t) = S_0 \cdot \left[1.0 + 0.32 A_{\text{audio}}\right]$
  - 4D Rotation Boost: $\omega_{xw}$ increases by $3\times$ under voice audio energy.

---

## Section 3: Audio Reactivity & Dynamic Wave Mechanics

### 3.1 Audio Parameter Normalization Pipeline
1. **Microphone Input (`AudioAnalyserService`)**:
   - `FFT_SIZE = 256` $\implies 128$ frequency bins (`frequencyData: Uint8Array(128)`).
   - Dynamic Range RMS mapping:
     $$A_{\text{raw}} = \frac{1}{128} \sum_{i=0}^{127} \text{bin}_i, \quad A_{\text{norm}} = \min\left(1.0, \left(\frac{A_{\text{raw}}}{128}\right)^{1.2}\right)$$
2. **Speech Simulator Input (`SpeechVisualizerSimulator`)**:
   - Multi-sine harmonic synthesis with random vocal cadence jitter:
     $$A_{\text{sim}} = \text{clamp}(0.15, 1.0, 0.45 + 0.35\sin\phi + 0.25\sin(2.3\phi) + 0.15\sin(4.1\phi) + \text{jitter})$$
3. **Temporal Smoothing (Exponential Lerp)**:
   $$A_{\text{smoothed}} \leftarrow A_{\text{smoothed}} + (A_{\text{target}} - A_{\text{smoothed}}) \cdot \lambda \cdot \Delta t_{60}$$
   where $\lambda = 0.10$ for volume envelope, and $\lambda = 0.06$ for wave velocity.

---

## Section 4: Color Theme Accents & Assistant State Signatures

### 4.1 Accent Theme Palette Integration

| Theme ID | Name | Primary Hex | Secondary Hex | Glow RGBA | Background Glow CSS |
|----------|------|-------------|---------------|-----------|---------------------|
| `fox-cyan` | Fox Cyan (Default) | `#99FFFF` | `#00E5FF` | `rgba(153, 255, 255, 0.8)` | Radial Cyan `#99FFFF` 28% / `#00E5FF` 15% |
| `artistic-flair` | Electric Azure | `#007AFF` | `#5856D6` | `rgba(0, 122, 255, 0.75)` | Radial Azure `#007AFF` 25% / `#5856D6` 15% |
| `siri-intelligence` | Apple Intelligence | `#7B61FF` | `#00F0FF` | `rgba(123, 97, 255, 0.65)` | Radial Violet `#7B61FF` 22% / Cyan 12% |
| `siri-classic` | Cosmic Violet | `#9D4EDD` | `#E0AAFF` | `rgba(157, 78, 221, 0.65)` | Radial Purple `#9D4EDD` 25% / Fuchsia 10% |
| `emerald-aura` | Emerald Mint | `#30D158` | `#66D4CF` | `rgba(48, 209, 88, 0.65)` | Radial Emerald `#30D158` 25% / Teal 10% |
| `solar-amber` | Solar Amber | `#FF9F0A` | `#FF453A` | `rgba(255, 159, 10, 0.65)` | Radial Amber `#FF9F0A` 25% / Orange 10% |
| `titanium-frost` | Titanium Frost | `#E5E5EA` | `#8E8E93` | `rgba(229, 229, 234, 0.55)` | Radial Silver `#E5E5EA` 15% / Slate 8% |

### 4.2 State Transition Matrix

```
   ┌────────────────────────────────────────────────────────┐
   │                                                        │
   ▼                                                        │
┌──────────────┐     User clicks mic      ┌──────────────────┐
│     IDLE     │ ───────────────────────> │    LISTENING     │
│ (Serene Flow)│                          │ (High Sensitivity│
└──────────────┘                          └──────────────────┘
   ▲                                                │
   │                                                │ User finishes speaking
   │ Fox finishes speaking                          ▼
┌──────────────┐     LLM streams tokens   ┌──────────────────┐
│   SPEAKING   │ <─────────────────────── │     THINKING     │
│(High Energy  │                          │(Gimbal/HUD Rings │
│ Luminance)   │                          │ & Pulse Swirl)   │
└──────────────┘                          └──────────────────┘
```

#### State Visual Parameters Across All 5 Shapes

| State | Global Glow Alpha | Particle Size Multiplier | Rotation Speed $(\text{rad/frame})$ | Shape-Specific Dynamic Characteristic |
|---|---|---|---|---|
| **Idle** | $0.22 - 0.25$ | $1.0\times$ | $0.0020$ | Soft rhythmic breathing oscillation $(\pm 4\text{px})$ |
| **Listening** | $0.35 - 0.48$ | $1.3\times$ | $0.0035$ | Real-time microphone wave ripples, audio expansion |
| **Thinking** | $0.40 - 0.60$ | $1.4\times$ | $0.0045$ | Orbital rings activate, internal crystals/vortices spin $3\times$ faster, chime triggers |
| **Speaking** | $0.45 - 0.70$ | $1.8\times - 2.4\times$ | $0.0030$ | Crest luminescent white-hot highlights $(rgb \to 255)$, voice cadence ripples |

---

## Section 5: Interactive 3D Orbit Controls & Momentum Physics

### 5.1 Drag & Momentum Decay Equations

- **Drag Sensitivity**: $k_{\text{drag}} = 0.008\text{ rad/px}$
- **Friction Decay Coefficient**: $\mu = 0.94\text{ per frame}$ (momentum decay multiplier)
- **Idle Ambient Drift**: $\omega_{\text{idle}} = 0.0020\text{ rad/frame}$

```typescript
// Drag event handlers
const onMouseDown = (e: MouseEvent) => {
  isDragging = true;
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
  velocityYaw = 0;
  velocityPitch = 0;
};

const onMouseMove = (e: MouseEvent) => {
  if (!isDragging) return;
  const dx = e.clientX - lastMouseX;
  const dy = e.clientY - lastMouseY;
  currentYaw += dx * 0.008;
  currentPitch += dy * 0.008;
  velocityYaw = dx * 0.008;
  velocityPitch = dy * 0.008;
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
};

const onMouseUp = () => {
  isDragging = false;
};

// Physics update loop
if (!isDragging) {
  currentYaw += velocityYaw * speedFactor;
  currentPitch += velocityPitch * speedFactor;
  
  velocityYaw *= Math.pow(0.94, speedFactor);
  velocityPitch *= Math.pow(0.94, speedFactor);
  
  if (Math.abs(velocityYaw) < 0.0001) {
    currentYaw += smoothedYawSpeed * speedFactor;
  }
}

// Pitch clamping to avoid gimbal flip
currentPitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, currentPitch));
```

---

## Section 6: Settings UI Specification

### 6.1 Layout & Hierarchy (`app/components/SettingsView.tsx`)

In `SettingsView.tsx` under the `'theme'` tab ("Theme & Appearance"), insert the dedicated **"3D Intelligence Core Shape"** section at the very top of the page (above the Accent Color Spectrum grid).

```
+-------------------------------------------------------------------------------+
| THEME & APPEARANCE SETTINGS                                                  |
+-------------------------------------------------------------------------------+
|                                                                               |
| [Icon] 3D Intelligence Core Shape                  [ Active: Quantum Torus  ] |
| Select your procedural 3D quantum geometry engine and hologram visualization. |
|                                                                               |
| +-------------------+ +-------------------+ +-------------------+             |
| | [Globe] Sphere    | | [Disc] Torus      | | [Hex] Icosahedron |             |
| | Pristine Core     | | Vortex Ring       | | Holo Crystal      |             |
| | Multi-tiered...   | | Pulsing donut...  | | 20-faceted...     |             |
| | [Active Pill]     | | [Select]          | | [Select]          |             |
| +-------------------+ +-------------------+ +-------------------+             |
| +-------------------+ +-------------------+                                   |
| | [Dna] DNA Helix   | | [Boxes] Tesseract |                                   |
| | Dual Strand       | | 4D Projection     |                                   |
| | Dual braided...   | | 4D-to-3D...       |                                   |
| | [Select]          | | [Select]          |                                   |
| +-------------------+ +-------------------+                                   |
|                                                                               |
| ----------------------------------------------------------------------------- |
| Accent Color Spectrum                                                         |
| ...                                                                           |
+-------------------------------------------------------------------------------+
```

### 6.2 Shape Selector Card Specifications
- **Grid Layout**: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5`
- **Card Interactive Styling**:
  - Unselected: `bg-white/[0.03] hover:bg-white/[0.07] border-white/[0.08] hover:border-white/20`
  - Selected: `bg-white/[0.12] border-white/40 shadow-xl ring-1` with `boxShadow: 0 0 24px ${accentTheme.glow}` and border matching `${accentTheme.primary}80`
- **Card Content Elements**:
  1. Header: Shape Lucide Icon in glowing squircle + Badge pill (e.g. "4D Projection")
  2. Title: Shape Name (e.g. "Hypercube Tesseract")
  3. Description: 2-line clean technical explanation
  4. Active Indicator: Colored active badge / checkmark matching active theme

### 6.3 1-Click Switching Workflow
1. User clicks card $\implies$ triggers `onClick={() => handleSelectShape(shape.id)}`.
2. Audio chime: `SoundFXService.getInstance().playChime('click')`.
3. Context update: `setCoreShape(shape.id)`.
4. Persistence: writes `shape.id` to `localStorage` under `fox_core_shape_preference`.
5. Live update: Voice stage canvas switches geometry immediately without reload.

---

## Section 7: Testing Strategy & Verification

### 7.1 Test Matrix

| Test Layer | Test Case | Target / Method | Success Criteria |
|---|---|---|---|
| **Unit Test** | `StorageService` Core Shape CRUD | Test `loadCoreShape()`, `saveCoreShape()` | Correctly stores, retrieves, and falls back to `'sphere'` on invalid data |
| **Unit Test** | Parametric Coordinate Calculations | Verify Torus, Icosahedron, DNA, Tesseract math functions | Output points have valid non-NaN coordinates within bounding radii |
| **Unit Test** | 4D Perspective Projection Math | Test $P_4 = 1 / (D_4 - w'/S)$ with edge values $w' \to D_4$ | Clamping prevents division by zero or infinity |
| **State Sync Test** | Context Provider Reactivity | Update `coreShape` via `setCoreShape` | All consuming components receive new shape within 1 render cycle |
| **Rendering Test** | Canvas FPS & Delta Normalization | Measure frame time over 600 frames on 60Hz and 120Hz displays | Consistent $\sim 60\text{ FPS}$ with normalized `speedFactor = dt * 60` |
| **Interaction Test** | Drag Momentum & Clamp | Simulate mouse drag and release | Yaw continues with friction decay $(0.94)$; pitch remains within $[-\frac{\pi}{2}+0.1, \frac{\pi}{2}-0.1]$ |
| **UI Integration Test** | Settings Shape Selector Render | Inspect `SettingsView.tsx` theme tab | 5 shape cards render with icons, badges, descriptions, and active checkmarks |
| **Typecheck & Lint** | TypeScript Compilation | Execute `npm run lint` (`tsc --noEmit`) | 0 TypeScript errors or warnings across `app` and `api` workspaces |

---

## Conclusion & Architecture Sign-Off
This specification provides an exhaustive, unambiguous blueprint for implementing all 5 audio-reactive 3D visualizer shapes, real-time Web Audio integration, interactive momentum physics, and persistent Settings UI selector in Fox AI.
