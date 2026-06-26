// Local script-analysis engine — STEP 2 of the workflow, done offline.
//
// Parses a screenplay / Fountain / prose script and extracts the production
// entities the spec asks for: characters (+ relationships + a description seed),
// locations, props, vehicles, creatures, scenes, mood/tone, and visual motifs.
// No API call — same offline-first philosophy as localEngine.ts. Extracted
// characters convert straight into Character DNA records via characterDna.ts.

import type { Character } from "@/lib/types";
import {
  composeCharacterDna,
  draftCharacterFromLine,
} from "@/lib/characterDna";

export interface ExtractedCharacter {
  name: string;
  mentions: number;
  /** Best descriptive line found near the character's introduction. */
  descriptionLine: string;
  /** Other characters they share scenes with. */
  relationships: string[];
}

export interface ExtractedEntity {
  name: string;
  mentions: number;
  /** A sentence/line giving the entity context. */
  context: string;
}

export interface ExtractedScene {
  heading: string;
  setting: "INT" | "EXT" | "INT/EXT";
  location: string;
  timeOfDay: string;
}

export interface ScriptAnalysis {
  characters: ExtractedCharacter[];
  locations: ExtractedEntity[];
  props: ExtractedEntity[];
  vehicles: ExtractedEntity[];
  creatures: ExtractedEntity[];
  scenes: ExtractedScene[];
  mood: string;
  emotionalTone: string;
  visualMotifs: string[];
}

// --- lexicons --------------------------------------------------------------

const VEHICLE_WORDS = [
  "car", "truck", "van", "motorcycle", "bike", "bicycle", "spaceship", "ship",
  "boat", "plane", "airplane", "jet", "helicopter", "train", "bus", "tank",
  "submarine", "carriage", "wagon", "horse", "chariot", "rover", "shuttle",
  "speeder", "freighter", "cruiser",
];

const CREATURE_WORDS = [
  "dragon", "wolf", "beast", "monster", "creature", "alien", "demon", "ghost",
  "zombie", "vampire", "werewolf", "troll", "ogre", "goblin", "serpent",
  "kraken", "phoenix", "griffin", "wraith", "mutant", "robot", "android",
  "drone", "golem", "spider", "shark",
];

const PROP_WORDS = [
  "gun", "pistol", "rifle", "revolver", "blaster", "sword", "knife", "dagger",
  "blade", "axe", "bow", "shield", "briefcase", "suitcase", "phone",
  "letter", "envelope", "key", "map", "ring", "book", "journal", "diary",
  "bottle", "glass", "cup", "watch", "necklace", "amulet", "crown", "mask",
  "lantern", "torch", "candle", "photograph", "photo", "painting", "mirror",
  "box", "chest", "bag", "backpack", "laptop", "camera", "radio", "gem",
  "crystal", "coin", "scroll", "wand", "staff", "helmet", "compass",
];

// Natural-language location nouns (prose / treatment / lyric extraction, where
// there are no INT./EXT. scene headings).
const LOCATION_WORDS = [
  "street", "alley", "alleyway", "rooftop", "roof", "club", "nightclub",
  "stage", "beach", "warehouse", "city", "downtown", "bedroom", "studio",
  "desert", "forest", "woods", "bar", "diner", "kitchen", "office", "hallway",
  "garage", "highway", "road", "bridge", "park", "field", "mountain", "river",
  "lake", "ocean", "sea", "pool", "mansion", "penthouse", "apartment", "house",
  "church", "temple", "subway", "airport", "courtyard", "ballroom", "gallery",
  "runway", "arena", "stadium", "tunnel", "skyline", "market", "rooftop pool",
];

const WARDROBE_WORDS = [
  "jacket", "coat", "dress", "gown", "suit", "shirt", "hoodie", "jeans",
  "pants", "skirt", "boots", "sneakers", "heels", "hat", "cap", "scarf",
  "gloves", "mask", "sunglasses", "chain", "chains", "necklace", "earrings",
  "ring", "bracelet", "crown", "veil", "cape", "robe", "uniform", "armor",
  "leather", "silk", "satin", "denim", "velvet", "sequins", "fur", "lace",
];

const MOTIF_WORDS = [
  "rain", "storm", "fire", "smoke", "neon", "shadow", "shadows", "blood",
  "mirror", "light", "darkness", "fog", "mist", "snow", "ice", "ocean", "sea",
  "desert", "forest", "moon", "stars", "sun", "gold", "rust", "glass",
  "chrome", "steel", "dust", "ash", "water", "wind", "thunder", "lightning",
  "flowers", "candles",
];

const TONE_MAP: [RegExp, string][] = [
  [/laugh|joke|funny|playful|joy|delight/, "Playful, comedic"],
  [/love|romance|kiss|tender|embrace/, "Romantic, tender"],
  [/fear|terror|horror|scream|dread|nightmare/, "Tense, frightening"],
  [/death|grief|mourn|loss|funeral|tears/, "Somber, mournful"],
  [/war|battle|fight|explosion|gun|blood/, "Intense, action-driven"],
  [/mystery|clue|detective|secret|investigate/, "Suspenseful, mysterious"],
  [/hope|dream|triumph|rise|overcome/, "Uplifting, hopeful"],
  [/cold|empty|alone|silence|distant/, "Bleak, isolating"],
];

// Common all-caps lines that are NOT character cues.
const NON_CUES = new Set([
  "FADE IN", "FADE OUT", "FADE TO BLACK", "CUT TO", "SMASH CUT", "MATCH CUT",
  "DISSOLVE TO", "THE END", "CONTINUED", "MONTAGE", "INTERCUT", "BEGIN",
  "END", "TITLE", "SUPER", "INSERT", "BACK TO", "LATER", "MOMENTS LATER",
  "PRELAP", "BLACK", "OMITTED",
]);

// --- helpers ---------------------------------------------------------------

function lines(text: string): string[] {
  return text.split(/\n/).map((l) => l.trim());
}

function sentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/['’]S\b/g, (m) => m.toLowerCase());
}

const SCENE_RE = /^(INT\.?\/EXT\.?|I\/E|INT\.?|EXT\.?)\s+(.*)$/i;
const CUE_RE = /^[A-Z][A-Z0-9 .'’\-]{0,30}$/;

function stripCueSuffix(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*$/g, "").trim();
}

function isSceneHeading(line: string): boolean {
  return SCENE_RE.test(line);
}

function looksLikeCue(line: string): boolean {
  if (!line || line.length > 32) return false;
  if (isSceneHeading(line)) return false;
  if (line.endsWith(":")) return false; // transitions like "CUT TO:"
  const base = stripCueSuffix(line);
  if (!CUE_RE.test(base)) return false;
  if (NON_CUES.has(base)) return false;
  // Must contain at least one letter and not be a lone number/symbol.
  return /[A-Z]/.test(base) && base.replace(/[^A-Z]/g, "").length >= 2;
}

function countWord(text: string, word: string): number {
  const re = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
  return (text.match(re) ?? []).length;
}

function firstContext(sents: string[], word: string): string {
  const re = new RegExp(`\\b${word}\\b`, "i");
  const hit = sents.find((s) => re.test(s));
  return hit ? hit.slice(0, 160) : "";
}

function scanLexicon(
  text: string,
  sents: string[],
  lexicon: string[]
): ExtractedEntity[] {
  return lexicon
    .map((w) => ({ name: titleCase(w), mentions: countWord(text, w), context: "" }))
    .filter((e) => e.mentions > 0)
    .map((e) => ({ ...e, context: firstContext(sents, e.name.toLowerCase()) }))
    .sort((a, b) => b.mentions - a.mentions);
}

// --- scenes ----------------------------------------------------------------

function parseScenes(ls: string[]): ExtractedScene[] {
  const scenes: ExtractedScene[] = [];
  for (const line of ls) {
    const m = line.match(SCENE_RE);
    if (!m) continue;
    const settingRaw = m[1].toUpperCase().replace(/\./g, "");
    const setting: ExtractedScene["setting"] =
      settingRaw.includes("/") || settingRaw === "IE"
        ? "INT/EXT"
        : settingRaw.startsWith("INT")
          ? "INT"
          : "EXT";
    const rest = m[2].trim();
    // "LOCATION - TIME" (dash variants).
    const parts = rest.split(/\s+[-–—]\s+/);
    const location = titleCase(parts[0] ?? rest);
    const timeOfDay = parts.length > 1 ? titleCase(parts[parts.length - 1]) : "";
    scenes.push({ heading: line, setting, location, timeOfDay });
  }
  return scenes;
}

// --- characters ------------------------------------------------------------

function parseCharacters(ls: string[]): ExtractedCharacter[] {
  const counts = new Map<string, number>();
  // Per-scene cue sets, to derive relationships from co-occurrence.
  const perScene: Set<string>[] = [];
  let current: Set<string> | null = null;

  for (let i = 0; i < ls.length; i++) {
    const line = ls[i];
    if (isSceneHeading(line)) {
      current = new Set();
      perScene.push(current);
      continue;
    }
    if (looksLikeCue(line)) {
      // A real cue is usually followed by dialogue or a parenthetical (next
      // non-empty line exists and isn't itself a scene heading).
      const next = ls[i + 1] ?? "";
      if (next && !isSceneHeading(next)) {
        const name = stripCueSuffix(line);
        counts.set(name, (counts.get(name) ?? 0) + 1);
        current?.add(name);
      }
    }
  }

  const names = [...counts.keys()];
  const rel = new Map<string, Map<string, number>>();
  for (const set of perScene) {
    const arr = [...set];
    for (const a of arr)
      for (const b of arr) {
        if (a === b) continue;
        if (!rel.has(a)) rel.set(a, new Map());
        const m = rel.get(a)!;
        m.set(b, (m.get(b) ?? 0) + 1);
      }
  }

  const fullText = ls.join("\n");
  const sents = sentences(fullText);

  return names
    .map((name) => {
      const relationships = [...(rel.get(name)?.entries() ?? [])]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([n]) => titleCase(n));
      return {
        name: titleCase(name),
        mentions: counts.get(name) ?? 0,
        descriptionLine: introLine(sents, name),
        relationships,
      };
    })
    .sort((a, b) => b.mentions - a.mentions);
}

/**
 * Find the best introduction/description line for a character. Screenplays
 * introduce characters as "NAME (40s), a weary detective…", so we score
 * candidates toward that pattern and away from dialogue vocatives ("…, Marek.").
 */
function introLine(sents: string[], name: string): string {
  const esc = titleCase(name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const ci = new RegExp(`\\b${esc}\\b`, "i");
  const candidates = sents.filter((s) => ci.test(s));
  if (candidates.length === 0) return "";

  const score = (s: string): number => {
    let sc = 0;
    if (new RegExp(`\\b${esc}\\b\\s*\\(`, "i").test(s)) sc += 4; // NAME (40s)
    if (new RegExp(`^\\s*${esc}\\b`, "i").test(s)) sc += 2; // sentence subject
    if (/\(\d{1,2}s?\)|\d{1,2}s\b|years old|wearing|dressed|tall|eyes|hair|beard/i.test(s))
      sc += 2;
    if (new RegExp(`,\\s*${esc}\\s*[.!?]?$`, "i").test(s)) sc -= 4; // vocative
    return sc;
  };

  const best = [...candidates].sort((a, b) => score(b) - score(a))[0];
  return best.slice(0, 180);
}

// --- mood / motifs ---------------------------------------------------------

function detectTone(text: string): string {
  const low = text.toLowerCase();
  for (const [re, tone] of TONE_MAP) if (re.test(low)) return tone;
  return "Grounded, dramatic";
}

function detectMotifs(text: string): string[] {
  return MOTIF_WORDS.map((w) => ({ w, n: countWord(text, w) }))
    .filter((e) => e.n >= 2)
    .sort((a, b) => b.n - a.n)
    .slice(0, 6)
    .map((e) => titleCase(e.w));
}

// --- prose / lyric / treatment characters ----------------------------------

// Title-case words that are almost never character names.
const NAME_STOPLIST = new Set(
  [
    "The", "A", "An", "And", "But", "Or", "So", "Then", "When", "While",
    "Her", "His", "Their", "She", "He", "They", "We", "You", "It", "This",
    "That", "There", "Here", "Now", "Today", "Tonight", "Verse", "Chorus",
    "Bridge", "Intro", "Outro", "Hook", "Pre", "Scene", "Cut", "Int", "Ext",
    "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
    "Sunday", "January", "February", "March", "April", "May", "June", "July",
    "August", "September", "October", "November", "December", "God", "Lord",
  ].map((w) => w)
);

const LEXICON_NAMES = new Set(
  [...LOCATION_WORDS, ...PROP_WORDS, ...VEHICLE_WORDS, ...CREATURE_WORDS, ...WARDROBE_WORDS, ...MOTIF_WORDS].map(
    (w) => titleCase(w)
  )
);

/**
 * Extract characters from prose / lyrics / treatments (no screenplay cues).
 * Finds recurring proper nouns that read like people — repeated, possessive,
 * or attached to an action/description — and skips locations/props/words.
 * Recall-first: the review step lets the user delete false positives.
 */
function parseProseCharacters(text: string, sents: string[]): ExtractedCharacter[] {
  const re = /\b([A-Z][a-z]{2,}(?:\s[A-Z][a-z]+)?)\b/g;
  const counts = new Map<string, number>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const name = m[1].trim();
    const head = name.split(" ")[0];
    if (NAME_STOPLIST.has(head) || LEXICON_NAMES.has(name) || LEXICON_NAMES.has(head)) continue;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  const kept: ExtractedCharacter[] = [];
  for (const [name, mentions] of counts) {
    const esc = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const possessive = new RegExp(`\\b${esc}['’]s\\b`).test(text);
    const actsOrDescribed = new RegExp(
      `\\b${esc}\\b\\s+(is|was|wears|wearing|walks?|dances?|sings?|stands?|sits?|looks?|moves?|runs?|holds?|the|a)\\b`,
      "i"
    ).test(text);
    if (mentions >= 2 || possessive || actsOrDescribed) {
      const relationships = [...counts.keys()]
        .filter((o) => o !== name && sents.some((s) => s.includes(name) && s.includes(o)))
        .slice(0, 3);
      kept.push({
        name: titleCase(name),
        mentions,
        descriptionLine: introLine(sents, name),
        relationships: relationships.map(titleCase),
      });
    }
  }
  return kept.sort((a, b) => b.mentions - a.mentions).slice(0, 12);
}

/** Merge two character lists, deduped by name (screenplay cue wins). */
function mergeCharacters(
  primary: ExtractedCharacter[],
  extra: ExtractedCharacter[]
): ExtractedCharacter[] {
  const have = new Set(primary.map((c) => c.name.toLowerCase()));
  return [...primary, ...extra.filter((c) => !have.has(c.name.toLowerCase()))].sort(
    (a, b) => b.mentions - a.mentions
  );
}

/** Merge scene-heading locations with prose location nouns. */
function mergeLocations(
  fromScenes: ExtractedEntity[],
  text: string,
  sents: string[]
): ExtractedEntity[] {
  const have = new Set(fromScenes.map((e) => e.name.toLowerCase()));
  const prose = scanLexicon(text, sents, LOCATION_WORDS).filter(
    (e) => !have.has(e.name.toLowerCase())
  );
  return [...fromScenes, ...prose].sort((a, b) => b.mentions - a.mentions);
}

// --- main ------------------------------------------------------------------

export function analyzeScript(text: string): ScriptAnalysis {
  const ls = lines(text);
  const sents = sentences(text);
  const scenes = parseScenes(ls);

  return {
    characters: mergeCharacters(parseCharacters(ls), parseProseCharacters(text, sents)),
    scenes,
    locations: mergeLocations(dedupeLocations(scenes), text, sents),
    props: scanLexicon(text, sents, PROP_WORDS),
    vehicles: scanLexicon(text, sents, VEHICLE_WORDS),
    creatures: scanLexicon(text, sents, CREATURE_WORDS),
    mood: detectTone(text),
    emotionalTone: detectTone(text),
    visualMotifs: detectMotifs(text),
  };
}

function dedupeLocations(scenes: ExtractedScene[]): ExtractedEntity[] {
  const counts = new Map<string, number>();
  for (const s of scenes)
    counts.set(s.location, (counts.get(s.location) ?? 0) + 1);
  return [...counts.entries()]
    .map(([name, mentions]) => ({ name, mentions, context: "" }))
    .sort((a, b) => b.mentions - a.mentions);
}

// --- conversion to Character DNA -------------------------------------------

/** Convert an extracted character into a full Character DNA draft. */
export function extractedToCharacter(ec: ExtractedCharacter): Character {
  const seed = ec.descriptionLine.trim()
    ? ec.descriptionLine
    : ec.name;
  const c = draftCharacterFromLine(seed);
  c.name = ec.name; // trust the cue name over the parsed leading token
  if (ec.relationships.length)
    c.motivations = c.motivations
      ? c.motivations
      : `Shares scenes with ${ec.relationships.join(", ")}.`;
  const { promptDna, consistencyRules } = composeCharacterDna(c);
  c.promptDna = promptDna;
  c.consistencyRules = consistencyRules;
  return c;
}
