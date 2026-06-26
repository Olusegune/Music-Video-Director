# Architecture

## 1. Shape

Local-first desktop app. One React codebase runs in a browser during dev and is bundled
into a native Windows app by Tauri. **All provider/network calls and all persistence go
through the Rust core** — the WebView frontend never holds an API key (avoids key leakage
and CORS, and lets us normalize very different provider APIs behind one interface).

```
┌───────────────────────────────────────────────────────────────┐
│ Windows app (Tauri 2 bundle: .msi / .exe)                     │
│                                                               │
│  Frontend (WebView)              Tauri IPC        Rust core   │
│  Vite + React 19 + TS      ──── invoke() ───▶   commands.rs   │
│  Tailwind v4 + shadcn-ish   ◀── events ─────                  │
│  Zustand (UI state)                              • providers/ │
│  TanStack Query (async)                          • db (SQLite)│
│  three-panel workspace                           • secrets    │
│                                                  • export     │
└───────────────────────────────────────────────────────────────┘
                                                       │ HTTPS (keys never leave Rust)
                          ┌──────────────┬─────────────┼──────────────┐
                          ▼              ▼             ▼              ▼
                     Gemini (text)   fal.ai      Google         kie.ai / future
                                  (image/video)  (Imagen/Veo)   (config-driven)
```

## 2. Tech stack

**Frontend:** Tauri 2 · Vite 6 · React 19 · TypeScript 5 · TailwindCSS 4 · shadcn-style
primitives · Zustand (UI state) · TanStack Query (async/IPC).

**Rust core:** `tauri` 2 · `rusqlite` (bundled SQLite) · `reqwest` (rustls) · `serde` ·
`tokio` · `keyring` (Windows Credential Manager) · `uuid` · `chrono` · `base64` ·
`printpdf` (PDF) · `docx-rs` (DOCX).

**Storage:** SQLite single file + generated media on disk, both under the app data dir.
Secrets in the OS keychain (never in the DB).

## 3. Repo structure

```
wheelbarrow-motionforge/
├─ src/                         # React frontend
│  ├─ app/                      # App shell + view switching
│  ├─ components/
│  │  ├─ layout/                # Sidebar, Inspector
│  │  └─ ui/                    # button, input, card, badge, inline-edit, theme-toggle…
│  ├─ features/
│  │  ├─ dashboard/             # project create + templates
│  │  ├─ projects/              # workspace, storyboard, camera/lighting directors, usePromptPack
│  │  ├─ brandkits/             # Brand Kit manager
│  │  ├─ assets/                # Asset Library
│  │  └─ settings/              # provider API keys
│  ├─ lib/                      # ipc.ts (typed bridge), types.ts, pack.ts, styles.ts, utils.ts
│  └─ store/                    # Zustand: useAppStore, useTheme
├─ src-tauri/                   # Rust core
│  ├─ src/
│  │  ├─ main.rs / lib.rs       # bootstrap + command registry
│  │  ├─ commands.rs            # IPC command surface
│  │  ├─ db.rs                  # SQLite schema + queries
│  │  ├─ models.rs              # serde types (camelCase ↔ TS)
│  │  ├─ secrets.rs             # keychain
│  │  ├─ export.rs              # MD/JSON/PDF/DOCX renderers (+ unit tests)
│  │  └─ providers/             # text.rs, image.rs, video.rs, mod.rs (traits)
│  ├─ tauri.conf.json           # window, bundle, asset-protocol config
│  └─ capabilities/default.json # permissions
└─ docs/                        # specs + this handoff
```

## 4. Provider layer (the part you'll extend most)

One **trait per capability** so vendors are interchangeable:

```rust
trait TextProvider  { async fn generate_pack(&self, input: &str) -> Result<PromptPack>; }
trait ImageProvider { async fn generate_image(&self, prompt: &str) -> Result<Vec<u8>>; }
trait VideoProvider { async fn generate_video(&self, prompt: &str) -> Result<Vec<u8>>; }
```

Implementations today: `GeminiTextProvider`, `FalImageProvider`, `GoogleImagenProvider`,
`FalVideoProvider`, `GoogleVeoProvider`. Video uses an internal **submit → poll → download**
loop (async job model).

> **Important redesign for FR-15/16:** these single-method traits take only a `prompt`
> and use a hardcoded default model. They must evolve to accept a normalized
> **`GenerationRequest { model, prompt, references[], params }`** and the command layer
> must route by a **model catalog**. Full spec in
> [FEATURE_MODEL_SELECTION.md](FEATURE_MODEL_SELECTION.md).

### Selection today (to be replaced)
`generate_shot_image` / `generate_shot_video` pick a provider by which key exists (fal
preferred, then Google). There is **no per-shot model choice yet** — that's the headline work.

## 5. Data flow examples

**Pack generation:** UI brief (+ style/brand preamble) → `invoke("generate_prompt_pack")`
→ Rust calls Gemini with the MotionForge system prompt requesting **structured JSON** →
parsed into `PromptPack` → persisted in `prompt_packs` → returned → rendered as editable
cards → edits autosave via `save_pack` (debounced).

**Image generation:** UI composes prompt (style + shot context) →
`invoke("generate_shot_image")` → provider returns bytes → written to
`{appData}/assets/{projectId}/…` → `assets` row inserted → absolute path returned →
frontend `convertFileSrc()` → `<img>`.

## 6. Security model

- API keys: stored via `keyring` (Windows Credential Manager), keyed by provider id.
  Commands expose only **presence** (`get_provider_key_statuses`), never values.
- Provider calls originate in Rust; the WebView cannot read keys.
- Asset protocol is scoped to the app data dir (`tauri.conf.json → app.security.assetProtocol`).
- CSP is currently disabled (`csp: null`) to allow remote provider image/video URLs during
  generation; tighten before any public release (allowlist provider/asset origins).

## 7. Known architectural debt / decisions to make
- **Generation model is hardcoded** → replace with catalog + `GenerationRequest` (FR-15/16).
- **`imageUrl`/`videoUrl` store display URLs** (asset/data/remote), not raw paths → fine
  today, but **store raw asset references** for clean portability before shipping `.mfp`
  with bundled media (see DATA_MODEL_AND_API §Portability).
- **`scenes`/`shots` tables exist but are unused** — the pack is stored as JSON in
  `prompt_packs`. Decide whether to normalize shots into tables when adding
  characters/environments/props (recommended for relational reference linking).
- **CSP disabled** — re-enable with an allowlist.
