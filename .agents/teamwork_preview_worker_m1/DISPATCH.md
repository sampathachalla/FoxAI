## 2026-08-27T00:57:15Z
You are teamwork_preview_worker_m1 for Milestone 1 (Core Types, Storage & State Context).
Working directory: /Users/sampath/Desktop/fox-jarvis-inspiration/.agents/teamwork_preview_worker_m1
Original request path: /Users/sampath/Desktop/fox-jarvis-inspiration/.agents/ORIGINAL_REQUEST.md
Project specification path: /Users/sampath/Desktop/fox-jarvis-inspiration/PROJECT.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Scope & File Ownership:
Exclusively own:
- `app/types/index.ts`
- `app/services/storage.ts`
- `app/store/assistantContext.tsx`

Task:
1. `app/types/index.ts`:
   - Define `CoreShapeId = 'sphere' | 'torus' | 'icosahedron' | 'helix' | 'tesseract'`
   - Define `CoreShapeConfig` interface and export `CORE_SHAPES` or `CORE_SHAPE_CONFIGS` with names, taglines, descriptions, icon identifiers, and particle counts:
     * Sphere: "Holographic Sphere", "Harmonic Resonance Core", "Multi-tier holographic particle sphere with orbital HUD rings", 2400 particles
     * Torus: "Quantum Torus", "Subatomic Flux Ring", "Pulsing donut ring of continuous particle streams and orbital rings", 2400 particles
     * Icosahedron: "Cyber Icosahedron", "Holographic Crystal Lattice", "Geometric crystal polyhedron with glowing vertices and rotating facet edges", 12 vertices + 30 edges + core particles
     * Helix: "Neural DNA Helix", "Biomimetic Neural Wave", "Dual braided particle waves undulating and twisting in 3D space with base pair rungs", 2400 particles
     * Tesseract: "Hypercube Tesseract", "4D Dimensional Matrix", "4D-to-3D perspective projection of rotating nested cube lattices", 16 vertices + 32 edges + interior particles
2. `app/services/storage.ts`:
   - Add `CORE_SHAPE: 'fox_core_shape_preference'` to `STORAGE_KEYS`.
   - Add `loadCoreShape(fallback?: CoreShapeId): CoreShapeId` with validation against valid `CoreShapeId` strings, handling `null`, invalid strings, or exceptions safely.
   - Add `saveCoreShape(shape: CoreShapeId): void` using `safeSet`.
3. `app/store/assistantContext.tsx`:
   - Add `coreShape: CoreShapeId` and `setCoreShape: (shape: CoreShapeId) => void` to `AssistantContextType`.
   - Initialize `coreShape` state from `StorageService.loadCoreShape('sphere')`.
   - Implement `setCoreShape` callback that sets React state and calls `StorageService.saveCoreShape(shape)`.
   - Provide `coreShape` and `setCoreShape` in the `AssistantProvider` context value.
4. Verify by running `npm run lint` and `npm run build`. Ensure zero TypeScript errors and clean build.
5. Write your implementation report to `/Users/sampath/Desktop/fox-jarvis-inspiration/.agents/teamwork_preview_worker_m1/changes.md` and deliver `handoff.md`. Communicate back when done.
