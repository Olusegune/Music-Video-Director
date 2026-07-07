// Unified production-asset source of truth.
//
// The Character / World / Prop Bibles are the canonical libraries. This module
// flattens them into a single list of visually-referenceable assets so any
// generation surface (image, video, storyboard) can pull the SAME assets the
// user already created — instead of recreating context. Each asset contributes
// its hero image plus any approved reference images.

import type { Character, Environment, Prop } from "@/platform/lib/types";
import { api } from "@/platform/lib/ipc";
import { newCharacter } from "@/platform/lib/characterDna";
import { newEnvironment } from "@/platform/lib/environmentDna";
import { newProp } from "@/platform/lib/propDna";

export type AssetKind = "Character" | "Environment" | "Prop";

/**
 * Categories a user can file an uploaded image under. Each maps to one of the
 * three persistent Bibles (Character / Environment / Prop). Prop sub-types
 * (Wardrobe, Vehicle, Style, …) are stored as the Prop's `category`, so the
 * asset is reusable everywhere and labelled correctly.
 */
export interface UploadCategory {
  id: string;
  label: string;
  bible: AssetKind;
}

export const UPLOAD_CATEGORIES: UploadCategory[] = [
  { id: "Character", label: "Character", bible: "Character" },
  { id: "Environment", label: "Set / Environment", bible: "Environment" },
  { id: "Prop", label: "Prop", bible: "Prop" },
  { id: "Vehicle", label: "Vehicle", bible: "Prop" },
  { id: "Wardrobe", label: "Wardrobe / Costume", bible: "Prop" },
  { id: "Creature", label: "Creature / Monster", bible: "Prop" },
  { id: "Style", label: "Style reference", bible: "Prop" },
  { id: "Lighting", label: "Lighting reference", bible: "Prop" },
  { id: "Storyboard", label: "Storyboard / Shot", bible: "Prop" },
  { id: "Mood board", label: "Mood board", bible: "Prop" },
  { id: "Pose sheet", label: "Pose / Performance sheet", bible: "Prop" },
  { id: "Formation sheet", label: "Formation sheet", bible: "Prop" },
];

export function categoryBible(categoryId: string): AssetKind {
  return (UPLOAD_CATEGORIES.find((c) => c.id === categoryId) ?? UPLOAD_CATEGORIES[2]).bible;
}

// ---------------------------------------------------------------------------
// Asset origin / information architecture
// ---------------------------------------------------------------------------
//
// The three Bibles are storage buckets, but the user-facing information
// architecture is by *origin* — which system an asset belongs to. Choreography
// output (pose sheets, formations, dance/motion references) is persisted in the
// Prop bible for convenience but is NOT a prop: it must never appear on the
// Props & Vehicles page, and instead reads as a Choreography asset everywhere.

/** Where an asset belongs in the UI, independent of which Bible stores it. */
export type AssetOrigin =
  | "Character Bible"
  | "World Bible"
  | "Props & Vehicles"
  | "Choreography"
  | "Animation Lab";

/**
 * True when a Prop's `category` is really choreography output. Matches the
 * excluded set — pose / pose_sheet / dance_pose / formation / motion_reference
 * / character_pose — tolerant of spacing, casing, and `_`/`-` separators.
 */
export function isChoreographyCategory(categoryId?: string | null): boolean {
  if (!categoryId) return false;
  const c = categoryId.toLowerCase().replace(/[_-]+/g, " ").trim();
  return /\bpose\b|pose sheet|dance pose|\bformation\b|motion reference|character pose/.test(c);
}

/** The origin an asset should be filed under, from its bible kind + category. */
export function assetOrigin(kind: AssetKind, categoryId?: string | null): AssetOrigin {
  if (kind === "Character") return "Character Bible";
  if (kind === "Environment") return "World Bible";
  return isChoreographyCategory(categoryId) ? "Choreography" : "Props & Vehicles";
}

/** Persist an uploaded image into the chosen production library. */
export async function importImageToLibrary(
  categoryId: string,
  name: string,
  dataUrl: string,
  extraRefs: string[] = []
): Promise<void> {
  const cat = UPLOAD_CATEGORIES.find((c) => c.id === categoryId) ?? UPLOAD_CATEGORIES[2];
  const label = name || cat.id;
  const refs = [dataUrl, ...extraRefs].filter(
    (v, i, a) => v && a.indexOf(v) === i
  );
  if (cat.bible === "Character") {
    const c = newCharacter(label);
    c.portraitUrl = dataUrl;
    c.referenceImages = refs;
    await api.saveCharacter(c);
  } else if (cat.bible === "Environment") {
    const e = newEnvironment(label);
    e.establishingUrl = dataUrl;
    e.referenceImages = refs;
    await api.saveEnvironment(e);
  } else {
    const p = newProp(label, cat.id); // cat.id becomes the Prop category (Wardrobe, Vehicle, …)
    p.heroUrl = dataUrl;
    p.referenceImages = refs;
    await api.saveProp(p);
  }
}

/**
 * Move an existing asset to a different category/Bible. Within the Prop Bible
 * this is just a category change (handled by the caller); across Bibles it
 * re-creates the asset (name + primary image + references) in the target and
 * deletes the original.
 */
export async function moveAssetAcrossBibles(
  fromKind: AssetKind,
  fromId: string,
  targetCategoryId: string,
  name: string,
  primaryImage: string,
  refs: string[]
): Promise<void> {
  await importImageToLibrary(targetCategoryId, name, primaryImage, refs);
  if (fromKind === "Character") await api.deleteCharacter(fromId);
  else if (fromKind === "Environment") await api.deleteEnvironment(fromId);
  else await api.deleteProp(fromId);
}

export interface AssetRef {
  /** Stable id: `${kind}:${entityId}:${imageIndex}`. */
  id: string;
  kind: AssetKind;
  /** Display name (entity name). */
  label: string;
  /** Sub-label (role / category / "reference"). */
  sub: string;
  /** Displayable image src (hero or reference). */
  src: string;
}

function pushImages(
  out: AssetRef[],
  kind: AssetKind,
  entityId: string,
  label: string,
  sub: string,
  hero: string,
  refs: string[]
) {
  const seen = new Set<string>();
  const add = (src: string, note: string) => {
    if (!src || seen.has(src)) return;
    seen.add(src);
    out.push({ id: `${kind}:${entityId}:${out.length}`, kind, label, sub: note, src });
  };
  add(hero, sub);
  (refs ?? []).forEach((r, i) => add(r, `${sub} · ref ${i + 1}`));
}

export function buildAssetRefs(
  characters: Character[],
  environments: Environment[],
  props: Prop[]
): AssetRef[] {
  const out: AssetRef[] = [];
  for (const c of characters) {
    pushImages(out, "Character", c.id, c.name || "Character", c.role || "Character", c.portraitUrl, c.referenceImages);
  }
  for (const e of environments) {
    pushImages(out, "Environment", e.id, e.name || "Environment", e.mood || "Environment", e.establishingUrl, e.referenceImages);
  }
  for (const p of props) {
    pushImages(out, "Prop", p.id, p.name || "Prop", p.category || "Prop", p.heroUrl, p.referenceImages);
  }
  return out;
}

export const ASSET_KINDS: AssetKind[] = ["Character", "Environment", "Prop"];
