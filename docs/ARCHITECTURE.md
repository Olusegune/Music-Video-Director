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

- `src/app/App.tsx` — flat view router over `useAppStore` (Zustand). 21 views.
- `src/lib/ipc.ts` — the single `api` facade (~78 methods). In Tauri it calls
  the Rust core (SQLite + OS keychain for keys); in browser dev it transparently
  falls back to localStorage (`mf.*` keys). Every feature talks to `api`, never
  to storage directly.
- `src-tauri/` — Rust core: DB, provider HTTP adapters, FFmpeg render pipeline,
  asset file storage (resolved to data: URLs via `assetDataUrl`).
- Modes: a single platform-level **StudioMode** (`director` / `studio` /
  `creator`) lives in `src/lib/settings.ts` + `useAppStore`, switched globally
  in the Sidebar. Surfaces map it to their own disclosure tiers. Mode changes
  are presentation-only — they can never lose work.

## Platform ↔ app boundary map

The eventual folder split (`src/platform/` vs `src/apps/music-video/`) is
Phase 3. Until then this table **is** the boundary; new code must respect it.

### Platform (reusable by every Director Studio app)

| System | Modules |
|---|---|
| AI Provider Router | `lib/providers.ts`, `lib/modelRegistry.ts`, `lib/providerMeta.ts`, `lib/providerReady.ts`, `lib/imageGen.ts`, `lib/videoGen.ts` |
| Generation surface | `components/generation/GenerationPanel.tsx` (fallback chains, readiness, compact mode) |
| Creative DNA | `lib/characterDna.ts`, `lib/environmentDna.ts`, `lib/propDna.ts`, `lib/styleDna.ts`, `features/dna/` |
| Asset Library + origin IA | `lib/assets.ts` (incl. `assetOrigin`/`isChoreographyCategory`), `lib/assetUsage.ts`, `lib/generatedAssets.ts`, `features/assets/` |
| Bibles (canonical entity libraries) | `features/characters/`, `features/world/`, `features/props/`, `lib/types.ts` |
| Style Library | `lib/templates.ts`, `features/templates/`, `components/templates/TemplateCard.tsx` |
| Project Memory | `lib/snapshots.ts`, `lib/undo.ts`, `lib/settings.ts`, `lib/scriptStore.ts` |
| Persistence facade | `lib/ipc.ts` + the Rust core |
| Shared UI kit | `components/ui/*` (CardPicker, HelpHint, AssetImage/AssetVideo with broken-state recourse, buttons, inputs), `components/layout/` |
| Export | `lib/bibleExport.ts`, `lib/pack.ts`, `features/export/` |
| Script intelligence | `lib/scriptParser.ts`, `lib/scriptAnalysis.ts`, `lib/docParse.ts`, `features/scripts/` |
| Image Studio (sheet composer) | `features/imagestudio/`, `lib/characterSheet.ts`, `lib/assetSheet.ts` |
| Help system | `features/help/`, `components/ui/help-hint.tsx` |

### Music Video Director (app-specific)

| System | Modules |
|---|---|
| Song Brain | `lib/songBrain.ts`, `lib/audio.ts`, `lib/audioPlayer.ts`, `features/song/` |
| Director Brain / treatment | `lib/mvDirector.ts`, `lib/mvGen.ts`, `features/mvdirector/` |
| Choreography | `lib/choreography.ts`, `lib/choreographyLayouts.ts`, `lib/choreoDirectives.ts`, `lib/stickFigurePoses.ts`, `features/choreography/` |
| Cast / performers | `lib/cast.ts`, `lib/performerDetect.ts`, `lib/roleMeta.tsx`, `lib/danceStyleMeta.tsx`, `features/cast/` |
| Story Mode / video types | `lib/storyMode.ts`, `lib/videoTypes.ts` |
| Magic Mode wizard | `features/director/DirectorWizard.tsx`, `lib/magic.ts`, `features/mvdirector/MagicOutputScreen.tsx` |
| Timeline / render | `features/timeline/`, render pipeline calls in the Rust core |
| Motion tests | `lib/motionTest.ts`, `features/animation/` |

Gray areas (decide when extracted): `lib/localEngine.ts` (B2B-flavored copy
heuristics), `lib/textlock.ts`, `lib/moodboard.ts`, `features/projects/` (the
older motion-graphics project workspace — predates the music-video spine).

## Verification discipline

Every change: `npx tsc --noEmit`, then live verification in the browser preview
(synthetic WAV fixtures for audio flows), then commit with a scoped message.
Backups to `C:\Users\eduni\Documents\Backups\<Name>_Pre_<date>` before
structural changes.
