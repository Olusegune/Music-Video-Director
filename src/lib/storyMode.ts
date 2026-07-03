// Magic Mode — Story Mode. A narrative layer laid over the song structure,
// independent of Video Type/Style: "Choose the story feeling."
//
// Input priority (per spec): a user-written custom idea takes precedence,
// then any uploaded lyrics/script text (used as the narrative source — the
// Lyrics step already accepts a script upload as well as pasted lyrics), and
// finally a generic feeling-based arc when neither is available. Everything
// here is local/heuristic, consistent with the rest of the app's "no API
// needed to plan" engines (inferStyle, detectSectionPerformer, etc.).

import type { SongMap } from "@/lib/songBrain";

export type StoryFeelingKey =
  | "none"
  | "love"
  | "rise-up"
  | "transformation"
  | "party"
  | "spiritual"
  | "revenge"
  | "dream"
  | "custom";

export interface StoryFeelingDef {
  key: StoryFeelingKey;
  label: string;
  tagline: string;
}

export const STORY_FEELINGS: StoryFeelingDef[] = [
  { key: "none", label: "No Story", tagline: "Performance only — let the song carry it." },
  { key: "love", label: "Love Story", tagline: "Two people, a connection, a spark." },
  { key: "rise-up", label: "Rise Up", tagline: "Overcoming odds, finding strength." },
  { key: "transformation", label: "Transformation", tagline: "Becoming someone new." },
  { key: "party", label: "Party / Celebration", tagline: "Joy, friends, the night of your life." },
  { key: "spiritual", label: "Spiritual Journey", tagline: "Faith, hope, something bigger." },
  { key: "revenge", label: "Revenge / Victory", tagline: "Coming out on top." },
  { key: "dream", label: "Dream World", tagline: "Surreal, symbolic, larger than life." },
  { key: "custom", label: "Custom Story", tagline: "Write your own idea." },
];

export function findStoryFeeling(key?: string | null): StoryFeelingDef | undefined {
  return STORY_FEELINGS.find((f) => f.key === key);
}

/** The six beats the system lays over every story-mode song. */
export interface StoryBeats {
  opening: string;
  verse: string;
  chorus: string;
  bridge: string;
  finalChorus: string;
  ending: string;
}

// Per-feeling beat templates. `{hook}` is replaced with a short quoted line
// pulled from the source text (custom idea or uploaded lyrics/script) when
// one is available, and dropped cleanly when it isn't.
const TEMPLATES: Record<Exclude<StoryFeelingKey, "none">, (hook: string) => StoryBeats> = {
  love: (hook) => ({
    opening: `Establish two people in the same world, not yet together${hook}.`,
    verse: "Verses trace the pull between them — glances, near-misses, growing closeness.",
    chorus: "The chorus is the moment they finally connect — performance and story collide.",
    bridge: "A moment of doubt or distance — the bridge is the turning point in the relationship.",
    finalChorus: "They come back together, bigger and more certain than before.",
    ending: "Final image: the two of them, together, held on screen.",
  }),
  "rise-up": (hook) => ({
    opening: `Open low — the artist starting from a hard place${hook}.`,
    verse: "Verses show the struggle and the small decisions to keep going.",
    chorus: "The chorus is the fight-back moment — full performance power.",
    bridge: "The bridge is the lowest point before the turn — a breath before the climb.",
    finalChorus: "The final chorus is the triumphant payoff — everything earned, all at once.",
    ending: "Final image: the artist standing tall, having risen.",
  }),
  transformation: (hook) => ({
    opening: `Open with the artist as they are now, before the change${hook}.`,
    verse: "Verses mark small shifts — a new look, a new posture, a new confidence.",
    chorus: "The chorus shows the change in motion — performance as transformation.",
    bridge: "The bridge is the moment of full change — visually the biggest shift in the video.",
    finalChorus: "The final chorus reveals who they've become.",
    ending: "Final image: the transformed artist, unmistakably new.",
  }),
  party: (hook) => ({
    opening: `Open on the build-up — friends gathering, energy rising${hook}.`,
    verse: "Verses move through the night — different rooms, different moments, same joy.",
    chorus: "The chorus is the peak of the party — everyone in, full performance energy.",
    bridge: "The bridge is a quieter, closer beat — a moment among friends before the next peak.",
    finalChorus: "The final chorus is the biggest celebration of the night.",
    ending: "Final image: the whole crew together, the night at its best.",
  }),
  spiritual: (hook) => ({
    opening: `Open in stillness — a quiet search for something bigger${hook}.`,
    verse: "Verses trace the questions and small moments of faith along the way.",
    chorus: "The chorus is release — performance as an act of belief.",
    bridge: "The bridge is a moment of doubt or surrender before the breakthrough.",
    finalChorus: "The final chorus is the breakthrough — conviction, fully arrived.",
    ending: "Final image: the artist at peace, looking upward or outward.",
  }),
  revenge: (hook) => ({
    opening: `Open with what was taken or wronged — the reason this matters${hook}.`,
    verse: "Verses build resolve — the plan, the preparation, the edge sharpening.",
    chorus: "The chorus is the confrontation — full performance power, no apology.",
    bridge: "The bridge is the moment it could go either way — the real risk.",
    finalChorus: "The final chorus is the win — total, deserved, unmissable.",
    ending: "Final image: the artist victorious, unbothered, in control.",
  }),
  dream: (hook) => ({
    opening: `Open somewhere that isn't quite real — symbolic, larger than life${hook}.`,
    verse: "Verses drift through surreal, symbolic spaces tied to the song's imagery.",
    chorus: "The chorus is the dream at its most vivid — performance inside the symbol.",
    bridge: "The bridge bends the logic further — the strangest, most striking beat.",
    finalChorus: "The final chorus is the dream at full scale — everything heightened.",
    ending: "Final image: an unresolved, iconic symbol — the dream held, not explained.",
  }),
  custom: (hook) => ({
    opening: `Open on the idea the user described${hook}.`,
    verse: "Verses carry that idea forward, beat by beat, alongside the song.",
    chorus: "The chorus is where the idea and the performance meet.",
    bridge: "The bridge is the turning point in the user's story.",
    finalChorus: "The final chorus pays off the idea at full performance energy.",
    ending: "Final image: the resolution of the story the user wrote.",
  }),
};

const NO_STORY: StoryBeats = {
  opening: "Cold open on the artist — no narrative, pure performance energy.",
  verse: "Performance continues; the song carries the moment on its own.",
  chorus: "Full-out performance payoff.",
  bridge: "A quieter, more intimate performance beat.",
  finalChorus: "Peak performance energy returns.",
  ending: "Final performance hold — the artist, alone with the camera.",
};

/** Raw lyrics/script text already captured on the song (Magic Mode's Lyrics step
 *  doubles as a script upload — same field, either use). */
function rawSourceText(song: SongMap): string {
  if (song.lyrics.length > 0) return song.lyrics.map((l) => l.text).join(" ");
  return song.sections
    .map((s) => s.lyricsText ?? "")
    .filter(Boolean)
    .join(" ");
}

/** Pull one short, presentable line to anchor the beats to, or "" if none. */
function extractHook(text: string): string {
  const line = text
    .split(/[.\n]/)
    .map((s) => s.trim())
    .find((s) => s.length >= 8 && s.length <= 80);
  return line ? ` — "${line}"` : "";
}

/** A short "named character/place" clause appended to the opening beat when
 *  the parsing engine found one, e.g. " Maya moves through the city." */
function namedAnchor(song: SongMap): string {
  const p = song.parsedScript;
  if (!p) return "";
  const who = p.characters[0];
  const where = p.locations[0];
  if (who && where) return ` ${who} moves through the ${where}.`;
  if (who) return ` ${who} anchors the story.`;
  if (where) return ` The story lives in the ${where}.`;
  return "";
}

export function buildStoryBeats(
  song: SongMap,
  feeling: StoryFeelingKey,
  customIdea?: string
): StoryBeats {
  if (feeling === "none") return NO_STORY;

  // Prefer a real repeated hook line from the parsing engine (a chorus/hook is
  // reliably the song's most quotable moment) over the cruder first-plausible-
  // line guess, which only kicks in when there's no parse to draw from.
  const custom = customIdea?.trim();
  const parsedHook = !custom ? song.parsedScript?.hookMoments[0] : undefined;
  const hook = custom
    ? extractHook(custom)
    : parsedHook
      ? ` — "${parsedHook}"`
      : extractHook(rawSourceText(song));

  const build = TEMPLATES[feeling] ?? TEMPLATES.custom;
  const beats = build(hook);
  const anchor = !custom ? namedAnchor(song) : "";
  return anchor ? { ...beats, opening: beats.opening + anchor } : beats;
}
