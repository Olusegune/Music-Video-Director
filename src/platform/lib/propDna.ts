// Prop DNA engine — the consistency brain of the Props & Vehicles bible. One
// entity covers props, vehicles, and creatures via `category`. Mirrors
// characterDna.ts / environmentDna.ts: structured fields → a hero-render Prompt
// DNA + Consistency Rules, all offline.

import type { Prop } from "@/platform/lib/types";
import { findPreset } from "@/platform/lib/styles";

export const PROP_CATEGORIES = [
  "Prop",
  "Vehicle",
  "Creature",
  "Weapon",
  "Wardrobe",
  "Set Dressing",
] as const;

let _seq = 0;
function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `prop-${Date.now()}-${_seq++}`;
  }
}

export function newProp(name = "New Prop", category = "Prop"): Prop {
  const now = new Date().toISOString();
  return {
    id: newId(),
    name,
    category,
    dimensions: "",
    materials: "",
    condition: "",
    colorPalette: [],
    usage: "",
    storySignificance: "",
    stylePreset: "",
    promptDna: "",
    consistencyRules: "",
    referenceImages: [],
    heroUrl: "",
    locked: false,
    createdAt: now,
    updatedAt: now,
  };
}

function clause(...parts: (string | undefined | null)[]): string {
  return parts
    .map((p) => (p ?? "").trim())
    .filter(Boolean)
    .join(", ");
}

export interface ComposedDna {
  promptDna: string;
  consistencyRules: string;
}

/** A creature reads as a character-like subject; objects read as a hero render. */
function framing(category: string): string {
  return category.toLowerCase() === "creature"
    ? "full-body creature reference, neutral pose, character sheet"
    : "hero product render, orthographic reference, neutral studio background, centered";
}

export function composePropDna(p: Prop): ComposedDna {
  const subject = clause(p.condition, p.name) || p.name || "object";
  const palette = p.colorPalette.length ? `color palette ${p.colorPalette.join(", ")}` : "";

  const promptDna = clause(
    subject,
    p.category && p.category.toLowerCase() !== "prop" ? p.category : "",
    p.materials,
    p.dimensions,
    palette,
    findPreset(p.stylePreset)?.fragment,
    framing(p.category),
    "consistent design, identical across all shots, high detail"
  );

  const locks: string[] = [];
  if (p.materials) locks.push(`Materials stay: ${p.materials}.`);
  if (p.condition) locks.push(`Condition: ${p.condition}.`);
  if (p.colorPalette.length) locks.push(`Hold the palette: ${p.colorPalette.join(", ")}.`);
  if (p.dimensions) locks.push(`Scale: ${p.dimensions}.`);
  locks.push("Keep the same shape, materials, and markings between shots.");

  const negatives = [
    "inconsistent design",
    "different object",
    "shape drift",
    "wrong materials",
    "extra parts",
    findPreset(p.stylePreset)?.negative,
  ]
    .filter(Boolean)
    .join(", ");

  return {
    promptDna,
    consistencyRules: `${locks.join(" ")}\nAvoid: ${negatives}.`,
  };
}

export function isPropDnaStale(p: Prop): boolean {
  return composePropDna(p).promptDna !== p.promptDna.trim();
}

/** Build a Prop draft from an extracted entity name + category + context. */
export function propFromEntity(name: string, category = "Prop", context = ""): Prop {
  const p = newProp(name.trim() || "Untitled", category);
  if (context.trim()) p.usage = context.trim().slice(0, 160);
  const dna = composePropDna(p);
  p.promptDna = dna.promptDna;
  p.consistencyRules = dna.consistencyRules;
  return p;
}
