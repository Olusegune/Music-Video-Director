// Character DNA engine — the consistency brain of the Character Bible.
//
// `composeCharacterDna` turns a character's structured fields into a clean,
// model-ready Prompt DNA string plus a Consistency Rules block. This is the
// "magic": a beginner fills in a few fields (or conjures a draft from one line)
// and gets a director-grade, repeatable character prompt with no API call —
// the same offline-first philosophy as the local creative engine and the
// one-click pack doctors in magic.ts.

import type { Character } from "@/platform/lib/types";
import { findPreset } from "@/platform/lib/styles";

let _seq = 0;
function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `char-${Date.now()}-${_seq++}`;
  }
}

/** A blank character with sensible defaults. */
export function newCharacter(name = "New Character"): Character {
  const now = new Date().toISOString();
  return {
    id: newId(),
    name,
    age: "",
    gender: "",
    occupation: "",
    role: "Supporting",
    faceShape: "",
    eyeShape: "",
    eyeColor: "",
    hairStyle: "",
    hairColor: "",
    bodyType: "",
    skinTone: "",
    distinguishingFeatures: "",
    primaryOutfit: "",
    secondaryOutfit: "",
    accessories: "",
    traits: "",
    motivations: "",
    fears: "",
    goals: "",
    stylePreset: "",
    promptDna: "",
    consistencyRules: "",
    referenceImages: [],
    portraitUrl: "",
    locked: false,
    createdAt: now,
    updatedAt: now,
  };
}

// --- Prompt DNA composition ------------------------------------------------

function clause(...parts: (string | undefined | null)[]): string {
  return parts
    .map((p) => (p ?? "").trim())
    .filter(Boolean)
    .join(" ")
    .trim();
}

/**
 * A short, stable identity anchor — the phrase meant to lead every generation
 * of this character so models keep the same person. Falls back gracefully when
 * fields are sparse.
 */
/**
 * Does this character actually describe a look?
 *
 * Linking a performer to a character is presented as locking their likeness,
 * but the lock is only as real as the fields behind it. A character with a
 * name and nothing else contributes no visual information at all, so the face
 * drifts between shots while the UI says consistency is handled. Callers use
 * this to tell the user which of the two they have.
 *
 * Name, role and occupation are deliberately excluded: they identify a person
 * without describing one.
 */
export function hasVisualDna(c: Character): boolean {
  if ((c.promptDna ?? "").trim()) return true;
  return Boolean(
    (c.faceShape ?? "").trim() ||
      (c.eyeShape ?? "").trim() ||
      (c.eyeColor ?? "").trim() ||
      (c.hairStyle ?? "").trim() ||
      (c.hairColor ?? "").trim() ||
      (c.skinTone ?? "").trim() ||
      (c.bodyType ?? "").trim() ||
      (c.primaryOutfit ?? "").trim() ||
      (c.accessories ?? "").trim() ||
      (c.distinguishingFeatures ?? "").trim()
  );
}

export function identityAnchor(c: Character): string {
  const who = clause(c.age, c.gender, c.occupation) || c.role || "character";
  return c.name ? `${c.name}, ${who}` : who;
}

export interface ComposedDna {
  promptDna: string;
  consistencyRules: string;
}

/**
 * Compose the full Prompt DNA + Consistency Rules from the structured fields.
 * Ordering is deliberate: identity → face → hair → body → wardrobe → style,
 * which is the order image models weight most reliably for a consistent person.
 */
export function composeCharacterDna(c: Character): ComposedDna {
  const anchor = identityAnchor(c);

  // Face descriptors are distinct features → comma-separated for legibility,
  // while each descriptor's own words (e.g. "almond amber eyes") stay together.
  const face = [
    c.faceShape && `${c.faceShape} face`,
    clause(c.eyeShape, c.eyeColor && `${c.eyeColor} eyes`),
    c.skinTone && `${c.skinTone} skin`,
    c.distinguishingFeatures,
  ]
    .map((s) => (s ?? "").trim())
    .filter(Boolean)
    .join(", ");

  const hair = clause(c.hairStyle, c.hairColor && `${c.hairColor} hair`);

  const body = clause(c.bodyType && `${c.bodyType} build`);

  const wardrobe = clause(
    c.primaryOutfit && `wearing ${c.primaryOutfit}`,
    c.accessories && `with ${c.accessories}`
  );

  // Personality nudges expression/posture without dictating a scene.
  const demeanor = clause(c.traits && `${c.traits} demeanor`);

  const preset = findPreset(c.stylePreset);
  const styleFrag = preset?.fragment ?? "";

  const promptDna = [
    anchor,
    face,
    hair,
    body,
    wardrobe,
    demeanor,
    styleFrag,
    "consistent character design, same face across all shots, character sheet reference, high detail",
  ]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(", ");

  // Consistency rules: a positive lock + targeted negatives. Style presets
  // carry their own negatives, which we fold in.
  const locks: string[] = [];
  if (face) locks.push(`Keep the face exactly: ${face}.`);
  if (hair) locks.push(`Keep the hair exactly: ${hair}.`);
  if (c.primaryOutfit) locks.push(`Primary outfit stays: ${c.primaryOutfit}.`);
  if (c.distinguishingFeatures) locks.push(`Always preserve: ${c.distinguishingFeatures}.`);
  locks.push("Do not change identity, age, ethnicity, body proportions, or outfit between shots.");

  const negatives = [
    "inconsistent face",
    "different person",
    "changing hairstyle",
    "wardrobe drift",
    "extra fingers",
    "deformed features",
    preset?.negative,
  ]
    .filter(Boolean)
    .join(", ");

  const consistencyRules = `${locks.join(" ")}\nAvoid: ${negatives}.`;

  return { promptDna, consistencyRules };
}

/** True when the composed Prompt DNA is out of date vs the current fields. */
export function isDnaStale(c: Character): boolean {
  return composeCharacterDna(c).promptDna !== c.promptDna.trim();
}

// --- "Conjure from a line" quick draft -------------------------------------

const ROLE_HINTS: [RegExp, string][] = [
  [/protagonist|hero|lead|main character/i, "Protagonist"],
  [/antagonist|villain|nemesis|rival/i, "Antagonist"],
  [/mentor|guide|teacher/i, "Mentor"],
  [/sidekick|companion|partner/i, "Supporting"],
];

const GENDER_HINTS: [RegExp, string][] = [
  [/\b(woman|female|girl|she|her|lady)\b/i, "Female"],
  [/\b(man|male|boy|he|him|guy)\b/i, "Male"],
];

const HAIR_COLORS = [
  "black",
  "brown",
  "blonde",
  "red",
  "auburn",
  "grey",
  "gray",
  "white",
  "silver",
  "ginger",
];
const EYE_COLORS = ["brown", "blue", "green", "hazel", "grey", "gray", "amber"];

/**
 * Find a color from `palette` only when it sits next to the relevant body part
 * ("red hair", "hair was silver", "amber eyes") — so "silver revolver" doesn't
 * become silver hair. Precision over recall: this seeds a draft the user refines.
 */
function matchColorNear(text: string, palette: string[], part: string): string {
  const low = text.toLowerCase();
  for (const c of palette) {
    if (new RegExp(`\\b${c}\\b[\\w\\s]{0,12}\\b${part}\\b`).test(low)) return c;
    if (new RegExp(`\\b${part}\\b[\\w\\s]{0,12}\\b${c}\\b`).test(low)) return c;
  }
  return "";
}

/**
 * Parse one free-text line into a best-effort character draft. Deliberately
 * lightweight (no API): it seeds the obvious fields so the sheet is never
 * blank, then the user refines. e.g. "a grizzled female bounty hunter with
 * red hair and a long leather coat".
 */
export function draftCharacterFromLine(line: string): Character {
  const text = line.trim();
  const c = newCharacter();

  // Name: a leading Capitalized token that isn't an article.
  const nameMatch = text.match(/^([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/);
  if (nameMatch && !/^(A|An|The)$/.test(nameMatch[1])) {
    c.name = nameMatch[1];
  } else {
    c.name = "Unnamed";
  }

  for (const [re, role] of ROLE_HINTS) if (re.test(text)) c.role = role;
  for (const [re, g] of GENDER_HINTS)
    if (re.test(text)) {
      c.gender = g;
      break;
    }

  const age = text.match(/\b(\d{1,2})\s?(?:years? old|yo|y\/o)\b/i);
  const decade = text.match(/\(?\b(\d0)s\b\)?/); // "40s", "(50s)", "in her 30s"
  if (age) c.age = `${age[1]}`;
  else if (decade) c.age = `${decade[1]}s`;
  else if (/\b(old|elderly|aged|grey-haired)\b/i.test(text)) c.age = "Elderly";
  else if (/\b(young|teen|teenage|youthful)\b/i.test(text)) c.age = "Young";

  // Occupation: noun right before/after common role words, else a known list.
  const occ = text.match(
    /\b(bounty hunter|detective|pilot|soldier|scientist|wizard|witch|knight|nurse|doctor|engineer|hacker|farmer|chef|teacher|king|queen|prince|princess|robot|android|samurai|ninja|priest|monk|merchant|sailor|captain|explorer)\b/i
  );
  if (occ) c.occupation = occ[1].toLowerCase();

  c.hairColor = matchColorNear(text, HAIR_COLORS, "hair");
  c.eyeColor = matchColorNear(text, EYE_COLORS, "eyes?");

  // Wardrobe: phrase after "wearing" / "in a" / "with a … coat/jacket/dress".
  const outfit = text.match(
    /\b(?:wearing|in|dressed in)\s+(?:an?\s+)?([^,.;]+?(?:coat|jacket|dress|suit|armor|armour|robe|uniform|cloak|hoodie|gown|outfit))\b/i
  );
  if (outfit) c.primaryOutfit = outfit[1].trim();

  if (/\bscar(red)?\b/i.test(text)) c.distinguishingFeatures = "facial scar";
  if (/\bfreckl/i.test(text))
    c.distinguishingFeatures = clause(c.distinguishingFeatures, "freckles");
  if (/\bbeard|stubble\b/i.test(text))
    c.distinguishingFeatures = clause(c.distinguishingFeatures, "beard");

  // Traits: leading adjectives are a decent personality seed.
  const adjs = text.match(
    /\b(grizzled|cheerful|stern|kind|cruel|brave|timid|cunning|wise|arrogant|gentle|fierce|calm|nervous|charming|brooding)\b/gi
  );
  if (adjs) c.traits = Array.from(new Set(adjs.map((a) => a.toLowerCase()))).join(", ");

  const composed = composeCharacterDna(c);
  c.promptDna = composed.promptDna;
  c.consistencyRules = composed.consistencyRules;
  return c;
}

export const CHARACTER_ROLES = [
  "Protagonist",
  "Antagonist",
  "Deuteragonist",
  "Mentor",
  "Supporting",
  "Background",
] as const;
