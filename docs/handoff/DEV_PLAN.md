# Development Plan

Status legend: ✅ built & working · 🟡 partial (in progress at handoff) · ⬜ not started.

## 1. Current state

| Area | Status | Notes |
|---|---|---|
| App shell (Tauri 2 + Vite + React + Tailwind) | ✅ | Three-panel workspace, light/dark, a11y pass |
| Projects + SQLite persistence + autosave | ✅ | create/list/delete/open |
| Prompt Pack generation (Gemini) | ✅ | structured JSON → editable cards |
| Editable workspace (storyboard/camera/lighting/prompts/exports) | ✅ | inline edit, autosave status |
| Camera Director / Lighting Director | ✅ | per-shot, editable |
| Image generation (fal FLUX / Imagen) | ✅ | download + asset-protocol display |
| Video generation (fal LTX / Veo) | ✅ | async submit→poll→download |
| Frame upload override | ✅ | lock an uploaded image as a frame |
| Project Style System | ✅ | preset/custom, injected into generation |
| Brand Kits | ✅ | applied to generation |
| Asset Library | ✅ | media across projects |
| Export (PDF/DOCX/MD/JSON) | ✅ | Rust renderers + unit test |
| Windows installer (MSI + NSIS) | ✅ | `npm run tauri build` |
| **Per-shot model selection + references (FR-15/16)** | ⬜ | **priority — see feature doc** |
| Project files / versioning (Save/Open/Save As/Duplicate/versions) | 🟡 | Rust mostly done; frontend wiring incomplete |
| Character / Environment / Prop libraries | ⬜ | the consistency moat |
| Integrated audio (dialogue/music/SFX) | ⬜ | |
| Timeline / edit | ⬜ | |
| Native menus + splash launch hub | ⬜ | |
| Help & onboarding | ⬜ | |

Verification baseline: `npm run build` (tsc + vite) clean; `cargo check` clean; export
renderer unit test passing; pipeline validated end-to-end with real Gemini + fal keys.

## 2. Roadmap (recommended order)

Estimates assume one experienced full-stack engineer comfortable with Rust + React;
ranges are calendar-ish, not contractual.

### M1 — Finish foundation 🟡→✅  (~0.5–1 wk)
- Complete project files & versioning frontend (Open via file input, Save As, Duplicate,
  version snapshot/restore UI). Rust commands largely exist; wire the UI + browser mock.
- Decide pack storage: keep JSON-in-`prompt_packs` vs normalize shots into tables
  (recommended before libraries).

### M2 — Per-shot model selection + references ⬜  (~1.5–2.5 wk) **[priority]**
- Implement the **Model Catalog**, `GenerationRequest`, reworked traits/commands, and the
  capability-driven generation UI. Generalize fal **storage upload** + **queue**; confirm
  Google reference support. Full spec: `FEATURE_MODEL_SELECTION.md`.

### M3 — Consistency systems ⬜  (~2–3 wk)
- Character / Environment / Prop libraries (entity tables + reference sheets). Feed their
  reference assets into the model-selection reference slots from M2. Inject descriptions
  into pack generation. Set realistic expectations (strong, not "perfect", consistency).

### M4 — Integrated audio ⬜  (~2–3 wk)
- Dialogue/voice (TTS w/ voice profiles), music, SFX/foley/ambience via provider adapters
  (same adapter pattern). Attach audio to shots/timeline.

### M5 — Timeline & edit ⬜  (~2–3 wk)
- Arrange shots + audio on a timeline; trim/reorder; preview; export sequence.

### M6 — Shell, onboarding, polish ⬜  (~1–2 wk)
- Native File/Edit/View/Tools/Help menus; splash launch hub (asset provided); Help center;
  interactive first-run onboarding; declutter/progressive-disclosure pass; re-enable a
  scoped CSP; code-sign the installer.

## 3. Cross-cutting tech tasks
- **Model catalog as data** (M2) — keep provider/model specifics out of UI/business logic.
- **Asset references as raw paths** — refactor `imageUrl`/`videoUrl` (or add fields) to
  store raw asset ids/paths; convert to display src at render. Needed for portable `.mfp`
  with bundled media and for reference reuse.
- **Error surfacing** — already centralized via `errorMessage()`; keep all provider errors
  user-readable.
- **Re-enable CSP** with an allowlist of provider + asset origins before release.
- **Tests** — extend the Rust unit tests (export already covered) to provider request
  mapping; add a few frontend tests around pack normalization and settings inheritance.

## 4. Risks & mitigations
| Risk | Mitigation |
|---|---|
| Provider APIs/model ids change frequently | Catalog is data-driven; model ids in one place; confirm at integration |
| "Perfect" character consistency expectation | Communicate "strong, not perfect"; use refs + seeds + descriptions |
| Reference upload differences per provider | Adapter contract owns delivery (URL upload vs base64) |
| Long video jobs / timeouts | Async job model with bounded polling + clear progress + cancel (add) |
| Cross-machine media portability | Store raw asset refs; bundle assets in `.mfp` (M1/M2 prep) |
| Unsigned installer SmartScreen warnings | Code-sign before distribution |

## 5. Definition of done (per milestone)
- `npm run build` and `cargo check` clean; relevant unit tests pass.
- Feature verified in-app on Windows with at least one real provider key.
- Errors surface real provider messages; no key ever reaches the frontend or logs.
- New pack fields added in both `types.ts` and `models.rs` (serde defaults).
