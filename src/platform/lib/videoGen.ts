// Selectable video models for per-shot clip generation in the MV Director.
//
// Mirrors IMAGE_MODELS in imageGen.ts. `providerKey` is the keychain id the Rust
// `generate_mv_shot_video` command routes on; an empty key = "auto" (first
// configured video provider). Only providers with a wired Rust adapter today.

import type { GenerationSpec } from "@/platform/lib/generationSpec";

export interface VideoModel {
  id: string;
  label: string;
  /** Keychain provider id the Rust core routes on ("" = auto). */
  providerKey: string;
  /** The provider's own model slug, passed to the aggregator adapter. */
  apiModel?: string;
  /** Provider ids whose configured key marks this model "ready". */
  keyIds: string[];
  hint: string;
  /** Multimodal reference capabilities — drives which upload slots the UI shows. */
  caps?: {
    endFrame?: boolean;
    audioRef?: boolean;
    videoRef?: boolean;
    imageRef?: boolean;
  };
}

/** Reference capabilities for a video model id (empty if none/unknown). */
export function videoCaps(id: string): NonNullable<VideoModel["caps"]> {
  return findVideoModel(id).caps ?? {};
}

// Priority order (top = default): the models the director asked for first,
// routed through the prioritized aggregators (Kie · Fal · WaveSpeed). The
// `apiModel` slug is what the aggregator adapter sends — confirm against the
// provider's current catalog if a model id changes.
export const VIDEO_MODELS: VideoModel[] = [
  {
    id: "fal-seedance",
    label: "★ Seedance 2.0 (Fal · with audio)",
    providerKey: "fal",
    apiModel: "bytedance/seedance-2.0/image-to-video",
    keyIds: ["fal"],
    hint: "Seedance 2.0 i2v + synchronized audio via fal.ai",
    caps: { endFrame: true },
  },
  {
    id: "fal-seedance-fast",
    label: "Seedance 2.0 Fast (Fal)",
    providerKey: "fal",
    apiModel: "bytedance/seedance-2.0/fast/image-to-video",
    keyIds: ["fal"],
    hint: "Faster/cheaper Seedance 2.0 via fal.ai",
    caps: { endFrame: true },
  },
  {
    id: "fal-seedance-v1",
    label: "Seedance 1 Pro (Fal)",
    providerKey: "fal",
    apiModel: "fal-ai/bytedance/seedance/v1/pro/image-to-video",
    keyIds: ["fal"],
    hint: "Older Seedance v1 Pro (no audio) — known-working fallback",
  },
  {
    id: "kie-seedance2",
    label: "★ Seedance 2.0 (Kie)",
    providerKey: "kie",
    apiModel: "bytedance/seedance-2",
    keyIds: ["kie"],
    hint: "Seedance 2.0 via Kie",
    caps: { endFrame: true, audioRef: true, videoRef: true, imageRef: true },
  },
  {
    id: "wavespeed-seedance",
    label: "Seedance 2.0 (WaveSpeed)",
    providerKey: "wavespeed",
    apiModel: "bytedance/seedance-2.0/image-to-video",
    keyIds: ["wavespeed"],
    hint: "Seedance 2.0 i2v via WaveSpeed",
    caps: { endFrame: true },
  },
  {
    id: "wavespeed-seedance-fast",
    label: "Seedance 2.0 Fast (WaveSpeed)",
    providerKey: "wavespeed",
    apiModel: "bytedance/seedance-2.0-fast/image-to-video",
    keyIds: ["wavespeed"],
    hint: "Faster, cheaper Seedance via WaveSpeed",
    caps: { endFrame: true },
  },
  {
    id: "kie-kling3",
    label: "★ Kling 3.0 (Kie)",
    providerKey: "kie",
    apiModel: "kling-3.0/video",
    keyIds: ["kie"],
    hint: "Kling 3.0 — newest, image+text-to-video via Kie",
    caps: { endFrame: true },
  },
  {
    id: "wavespeed-kling3",
    label: "★ Kling 3.0 Pro (WaveSpeed)",
    providerKey: "wavespeed",
    apiModel: "kwaivgi/kling-v3.0-pro/image-to-video",
    keyIds: ["wavespeed"],
    hint: "Kling 3.0 Pro i2v via WaveSpeed",
  },
  {
    id: "kie-kling",
    label: "Kling 2.6 (Kie)",
    providerKey: "kie",
    apiModel: "kling-2.6/image-to-video",
    keyIds: ["kie"],
    hint: "Kling 2.6 i2v via Kie",
    caps: { endFrame: true },
  },
  {
    id: "wavespeed-kling",
    label: "Kling 2.6 Pro (WaveSpeed)",
    providerKey: "wavespeed",
    apiModel: "kwaivgi/kling-v2.6-pro/image-to-video",
    keyIds: ["wavespeed"],
    hint: "Kling 2.6 Pro i2v via WaveSpeed",
  },
  {
    id: "fal-kling",
    label: "Kling (Fal)",
    providerKey: "fal",
    apiModel: "fal-ai/kling-video/v1.6/pro/image-to-video",
    keyIds: ["fal"],
    hint: "Kling Pro via fal.ai",
  },
  {
    id: "grok-video",
    label: "Grok Video (xAI)",
    providerKey: "grok",
    apiModel: "grok-video",
    keyIds: ["grok"],
    hint: "xAI video where available",
  },
  {
    id: "kie-veo",
    label: "Veo (Kie)",
    providerKey: "kie",
    apiModel: "veo3-fast",
    keyIds: ["kie"],
    hint: "Veo via Kie",
  },
  {
    id: "google_veo",
    label: "Google Veo (direct)",
    providerKey: "google_veo",
    keyIds: ["google_veo"],
    hint: "Google Veo (text-to-video)",
  },
  {
    id: "fal",
    label: "fal.ai (auto routing)",
    providerKey: "fal",
    keyIds: ["fal"],
    hint: "fal.ai default video model",
  },
  {
    id: "replicate",
    label: "Replicate (Kling · Luma · Minimax)",
    providerKey: "replicate",
    keyIds: ["replicate"],
    hint: "Hosted video models on Replicate",
  },
  {
    id: "auto",
    label: "Auto (first configured)",
    providerKey: "",
    keyIds: ["kie", "fal", "wavespeed", "google_veo", "replicate"],
    hint: "Balanced pick from your configured video keys",
  },
];

export function findVideoModel(id: string): VideoModel {
  return VIDEO_MODELS.find((m) => m.id === id) ?? VIDEO_MODELS[0];
}

export function videoSpecModel(spec: GenerationSpec): VideoModel {
  if (spec.capability !== "video") {
    throw new Error(
      `Video generation requires a video GenerationSpec, received ${spec.capability}.`
    );
  }
  return spec.modelHint ? findVideoModel(spec.modelHint) : VIDEO_MODELS[0];
}
