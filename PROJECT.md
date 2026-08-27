# Project: Fox AI Multi-Shape 3D Audio-Reactive Visualizer & Settings Selector

## Architecture
- **Rendering Layer**: Procedural 3D Canvas 2D perspective engine in `app/components/FloatingOrb.tsx` supporting 5 distinct geometries (Sphere, Torus, Icosahedron, Helix, Tesseract), depth sorting, audio displacement physics, momentum decay, and color theme gradients.
- **State & Context Layer**: `app/store/assistantContext.tsx` holds `coreShape` state and provides `setCoreShape()`, consuming real-time audio streams (`audioLevel`, `frequencyData`), theme accents, and assistant state (`status`).
- **Storage Layer**: `app/services/storage.ts` provides `fox_core_shape_preference` persistence with fallback defaults and storage error resilience.
- **UI Layer**: `app/components/SettingsView.tsx` renders the "3D Intelligence Core Shape" card selector in the "Theme & Appearance" tab with animated icons, descriptions, and 1-click active state indicators.
- **Testing Layer**: Multi-tiered unit and E2E testing suite validating shapes, audio reactivity, drag physics, settings interaction, and localStorage persistence.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Core Shape Type & Metadata | `CoreShapeId` union, metadata constants, descriptions, and icons | M1 | ORIGINAL_REQUEST §R1, R2 |
| 2 | Storage Persistence | `fox_core_shape_preference` in `storage.ts` with load/save | M1 | ORIGINAL_REQUEST §R2 |
| 3 | State & Context Sync | `coreShape` & `setCoreShape` in `assistantContext.tsx` | M1 | ORIGINAL_REQUEST §R2 |
| 4 | Quantum Torus Visualizer | Procedural torus geometry, particle streams, orbital rings, audio wave | M2 | ORIGINAL_REQUEST §R1 |
| 5 | Cyber Icosahedron Visualizer | Holographic crystal icosahedron, vertices, facet edges, audio pulse | M2 | ORIGINAL_REQUEST §R1 |
| 6 | Neural DNA Helix Visualizer | Dual braided particle waves, base pair rungs, audio undulation | M2 | ORIGINAL_REQUEST §R1 |
| 7 | Hypercube / Tesseract Visualizer | 4D-to-3D projected rotating nested cube lattices, audio scaling | M2 | ORIGINAL_REQUEST §R1 |
| 8 | Holographic Sphere Compatibility | Full backward compatibility for existing sphere core | M2 | ORIGINAL_REQUEST §R1 |
| 9 | Multi-State & Theme Adaptation | Organic response to idle/listening/thinking/speaking and theme colors | M2 | ORIGINAL_REQUEST §R1 |
| 10 | Drag-to-Rotate Momentum Decay | Mouse drag pitch/yaw with smooth momentum decay (~0.94 friction) | M2 | ORIGINAL_REQUEST §R1, AC |
| 11 | Settings UI 3D Core Shape Selector | "3D Intelligence Core Shape" section under Theme & Appearance tab | M3 | ORIGINAL_REQUEST §R2 |
| 12 | Live 1-Click Switching Sync | Instant visualizer update in Voice Stage and Settings preview | M3 | ORIGINAL_REQUEST §R2 |
| 13 | E2E Verification & Hardening | Complete Tiers 1-4 E2E test pass + Tier 5/6 adversarial hardening | M4 | ORIGINAL_REQUEST §AC |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Core Types, Storage & State Context | `app/types/index.ts`, `app/services/storage.ts`, `app/store/assistantContext.tsx` | none | DONE |
| M2 | Multi-Shape 3D Audio-Reactive Engine | `app/components/FloatingOrb.tsx` | M1 | DONE |
| M3 | Settings UI 3D Shape Selector | `app/components/SettingsView.tsx` | M1 | DONE |
| M4 | Final E2E Test Pass & Adversarial Hardening | Verification across all 5 shapes, Settings UI, and storage persistence | M1, M2, M3, E2E | DONE |

## Interface Contracts
### `app/types/index.ts`
```typescript
export type CoreShapeId = 'sphere' | 'torus' | 'icosahedron' | 'helix' | 'tesseract';

export interface CoreShapeConfig {
  id: CoreShapeId;
  name: string;
  tagline: string;
  description: string;
  iconName: string;
  particleCount: number;
}
```

### `app/services/storage.ts`
```typescript
export const STORAGE_KEYS = {
  // ... existing keys
  CORE_SHAPE: 'fox_core_shape_preference',
};

export class StorageService {
  static loadCoreShape(fallback: CoreShapeId = 'sphere'): CoreShapeId;
  static saveCoreShape(shape: CoreShapeId): void;
}
```

### `app/store/assistantContext.tsx`
```typescript
export interface AssistantContextType {
  // ... existing fields
  coreShape: CoreShapeId;
  setCoreShape: (shape: CoreShapeId) => void;
}
```

## Code Layout
- `app/types/index.ts`: Shared TypeScript types, constants, and `CORE_SHAPES` metadata.
- `app/services/storage.ts`: Persistence service wrapping `localStorage`.
- `app/store/assistantContext.tsx`: React Context providing reactive state and synchronization.
- `app/components/FloatingOrb.tsx`: Procedural 3D Canvas visualizer engine.
- `app/components/SettingsView.tsx`: Settings modal view with Theme & Appearance tab.
- `tests/`: 6-tiered automated E2E, unit, boundary, combinatorial, and stress test suites.
