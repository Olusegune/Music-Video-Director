// Environment DNA engine — the consistency brain of the World Bible. Mirrors
// characterDna.ts: structured fields → a model-ready establishing-shot Prompt
// DNA + Consistency Rules, all offline.

import type { Environment } from "@/platform/lib/types";
import { findPreset } from "@/platform/lib/styles";

let _seq = 0;
function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `env-${Date.now()}-${_seq++}`;
  }
}

export function newEnvironment(name = "New Environment"): Environment {
  const now = new Date().toISOString();
  return {
    id: newId(),
    name,
    description: "",
    architecture: "",
    timeOfDay: "",
    mood: "",
    lightingStyle: "",
    colorPalette: [],
    materials: "",
    keyProps: "",
    environmentRules: "",
    stylePreset: "",
    promptDna: "",
    consistencyRules: "",
    referenceImages: [],
    establishingUrl: "",
    locked: false,
    createdAt: now,
    updatedAt: now,
  };
}

function clause(...parts: (string | undefined | null)[]): string {
  return parts.map((p) => (p ?? "").trim()).filter(Boolean).join(", ");
}

export interface ComposedDna {
  promptDna: string;
  consistencyRules: string;
}

/**
 * Compose the establishing-shot Prompt DNA + Consistency Rules. Ordering favors
 * what image models weight for a stable place: subject → architecture →
 * materials → time/light → mood → palette → style.
 */
export function composeEnvironmentDna(e: Environment): ComposedDna {
  const subject = e.name || "establishing location";
  const palette = e.colorPalette.length
    ? `color palette ${e.colorPalette.join(", ")}`
    : "";

  const promptDna = clause(
    `${subject} establishing shot`,
    e.description,
    e.architecture && `${e.architecture} architecture`,
    e.materials,
    e.timeOfDay,
    e.lightingStyle && `${e.lightingStyle} lighting`,
    e.mood && `${e.mood} mood`,
    e.keyProps,
    palette,
    findPreset(e.stylePreset)?.fragment,
    "consistent environment design, same location across all shots, cohesive world, high detail, no people"
  );

  const locks: string[] = [];
  if (e.architecture) locks.push(`Keep the architecture: ${e.architecture}.`);
  if (e.materials) locks.push(`Surfaces stay: ${e.materials}.`);
  if (e.colorPalette.length)
    locks.push(`Hold the palette: ${e.colorPalette.join(", ")}.`);
  if (e.lightingStyle) locks.push(`Lighting style: ${e.lightingStyle}.`);
  if (e.environmentRules) locks.push(e.environmentRules);
  locks.push(
    "Do not change the layout, materials, or palette between shots; keep the same place."
  );

  const negatives = [
    "inconsistent location",
    "different place",
    "layout drift",
    "wrong era",
    "warped architecture",
    findPreset(e.stylePreset)?.negative,
  ]
    .filter(Boolean)
    .join(", ");

  return {
    promptDna,
    consistencyRules: `${locks.join(" ")}\nAvoid: ${negatives}.`,
  };
}

export function isEnvDnaStale(e: Environment): boolean {
  return composeEnvironmentDna(e).promptDna !== e.promptDna.trim();
}

const TIME_WORDS: Record<string, string> = {
  day: "day",
  night: "night",
  dawn: "dawn",
  dusk: "dusk",
  morning: "morning",
  evening: "evening",
  afternoon: "afternoon",
  sunset: "sunset",
  sunrise: "sunrise",
  midnight: "midnight",
  continuous: "",
  later: "",
};

/** Normalize a screenplay time-of-day token ("DAY", "MAGIC HOUR") to a value. */
export function normalizeTimeOfDay(raw: string): string {
  const low = raw.toLowerCase().trim();
  for (const k of Object.keys(TIME_WORDS)) if (low.includes(k)) return TIME_WORDS[k];
  return raw.trim();
}

/** Build an Environment draft from an extracted location + optional time. */
export function environmentFromLocation(
  name: string,
  timeOfDay = ""
): Environment {
  const e = newEnvironment(name.trim() || "Untitled Location");
  e.timeOfDay = normalizeTimeOfDay(timeOfDay);
  const dna = composeEnvironmentDna(e);
  e.promptDna = dna.promptDna;
  e.consistencyRules = dna.consistencyRules;
  return e;
}

const MOOD_HINTS: [RegExp, string][] = [
  [/\b(eerie|haunt|creepy|ominous|dread)\b/i, "Ominous, unsettling"],
  [/\b(cozy|warm|inviting|homely)\b/i, "Warm, inviting"],
  [/\b(grand|majestic|epic|vast|sweeping)\b/i, "Grand, epic"],
  [/\b(grim|bleak|desolate|ruined|decay)\b/i, "Bleak, desolate"],
  [/\b(serene|calm|peaceful|tranquil)\b/i, "Serene, peaceful"],
  [/\b(neon|cyberpunk|gritty|seedy)\b/i, "Gritty, neon-lit"],
];

const TIME_TOKENS = [
  "night", "day", "dawn", "dusk", "morning", "evening", "afternoon",
  "sunset", "sunrise", "midnight",
];

/** Parse one line into a best-effort Environment draft (offline). */
export function draftEnvironmentFromLine(line: string): Environment {
  const text = line.trim();
  const e = newEnvironment(text.slice(0, 48) || "Untitled Location");
  e.description = text;
  for (const t of TIME_TOKENS)
    if (new RegExp(`\\b${t}\\b`, "i").test(text)) {
      e.timeOfDay = normalizeTimeOfDay(t);
      break;
    }
  for (const [re, mood] of MOOD_HINTS)
    if (re.test(text)) {
      e.mood = mood;
      break;
    }
  if (/\b(rain|wet|storm|downpour)\b/i.test(text)) e.lightingStyle = "wet reflective, moody";
  if (/\b(neon|holograph|led)\b/i.test(text)) e.lightingStyle = "neon glow, high contrast";
  const dna = composeEnvironmentDna(e);
  e.promptDna = dna.promptDna;
  e.consistencyRules = dna.consistencyRules;
  return e;
}
