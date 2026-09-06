// Aligning a written script to a detected song structure.
//
// Both sides already speak the same vocabulary: Song Brain detects sections as
// SectionKind, and scriptParser marks a script's [Verse]/[Chorus] blocks as the
// same kind. So this is a sequence alignment between two SectionKind lists,
// not a parsing problem.
//
// The two lists rarely match one-to-one. A writer's sheet has four verses; the
// detector heard five. A script has a bridge the audio doesn't. Guessing
// silently is the wrong answer — a verse's words landing on the wrong 30
// seconds of song is worse than admitting the mismatch — so alignment produces
// an explicit, editable mapping and reports what it could not place.

import type { SongMap, SongSection, SectionKind } from "@/apps/music-video/lib/songBrain";
import type { ParsedScript, MarkedSection } from "@/platform/lib/scriptParser";

export interface AlignedPair {
  songSectionId: string;
  songLabel: string;
  songKind: SectionKind;
  /** Index into ParsedScript.sections, or null when nothing was matched. */
  scriptIndex: number | null;
  /** How the pairing was arrived at — shown to the user, not just internal. */
  basis: "kind" | "order" | "none";
}

export interface Alignment {
  pairs: AlignedPair[];
  /** Script sections that never found a home, by index. */
  unusedScriptIndexes: number[];
}

/**
 * Pair each song section with a script section.
 *
 * Kind first: the nth Chorus of the script belongs with the nth Chorus of the
 * song, which survives one side having extra verses. Whatever is left over is
 * filled in reading order, and anything still unmatched is reported rather
 * than forced.
 */
export function alignScriptToSong(script: ParsedScript, song: SongMap): Alignment {
  const pairs: AlignedPair[] = song.sections.map((s) => ({
    songSectionId: s.id,
    songLabel: s.label,
    songKind: s.kind,
    scriptIndex: null,
    basis: "none" as const,
  }));

  const taken = new Set<number>();

  // Pass 1 — match by kind, in order within each kind.
  const scriptByKind = new Map<SectionKind, number[]>();
  script.sections.forEach((sec, i) => {
    const list = scriptByKind.get(sec.kind) ?? [];
    list.push(i);
    scriptByKind.set(sec.kind, list);
  });

  const usedPerKind = new Map<SectionKind, number>();
  pairs.forEach((pair) => {
    const candidates = scriptByKind.get(pair.songKind);
    if (!candidates?.length) return;
    const nth = usedPerKind.get(pair.songKind) ?? 0;
    const idx = candidates[nth];
    if (idx === undefined) return;
    pair.scriptIndex = idx;
    pair.basis = "kind";
    taken.add(idx);
    usedPerKind.set(pair.songKind, nth + 1);
  });

  // Pass 2 — fill the gaps in reading order with whatever is left.
  const leftovers = script.sections.map((_, i) => i).filter((i) => !taken.has(i));
  let next = 0;
  pairs.forEach((pair) => {
    if (pair.scriptIndex !== null) return;
    const idx = leftovers[next];
    if (idx === undefined) return;
    pair.scriptIndex = idx;
    pair.basis = "order";
    taken.add(idx);
    next += 1;
  });

  return {
    pairs,
    unusedScriptIndexes: script.sections.map((_, i) => i).filter((i) => !taken.has(i)),
  };
}

/** Words the writer put in this section, as a single block. */
function linesOf(section: MarkedSection | undefined): string {
  return section ? section.lines.join("\n").trim() : "";
}

const DANCE_RE =
  /\b(danc\w*|move\w*|step\w*|sway\w*|spin\w*|groove\w*|choreo\w*|body|hips|feet|march\w*)\b/i;
const ACTION_RE = /\b(walk\w*|run\w*|drive\w*|stare\w*|turn\w*|reach\w*|fall\w*|rise\w*|leave\w*)\b/i;

/**
 * Fold an aligned script into the song.
 *
 * The script's words become each section's lyrics — the field the Director
 * Brain and the prompt builders already read — while movement and action cues
 * become choreography and story notes rather than being flattened into the
 * same blob. Existing content is only replaced where the script actually has
 * something to say, so applying a script twice, or over hand-written notes,
 * doesn't quietly erase work.
 */
export function applyScriptToSong(
  song: SongMap,
  script: ParsedScript,
  alignment: Alignment
): SongMap {
  const byId = new Map(alignment.pairs.map((p) => [p.songSectionId, p]));

  const sections: SongSection[] = song.sections.map((section) => {
    const pair = byId.get(section.id);
    if (!pair || pair.scriptIndex === null) return section;
    const scripted = script.sections[pair.scriptIndex];
    const text = linesOf(scripted);
    if (!text) return section;

    const danceLine = scripted.lines.find((l) => DANCE_RE.test(l));
    const actionLine = scripted.lines.find((l) => ACTION_RE.test(l));

    return {
      ...section,
      lyricsText: text,
      choreoNote: danceLine ? danceLine.trim() : section.choreoNote,
      storyNote: actionLine ? actionLine.trim() : section.storyNote,
    };
  });

  return {
    ...song,
    sections,
    scriptTitle: script.songTitle || song.scriptTitle,
    updatedAt: new Date().toISOString(),
  };
}

/** A one-line summary of what an alignment did, for the confirm step. */
export function describeAlignment(alignment: Alignment, script: ParsedScript): string {
  const matched = alignment.pairs.filter((p) => p.scriptIndex !== null).length;
  const total = alignment.pairs.length;
  const unused = alignment.unusedScriptIndexes.length;
  const parts = [`${matched} of ${total} song section${total === 1 ? "" : "s"} matched`];
  if (unused > 0) {
    parts.push(
      `${unused} script section${unused === 1 ? "" : "s"} left over (${alignment.unusedScriptIndexes
        .map((i) => script.sections[i]?.label || script.sections[i]?.kind)
        .filter(Boolean)
        .join(", ")})`
    );
  }
  return parts.join(" · ");
}
