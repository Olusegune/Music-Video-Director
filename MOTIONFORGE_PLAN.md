# Wheelbarrow MotionForge — Build Plan & Local-First Architecture

**Status:** Planning · **Version:** 0.1 · **Date:** 2026-06-16
**This document is the single source of truth.** It reconciles the six original spec docs
(`WheelbarrowMotionForge*.md`) into one buildable plan for the actual target: a **local Windows
desktop application** that calls third-party AI APIs directly.

---

## 1. The reconciliation (why this plan differs from the specs)

The original specs describe a **cloud, multi-tenant SaaS**. The real goal is a **local-first
Windows desktop app** that the user runs and that talks to fal.ai / kie.ai / Google directly with
the user's own API keys. These are different products. Building the SaaS first and "converting"
would throw away most of the backend.

| Concern | Original spec (cloud SaaS) | This plan (local desktop) | Rationale |
|---|---|---|---|
| Distribution | Hosted web app (Vercel) | **Windows app via Tauri 2** | The stated goal |
| Frontend | Next.js 15 | **Vite + React + TS** | Next.js targets hosted SSR; Vite is the standard Tauri pairing. UI code is otherwise identical. |
| "Backend" | NestJS service mesh | **Rust commands inside Tauri** | No server to host; Rust is the local backend |
| Database | PostgreSQL + Prisma + Redis | **SQLite** (Tauri SQL plugin) | Ships inside the app, zero setup |
| Object storage | AWS S3 + CloudFront | **Local filesystem** (app data dir) | Assets live on the user's disk |
| Auth | Clerk / Auth0 | **None (single local user)** + **OS keychain for API keys** | A local app has no users to log in; it stores *your* provider keys |
| AI "brain" | Generic LLM | **Google Gemini** (default), model-agnostic interface | User's choice; swappable |
| Media generation | "AI image/video (Phase 5–6)" | **fal.ai / kie.ai / Google** via a unified provider layer | Core to the local app |
| Cloud infra (ECS/RDS/Datadog) | required | **dropped for v1** | Not applicable locally |

**What we keep verbatim from the specs:** the product concept (Idea → Prompt Pack), the
MotionForge AI system prompt / Prompt Pack output structure, the three-panel "directing a film,
not chatting" UX, the dark theme + design tokens, the entity hierarchy (Project → Scene → Shot →
Prompt), and the Camera/Lighting Director feature set.

> Cloud features (accounts, real-time collaboration, hosted sync, approvals) are **not deleted —
> deferred.** Section 9 notes the seams that keep them possible later.

---

## 2. Target architecture (local-first)

```
┌──────────────────────────────────────────────────────────────┐
│ Windows Desktop App (Tauri 2 bundle: .msi / .exe)            │
│                                                              │
│  ┌────────────────────────────┐   Tauri IPC   ┌───────────┐ │
│  │ Frontend (WebView)         │ ───commands──▶ │ Rust core │ │
│  │ Vite + React + TS          │ ◀──events───── │           │ │
│  │ Tailwind + shadcn/ui       │                │           │ │
│  │ Zustand (state)            │                │ • provider│ │
│  │ TanStack Query             │                │   layer   │ │
│  │ Three-panel workspace UI   │                │ • SQLite  │ │
│  └────────────────────────────┘                │ • keychain│ │
│                                                 │ • exports │ │
│                                                 └─────┬─────┘ │
└───────────────────────────────────────────────────────┼─────┘
                                                         │ HTTPS (keys never touch frontend)
                          ┌──────────────────────────────┼───────────────────────────┐
                          ▼                ▼              ▼              ▼              ▼
                    Google Gemini      fal.ai         kie.ai      Google Veo/    (future
                    (text brain)    (image/video)  (image/video)   Imagen        providers)
```

**The golden rule of this architecture:** *all provider calls go through Rust.* The frontend never
holds an API key and never calls a provider directly. This avoids CORS, keeps secret keys in the OS
keychain, and lets us normalize wildly different provider APIs behind one interface.

---

## 3. Technology stack

**Frontend**
- Tauri 2 (Rust shell)
- Vite + React 19 + TypeScript
- TailwindCSS + shadcn/ui (matches the spec's dark theme & tokens)
- Zustand (UI state) + TanStack Query (async/provider calls via IPC)

**Rust core (the local backend)**
- `tauri` 2 + plugins: `tauri-plugin-sql` (SQLite), `tauri-plugin-fs`, `tauri-plugin-dialog`,
  `tauri-plugin-store`, `tauri-plugin-keyring`/`stronghold` (secrets)
- `reqwest` (HTTP), `serde`/`serde_json`, `tokio`
- Provider modules (one per vendor) behind shared traits

**Data**
- SQLite (single file in the app data dir)
- Generated media + exports written to a user-visible project folder on disk

**Packaging**
- Tauri bundler → `.msi` / NSIS `.exe` installer for Windows

---

## 4. The provider layer (the heart of the local app)

Three distinct capabilities, each with multiple possible vendors. We define a **trait per
capability** so vendors are interchangeable and the app degrades gracefully when a key is missing.

```rust
// Capability 1: TEXT — generates the MotionForge Prompt Pack
trait TextProvider {
    async fn generate(&self, req: TextRequest) -> Result<TextResponse>;
}
// impls: GeminiTextProvider (default), (later) ClaudeTextProvider, OpenAITextProvider

// Capability 2: IMAGE — storyboard frames / stills
trait ImageProvider {
    async fn generate_image(&self, req: ImageRequest) -> Result<Vec<MediaAsset>>;
}
// impls: FalImageProvider, KieImageProvider, GoogleImagenProvider

// Capability 3: VIDEO — shot clips (async/long-running → job polling)
trait VideoProvider {
    async fn submit_video(&self, req: VideoRequest) -> Result<JobHandle>;
    async fn poll(&self, job: &JobHandle) -> Result<JobStatus>;
}
// impls: FalVideoProvider, KieVideoProvider, GoogleVeoProvider
```

**Provider registry & routing.** A config maps each capability to a chosen vendor + model, so the
user picks "Gemini for text, fal.ai for video" in Settings and the app routes accordingly. Defaults:

| Capability | Default vendor | Notes |
|---|---|---|
| Text (Prompt Pack brain) | **Google Gemini** | Confirm current model id (e.g. Gemini 2.5 Pro/Flash) at integration time |
| Image | fal.ai *or* Google Imagen / "Nano Banana" | both wired; user-selectable |
| Video | fal.ai *or* kie.ai *or* Google Veo | async job model; poll for completion |

> **Model IDs are intentionally not hardcoded in this plan** — vendor model names change often.
> The provider modules read model ids from config, with sane defaults verified at build time.

**Job model for video.** Video generation is slow and asynchronous. Rust submits the job, persists
a `Job` row in SQLite, polls in a background task, and emits Tauri events so the UI shows live
progress without blocking. Generated files download to the project folder on completion.

---

## 5. Data model (SQLite)

Local-first version of the spec's entities. Single-user, so no `users`/`teams`/`owner` for v1
(columns reserved for later sync). Hierarchy preserved: **Project → Scene → Shot → Prompt/Asset**.

```
projects(id, name, description, type, status, aspect_ratio, duration,
         emotional_tone, created_at, updated_at)
scenes(id, project_id→projects, name, intent, order_index)
shots(id, scene_id→scenes, number, name, purpose, duration, order_index,
      visual_description, transition, audio_notes, locked)
camera_plans(id, shot_id→shots, shot_type, lens, camera_height, framing,
             movement, composition, editorial_purpose, emotional_effect)
lighting_plans(id, shot_id→shots, light_quality, direction, color_temp,
               motivated_source, contrast_ratio, modifiers, atmospherics, separation)
prompts(id, shot_id→shots, kind[image|video|voiceover], target_model, body,
        negative_prompt, locked, version)
assets(id, project_id→projects, shot_id→shots?, kind, file_path, source_provider,
       source_model, job_id?, created_at)
jobs(id, provider, capability, status, request_json, result_json, created_at, updated_at)
prompt_packs(id, project_id→projects, content_json, version, created_at)
brand_kits(id, name, colors_json, fonts_json, logo_path, rules_json)
exports(id, project_id→projects, format, file_path, created_at)
settings(key, value)   -- non-secret config; secrets go to the OS keychain, not here
```

---

## 6. The Prompt Pack pipeline (core flow)

This is the differentiator and the first thing to make real. Input (idea/script/URL/dataset) →
full MotionForge Prompt Pack matching the system-prompt output structure.

```
User input
  → [Rust] TextProvider.generate() with the MotionForge system prompt + structured output schema
  → Gemini returns the Prompt Pack as structured JSON
  → persist prompt_packs + derived scenes/shots/camera_plans/lighting_plans/prompts
  → UI renders the three-panel workspace (Storyboard / Camera / Lighting / Prompt Builder)
  → every field editable, lockable, regenerable (per the "Editable Everything" principle)
  → image/video prompts can then be sent to fal.ai/kie.ai/Google to render media
  → Export (PDF/DOCX/MD/JSON) from Rust
```

We ask Gemini for **structured JSON** (a schema mirroring the Prompt Pack: creative direction,
style, shot breakdown, camera layer, lighting layer, image prompts, video prompts, combined prompt,
VO, audio, QC checklist) rather than free text — so the UI can render editable cards, not a wall of
prose. The QC checklist from the system prompt becomes an actual checklist in the UI.

---

## 7. Repository structure

```
wheelbarrow-motionforge/
├─ MOTIONFORGE_PLAN.md          # this file (source of truth)
├─ docs/                        # original specs kept for reference
├─ src/                         # React frontend
│  ├─ app/                      # three-panel shell, routing
│  ├─ features/
│  │  ├─ projects/  storyboard/  camera-director/
│  │  ├─ lighting-director/  prompt-builder/  exports/  settings/
│  ├─ components/ui/            # shadcn components
│  ├─ lib/ipc.ts                # typed wrappers over Tauri commands
│  ├─ store/                    # Zustand
│  └─ styles/                   # Tailwind + design tokens from the spec
├─ src-tauri/                   # Rust core
│  ├─ src/
│  │  ├─ main.rs  commands.rs
│  │  ├─ db/                    # SQLite + migrations
│  │  ├─ providers/             # text/ image/ video/ + registry
│  │  ├─ secrets.rs             # keychain
│  │  └─ export/                # pdf/docx/md/json
│  ├─ tauri.conf.json
│  └─ Cargo.toml
└─ package.json
```

Single codebase: `npm run dev` runs it in a browser (your "web app"); `npm run tauri build`
produces the Windows installer. No conversion step.

---

## 8. Build roadmap

| Phase | Deliverable | Proves |
|---|---|---|
| **0. Scaffold** | Tauri 2 + Vite + React + Tailwind + shadcn; three-panel dark shell; SQLite wired; Settings screen storing API keys in keychain | App launches as a Windows window |
| **1. Prompt Pack vertical slice** | Idea → Gemini (via Rust) → structured Prompt Pack → rendered editable in workspace; save/load project | The core concept works end-to-end |
| **2. Director layers** | Camera Director + Lighting Director views/cards, fully editable, regenerate-per-shot | Matches the spec's signature features |
| **3. Media generation** | Image provider (fal.ai / Google) wired; send image prompts → render storyboard frames into asset library | First real generated media |
| **4. Video + jobs** | Async video provider (fal.ai/kie.ai/Veo) with job polling + progress events | Long-running generation works |
| **5. Export** | PDF / DOCX / Markdown / JSON of the full pack | Shippable production package |
| **6. Polish** | Brand kits, asset library, templates, keyboard nav, accessibility, installer signing | Release-ready |

Phases 0–1 are the priority: they get you a double-clickable Windows app that does the one thing
that matters.

---

## 9. Future-proofing seams (so cloud features stay possible)

- Keep all data access behind a `repository` layer in Rust → can later point at a remote API.
- Reserve `owner_id`/`team_id` columns (nullable now) → multi-user later without a migration headache.
- Provider layer is already network code → a hosted backend could reuse the same traits.
- Prompt Pack stored as versioned JSON → enables diff/version-compare UX later.

---

## 10. Open decisions (need input before/while building)

1. **Exact Gemini model** for the text brain (Pro vs Flash) — Pro for quality, Flash for speed/cost.
2. **Primary image vendor** default — fal.ai vs Google Imagen/"Nano Banana".
3. **Primary video vendor** default — fal.ai vs kie.ai vs Google Veo.
4. **Voiceover** — in scope for v1, or text-only VO scripts first?
5. **App name** for the bundle/window title — "Wheelbarrow MotionForge" or "MotionForge Studio"?
6. **Installer signing** — needed for distribution; deferred but flag early (Windows SmartScreen).

---

## 11. Immediate next step

On approval of this plan, begin **Phase 0 (Scaffold)**: stand up the Tauri 2 + Vite + React +
Tailwind + shadcn project with the three-panel dark shell, SQLite, and a Settings screen that stores
provider API keys in the OS keychain — i.e. a Windows app that launches and is ready for the Phase 1
Prompt Pack wiring.
```
