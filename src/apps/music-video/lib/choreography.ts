// Choreography engine — generates dance/movement plans for a song's
// performance sections, keyed to its tempo, bars, and energy. Local, no API.
//
// For each high-energy / performance section it lays out 8-counts onto the
// section's bars, picks moves + formations + key poses from a style vocabulary,
// and writes continuity notes. Output is a "pose sheet" starting point that the
// user edits and that downstream image/video generation can reference.

import { getDoc, setDoc } from "@/platform/lib/durableStore";
import { getDirectorStyle } from "@/apps/music-video/lib/directorStyles";
import {
  barTimes,
  type SongMap,
  type SongSection,
  type SectionKind,
} from "@/apps/music-video/lib/songBrain";

export interface EightCount {
  /** Bar index within the song (1-based) this 8-count covers. */
  bar: number;
  startSec: number;
  /** Two phrases: counts 1–4 and 5–8. */
  phraseA: string;
  phraseB: string;
}

/** Acting / performance brief for a section. */
export interface PerformanceBrief {
  emotion: string;
  intent: string;
  subtext: string;
  facialExpression: string;
  energy: string;
}

export interface ChoreoSection {
  sectionId: string;
  label: string;
  kind: SectionKind;
  start: number;
  end: number;
  energy: number;
  intensity: string;
  formation: string;
  eightCounts: EightCount[];
  keyPoses: string[];
  continuity: string;
  /** Acting direction — emotion/intent/subtext/expression/energy. */
  performance?: PerformanceBrief;
  /** Camera move per key pose (the camera "dances" too). */
  cameraMoves?: string[];
  /** Lighting look per key pose. */
  lightingMoves?: string[];
}

/** Camera moves the section camera-choreography can use. */
export const CHOREO_CAMERA_MOVES = [
  "Wide shot",
  "Slow push-in",
  "Orbit",
  "Crane up",
  "Close-up",
  "Tracking",
  "Low angle",
  "Handheld",
];

/** Lighting looks the section lighting-choreography can use. */
export const CHOREO_LIGHTING = [
  "Hard key + haze",
  "Neon wash",
  "Silhouette backlight",
  "Soft top light",
  "Strobe accents",
  "Warm practicals",
  "Color-shift wash",
  "Spotlight pool",
];

/** Derive a default acting brief from the section kind + energy. */
export function defaultPerformance(kind: SectionKind, energy: number): PerformanceBrief {
  const hi = energy >= 0.66;
  const isChorus = /chorus|hook|drop/i.test(kind);
  if (isChorus)
    return {
      emotion: "Euphoric",
      intent: "Own the moment — sell the hook",
      subtext: "This is the message of the whole song",
      facialExpression: "Confident, open, big",
      energy: hi ? "High" : "Medium-high",
    };
  if (/bridge/i.test(kind))
    return {
      emotion: "Reflective",
      intent: "Turn inward before the final lift",
      subtext: "A breath before the payoff",
      facialExpression: "Vulnerable, searching",
      energy: "Medium",
    };
  return {
    emotion: hi ? "Driven" : "Curious",
    intent: "Carry the story forward",
    subtext: "Discovering something",
    facialExpression: hi ? "Intense, focused" : "Wonder",
    energy: hi ? "Medium-high" : "Medium",
  };
}

export interface ChoreoPlan {
  songId: string;
  style: string;
  /** Sections that did not get a set routine (natural movement). */
  freeSections: string[];
  sections: ChoreoSection[];
  createdAt: string;
  updatedAt: string;
}

// --- style vocabularies ----------------------------------------------------

interface StyleVocab {
  moves: string[];
  accents: string[];
  formations: string[];
  poses: string[];
}

const STYLES: Record<string, StyleVocab> = {
  "Hip Hop": {
    moves: [
      "bounce + groove",
      "two-step into a freeze",
      "body roll",
      "chest pop sequence",
      "footwork shuffle",
      "arm wave + lock",
      "drop to a knee slide",
      "shoulder bounce",
    ],
    accents: ["hit on the snare", "freeze on the beat", "head snap", "hard lock"],
    formations: [
      "loose V behind the lead",
      "staggered line",
      "circle around the lead",
      "diagonal wedge",
    ],
    poses: [
      "wide stance, arms crossed",
      "low crouch, fist forward",
      "one arm raised, head down",
      "lean-back silhouette",
    ],
  },
  Afrobeats: {
    moves: [
      "legwork shuffle",
      "zanku leg swing",
      "waist whine",
      "shoulder dance (gwara)",
      "skip + bounce",
      "arm sweep",
      "hip sway with step",
      "ground tap sequence",
    ],
    accents: ["hit on the log drum", "freeze with a smile", "shoulder pop", "leg flick"],
    formations: [
      "loose social circle",
      "two rows, call-and-response",
      "scattered organic group",
      "lead front, crew fanned out",
    ],
    poses: [
      "mid-legwork freeze",
      "shoulders up, big grin",
      "arms wide, hips set",
      "low bounce, hands out",
    ],
  },
  "Pop / Commercial": {
    moves: [
      "sharp arm choreo",
      "pivot step + pose",
      "hair flip turn",
      "box step",
      "level change",
      "synchronized point",
      "hip switch",
      "walk-and-pose",
    ],
    accents: ["snap on the count", "pose hold", "clean freeze", "head tilt accent"],
    formations: ["tight symmetrical line", "triangle, lead at apex", "mirror pairs", "V-formation"],
    poses: [
      "hand on hip, chin up",
      "arms framing the face",
      "wide power pose",
      "over-the-shoulder glance",
    ],
  },
  Contemporary: {
    moves: [
      "reach + contract",
      "floor roll to rise",
      "spiral turn",
      "suspended balance",
      "fall and recover",
      "sweeping port de bras",
      "lunge extension",
      "contraction release",
    ],
    accents: ["breath suspension", "soft freeze", "weight shift", "gaze follow"],
    formations: [
      "organic asymmetry",
      "solo with backdrop pairs",
      "diagonal flow",
      "clustered then scatter",
    ],
    poses: [
      "deep lunge, arm reaching",
      "curled on the floor",
      "arabesque line",
      "contracted core, head bowed",
    ],
  },
  Gospel: {
    moves: [
      "clap + step",
      "praise hands raise",
      "side-to-side sway",
      "spin into a lift",
      "stomp sequence",
      "march with claps",
      "joyful jump",
      "arm raise + reach",
    ],
    accents: ["hit on the choir swell", "hands to the sky", "freeze in praise", "clap accent"],
    formations: [
      "choir rows",
      "semicircle around the lead",
      "two lines clapping",
      "lead front, choir tiered",
    ],
    poses: [
      "both arms raised high",
      "head back, eyes up",
      "kneel with hands open",
      "wide embrace pose",
    ],
  },
  "Street / Krump": {
    moves: [
      "chest pop + stomp",
      "arm swing combo",
      "jab sequence",
      "buck stomp",
      "power groove",
      "rapid arm waves",
      "ground get-down",
      "explosive jump-out",
    ],
    accents: ["hard hit on the beat", "aggressive freeze", "chest pop accent", "stomp lock"],
    formations: [
      "tight cypher circle",
      "front line battle stance",
      "scattered hype crew",
      "lead center, crew hyping",
    ],
    poses: [
      "wide buck stance, fists up",
      "chest out, arms flexed",
      "low aggressive crouch",
      "mid-stomp freeze",
    ],
  },
  House: {
    moves: [
      "jack groove",
      "footwork (loft)",
      "skate step",
      "spin into shuffle",
      "heel-toe travel",
      "lofting arms",
      "salsa-house step",
      "jump kick combo",
    ],
    accents: ["ride the bassline", "smooth freeze", "footwork accent", "spin stop"],
    formations: [
      "loose freestyle scatter",
      "loose circle",
      "traveling line",
      "lead front, crew grooving",
    ],
    poses: ["mid-jack lean", "arms loose, head down", "wide footwork stance", "spin-out arms wide"],
  },
  "Stage / Theatrical": {
    moves: [
      "dramatic walk + turn",
      "fan kick",
      "tableau pose change",
      "grand gesture sweep",
      "level cascade",
      "spotlight step-out",
      "ensemble unison hit",
      "dramatic reach",
    ],
    accents: ["hit on the orchestral stab", "tableau freeze", "spotlight pose", "unison snap"],
    formations: [
      "symmetrical ensemble",
      "tiered staging",
      "lead downstage, ensemble back",
      "diagonal grand line",
    ],
    poses: [
      "grand arms-wide finish",
      "dramatic reach to the light",
      "tableau group freeze",
      "spotlight power pose",
    ],
  },
};

const DEFAULT_STYLE = "Pop / Commercial";

/** Choose a style from energy + tempo when the cast doesn't specify one. */
export function inferStyle(song: SongMap): string {
  const avg = song.sections.reduce((a, s) => a + s.energy, 0) / Math.max(1, song.sections.length);
  if (song.bpm >= 120 && avg >= 0.7) return "Hip Hop";
  if (song.bpm >= 110) return "Afrobeats";
  if (avg < 0.4) return "Contemporary";
  return DEFAULT_STYLE;
}

export const CHOREO_STYLES = Object.keys(STYLES);

// --- helpers ---------------------------------------------------------------

function pick<T>(pool: T[], i: number): T {
  return pool[((i % pool.length) + pool.length) % pool.length];
}

// A stable per-song offset into every pool. Without it these picks are keyed
// on section index alone, so section 0 of every song gets pool[0] — identical
// camera moves, lighting, formations, and poses in every music video ever
// choreographed. Same fix (and same hash) as directSong() in mvDirector.ts.
// Deterministic per song: re-choreographing one song gives the same plan.
function songSeed(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// --- lyric/script-aware move selection --------------------------------------
//
// The vocab pools below (moves/accents/formations/poses) already use plain,
// descriptive language — "praise hands raise", "kneel with hands open",
// "spin into a lift" — so the words that would show up in a lyric line or a
// director's note ("reach for the sky", "kneel and pray") already overlap
// with the words used to describe the matching gesture. That overlap is
// enough to bias selection toward what the section is actually about,
// without needing real NLP: group trigger words into themes, and prefer any
// vocab entry that shares a theme word with the section's own text.

const GESTURE_THEMES: Record<string, string[]> = {
  reachUp: ["sky", "up", "high", "rise", "reach", "heaven", "light", "raise"],
  point: ["you", "point", "aim"],
  spin: ["spin", "turn", "round", "twirl", "circle"],
  travel: ["walk", "strut", "move", "run", "chase", "step"],
  chest: ["heart", "love", "chest", "soul"],
  low: ["down", "low", "fall", "ground", "floor", "kneel"],
  explosive: ["fire", "burn", "power", "jump", "wild", "explode"],
  praise: ["pray", "praise", "glory", "worship", "amen", "hallelujah"],
};

/** Every trigger word from every theme found in `text` — the pool a matching
 *  vocab entry can share a word with. Empty when nothing matches, so callers
 *  fall back to their normal behavior for instrumental or lyric-free songs. */
function activeThemeWords(text: string): string[] {
  const lower = text.toLowerCase();
  const words: string[] = [];
  for (const themeWords of Object.values(GESTURE_THEMES)) {
    if (themeWords.some((w) => lower.includes(w))) words.push(...themeWords);
  }
  return words;
}

/** Like pick(), but prefers pool entries that share a theme word with the
 *  section's lyrics/notes — e.g. "reach for the sky" biases toward
 *  "praise hands raise" over an unrelated move in the same style. Falls back
 *  to plain round-robin pick() when nothing in the pool matches. */
function lyricAwarePick<T extends string>(pool: T[], words: string[], i: number): T {
  if (words.length) {
    const matches = pool.filter((item) => {
      const lower = item.toLowerCase();
      return words.some((w) => lower.includes(w));
    });
    if (matches.length) return matches[((i % matches.length) + matches.length) % matches.length];
  }
  return pick(pool, i);
}

function isPerformanceSection(s: SongSection): boolean {
  if (s.kind === "Chorus" || s.kind === "Drop" || s.kind === "Pre-Chorus") return true;
  if (s.kind === "Instrumental" && s.energy >= 0.5) return true;
  return s.energy >= 0.7;
}

function intensityFor(energy: number): string {
  if (energy >= 0.8) return "Full-out — maximum power and attack";
  if (energy >= 0.6) return "High — sharp and committed";
  if (energy >= 0.4) return "Medium — groove-led, controlled";
  return "Low — subtle, expressive movement";
}

// --- main ------------------------------------------------------------------

export function choreographSong(song: SongMap, styleName?: string): ChoreoPlan {
  const style = styleName && STYLES[styleName] ? styleName : inferStyle(song);
  const base = STYLES[style] ?? STYLES[DEFAULT_STYLE];
  // A director style contributes movement *quality* on top of the dance
  // vocabulary — the same steps read differently when the brief asks for
  // jointed inhuman articulation rather than clean tight unison. Its terms go
  // first so they lead, without discarding the dance style's own range.
  const directorFlavor = getDirectorStyle(song.directorStyleId)?.choreoFlavor;
  const vocab: StyleVocab = directorFlavor?.length
    ? { ...base, moves: [...directorFlavor, ...base.moves], formations: [...directorFlavor, ...base.formations] }
    : base;
  const bars = barTimes(song);
  const barDur = (60 / Math.max(1, song.bpm)) * song.beatsPerBar;

  const seed = songSeed(song.id);
  let moveIdx = seed;
  const sections: ChoreoSection[] = [];
  const freeSections: string[] = [];

  song.sections.forEach((section, si) => {
    if (!isPerformanceSection(section)) {
      freeSections.push(section.label);
      return;
    }

    // Bars that fall inside this section.
    const sectionBars = bars.filter((t) => t >= section.start - 0.01 && t < section.end);
    // One 8-count per 2 bars (a typical phrase), clamped.
    const phraseCount = Math.max(2, Math.min(8, Math.round(sectionBars.length / 2) || 2));

    // Whatever text exists to read intent from: the lyrics for this section,
    // plus any director's/story notes — the same fields Direct already
    // reads for shot prompts (briefForSection), so a "script" pasted into
    // those notes shapes the choreography exactly the way it shapes the shots.
    const sourceText = [section.lyricsText, section.choreoNote, section.storyNote]
      .filter(Boolean)
      .join(" ");
    const words = activeThemeWords(sourceText);

    const eightCounts: EightCount[] = [];
    for (let p = 0; p < phraseCount; p++) {
      const barAt = sectionBars[p * 2] ?? section.start + p * 2 * barDur;
      const barNo = Math.round((barAt - song.beatOffsetSec) / barDur) + 1;
      eightCounts.push({
        bar: Math.max(1, barNo),
        startSec: barAt,
        phraseA: `${lyricAwarePick(vocab.moves, words, moveIdx)}, ${lyricAwarePick(vocab.accents, words, moveIdx)}`,
        phraseB: `${lyricAwarePick(vocab.moves, words, moveIdx + 1)} → ${lyricAwarePick(vocab.accents, words, moveIdx + 2)}`,
      });
      moveIdx += 2;
    }

    sections.push({
      sectionId: section.id,
      label: section.label,
      kind: section.kind,
      start: section.start,
      end: section.end,
      energy: section.energy,
      intensity: intensityFor(section.energy),
      formation: lyricAwarePick(vocab.formations, words, si + seed),
      eightCounts,
      keyPoses: [
        lyricAwarePick(vocab.poses, words, si + seed),
        lyricAwarePick(vocab.poses, words, si + seed + 1),
        lyricAwarePick(vocab.poses, words, si + seed + 2),
      ],
      continuity:
        "Keep facing and levels consistent with the previous chorus; the hook move repeats so it reads as the signature.",
      performance: defaultPerformance(section.kind, section.energy),
      cameraMoves: [
        pick(CHOREO_CAMERA_MOVES, si + seed),
        pick(CHOREO_CAMERA_MOVES, si + seed + 2),
        pick(CHOREO_CAMERA_MOVES, si + seed + 4),
      ],
      lightingMoves: [
        pick(CHOREO_LIGHTING, si + seed),
        pick(CHOREO_LIGHTING, si + seed + 1),
        pick(CHOREO_LIGHTING, si + seed + 3),
      ],
    });
  });

  const now = new Date().toISOString();
  return {
    songId: song.id,
    style,
    freeSections,
    sections,
    createdAt: now,
    updatedAt: now,
  };
}

// ---------------------------------------------------------------------------
// Persistence (durable doc store, keyed by song id)
// ---------------------------------------------------------------------------

const LS_CHOREO = "mf.choreo";

function loadAll(): ChoreoPlan[] {
  try {
    const raw = getDoc(LS_CHOREO);
    return raw ? (JSON.parse(raw) as ChoreoPlan[]) : [];
  } catch {
    return [];
  }
}

export function getChoreo(songId: string): ChoreoPlan | null {
  return loadAll().find((c) => c.songId === songId) ?? null;
}

export function saveChoreo(plan: ChoreoPlan): void {
  const next = { ...plan, updatedAt: new Date().toISOString() };
  const all = loadAll();
  const i = all.findIndex((c) => c.songId === plan.songId);
  if (i >= 0) all[i] = next;
  else all.unshift(next);
  setDoc(LS_CHOREO, JSON.stringify(all));
}

export function deleteChoreo(songId: string): void {
  setDoc(LS_CHOREO, JSON.stringify(loadAll().filter((c) => c.songId !== songId)));
}
