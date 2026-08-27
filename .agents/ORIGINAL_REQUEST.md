# Original User Request

## 2026-08-26T20:54:23-04:00

Implement 4 new audio-reactive 3D visualizer shapes (Quantum Torus, Cyber Icosahedron, Neural DNA Helix, Hypercube Tesseract) alongside the existing Holographic Sphere Core for Fox AI, and build an interactive visual shape selector in the Settings page with live persistence.

Working directory: `/Users/sampath/Desktop/fox-jarvis-inspiration`
Integrity mode: demo

## Requirements

### R1. Multi-Shape 3D Audio-Reactive Engine
- Implement 4 distinct procedural 3D visualizer geometry modes:
  1. **Quantum Torus**: Pulsing donut ring of continuous particle streams and orbital rings.
  2. **Cyber Icosahedron**: Geometric holographic crystal polyhedron with glowing vertices and rotating facet edges.
  3. **Neural DNA Helix**: Dual braided particle waves undulating and twisting in 3D space.
  4. **Hypercube / Tesseract**: 4D-to-3D projection of rotating nested cube lattices.
- Maintain full compatibility with the existing **Holographic Sphere Core** (5 total selectable visualizer shapes).
- All shapes must react organically in real-time to microphone audio level, frequency spectrum bins, color theme accents, and assistant states (idle, listening, thinking, speaking).
- Smooth mouse drag 3D rotation and momentum decay.

### R2. Settings UI Visual Selector
- In `app/components/SettingsView.tsx` (under the **Theme & Appearance** tab), add a dedicated **"3D Intelligence Core Shape"** section.
- Display visual preview cards/badges for each of the 5 shapes with animated icons, descriptions, and active state indicators.
- Allow immediate 1-click switching that instantly changes the active visualizer in both the Voice Stage and Settings preview.
- Persist the selected shape in `localStorage` (`fox_core_shape_preference`) and synchronize with `assistantContext.tsx`.

## Acceptance Criteria

### Shape Variety & Performance
- [ ] User can switch between all 5 shapes (Sphere, Torus, Icosahedron, Helix, Tesseract).
- [ ] 60 FPS fluid rendering on standard HTML5 canvas with smooth audio reactive pulsing.
- [ ] Drag-to-rotate interaction works seamlessly on all 3D geometries.

### Settings UI & Persistence
- [ ] The "Theme & Appearance" settings tab includes a clean visual card selector for the 3D shapes.
- [ ] Selected shape persists across browser refreshes and application restarts.
- [ ] Clean TypeScript compilation with `npm run lint` passing without errors.
