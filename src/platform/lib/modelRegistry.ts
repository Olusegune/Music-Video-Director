// AI Model Ecosystem — registry + capability schema (Phase 1 foundation).
//
// The app is NOT designed around individual APIs. It is designed around:
//   Provider → Model Family → Model Variant → Workflow → Capability/Controls
//
// Everything (pickers, capability-driven UI, fallback, recommendations, model
// comparison) reads this registry. New providers/models are added here as data —
// never hardcoded into UI logic. `available` marks variants wired to a working
// adapter now; the rest are registered (visible, future-proofed) but flagged.

export type MediaKind = "image" | "video";

export type Workflow =
  // image
  | "text-to-image"
  | "image-to-image"
  | "character-ref"
  | "style-ref"
  | "pose-ref"
  | "inpaint"
  | "outpaint"
  | "upscale"
  | "variation"
  // video
  | "text-to-video"
  | "image-to-video"
  | "reference-to-video"
  | "start-end-frame"
  | "camera-motion"
  | "lipsync"
  | "beat-sync"
  | "video-upscale"
  | "video-extend";

export type ControlKey =
  | "aspect"
  | "resolution"
  | "quality"
  | "seed"
  | "variations"
  | "negativePrompt"
  | "referenceImages"
  | "referenceStrength"
  | "duration"
  | "fps"
  | "motion"
  | "camera"
  | "startFrame"
  | "endFrame"
  | "beatSync"
  | "lipSync";

export interface ModelVariant {
  /** Unique id, e.g. "fal:flux-pro" or "kie:seedance-2.0-lite". */
  id: string;
  provider: string; // display provider, e.g. "Fal.ai", "Kie AI"
  providerKey: string; // keychain id used by the Rust adapter ("fal","kie","openai"…)
  family: string; // "FLUX", "Seedance", "Kling", "Nano Banana"…
  variant: string; // "Pro", "2.0 Lite"…
  label: string; // display label for pickers
  kind: MediaKind;
  workflows: Workflow[];
  controls: ControlKey[];
  capabilities: string[]; // human-readable chips
  /** Provider routes to an underlying model (Kie/WaveSpeed/Fal aggregators). */
  aggregator?: boolean;
  /** No public API — copy prompt and import (Midjourney). */
  manual?: boolean;
  /** Wired to a working adapter today (vs registered/planned scaffold). */
  available: boolean;
  notes?: string;
}

const IMG_BASE: ControlKey[] = ["aspect", "resolution", "quality", "seed", "variations", "negativePrompt", "referenceImages"];
const VID_BASE: ControlKey[] = ["aspect", "resolution", "duration", "fps", "motion", "camera", "seed", "referenceImages"];

const v = (p: Partial<ModelVariant> & Pick<ModelVariant, "id" | "provider" | "providerKey" | "family" | "variant" | "kind">): ModelVariant => ({
  label: `${p.provider} · ${p.family} ${p.variant}`.replace(/\s+/g, " ").trim(),
  workflows: [],
  controls: p.kind === "image" ? IMG_BASE : VID_BASE,
  capabilities: [],
  available: false,
  ...p,
});

// ---------------------------------------------------------------------------
// The registry. Available = adapter wired today; others are future-proof stubs.
// ---------------------------------------------------------------------------

export const MODEL_REGISTRY: ModelVariant[] = [
  // ---- Images (wired) — controls reflect each provider's REAL capabilities ----
  v({ id: "openai:gpt-image", provider: "OpenAI", providerKey: "openai", family: "GPT Image", variant: "1", kind: "image",
      label: "OpenAI · GPT Image (→ DALL·E 3)", available: true,
      workflows: ["text-to-image", "image-to-image", "character-ref", "variation"],
      controls: ["aspect", "resolution", "quality", "variations", "negativePrompt", "referenceImages"], // gpt-image-1 has no seed
      capabilities: ["Text-to-Image", "Image edit", "DALL·E 3 fallback"] }),
  v({ id: "google:nano-banana", provider: "Google", providerKey: "google_imagen", family: "Nano Banana", variant: "/ Gemini", kind: "image",
      label: "Google · Nano Banana / Gemini", available: true,
      workflows: ["text-to-image", "image-to-image", "character-ref", "style-ref"],
      controls: ["aspect", "negativePrompt", "referenceImages"], // generateContent: no seed/variations/size presets
      capabilities: ["Text-to-Image", "Reference images", "Imagen fallback"] }),
  v({ id: "fal:flux", provider: "Fal.ai", providerKey: "fal", family: "FLUX", variant: "", kind: "image",
      label: "Fal.ai · FLUX", available: true, aggregator: true,
      workflows: ["text-to-image", "image-to-image", "character-ref", "style-ref", "variation"],
      controls: ["aspect", "resolution", "seed", "variations", "negativePrompt", "referenceImages", "referenceStrength"],
      capabilities: ["Text-to-Image", "Image-to-Image", "Seed", "Reference strength"] }),
  v({ id: "kie:image", provider: "Kie AI", providerKey: "kie", family: "GPT Image / Nano Banana", variant: "", kind: "image",
      label: "Kie AI · Image models", available: true, aggregator: true,
      workflows: ["text-to-image", "image-to-image"],
      controls: ["aspect", "resolution", "seed", "negativePrompt"],
      capabilities: ["Text-to-Image", "Aggregator"] }),
  v({ id: "stability:sdxl", provider: "Stability", providerKey: "stability", family: "SDXL", variant: "", kind: "image",
      label: "Stability · SDXL", available: true,
      workflows: ["text-to-image"],
      controls: ["aspect", "resolution", "seed", "negativePrompt"],
      capabilities: ["Text-to-Image"] }),
  v({ id: "midjourney:v6", provider: "Midjourney", providerKey: "midjourney", family: "Midjourney", variant: "", kind: "image",
      label: "Midjourney (copy-prompt)", available: true, manual: true,
      workflows: ["text-to-image", "character-ref", "style-ref"],
      controls: ["aspect"], // manual copy-prompt — only the prompt + aspect matter
      capabilities: ["Stylized", "Character design", "Manual import"] }),

  // ---- Images (registered / planned) ----
  v({ id: "fal:flux-pro", provider: "Fal.ai", providerKey: "fal", family: "FLUX", variant: "Pro", kind: "image", aggregator: true,
      workflows: ["text-to-image", "image-to-image", "character-ref", "style-ref", "upscale"], capabilities: ["High quality", "Character ref"] }),
  v({ id: "fal:flux-ultra", provider: "Fal.ai", providerKey: "fal", family: "FLUX", variant: "Ultra", kind: "image", aggregator: true,
      workflows: ["text-to-image", "image-to-image", "style-ref", "upscale"], capabilities: ["Max quality", "Upscale"] }),
  v({ id: "fal:flux-kontext", provider: "Fal.ai", providerKey: "fal", family: "FLUX", variant: "Kontext", kind: "image", aggregator: true,
      workflows: ["image-to-image", "character-ref"], capabilities: ["Character consistency"] }),
  v({ id: "grok:image", provider: "Grok / xAI", providerKey: "grok", family: "Grok", variant: "Image", kind: "image",
      available: true, workflows: ["text-to-image", "variation"],
      controls: ["variations"], // xAI image API takes prompt + n only
      capabilities: ["Text-to-Image", "Concept art", "Stylized"] }),
  v({ id: "recraft:v3", provider: "Recraft", providerKey: "recraft", family: "Recraft", variant: "v3", kind: "image",
      workflows: ["text-to-image", "style-ref"], capabilities: ["Vector / design"] }),
  v({ id: "ideogram:v2", provider: "Ideogram", providerKey: "ideogram", family: "Ideogram", variant: "v2", kind: "image",
      workflows: ["text-to-image"], capabilities: ["Typography"] }),
  v({ id: "wavespeed:image", provider: "WaveSpeed", providerKey: "wavespeed", family: "Image", variant: "", kind: "image", aggregator: true,
      workflows: ["text-to-image", "image-to-image"], capabilities: ["Fast", "Fallback"] }),
  v({ id: "local:image", provider: "Local", providerKey: "local", family: "Local", variant: "Image", kind: "image",
      workflows: ["text-to-image", "image-to-image"], capabilities: ["Offline"] }),
  v({ id: "manual:image", provider: "Manual Upload", providerKey: "manual", family: "Upload", variant: "Image", kind: "image", manual: true,
      workflows: [], capabilities: ["Import your own"] , available: true }),

  // ---- Video (wired) ----
  v({ id: "fal:video", provider: "Fal.ai", providerKey: "fal", family: "LTX / Kling / Seedance", variant: "", kind: "video", available: true, aggregator: true,
      workflows: ["text-to-video", "image-to-video", "camera-motion"],
      controls: ["aspect", "resolution", "duration", "fps", "motion", "camera", "seed", "referenceImages"],
      capabilities: ["Text-to-Video", "Image-to-Video", "Model routing"] }),
  v({ id: "kie:veo", provider: "Kie AI", providerKey: "kie", family: "Veo", variant: "3 Fast", kind: "video", available: true, aggregator: true,
      workflows: ["text-to-video", "image-to-video"],
      controls: ["aspect", "resolution", "duration", "camera", "referenceImages"],
      capabilities: ["Text-to-Video", "Image-to-Video"] }),
  v({ id: "google:veo", provider: "Google", providerKey: "google_veo", family: "Veo", variant: "", kind: "video", available: true,
      workflows: ["text-to-video", "image-to-video"],
      controls: ["aspect", "resolution", "duration", "camera"],
      capabilities: ["Cinematic", "Photoreal"] }),
  v({ id: "replicate:video", provider: "Replicate", providerKey: "replicate", family: "Kling / Luma / Minimax", variant: "", kind: "video", available: true, aggregator: true,
      workflows: ["text-to-video", "image-to-video"],
      controls: ["aspect", "resolution", "duration", "motion", "referenceImages"],
      capabilities: ["Model routing"] }),

  // ---- Video (registered / planned families) ----
  v({ id: "kie:seedance-2.0", provider: "Kie AI", providerKey: "kie", family: "Seedance", variant: "2.0", kind: "video", aggregator: true,
      workflows: ["text-to-video", "image-to-video", "reference-to-video", "start-end-frame", "camera-motion", "beat-sync", "lipsync"],
      controls: [...VID_BASE, "startFrame", "endFrame", "beatSync", "lipSync", "referenceStrength"],
      capabilities: ["Character ref", "Pose ref", "Beat sync", "Dance motion", "Multi-image"] }),
  v({ id: "kie:seedance-2.0-lite", provider: "Kie AI", providerKey: "kie", family: "Seedance", variant: "2.0 Lite", kind: "video", aggregator: true,
      workflows: ["text-to-video", "image-to-video"], capabilities: ["Fast draft", "Lower cost"] }),
  v({ id: "kie:seedance-2.0-mini", provider: "Kie AI", providerKey: "kie", family: "Seedance", variant: "2.0 Mini", kind: "video", aggregator: true,
      workflows: ["text-to-video"], capabilities: ["Fastest preview", "Short clips"] }),
  v({ id: "kie:kling-pro", provider: "Kie AI", providerKey: "kie", family: "Kling", variant: "Pro", kind: "video", aggregator: true,
      workflows: ["text-to-video", "image-to-video", "reference-to-video", "camera-motion"],
      capabilities: ["Character consistency", "Camera motion"] }),
  v({ id: "wavespeed:kling", provider: "WaveSpeed", providerKey: "wavespeed", family: "Kling", variant: "", kind: "video", aggregator: true,
      workflows: ["text-to-video", "image-to-video"], capabilities: ["Fast", "Fallback"] }),
  v({ id: "wavespeed:seedance", provider: "WaveSpeed", providerKey: "wavespeed", family: "Seedance", variant: "", kind: "video", aggregator: true,
      workflows: ["text-to-video", "image-to-video"], capabilities: ["Fast", "Fallback"] }),
  v({ id: "happyhorse:video", provider: "Happy Horse", providerKey: "happyhorse", family: "Happy Horse", variant: "Video", kind: "video",
      workflows: ["text-to-video", "image-to-video", "reference-to-video", "beat-sync", "lipsync"],
      controls: [...VID_BASE, "beatSync", "lipSync", "referenceStrength"],
      capabilities: ["Performance motion", "Dance", "Music-video", "Character consistency"] }),
  v({ id: "runway:gen", provider: "Runway", providerKey: "runway", family: "Gen", variant: "", kind: "video",
      workflows: ["text-to-video", "image-to-video"], capabilities: ["Cinematic", "Photoreal"] }),
  v({ id: "luma:dream", provider: "Luma", providerKey: "luma", family: "Dream Machine", variant: "", kind: "video",
      workflows: ["text-to-video", "image-to-video"], capabilities: ["Photoreal", "Smooth"] }),
  v({ id: "pika:video", provider: "Pika", providerKey: "pika", family: "Pika", variant: "", kind: "video",
      workflows: ["text-to-video", "image-to-video"], capabilities: ["Fast preview"] }),
  v({ id: "minimax:video", provider: "MiniMax", providerKey: "minimax", family: "MiniMax", variant: "", kind: "video",
      workflows: ["text-to-video", "image-to-video"], capabilities: ["Stylized"] }),
  v({ id: "grok:video", provider: "Grok / xAI", providerKey: "grok", family: "Grok", variant: "Video", kind: "video",
      workflows: ["text-to-video"], capabilities: ["Creative"] }),
  v({ id: "local:video", provider: "Local", providerKey: "local", family: "Local", variant: "Video", kind: "video",
      workflows: ["text-to-video", "image-to-video"], capabilities: ["Offline"] }),
  v({ id: "manual:video", provider: "Manual Upload", providerKey: "manual", family: "Upload", variant: "Video", kind: "video", manual: true, available: true,
      workflows: [], capabilities: ["Import your own"] }),
];

// ---------------------------------------------------------------------------
// Query API — the seam every consumer (pickers, capability UI, fallback) uses.
// ---------------------------------------------------------------------------

export interface ProviderInfo {
  id: string; // providerKey
  label: string;
  kind: "direct" | "aggregator";
  variants: ModelVariant[];
}

export function listProviders(): ProviderInfo[] {
  const map = new Map<string, ProviderInfo>();
  for (const m of MODEL_REGISTRY) {
    let p = map.get(m.providerKey);
    if (!p) {
      p = { id: m.providerKey, label: m.provider, kind: m.aggregator ? "aggregator" : "direct", variants: [] };
      map.set(m.providerKey, p);
    }
    if (m.aggregator) p.kind = "aggregator";
    p.variants.push(m);
  }
  return [...map.values()];
}

export function variantsForKind(kind: MediaKind, opts?: { availableOnly?: boolean }): ModelVariant[] {
  return MODEL_REGISTRY.filter((m) => m.kind === kind && (!opts?.availableOnly || m.available));
}

export function variantsForWorkflow(wf: Workflow, opts?: { availableOnly?: boolean }): ModelVariant[] {
  return MODEL_REGISTRY.filter((m) => m.workflows.includes(wf) && (!opts?.availableOnly || m.available));
}

export function findVariant(id: string): ModelVariant | undefined {
  return MODEL_REGISTRY.find((m) => m.id === id);
}

export function controlsFor(id: string): ControlKey[] {
  return findVariant(id)?.controls ?? [];
}

/** Controls for a provider+kind (panels key models by providerKey). Picks the
 *  representative wired variant; unknown providers (e.g. "auto"/"custom") get
 *  the full default set so nothing is hidden unexpectedly. */
export function controlsForProviderKey(providerKey: string, kind: MediaKind): ControlKey[] {
  const matches = MODEL_REGISTRY.filter((m) => m.providerKey === providerKey && m.kind === kind);
  const pick = matches.find((m) => m.available) ?? matches[0];
  return pick ? pick.controls : kind === "image" ? IMG_BASE : VID_BASE;
}

export function supportsControl(id: string, c: ControlKey): boolean {
  return controlsFor(id).includes(c);
}

/** Register a provider/model at runtime (future installable providers). */
export function registerVariants(extra: ModelVariant[]): void {
  for (const m of extra) {
    const i = MODEL_REGISTRY.findIndex((x) => x.id === m.id);
    if (i >= 0) MODEL_REGISTRY[i] = m;
    else MODEL_REGISTRY.push(m);
  }
}
