// Choreography engine — generates dance/movement plans for a song's
// performance sections, keyed to its tempo, bars, and energy. Local, no API.
//
// For each high-energy / performance section it lays out 8-counts onto the
// section's bars, picks moves + formations + key poses from a style vocabulary,
// and writes continuity notes. Output is a "pose sheet" starting point that the
// user edits and that downstream image/video generation can reference.

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
  const vocab = STYLES[style] ?? STYLES[DEFAULT_STYLE];
  const bars = barTimes(song);
  const barDur = (60 / Math.max(1, song.bpm)) * song.beatsPerBar;

  let moveIdx = 0;
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

    const eightCounts: EightCount[] = [];
    for (let p = 0; p < phraseCount; p++) {
      const barAt = sectionBars[p * 2] ?? section.start + p * 2 * barDur;
      const barNo = Math.round((barAt - song.beatOffsetSec) / barDur) + 1;
      eightCounts.push({
        bar: Math.max(1, barNo),
        startSec: barAt,
        phraseA: `${pick(vocab.moves, moveIdx)}, ${pick(vocab.accents, moveIdx)}`,
        phraseB: `${pick(vocab.moves, moveIdx + 1)} → ${pick(vocab.accents, moveIdx + 2)}`,
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
      formation: pick(vocab.formations, si),
      eightCounts,
      keyPoses: [pick(vocab.poses, si), pick(vocab.poses, si + 1), pick(vocab.poses, si + 2)],
      continuity:
        "Keep facing and levels consistent with the previous chorus; the hook move repeats so it reads as the signature.",
      performance: defaultPerformance(section.kind, section.energy),
      cameraMoves: [
        pick(CHOREO_CAMERA_MOVES, si),
        pick(CHOREO_CAMERA_MOVES, si + 2),
        pick(CHOREO_CAMERA_MOVES, si + 4),
      ],
      lightingMoves: [
        pick(CHOREO_LIGHTING, si),
        pick(CHOREO_LIGHTING, si + 1),
        pick(CHOREO_LIGHTING, si + 3),
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
// Persistence (localStorage, keyed by song id)
// ---------------------------------------------------------------------------

const LS_CHOREO = "mf.choreo";

function loadAll(): ChoreoPlan[] {
  try {
    const raw = localStorage.getItem(LS_CHOREO);
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
  localStorage.setItem(LS_CHOREO, JSON.stringify(all));
}

export function deleteChoreo(songId: string): void {
  localStorage.setItem(LS_CHOREO, JSON.stringify(loadAll().filter((c) => c.songId !== songId)));
}
