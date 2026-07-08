# Status — Director Studio / Music Video Director

> Living document: what shipped, known issues, next steps. Update at every
> phase boundary so any agent/session can resume cold.

Last updated: 2026-07-07

## Shipped (recent → older)

- **Music Video Guided Flow V2**: wrapped Magic Mode in a platform `GuidedFlowDefinition` at `src/apps/music-video/features/director/MusicVideoGuidedFlow.tsx`. The V2 flow reuses the shared `GuidedFlowShell`, delegates song analysis/cast/story/style setup to existing Music Video Director internals, hands the approved production to the existing `MagicDirect` local directing pipeline, adds StudioMode-gated creative/technical panels, and is now the default via `mf.guidedFlowV2` while Settings can opt back to the legacy wizard.
- **Guided Flow platform prep + splash refinement**: imported the Remaining Modules and Guided Flow addendum specs into `docs/DIRECTOR-STUDIO-MODULES-SPEC.md` and `docs/GUIDED-FLOW-AND-SPLASH-ADDENDUM.md`; added platform Guided Flow contracts/session storage in `src/platform/lib/guidedFlow.ts`; added shared flow shell/step primitives in `src/platform/components/flow/`; added `src/platform/lib/studioMode.ts` as the reusable StudioMode behavior map; added the off-by-default `mf.guidedFlowV2` migration flag; and replaced the startup splash's full-screen cropped image with a compact contained Director Studio loading card that dismisses on readiness with a short fallback.
- **Director Studio branding pass**: integrated the generated Director Studio Windows icon and splashscreen. The Tauri icon set was regenerated from `src/assets/director-studio-icon.png`; the old music-video-focused splash asset was replaced by `src/assets/director-studio-splash.png`; app shell, browser title, native window title, settings/about copy, welcome splash, and dashboard hero now use Director Studio as the broad product identity.
- **Motion Studio integration pass**: converted the thin Phase 4 shell into a functional second app/module under `src/apps/motion-studio/` using the existing Director Studio platform. Reused and adapted MotionStudio source domain concepts for production types, visual styles, creative direction, local project storage, storyboard generation, scene critique/improve, and version checkpoints. Discarded the standalone Electron shell, duplicate settings/store/provider stack, and duplicate UI kit. Motion Studio now supports New Motion Project, requested project type selection, business/product input, marketing brief, script, visual style selection, generated storyboard, motion style/scene plan, voice/audio plan, timeline/export placeholder, and StudioMode-gated Director/Studio/Creator controls.

- **Director Studio Phase 4**: platform proof completed with a thin `src/apps/motion-studio/MotionStudio.tsx` shell. It renders New Motion Project, Choose Project Type, Style / Creative Direction, Storyboard placeholder, and Export placeholder screens while consuming shared StudioMode, provider router, style system, project list, theme, and UI components. Music Video Director still renders through the existing Song Studio / MV Director flow. Boundary fixes included `platform/lib/appBindings` for app-owned production callbacks, `platform/lib/promptTools` for generic prompt-doctor utilities, and `platform/lib/songSections` for shared section vocabulary.
- **Director Studio Phase 3**: mechanical folder migration completed. Reusable
  systems now live under `src/platform/`; Music Video Director-specific systems
  now live under `src/apps/music-video/`. Imports compile through the `@/`
  alias with no behavior redesign. Verified with `npm run build`, `cargo test`,
  browser smoke of Song Studio / MV Director / Choreography / Timeline, Tauri
  MSI+NSIS packaging, release executable launch, NSIS install, and installed-app
  launch.
- **Director Studio Phase 2**: the three view monoliths extracted into
  focused modules, pure refactor — MvDirector.tsx 3,101→1,014 (+ shotHelpers,
  ChoreoPanel, ShotRow, SimpleTreatment, TreatmentView), SongStudio.tsx
  1,354→319 (+ SongView, VoiceLab, SectionEditor, SongMapCanvas),
  TimelineView.tsx 1,426→925 (+ ShotDetailPanel, RenderPanel, Animatic).
  Each split verified live (all three StudioMode tiers, song surface, render
  dialog, animatic, shot detail).
- **Director Studio Phase 0+1**: docs consolidated into living
  set (`ARCHITECTURE.md` / `DECISIONS.md` / `STATUS.md`, relics archived);
  unified **StudioMode** (Director/Studio/Creator) replacing MvViewMode +
  ChoreoViewMode, global switch in the Sidebar, old keys migrated.
- Asset IA fix: choreography output (pose/formation sheets) excluded from
  Props & Vehicles; Choreography tab + origin badges in Asset Library.
- Image optimization: template art + splash → JPEG (exe 147MB → ~16MB).
- Template gallery artwork (23 cards + 3 alternates) and 16:9 splash.
- Choreography redesign (7 phases): Energy Map, performer cards, preview
  strip, Formation Stage, moment cards, local Motion Preview, AI Director
  panel (local heuristic), HelpHints, guided/professional disclosure.
- UX refinement pass: casting-style Performers step, compact GenerationPanel,
  enlarged shot Tune modal with version compare, Magic Mode Render → Timeline
  render dialog.
- Magic Mode wizard (7 steps), Story Mode, local parsing engine
  (`scriptParser.ts`), Help Center (14 articles), broken-image recourse in
  AssetImage/AssetVideo.

## Installers

`src-tauri/target/release/bundle/` (NSIS + MSI) and
`dist-portable/…Portable_x64.zip`. Rebuild via `npm run tauri build -- --bundles
msi,nsis` after any release-worthy change. Not code-signed (SmartScreen warning
is expected and documented in Help).

Latest verified Director Studio artifacts:
- Release exe: `src-tauri/target/release/wheelbarrow-motionforge.exe`
- MSI: `src-tauri/target/release/bundle/msi/Director Studio_0.1.0_x64_en-US.msi`
- NSIS installer: `src-tauri/target/release/bundle/nsis/Director Studio_0.1.0_x64-setup.exe`

Latest Director Studio branding verification:
- Backup: `C:\Users\eduni\Documents\Wheelbarrow MotionForge AI-backup-branding-20260707-185143`
- Icon generation: `npm run tauri icon -- src\assets\director-studio-icon.png` regenerated `src-tauri/icons/*`, including Windows ICO and installer/logo PNGs.
- Typecheck/build: `npx tsc --noEmit` and `npm run build` passed.
- Browser QA: startup splash appeared immediately with `Director Studio` alt text, faded out cleanly, shell title/copy used Director Studio, Music Video Director and Motion Studio both rendered, and browser console had no errors.
- Windows package: `npm run tauri build -- --bundles msi,nsis` passed; release executable smoke launch passed with window title `Director Studio`; NSIS setup has an associated icon resource; MSI ProductName is `Director Studio`.


Latest Music Video Guided Flow V2 verification:
- Backup: `C:\Users\eduni\Documents\Wheelbarrow MotionForge AI-backup-guided-flow-v2-20260707-205217`
- Safe default proof: `npx tsc --noEmit`, `npm run build`, and `npm run tauri build -- --bundles msi,nsis` passed while `mf.guidedFlowV2` still defaulted off.
- Final default-on proof: `npx tsc --noEmit`, `npm run build`, and `npm run tauri build -- --bundles msi,nsis` passed after flipping the default on.
- Windows launch: release executable smoke launch passed with window title `Director Studio`.
- StudioMode coverage: V2 uses `GuidedFlowShell` mode gating, with Director primary guided steps, Studio creative controls, and Creator technical prompt/flow panels compiled through typecheck/build. Browser interaction against `http://127.0.0.1:1420/` remains blocked by the in-app browser URL policy, so live click-through tier QA was not performed in this pass.

Latest Guided Flow / splash verification:
- Backup: `C:\Users\eduni\Documents\Wheelbarrow MotionForge AI-backup-guided-flow-20260707-203120`
- Specs added: `docs/DIRECTOR-STUDIO-MODULES-SPEC.md`, `docs/GUIDED-FLOW-AND-SPLASH-ADDENDUM.md`
- `mf.guidedFlowV2` remains off by default; Music Video Director still uses the existing Magic/Director flows until the wrapper migration is built and verified.
- Typecheck/build: `npx tsc --noEmit` and `npm run build` passed.
- Windows package: `npm run tauri build -- --bundles msi,nsis` passed; release exe smoke launch passed with window title `Director Studio`.
- Browser QA: in-app browser reload was blocked by its URL policy for `http://127.0.0.1:1420/`, so no browser-surface interaction was performed in this pass.

Latest Motion Studio integration verification:
- Backup: `C:\Users\eduni\Documents\Wheelbarrow MotionForge AI-backup-phase-motionstudio-20260707-182249`
- Typecheck/build: `npm run build` passed.
- Browser QA: Music Video Director rendered after reload; Motion Studio opened from the sidebar; a sample SaaS Explainer project generated a storyboard, scene plan, timeline/export placeholder, loop engine, Creator controls, and Improve/Approve updates.
- Windows package: `npm run tauri build -- --bundles msi,nsis` passed; release executable smoke launch passed.

## Known issues / gray areas

- Remaining platform-to-Music-Video imports are legacy extension points, mostly dashboard/search/assets/validation/demo helpers. They do not block Motion Studio, but should move behind app registries before more apps depend on those surfaces.
- Motion Studio uses a local deterministic storyboard/loop engine and project memory. Real image/video/voice generation is intentionally routed through existing platform settings/provider concepts next, rather than importing the source app's standalone provider code.
- `platform/features/projects/` (motion-graphics workspace) predates the music-video
  spine; overlaps with newer surfaces. Candidate for consolidation or archive.
- `platform/lib/localEngine.ts` tone heuristics are B2B-flavored; unused by the
  music spine. Decide fate during Phase 4 platform proof or a legacy workspace
  consolidation pass.
- Naming: code package name remains `wheelbarrow-motionforge` for continuity, while user-facing shell identity is now Director Studio. Music Video Director remains a module label.
- Preview screenshots of the Choreography page time out (continuous rAF in
  Motion Preview); verify that page via DOM checks instead.

## Roadmap

- **Next** - wrap the existing Music Video Magic/Director flow in a `GuidedFlowDefinition` behind `mf.guidedFlowV2`, QA it in all StudioMode tiers, then flip the flag only after packaged Windows verification.
- After Guided Flow V2 is verified, start Glam Studio using the platform flow shell/primitives rather than a module-local wizard.
- Continuous: branding pass once named; QA + installer rebuild per phase.
