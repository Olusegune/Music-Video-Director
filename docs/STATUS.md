# Status — Director Studio / Music Video Director

> Living document: what shipped, known issues, next steps. Update at every
> phase boundary so any agent/session can resume cold.

Last updated: 2026-07-07

## Shipped (recent → older)

- **Campaign Studio MVP orchestration**: added a first-class `src/apps/campaign/` module and app-shell route. Its seven-step Magic Flow covers Product, Goal/date, Audience, Campaign Idea, effort-scaled Assets, Timeline, and Launch Kit. The smallest deterministic plan produces eight deliverables across Glam, Web, Motion, Social, and Email; native social/email copy updates registry status, while specialist work hands off through the platform-only `SeedContext` contract. Glam and Web consume those seeds, prefill their Guided Flows, reuse Campaign Brand DNA/messaging, and link completed specialist projects back to the source deliverable. Launch-kit ZIP export includes a real strategy PDF, campaign-plan Markdown, deliverables CSV, registry JSON, native copy, and pending-production prompts.
- **Campaign export regression check**: added `npm run test:campaign-export`; its fixture verifies the eight-deliverable/five-channel minimum, PDF signature, CSV row count, and real ZIP signature. Current result: 8 deliverables, 5 channels, valid 1,622-byte PDF and 4,074-byte package ZIP.
- **Campaign Studio intelligence + planning hardening**: Campaign Idea and native social/email production now use native-side Gemini structured text when routed and configured, with strict Campaign-specific strategy/concept/copy schema validation and deterministic local fallback. Studio/Creator users can add, rename, reschedule, and remove plan items while keeping the deliverable registry synchronized. `SeedContext` construction is now pure and covered by the campaign regression fixture alongside AI-schema parsing; the fixture confirms source deliverable, Campaign DNA messaging, and target handoff data survive propagation.
- **Web Studio MVP foundation**: added a first-class `src/apps/webstudio/` module and app-shell route. Its platform Guided Flow covers Business, Offer positioning approval, Audience/proof/CTA, single-page section stack, design-token Style, structured Copy, and Build. The workbench previews the same deterministic compiler at desktop/tablet/mobile widths, exposes section copy/pattern/media controls in Studio+, exposes tokens in Creator, consumes Production Library imagery, registers a static-site deliverable, and exports a zero-runtime HTML/CSS ZIP with bundled local assets, site spec, and local-mode media prompts. The curated registry ships 12 patterns across hero, proof, trust, and conversion families.
- **Web Studio intelligence + acceptance hardening**: added a generic Rust-side Gemini structured-text command so provider keys remain in the OS keychain. Offer positioning and per-section copy are accepted only after strict frontend schema validation, with deterministic local fallbacks when the router is local or no supported provider is configured. Static exports now enforce a ≥90 deterministic quality gate covering metadata, semantic headings/landmarks, alt text, responsive CSS, reduced motion, and zero JavaScript/external runtime dependencies; the report ships inside every site ZIP.
- **Web Studio editing + export smoke pass**: Studio/Creator workbenches now edit positioning, reorder sections, duplicate or remove sections, and safely delete projects together with their deliverable records. Added `npm run test:web-export`, which bundles a real fixture through the production compiler and validates the quality score, semantic HTML, responsive/reduced-motion CSS, ZIP signature, and required archive entries. Current fixture result: quality 100 with valid HTML/CSS/quality-report archive entries.
- **Glam Studio guided skeleton**: added `src/apps/glam-studio/GlamStudio.tsx` as the first Remaining Modules app after Motion Studio. It uses the platform `GuidedFlowShell`, global StudioMode, shared UI/theme, provider-router settings display, new platform Brand DNA registry, deliverable registry, and loop engine. The flow covers product intake, product type, Brand DNA, luxury look, campaign concept, format pack, and export approval, then saves a local Glam project with planned deliverables.
- **Glam Studio MVP hardening**: product intake now captures structured materials, colors, packaging, claims, must-preserve fidelity notes, and real image-reference data. Saved Glam projects can generate provider-routed hero images, retain variants in the shared generated-asset registry, surface them in the Production Library, advance deliverables from planned to draft/approved, and export complete local-mode prompt packs as Markdown or JSON.
- **Glam Studio format-pack export**: approved heroes now render into the selected exact-size 1080x1080, 1080x1350, 1080x1920, and 1920x1080 PNG formats. Headlines, brand names, and product names are composited as real typography via `html-to-image`, never model-painted. A dependency-free ZIP writer bundles the rendered assets with JSON and Markdown production packs in one campaign download.
- **Glam Studio reusable direction + layout polish**: generated hero variants are now selectable, and the chosen hero—not merely the newest—drives approval and campaign export. Users can save Looks and Concepts into local reusable libraries that appear in future Magic Flows. Every selected format persists independent left/center/right crop focus and four-corner headline placement, and those choices compile into the exact-size PNG/ZIP output.
- **Glam Studio MVP acceptance pass**: the curated Look gallery now meets the eight-look MVP target. Image-provider metadata records real reference-image support, and Glam prefers those adapters when product photos exist; unsupported fallbacks are honestly labeled Look-alike mode. The format matrix now includes live crop/type previews and individual exact-size PNG downloads alongside the campaign ZIP and prompt packs.
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

Latest Glam Studio verification:

- Backup: `C:\Users\eduni\Documents\Wheelbarrow MotionForge AI-backup-glam-studio-20260707-210941`
- Platform prep added: `src/platform/lib/brandDna.ts`, `src/platform/lib/deliverables.ts`, `src/platform/lib/loopEngine.ts`.
- Typecheck/build: `npx tsc --noEmit` and `npm run build` passed.
- Windows package: `npm run tauri build -- --bundles msi,nsis` passed; release executable smoke launch passed with window title `Director Studio`.

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

- **Visual design & UX enhancement pass** - added a shared module-aware visual language with restrained studio identities (cinematic violet, motion cyan, editorial gold, web emerald, campaign magenta), communicative preview cards, refined selection/summary cards, page-entry motion with reduced-motion compliance, richer creative empty states, semantic gold creation/generation actions, and a five-module creative dashboard. Live QA covered Home, Motion, and Glam at 1280×720 with no horizontal overflow.
- **Commercial identity refinement** - the user-supplied Afrofuturistic creator artwork is the optimized launch/welcome identity (`director-studio-splash-afrofuturist-v1.jpg`). Global Magic Mode entry points were removed from the suite shell and Director's Home; Music Video Director retains its own Magic Mode while Start with Director remains the platform router. Browser QA passed at 1280×720 with readable copy, intentional portrait crop, and no horizontal overflow.
- **V1 suite pass** - Director Studio now launches as a five-module creative operating system: one non-duplicated startup experience, new ecosystem artwork, readable suite welcome, universal Start with Director router, searchable platform/module help, and explicit Director Engine resource access in Motion Studio. Campaign adds a synchronized calendar and ICS export; Web adds multi-page/SEO compilation and export; Glam adds a 15-second product-film treatment. Automated release coverage now includes all three V1 artifact paths.
- **Current release polish** - Director's Home now exposes Motion, Glam, Web, and Campaign as first-class studio cards; Ctrl+K indexes the same studio destinations. `npm run test:release` guards app routing/sidebar/dashboard/search discovery plus Web and Campaign export fixtures and the production build.
- **Next** - deepen provider-backed product-film rendering, visual page-route management, and calendar drag/reschedule interactions after this packaged V1 foundation.
- Then build Web Studio on the same Brand DNA, deliverables, and Guided Flow platform primitives.
- Continuous: branding pass once named; QA + installer rebuild per phase.
