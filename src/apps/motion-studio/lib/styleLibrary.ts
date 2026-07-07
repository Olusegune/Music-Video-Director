export type StyleCategory =
  | "animation"
  | "character"
  | "camera"
  | "lighting"
  | "typography"
  | "transition"
  | "editing";

export interface StyleEntry {
  id: string;
  category: StyleCategory;
  name: string;
  description: string;
  prompt: string;
}

export const STYLE_LIBRARY: StyleEntry[] = [
  { id: "anim-flat", category: "animation", name: "Flat 2D", description: "Clean vector motion with readable shapes.", prompt: "flat 2D vector animation" },
  { id: "anim-rubber", category: "animation", name: "Rubber Hose", description: "Elastic limbs and buoyant timing.", prompt: "rubber hose character animation" },
  { id: "anim-isometric", category: "animation", name: "Isometric", description: "Modular angled worlds and diagram depth.", prompt: "isometric animated product world" },
  { id: "anim-3d", category: "animation", name: "Cinema 4D-style", description: "Glossy bevels, studio reflections, product macro motion.", prompt: "glossy Cinema 4D style product animation" },
  { id: "anim-ae", category: "animation", name: "After Effects-style", description: "Shape layers, track mattes, trim paths, and text rigs.", prompt: "polished After Effects style explainer animation" },
  { id: "anim-hybrid", category: "animation", name: "Hybrid 2D/3D", description: "2D illustration layered with 3D products and parallax.", prompt: "hybrid 2D 3D animation with parallax depth" },
  { id: "char-friendly", category: "character", name: "Friendly Founder", description: "Approachable presenter with simple expressive poses.", prompt: "friendly brand character presenter" },
  { id: "char-rubber", category: "character", name: "Rubber Hose Cast", description: "Bendy mascot characters and broad readable silhouettes.", prompt: "rubber hose mascot character style" },
  { id: "char-anime", category: "character", name: "Anime Hero", description: "Sharp expressions, strong poses, and graphic energy.", prompt: "anime inspired character design" },
  { id: "char-pixar", category: "character", name: "Pixar-inspired Cast", description: "Warm expressive 3D characters with story-first appeal.", prompt: "warm expressive cinematic 3D character style" },
  { id: "cam-locked", category: "camera", name: "Locked Product Stage", description: "Stable framing for clarity and repeatable UI moments.", prompt: "locked camera clean product stage" },
  { id: "cam-orbit", category: "camera", name: "Macro Orbit", description: "Slow tactile product orbit and detail sweeps.", prompt: "macro orbit camera product reveal" },
  { id: "cam-handheld", category: "camera", name: "Editorial Handheld", description: "Light human movement for mixed media and social pacing.", prompt: "editorial handheld commercial camera" },
  { id: "light-softbox", category: "lighting", name: "Softbox Bright", description: "Bright clean SaaS lighting with soft shadows.", prompt: "softbox lighting bright product commercial" },
  { id: "light-chiaroscuro", category: "lighting", name: "Premium Contrast", description: "Dramatic edge light and sculpted product shadows.", prompt: "premium contrast cinematic product lighting" },
  { id: "type-grotesk", category: "typography", name: "Modern Grotesk", description: "Dense confident product typography.", prompt: "modern grotesk typography" },
  { id: "type-poster", category: "typography", name: "Poster Loud", description: "Large stacked words and bold social rhythm.", prompt: "bold poster kinetic typography" },
  { id: "trans-morph", category: "transition", name: "Morph Match", description: "Shape-to-product morphs that keep continuity.", prompt: "match morph transition" },
  { id: "trans-whip", category: "transition", name: "Whip Cut", description: "Fast energetic swipes for ads and kinetic scenes.", prompt: "fast whip transition" },
  { id: "edit-rhythmic", category: "editing", name: "Rhythmic", description: "Cut to beats with satisfying emphasis.", prompt: "rhythmic edit pacing" },
  { id: "edit-long-take", category: "editing", name: "Elegant Long Take", description: "Fewer cuts, more product presence.", prompt: "elegant long take product commercial pacing" },
];

export function stylesIn(category: StyleCategory): StyleEntry[] {
  return STYLE_LIBRARY.filter((style) => style.category === category);
}

export function styleById(id: string): StyleEntry | undefined {
  return STYLE_LIBRARY.find((style) => style.id === id);
}
