# Director Studio — Addendum 1: Magic Flow (Platform Guided Flow) & Splashscreen

Amends `docs/DIRECTOR-STUDIO-MODULES-SPEC.md`. Where the two conflict, **this document wins** (notably: StudioMode semantics). Planning only — no code.
Prepared 2026-07-07.

---

## 1. Product Recommendation — Magic Mode

**Keep it. Promote it.** Magic Mode is not a Music Video feature that got stale — it is Director Studio's core promise ("you're not prompting an AI, you're briefing a studio") expressed as a UI. The mistake would be to kill it or leave it MV-shaped. Decision:

- **Redefine as a platform-level Guided Flow system**: one engine, one visual language, one entry pattern — with step *definitions* owned by each module.
- **Platform meaning:** "The simplest path from idea to finished creative output," adapting per module.
- Every module ships exactly one Magic Flow. It is the default first-run experience of every module and the only path Creator-tier users ever need.

### Naming (Task 2)

**Recommendation: "Magic Flow"** — user-facing. Internal/technical name: **Guided Flow** (`guidedFlow` in code).

Why: the codebase and users already have "Magic" equity (`MagicFlowButton`, `MagicDirect`, Magic Output); "Flow" reframes it from a *mode you switch into* to a *journey you're taken on*, which is exactly the multi-module semantics. It's short, premium-adjacent, and survives every module ("Glam Magic Flow" reads fine). Verdict on alternatives:

- *Guided Mode* — clinical, sounds like accessibility settings. No.
- *Create Mode* — collides with Creator Mode. Hard no.
- *Director Flow* — collides with Director Mode; also wrong, since the flow exists in all three modes. No.
- *Studio Flow / Launch Flow* — Studio collides with Studio Mode; Launch is Campaign-specific. No.
- *Quick Start* — reads cheap/utility, undermines the premium fantasy. No.
- *Make It For Me* — childish; violates the non-negotiables. No.
- *Magic Flow* — keeps equity, zero collisions, premium enough if the visual design carries it. **Yes.**

Guardrail: "Magic" only stays non-childish through restraint — no sparkles-everywhere, no wand cursors. Visual language: cinematic, dark, confident (the existing MV Magic aesthetic already leans this way). One tasteful signature moment (the generate/reveal transition) is where the "magic" lives.

---

## 2. Updated UX Architecture (Tasks 3 & 4)

### 2.1 StudioMode × Magic Flow — the corrected model

This **replaces** the Phase 0 mode semantics in the main spec (which made Creator the casual tier). New model — modes are *lenses on the same Magic Flow*, not separate paths:

| Mode | Who | Magic Flow behavior |
|---|---|---|
| **Director** | "I approve, you produce" | Pure guided flow. Card picks, review gates, plain language. **Zero prompt/model/provider jargon anywhere.** Advanced panels don't render. |
| **Studio** | Hands-on creative | Same flow + an **"Advanced" disclosure per step** exposing *creative* controls (look tuning, shot list edits, copy editing, layout, format selection). Still no model/provider jargon. Can exit any step into the full workbench and return. |
| **Creator** | Power user / tinkerer | Studio's controls **plus technical controls**: prompt inspection/override, provider/model pick per step, Loop Engine settings (batch size, rounds), seed/params. |

Consequences applied throughout: the "Instant Ad" / "Launch page in 5 min" quick paths from the main spec are no longer "Creator Mode" — they become the natural result of Director Mode with defaults accepted. Creator is the top of the control ladder, not the bottom. Director < Studio < Creator is strictly additive disclosure over one flow — one codebase, no forked UIs.

### 2.2 One shared Guided Flow engine

Platform owns the machinery; modules own the steps.

- **`FlowDefinition`** (per module, registered at module init): ordered `FlowStep[]`, each step = `{ id, title, subtitle, component, validate(state), advancedComponent?, technicalComponent?, skippable? }`. Steps receive/patch a module-typed flow state.
- **`FlowSession`** (persisted): `{ id, moduleId, projectId, definitionVersion, stepIndex, state, status: "active"|"draft"|"completed"|"abandoned", updatedAt }`. Autosaved on every step transition and on meaningful edits → **save/resume for free**. Dashboard and module home show "Resume your Magic Flow" cards for drafts.
- **`GuidedFlowShell`** (platform UI): the one component that renders any definition —
  - **Progress rail**: numbered steps with labels, current highlighted, completed clickable (back-jump allowed; forward-jump only through validation).
  - **Back / Next**: Next disabled until `validate` passes; steps never dead-end.
  - **Cancel**: never destructive — "Save draft & exit" (default) / "Discard" (confirm). Esc = save & exit.
  - **Advanced drawer**: renders `advancedComponent` in Studio+, plus `technicalComponent` in Creator. Collapsed by default, remembered per user.
  - **Reveal step pattern**: generation steps share a standard "producing → reveal" treatment (the signature Magic moment), wrapping LoopBoard where iteration applies.
- **Reusable step primitives** (platform): `PickCardStep` (choose 1 of N cards — concepts, looks, video types), `IntakeFormStep` (structured fields, no free-prompt feel), `MediaIntakeStep` (upload/pick from library), `ReviewGateStep` (approve/edit AI output as cards, not JSON), `GenerateStep` (loop + reveal), `SummaryStep` (what you'll get → produce). Target: ≥80% of every module's flow assembled from these; module-specific steps (e.g., MV lyric sync) stay in the module.
- **Entry points**: the existing floating `MagicFlowButton` is promoted to platform and becomes context-aware — it launches the *current module's* Magic Flow (or resumes its draft). Module home screens lead with a "Start Magic Flow" hero action.

### 2.3 Module Magic Flow definitions (Task 1 / updated workflows)

Each maps to the pipelines already specified in the main spec — the Magic Flow is the guided skin over the module's primary workflow, not a second pipeline:

- **Music Video Director:** Song → Lyrics → Performers → Video Type → Story → Style → Direct *(unchanged; becomes the reference implementation)*
- **Motion Studio:** Goal → Product/Business → Audience → Script → Style → Storyboard → Generate
- **Glam Studio:** Product → Brand → Campaign Goal → Look → Format → Generate → Export *(maps to main-spec steps 1–6+8; "Concept" pick folds into Campaign Goal's review gate in Director Mode, expands to a full step in Studio+)*
- **Web Studio:** Business → Offer → Audience → Pages → Style → Copy → Build *(Offer = the positioning review gate — keep it, it's the leverage step; Pages = section-stack pick in MVP)*
- **Campaign Studio:** Product → Goal → Audience → Campaign Idea → Assets → Timeline → Launch Kit *(Assets = deliverable plan board; Timeline = date-ordered list in MVP per main spec; Launch Kit = package export)*

Rule: a completed Magic Flow always lands on a real module artifact (project + deliverables), so graduating from Magic Flow to workbench is seamless — nothing is trapped inside the wizard.

---

## 3. Splashscreen Recommendation (Task 5)

**Current defect** (`src/platform/components/layout/StartupSplash.tsx`): a `fixed inset-0 z-[90]` in-app overlay with the splash PNG at `object-cover`, black background, ~1.4–2.7s total including a 900ms *minimum* hold and 520ms exit. On large/maximized windows the art is cropped and the whole app is hijacked — hence "aggressive."

**Recommendation: Option C now, Option D as a V1 flourish. Reject A. Keep B only as the mechanism.**

- **A (native Tauri splash window): rejected.** A second native window on Windows means a separate webview or native surface, window-flash on handoff, taskbar noise, and packaging complexity — all to save a few hundred ms that the in-app overlay already covers. Not worth it while webview cold-start is acceptable. (Revisit only if measured cold-start exceeds ~2s of blank window; then a tiny fixed-size 480×300 native splash is the fix.)
- **B (in-app overlay)** is the delivery mechanism we already have — the problem is its styling and timing, not its existence.
- **C (compact branded loading card) — adopt.** The overlay becomes: app-background scrim (theme background, not pure black) with a **centered fixed-size brand card** (~420×260px, logo/wordmark + subtle progress shimmer), `object-contain`, never scaling with the window. Feels premium via restraint; respects window size by construction.
- **D (first-run cinematic) — adopt in V1.** Full-bleed splash art shown **only on first launch per install** (persisted flag in settings) with a "skip" affordance; every subsequent launch gets the compact card. The existing splash PNG is preserved for this and for the About screen.

**Timing rules (replace current):** minimum hold ≤ 400ms (only to prevent a flash on fast loads); dismiss as soon as the app shell has mounted and the active project store has hydrated — tie dismissal to a real readiness signal, not a 2200ms fallback timer (keep a fallback, but as a 4s safety net, not the normal path); exit = 250–300ms fade + slight card scale-down; total perceived splash on warm launch target **< 700ms**. Never block input on the area outside the card once exiting begins. Works unchanged in Windows/Tauri packaged builds since it's all in-webview; verify against the packaged build where asset load timing differs from dev.

---

## 4. Consolidation with the Main Spec (Task 6)

Amendments to `DIRECTOR-STUDIO-MODULES-SPEC.md`:

1. **Product philosophy** — add: "Every module leads with its Magic Flow. Modes are additive lenses (Director ⊂ Studio ⊂ Creator) on that one flow, not separate products."
2. **Phase 0** gains two items and one change:
   - *(changed)* `studioMode.ts` semantics per §2.1 above (Creator = power tier).
   - *(new)* `platform/lib/guidedFlow.ts` + `platform/components/flow/` (GuidedFlowShell + step primitives). This **absorbs/replaces `loopEngine`'s UI companion plan** — LoopBoard becomes the internal renderer of `GenerateStep`.
   - *(new)* StartupSplash fix (small; can ship independently and first).
3. **Module briefs** — each module's "Director Mode" section now reads "Magic Flow in Director Mode"; the separate "Creator Mode quick path" sections are re-expressed as Director-mode defaults; Codex phase lists gain "assemble Magic Flow from platform step primitives" as the final MVP phase (replacing the bespoke 'Director wizard + Creator path' phases).
4. **Acceptance criteria (all modules)** — add: module ships a registered FlowDefinition; Director Mode renders zero prompt/model/provider strings; flow drafts survive app restart; completed flow produces a normal project editable in the workbench.
5. **Build order unchanged** (Phase 0 → Glam → Web → Campaign), with splash fix and Guided Flow engine at the front of Phase 0 since MV migration validates the engine before any new module uses it.

---

## 5. Codex Implementation Brief (Task 7)

### A. Platform Guided Flow engine + splash fix

**Folder structure / files to create**
```
src/platform/lib/guidedFlow.ts        # FlowDefinition, FlowStep, FlowSession, registry,
                                      # createFlowStore (zustand), session persistence
src/platform/components/flow/
  GuidedFlowShell.tsx                 # rail, back/next, cancel, advanced drawer, reveal
  steps/ PickCardStep.tsx IntakeFormStep.tsx MediaIntakeStep.tsx
         ReviewGateStep.tsx GenerateStep.tsx SummaryStep.tsx
src/platform/lib/studioMode.ts        # (amend if built) director|studio|creator per §2.1
```
**Files to modify:** `src/platform/components/layout/StartupSplash.tsx` (compact card per §3), `src/app/App.tsx` (promote MagicFlowButton usage to platform, splash readiness signal), `src/platform/features/dashboard/Dashboard.tsx` (resume-draft cards), settings for first-run flag (V1 cinematic).
**Data models:** `FlowDefinition`, `FlowStep`, `FlowSession`, `FlowStepComponentProps<TState>` (typed state slice + patch fn + mode), flow registry keyed by moduleId.
**Splash technical plan:** replace fullscreen `object-cover` img with theme-scrim + fixed 420×260 card (`object-contain` logo); dismissal driven by an `appReady` signal (shell mounted + stores hydrated) with 4s safety fallback; min-hold 400ms; 280ms exit fade/scale; keep component API identical (`<StartupSplash/>` in App.tsx) so nothing else changes.

### B. Music Video migration (do NOT break MV — this is the validation target)

- Strategy: **wrap, don't rewrite.** Express the existing Song→…→Direct sequence as a `FlowDefinition` whose step components delegate to the existing `DirectorWizard` step internals and `MagicDirect` logic (`apps/music-video/lib/magic.ts` and `mvdirector` features keep owning all MV logic). `MagicFlowButton` moves to `platform/components/flow/` with a re-export shim at its old path.
- Ship behind a settings flag (`guidedFlowV2`) for one release: old path remains default until the new shell is verified, then flip and delete the flag. In-progress old-format Magic sessions: migrate trivially if cheap, else honor until completed (drafts are short-lived).
- Module-specific steps stay in `apps/music-video`; only the shell/rail/navigation/persistence move to platform.

### C. Module flows (as each module is built)

Each new module (Glam → Web → Campaign, per build order) registers its FlowDefinition from §2.3 as its final MVP phase, composing platform step primitives; Motion Studio gets its flow retrofitted after MV migration proves the pattern (small, since Motion Studio already has brain/direction libs).

**Testing steps:** vitest on guidedFlow.ts (navigation state machine: next-gating on validate, back-jump, cancel/save-draft, resume, registry); vitest on splash timing logic (readiness + min-hold + fallback, extracted as a pure hook); manual: full MV Magic Flow run old-vs-new flag, kill-and-relaunch mid-flow resumes correctly, Director mode audit for zero jargon strings.
**Build/package verification:** `npm run build` green; `npm run tauri build` on Windows; verify packaged launch — splash card centered at 1280×720, maximized, and small (800×600) windows; cold vs warm launch timing; splash art asset loads in packaged resource path.
**Acceptance criteria:**
1. One platform Guided Flow engine; zero flow-shell code duplicated in modules.
2. MV Magic Flow runs on the new engine with identical creative results; no MV regressions (flag flip is a no-op for outputs).
3. Modes are additive disclosure: Director shows no prompt/model/provider UI anywhere in any flow; Studio adds creative controls; Creator adds technical controls.
4. Flow drafts autosave and resume across app restarts; cancel never loses work without explicit confirm.
5. Splash: respects window size (fixed card, no crop), warm-launch perceived time < 700ms, readiness-driven dismissal, smooth fade, verified in the Windows packaged build.
6. Typecheck/build clean; only `platform/` additions + MV wrapper changes in the diff.

---

## 6. Recommended Next Step

Hand Codex a single work order in this sequence: **(1) splash fix** (half-day, independent, immediately visible win) → **(2) Guided Flow engine + step primitives** → **(3) MV Magic migration behind the flag** → verify packaged build → flip flag. Only then start Glam Studio per the main spec, whose Magic Flow becomes the first greenfield consumer of the engine.
