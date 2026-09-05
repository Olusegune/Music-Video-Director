// MV Director Brain — turns a Song Map into a directed music-video treatment.
//
// This is the music-video analogue of localEngine.ts: it reads the song's
// structure (sections), energy curve, tempo, and aligned lyrics and lays a
// shot list onto the *song timeline* — faster cutting and bolder performance in
// high-energy choruses, slower narrative shots in verses, abstract texture in
// intros/bridges. Beat-synced shot boundaries. NO API call — pure local
// reasoning, fully editable downstream.

import { getDoc, setDoc } from "@/platform/lib/durableStore";
import {
  beatTimes,
  sectionColor,
  type SongMap,
  type SongSection,
  type SectionKind,
} from "@/apps/music-video/lib/songBrain";
import type { MvTemplate } from "@/platform/lib/templates";

export type ShotApproach = "Performance" | "Narrative" | "Abstract" | "Hybrid";

/** A choreography move assigned to a specific performer within a shot.
 *  This is the structured production data that feeds prompt assembly. */
export interface ChoreoAssignment {
  /** Display name of the performer (from cast, a Character, or free text). */
  performer: string;
  /** Optional link to a Character Bible entry for visual DNA / consistency. */
  characterId?: string;
  /** Performer role label (Lead Artist, Dancer, Backup, Choir, Band, …). */
  role: string;
  /** The choreography move / pose text (from the library or free text). */
  move: string;
  /** Energy level (e.g. High, Medium). */
  energy?: string;
  /** Facial / emotional expression (e.g. "joyful confidence"). */
  expression?: string;
  /** Group formation (e.g. "V-formation behind the lead"). */
  formation?: string;
}

export interface MvShot {
  id: string;
  start: number;
  end: number;
  /** Lyric line anchoring this shot, if one falls in its window. */
  lyric?: string;
  idea: string;
  shotType: string;
  movement: string;
  lighting: string;
  performanceNote: string;
  transition: string;
  /** Generated still-frame src (empty until generated via a provider). */
  imageUrl?: string;
  /** All generated frame variations for this shot; imageUrl is the chosen one. */
  imageCandidates?: string[];
  /** Generated clip src (empty until generated). */
  videoUrl?: string;
  /** Per-shot image model id override (IMAGE_MODELS id); undefined = inherit. */
  imageProvider?: string;
  /** Per-shot video model id override (VIDEO_MODELS id); undefined = inherit. */
  videoProvider?: string;
  /** Reference image srcs (character/prop/style) fed to generation as guidance. */
  refImages?: string[];
  /** Optional end/last frame src for models that support start→end interpolation. */
  endFrame?: string;
  /** Audio reference srcs (music/voice) for audio-driven video models. */
  refAudio?: string[];
  /** Video reference srcs (motion/dance/style) for video-to-video models. */
  refVideo?: string[];
  /** Emotional / story intent for this shot (beyond technical camera/lighting). */
  storyIntent?: string;
  /** Choreography moves assigned to performers in this shot (structured data). */
  choreo?: ChoreoAssignment[];
  /** User-edited final prompt; when set, generation uses it verbatim. */
  promptOverride?: string;
}

export interface MvSectionPlan {
  sectionId: string;
  kind: SectionKind;
  label: string;
  start: number;
  end: number;
  energy: number;
  approach: ShotApproach;
  concept: string;
  location: string;
  wardrobe: string;
  /** Human cut-pace label, e.g. "Fast cutting · ~1.6s / shot". */
  cutPace: string;
  shots: MvShot[];
}

export interface MvTreatment {
  songId: string;
  logline: string;
  visualWorld: string;
  energyArc: string;
  sections: MvSectionPlan[];
  /** The template this treatment was directed from, if any. */
  templateId?: string;
  templateName?: string;
  createdAt: string;
  updatedAt: string;
}

// --- vocabularies ----------------------------------------------------------

const SHOTS_PERFORMANCE = [
  "Wide stage — full body, the artist owns the frame",
  "Punchy medium — chest-up, direct to lens",
  "Low-angle hero — artist towers over camera",
  "Orbit around the artist mid-phrase",
  "Crash-zoom to the face on the downbeat",
  "Crowd-level shot looking up at the artist",
];
const SHOTS_NARRATIVE = [
  "Wide establishing — subject placed in the world",
  "Medium two-shot, eyeline tension",
  "Over-the-shoulder into the scene",
  "Insert — hands / a telling detail",
  "Slow push to the eyes",
  "Tracking alongside as they move",
];
const SHOTS_ABSTRACT = [
  "Macro texture — light raking through haze",
  "Silhouette against a pure color field",
  "Slow drift across the empty location",
  "Refracted reflection / glass distortion",
  "Negative-space hold, subject small in frame",
  "God's-eye drift looking straight down",
];
const SHOTS_HYBRID = [
  "Locked profile — stillness amid the noise",
  "Handheld intimacy, very shallow focus",
  "Push through a foreground object into the subject",
  "Color-shift cutaway that breaks the pattern",
];

const MOVE_HIGH = [
  "Whip-pan landing on the beat",
  "Handheld punch-in",
  "Fast dolly with a snap-zoom",
  "Quick 90° orbit",
];
const MOVE_MID = [
  "Smooth dolly-in",
  "Lateral tracking move",
  "Slow, deliberate push",
  "Gentle crane up",
];
const MOVE_LOW = ["Slow creep-in", "Static lock-off", "Drifting float", "Subtle parallax only"];

const LIGHT_HIGH = [
  "Saturated colored wash, hard backlight, heavy haze",
  "Neon rim with flicker accents",
  "Blown-out high-key punch",
];
const LIGHT_MID = [
  "Motivated practical key, soft and moody",
  "Window light with natural falloff",
  "Single-source chiaroscuro",
];
const LIGHT_LOW = [
  "Pre-dawn ambient, low contrast",
  "Smoke pierced by a single shaft of light",
  "Cold monochrome, deep shadow",
];

const LOCATIONS = [
  "raw concrete soundstage",
  "rain-slick night street",
  "sun-bleached desert flat",
  "neon-lit interior",
  "empty warehouse",
  "rooftop at dusk",
  "mirror-lined room",
  "overgrown greenhouse",
];
const WARDROBE = [
  "monochrome tailored look",
  "street-luxe layered fit",
  "all-white minimal",
  "textured vintage pieces",
  "high-shine statement look",
  "stripped-back casual",
];

const CONCEPTS: Record<SectionKind, string> = {
  Intro: "Establish the world and mood before the artist arrives.",
  Verse: "Carry the story forward — intimate, grounded, lyric-led.",
  "Pre-Chorus": "Build tension — tighten the frames and accelerate into the hook.",
  Chorus: "Full performance payoff — the most dynamic, iconic imagery of the video.",
  Bridge: "Break the pattern — an emotional or visual left-turn.",
  Instrumental: "Let the visuals breathe — movement and texture lead, no vocal.",
  Drop: "Peak energy — fastest cutting, boldest imagery, total release.",
  Outro: "Resolve and release; let the frame settle and exhale.",
};

function pick<T>(pool: T[], i: number): T {
  return pool[((i % pool.length) + pool.length) % pool.length];
}

// A stable per-song offset into every pick() pool. Without this, shot index 0
// of the first (always-Abstract Intro) section picks pool[0] for every song —
// every track opened with the literal same shot idea, location, and wardrobe
// regardless of what the song actually sounds like. Deterministic (same song
// re-directed gets the same plan) but different per song.
function songSeed(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// --- per-section direction --------------------------------------------------

function approachFor(
  kind: SectionKind,
  energy: number,
  lean: MvTemplate["lean"] = "balanced",
  hasLead = false
): ShotApproach {
  switch (kind) {
    case "Chorus":
    case "Drop":
      return "Performance";
    case "Intro":
    case "Outro":
      // Deliberately performer-free even when a lead is assigned — most
      // music videos open/close on b-roll before the artist appears.
      return "Abstract";
    case "Instrumental":
      return energy >= 0.6 ? "Performance" : "Abstract";
    case "Bridge":
      return hasLead ? "Performance" : "Hybrid";
    case "Verse":
    case "Pre-Chorus":
    default:
      // A named lead vocalist for this section is a direct instruction to
      // put a performer on camera — it overrides the energy/lean guess a
      // song with no chorus (or no lyrics to detect one) would otherwise
      // fall back to.
      if (hasLead) return energy >= 0.5 ? "Performance" : "Hybrid";
      // A template can push verses toward performance or pull them to story.
      if (lean === "performance") return energy >= 0.5 ? "Performance" : "Hybrid";
      if (lean === "narrative") return "Narrative";
      return energy >= 0.7 ? "Hybrid" : "Narrative";
  }
}

function shotPoolFor(approach: ShotApproach): string[] {
  switch (approach) {
    case "Performance":
      return SHOTS_PERFORMANCE;
    case "Narrative":
      return SHOTS_NARRATIVE;
    case "Abstract":
      return SHOTS_ABSTRACT;
    case "Hybrid":
      return SHOTS_HYBRID;
  }
}

/** Target seconds-per-cut from energy — high energy cuts faster. `bias` scales
 *  the whole curve (a template's editing rhythm: <1 faster, >1 slower). */
function cutLengthFor(energy: number, bias = 1): number {
  const base = energy >= 0.8 ? 1.4 : energy >= 0.6 ? 2.2 : energy >= 0.4 ? 3.4 : 4.8;
  return Math.max(0.8, base * bias);
}

function bandFor(energy: number): "high" | "mid" | "low" {
  if (energy >= 0.66) return "high";
  if (energy >= 0.4) return "mid";
  return "low";
}

function moveFor(energy: number, i: number): string {
  const band = bandFor(energy);
  return pick(band === "high" ? MOVE_HIGH : band === "mid" ? MOVE_MID : MOVE_LOW, i);
}

function lightFor(energy: number, i: number): string {
  const band = bandFor(energy);
  return pick(band === "high" ? LIGHT_HIGH : band === "mid" ? LIGHT_MID : LIGHT_LOW, i);
}

function transitionFor(energy: number, i: number, isSectionEnd: boolean): string {
  const band = bandFor(energy);
  if (isSectionEnd) {
    if (band === "low") return "Cross-dissolve into the next section";
    return "Cut on the downbeat into the next section";
  }
  if (band === "high") return pick(["Hard cut on the beat", "Whip-pan cut", "Flash cut"], i);
  if (band === "mid") return pick(["Cut on action", "Match cut"], i);
  return pick(["Cross-dissolve", "Slow fade"], i);
}

function performanceNoteFor(approach: ShotApproach, hasLyric: boolean, i: number): string {
  switch (approach) {
    case "Performance":
      return pick(
        [
          "Lip-sync locked to the lead vocal; full-body energy.",
          "Tight lip-sync; let movement hit the beat.",
          "Performance to lens — command the camera.",
        ],
        i
      );
    case "Narrative":
      return hasLyric
        ? "Acting beat carries the lyric — no lip-sync, play the subtext."
        : "Story beat — let the action read without performance.";
    case "Hybrid":
      return pick(
        [
          "Half-performance, half-character — lip-sync only on the key line.",
          "Drift between performing and living the moment.",
        ],
        i
      );
    case "Abstract":
      return "No performer in frame — let the world carry the section.";
  }
}

// --- beat snapping ----------------------------------------------------------

function nearestBeat(beats: number[], t: number): number {
  if (beats.length === 0) return t;
  let lo = 0;
  let hi = beats.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (beats[mid] < t) lo = mid + 1;
    else hi = mid;
  }
  const a = beats[Math.max(0, lo - 1)];
  const b = beats[lo];
  return Math.abs(a - t) <= Math.abs(b - t) ? a : b;
}

/** Even shot boundaries within [start,end], snapped to beats, kept monotonic. */
function shotBoundaries(start: number, end: number, count: number, beats: number[]): number[] {
  const raw: number[] = [];
  for (let k = 0; k <= count; k++) raw.push(start + ((end - start) * k) / count);
  const snapped = raw.map((t, k) => (k === 0 ? start : k === count ? end : nearestBeat(beats, t)));
  // Enforce strictly increasing boundaries; if a snap collapsed a slot, fall
  // back to the raw (unsnapped) value.
  for (let k = 1; k < snapped.length; k++) {
    if (snapped[k] <= snapped[k - 1] + 0.05) snapped[k] = raw[k];
    if (snapped[k] <= snapped[k - 1]) snapped[k] = snapped[k - 1] + 0.05;
  }
  snapped[count] = end;
  return snapped;
}

// --- main ------------------------------------------------------------------

export function directSong(song: SongMap, template?: MvTemplate | null): MvTreatment {
  const beats = beatTimes(song);
  const seed = songSeed(song.id);
  let shotIndex = 0;
  const locationPool = template?.locations?.length ? template.locations : LOCATIONS;
  const wardrobePool = template?.wardrobePool?.length ? template.wardrobePool : WARDROBE;

  const sections: MvSectionPlan[] = song.sections.map((section, si) => {
    const dur = Math.max(0.1, section.end - section.start);
    const approach = approachFor(
      section.kind,
      section.energy,
      template?.lean,
      Boolean(section.lead?.trim())
    );
    const pool = shotPoolFor(approach);

    const cutLen = cutLengthFor(section.energy, template?.cutBias ?? 1);
    const count = Math.max(1, Math.min(16, Math.round(dur / cutLen)));
    const bounds = shotBoundaries(section.start, section.end, count, beats);

    const sectionLyrics = song.lyrics.filter(
      (l) => l.start >= section.start && l.start < section.end
    );

    const shots: MvShot[] = [];
    for (let k = 0; k < count; k++) {
      const s = bounds[k];
      const e = bounds[k + 1];
      const lyric = sectionLyrics.find((l) => l.start >= s && l.start < e)?.text;
      const shotType = pick(pool, shotIndex + seed);
      const idea = lyric
        ? `“${lyric}” — ${shotType.toLowerCase()}`
        : `${shotType}${approach === "Abstract" ? "" : `, ${CONCEPTS[section.kind].split("—")[0].trim().toLowerCase()}`}`;
      shots.push({
        id: crypto.randomUUID(),
        start: s,
        end: e,
        lyric,
        idea,
        shotType,
        movement: moveFor(section.energy, shotIndex + seed),
        lighting: lightFor(section.energy, shotIndex + seed),
        performanceNote: performanceNoteFor(approach, Boolean(lyric), shotIndex + seed),
        transition: transitionFor(section.energy, shotIndex + seed, k === count - 1),
      });
      shotIndex++;
    }

    const avgCut = dur / count;
    const band = bandFor(section.energy);
    const paceWord =
      band === "high" ? "Fast cutting" : band === "mid" ? "Steady cutting" : "Slow, held shots";

    return {
      sectionId: section.id,
      kind: section.kind,
      label: section.label,
      start: section.start,
      end: section.end,
      energy: section.energy,
      approach,
      concept: CONCEPTS[section.kind],
      location: pick(locationPool, si + seed),
      wardrobe: pick(wardrobePool, si + seed),
      cutPace: `${paceWord} · ~${avgCut.toFixed(1)}s / shot · ${count} shot${count === 1 ? "" : "s"}`,
      shots,
    };
  });

  const now = new Date().toISOString();
  return {
    songId: song.id,
    logline: buildLogline(song, template),
    visualWorld: template
      ? `${template.visualStyle} Palette: ${template.palette.join(", ")}. ${template.setDirection}`
      : buildVisualWorld(song),
    energyArc: buildEnergyArc(song.sections),
    sections,
    templateId: template?.id,
    templateName: template?.name,
    createdAt: now,
    updatedAt: now,
  };
}

// --- treatment summary text -------------------------------------------------

function avgEnergy(sections: SongSection[]): number {
  if (sections.length === 0) return 0.5;
  return sections.reduce((a, s) => a + s.energy, 0) / sections.length;
}

function tempoWord(bpm: number): string {
  if (bpm >= 140) return "frenetic";
  if (bpm >= 110) return "driving";
  if (bpm >= 90) return "mid-tempo";
  return "slow-burning";
}

function moodWord(energy: number): string {
  if (energy >= 0.7) return "explosive, high-contrast";
  if (energy >= 0.45) return "moody, cinematic";
  return "intimate, restrained";
}

function buildLogline(song: SongMap, template?: MvTemplate | null): string {
  const choruses = song.sections.filter((s) => s.kind === "Chorus" || s.kind === "Drop").length;
  const hook =
    choruses > 0
      ? `built around ${choruses} full-performance chorus${choruses === 1 ? "" : "es"}`
      : "carried by a single evolving performance";
  const style = template
    ? `A ${template.name} music video (${template.mood.toLowerCase()})`
    : `A ${tempoWord(song.bpm)}, ${moodWord(avgEnergy(song.sections))} music video`;
  return `${style} for “${song.name}” — ${hook}, cut to the track's own energy.`;
}

function buildVisualWorld(song: SongMap): string {
  const e = avgEnergy(song.sections);
  if (e >= 0.7)
    return "Bold, saturated color and hard light; haze, neon, and motion blur. One iconic performance location intercut with abstract texture.";
  if (e >= 0.45)
    return "Cinematic, motivated lighting with a controlled palette; practical sources, shallow depth, and a grounded real-world location.";
  return "Soft, low-contrast, almost monochrome; negative space and stillness, a single emotional location that slowly transforms.";
}

function buildEnergyArc(sections: SongSection[]): string {
  return sections
    .map((s) => {
      const band = bandFor(s.energy);
      const tag = band === "high" ? "peak" : band === "mid" ? "build" : "low";
      return `${s.label} (${tag})`;
    })
    .join("  →  ");
}

// --- display helper ---------------------------------------------------------

export function approachColor(approach: ShotApproach): string {
  switch (approach) {
    case "Performance":
      return "#e0397f";
    case "Narrative":
      return "#6d5dfc";
    case "Hybrid":
      return "#d97706";
    case "Abstract":
      return "#0891b2";
  }
}

export { sectionColor };

// ---------------------------------------------------------------------------
// Persistence (durable doc store, keyed by song id)
// ---------------------------------------------------------------------------

const LS_TREATMENTS = "mf.treatments";

function loadAll(): MvTreatment[] {
  try {
    const raw = getDoc(LS_TREATMENTS);
    return raw ? (JSON.parse(raw) as MvTreatment[]) : [];
  } catch {
    return [];
  }
}

/** All saved treatments (used by global search to index shots). */
export function loadAllTreatments(): MvTreatment[] {
  return loadAll();
}

const tmplKey = (id?: string | null) => id ?? "none";
const sameSlot = (t: MvTreatment, songId: string, templateId?: string | null) =>
  t.songId === songId && tmplKey(t.templateId) === tmplKey(templateId);

/** A treatment is scoped to a (song, template) pair, so each template keeps its
 *  own shot list and generated frames — switching templates never bleeds across. */
export function getTreatment(songId: string, templateId?: string | null): MvTreatment | null {
  return loadAll().find((t) => sameSlot(t, songId, templateId)) ?? null;
}

export function saveTreatment(treatment: MvTreatment): void {
  const next = { ...treatment, updatedAt: new Date().toISOString() };
  const all = loadAll();
  const i = all.findIndex((t) => sameSlot(t, treatment.songId, treatment.templateId));
  if (i >= 0) all[i] = next;
  else all.unshift(next);
  setDoc(LS_TREATMENTS, JSON.stringify(all));
}

export function deleteTreatment(songId: string, templateId?: string | null): void {
  setDoc(
    LS_TREATMENTS,
    JSON.stringify(loadAll().filter((t) => !sameSlot(t, songId, templateId)))
  );
}

/**
 * Cascade delete: a song can have one treatment per template it was ever
 * directed with. Deleting the song must clear all of them, not just the
 * (song, "none") slot — otherwise every non-default template's treatment
 * survives as an orphan with no song to belong to.
 */
export function deleteTreatmentsForSong(songId: string): void {
  setDoc(LS_TREATMENTS, JSON.stringify(loadAll().filter((t) => t.songId !== songId)));
}
