## 2026-08-26T21:00:29Z

You are teamwork_preview_worker_m2 for Milestone 2 (Multi-Shape 3D Audio-Reactive Procedural Engine).
Working directory: /Users/sampath/Desktop/fox-jarvis-inspiration/.agents/teamwork_preview_worker_m2
Original request path: /Users/sampath/Desktop/fox-jarvis-inspiration/.agents/ORIGINAL_REQUEST.md
Project specification path: /Users/sampath/Desktop/fox-jarvis-inspiration/PROJECT.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Scope & File Ownership:
Exclusively own:
- `app/components/FloatingOrb.tsx` (and any new procedural visualizer helper files under `app/components/` if needed)

Task:
Implement the complete Multi-Shape 3D Audio-Reactive Engine in `app/components/FloatingOrb.tsx`:
1. Connect `coreShape` from `useVoiceAssistant()` (with mutable ref `coreShapeRef` in the animation loop) to select between 5 procedural geometry modes:
   - **Sphere** (Holographic Sphere Core): The existing 2400-particle spherical holographic core with concentric rings and wave displacements, ensuring full backward compatibility.
   - **Quantum Torus**: Procedural parametric torus $(R + r\cos\phi)\cos\theta, r\sin\phi, (R + r\cos\phi)\sin\theta$ ($R \approx 130, r \approx 45$) consisting of continuous flowing particle streams along major/minor circumferences, plus 2 tilted orbital/accretion rings ($R \approx 190, 220$). Audio frequency bins pulse the torus radius and orbital particles.
   - **Cyber Icosahedron**: Holographic crystal polyhedron with 12 golden-ratio vertices $(\pm 1, \pm \varphi, 0)$ scaled to radius $\approx 140$, 30 glowing facet edge lines, 20 triangular face lattices, glowing vertex flares, and an inner pulsating crystal energy core.
   - **Neural DNA Helix**: Dual braided antiparallel helical particle strands ($R \approx 75$, length $\approx 320$, $2.5$ full helical turns) undulating and twisting in 3D space with 28 connecting base-pair rungs/bars reacting dynamically to frequency spectrum bins.
   - **Hypercube / Tesseract**: 4D-to-3D perspective projection of 16 4D vertices $(\pm S, \pm S, \pm S, \pm S)$ subjected to 4D $SO(4)$ double plane rotations (in $XW$ and $YZ$ planes), projected to 3D with perspective divisor $P_4 = 1 / (D_4 - w'/S)$, connecting 32 4D edges (inner cube and outer cube lattices with 8 bridging hyper-edges), plus volumetric lattice particles.
2. Full Audio Reactivity & Multi-State Animation:
   - All 5 shapes must react organically in real-time to microphone audio level (`audioLevel`), FFT frequency spectrum bins (`frequencyData`), theme color accents (`accentTheme`), and assistant states (`idle`, `listening`, `thinking`, `speaking`).
   - High-energy audio levels expand particle radii, glow luminosity, wave frequency/amplitude, and edge stroke brightness.
   - Assistant states smoothly modulate animation speed, breathing cadence, and mode morphing.
3. Mouse Drag 3D Rotation with Momentum Decay:
   - Enhance the canvas drag interaction: track drag velocity (`yawVelocity`, `pitchVelocity`) on mouse move.
   - On mouse release, apply smooth momentum inertia decay with friction damping factor ($\approx 0.94$ per frame) until velocity settles below a threshold, with safe pitch clamping to prevent gimbal flips.
4. Canvas Performance:
   - Maintain solid 60 FPS performance on standard HTML5 canvas with DPR scaling, depth sorting ($z$-buffer), and clean memory allocation.
5. Verification:
   - Run `npm run lint` and `npm run build` — ensure 0 errors and clean build.
6. Write your implementation report to `/Users/sampath/Desktop/fox-jarvis-inspiration/.agents/teamwork_preview_worker_m2/changes.md` and deliver `handoff.md`. Communicate back when done.
