# Status — Director Studio / Music Video Director

> Living document: what shipped, known issues, next steps. Update at every
> phase boundary so any agent/session can resume cold.

Last updated: 2026-07-07

## Shipped (recent → older)

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

## Known issues / gray areas

- `features/projects/` (motion-graphics workspace) predates the music-video
  spine; overlaps with newer surfaces. Candidate for consolidation or archive.
- `lib/localEngine.ts` tone heuristics are B2B-flavored; unused by the music
  spine. Decide fate during Phase 3 extraction.
- Naming: package "wheelbarrow-motionforge", sidebar "AI Director", splash
  "Music Video Director". Branding pass pending a product-name decision.
- Preview screenshots of the Choreography page time out (continuous rAF in
  Motion Preview); verify that page via DOM checks instead.

## Roadmap

- **Phase 3** — mechanical folder migration per the ARCHITECTURE.md boundary
  map (`src/platform/` + `src/apps/music-video/`), one commit, no logic edits.
- **Phase 4** — platform proof: second thin app shell (e.g. Motion Studio
  skeleton) consuming only platform modules; fix whatever coupling appears.
- Continuous: branding pass once named; QA + installer rebuild per phase.
