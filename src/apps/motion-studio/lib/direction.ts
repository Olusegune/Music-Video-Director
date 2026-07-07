import { nowIso } from "./storage";
import { productionType, visualStyle } from "./templates";
import type { CreativeDirection, MotionProjectDraft } from "./types";
import { styleById, stylesIn, type StyleEntry } from "./styleLibrary";

const TYPE_LEANINGS: Record<string, Partial<Record<string, string[]>>> = {
  "saas-explainer": {
    animation: ["anim-flat", "anim-isometric"],
    character: ["char-friendly"],
    camera: ["cam-locked"],
    lighting: ["light-softbox"],
    typography: ["type-grotesk"],
    editing: ["edit-rhythmic"],
  },
  "product-launch": {
    animation: ["anim-3d", "anim-hybrid"],
    camera: ["cam-orbit"],
    lighting: ["light-chiaroscuro"],
    typography: ["type-grotesk"],
    editing: ["edit-long-take"],
  },
  "product-reveal": {
    animation: ["anim-3d"],
    camera: ["cam-orbit"],
    lighting: ["light-chiaroscuro"],
    editing: ["edit-long-take"],
  },
  "c4d-commercial": {
    animation: ["anim-3d"],
    camera: ["cam-orbit"],
    lighting: ["light-chiaroscuro"],
    editing: ["edit-long-take"],
  },
  "ae-explainer": {
    animation: ["anim-ae", "anim-flat"],
    camera: ["cam-locked"],
    lighting: ["light-softbox"],
    typography: ["type-grotesk"],
    editing: ["edit-rhythmic"],
  },
  "ui-animation": {
    animation: ["anim-ae", "anim-isometric"],
    character: ["char-friendly"],
    camera: ["cam-locked"],
    lighting: ["light-softbox"],
  },
  "social-ad": {
    animation: ["anim-rubber", "anim-ae"],
    character: ["char-rubber", "char-anime"],
    transition: ["trans-whip"],
    editing: ["edit-rhythmic"],
  },
  "kinetic-typography": {
    animation: ["anim-ae"],
    typography: ["type-poster"],
    transition: ["trans-morph"],
    editing: ["edit-rhythmic"],
  },
  "mixed-media-animation": {
    animation: ["anim-hybrid"],
    camera: ["cam-handheld"],
    transition: ["trans-whip", "trans-morph"],
  },
};

function hash(value: string, seed = 0): number {
  let h = 2166136261 ^ seed;
  for (let index = 0; index < value.length; index += 1) {
    h ^= value.charCodeAt(index);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 1000;
}

function pickStyle(category: StyleEntry["category"], typeId: string, seed: number): StyleEntry {
  const preferred = TYPE_LEANINGS[typeId]?.[category];
  if (preferred?.length) {
    const hit = styleById(preferred[seed % preferred.length]);
    if (hit) return hit;
  }
  const pool = stylesIn(category);
  return pool[(seed + hash(typeId, 3)) % pool.length];
}

export function establishDirection(draft: MotionProjectDraft): CreativeDirection {
  const type = productionType(draft.typeId);
  const style = visualStyle(draft.styleId);
  const seed = hash(`${draft.name}${draft.brief}${draft.marketingBrief}`);
  const animation = pickStyle("animation", draft.typeId, seed);
  const character = pickStyle("character", draft.typeId, seed + 1);
  const camera = pickStyle("camera", draft.typeId, seed + 2);
  const lighting = pickStyle("lighting", draft.typeId, seed + 3);
  const typography = pickStyle("typography", draft.typeId, seed + 4);
  const transition = pickStyle("transition", draft.typeId, seed + 5);
  const editing = pickStyle("editing", draft.typeId, seed + 6);

  return {
    visualLanguage:
      `${type.name} in ${style.name}: ${animation.name.toLowerCase()} animation, ` +
      `${character.name.toLowerCase()} character language, ${camera.name.toLowerCase()} camera, ` +
      `${lighting.name.toLowerCase()} lighting, and ${typography.name.toLowerCase()} type.`,
    animationStyleId: animation.id,
    characterStyleId: character.id,
    cameraStyleId: camera.id,
    lightingStyleId: lighting.id,
    typographyStyleId: typography.id,
    transitionStyleId: transition.id,
    editingStyleId: editing.id,
    colorPalette: [...style.palette],
    motionLanguage: style.motionVocab.join(" / "),
    composition:
      style.softness > 0.7
        ? "Centered staging, friendly shapes, generous breathing room."
        : "Layered depth, clear focal hierarchy, tight product-driven compositions.",
    establishedAt: nowIso(),
  };
}

export function directionPrompt(direction: CreativeDirection): string {
  return [
    styleById(direction.animationStyleId)?.prompt,
    styleById(direction.characterStyleId)?.prompt,
    styleById(direction.cameraStyleId)?.prompt,
    styleById(direction.lightingStyleId)?.prompt,
    `palette ${direction.colorPalette.join(", ")}`,
    direction.composition,
  ]
    .filter(Boolean)
    .join(", ");
}
