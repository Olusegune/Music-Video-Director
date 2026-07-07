# PRD — Wheelbarrow MotionForge AI

**Version:** 2.0 (handoff) · **Type:** Local-first Windows desktop application

---

## 1. Vision

MotionForge is an **AI-powered creative production studio** that takes a creator from
**idea → script → storyboard → camera & lighting design → image frames → video clips →
export**, in one workspace, while maintaining style, character, environment, and prop
consistency.

It is **not** a chat tool. It is a project-centric creative workspace closer to Figma,
Linear, Frame.io, and DaVinci Resolve in feel. The AI is a collaborator embedded in a
professional workflow, not the workflow itself.

It runs **locally on Windows**, calls third-party AI providers directly with the user's
**own API keys**, and stores everything on the user's machine.

---

## 2. Target users

| Persona | Needs | Success metric |
|---|---|---|
| Motion designer | Storyboards, shot breakdowns, image/video prompts & assets | Faster setup |
| Creative director | Treatments, consistent look, client-ready output | Faster approvals |
| AI filmmaker | Camera/lighting plans, multi-model image/video generation | Faster production |
| SaaS / marketing | Product films, explainers, social ads | Higher campaign velocity |

Both **beginners** (guided, low cognitive load) and **professionals** (deep control,
per-shot overrides) must feel at home.

---

## 3. Product principles

1. **Visual first** — show storyboards, frames, and timelines before walls of text.
2. **Project-centric** — everything lives in `Project → Scene → Shot → Asset/Prompt`.
3. **Editable everywhere** — every AI output is editable, lockable, regenerable, versioned.
4. **Local-first & private** — data on disk, keys in the OS keychain, no mandatory cloud.
5. **Progressive disclosure** — hide advanced controls until needed; reduce clutter.
6. **Consistency is the moat** — project-wide style, plus reusable characters/environments/props.
7. **Provider-agnostic** — models are configurable; the app orchestrates, it doesn't lock in.

---

## 4. Core workflow

```
Idea / Script / Brief
  → Creative Direction + Style (AI)
  → Shot Breakdown / Storyboard (AI, editable)
  → Camera Director + Lighting Director (AI, per shot, editable)
  → Image frames per shot (chosen model + references)
  → Video clips per shot (chosen model + references)
  → Audio (dialogue / music / SFX)            [roadmap]
  → Timeline edit                              [roadmap]
  → Export package (PDF / DOCX / MD / JSON / media)
```

Every stage shares **project-wide assets and visual rules**.

---

## 5. Functional requirements

### 5.1 Built today (functional)
- **FR-1 Projects** — create, list, delete, open; local SQLite persistence; autosave.
- **FR-2 Prompt Pack generation** — freeform input → structured pack (creative direction,
  style, shot breakdown, camera layer, lighting layer, QC checklist) via Gemini.
- **FR-3 Editable workspace** — three-panel layout; Storyboard / Camera / Lighting /
  Prompts / Exports tabs; every field inline-editable; autosave with status.
- **FR-4 Camera Director** — per-shot shot type, lens, height, angle, movement,
  composition, emotional & editorial purpose, notes.
- **FR-5 Lighting Director** — per-shot scene intent, strategy, key/fill/rim, color temp,
  contrast ratio, atmosphere, depth separation, continuity rules.
- **FR-6 Image generation** — per-shot frame generation (fal.ai FLUX / Google Imagen),
  download to assets dir, display via Tauri asset protocol.
- **FR-7 Video generation** — per-shot clip via async job (submit→poll→download)
  (fal.ai / Google Veo).
- **FR-8 Frame upload override** — upload an image to lock a shot's frame as a reference.
- **FR-9 Project Style System** — project-wide visual style preset (or custom) injected
  into generation and every image/video prompt.
- **FR-10 Brand Kits** — reusable colors/type/voice/visual rules applied to generation.
- **FR-11 Asset Library** — gallery of generated frames/videos across projects.
- **FR-12 Export** — PDF / DOCX / Markdown / JSON production documents.
- **FR-13 Theming & a11y** — light/dark, keyboard nav, focus, reduced motion.
- **FR-14 Packaging** — Windows MSI + NSIS installer.

### 5.2 Priority new requirement — **Per-shot model selection + references**
- **FR-15 Model catalog** — a capability manifest of supported image/video models per
  provider, declaring supported inputs, parameters, and constraints.
- **FR-16 Per-shot generation settings** — for each shot's **image** and **video**, the
  user selects the **model**, sets **model-specific parameters**, and attaches
  **reference images/videos** in the slots the chosen model supports (init/style/
  character/control image; start/end frame; reference video; etc.).
- **FR-17 Reference handling** — references are project assets (from upload or the
  libraries) uploaded/encoded as each provider requires.
- **FR-18 Defaults & inheritance** — project-level default model/params; per-shot
  override. See [FEATURE_MODEL_SELECTION.md](FEATURE_MODEL_SELECTION.md).

### 5.3 Roadmap (not yet built) — see DEV_PLAN.md
- **FR-19 Project files & versioning** — Save/Open/Save As/Duplicate, portable `.mfp`,
  version history/restore. *(Partially implemented at handoff.)*
- **FR-20 Consistency systems** — Character / Environment / Prop libraries with reference
  sheets injected into generation.
- **FR-21 Integrated audio** — dialogue/voice, music, SFX/foley/ambience.
- **FR-22 Timeline / edit** — arrange shots & audio on a timeline.
- **FR-23 Professional shell** — native File/Edit/View/Tools/Help menus; splash launch hub.
- **FR-24 Help & onboarding** — docs, tutorials, interactive first-run tour.

---

## 6. Non-functional requirements

- **Performance:** time-to-first-prompt < 30s; pack generation < 60s (model-dependent).
- **Reliability:** generation failures surface the real provider error to the user.
- **Privacy:** API keys only in OS keychain; never logged, never sent to the frontend,
  never sent anywhere except the chosen provider.
- **Portability:** project content should be exportable/movable between machines.
- **Accessibility:** WCAG-ish — 4.5:1 contrast, full keyboard nav, reduced-motion support.

---

## 7. Success metrics

- ≥ 80% reduction in pre-production planning time vs. manual multi-tool workflow.
- Complete first storyboard (text + frames) in a single session without leaving the app.
- ≥ 70% of generated prompts reused/edited rather than discarded.
- Users can switch image/video models per shot without confusion (task success in usability test).

---

## 8. Non-goals (for now)

- No mandatory account/cloud sync (local-first; cloud is a future option).
- Not a general video NLE — timeline is for arranging AI shots, not frame-accurate editing.
- No training/fine-tuning of models in-app.
- No hosting/proxying of provider keys on a server — keys stay on device.
