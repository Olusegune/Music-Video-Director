# Director Studio — Full Product, Code & UX Review

Reviewed 2026-07-08 against `main` @ `8d69267`. Review only — no changes made.
Verified during review: `tsc --noEmit` passes clean. ~39.4k lines of TS/TSX across 194 files (platform 21.6k · music-video 13.9k · glam 1.5k · motion 1.3k · web 0.6k · campaign 0.4k).

---

## 1. Executive Summary

Director Studio has crossed an important threshold: it is now a real multi-module platform, not a music-video app with extras. The Phase 0 platform systems from the spec (`guidedFlow`, `loopEngine`, `brandDna`, `deliverables`, `seedContext`, `studioMode`) all exist and are actually consumed by the new modules — the architecture bet paid off. Typecheck is green, module boundaries are mostly respected, and the guided-flow step primitives are being reused as designed.

The two honest headlines:

1. **The suite is architecturally sound but experientially uneven.** Music Video Director is deep and feels like a product. Glam, Web, and Campaign are thin MVPs (Glam 1.5k lines, Web 578, Campaign 416 — vs. music-video's 13.9k) that *function* but read as scaffolding: text lists, form intakes, and Cards where a creative tool needs imagery, previews, and reveal moments. The gap between what the sidebar promises ("five studios") and what three of them deliver is the single biggest product risk.
2. **The app still defaults to "admin software" at nearly every surface.** Text-first cards, `Input`+`Label` stacks, list-buttons for projects, badges for status. The design system underneath (CSS-variable theming, gold accent, cva components) is good — it's just being used to build forms, not a studio. The fix is not a reskin; it's a small set of shared *visual* primitives (thumbnail cards, filmstrips, reveal moments, art-directed empty states) applied everywhere.

**Zero automated tests exist** despite the spec's per-module quality gates — that's the top engineering debt.

## 2. Biggest Strengths

- **Platform extraction actually happened.** Guided Flow engine + 6 step primitives in `platform/components/flow/`, consumed by Glam/Web/Campaign and MV (`MusicVideoGuidedFlow` behind the `guidedFlowV2` flag with the legacy `DirectorWizard` preserved — exactly the migration strategy specced).
- **Deliverable registry + SeedContext are live** (`platform/lib/deliverables.ts`, `seedContext.ts`), so Campaign orchestration has a real spine.
- **Design-system foundation is right:** runtime-switchable CSS variables mapped through Tailwind `@theme inline`, consistent ui kit (button/card/badge), dark-first, a `creative-empty-state` component already started, gold/luxury accent available.
- **Local-first discipline held:** provider router with `local` prompt-pack mode, keys in keychain via Rust, metadata (not blobs) in localStorage with files on disk through the Rust core.
- **Music Video Director is genuinely deep** — Song Brain, cast, choreography, timeline, shot-level direction — and gives the suite its credibility anchor.
- **Undo/dataVersion remount pattern, session recovery (SessionGuard), global search, help center** — platform amenities most indie apps never ship.

## 3. Biggest Weaknesses

1. **Three shallow studios wearing big-studio names.** Web Studio's entire UI is one 287-line-of-JSX-on-one-line component; Campaign is 416 lines total. Neither has thumbnails, visual previews of deliverables, or any reveal moment. Glam is fuller but is a **1,375-line single-file monolith** (`GlamStudio.tsx`) that violates the specced `features/` decomposition and will rot fast.
2. **Form-first UX everywhere.** Dashboard = project list + type-select + textarea. Intake steps are label/field stacks. Project pickers are text buttons. Almost nowhere does the user *see* their work — no thumbnails on project cards, no look previews as imagery, no format-pack contact sheets.
3. **No tests, no test runner.** No vitest in package.json, zero `*.test.*` files. Pure logic that was specced as unit-tested (site compiler, formats, plan generator, flow state machine) is unverified. Only a `scripts/app-shell-smoke.mjs` exists.
4. **Splash is improved but not what was specced.** Readiness-signal + 400ms hold landed (good), but it still renders full-bleed `fixed inset-0` cover art rather than the compact fixed-size brand card — so the "fills the whole screen too aggressively" complaint is only half-resolved, and `appReady` is just a `requestAnimationFrame`, not real store hydration.
5. **localStorage as primary database** (31 files touch it). Metadata-only mostly, but: no schema versioning/migration story, silent `slice(0, 200)` caps (generatedAssets) that drop history without telling the user, and quota/corruption failure modes are swallowed by bare `catch {}`.
6. **Monolith screens beyond Glam:** ShotRow 1,098 lines, MvDirector 1,014, TimelineView 925, DirectorWizard 820 — the biggest maintenance risks in the codebase are all screens you'll iterate on most.

## 4. UI/UX Improvement List (suite-wide)

Ordered by leverage; all preserve power via progressive disclosure (Director < Studio < Creator is already the model — use it, never delete controls).

1. **Visual Project Cards, everywhere.** One shared `ProjectCard` with a real thumbnail (last hero/frame/site screenshot from deliverables), module color-coding, progress state, resume affordance. Replaces every text list-button (Dashboard, Web sidebar, Glam projects, Campaign home). This is the single highest-leverage change in the app.
2. **The Reveal Moment.** Generation completions should be an event: dim UI, staged fade-in of results at large size, then settle into the grid. Build once in `GenerateStep`/LoopBoard; every module inherits delight.
3. **Kill the intake-form feel.** `IntakeFormStep` should render as a *conversation card*: one large question per screen-section, big type, inline examples as selectable chips, imagery where possible (product photo drop-zone as the hero of Glam intake, not a field among fields).
4. **Art-directed empty states.** Extend the started `creative-empty-state`: each module gets a cinematic still (you have splash-quality art direction already), one line of invitation, one primary action. An empty studio should feel like a dark soundstage, not a blank database.
5. **Choice = imagery.** `PickCardStep` cards need visuals: Looks rendered as actual style frames, video types as motion thumbnails (even static), section patterns as mini-wireframe SVGs, campaign routes as mood tiles. A pick step with text-only cards is a form in disguise.
6. **Dashboard → "Lot overview."** Reframe as a studio backlot: hero strip of your active production (big thumbnail + resume), then module doors (five studios as visual tiles), then recent work as a filmstrip. Move project *creation* fully into module Magic Flows.
7. **Status as pipeline, not badges.** Campaign's deliverable board should be a Pixar-style production board: columns, thumbnail cards, owner-module glyphs — not text rows with badges.
8. **Consistent headers.** Adopt one module-header pattern (icon-gradient chip + title + mode switch + one primary CTA — Web Studio's is closest) and apply to all views; several platform views (Bibles, Templates, Settings) each do their own thing.
9. **Motion & sound restraint pass:** 150–250ms ease transitions between views/steps (currently hard cuts), hover lift on cards, and nothing else. No confetti, no bounce — premium = restraint.
10. **Typography hierarchy:** screens are uniformly 12–14px dense; introduce display-size titles on hero surfaces (flow steps, reveals, empty states) to create the cinema feel the splash art promises.

**Comparative bar:** the target feel is Runway's dark confidence + Keynote's one-idea-per-screen flows + Spotify's imagery-first density + Resolve's "pro but organized" panels. The current feel is closer to a well-themed internal admin tool. The gap is imagery and staging, not color or components.

## 5. Code Improvement List

1. **Add vitest + first test wave** (flow state machine, `campaignExport`/formats, web site compiler, plan generator, deliverables/loopEngine stores). Wire into `npm run build` or a `check` script.
2. **Decompose the monoliths:** GlamStudio.tsx → `features/{intake,looks,hero,pack,export}/` per the original brief; then ShotRow, MvDirector, TimelineView, DirectorWizard (delete it entirely once `guidedFlowV2` is default — dead-flag cleanup).
3. **Storage layer hardening:** one `platform/lib/storage.ts` wrapper — namespaced keys, schema version + migration hook, quota-error surfacing (toast, not silent catch), explicit caps with UI messaging. Longer-term: move project data to Tauri fs via the existing Rust core; localStorage keeps only UI prefs.
4. **Formatting/readability:** WebStudio/Campaign are written as single-line mega-JSX (no Prettier applied). Add Prettier + format the repo; this is blocking readability of exactly the files that need the most iteration.
5. **De-duplicate mode UI:** `STUDIO_MODES` arrays and mode-picker buttons are re-declared per module; platform `studioMode.ts` exists — ship the shared `ModeSwitch` component and use it everywhere.
6. **Routing scale check:** the flat `view === "..."` switch in App.tsx is at 25 views and all modules load eagerly. Introduce `React.lazy` per module chunk (Vite will split automatically) — startup cost and memory will otherwise grow linearly with each studio.
7. **`guidedFlowV2` flag retirement plan** (flip default → remove flag → delete DirectorWizard + old MagicDirect paths) — two wizards in the bundle is drift waiting to happen.
8. **Naming consistency:** folders are `glam-studio`, `webstudio`, `campaign`, `motion-studio` — pick one convention (`glam`, `web`, `campaign`, `motion` or all `-studio`) before more code lands; also `docs/` now has spec + addendum + status docs that partially disagree — mark superseded sections.
9. **iframe preview hygiene (Web Studio):** `sandbox="allow-same-origin"` on AI-assembled `srcDoc` — since compiled HTML is template-controlled it's low risk today, but add `allow-scripts`-free guarantee to the compiler contract and keep user-pasted embeds (V1 forms) out of the sandbox until reviewed.
10. **Silent failure audit:** repo-wide pass over bare `catch {}` blocks — at minimum route to a debug log; storage and IPC failures currently vanish.

## 6. Module-by-Module Critique

- **Music Video Director** — The flagship; deep and coherent. Issues are structural (4 files >800 lines), the dual wizard (flag), and choreography/timeline density: TimelineView and ChoreographyView are the most "Resolve-like" candidates but currently read as tables; they'd benefit most from thumbnail strips and a true filmstrip metaphor. Grade: **A- product, C+ maintainability.**
- **Motion Studio** — Solid mid-size module with its own brain/direction libs; UI is form-leaning (14 input clusters) and its guided flow should adopt the shared engine fully. Needs storyboard *visuals* (frames, not descriptions). **B / B.**
- **Glam Studio** — Functionally the most complete new module: full flow → loop → format render → ZIP export, uses loopEngine/brandDna/deliverables properly. But: one 1,375-line file, no look imagery on pick cards, no pack contact-sheet moment, and the reveal is undersold. The module whose *promise* is luxury has the plainest presentation — highest UX-debt-to-promise ratio in the app. **B- product, D+ structure.**
- **Web Studio** — Correct architecture (patterns + compiler + srcDoc preview + static export, structured AI with a quality gate per the commits) but visibly minimal: text-list projects, one-line JSX, thin workbench, no pattern thumbnails, no Lighthouse verification recorded. It's a strong skeleton awaiting its body. **C+ product, B- architecture.**
- **Campaign Studio** — The orchestration spine works (plan → registry → seeded handoffs), which is the hard part. UI is a status list, not a production board; no calendar (accepted MVP cut); native social/email production is minimal. Thinnest module, but on the right foundation. **C product, B architecture.**
- **Song Studio / Choreography / Timeline** — Powerful, data-dense, admin-flavored. These are Studio/Creator-tier surfaces so density is acceptable, but each needs one visual anchor (waveform hero in Song — if present, make it bigger; thumbnails in timeline clips; formation diagrams in choreography).
- **Templates** — 624 lines, and templates are exactly the thing that must be *seen*; needs preview imagery per template more than any other platform view.
- **Dashboard / Bibles / Asset Library** — Competent utility screens; Dashboard is the wrong first impression (see UX #6). Asset Library should be a masonry visual grid with hover metadata, not rows. Character/World/Prop Bibles are decent but text-forward for what are inherently visual documents.
- **Splash / Welcome** — Direction is right (readiness signal, welcome-screen dedupe fix shows real debugging), but the compact-card spec from the addendum wasn't implemented and `appReady` is cosmetic (one rAF). Finish the job.

## 7. Bugs & Risks Noticed (not exhaustively verified — flagged from reading)

1. `StartupSplash`: `appReady` set by `requestAnimationFrame` ≈ always immediately true — dismissal is effectively timer-driven again; wire to store hydration as intended.
2. `generatedAssets` hard-caps at 200 with silent drop — users will "lose" assets with no explanation (metadata loss; files remain on disk, orphaned).
3. Storage: no version key on any localStorage namespace → any future type change silently corrupts or discards user data on parse.
4. Web preview iframe `allow-same-origin` + future user-provided embed HTML = XSS-adjacent; constrain now while it's cheap.
5. All modules eagerly imported in App.tsx → packaged startup time will degrade with every module added; also inflates the single JS chunk (packaging risk: slower cold start behind the splash you're trying to shorten).
6. `crypto.randomUUID` fallback exists in generatedAssets but likely not in every id-minting site — audit for consistency (Tauri WebView2 is fine, but browser-dev http contexts throw).
7. Two guided-flow implementations live simultaneously (flag) — divergence risk if MV features keep landing on the old path.
8. No tests + no CI means every one of the above regresses silently.

## 8. Priority Roadmap

- **P0 — Trust & foundation (1 week):** vitest + first tests; Prettier + format; storage wrapper w/ versioning + error surfacing; finish splash compact card + real readiness; lazy-load module chunks.
- **P1 — The Visual Layer (2–3 weeks, biggest product impact):** shared ProjectCard w/ thumbnails; PickCardStep imagery; Reveal moment in GenerateStep; art-directed empty states per module; Dashboard → studio-lot reframe; module header unification. (One shared "visual primitives" package, applied module by module: Glam → Dashboard → Web → Campaign → MV surfaces.)
- **P2 — Depth for the thin studios (3–4 weeks):** Glam decomposition + look imagery + pack contact sheet; Web pattern thumbnails + workbench body + Lighthouse gate; Campaign production board + calendar (V1 items from spec).
- **P3 — Consolidation:** guidedFlowV2 default + legacy deletion; MV monolith decomposition; Templates/Asset Library visual grids; folder-naming normalization.

## 9. Quick Wins (each ≤ a day)

1. Splash compact card (spec already written in the addendum §3).
2. Prettier across repo.
3. `React.lazy` the five module roots.
4. Toast on storage write failure instead of silent catch.
5. Shared ModeSwitch replacing per-module mode buttons.
6. Empty-state art pass using existing splash-grade artwork.
7. 200ms view-transition fade in App.tsx main region.
8. Delete-project confirm dialogs where missing; consistent danger styling.

## 10. High-Impact Redesign Opportunities

1. **Dashboard as Studio Backlot** (UX #6) — changes the first 10 seconds of every session.
2. **Glam "Campaign Reveal"** — the format-pack export preceded by a full-screen contact-sheet reveal; makes Glam's luxury promise tangible.
3. **Campaign Production Board** — Pixar-style board with thumbnail cards flowing across status columns; turns the orchestrator from admin tool into the "agency war room."
4. **Timeline filmstrip** — clip thumbnails + waveform lane in MV Timeline; the most Resolve-like upgrade available.
5. **Template & Asset galleries** — masonry visual grids with hover play/zoom.

---

## 11. Codex Handover Package

**Implementation priorities:** P0 then P1 above, in order. Do not start P2 module depth until the shared visual primitives exist — otherwise each module reinvents its own cards again.

**Files/folders to inspect first:** `src/app/App.tsx` · `src/platform/components/flow/*` · `src/platform/components/ui/*` (incl. `creative-empty-state.tsx`) · `src/platform/lib/{guidedFlow,loopEngine,deliverables,brandDna,seedContext,studioMode}.ts` · `src/platform/components/layout/{StartupSplash,Sidebar}.tsx` · `src/platform/features/dashboard/Dashboard.tsx` · `src/apps/glam-studio/GlamStudio.tsx` · `src/apps/webstudio/WebStudio.tsx` · `src/apps/campaign/CampaignStudio.tsx` · `src/styles/globals.css` · `docs/DIRECTOR-STUDIO-MODULES-SPEC.md` + `docs/GUIDED-FLOW-AND-SPLASH-ADDENDUM.md`.

**Components likely needing refactor:** GlamStudio (split per spec), DirectorWizard (retire), ShotRow/MvDirector/TimelineView (later, P3), per-module mode pickers (replace with shared ModeSwitch), all project list-buttons (replace with ProjectCard).

**New shared components to build (P1):** `platform/components/visual/`: `ProjectCard`, `ThumbnailCard`, `MediaGrid` (masonry), `Filmstrip`, `RevealStage` (used by GenerateStep), `ModuleHeader`, upgraded `CreativeEmptyState` (art + invitation + single CTA). Thumbnails sourced from the deliverables registry (add `thumbUrl` to `Deliverable` if absent).

**Code changes (P0):** add vitest + `npm run test`, tests for guidedFlow navigation, glam campaignExport, web compiler, campaign plan generator; Prettier config + one formatting commit (no logic changes, reviewed separately); `platform/lib/storage.ts` versioned wrapper adopted by deliverables/loopEngine/generatedAssets first; splash per addendum §3 (fixed ~420×260 brand card, contain-fit, store-hydration readiness signal, 4s fallback); `React.lazy` + `Suspense` per module root.

**Risks & constraints:** never break Music Video (it has no tests — manual smoke: song load → magic flow → direct → timeline → export before/after each PR); keep `local` router mode fully functional; no new heavy deps (no UI framework swaps — extend the existing cva/Tailwind kit); dark theme is primary; formatting commit must be isolated; do not change data shapes without a storage-version migration.

**Testing checklist per PR:** `tsc --noEmit` + `vite build` green · new/changed pure logic has a test · MV manual smoke · packaged `tauri build` smoke on Windows for anything touching splash, routing, or lazy-loading (verify: cold launch, splash timing, all five studios open, window at 800×600 and maximized).

**Acceptance criteria:**
1. Test runner in repo with ≥12 meaningful tests across the four specified logic areas; wired into a `check` script.
2. Splash: fixed-size brand card, no full-bleed crop at any window size, real readiness signal, <700ms perceived warm launch in packaged build.
3. Every project list in the app renders visual cards with thumbnails (or module-branded placeholder art), not text buttons.
4. PickCardStep supports and Glam/Web/Campaign flows provide card imagery; GenerateStep has the shared reveal treatment.
5. Each of the five studios has an art-directed empty state.
6. App.tsx modules lazy-loaded; initial chunk measurably smaller (record before/after).
7. Storage writes are versioned and failures surface to the user; asset-cap trimming warns instead of silently dropping.
8. No regression in MV manual smoke; typecheck/build/package all green.

**Copy-paste Codex prompt:**
> In the Director Studio repo, execute P0 + P1 of `docs/PRODUCT-CODE-UX-REVIEW-2026-07.md` §11 (Codex Handover Package). P0: add vitest with tests for guided-flow navigation, glam campaignExport, the Web Studio site compiler, and the campaign plan generator; add Prettier and apply it in one isolated formatting commit; create a versioned `platform/lib/storage.ts` wrapper with surfaced errors and adopt it in deliverables/loopEngine/generatedAssets; rework StartupSplash into a fixed ~420×260 centered brand card with a real store-hydration readiness signal per `docs/GUIDED-FLOW-AND-SPLASH-ADDENDUM.md` §3; lazy-load the five module roots in App.tsx. P1: build `platform/components/visual/` (ProjectCard, ThumbnailCard, MediaGrid, Filmstrip, RevealStage, ModuleHeader, CreativeEmptyState upgrade) and apply them to Dashboard, Glam, Web, and Campaign — visual thumbnail cards replace all text-button project lists, PickCardStep gains imagery support used by the three new modules' flows, GenerateStep gains the reveal treatment, and every studio gets an art-directed empty state. Constraints: do not alter Music Video behavior (manual smoke before/after), keep `local` router mode fully working, no new heavy dependencies, no data-shape changes without a storage version bump, keep `tsc --noEmit && vite build` green per commit, and verify the Windows `tauri build` for splash/lazy-loading changes.
