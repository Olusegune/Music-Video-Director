# Data Model & IPC API

## 1. SQLite schema (current)

Single DB file in the app data dir. Created on first run by `db::init`.

```sql
projects(id PK, name, description, type, status, aspect_ratio, duration,
         emotional_tone, created_at, updated_at)

prompt_packs(id PK, project_id → projects, content_json TEXT, version INT, created_at)
  -- the full PromptPack is stored as JSON; "latest" = newest created_at.
  -- version history = multiple rows per project (see versions commands).

assets(id PK, project_id → projects, shot_number INT?, kind TEXT['image'|'video'],
       file_path TEXT, source_provider TEXT, created_at)

brand_kits(id PK, name, colors_json, fonts, voice, visual_rules)

settings(key PK, value)            -- non-secret config only

scenes(...)   shots(...)           -- present but UNUSED (pack lives as JSON). See debt note.
```

API keys are **not** in SQLite — they live in the OS keychain (`secrets.rs`,
service `ai.wheelbarrow.motionforge`, keyed by provider id).

## 2. Core TypeScript types (`src/lib/types.ts`)

```ts
type ProjectType = "SaaS Product" | "Social Ad" | "AI Tool" | "Documentary"
  | "Explainer" | "Education" | "Product Launch" | "Finance" | "Historical" | "Custom";

interface Project {
  id; name; description; type: ProjectType; status; aspectRatio; duration;
  emotionalTone; createdAt; updatedAt;
}

interface PromptPack {
  creativeDirection: { workingTitle; goal; audience; duration; aspectRatio;
                       emotionalTone; recommendedModels: string[] };
  style: { visualLanguage; colorPalette: string[]; typography; materials; mood; atmosphere };
  shots: ShotBreakdown[];
  qcChecklist: { label; checked: boolean }[];
}

interface ShotBreakdown {
  number; name; purpose; duration; visualDescription;
  cameraMovement; transition; audio; locked: boolean;
  imageUrl: string;   // displayable src for the frame ("" until generated)
  videoUrl: string;   // displayable src for the clip
  camera:   CameraPlan;
  lighting: LightingPlan;
  // FR-16 ADDS: imageGen?: ShotGenSettings; videoGen?: ShotGenSettings;  (see feature doc)
}

interface CameraPlan   { shotType; lens; cameraHeight; cameraAngle; movement;
                         composition; emotionalPurpose; editorialPurpose; notes }
interface LightingPlan { sceneIntent; visualStrategy; keyLight; fillLight; rimLight;
                         colorTemperature; contrastRatio; atmosphere; depthSeparation;
                         continuityRules }

interface BrandKit { id; name; colors: string[]; fonts; voice; visualRules }
```

> Rust mirrors these in `models.rs` with `#[serde(rename_all = "camelCase")]` and
> `#[serde(default)]` on newer fields so older saved packs deserialize cleanly. **When you
> add fields to the pack, add them in BOTH `types.ts` and `models.rs`** (with serde default),
> or `save_pack` will silently strip them on round-trip.

## 3. IPC command reference

All called via the typed wrapper in `src/lib/ipc.ts`, which also provides a **browser mock**
(localStorage) so the UI runs in a plain browser during dev. Tauri auto-maps JS camelCase
args → Rust snake_case params.

### Projects
| Command | Args | Returns |
|---|---|---|
| `list_projects` | – | `Project[]` |
| `create_project` | `input: NewProject` | `Project` |
| `delete_project` | `id` | – |
| `duplicate_project` | `projectId` | `Project` *(batch-2, partial)* |

### Prompt packs
| Command | Args | Returns |
|---|---|---|
| `generate_prompt_pack` | `projectId, input` | `PromptPack` |
| `get_latest_pack` | `projectId` | `PromptPack \| null` |
| `save_pack` | `projectId, pack` | – |

### Versions *(batch-2, partial)*
| `list_versions` | `projectId` | `VersionMeta[]` |
| `snapshot_version` | `projectId` | – |
| `restore_version` | `versionId` | `PromptPack` |

### Generation (to be reworked for FR-15/16)
| Command | Args | Returns |
|---|---|---|
| `generate_shot_image` | `projectId, shotNumber, prompt` | local path → asset src |
| `import_shot_image` | `projectId, shotNumber, dataBase64, ext` | local path → asset src |
| `generate_shot_video` | `projectId, shotNumber, prompt` | local path → asset src |

> **Target:** replace the `prompt`-only signatures with a `GenerationRequest`
> (model + references + params). See [FEATURE_MODEL_SELECTION.md](FEATURE_MODEL_SELECTION.md).

### Provider keys
| `get_provider_key_statuses` | – | `ProviderKeyStatus[]` (presence only) |
| `set_provider_key` | `provider, key` | – |
| `clear_provider_key` | `provider` | – |

### Brand kits / export / files
| `list_brand_kits` / `save_brand_kit` / `delete_brand_kit` | … | … |
| `export_project` | `projectId, format: 'pdf'\|'docx'\|'md'\|'json'` | output path |
| `save_project_file` | `name, contents` | output path *(batch-2, partial)* |

## 4. Portability (`.mfp` project files) — design note

A `.mfp` is intended to be a portable project bundle. Two-stage plan:
1. **JSON bundle (in progress):** `{ app, version, project, pack, style, brandKitId }`.
   Round-trips all creative data; on the same machine, media paths still resolve.
2. **Media bundling (do next):** zip the project's `assets` files alongside the JSON and
   **rewrite media references to relative paths** on export, remapping to new absolute
   paths on import. This requires storing **raw asset references** in the pack rather than
   display URLs (see Architecture debt). Recommended before cross-machine sharing ships.
