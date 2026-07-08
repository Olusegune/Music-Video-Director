# Architecture — Director Studio / Music Video Director

> Living document. Update whenever the boundary map or a load-bearing system
> changes. Historical specs live in `docs/archive/` and are **not** authoritative.

Last updated: 2026-07-07

## What this is

A local-first desktop app (Tauri 2 + React 19 + TypeScript + Vite + Tailwind,
Rust/SQLite core) that is evolving from a single product — **Music Video
Director** — into the reusable foundation for **Director Studio**, a family of
creative-production apps (Motion Studio, Glam Studio, Web Studio, Campaign
Studio).

Core philosophy, in priority order:

1. **Plan locally, generate when ready.** Every creative engine (song analysis,
   treatment direction, choreography, story beats, lyric parsing, style
   inference) is a local heuristic — no API key needed to plan. Cloud providers
   are used only to render pixels/audio, through the provider router.
2. **Progressive disclosure, never removal.** Simplified surfaces (Magic Mode,
   Director mode) are additive layers over the full engine. Power is one tap
   away, never deleted. This is a standing product rule.
3. **Direct a production, don't prompt an AI.** Users in the default mode never
   see AI terminology.

## Runtime shape

- `src/app/App.tsx` - flat view router over `useAppStore` (Zustand), now composing Music Video Director and Motion Studio.
- `src/platform/lib/ipc.ts` — the single `api` facade (~78 methods). In Tauri it calls
  the Rust core (SQLite + OS keychain for keys); in browser dev it transparently
  falls back to localStorage (`mf.*` keys). Every feature talks to `api`, never
  to storage directly.
- `src-tauri/` — Rust core: DB, provider HTTP adapters, FFmpeg render pipeline,
  asset file storage (resolved to data: URLs via `assetDataUrl`).
- Modes: a single platform-level **StudioMode** (`director` / `studio` /
  `creator`) lives in `src/platform/lib/settings.ts` + `useAppStore`, switched globally
  in the Sidebar. Surfaces map it to their own disclosure tiers. Mode changes
  are presentation-only — they can never lose work.

- Guided creation flows are platform-owned. `src/platform/lib/guidedFlow.ts` defines flow/session contracts, local drafts, validation gates, and step advancement; `src/platform/components/flow/` provides the shared shell and reusable step primitives. Music Video Director now defaults to the platform `MusicVideoGuidedFlow` wrapper through `mf.guidedFlowV2`; the legacy wizard remains available when the flag is explicitly disabled.

## Platform ↔ app boundary map

The physical split is now in place: reusable systems live under
`src/platform/`, while Music Video Director systems live under
`src/apps/music-video/`. New code must respect this boundary.

### Platform (reusable by every Director Studio app)

| System                              | Modules                                                                                                                                    |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| AI Provider Router                  | `lib/providers.ts`, `lib/modelRegistry.ts`, `lib/providerMeta.ts`, `lib/providerReady.ts`, `lib/imageGen.ts`, `lib/videoGen.ts`            |
| Generation surface                  | `components/generation/GenerationPanel.tsx` (fallback chains, readiness, compact mode)                                                     |
| Creative DNA                        | `lib/characterDna.ts`, `lib/environmentDna.ts`, `lib/propDna.ts`, `lib/styleDna.ts`, `features/dna/`                                       |
| Asset Library + origin IA           | `lib/assets.ts` (incl. `assetOrigin`/`isChoreographyCategory`), `lib/assetUsage.ts`, `lib/generatedAssets.ts`, `features/assets/`          |
| Bibles (canonical entity libraries) | `features/characters/`, `features/world/`, `features/props/`, `lib/types.ts`                                                               |
| Style Library                       | `lib/templates.ts`, `features/templates/`, `components/templates/TemplateCard.tsx`                                                         |
| Project Memory                      | `lib/snapshots.ts`, `lib/undo.ts`, `lib/settings.ts`, `lib/scriptStore.ts`                                                                 |
| Guided Flow / Magic Flow            | `lib/guidedFlow.ts`, `components/flow/GuidedFlowShell.tsx`, `components/flow/steps/*`, `lib/studioMode.ts`                                 |
| Brand DNA / deliverables            | `lib/brandDna.ts`, `lib/deliverables.ts`, `lib/loopEngine.ts`                                                                              |
| Persistence facade                  | `lib/ipc.ts` + the Rust core                                                                                                               |
| Shared UI kit                       | `components/ui/*` (CardPicker, HelpHint, AssetImage/AssetVideo with broken-state recourse, buttons, inputs), `components/layout/`          |
| Export                              | `lib/bibleExport.ts`, `lib/pack.ts`, `features/export/`                                                                                    |
| Script intelligence                 | `lib/scriptParser.ts`, `lib/scriptAnalysis.ts`, `lib/docParse.ts`, `features/scripts/`                                                     |
| Image Studio (sheet composer)       | `features/imagestudio/`, `lib/characterSheet.ts`, `lib/assetSheet.ts`                                                                      |
| Help system                         | `features/help/`, `components/ui/help-hint.tsx`                                                                                            |
| Branding assets                     | `src/assets/director-studio-splash.png`, `src/assets/director-studio-icon.png`, `src-tauri/icons/*`, `components/layout/StartupSplash.tsx` |

### Music Video Director (app-specific)

| System                     | Modules                                                                                                                                                                                                                                                                                                                     |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Song Brain                 | `lib/songBrain.ts`, `lib/audio.ts`, `lib/audioPlayer.ts`, `features/song/`                                                                                                                                                                                                                                                  |
| Director Brain / treatment | `lib/mvDirector.ts`, `lib/mvGen.ts`, `features/mvdirector/`                                                                                                                                                                                                                                                                 |
| Choreography               | `lib/choreography.ts`, `lib/choreographyLayouts.ts`, `lib/choreoDirectives.ts`, `lib/stickFigurePoses.ts`, `features/choreography/`                                                                                                                                                                                         |
| Cast / performers          | `lib/cast.ts`, `lib/performerDetect.ts`, `lib/roleMeta.tsx`, `lib/danceStyleMeta.tsx`, `features/cast/`                                                                                                                                                                                                                     |
| Story Mode / video types   | `lib/storyMode.ts`, `lib/videoTypes.ts`                                                                                                                                                                                                                                                                                     |
| Magic Mode / Guided Flow   | `features/director/MusicVideoGuidedFlow.tsx` registers the platform `GuidedFlowDefinition`; `features/director/DirectorWizard.tsx` remains as the legacy opt-back wizard; `features/mvdirector/MagicDirect.tsx` remains the local directing pipeline; `features/mvdirector/MagicOutputScreen.tsx` remains the result screen |
| Timeline / render          | `features/timeline/`, render pipeline calls in the Rust core                                                                                                                                                                                                                                                                |
| Motion tests               | `lib/motionTest.ts`, `features/animation/`                                                                                                                                                                                                                                                                                  |

### Glam Studio (app-specific)

| System                     | Modules                                                                                                                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| App workflow               | `apps/glam-studio/GlamStudio.tsx`                                                                                                                                                    |
| Exact-size campaign export | `apps/glam-studio/lib/campaignExport.ts` (`html-to-image` typography composition + dependency-free ZIP STORE packaging)                                                              |
| Shared systems consumed    | `platform/components/flow`, `platform/lib/brandDna`, `platform/lib/deliverables`, `platform/lib/loopEngine`, `platform/store/useAppStore`, shared UI/theme, provider-router settings |

Glam Studio is a guided luxury product campaign module. It owns product/category/look/concept heuristics and campaign raster/ZIP export locally, while Brand DNA, deliverable records, loop events, StudioMode, and UI shell remain platform-owned so Web and Campaign can reuse them. Campaign typography is a real DOM overlay captured into each exact-size PNG; image models are never asked to paint final copy. Projects persist a selected hero plus per-format crop/copy layout maps. Saved Looks and Concepts use bounded local registries and are composed back into later Guided Flows without becoming platform-specific data.

Provider metadata includes `supportsImageReferences` based on the actual Rust adapter contract. Glam uses it to prefer Google/Gemini, OpenAI/GPT Image, or WaveSpeed reference-conditioning paths when product photos exist. If only text-to-image adapters are configured, the output is explicitly labeled Look-alike mode rather than product-faithful.

### Web Studio (app-specific)

| System                         | Modules                                                       |
| ------------------------------ | ------------------------------------------------------------- |
| App/workbench + Guided Flow    | `apps/webstudio/WebStudio.tsx`                                |
| Domain/storage                 | `apps/webstudio/lib/types.ts`, `webStore.ts`                  |
| Curated layout registry        | `apps/webstudio/lib/patterns.ts` (12 patterns, four families) |
| Positioning/copy               | `apps/webstudio/lib/positioning.ts`                           |
| Brand token compiler           | `apps/webstudio/lib/tokens.ts`                                |
| Single preview/export renderer | `apps/webstudio/lib/siteCompiler.ts`                          |

Web Studio compiles one structured `WebProject` through one deterministic renderer. The iframe preview uses inline CSS from that compiler; static export uses the same HTML with the same compiler-produced CSS split into `styles.css`. AI/local copy stages may fill typed slots but never emit layout code. Static ZIP packaging uses shared `platform/lib/archive.ts`; Production Library media is copied into the export so machine-local asset URLs do not leak into the finished website.

Provider-backed Web copy crosses the IPC boundary through `generate_structured_text`; the Rust core reads the Gemini key from the OS keychain and requests JSON-only output. `apps/webstudio/lib/webAi.ts` treats that output as untrusted and validates every field before it can replace deterministic local positioning/copy. `siteAudit.ts` runs a deterministic pre-export gate and writes its result into `quality-report.json` inside the static-site ZIP.

`scripts/web-export-smoke.ts` is the repeatable compiler/export regression check. It builds a complete fixture, requires a quality score of at least 90, checks semantic HTML and responsive/reduced-motion CSS, creates a real ZIP through `platform/lib/archive.ts`, and verifies its signature and required entries. Run it with `npm run test:web-export`.

### Campaign Studio (app-specific orchestration)

| System                           | Modules                                          |
| -------------------------------- | ------------------------------------------------ |
| App/workbench + Guided Flow      | `apps/campaign/CampaignStudio.tsx`               |
| Domain/storage                   | `apps/campaign/lib/types.ts`, `campaignStore.ts` |
| Strategy/concept                 | `apps/campaign/lib/strategy.ts`                  |
| Deterministic plan + native copy | `apps/campaign/lib/planGenerator.ts`             |
| Launch-kit PDF/CSV/Markdown      | `apps/campaign/lib/packageExport.ts`             |
| Cross-studio contract            | `platform/lib/seedContext.ts`                    |

Campaign Studio owns strategy, orchestration, native social/email copy, and package assembly—not specialist image, web, or motion generation. `SeedContext` is the only Campaign-to-specialist coupling surface. It carries Brand DNA, messaging, product/audience context, campaign/source-deliverable IDs, and an optional Look; Glam/Web consume it without importing Campaign code. The deliverable registry remains the shared status source of truth.

Campaign provider output follows the same trust boundary as Web: the generic native `generate_structured_text` command returns JSON text, while `apps/campaign/lib/campaignAi.ts` validates the complete strategy/concept or copy schema before state changes. `apps/campaign/lib/seed.ts` is the pure Campaign-to-SeedContext adapter and is covered by the export smoke fixture.

`scripts/campaign-export-smoke.ts` verifies the smallest plan still has at least eight deliverables across at least three channels, then validates strategy PDF, plan CSV, and ZIP signatures. Run it with `npm run test:campaign-export`.

### Motion Studio (app-specific)

| System                        | Modules                                                                                                                                                                                                              |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App workflow                  | `apps/motion-studio/MotionStudio.tsx`                                                                                                                                                                                |
| Domain types/storage          | `apps/motion-studio/lib/types.ts`, `apps/motion-studio/lib/storage.ts`, `apps/motion-studio/lib/projects.ts`                                                                                                         |
| Creative direction/storyboard | `apps/motion-studio/lib/direction.ts`, `apps/motion-studio/lib/brain.ts`                                                                                                                                             |
| Motion-specific style data    | `apps/motion-studio/lib/templates.ts`, `apps/motion-studio/lib/styleLibrary.ts`                                                                                                                                      |
| Shared systems consumed       | `platform/store/useAppStore`, `platform/lib/ipc`, `platform/lib/providers`, `platform/lib/settings`, `platform/lib/styles`, `platform/components/ui/*`, `features/assets`, `features/templates`, `features/settings` |

Motion Studio is a Director Studio module, not a separate product. It may own app-specific production types, storyboard heuristics, and local motion-project memory, but it must use platform-owned settings, theme, StudioMode, provider router configuration, shared UI, asset library navigation, and Creative DNA/style systems. The source `C:\Users\eduni\Documents\MotionStudio` standalone Electron shell, store, settings screen, UI kit, and provider code are intentionally not imported.

Gray areas retained on the platform side for now: `platform/lib/localEngine.ts`
(B2B-flavored copy heuristics), `platform/lib/textlock.ts`,
`platform/lib/moodboard.ts`, `platform/features/projects/` (the older
motion-graphics project workspace — predates the music-video spine).

Phase 4 coupling found and partially fixed: `platform/store/useAppStore` now talks to app-level production helpers through `platform/lib/appBindings.ts` instead of importing Music Video modules directly. Remaining legacy couplings are concentrated in dashboard/search/assets/validation/demo helpers and should move behind similar platform extension points before more app modules depend on them.

## Verification discipline

Visual identity is platform-owned in `styles/globals.css`: `studio-view-*` classes set module accents while shared `Card`, `Button`, Guided Flow cards, and `CreativeEmptyState` consume the common interaction language. Modules may express personality through the accent and purpose-built previews, but should not fork spacing, component geometry, focus behavior, or semantic success/warning colors.

The release-level frontend check is `npm run test:release`. `scripts/app-shell-smoke.mjs` verifies each first-class studio remains reachable through suite onboarding, the router, sidebar, Director's Home, and global search. Web coverage validates multi-page canonical/metadata compilation; Campaign coverage validates one ICS event per planned deliverable; Glam coverage validates the timed product-film treatment before the production build runs.

Every change: `npx tsc --noEmit`, then live verification in the browser preview
(synthetic WAV fixtures for audio flows), then commit with a scoped message.
Backups to `C:\Users\eduni\Documents\Backups\<Name>_Pre_<date>` before
structural changes.
