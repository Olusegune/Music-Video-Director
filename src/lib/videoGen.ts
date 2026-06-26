// Selectable video models for per-shot clip generation in the MV Director.
//
// Mirrors IMAGE_MODELS in imageGen.ts. `providerKey` is the keychain id the Rust
// `generate_mv_shot_video` command routes on; an empty key = "auto" (first
// configured video provider). Only providers with a wired Rust adapter today.

export interface VideoModel {
  id: string;
  label: string;
  /** Keychain provider id the Rust core routes on ("" = auto). */
  providerKey: string;
  /** Provider ids whose configured key marks this model "ready". */
  keyIds: string[];
  hint: string;
}

export const VIDEO_MODELS: VideoModel[] = [
  {
    id: "auto",
    label: "Auto (first configured)",
    providerKey: "",
    keyIds: ["fal", "google_veo", "replicate", "kie"],
    hint: "Balanced pick from your configured video keys",
  },
  {
    id: "fal",
    label: "fal.ai (LTX · Kling · Seedance)",
    providerKey: "fal",
    keyIds: ["fal"],
    hint: "fal.ai video routing",
  },
  {
    id: "kie",
    label: "kie.ai (Veo · Kling · Runway)",
    providerKey: "kie",
    keyIds: ["kie"],
    hint: "kie.ai unified jobs API",
  },
  {
    id: "google_veo",
    label: "Google Veo",
    providerKey: "google_veo",
    keyIds: ["google_veo"],
    hint: "Google Veo (text-to-video)",
  },
  {
    id: "replicate",
    label: "Replicate (Kling · Luma · Minimax)",
    providerKey: "replicate",
    keyIds: ["replicate"],
    hint: "Runs hosted video models on Replicate",
  },
];

export function findVideoModel(id: string): VideoModel {
  return VIDEO_MODELS.find((m) => m.id === id) ?? VIDEO_MODELS[0];
}
