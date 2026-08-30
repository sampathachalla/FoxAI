# E2E Test Infra: Notion-Feel Notes Tool

## Test Philosophy
- Opaque-box, requirement-driven. No dependency on implementation design.
- Methodology: Category-Partition + Boundary Value Analysis (BVA) + Pairwise Combinatorial Testing + Workload Testing.

## Feature Inventory & Test Mapping
| # | Feature | Source | Tier 1 (Coverage) | Tier 2 (Boundaries) | Tier 3 (Interactions) | Tier 4 (Real-World) |
|---|---------|--------|:-----------------:|:-------------------:|:---------------------:|:-------------------:|
| 1 | Block Engine (11 Types) | ORIGINAL_REQUEST §R1 | ≥5 test cases | ≥5 test cases | ✓ | ✓ |
| 2 | Interactive To-Do Checkboxes | ORIGINAL_REQUEST §R1 | ≥5 test cases | ≥5 test cases | ✓ | ✓ |
| 3 | Slash Command Menu (`/`) | ORIGINAL_REQUEST §R1 | ≥5 test cases | ≥5 test cases | ✓ | ✓ |
| 4 | Emoji Picker & Title Editing | ORIGINAL_REQUEST §R1 | ≥5 test cases | ≥5 test cases | ✓ | ✓ |
| 5 | Multi-Tag Management & Search | ORIGINAL_REQUEST §R2 | ≥5 test cases | ≥5 test cases | ✓ | ✓ |
| 6 | Gallery Cards & Dual View Mode | ORIGINAL_REQUEST §R2 | ≥5 test cases | ≥5 test cases | ✓ | ✓ |
| 7 | Markdown Serialization & Export | ORIGINAL_REQUEST §R2 | ≥5 test cases | ≥5 test cases | ✓ | ✓ |
| 8 | Auto-Save & Voice Sync Context | ORIGINAL_REQUEST §R3 | ≥5 test cases | ≥5 test cases | ✓ | ✓ |

## Test Architecture
- Test Runner: Vitest / Node test runner executing E2E unit & integration test suites
- Target Directory: `app/components/notse/__tests__/` and test runners
- Pass / Fail Semantics: Exit code 0, all assertions pass, clean TypeScript compilation (`npm run build`).
