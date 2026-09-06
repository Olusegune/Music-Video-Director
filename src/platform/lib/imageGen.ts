// Image Studio engine — model selection, aspect/size resolution, sheet
// templates, and (the crux) single-board sheet-layout prompt builders.
//
// The reference character/prop sheets are ONE composed production board, not a
// stitched grid of thumbnails. So we ask the model for the whole board in a
// single prompt, at a chosen aspect ratio and resolution, through a chosen
// provider. That is what makes the output look like a real character sheet.

import type { Character, Environment, Prop } from "@/platform/lib/types";
import type { GenerationSpec } from "@/platform/lib/generationSpec";
import { composeCharacterDna, identityAnchor } from "@/platform/lib/characterDna";
import { composeEnvironmentDna } from "@/platform/lib/environmentDna";
import { composePropDna } from "@/platform/lib/propDna";
import { findPreset } from "@/platform/lib/styles";

// --- selectable image models ----------------------------------------------

export interface ImageModel {
  id: string;
  label: string;
  /** Keychain provider id used by the Rust generator. */
  providerKey: string;
  /** The provider's own model slug, passed to aggregator adapters (Kie/WaveSpeed). */
  apiModel?: string;
  /** Provider ids whose key (any) makes this model "Connected". */
  keyIds: string[];
  /** No public API — generate by copying the prompt into the tool. */
  manual?: boolean;
  hint: string;
}

// Priority order (top = default): the models the director asked for first,
// routed through the prioritized providers. `apiModel` is the slug an aggregator
// adapter sends — confirm against the provider's current catalog if it changes.
export const IMAGE_MODELS: ImageModel[] = [
  {
    id: "nano_banana_pro",
    label: "★ Nano Banana Pro / Gemini",
    providerKey: "google_imagen",
    keyIds: ["google_imagen", "gemini"],
    hint: "Google Gemini image (Nano Banana Pro) → Imagen fallback",
  },
  {
    id: "nano_banana_2",
    label: "★ Nano Banana 2 (Kie)",
    providerKey: "kie",
    apiModel: "nano-banana-2",
    keyIds: ["kie"],
    hint: "Nano Banana 2 via Kie",
  },
  {
    id: "nano_banana_kie",
    label: "Nano Banana (Kie)",
    providerKey: "kie",
    apiModel: "google/nano-banana",
    keyIds: ["kie"],
    hint: "Nano Banana via Kie",
  },
  {
    id: "gpt_image",
    label: "★ ChatGPT Image 2 (OpenAI)",
    providerKey: "openai",
    keyIds: ["openai", "gpt_image"],
    hint: "gpt-image-1 → dall-e-3 fallback",
  },
  // --- Fal image catalog (each routes a specific fal model slug) ---
  {
    id: "fal_flux_dev",
    label: "Fal · FLUX.1 [dev]",
    providerKey: "fal",
    apiModel: "fal-ai/flux/dev",
    keyIds: ["fal"],
    hint: "High-quality FLUX dev",
  },
  {
    id: "fal_flux_schnell",
    label: "Fal · FLUX.1 [schnell]",
    providerKey: "fal",
    apiModel: "fal-ai/flux/schnell",
    keyIds: ["fal"],
    hint: "Ultra-fast FLUX schnell",
  },
  {
    id: "fal_flux_pro",
    label: "Fal · FLUX1.1 [pro]",
    providerKey: "fal",
    apiModel: "fal-ai/flux-pro/v1.1",
    keyIds: ["fal"],
    hint: "FLUX 1.1 Pro",
  },
  {
    id: "fal_flux_ultra",
    label: "Fal · FLUX1.1 [pro] ultra",
    providerKey: "fal",
    apiModel: "fal-ai/flux-pro/v1.1-ultra",
    keyIds: ["fal"],
    hint: "Up to 2K, photoreal",
  },
  {
    id: "fal_sd35_large",
    label: "Fal · Stable Diffusion 3.5 Large",
    providerKey: "fal",
    apiModel: "fal-ai/stable-diffusion-v35-large",
    keyIds: ["fal"],
    hint: "SD 3.5 Large",
  },
  {
    id: "fal_sd35_medium",
    label: "Fal · Stable Diffusion 3.5 Medium",
    providerKey: "fal",
    apiModel: "fal-ai/stable-diffusion-v35-medium",
    keyIds: ["fal"],
    hint: "SD 3.5 Medium",
  },
  {
    id: "fal_recraft",
    label: "Fal · Recraft V3",
    providerKey: "fal",
    apiModel: "fal-ai/recraft/v3/text-to-image",
    keyIds: ["fal"],
    hint: "Recraft V3 — text, vector, brand style",
  },
  {
    id: "fal_ideogram",
    label: "Fal · Ideogram V3",
    providerKey: "fal",
    apiModel: "fal-ai/ideogram/v3",
    keyIds: ["fal"],
    hint: "Ideogram V3 — typography",
  },
  {
    id: "wavespeed_image",
    label: "WaveSpeed · FLUX dev",
    providerKey: "wavespeed",
    apiModel: "wavespeed-ai/flux-dev",
    keyIds: ["wavespeed"],
    hint: "Image via WaveSpeed",
  },
  {
    id: "kie",
    label: "kie.ai (image, auto)",
    providerKey: "kie",
    keyIds: ["kie"],
    hint: "kie.ai unified jobs API",
  },
  {
    id: "stability",
    label: "Stability (SDXL)",
    providerKey: "stability",
    keyIds: ["stability"],
    hint: "Stability SDXL",
  },
  {
    id: "grok",
    label: "Grok / xAI (grok-2-image)",
    providerKey: "grok",
    keyIds: ["grok"],
    hint: "xAI image API",
  },
  {
    id: "midjourney",
    label: "Midjourney (copy-prompt)",
    providerKey: "midjourney",
    keyIds: ["midjourney"],
    manual: true,
    hint: "No public API — copy the prompt, generate in Midjourney, then import",
  },
  {
    id: "custom",
    label: "Auto (first configured)",
    providerKey: "custom",
    keyIds: ["fal", "stability", "replicate", "google_imagen", "openai"],
    hint: "First configured provider",
  },
];

export function findModel(id: string): ImageModel {
  return IMAGE_MODELS.find((m) => m.id === id) ?? IMAGE_MODELS[0];
}

export function imageSpecModel(spec: GenerationSpec): ImageModel {
  if (spec.capability !== "image") {
    throw new Error(
      `Image generation requires an image GenerationSpec, received ${spec.capability}.`
    );
  }
  return spec.modelHint ? findModel(spec.modelHint) : IMAGE_MODELS[0];
}

export function imageSpecSize(spec: GenerationSpec): { width: number; height: number } {
  if (spec.capability !== "image") {
    throw new Error(`Image sizing requires an image GenerationSpec, received ${spec.capability}.`);
  }
  if (spec.resolution) {
    return { width: spec.resolution.width, height: spec.resolution.height };
  }
  return resolveSize(spec.aspect ?? "1:1", "medium");
}

/** Models offered in the generation pickers — all, including manual (Midjourney). */
export const PICKER_IMAGE_MODELS = IMAGE_MODELS;

// --- aspect ratios ---------------------------------------------------------

export const ASPECT_RATIOS = [
  "1:1",
  "4:5",
  "3:4",
  "2:3",
  "3:2",
  "16:9",
  "9:16",
  "21:9",
  "custom",
] as const;
export type AspectRatio = (typeof ASPECT_RATIOS)[number];

function parseAspect(a: string): [number, number] {
  const m = a.match(/^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/);
  if (!m) return [1, 1];
  return [parseFloat(m[1]), parseFloat(m[2])];
}

// --- size presets ----------------------------------------------------------

export interface SizePreset {
  id: string;
  label: string;
  /** Long-edge magnitude (derives w/h from the aspect). */
  long?: number;
  /** Explicit pixel dimensions (ignores aspect). */
  w?: number;
  h?: number;
}

export const SIZE_PRESETS: SizePreset[] = [
  { id: "small", label: "Small", long: 768 },
  { id: "medium", label: "Medium", long: 1024 },
  { id: "large", label: "Large", long: 1536 },
  { id: "hd", label: "HD", long: 2048 },
  { id: "1024x1024", label: "1024 × 1024", w: 1024, h: 1024 },
  { id: "1536x1024", label: "1536 × 1024", w: 1536, h: 1024 },
  { id: "1024x1536", label: "1024 × 1536", w: 1024, h: 1536 },
  { id: "1792x1024", label: "1792 × 1024", w: 1792, h: 1024 },
  { id: "1024x1792", label: "1024 × 1792", w: 1024, h: 1792 },
  { id: "custom", label: "Custom", w: 0, h: 0 },
];

export function findSize(id: string): SizePreset {
  return SIZE_PRESETS.find((s) => s.id === id) ?? SIZE_PRESETS[1];
}

// Image models work in latent space and want both dimensions on a multiple of
// 8 — many pipelines want 16, and several APIs reject anything else outright
// rather than rounding for you. Plain rounding produced 819x1024 for 4:5,
// 1024x439 for 21:9 and 1024x428 for 2.39:1: five of the nine offered ratios
// came out misaligned, which is why generated frames did not match the aspect
// that was asked for.
const DIM_STEP = 16;
const clampDim = (n: number) => {
  const stepped = Math.round(n / DIM_STEP) * DIM_STEP;
  return Math.max(256, Math.min(2048, stepped));
};

/** Resolve the final pixel dimensions from aspect + size preset (+ custom). */
export function resolveSize(
  aspect: string,
  sizeId: string,
  customW = 1024,
  customH = 1024
): { width: number; height: number } {
  const preset = findSize(sizeId);
  if (preset.id === "custom") return { width: clampDim(customW), height: clampDim(customH) };
  if (preset.w && preset.h) return { width: preset.w, height: preset.h };

  const long = preset.long ?? 1024;
  const [aw, ah] = aspect === "custom" ? [1, 1] : parseAspect(aspect);
  if (aw >= ah) return { width: clampDim(long), height: clampDim((long * ah) / aw) };
  return { width: clampDim((long * aw) / ah), height: clampDim(long) };
}

// --- sheet templates -------------------------------------------------------

export type EntityKind = "character" | "environment" | "prop";

export interface SheetTemplate {
  id: string;
  label: string;
  desc: string;
}

export const CHARACTER_TEMPLATES: SheetTemplate[] = [
  {
    id: "deluxe",
    label: "Deluxe Character Sheet",
    desc: "Full production board — hero portrait, turnaround, expressions, poses, costumes, palette, notes",
  },
  {
    id: "turnaround",
    label: "Turnaround Sheet",
    desc: "Front · 3/4 · side · 3/4 back · back, full body",
  },
  { id: "expression", label: "Expression Sheet", desc: "Grid of facial expressions" },
  { id: "pose", label: "Pose Sheet", desc: "Dynamic full-body pose references" },
  { id: "costume", label: "Costume Sheet", desc: "Wardrobe variations" },
  {
    id: "accessories",
    label: "Accessories Sheet",
    desc: "Detail close-ups of props & accessories",
  },
  { id: "story", label: "Story Moment Sheet", desc: "Cinematic mini-scenes from key beats" },
];

export const ENVIRONMENT_TEMPLATES: SheetTemplate[] = [
  {
    id: "deluxe",
    label: "Deluxe Location Sheet",
    desc: "Establishing + wide + detail + top-down, palette, materials, notes",
  },
  { id: "coverage", label: "Coverage Sheet", desc: "Establishing · wide · detail · top-down" },
  {
    id: "times",
    label: "Time-of-Day Sheet",
    desc: "Same place at day / golden hour / night / overcast",
  },
];

export const PROP_TEMPLATES: SheetTemplate[] = [
  {
    id: "deluxe",
    label: "Deluxe Prop Sheet",
    desc: "Orthographic views, hero render, detail close-ups, materials, palette, scale, data block",
  },
  { id: "orthographic", label: "Orthographic Sheet", desc: "Front · side · back · top" },
  { id: "renders", label: "Render Sheet", desc: "Hero render, detail render, in-use" },
];

export function templatesFor(kind: EntityKind): SheetTemplate[] {
  return kind === "character"
    ? CHARACTER_TEMPLATES
    : kind === "environment"
      ? ENVIRONMENT_TEMPLATES
      : PROP_TEMPLATES;
}

// --- prompt builders (single composed board) -------------------------------

const BOARD =
  "Render as ONE single composed production board / model sheet image (not separate images), with clearly labeled panels, neat grid layout, and a clean neutral studio background.";
const QUALITY = "professional concept art, high detail, sharp, studio quality.";

function styleFrag(presetId: string): string {
  return findPreset(presetId)?.fragment ?? "";
}

/**
 * A sheet prompt is not one sentence — it is a layout instruction, an identity,
 * a consistency rule, a style, a board directive and a quality bar, in that
 * order. Naming them lets the Prompt Studio show which words came from where,
 * and lets a user mute one without rewriting the paragraph.
 */
export interface SheetPromptParts {
  layout: string;
  identity: string;
  consistency: string;
  style: string;
  board: string;
  quality: string;
  /** Extra directives (environments forbid people). */
  constraints?: string;
}

/** Flatten parts exactly as the prompt builders always have: joined by a space. */
export function joinSheetParts(parts: SheetPromptParts): string {
  return [
    parts.layout,
    parts.identity,
    parts.consistency,
    parts.style,
    parts.board,
    parts.quality,
    parts.constraints,
  ]
    .filter(Boolean)
    .join(" ");
}

function characterParts(c: Character, template: string, aspect: string): SheetPromptParts {
  const dna = c.promptDna.trim() || composeCharacterDna(c).promptDna;
  const anchor = identityAnchor(c);
  const style = styleFrag(c.stylePreset);
  const identity = `Subject: ${anchor}. Design DNA: ${dna}.`;
  const consistency =
    "Maintain the exact same character identity, face, hairstyle, skin tone, wardrobe, and body proportions across every panel.";
  const ar = `${aspect === "custom" ? "" : aspect + " aspect ratio. "}`;

  const layouts: Record<string, string> = {
    deluxe: `Create a professional character design sheet laid out as a cinematic production board. ${ar}Include: a large hero portrait on the left with a character profile panel (name, role, age, personality); a full turnaround row across the top (front, 3/4 front, side, 3/4 back, back, full body); an expression sheet row (joyful, confident, thoughtful, concerned, determined); a pose reference row; costume variations; a details & accessories panel with close-ups; a color palette swatch strip; and physical & style notes.`,
    turnaround: `Create a character turnaround model sheet. ${ar}Show the same character in five full-body views in a row — front, 3/4 front, side, 3/4 back, and back — over a clean background, with a small color palette strip and a scale silhouette.`,
    expression: `Create a character expression sheet. ${ar}Show a labeled grid of head-and-shoulders portraits of the same character with these expressions: happy, sad, angry, fear, joy, surprise, determination, and thoughtful.`,
    pose: `Create a character pose-reference sheet. ${ar}Show a labeled grid of full-body dynamic poses of the same character: standing, walking, running, sitting, pointing, and an action pose.`,
    costume: `Create a costume variations sheet. ${ar}Show the same character in several full-body outfit variations (primary outfit, secondary outfit, formal, casual), each labeled, over a clean background.`,
    accessories: `Create a details & accessories sheet. ${ar}Show labeled close-up renders of the character's signature accessories, props, fabrics, and design details.`,
    story: `Create a story-moments sheet. ${ar}Show a row of cinematic mini-scene panels of the same character in key story beats, each labeled.`,
  };

  return {
    layout: layouts[template] ?? layouts.deluxe,
    identity,
    consistency,
    style,
    board: BOARD,
    quality: QUALITY,
  };
}

function environmentParts(e: Environment, template: string, aspect: string): SheetPromptParts {
  const dna = e.promptDna.trim() || composeEnvironmentDna(e).promptDna;
  const style = styleFrag(e.stylePreset);
  const identity = `Location: ${e.name}. Design DNA: ${dna}.`;
  const consistency =
    "Keep the exact same location, architecture, materials, and palette consistent across every panel.";
  const ar = `${aspect === "custom" ? "" : aspect + " aspect ratio. "}`;

  const layouts: Record<string, string> = {
    deluxe: `Create an environment design sheet laid out as a production board. ${ar}Include: a large establishing shot, plus wide, detail, and top-down floor-plan views; a materials row; a color palette strip; a scale reference; and a description/notes panel.`,
    coverage: `Create an environment coverage sheet. ${ar}Show the same location as establishing, wide, detail, and top-down views in a labeled grid, with a color palette strip.`,
    times: `Create a time-of-day sheet for the same location. ${ar}Show it at day, golden hour, night, and overcast, each labeled, with consistent layout.`,
  };

  return {
    layout: layouts[template] ?? layouts.deluxe,
    identity,
    consistency,
    style,
    board: BOARD,
    quality: QUALITY,
    constraints: "no people.",
  };
}

function propParts(p: Prop, template: string, aspect: string): SheetPromptParts {
  const dna = p.promptDna.trim() || composePropDna(p).promptDna;
  const style = styleFrag(p.stylePreset);
  const identity = `${p.category}: ${p.name}. Design DNA: ${dna}.`;
  const consistency =
    "Keep the exact same object design, shape, materials, and markings consistent across every panel.";
  const ar = `${aspect === "custom" ? "" : aspect + " aspect ratio. "}`;

  const layouts: Record<string, string> = {
    deluxe: `Create a ${p.category.toLowerCase()} design sheet laid out as a production board. ${ar}Include: orthographic front, side, back, and top views; a hero beauty render; detail close-ups; a materials sphere row; a color palette strip; a scale reference with a human silhouette; and a data/spec block.`,
    orthographic: `Create an orthographic ${p.category.toLowerCase()} sheet. ${ar}Show clean front, side, back, and top views in a labeled grid over a neutral background, with a scale reference.`,
    renders: `Create a ${p.category.toLowerCase()} render sheet. ${ar}Show a hero beauty render, a macro detail render, and an in-use/in-context render, each labeled.`,
  };

  return {
    layout: layouts[template] ?? layouts.deluxe,
    identity,
    consistency,
    style,
    board: BOARD,
    quality: QUALITY,
  };
}

/** The named contributions of a sheet prompt, before they are flattened. */
export function buildSheetPromptParts(
  kind: EntityKind,
  entity: Character | Environment | Prop,
  template: string,
  aspect: string
): SheetPromptParts {
  if (kind === "character") return characterParts(entity as Character, template, aspect);
  if (kind === "environment") return environmentParts(entity as Environment, template, aspect);
  return propParts(entity as Prop, template, aspect);
}

export function buildSheetPrompt(
  kind: EntityKind,
  entity: Character | Environment | Prop,
  template: string,
  aspect: string
): string {
  return joinSheetParts(buildSheetPromptParts(kind, entity, template, aspect));
}

// --- filename --------------------------------------------------------------

function slug(s: string): string {
  return (s || "untitled").replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || "untitled";
}

/** projectName_characterName_sheetType_provider_date.ext */
export function buildFilename(
  project: string,
  name: string,
  sheetType: string,
  provider: string,
  ext: string,
  date = new Date()
): string {
  const d = date.toISOString().slice(0, 10);
  return `${slug(project)}_${slug(name)}_${slug(sheetType)}_${slug(provider)}_${d}.${ext}`;
}
