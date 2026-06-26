# Setup & Build

## Prerequisites (Windows)

1. **Node.js** ≥ 20 (developed on 24) and npm.
2. **Rust** (stable) via <https://rustup.rs>.
3. **MSVC C++ build tools** — "Desktop development with C++" (Visual Studio Build Tools).
4. **WebView2** runtime — preinstalled on Windows 11; otherwise install from Microsoft.

> macOS/Linux can run the **frontend** for UI work (`npm run dev`), but the desktop build
> targets Windows. The app is local-first Windows-first.

## Run

```bash
npm install

# Frontend only (browser, no Rust) — uses a localStorage mock for all IPC.
npm run dev            # http://localhost:1420

# Full native app (live Rust backend, hot reload)
npm run tauri dev

# Type-check + production frontend build
npm run build

# Build the Windows installers (MSI + NSIS) → src-tauri/target/release/bundle/
npm run tauri build
```

The frontend runs against a **browser mock** when not inside Tauri (`src/lib/ipc.ts`
detects `window.__TAURI_INTERNALS__`). This lets you build and verify most UI without Rust;
real generation/persistence requires `tauri dev`/the installed app.

## API keys

Set per-provider keys in the app: **Settings** → paste key (stored in Windows Credential
Manager via the `keyring` crate; never in the DB, never sent to the frontend). Providers
recognized today: `gemini`, `fal`, `kie`, `google_imagen`, `google_veo`. The text brain
(Prompt Pack) uses **Gemini**; images/video use **fal.ai** (preferred) or **Google**.

## Where data lives (Windows)

- SQLite DB + generated media: app data dir (`%APPDATA%\ai.wheelbarrow.motionforge\`,
  resolved via Tauri `app_data_dir()`), with media under `assets/{projectId}/`.
- Exports: `…\exports\`.
- API keys: Windows Credential Manager (service `ai.wheelbarrow.motionforge`).

## Conventions

- **Adding a pack field:** update BOTH `src/lib/types.ts` and `src-tauri/src/models.rs`
  (use `#[serde(default)]`), or `save_pack` will strip it on round-trip.
- **New Tauri command:** implement in `commands.rs`, register in `lib.rs`
  `invoke_handler!`, add the typed wrapper + browser mock in `src/lib/ipc.ts`.
- **Provider calls go in Rust only.** Never call a provider or read a key from the frontend.
- **Verify before done:** `npm run build` + `cargo check` clean; test in `tauri dev` with a
  real key for anything provider-related.

## Gotchas

- First `cargo` build compiles the whole Tauri dependency tree (minutes); subsequent builds
  are fast.
- Asset display uses Tauri's **asset protocol** (`tauri.conf.json → app.security.assetProtocol`,
  scoped to the app data dir) + `convertFileSrc()`. Files outside the scope won't load.
- **CSP is currently `null`** (disabled) to allow remote provider media during generation.
  Re-enable with an allowlist before public release.
- Installer is **unsigned** → Windows SmartScreen warns. Code-sign for distribution.
