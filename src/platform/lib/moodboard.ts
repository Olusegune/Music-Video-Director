// Moodboard Generator — derive a set of moodboard tiles (each a ready-to-render
// image prompt) from a pack's style + a representative shot. No API needed to
// produce the prompts; in the desktop app they can be sent to an image provider.

import type { PromptPack } from "@/platform/lib/types";

export interface MoodboardTile {
  title: string;
  prompt: string;
}

export function buildMoodboard(pack: PromptPack): MoodboardTile[] {
  const s = pack.style;
  const hero = pack.shots[0]?.visualDescription || s.visualLanguage;
  const palette = s.colorPalette.join(", ");
  const aspect = pack.creativeDirection.aspectRatio || "16:9";
  const base = `${s.visualLanguage}. Palette: ${palette}. ${aspect}, high detail`;

  return [
    {
      title: "Hero Frame",
      prompt: `Hero key visual: ${hero}. ${base}. Strong focal subject with negative space for type.`,
    },
    {
      title: "Color Script",
      prompt: `Color script swatches and gradients exploring the palette ${palette}; mood: ${s.mood}. ${s.visualLanguage}.`,
    },
    {
      title: "Lighting Key",
      prompt: `Lighting study: ${pack.shots[0]?.lighting.keyLight || "soft key"}, ${s.atmosphere}. ${s.visualLanguage}, ${aspect}.`,
    },
    {
      title: "Typography",
      prompt: `Typography treatment: ${s.typography}, set against ${s.mood} background. Clean kerning, hierarchy, on-brand. ${aspect}.`,
    },
    {
      title: "Texture & Material",
      prompt: `Material and texture board: ${s.materials}. Macro detail, tactile surfaces. ${s.visualLanguage}.`,
    },
    {
      title: "Environment",
      prompt: `Establishing environment in style: ${s.visualLanguage}. Atmosphere: ${s.atmosphere}. ${aspect}, cinematic depth.`,
    },
    {
      title: "Motion Feel",
      prompt: `Frozen-motion study suggesting the piece's energy (${pack.creativeDirection.emotionalTone}). ${s.visualLanguage}, motion blur and dynamic composition.`,
    },
    {
      title: "Detail / Macro",
      prompt: `Extreme close-up signature detail. ${s.visualLanguage}. Palette ${palette}. Shallow depth of field, premium finish.`,
    },
  ];
}
