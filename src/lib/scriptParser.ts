// Parsing engine — turns raw uploaded/pasted text (lyrics, a script, a Suno-style
// export, a music-video idea, or free-form story notes) into structured
// production data: title, artist, genre, mood, themes, characters, locations,
// section markers, hook moments, emotional arc, visual symbols, performance
// opportunities, and choreography moments. Everything here is local pattern/
// keyword matching — consistent with the rest of the app's "no API needed to
// plan" engines (inferStyle, detectSectionPerformer, Story Mode).
//
// Extraction is necessarily approximate for free text (there is no guarantee a
// "location" or "character" heuristic is right). The one guarantee: the raw
// input is ALWAYS preserved verbatim in `sourceNotes`, so nothing is ever lost
// to a missed pattern.

import type { SectionKind } from "./songBrain";

// Reuses Song Brain's own SectionKind so a parsed [Verse]/[Chorus]/[Hook]
// marker maps directly onto the same section vocabulary the rest of the app
// (timeline, story beats, choreography) already understands. "Hook" markers
// read as "Drop" (Song Brain has no separate Hook kind); anything unrecognized
// falls back to "Verse" rather than inventing an "Other" kind nothing expects.
export type MarkedSectionKind = SectionKind;

export interface MarkedSection {
  kind: MarkedSectionKind;
  /** As written, e.g. "Verse 2" — preserved for display. */
  label: string;
  lines: string[];
}

export interface ParsedScript {
  songTitle?: string;
  artistName?: string;
  genre?: string;
  mood?: string;
  themes: string[];
  characters: string[];
  locations: string[];
  /** [Verse]/[Chorus]/… bracketed sections, if the text has them (common in
   *  lyric sheets and Suno-style exports). Empty when the text has no markers. */
  sections: MarkedSection[];
  /** Lines that repeat verbatim — the hallmark of a hook/chorus. */
  hookMoments: string[];
  emotionalArc: string;
  visualSymbols: string[];
  performanceOpportunities: string[];
  choreographyMoments: string[];
  /** The exact raw input, always preserved regardless of extraction confidence. */
  sourceNotes: string;
}

const SECTION_MARKER_RE = /^\s*[[(]([a-z0-9 \-']+)[\])]\s*$/i;

const SECTION_KIND_MAP: [RegExp, MarkedSectionKind][] = [
  [/^intro/i, "Intro"],
  [/^pre.?chorus/i, "Pre-Chorus"],
  [/^chorus/i, "Chorus"],
  [/^hook/i, "Drop"],
  [/^bridge/i, "Bridge"],
  [/^outro/i, "Outro"],
  [/^(instrumental|interlude|break|drop)/i, "Instrumental"],
  [/^verse/i, "Verse"],
];

function classifyMarker(label: string): MarkedSectionKind {
  for (const [re, kind] of SECTION_KIND_MAP) if (re.test(label.trim())) return kind;
  return "Verse";
}

const GENRE_KEYWORDS: [RegExp, string][] = [
  [/afrobeat|amapiano/i, "Afrobeats"],
  [/\b(hip.?hop|rap(ping|per)?|bars\b)/i, "Hip Hop"],
  [/k-?pop/i, "K-Pop"],
  [/gospel|worship|hallelujah|praise/i, "Gospel"],
  [/\br&b|rnb\b/i, "R&B"],
  [/dancehall/i, "Dancehall"],
  [/reggaeton/i, "Reggaeton"],
  [/\bcountry\b|pickup truck|honky.?tonk/i, "Country"],
  [/\brock\b|guitar solo|mosh/i, "Rock"],
  [/\bedm\b|drop the bass|rave/i, "EDM"],
  [/\breggae\b/i, "Reggae"],
  [/\bpop\b/i, "Pop"],
];

const MOOD_KEYWORDS: [RegExp, string][] = [
  [/love|heart|kiss|forever|baby/i, "Romantic, warm"],
  [/fight|rise|overcome|stronger|never give up/i, "Determined, uplifting"],
  [/party|dance floor|all night|celebrat/i, "Energetic, festive"],
  [/faith|pray|god|bless|spirit/i, "Reverent, hopeful"],
  [/pain|cry|broke|alone|hurt/i, "Melancholy, raw"],
  [/money|shine|flex|crown|throne/i, "Confident, triumphant"],
  [/dream|float|stars|moonlight/i, "Dreamy, ethereal"],
];

const THEME_KEYWORDS: [RegExp, string][] = [
  [/love|romance|heart/i, "Love"],
  [/lose|loss|goodbye|miss you/i, "Loss"],
  [/rise|overcome|fight|stronger/i, "Triumph"],
  [/party|celebrat|all night/i, "Celebration"],
  [/faith|god|pray|spirit/i, "Faith"],
  [/revenge|payback|karma/i, "Revenge"],
  [/family|mama|home town/i, "Family"],
  [/free|escape|run away/i, "Freedom"],
  [/remember|used to|back then/i, "Nostalgia"],
  [/hustle|grind|ambition|dream big/i, "Ambition"],
];

const LOCATION_WORDS = [
  "city", "street", "club", "beach", "church", "stage", "rooftop", "car",
  "highway", "desert", "forest", "mountain", "ocean", "bedroom", "kitchen",
  "hometown", "downtown", "block", "porch", "bar", "studio",
];

const SYMBOL_WORDS = [
  "fire", "water", "light", "crown", "mirror", "chains", "wings", "storm",
  "roses", "gold", "stars", "moon", "sun", "diamond", "smoke", "rain",
  "shadow", "flame", "ocean", "sky",
];

const DANCE_WORDS = /\b(dance|move|sway|spin|drop|beat|rhythm|shuffle|groove|hips|step)\b/i;
const RAP_WORDS = /\b(rap|bars|flow|verse.?spit|mic drop)\b/i;
const HARMONY_WORDS = /\b(choir|harmony|backup|ad.?lib|call and response)\b/i;

const STOPWORDS = new Set([
  "The", "This", "That", "And", "But", "For", "You", "Your", "With", "From",
  "When", "Where", "What", "Verse", "Chorus", "Bridge", "Intro", "Outro",
  "Hook", "Pre", "I", "It", "Oh", "Yeah", "Not", "All",
]);

function splitLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

/** Split raw text into [Marker]-delimited sections, if any exist. */
function extractMarkedSections(lines: string[]): MarkedSection[] {
  const sections: MarkedSection[] = [];
  let current: MarkedSection | null = null;
  for (const line of lines) {
    const m = line.match(SECTION_MARKER_RE);
    if (m) {
      if (current) sections.push(current);
      current = { kind: classifyMarker(m[1]), label: m[1].trim(), lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) sections.push(current);
  return sections;
}

/** Lines that appear 2+ times verbatim — the hallmark of a hook/chorus. */
function extractHookMoments(lines: string[]): string[] {
  const counts = new Map<string, number>();
  for (const l of lines) {
    const key = l.toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const seen = new Set<string>();
  const hooks: string[] = [];
  for (const l of lines) {
    const key = l.toLowerCase();
    if ((counts.get(key) ?? 0) >= 2 && !seen.has(key) && l.length >= 6) {
      seen.add(key);
      hooks.push(l);
    }
  }
  return hooks.slice(0, 6);
}

/** A best-effort title/artist guess: an early, short, marker-free line often
 *  reads as a title, and an explicit "by <name>" reads as the artist. */
function extractTitleArtist(text: string, lines: string[]): { title?: string; artist?: string } {
  const byMatch = text.match(/\bby\s+([A-Z][\w' -]{1,40})/);
  const titleLine = text.match(/^(?:title|song)\s*:\s*(.+)$/im);
  const artistLine = text.match(/^artist\s*:\s*(.+)$/im);

  let title = titleLine?.[1]?.trim();
  if (!title) {
    const first = lines[0];
    if (first && !SECTION_MARKER_RE.test(first) && first.length <= 60 && !/[.!?]$/.test(first)) {
      title = first;
    }
  }
  const artist = artistLine?.[1]?.trim() || byMatch?.[1]?.trim();
  return { title, artist };
}

/** Capitalized words that repeat 2+ times and aren't common stopwords — a
 *  best-effort named-entity guess for characters/locations. */
function repeatedProperNouns(text: string): string[] {
  const matches = text.match(/\b[A-Z][a-z]{2,}\b/g) ?? [];
  const counts = new Map<string, number>();
  for (const w of matches) {
    if (STOPWORDS.has(w)) continue;
    counts.set(w, (counts.get(w) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([w]) => w)
    .slice(0, 8);
}

function matchAllKeywords(text: string, words: string[]): string[] {
  const low = text.toLowerCase();
  return words.filter((w) => low.includes(w));
}

export function parseScript(rawText: string): ParsedScript {
  const text = rawText ?? "";
  const lines = splitLines(text);
  const sections = extractMarkedSections(lines);
  const { title, artist } = extractTitleArtist(text, lines);

  const genre = GENRE_KEYWORDS.find(([re]) => re.test(text))?.[1];
  const mood = MOOD_KEYWORDS.find(([re]) => re.test(text))?.[1];
  const themes = THEME_KEYWORDS.filter(([re]) => re.test(text)).map(([, t]) => t);

  const properNouns = repeatedProperNouns(text);
  const locations = [
    ...matchAllKeywords(text, LOCATION_WORDS),
    ...properNouns.filter((w) => LOCATION_WORDS.some((l) => text.toLowerCase().includes(`${l} ${w.toLowerCase()}`))),
  ];
  // Characters: repeated proper nouns that aren't already read as locations.
  const characters = properNouns.filter((w) => !locations.includes(w));

  const visualSymbols = matchAllKeywords(text, SYMBOL_WORDS);
  // Exclude [Verse]/[Chorus]-style marker lines — they legitimately repeat
  // (e.g. two "[Chorus]" tags) but aren't lyric content worth surfacing as a hook.
  const lyricLines = lines.filter((l) => !SECTION_MARKER_RE.test(l));
  const hookMoments = extractHookMoments(lyricLines);

  const performanceOpportunities: string[] = [];
  if (RAP_WORDS.test(text)) performanceOpportunities.push("Rap verse / spoken bars moment");
  if (HARMONY_WORDS.test(text)) performanceOpportunities.push("Backing harmony / choir moment");
  if (hookMoments.length > 0) performanceOpportunities.push("Lead vocal hook — the repeated hook line(s)");

  const choreographyMoments: string[] = [];
  if (sections.length > 0) {
    for (const s of sections) {
      if (DANCE_WORDS.test(s.lines.join(" "))) {
        choreographyMoments.push(`${s.label || s.kind}: movement/dance cue in the lyric`);
      }
    }
  } else if (DANCE_WORDS.test(text)) {
    choreographyMoments.push("Movement/dance cue found in the text");
  }

  const beatCount = sections.filter((s) => s.kind === "Chorus" || s.kind === "Drop").length;
  const emotionalArc =
    sections.length > 0
      ? `${sections.length} marked section${sections.length === 1 ? "" : "s"}, ${beatCount} chorus/hook peak${beatCount === 1 ? "" : "s"} — energy builds into each one.`
      : mood
        ? `${mood} throughout — no explicit section markers to trace a peak/valley arc.`
        : "No strong mood signal detected — arc unclear from the text alone.";

  return {
    songTitle: title,
    artistName: artist,
    genre,
    mood,
    themes,
    characters,
    locations,
    sections,
    hookMoments,
    emotionalArc,
    visualSymbols,
    performanceOpportunities,
    choreographyMoments,
    sourceNotes: rawText,
  };
}
