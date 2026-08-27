# E2E Test Infra: Fox AI Multi-Shape 3D Visualizer & Settings

## Test Philosophy
- Opaque-box, requirement-driven testing based on `ORIGINAL_REQUEST.md`.
- Systematic multi-tiered coverage (Tiers 1-4 for requirement pass + Tier 5 for adversarial hardening).
- Tests must validate rendering math, shape switches, audio reactivity response, momentum physics, settings interactions, and storage persistence.

## Feature Inventory Mapping
| # | Feature | Source | Tier 1 | Tier 2 | Tier 3 |
|---|---------|--------|:------:|:------:|:------:|
| 1 | Core Shape Type & Metadata | ORIGINAL_REQUEST §R1, R2 | 5 | 5 | ✓ |
| 2 | Storage Persistence | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 3 | State & Context Sync | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 4 | Quantum Torus Geometry | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 5 | Cyber Icosahedron Geometry | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 6 | Neural DNA Helix Geometry | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 7 | Hypercube / Tesseract Geometry | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 8 | Holographic Sphere Compatibility | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 9 | Multi-State & Theme Adaptation | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 10 | Drag-to-Rotate Momentum Decay | ORIGINAL_REQUEST §R1, AC | 5 | 5 | ✓ |
| 11 | Settings UI 3D Core Shape Selector | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 12 | Live 1-Click Switching Sync | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |

## Test Architecture
- Unit and E2E test runner executing automated assertions on geometry coordinates, projection maths, localStorage persistence, state hooks, and component rendering.
- Test runner command: `npm test` or `npx vitest run` / node test suite.

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Full Lifecycle: Cold Start -> Sphere default -> Select Torus -> Refresh browser -> Torus restored | F1, F2, F3, F4, F11, F12 | Medium |
| 2 | Audio Reactivity across all 5 shapes under Voice Stage states (idle, listening, thinking, speaking) | F4, F5, F6, F7, F8, F9 | High |
| 3 | Rapid interactive switching across all 5 shapes with concurrent theme accent changes | F1, F3, F9, F11, F12 | Medium |
| 4 | Drag-to-Rotate interaction with momentum decay physics on complex 3D/4D geometries | F4, F5, F6, F7, F10 | High |
| 5 | Corrupted localStorage fallback and recovery for `fox_core_shape_preference` | F1, F2, F3 | Medium |

## Coverage Thresholds
- Tier 1 (Feature Coverage): >= 5 per feature
- Tier 2 (Boundary & Corner Cases): >= 5 per feature
- Tier 3 (Cross-Feature Combinations): Pairwise coverage of shape switching, audio, theme, drag, and persistence
- Tier 4 (Real-World Workloads): >= 5 application-level end-to-end scenarios
