# Handoff Report — 3D Intelligence Core Shape & Integration Specifications

**Agent**: teamwork_preview_spec_miner_survey_3  
**Working Directory**: `/Users/sampath/Desktop/fox-jarvis-inspiration/.agents/teamwork_preview_spec_miner_survey_3`  
**Specification Report**: `/Users/sampath/Desktop/fox-jarvis-inspiration/.agents/teamwork_preview_spec_miner_survey_3/survey_specs.md`  

---

## 1. Observation

1. **Existing Visualizer Codebase (`app/components/FloatingOrb.tsx`)**:
   - Lines 96–122: Implements a 2,400-particle mathematical sphere partitioned into tiers (tiers 0–2 central sphere, tier 3 inner orbital gimbal ring $R=165$, tier 4 outer HUD ring $R=210$).
   - Lines 134–154: Mouse drag interaction modifies `currentYaw` and `currentPitch` directly without momentum inertia decay.
   - Lines 163–231: Canvas rendering loop with normalized speed factor `speedFactor = dt * 60`, DPR scaling, and 3D camera Euler transformations.
   - Lines 340–380: 3D acoustic wave formulas for idle, listening, thinking, and speaking states.
2. **State & Storage Architecture (`app/store/assistantContext.tsx`, `app/services/storage.ts`)**:
   - Storage keys defined in `app/services/storage.ts:19-34` (`fox_sessions_v3`, `fox_accent_theme_v1`, `fox_voice_pref_v1`, etc.).
   - `ORIGINAL_REQUEST.md` specifies key `fox_core_shape_preference` for persisting the selected 3D core shape.
3. **Settings UI Layout (`app/components/SettingsView.tsx`)**:
   - Lines 75–100: 4 tab categories (`theme`, `voice`, `engine`, `data`).
   - Lines 250–335: "Theme & Appearance" tab (`settingsTab === 'theme'`) houses Accent Color Spectrum grid and Header Top 3 Quick Actions.
4. **Build & Lint Verification**:
   - Executed `npm run lint` (`tsc --noEmit` across `app` and `api` workspaces) with exit code 0.

---

## 2. Logic Chain

1. **Geometry & Mathematical Modeling**:
   - The system requires 4 new procedural 3D visualizers (Quantum Torus, Cyber Icosahedron, Neural DNA Helix, Hypercube Tesseract) plus the existing Holographic Sphere Core.
   - Each shape has distinct mathematical definitions:
     - **Torus**: Parametric ring $(R + r\cos\phi)\cos\theta, r\sin\phi, (R + r\cos\phi)\sin\theta$ with helical particle streams and 2 tilted accretion rings.
     - **Icosahedron**: 12 golden-ratio vertices $(\pm 1, \pm \varphi, 0)$, 30 edges, 20 triangular faces, and inner counter-rotating crystal core.
     - **DNA Helix**: Dual antiparallel helical strands $R_h\cos(\omega_h s + \theta), s, R_h\sin(\omega_h s + \theta)$ with 28 base-pair ladder rungs.
     - **Hypercube Tesseract**: 4D Euclidean vertices $(\pm S, \pm S, \pm S, \pm S)$ subjected to 4D $SO(4)$ double rotations in $XW/YZ$ planes and perspective-projected into 3D via $P_4 = 1 / (D_4 - w'/S)$.
2. **Momentum Decay & Physics Optimization**:
   - Current canvas drag interaction immediately stops on mouse release.
   - Adding momentum decay ($v_{\text{yaw}} \cdot 0.94^{\text{speedFactor}}$) and pitch clamping ($[-\frac{\pi}{2}+0.1, \frac{\pi}{2}-0.1]$) ensures natural physics and prevents gimbal lock.
3. **Settings & State Synchronization**:
   - Adding `coreShape` to `AssistantContext` and `StorageService` under `fox_core_shape_preference` enables instant 1-click switching with live cross-view synchronization between Voice Stage and Settings.

---

## 3. Caveats

- **No Code Modifications Made**: As a Specification Miner, this survey agent produced only specifications and did not modify any source code files.
- **Canvas Context vs WebGL**: Specifications were designed targeting HTML5 2D Canvas with procedural 3D perspective projection for maximum performance, backward compatibility, and zero new heavyweight 3D library dependencies.

---

## 4. Conclusion

The specification report `survey_specs.md` is complete, mathematically rigorous, and fully documented across all 5 3D shapes, real-time audio reactivity, color theming, momentum physics, Settings UI integration, and testing strategy.

---

## 5. Verification Method

To verify the specification deliverables:
1. Inspect the detailed specification report at:
   `/Users/sampath/Desktop/fox-jarvis-inspiration/.agents/teamwork_preview_spec_miner_survey_3/survey_specs.md`
2. Verify TypeScript type compatibility and lint status:
   `npm run lint`
