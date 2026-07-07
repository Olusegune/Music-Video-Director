# Status — Director Studio / Music Video Director

> Living document: what shipped, known issues, next steps. Update at every
> phase boundary so any agent/session can resume cold.

Last updated: 2026-07-07

## Shipped (recent → older)

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

Latest verified Phase 4 artifacts:
- Release exe: `src-tauri/target/release/wheelbarrow-motionforge.exe`
- MSI: `src-tauri/target/release/bundle/msi/Wheelbarrow MotionForge_0.1.0_x64_en-US.msi`
- NSIS installer: `src-tauri/target/release/bundle/nsis/Wheelbarrow MotionForge_0.1.0_x64-setup.exe`

## Known issues / gray areas

- Remaining platform-to-Music-Video imports are legacy extension points, mostly dashboard/search/assets/validation/demo helpers. They do not block the thin Motion Studio shell, but should move behind app registries before Motion Studio becomes a real product surface.
- `platform/features/projects/` (motion-graphics workspace) predates the music-video
  spine; overlaps with newer surfaces. Candidate for consolidation or archive.
- `platform/lib/localEngine.ts` tone heuristics are B2B-flavored; unused by the
  music spine. Decide fate during Phase 4 platform proof or a legacy workspace
  consolidation pass.
- Naming: package "wheelbarrow-motionforge", sidebar "AI Director", splash
  "Music Video Director". Branding pass pending a product-name decision.
- Preview screenshots of the Choreography page time out (continuous rAF in
  Motion Preview); verify that page via DOM checks instead.

## Roadmap

- **Next** - continue platform proof hardening: move dashboard/search/assets app-specific data reads behind registries, then decide whether the old `platform/features/projects/` workspace becomes the real Motion Studio base or an archived legacy workspace.
- Continuous: branding pass once named; QA + installer rebuild per phase.
