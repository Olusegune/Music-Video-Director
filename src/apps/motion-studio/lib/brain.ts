import { motionUid } from "./storage";
import { productionType, visualStyle } from "./templates";
import type { CreativeDirection, MotionProjectDraft, MotionScene } from "./types";

export const FEELINGS = [
  "clear",
  "premium",
  "playful",
  "bold",
  "cinematic",
  "friendly",
  "technical",
] as const;

const HOOKS = [
  "Open on the audience problem, then make the product feel inevitable.",
  "Start with a visual contradiction that resolves into the product promise.",
  "Lead with the result, then reveal the mechanism behind it.",
  "Use a tactile product moment before the voiceover names the benefit.",
];

const MOTIONS = [
  "mask reveal with a confident ease-out",
  "parallax slide with foreground accents",
  "macro orbit into an annotated feature callout",
  "kinetic type hit synchronized to the voiceover",
  "shape-morph transition into the next product state",
  "layered UI panels snapping into a clean final layout",
];

function sentenceFrom(value: string, fallback: string): string {
  const clean = value
    .split(/[.\n]/)
    .map((part) => part.trim())
    .filter(Boolean);
  return clean[0] || fallback;
}

function sceneDuration(total: number, index: number, count: number): [number, number] {
  const start = Math.round((total / count) * index);
  const end = index === count - 1 ? total : Math.round((total / count) * (index + 1));
  return [start, end];
}

export function directStoryboard(draft: MotionProjectDraft, direction: CreativeDirection): MotionScene[] {
  const type = productionType(draft.typeId);
  const style = visualStyle(draft.styleId);
  const source = `${draft.businessInput}\n${draft.marketingBrief}\n${draft.script}\n${draft.brief}`;
  const productLine = sentenceFrom(source, "Introduce the product and the result it creates.");
  const promiseLine = sentenceFrom(draft.marketingBrief || draft.brief, "Show a clearer path from problem to outcome.");
  const scriptLine = sentenceFrom(draft.script, promiseLine);
  const roles = type.sceneRoles;

  return roles.map((role, index) => {
    const [start, end] = sceneDuration(draft.durationSec, index, roles.length);
    const hook = HOOKS[(index + roles.length) % HOOKS.length];
    const motion = MOTIONS[(index + style.motionVocab.length) % MOTIONS.length];
    const headline =
      index === 0
        ? `${role}: ${productLine}`
        : index === roles.length - 1
          ? `${role}: make the next step unmistakable`
          : `${role}: ${scriptLine}`;

    return {
      id: motionUid(),
      role,
      start,
      end,
      headline,
      support:
        index === 0
          ? hook
          : `Carry the ${style.name.toLowerCase()} system through ${role.toLowerCase()} with ${direction.motionLanguage}.`,
      intent:
        index === roles.length - 1
          ? "Close the story with a memorable brand/action moment."
          : `Clarify the ${role.toLowerCase()} beat without adding production clutter.`,
      layout: index % 2 === 0 ? "Hero object left, proof or words right." : "Centered composition with layered supporting elements.",
      motion,
      camera: direction.composition,
      energy: Math.min(10, 5 + index + (draft.feeling === "bold" || draft.feeling === "playful" ? 1 : 0)),
      accent: direction.colorPalette[(index + 2) % direction.colorPalette.length],
      transition: index === roles.length - 1 ? "final lockup" : style.motionVocab[index % style.motionVocab.length],
      voiceover: `${role}. ${scriptLine}`,
      audioCue: index === 0 ? "single clean impact, then bed begins" : index === roles.length - 1 ? "resolve with logo hit" : "light rhythmic marker",
      score: 78 + ((index * 3) % 13),
    };
  });
}

export function critiqueScene(scene: MotionScene): string {
  if (scene.energy < 6) return "The beat is readable, but could use a stronger motion accent.";
  if (scene.headline.length > 118) return "The headline is doing too much; tighten the scene to one idea.";
  return "The scene has a clear objective, visible motion, and a usable production note.";
}

export function improveScene(scene: MotionScene): MotionScene {
  return {
    ...scene,
    headline: scene.headline.replace(/^([^:]+):\s*/, "$1: sharpen the main promise with one visual idea - "),
    support: `${scene.support} Improve pass: reduce clutter, add a stronger first-frame silhouette, and keep continuity with the approved style.`,
    motion: `${scene.motion}, then a cleaner hold for readability`,
    energy: Math.min(10, scene.energy + 1),
    score: Math.min(96, (scene.score ?? 80) + 7),
  };
}
