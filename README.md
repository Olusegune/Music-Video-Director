# Director Studio

Director Studio is a local-first creative production suite for Windows. It brings five specialist studios into one cohesive desktop app:

- Music Video Director — song-aware treatments, lyric transcription, director styles, cast, choreography, timeline, and export.
- Motion Studio — explainers, commercials, product reveals, UI animation, and motion templates.
- Glam Studio — luxury campaign planning, product hero generation, format packs, and export.
- Web Studio — responsive site planning, page compilation, SEO, and export.
- Campaign Studio — launch strategy, channel planning, production handoffs, calendars, and campaign packages.

Shared libraries — Character Bible, World Bible, Props & Vehicles, Asset Library, Brand Kits, and Script Studio — keep production DNA reusable across the whole Director Studio ecosystem.

## Music Video Director

Shipped as its own edition (`npm run tauri:build:mv`) as well as inside the suite.

- **Song Brain** — imports a track and detects tempo, beat grid, energy and sections locally, with no API key.
- **Lyrics** — type them, fold in a script or lyric sheet, or transcribe them from the audio a section at a time. Transcription is a draft to correct: sung words are much harder to make out than speech, and it never replaces written lyrics without asking.
- **Director styles** — 21 filmmakers as an optional layer over the Style template, feeding shot ideas, camera, lighting and cutting pace into every prompt. The craft is sent to the models; the director's name never is.
- **Cast and Character DNA** — lock a performer's likeness so the same face carries across shots. A character with no appearance fields cannot do this, and the cast card says so.
- **Choreography** — moves and formations built from the lyrics and section energy, injected into the prompts rather than described in the UI alone.
- **Direct** — a beat-synced treatment and shot list, with a health strip that names anything blocking a render before you spend on one.
- **Timeline and render** — frames, clips and the song mixed to MP4 through FFmpeg.

Known limitation: lip-sync is not frame-accurate. Clips carry plausible mouth motion, not audio-locked sync.

## Stack

- Tauri 2 desktop shell
- Vite + React 19 + TypeScript
- Tailwind 4 design system
- Zustand + React Query
- Rust provider and file-system bridge
- Local-first planning with optional provider-backed generation

## Development

```bash
npm install
npm run dev
npm run check
npm run build
npm run tauri dev
```

The Vite dev server runs at:

```text
http://localhost:1420
```

## Windows build

```bash
npm run tauri build
```

Primary build outputs are produced under:

```text
C:\Users\eduni\Documents\Wheelbarrow MotionForge AI\src-tauri\target\release\
```

Release-ready 1.0.0 artifacts are assembled under:

```text
C:\Users\eduni\Documents\DirectorStudio-Release-1.0.0\
```

Expected release folders:

| Artifact group | Path                                                                                            |
| -------------- | ----------------------------------------------------------------------------------------------- |
| Installers     | `C:\Users\eduni\Documents\DirectorStudio-Release-1.0.0\Installers\`                             |
| Portable build | `C:\Users\eduni\Documents\DirectorStudio-Release-1.0.0\Portable\DirectorStudio-1.0.0-Portable\` |
| Checksums      | `C:\Users\eduni\Documents\DirectorStudio-Release-1.0.0\Checksums\`                              |

## Portable mode

Director Studio supports portable mode. Place `portable.txt` beside the executable and the app will use a local `data\` folder beside the executable for user data.

## Release policy

The Windows bundle identifier for 1.0.0 is `ai.wheelbarrow.directorstudio`. Windows treats this as a distinct app identity from earlier MotionForge builds, so prior WebView2/localStorage data is not automatically reused by this release.

Unless a signed release channel is configured, Windows SmartScreen may show an “unrecognized app” warning on first launch. See the 1.0 release notes for the current signing status.
