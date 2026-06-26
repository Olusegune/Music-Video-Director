// Per-section performer detection.
//
// A music video is built section by section, and each section is performed
// differently — a spoken intro, a rapped verse, a sung-with-choir chorus, an
// instrumental bridge. This infers "who performs this section" from the section
// label + its lyrics, with a confidence flag so the UI can explicitly ask when
// it's unsure rather than guessing silently.

import type { SongSection } from "@/lib/songBrain";

/** The performer roles a section can be assigned. */
export const SECTION_PERFORMER_ROLES = [
  "Lead vocal",
  "Backup vocal",
  "Rapper",
  "Choir",
  "Crowd vocals",
  "Spoken narrator",
  "Off-screen voice",
  "Dancer group",
  "Band",
  "Instrumental",
] as const;

export type SectionPerformerRole = (typeof SECTION_PERFORMER_ROLES)[number];

export interface PerformerDetection {
  role: SectionPerformerRole;
  /** false = low confidence; the UI should ask "Who performs this section?" */
  confident: boolean;
  /** short reason shown as a hint */
  why: string;
}

const has = (t: string, re: RegExp) => re.test(t);

/** Infer the performer role for a single section. */
export function detectSectionPerformer(section: SongSection): PerformerDetection {
  const label = (section.label || section.kind || "").toLowerCase();
  const lyrics = (section.lyricsText || "").toLowerCase();
  const text = `${label} ${lyrics}`;
  const hasLyrics = lyrics.trim().length > 0;

  // Explicit in-lyric markers win.
  if (has(text, /\(\s*spoken\s*\)|\bspoken\b|narrat|voice[- ]?over|\bv\.?o\.?\b/))
    return { role: "Spoken narrator", confident: true, why: "spoken / narration marker" };
  if (has(text, /\bchoir\b/))
    return { role: "Choir", confident: true, why: '"choir" in the lyrics' };
  if (has(text, /\bcrowd\b|\bchant\b|\beverybody\b|\bsing along\b/))
    return { role: "Crowd vocals", confident: true, why: "crowd / chant marker" };
  if (has(text, /\brap\b|\brapper\b|\bbars?\b|\bspit\b|\bflow\b|\bverse \d.*\bfast\b/))
    return { role: "Rapper", confident: true, why: "rap / bars marker" };

  // Structure-based heuristics.
  if (has(label, /chorus|hook|drop/))
    return { role: "Lead vocal", confident: true, why: "chorus / hook" };
  if (has(label, /pre[- ]?chorus|verse/))
    return {
      role: "Lead vocal",
      confident: hasLyrics,
      why: hasLyrics ? "sung verse" : "verse with no lyrics yet",
    };
  if (has(label, /intro|outro/)) {
    if (!hasLyrics)
      return { role: "Instrumental", confident: false, why: "intro/outro, no lyrics — confirm" };
    return { role: "Lead vocal", confident: false, why: "intro/outro with lyrics — confirm" };
  }
  if (has(label, /bridge|interlude|break/)) {
    if (!hasLyrics)
      return { role: "Instrumental", confident: false, why: "bridge with no lyrics — confirm" };
    return { role: "Lead vocal", confident: false, why: "bridge with lyrics — confirm" };
  }
  if (has(label, /instrumental|solo/))
    return { role: "Instrumental", confident: true, why: "instrumental section" };

  // Fallback.
  if (!hasLyrics)
    return { role: "Instrumental", confident: false, why: "no lyrics — confirm performer" };
  return { role: "Lead vocal", confident: false, why: "defaulted — confirm performer" };
}

/** Detect across all sections; returns how many are uncertain. */
export function detectAllPerformers(sections: SongSection[]): {
  byId: Record<string, PerformerDetection>;
  unclear: number;
} {
  const byId: Record<string, PerformerDetection> = {};
  let unclear = 0;
  for (const s of sections) {
    const d = detectSectionPerformer(s);
    byId[s.id] = d;
    if (!d.confident) unclear += 1;
  }
  return { byId, unclear };
}
