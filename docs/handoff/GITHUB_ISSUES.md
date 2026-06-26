# Seed GitHub Issues

Importable backlog for the handoff. Grouped by milestone (see `DEV_PLAN.md`). Each issue
has a title, labels, body, and acceptance criteria. Copy into your tracker, or use the
`gh` script at the bottom once the repo has a GitHub remote.

Suggested labels: `m1-foundation`, `m2-model-selection`, `m3-consistency`, `m4-audio`,
`m5-timeline`, `m6-shell`, `area:rust`, `area:frontend`, `area:providers`, `priority:high`,
`tech-debt`, `security`.

---

## Milestone M1 — Finish foundation

### [M1] Wire project Open via file input
`m1-foundation, area:frontend`
Open a `.mfp` bundle through a standard file input (works in browser + Tauri webview),
parse it, create a new project, save its pack, restore style/brand-kit selection, and open it.
- [ ] Open dialog accepts `.mfp`/JSON
- [ ] New project created from bundle; pack + style + brand kit restored
- [ ] Round-trips with Save As below

### [M1] Save As / Export `.mfp` bundle
`m1-foundation, area:frontend, area:rust`
Build `{app, version, project, pack, style, brandKitId}`; Tauri writes via `save_project_file`
to exports dir, browser does a Blob download.
- [ ] Produces a re-openable `.mfp`
- [ ] Filename defaults to project name

### [M1] Duplicate project
`m1-foundation, area:frontend, area:rust`
Expose `duplicate_project` (Rust exists): copy project + latest pack + asset records under a
new id; add UI (dashboard card action + workspace menu).
- [ ] Duplicate appears in project list with "(copy)" suffix
- [ ] Pack and assets copied; original unaffected

### [M1] Version history UI (snapshot / list / restore)
`m1-foundation, area:frontend`
Wire `snapshot_version` / `list_versions` / `restore_version` (Rust exists) into a workspace
"History" panel.
- [ ] Snapshot creates a checkpoint; list shows versions with timestamps
- [ ] Restore loads a prior version as the current working copy

### [M1] Decide pack storage (JSON vs normalized tables)
`m1-foundation, area:rust, tech-debt`
Document the decision: keep `prompt_packs.content_json`, or normalize `scenes`/`shots`
(recommended before reference-linking libraries). Record migration approach if normalizing.

---

## Milestone M2 — Per-shot model selection + references (PRIORITY)

### [M2] Define the Model Catalog (capability manifest)
`m2-model-selection, area:frontend, area:providers, priority:high`
Implement `MODEL_CATALOG` (`ModelDef[]`) in TS (+ minimal Rust mirror). Seed with current
models and add Kling/Veo/Runway/Seedance entries.
- [ ] Each model declares `refSlots` and `params`
- [ ] Models grouped by provider; provider id mapped to adapter

### [M2] Add per-shot generation settings to the data model
`m2-model-selection, area:frontend, area:rust, priority:high`
Add `ShotGenSettings` (model, params, references) for image+video to `ShotBreakdown` and
`ProjectGenDefaults`; mirror in Rust with serde defaults; implement default→override merge.
- [ ] New fields persist via `save_pack` round-trip
- [ ] Shot inherits project default until overridden; reset works

### [M2] Rework generation commands to `GenerationRequest`
`m2-model-selection, area:rust, area:providers, priority:high`
Replace prompt-only image/video commands & traits with
`GenerationRequest { model, prompt, references[], params }`; resolve model from catalog;
load reference bytes from assets; validate params.
- [ ] `generate_shot_image`/`generate_shot_video` take model + refs + params
- [ ] Asset row records the `modelId` used

### [M2] Provider adapters: reference delivery
`m2-model-selection, area:providers, priority:high`
Generalize fal **storage upload** (bytes→URL) + **queue** (submit/poll/download); confirm
Google reference support; map `RefRole`→provider fields per adapter.
- [ ] References reach providers in the form each requires
- [ ] Errors normalized to readable messages

### [M2] Per-shot Generation UI (capability-driven)
`m2-model-selection, area:frontend, priority:high`
Model picker → render only that model's ref slots + params; references from upload **and**
Asset Library; disable models whose provider key is missing (link to Settings); collapse by
default (progressive disclosure).
- [ ] Different image/video model per shot
- [ ] Slots/params match selected model; invalid inputs blocked
- [ ] Required refs/params enforced before Generate

---

## Milestone M3 — Consistency systems

### [M3] Character library + reference injection
`m3-consistency, area:frontend, area:rust`
Entity table + UI (name, description, personality, voice, appearance, reference images);
feed character refs into M2 reference slots and pack generation.

### [M3] Environment library
`m3-consistency` — references, mood boards, lighting/color, architectural style; consistent per location.

### [M3] Prop library
`m3-consistency` — reusable props with reference sheets / multiple angles / materials.

---

## Milestone M4 — Integrated audio
### [M4] Audio provider adapters (dialogue/voice, music, SFX)
`m4-audio, area:providers, area:frontend` — voice profiles + consistency; attach audio to shots.

## Milestone M5 — Timeline & edit
### [M5] Timeline workspace
`m5-timeline, area:frontend` — arrange/trim/reorder shots + audio; preview; export sequence.

## Milestone M6 — Shell, onboarding, polish & release
### [M6] Native menus + splash launch hub
`m6-shell, area:frontend` — File/Edit/View/Tools/Help; splash hub (asset provided).
### [M6] Help center + interactive onboarding
`m6-shell` — docs/tutorials/FAQ; first-run guided tour.
### [M6] Declutter / progressive-disclosure pass
`m6-shell` — collapse advanced controls; content over chrome.
### [M6] Re-enable scoped CSP
`m6-shell, security` — allowlist provider + asset origins (currently disabled).
### [M6] Code-sign the Windows installer
`m6-shell, security` — remove SmartScreen warning for distribution.

---

## Cross-cutting / tech debt
### [DEBT] Store raw asset references (not display URLs)
`tech-debt, area:frontend, area:rust` — enables portable `.mfp` with bundled media + reference reuse.
### [DEBT] Bundle media into `.mfp` with path remap
`tech-debt, area:rust` — copy assets into the bundle; rewrite refs relative→absolute on import.

---

## Optional: create issues with `gh`

Once the repo has a GitHub remote, you can script creation, e.g.:

```bash
gh issue create --title "[M2] Define the Model Catalog (capability manifest)" \
  --label "m2-model-selection,area:frontend,priority:high" \
  --body "Implement MODEL_CATALOG (ModelDef[]) ... (see docs/handoff/FEATURE_MODEL_SELECTION.md)"
# …repeat per issue above.
```
