# Decision Log — Director Studio

> Append-only. Each entry: what changed, why it is better, risks, benefits,
> future impact. Newest first.

## D7 - 2026-07-07 - Magic Mode becomes platform Guided Flow, but migration stays flagged

**What:** Added the platform Guided Flow foundation in `src/platform/lib/guidedFlow.ts` and `src/platform/components/flow/`. Flow definitions now have reusable step contracts, local draft/session persistence, validation gates, and a shared shell that respects the global Director/Studio/Creator mode. Added `src/platform/lib/studioMode.ts` as the cross-module behavior map and `mf.guidedFlowV2` as an off-by-default migration flag. The startup splash was also changed from a full-screen cropped image to a compact contained Director Studio loading card with shorter readiness-driven dismissal.

**Why better:** The remaining Director Studio apps can now use one guided creation engine instead of each building its own wizard, and StudioMode stays additive: Director is guided, Studio adds creative controls, Creator adds technical controls. Risk: Music Video Director is not yet running through the new flow shell; keeping `mf.guidedFlowV2` off avoids breaking the shipped Magic/Director path while the wrapper is implemented and packaged-verified next.

## D6 - 2026-07-07 - Motion Studio source is integrated as a module, not an app fork

**What:** Ported the useful MotionStudio source concepts into `src/apps/motion-studio/`: production types, visual style selection, creative direction, local motion-project storage, storyboard generation, scene critique/improve, scene approval, loop log, and version checkpoints. The standalone Electron entrypoint, source Zustand store, duplicate settings/provider router, duplicate UI kit, and package/build files were intentionally left behind.

**Why better:** Motion Studio now proves platform reuse with real workflow behavior, not only placeholder screens, while Director Studio still owns the shell, theme, StudioMode, settings, provider-router preferences, shared UI, assets, and project/platform navigation. Risk: Motion Studio generation is still deterministic/local and export is still a placeholder; real render/provider execution should be added through platform generation and asset APIs next, not by reviving the source app's separate provider layer.

## D5 - 2026-07-07 - Motion Studio proves the platform can host a second app

**What:** Added a thin `src/apps/motion-studio/MotionStudio.tsx` shell and a sidebar app switch. The skeleton consumes platform routing state, StudioMode, provider router state, project listing, style system, theme, and shared UI components without importing Music Video Director modules.

**Why better:** Director Studio now has a concrete second app surface, so platform reuse is no longer theoretical. The proof exposed real residual coupling: several platform dashboards/search/assets/validation helpers still read Music Video data directly. Phase 4 fixed the store-level coupling with `platform/lib/appBindings`, moved generic prompt tools into `platform/lib/promptTools`, and extracted shared section labels into `platform/lib/songSections`. Future impact: remaining app-specific reads should move behind registries before Motion Studio grows beyond a skeleton.

## D4 - 2026-07-07 - Phase 3 folder split completed mechanically

**What:** The documented boundary is now physical: shared systems moved under
`src/platform/`, and Music Video Director systems moved under
`src/apps/music-video/`. Imports were rewritten mechanically through the `@/`
alias. The gray-area legacy project workspace stayed on the platform side until
a later consolidation decision.

**Why better:** Future Director Studio apps now have a concrete reusable
platform to consume, while the music-video app code is easier to isolate. Risk:
some platform modules still legitimately know about music-video types where the
old product spine crosses the reusable layer; this is acceptable for Phase 3
because behavior was preserved and Phase 4 will expose the remaining coupling.
Verification: frontend build, Rust tests, browser smoke, release executable
launch, NSIS install, and installed-app launch all passed.

## D3 — 2026-07-07 · Docs become living, not archival

**What:** Nine root/spec-era markdown files and the June 17 handoff set moved to
`docs/archive/`. `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/STATUS.md`
are now the living set, updated as part of each phase's definition of done.

**Why better:** The handoff docs predated Magic Mode, the parsing engine, the
choreography redesign, and the asset-IA fix — an agent resuming from them would
rebuild shipped features. Risk: none (archived, not deleted). Future impact:
"the project never depends on one AI session" becomes enforceable.

## D2 — 2026-07-07 · Platform/app separation by convention first, folders second

**What:** The platform ↔ app boundary is documented as a table in
`ARCHITECTURE.md` and enforced in new code. The physical move to
`src/platform/` + `src/apps/music-video/` is deferred to Phase 3, as one
mechanical commit with no logic edits.

**Why better:** Moving ~40 files while behavior is also changing multiplies
regression risk for zero user value; the `@/` alias makes the later move cheap.
Risk: convention can drift — mitigated by the boundary map being part of review.
Future impact: Phase 4 (second app shell) consumes only the platform column.

## D1 — 2026-07-07 · One mode system: Director / Studio / Creator

**What:** A single platform-level `StudioMode` (`director` | `studio` |
`creator`) replaces the fragmented per-surface tiers (`MvViewMode`
simple/director/expert, `ChoreoViewMode` guided/professional). Stored once
(`mf.studioMode`), owned by `useAppStore`, switched globally in the Sidebar.
Old keys are migrated on first read (expert→creator; director/professional→
studio; simple/guided→director) and never lost.

Surface mapping:
- **Director** — guided, visual, no AI terminology (MV Director "simple" cards,
  Choreography guided view, Magic Mode as the creation flow).
- **Studio** — full professional creative controls (MV Director "director"
  view, Choreography professional view).
- **Creator** — the complete engine: prompt/model/provider panels default-open
  (MV Director "expert" behavior), routing and debug surfaces visible.

**Why better:** One mental model instead of three vocabularies; matches the
Director Studio spec exactly; future apps inherit the same three modes for
free. Risks: per-surface preferences are lost in favor of one global mode
(accepted — simpler is the point); mapping choices for 2-tier surfaces are a
judgment call (choreography professional == studio+creator). Mode changes are
presentation-only, so switching can never lose work.

**Future impact:** every new surface declares how it renders in the three
modes; no new mode flags may be added.
