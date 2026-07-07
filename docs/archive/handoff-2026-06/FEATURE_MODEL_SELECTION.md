# Feature Spec — Per-Shot Model Selection + References

**Priority:** High (headline of this handoff). **Touches:** data model, provider layer,
command surface, generation UI.

## 1. Problem

Today each shot is generated with a **single hardcoded model** (fal FLUX for images, fal
LTX for video), chosen only by which API key exists. There is no way to:
- pick a **different model per shot** (e.g. Imagen for one frame, FLUX for another; Kling
  vs Veo vs Runway vs Seedance for a clip),
- pass **reference inputs** (init image, style/character reference, control image, start/end
  frame, reference video, audio), or
- set **model-specific parameters** (aspect ratio, duration, resolution, steps, seed, etc.).

## 2. Goal

For **each shot**, for both **image** and **video**, the user can:
1. choose a **model** from a catalog of supported models,
2. attach **reference assets** in the slots that model supports (UI adapts to the model),
3. set **model-specific parameters**,
with a **project-level default** that each shot inherits and can override.

The set of reference slots and parameters shown is **driven by the selected model's
capability manifest** (progressive disclosure — only valid inputs appear).

## 3. Model Catalog (capability manifest)

A declarative catalog is the backbone. Define it in one place (shared TS + mirrored Rust,
or generated). Each entry declares what the model accepts.

```ts
type Capability = "image" | "video";
type RefRole =
  | "init"        // image-to-image / image-to-video starting image
  | "style"       // style reference
  | "character"   // character/identity reference (IP-adapter-like)
  | "subject"     // product/object reference
  | "control"     // pose / depth / edge / scribble control image
  | "startFrame"  // video first frame
  | "endFrame"    // video last frame
  | "refVideo"    // motion/reference video
  | "audio";      // audio/voice reference (lip-sync etc.)

interface RefSlot {
  role: RefRole;
  label: string;
  accept: ("image" | "video" | "audio")[];
  required?: boolean;
  max?: number;          // how many refs in this slot (default 1)
}

interface ParamSpec {
  key: string;                         // e.g. "aspectRatio", "duration", "seed"
  label: string;
  type: "enum" | "number" | "boolean" | "string";
  options?: (string | number)[];       // for enum
  min?: number; max?: number; step?: number;
  default?: string | number | boolean;
}

interface ModelDef {
  id: string;                  // stable internal id, e.g. "fal/flux-1.1-pro"
  provider: ProviderId;        // "fal" | "google" | "kie" | "runway" | ...
  label: string;               // "FLUX 1.1 Pro"
  capability: Capability;      // "image" | "video"
  endpointModel: string;       // provider's own model id / route
  refSlots: RefSlot[];         // empty array = text-only
  params: ParamSpec[];
  notes?: string;
}

const MODEL_CATALOG: ModelDef[] = [ /* … */ ];
```

### Example entries (illustrative — confirm exact provider ids/params at build time)

```ts
// IMAGE
{ id:"fal/flux-schnell", provider:"fal", label:"FLUX schnell (fast)", capability:"image",
  endpointModel:"fal-ai/flux/schnell", refSlots:[],
  params:[{key:"aspectRatio",label:"Aspect",type:"enum",options:["16:9","1:1","9:16"],default:"16:9"}] }

{ id:"fal/flux-dev-i2i", provider:"fal", label:"FLUX dev (image-to-image)", capability:"image",
  endpointModel:"fal-ai/flux/dev/image-to-image",
  refSlots:[{role:"init",label:"Init image",accept:["image"]},
            {role:"style",label:"Style ref",accept:["image"],max:1}],
  params:[{key:"strength",label:"Strength",type:"number",min:0,max:1,step:0.05,default:0.85}] }

{ id:"google/imagen-3", provider:"google", label:"Imagen 3", capability:"image",
  endpointModel:"imagen-3.0-generate-002", refSlots:[],
  params:[{key:"aspectRatio",label:"Aspect",type:"enum",options:["16:9","1:1","9:16"],default:"16:9"}] }

// VIDEO
{ id:"fal/kling-i2v", provider:"fal", label:"Kling (image→video)", capability:"video",
  endpointModel:"fal-ai/kling-video/v1/standard/image-to-video",
  refSlots:[{role:"startFrame",label:"Start frame",accept:["image"],required:true},
            {role:"endFrame",label:"End frame",accept:["image"]}],
  params:[{key:"duration",label:"Duration (s)",type:"enum",options:[5,10],default:5}] }

{ id:"google/veo-3", provider:"google", label:"Veo 3", capability:"video",
  endpointModel:"veo-3.0-generate-preview",
  refSlots:[{role:"init",label:"Reference image",accept:["image"]}],
  params:[{key:"aspectRatio",label:"Aspect",type:"enum",options:["16:9","9:16"],default:"16:9"}] }

// Add Runway, Seedance, Pika, Luma, etc. as ModelDef entries — no new code, just data.
```

> Keep the catalog **data-driven**. Adding a model = adding a `ModelDef` + (only if the
> provider is new) a provider adapter. Do **not** hardcode model logic in the UI.

## 4. Data model additions

Add per-shot generation settings (image + video) to `ShotBreakdown` (and mirror in Rust
`models.rs` with serde defaults):

```ts
interface ShotReference {
  role: RefRole;
  assetId: string;     // points to an asset in the project library / uploaded file
  // resolved at request time to a path/url/bytes for the provider
}

interface ShotGenSettings {
  modelId: string;                       // from MODEL_CATALOG; "" = use project default
  params: Record<string, string | number | boolean>;
  references: ShotReference[];
}

interface ShotBreakdown {
  /* …existing… */
  imageGen?: ShotGenSettings;
  videoGen?: ShotGenSettings;
}
```

Project-level defaults (store on the project or in project settings):

```ts
interface ProjectGenDefaults {
  imageModelId: string; imageParams: Record<string, ...>;
  videoModelId: string; videoParams: Record<string, ...>;
}
```

Resolution rule: **effective settings = project defaults merged with shot overrides**
(shot wins per-key). Empty `modelId` on a shot ⇒ inherit project default.

## 5. Normalized generation request (Rust)

Replace the `prompt`-only command/trait signatures with:

```rust
struct ResolvedRef { role: String, bytes: Vec<u8>, mime: String }  // already loaded from disk

struct GenerationRequest {
    model: ModelDef,                 // resolved from catalog by id
    prompt: String,
    references: Vec<ResolvedRef>,
    params: serde_json::Value,       // validated against ModelDef.params
}

trait ImageProvider { async fn generate_image(&self, req: &GenerationRequest) -> Result<Vec<u8>>; }
trait VideoProvider { async fn generate_video(&self, req: &GenerationRequest) -> Result<Vec<u8>>; }
```

Command flow for `generate_shot_image` / `generate_shot_video`:
1. Receive `projectId, shotNumber, modelId, prompt, references: [{role, assetId}], params`.
2. Resolve `ModelDef` from catalog by `modelId`; validate refs/params against its manifest.
3. Load each reference asset's **bytes** from disk (assets table → file_path).
4. Build `GenerationRequest`; dispatch to the provider adapter for `model.provider`.
5. Provider maps the request to its API (see §6), returns bytes.
6. Persist bytes to assets dir, insert `assets` row (record `modelId` in `source_provider`/
   a new `model` column), return path → asset src.

## 6. Provider adapter contract (reference handling)

Each provider adapter maps `GenerationRequest` to its API. **References need provider-specific
delivery:**
- **fal.ai:** most image/video endpoints take **URLs**. Upload reference bytes to **fal
  storage** first (`POST https://rest.alpha.fal.ai/storage/upload` or the documented upload
  endpoint) to obtain a URL, then pass as `image_url` / `start_image_url` / etc. Video uses
  the **queue API** (submit → poll status → fetch result → download) — already implemented
  in `video.rs`; generalize it.
- **Google (Imagen/Veo):** Imagen `:predict` takes a base64 prompt image where supported;
  Veo `:predictLongRunning` (operations polling) — already drafted in `video.rs`; confirm
  reference-image support and shape.
- **Runway / Kling / Seedance / Pika / Luma:** add adapters as needed; same contract.

Adapter responsibilities: map `RefRole → provider field`, enforce `ModelDef` constraints,
translate `params` keys, normalize errors into clear messages.

## 7. UI / UX

### Where
A **"Generation" section per shot** (in the shot card, or a dedicated panel in the
**Prompts** tab / a right-inspector when a shot is selected). Two sub-sections: **Image**
and **Video**. Plus a **project Generation Defaults** panel (in project settings or the
workspace header).

### Behavior (capability-driven, progressive disclosure)
1. **Model dropdown** (grouped by provider; only models whose provider has a key set are
   enabled, others show "needs key" → link to Settings).
2. On model select, render **only that model's** `refSlots` and `params`:
   - Each ref slot: a drop-zone / picker that accepts the declared types, sourced from
     **upload** or the **project libraries / Asset Library** (and, later, Character /
     Environment / Prop libraries). Show thumbnails; allow remove; enforce `max`/`required`.
   - Params: render controls from `ParamSpec` (enum→select, number→slider/stepper, etc.).
3. **Generate** button is disabled until required refs/params are satisfied; show the
   resolved model + provider; on run, show progress (image: spinner; video: queued →
   processing → downloading via job status).
4. **Inheritance affordance:** shot shows "Using project default (FLUX schnell)" until the
   user overrides; a "reset to default" control.
5. Keep it **uncluttered**: collapse the Generation section by default; expand on demand.

### Acceptance criteria
- [ ] User can set a different image model and a different video model **per shot**.
- [ ] Reference slots shown **match the selected model**; invalid inputs can't be attached.
- [ ] References can come from upload **and** from existing project assets.
- [ ] Params validate against the manifest; out-of-range values are prevented.
- [ ] Project defaults apply to new shots; per-shot overrides win; reset works.
- [ ] A model whose provider key is missing is disabled with a clear path to Settings.
- [ ] Generation records which `modelId` produced each asset (for the Asset Library/export).
- [ ] Adding a new model = adding a catalog entry (+ adapter only if new provider).

## 8. Build order (suggested)
1. Define `MODEL_CATALOG` (TS) + mirror minimal manifest in Rust; seed with current models.
2. Add `ShotGenSettings` + `ProjectGenDefaults` to types/models (serde defaults).
3. Rework command + traits to `GenerationRequest`; generalize fal storage upload + queue.
4. Build the per-shot Generation UI (model picker → dynamic slots/params).
5. Wire references from upload + Asset Library (Character/Env/Prop libraries later feed in).
6. Persist `modelId` on assets; surface in Asset Library/export.
