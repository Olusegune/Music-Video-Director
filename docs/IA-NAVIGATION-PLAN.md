# Director Studio — Information Architecture & Navigation Plan

Prepared 2026-07-08 against `main` @ `8d69267`. Planning only — no code changes made.
Companion to `docs/PRODUCT-CODE-UX-REVIEW-2026-07.md` (this plan implements a structural piece of its P1 "each studio feels like its own app" goal).

---

## 1. Information Architecture Critique

**Verified in code:** navigation is store-driven, not URL-driven. `useAppStore.ts` holds a flat `View` union of 26 values and one `open<X>()` action per view; `Sidebar.tsx` (422 lines) renders them as flat labeled sections; `App.tsx` switches on `view`. There is no router library and no URLs — so "routes" in this plan = view states, and "deep links" = the `setView`/`open*` call sites found in 15 files (GlobalSearch, HelpCenter, WelcomeScreen, OnboardingChecklist, Dashboard, AssetLibrary, TemplatesView, useGlobalShortcuts, and MV's own screens).

What's wrong, in order of severity:

1. **The app boots into a sub-feature.** The store's default view is `"song"` — Song Studio, a Music Video sub-tool, is the front door of a five-studio platform. First impression: "this is a music-video app with a lot of menus."
2. **One flat namespace mixes three altitudes.** Studios (Music Video, Glam…), MV sub-features (Song Studio, Cast, Choreography, Timeline), and platform utilities (Bibles, API Keys) all sit at the same visual level in one sidebar. The user's screenshot circles it precisely: MV's internal workflow is masquerading as global IA. Answer to the question asked: **yes — Song Studio, MV Director, Cast, Choreography, and Timeline are all Music Video Director workflow stages** (they operate on the active song/production, and their code lives in `src/apps/music-video/`). They should not exist in global navigation.
3. **No concept of "inside a studio."** Nothing in the shell tracks which _module_ you're in; every view change is a lateral teleport. That's why the app feels like a dashboard: there is no sense of entering and leaving a place.
4. **Minor mislabels:** "Templates" is currently global but is production-scoped in behavior; "MV Director" as a label is jargon; the "New production" button is MV-centric in a multi-studio shell.

The good news: because navigation is one enum + one switch, this is a **presentation-layer refactor**. The `View` union, all `open*` actions, and every existing call site can remain valid — we add a module layer _above_ them rather than renaming anything.

## 2. Recommended Final Navigation Model

Adopt the user's proposed structure, with three refinements (noted ⭑). Model: **global sidebar of destinations + contextual expansion of the active studio** — the sidebar shows studios as doors; entering a studio expands its workflow _in place_ (indented, under the studio name) and highlights the studio as "you are here." Utilities stay compact below.

```
DIRECTOR STUDIO (studios)
  ▸ Music Video Director        ← expands when active:
      Song Studio
      Direct          (rename of "MV Director" ⭑)
      Cast
      Choreography
      Timeline
  ▸ Motion Studio
  ▸ Glam Studio
  ▸ Web Studio
  ▸ Campaign Studio

PRODUCTION LIBRARY
  Character Bible · World Bible · Props & Vehicles · Asset Library · Brand Kits

TOOLS
  Dashboard ⭑ · Templates ⭑ · Script Studio · Animation Lab · Export Center

SYSTEM
  API Keys · AI Models · Settings
```

Behavior rules:

- **Clicking a studio enters its home** (its landing/workbench view) and expands its sub-nav; the previously active studio's group collapses. Exactly one studio group is ever expanded. Non-MV studios have no sub-items yet — their group is just the door (sub-nav slots exist for when Glam/Web/Campaign grow real sub-surfaces).
- **App boots to Dashboard** (studio-backlot framing per the UX review), not Song Studio. ⭑ Dashboard moves under Tools per the user's structure, but also remains the boot view and the brand-block click target.
- **Sub-views are only reachable inside their studio.** Outside MV, the five MV items don't render. GlobalSearch/Help/Onboarding may still navigate to them directly — doing so auto-enters MV (expands the group, sets active module). Deep links therefore keep working by construction.
- **Templates moves from the studio strip into Tools** ⭑ (it's a cross-studio utility, not a studio).
- **"New production" button becomes module-aware:** in a studio context it starts that studio's Magic Flow; at Dashboard/Tools level it opens a "pick a studio" chooser. (Ship the chooser minimal — five tiles.)
- The StudioMode (Director/Studio/Creator) pill stays where it is in the sidebar header — it's platform-level, orthogonal to navigation.
- Visual: studio entries get their module icon + color accent; sub-items are indented, smaller, with a thin rail line — the "workspace within" reading. No second sidebar, no top-tab bar (a second chrome layer would fight the Inspector and cost horizontal space at 800×600).

## 3. Route Structure Recommendation

Keep the `View` union and state-based routing — do **not** introduce a URL router for this. Add a thin module layer above it in `src/platform/lib/navModel.ts`:

- `type ModuleId = "musicvideo" | "motion" | "glam" | "web" | "campaign" | null` (null = platform-level views).
- `const VIEW_MODULE: Record<View, ModuleId>` — single source of truth mapping every existing view to its owner (`song/mvdirector/magicoutput/cast/choreography/timeline → "musicvideo"`, `motionstudio → "motion"`, etc.; bibles/tools/system → `null`).
- `const NAV_MODEL` — the §2 tree as data (sections → items → optional subItems), consumed by Sidebar so the sidebar becomes a dumb renderer.
- Derived, not stored: `activeModule = VIEW_MODULE[view]`. **No new persisted state**, no store shape change — this is what makes the migration safe. (Optionally add `lastViewByModule: Partial<Record<ModuleId, View>>` in the store so re-entering MV returns to where you left off; nice-to-have, in-memory only.)
- `magicoutput` stays a hidden view (reachable, never listed) — precedent for future non-nav views.

Explicit non-goals: no renaming of View values, no removal of `open*` actions, no URL scheme, no per-module routers.

## 4. Component/File Inspection List for Codex

| File                                                                                                                                                         | Why                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `src/platform/store/useAppStore.ts` (265 ln)                                                                                                                 | `View` union, `open*` actions, **default view `"song"` → change to `"dashboard"`**                              |
| `src/platform/components/layout/Sidebar.tsx` (422 ln)                                                                                                        | The refactor target — becomes a renderer of `NAV_MODEL`                                                         |
| `src/app/App.tsx`                                                                                                                                            | View switch (unchanged), confirm splash/welcome/wizard overlays unaffected by new default view                  |
| `src/platform/lib/navModel.ts`                                                                                                                               | **New** — ModuleId, VIEW_MODULE, NAV_MODEL                                                                      |
| `src/platform/features/search/GlobalSearch.tsx`                                                                                                              | Navigates to MV sub-views; verify auto-enter behavior + result labels gain module prefix ("Music Video · Cast") |
| `src/platform/lib/useGlobalShortcuts.ts`                                                                                                                     | Keyboard shortcuts jump straight to views; must still work (auto-enter)                                         |
| `src/platform/features/welcome/WelcomeScreen.tsx`, `src/apps/music-video/features/onboarding/OnboardingChecklist.tsx`                                        | First-run flows that deep-link into MV views                                                                    |
| `src/platform/features/dashboard/Dashboard.tsx`                                                                                                              | Becomes boot view; its "open" actions should enter studios properly                                             |
| `src/platform/features/help/HelpCenter.tsx`, `src/platform/features/assets/AssetLibrary.tsx`, `src/platform/features/templates/TemplatesView.tsx`            | Remaining `open*` call sites — verify each after regrouping                                                     |
| `src/apps/music-video/features/{song/SongStudio,mvdirector/MvDirector,timeline/TimelineView,choreography/ChoreographyView,mvdirector/MagicOutputScreen}.tsx` | Cross-navigate among themselves — unaffected in principle; smoke-test                                           |
| `src/platform/features/projects/NewProjectWizard.tsx` + `setWizardOpen` call sites                                                                           | "New production" module-awareness                                                                               |

## 5. State Management Risks

1. **Default-view change is the only store behavior change** (`view: "song"` → `"dashboard"`). Risk: anything implicitly assuming Song Studio at boot — MV onboarding checklist, WelcomeScreen sequencing, the `SessionGuard` recovery flow. Each must be checked against a dashboard boot.
2. **Do not persist `activeModule`.** Derive it from `view` (VIEW_MODULE). Persisting a second nav variable creates split-brain states (view says Glam, module says MV). This is the single most important implementation constraint.
3. `useAppStore` is consumed via broad destructuring in Sidebar (subscribes to everything) — while refactoring, switch to selector-based subscriptions to avoid re-render regressions, but don't change store API.
4. The `dataVersion` remount key on `<main>` (undo/redo) must keep working — nav refactor touches only the sidebar, not the main switch; keep it that way.
5. `guidedFlowV2` overlays (`MusicVideoGuidedFlow`/`DirectorWizard`) are global overlays opened from anywhere; they set MV views on completion — auto-enter covers this, verify.

## 6. Migration Risks

- **No data migration required** (no persisted shape changes) — the plan is deliberately designed so localStorage/Tauri data is untouched.
- **Muscle-memory break:** users who navigate to Cast/Timeline from anywhere now visually find them only inside MV. Mitigation: GlobalSearch still surfaces them (with module-prefixed labels), and shortcuts still work.
- **Discoverability regression for new users:** five MV features become invisible until MV is entered. Mitigation: MV group is expanded by default whenever an MV production is active; Dashboard's MV tile hints "5 tools inside."
- **Windows packaged build:** sidebar renders at 800×600 — expanded MV group (5 sub-items) + all sections must not overflow; the sidebar already scrolls, verify it still does.
- **Sequencing with the P0/P1 visual work order** (review §11): this IA change touches `Sidebar.tsx` and `Dashboard.tsx`, which P1 also touches. Do IA **before** the Dashboard-backlot redesign (backlot assumes studios-as-doors), and after P0 (lazy-loading also edits App.tsx — trivial merge either way, just don't run them concurrently).

## 7. Acceptance Criteria

1. Global sidebar shows exactly the §2 structure; Song Studio/Direct/Cast/Choreography/Timeline appear only when Music Video Director is the active module.
2. Exactly one studio group expanded at a time; active studio and active sub-view are both visually indicated.
3. App boots to Dashboard; no flash of Song Studio.
4. Every pre-existing navigation path still works: GlobalSearch results, Ctrl-K, keyboard shortcuts, HelpCenter links, onboarding checklist, welcome flow, MV cross-view jumps, template/asset "open" actions — navigating to an MV sub-view from outside auto-enters MV.
5. No changes to the `View` union values, `open*` action signatures, or any persisted data; `activeModule` is derived, never stored.
6. All five studios open, MV full workflow unchanged (song → direct → cast → choreography → timeline → export).
7. Sidebar usable at 800×600 and maximized in the Windows packaged build; sections scroll if needed.
8. `tsc --noEmit && vite build` green; existing tests (if present by then) pass; navModel gets unit tests (VIEW_MODULE covers every View member — enforce with an exhaustiveness type test).

## 8. Testing Checklist

- [ ] Boot → Dashboard (fresh profile and existing profile).
- [ ] Click each of the 5 studios → correct home view, group expands, previous collapses.
- [ ] Inside MV: click all 5 sub-items; verify each view renders and sidebar highlights follow.
- [ ] From Glam Studio, Ctrl-K search "Cast" → navigates + MV group auto-expands.
- [ ] Each keyboard shortcut in `useGlobalShortcuts.ts` from a non-MV context.
- [ ] Welcome flow on fresh profile → lands correctly; onboarding checklist links all work.
- [ ] "New production": from MV context, from Dashboard (chooser), from each other studio.
- [ ] Undo/redo after navigating (dataVersion remount intact).
- [ ] Magic Flow (guidedFlowV2 on and off) completes and lands on the right MV view with correct sidebar state.
- [ ] MV end-to-end manual smoke (the standing non-negotiable).
- [ ] Packaged `tauri build`: 800×600 + maximized sidebar layout; theme toggle; light mode.
- [ ] `npm run build` + navModel exhaustiveness test.

## 9. Codex Handover Prompt

> In the Director Studio repo, implement the navigation/IA restructure per `docs/IA-NAVIGATION-PLAN.md` (read it fully first).
>
> **Step 1 — nav model.** Create `src/platform/lib/navModel.ts`: `ModuleId`, a `VIEW_MODULE: Record<View, ModuleId>` covering every member of the `View` union in `useAppStore.ts` (exhaustive — add a compile-time exhaustiveness check), and a `NAV_MODEL` data tree matching §2 of the plan: Director Studio (5 studios; Music Video Director has subItems song/mvdirector→"Direct"/cast/choreography/timeline), Production Library (characters, world, props, assets, brandkits), Tools (dashboard, templates, scripts, animation, export), System (apikeys, models, settings). `magicoutput` maps to musicvideo but is not listed. Add vitest coverage.
> **Step 2 — sidebar.** Refactor `src/platform/components/layout/Sidebar.tsx` to render from `NAV_MODEL`. Active module = `VIEW_MODULE[view]` (derived — never stored). Studio rows are doors; the active studio's group expands in place with indented sub-items and a rail line; exactly one group expanded. Keep brand block, New production, Search, StudioMode pill, projects list, and footer as-is. Use selector-based store subscriptions. Keep it usable at 800×600 (scrollable sections).
> **Step 3 — boot view.** Change the store default `view` from `"song"` to `"dashboard"`. Then verify/fix every flow that assumed the old default: WelcomeScreen, OnboardingChecklist, SessionGuard, splash dismissal.
> **Step 4 — call-site sweep.** Audit all `open*`/`setView` call sites (GlobalSearch, useGlobalShortcuts, HelpCenter, Dashboard, AssetLibrary, TemplatesView, WelcomeScreen, onboarding, MV screens). Navigating to an MV sub-view from anywhere must auto-enter MV (which it does by derivation — just verify highlighting). Prefix GlobalSearch result labels for module-owned views ("Music Video · Cast"). Make "New production" module-aware: inside a studio it starts that studio's flow; elsewhere it opens a minimal 5-tile studio chooser before the existing wizard.
>
> **Hard constraints:** do NOT rename or remove any `View` value or store action; do NOT persist active module or add nav state to storage; do NOT touch the App.tsx main view switch beyond what Step 3 requires; no data migrations; no new dependencies; no URL router. Music Video Director behavior must be unchanged — run the manual smoke (song load → direct → cast → choreography → timeline → export) before and after. Keep `tsc --noEmit && vite build` green per step; run the plan §8 testing checklist, including the Windows `tauri build` sidebar check at 800×600, and report results.
