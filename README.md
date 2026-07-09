# Director Studio

Director Studio is a local-first creative production suite for Windows. It brings five specialist studios into one cohesive desktop app:

- Music Video Director — song-aware treatments, cast, choreography, timeline, and export.
- Motion Studio — explainers, commercials, product reveals, UI animation, and motion templates.
- Glam Studio — luxury campaign planning, product hero generation, format packs, and export.
- Web Studio — responsive site planning, page compilation, SEO, and export.
- Campaign Studio — launch strategy, channel planning, production handoffs, calendars, and campaign packages.

Shared libraries — Character Bible, World Bible, Props & Vehicles, Asset Library, Brand Kits, and Script Studio — keep production DNA reusable across the whole Director Studio ecosystem.

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

The Windows bundle identifier is intentionally preserved as `ai.wheelbarrow.motionforge` for 1.0.0 to protect existing WebView2/localStorage user data. User-visible product naming is Director Studio.

Unless a signed release channel is configured, Windows SmartScreen may show an “unrecognized app” warning on first launch. See the 1.0 release notes for the current signing status.
