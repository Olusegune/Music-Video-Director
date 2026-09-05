// Cast — the music-video performer roster.
//
// Layered on top of the existing Character DNA (Character Bible) rather than
// duplicating it: a Performer optionally links to a Character by id for visual
// consistency (portrait, promptDna, consistency rules) and adds the
// music-video-specific direction — performer role, dance style, lip-sync, and
// performance notes. Stored locally; no API.

import { safeSetItem } from "@/platform/lib/storage";

export type PerformerRole =
  | "Lead Singer"
  | "Backing Singer"
  | "Rapper"
  | "Dancer"
  | "Featured Artist"
  | "Band Member"
  | "Actor"
  | "Extra";

export const PERFORMER_ROLES: PerformerRole[] = [
  "Lead Singer",
  "Backing Singer",
  "Rapper",
  "Dancer",
  "Featured Artist",
  "Band Member",
  "Actor",
  "Extra",
];

export interface Performer {
  id: string;
  name: string;
  role: PerformerRole;
  /** Optional link to a Character Bible entry for visual DNA / consistency. */
  characterId?: string;
  /**
   * The song this performer was cast for. Absent on performers created before
   * this field existed — those are grandfathered into every song's cast view
   * (see loadCastForSong) rather than silently disappearing. Every performer
   * created going forward gets one, so cast stops bleeding across songs.
   */
  songId?: string;
  danceStyle: string;
  wardrobe: string;
  performanceNotes: string;
  /** True = performs vocals on camera (needs lip-sync direction). */
  lipSync: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Roles that drive on-camera vocal performance (lip-sync by default). */
export const VOCAL_ROLES: PerformerRole[] = [
  "Lead Singer",
  "Backing Singer",
  "Rapper",
  "Featured Artist",
];

export function newPerformer(role: PerformerRole = "Lead Singer", songId?: string): Performer {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: "",
    role,
    songId,
    danceStyle: role === "Dancer" ? "Hip Hop" : "",
    wardrobe: "",
    performanceNotes: "",
    lipSync: VOCAL_ROLES.includes(role),
    createdAt: now,
    updatedAt: now,
  };
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

const LS_CAST = "mf.cast";

export function loadCast(): Performer[] {
  try {
    const raw = localStorage.getItem(LS_CAST);
    return raw ? (JSON.parse(raw) as Performer[]) : [];
  } catch {
    return [];
  }
}

export function savePerformer(performer: Performer): void {
  const next = { ...performer, updatedAt: new Date().toISOString() };
  const all = loadCast();
  const i = all.findIndex((p) => p.id === performer.id);
  if (i >= 0) all[i] = next;
  else all.unshift(next);
  safeSetItem(LS_CAST, JSON.stringify(all));
}

export function deletePerformer(id: string): void {
  safeSetItem(LS_CAST, JSON.stringify(loadCast().filter((p) => p.id !== id)));
}

/**
 * The cast for one song: performers explicitly cast for it, plus any
 * pre-migration performer that has no songId at all (grandfathered so old
 * data doesn't vanish). Performers cast for a *different* song are excluded —
 * this is what stops cast from bleeding across songs.
 */
export function loadCastForSong(songId: string): Performer[] {
  return loadCast().filter((p) => !p.songId || p.songId === songId);
}

/** Cascade delete: called when a song is deleted, so its cast doesn't orphan. */
export function deletePerformersForSong(songId: string): void {
  safeSetItem(LS_CAST, JSON.stringify(loadCast().filter((p) => p.songId !== songId)));
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

const ROLE_HUE: Record<PerformerRole, string> = {
  "Lead Singer": "#e0397f",
  "Backing Singer": "#c2557f",
  Rapper: "#d97706",
  Dancer: "#6d5dfc",
  "Featured Artist": "#0891b2",
  "Band Member": "#0e9f6e",
  Actor: "#7c5cff",
  Extra: "#64748b",
};

export function roleColor(role: PerformerRole): string {
  return ROLE_HUE[role] ?? "#6d5dfc";
}

/**
 * The production's default reference images: each performer's linked Character
 * portrait (or first reference image). Used as "production memory" so the cast
 * auto-flows into every performance shot's generation.
 */
export function productionReferenceImages(
  cast: Performer[],
  characters: { id: string; name: string; portraitUrl: string; referenceImages: string[] }[]
): { src: string; label: string }[] {
  const out: { src: string; label: string }[] = [];
  const seen = new Set<string>();
  for (const p of cast) {
    const c = p.characterId ? characters.find((x) => x.id === p.characterId) : undefined;
    const src = c?.portraitUrl || c?.referenceImages?.[0] || "";
    if (src && !seen.has(src)) {
      seen.add(src);
      out.push({ src, label: p.name || c?.name || p.role });
    }
  }
  return out;
}

export const DANCE_STYLES = [
  "Hip Hop",
  "Afrobeats",
  "Pop / Commercial",
  "Contemporary",
  "Gospel",
  "Street / Krump",
  "House",
  "Stage / Theatrical",
];

// ---------------------------------------------------------------------------
// Auto-cast — a sensible starting roster detected from the song
// ---------------------------------------------------------------------------

interface AutoCastSong {
  sections: { kind: string; label: string; lyricsText?: string; lead?: string; backup?: string }[];
  lyrics?: { text: string }[];
}

/**
 * Derive a starting cast from a song's sections + lyrics. Heuristic, not
 * perfect — a Lead Singer is always cast; a Rapper / Backing Singer / Dancer /
 * Spoken Narrator are added when the lyrics or structure suggest them. The
 * "Direct This Music Video" magic flow uses this to populate an empty cast.
 */
export function autoCastFromSong(song: AutoCastSong, songId?: string): Performer[] {
  const sectionText = song.sections
    .map((s) => `${s.label} ${s.lyricsText ?? ""} ${s.lead ?? ""} ${s.backup ?? ""}`)
    .join(" ");
  const lyricText = (song.lyrics ?? []).map((l) => l.text).join(" ");
  const text = `${sectionText} ${lyricText}`.toLowerCase();

  const mk = (role: PerformerRole, name: string, patch: Partial<Performer> = {}) => {
    const p = newPerformer(role, songId);
    p.name = name;
    return { ...p, ...patch };
  };

  const out: Performer[] = [mk("Lead Singer", "Lead Vocalist")];

  if (/\brapper\b|\brap\b|\bbars?\b|spit|hip[- ]?hop|verse \d/.test(text))
    out.push(mk("Rapper", "Featured Rapper"));
  if (/choir|backing|back[- ]?up|harmon|gospel/.test(text))
    out.push(mk("Backing Singer", "Backing Vocals"));
  if (/(\bspoken\b|narrat|voice[- ]?over|\bv\.o\.?\b)/.test(text))
    out.push(mk("Actor", "Spoken Narrator", { lipSync: false }));

  const hasChorus = song.sections.some(
    (s) => /chorus|hook|drop/i.test(s.kind) || /chorus|hook|drop/i.test(s.label)
  );
  if (hasChorus) out.push(mk("Dancer", "Dance Crew"));

  return out;
}
