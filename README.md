# Wheelbarrow AI Director

Local-first **AI music-video director** for Windows. Import a song and the app
maps its tempo, sections, and lyrics, then directs a complete production:

> **Song Studio** (tempo / sections / lyric map) → **MV Director** (beat-synced,
> section-aware treatment) → **Cast** (performers linked to Character DNA) →
> **Choreography** (8-counts + pose sheets) → **Timeline** (frames, clips, voice
> layers) → **Render** (resolution-aware MP4 with a real audio mix).

Hybrid by design: **all planning runs locally with no API key** (Song Brain, MV
Director, Cast, Choreography, Timeline, animatic). Cloud providers are used only
for the generative pixels/audio — frames, clips, and voices — with keys stored in
the OS keychain and routed through the Rust core. The original motion-graphics
pre-production tools (Character/World/Prop Bibles, Script Studio, Image Studio,
Camera/Lighting/Audio directors, export) ship alongside.

Final render uses **FFmpeg** (must be on `PATH`, or set the `MOTIONFORGE_FFMPEG`
env var to its full path) to concat the per-shot stills/clips and mux the song
audio plus delayed, volume-adjustable, optionally auto-ducking voice layers.

See [`MOTIONFORGE_PLAN.md`](./MOTIONFORGE_PLAN.md) for the architecture and roadmap.

## Stack

- **Tauri 2** (Rust shell) → ships as a Windows `.msi` / `.exe`
- **Vite + React 19 + TypeScript** frontend
- **Tailwind v4 + shadcn-style** UI (dark-first)
- **SQLite** (rusqlite) for local storage · **OS keychain** for API keys
- **Provider layer in Rust** — Gemini (text), fal.ai / kie.ai / Google (image/video)

> All provider calls go through Rust. API keys never reach the frontend.

## Run it

### Frontend only (no Rust needed) — works today

```bash
npm install
npm run dev        # http://localhost:1420
```

In the browser the app runs against a localStorage-backed mock: you can create
projects, manage (mock) keys, and see a sample Prompt Pack. This is the "web app"
view of the exact same codebase.

### Full Windows desktop app — needs the Rust toolchain

Prerequisites (one-time):

1. **Rust** — install via <https://rustup.rs>
2. **MSVC C++ build tools** — "Desktop development with C++" workload from the
   Visual Studio Build Tools installer
3. **WebView2** — preinstalled on Windows 11; otherwise from Microsoft

Then:

```bash
npm install
npm run tauri dev      # launches the native window with the live Rust backend
npm run tauri build    # produces the installers + the standalone exe
```

### Build outputs

`npm run tauri build` produces three artifacts:

| Artifact                     | Path                                                                               |
| ---------------------------- | ---------------------------------------------------------------------------------- |
| Installer (`.exe`, NSIS)     | `src-tauri/target/release/bundle/nsis/Wheelbarrow MotionForge_<ver>_x64-setup.exe` |
| Installer (`.msi`)           | `src-tauri/target/release/bundle/msi/Wheelbarrow MotionForge_<ver>_x64_en-US.msi`  |
| Portable (standalone `.exe`) | `src-tauri/target/release/wheelbarrow-motionforge.exe`                             |

### Portable mode (USB-stick style)

The standalone exe normally stores its DB/assets/exports under `%APPDATA%`. To make
it **fully self-contained** — all data written next to the exe — drop an empty file
named **`portable.txt`** beside `wheelbarrow-motionforge.exe`. On launch the app
detects the marker and uses `<exe folder>\data\` for the SQLite DB, generated
assets, and exports. Remove the marker to revert to the per-user `%APPDATA%` store.

> Note: API keys are stored in the **Windows Credential Manager** (machine-bound),
> so they do **not** travel with the portable folder — re-enter keys on each
> machine, or run in **Local prompt-only** mode (no keys needed).

When running under Tauri, the IPC layer (`src/lib/ipc.ts`) automatically switches
from the mock to real Rust commands — SQLite persistence, keychain-stored keys,
and live Gemini calls.

## Project layout

```
src/                 React frontend
  app/               shell + view switching
  components/         layout (Sidebar, Inspector) + ui primitives
  features/           dashboard, projects, settings
  lib/                ipc bridge, types, utils
  store/              Zustand app state
src-tauri/           Rust core
  src/               commands, db (SQLite), secrets (keychain), providers/
docs/                original specs (reference)
```

## Status

- **Phase 0 (scaffold)** — ✅ complete
- **Phase 1 (Prompt Pack vertical slice)** — ✅ generate → persist (SQLite/keychain
  via Rust) → fully editable, autosaving UI (Creative Direction, Style, editable
  storyboard with add/move/duplicate/lock/delete, QC checklist). To exercise live
  Gemini output, add a Gemini key in **Settings** and run the Tauri app.
- **Phase 2 (Camera & Lighting Directors)** — ✅ per-shot, fully editable camera
  plans (shot type, lens, height, angle, movement, composition, emotional/editorial
  purpose, notes) and lighting plans (intent, strategy, key/fill/rim, color temp,
  contrast, atmosphere, depth separation, continuity). Generated by Gemini and
  rendered in dedicated Camera/Lighting workspace tabs. UI supports light & dark.
- **Phase 3 (Image generation)** — ✅ per-shot storyboard frame generation via the
  Rust provider layer (fal.ai FLUX, with Google Imagen fallback). Images download to
  the app's assets dir and display via Tauri's asset protocol; prompts are composed
  from each shot's visual/camera/lighting context. Per-shot "Generate frame" +
  "Generate Frames" (batch), with persisted thumbnails.
- **Phase 4 (Video generation)** — ✅ per-shot text-to-video via the async job model
  (submit → poll → download) in the Rust provider layer: fal.ai queue (FLUX/LTX) with
  a best-effort Google Veo fallback. Videos persist to the assets dir and play inline
  in the shot card (with the generated frame as poster). Per-shot Generate Video.
- **Phase 5 (Export engine)** — ✅ Markdown / JSON / PDF (printpdf) / DOCX (docx-rs)
  from a shared document model, written to the app's exports dir. Export Center tab
  with per-format buttons + recent-exports list; browser falls back to MD/JSON Blob
  downloads. Renderers covered by a Rust unit test.
- **Phase 6 (Polish)** — ✅ Brand Kits (Rust-backed, applied to generation),
  dashboard Templates, global Asset Library, accessibility pass (aria-labels, nav
  landmarks), and a release installer (`npm run tauri build` → `.msi`/`.exe`).
  Installer signing is the remaining production step (needs a code-signing cert).

All core phases (0–6) complete — full pipeline: idea → Prompt Pack → camera/lighting
→ image → video → export, with brand kits, asset library, light/dark, and a Windows
installer. See `QA_CHECKLIST.md` for the testing pass.
