// Song Brain — the music-video spine.
//
// Turns an imported audio file into a structured *Song Map* with NO API call:
// tempo (BPM) + beat grid, an energy envelope, an automatic section breakdown
// (intro / verse / chorus / bridge / outro), a downsampled waveform for display,
// and a lyric distributor that lays pasted lyrics onto the detected sections.
//
// Everything downstream (Director Brain, choreography, timeline) keys off this
// map's timeline. Analysis runs entirely in the browser/webview via the Web
// Audio API, so it works the same in `npm run dev` and inside Tauri.

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

import { getDoc, setDoc } from "@/platform/lib/durableStore";
import type { SectionKind } from "@/platform/lib/songSections";
export { SECTION_KINDS, type SectionKind } from "@/platform/lib/songSections";

export interface SongSection {
  id: string;
  kind: SectionKind;
  /** Editable display label (defaults to the kind, e.g. "Chorus 2"). */
  label: string;
  start: number; // seconds
  end: number; // seconds
  /** Relative energy 0..1 — drives section coloring + Director energy curve. */
  energy: number;
  // --- per-section creative brief (a music video is built section by section) ---
  /** Lyrics for just this section. */
  lyricsText?: string;
  lead?: string; // lead vocalist(s)
  backup?: string; // backup vocalists / dancers
  mood?: string;
  cameraNote?: string;
  choreoNote?: string;
  storyNote?: string;
  visualStyle?: string;
  /** Who performs this section — assigned or detected (see performerDetect). */
  performerRole?: string;
}

export interface LyricLine {
  id: string;
  text: string;
  start: number; // seconds (aligned)
  sectionId?: string;
}

export type AudioTrackKind = "Intro tag" | "Ad-lib" | "Narration" | "Spoken hook" | "Outro tag";

export const AUDIO_TRACK_KINDS: AudioTrackKind[] = [
  "Intro tag",
  "Ad-lib",
  "Narration",
  "Spoken hook",
  "Outro tag",
];

/** A generated spoken/vocal layer (ElevenLabs), separate from the master track. */
export interface AudioTrack {
  id: string;
  kind: AudioTrackKind;
  text: string;
  voice: string;
  /** Displayable src for the generated audio. */
  url: string;
  /** Start time on the timeline, in seconds — where the layer is mixed in. */
  atSec: number;
  /** Linear gain for this layer (1 = unchanged). */
  volume: number;
  /** When true, the master track ducks under this layer (sidechain). */
  duck: boolean;
  createdAt: string;
}

/** Default placement for a generated audio layer, by kind. */
export function defaultAudioAt(kind: AudioTrackKind, durationSec: number): number {
  if (kind === "Outro tag") return Math.max(0, durationSec - 4);
  return 0;
}

/** Longer spoken layers default to ducking the music; short tags don't. */
export function defaultAudioDuck(kind: AudioTrackKind): boolean {
  return kind === "Narration" || kind === "Spoken hook";
}

export interface SongMap {
  id: string;
  name: string;
  fileName: string;
  durationSec: number;
  bpm: number;
  /** Phase of the first detected beat, in seconds. */
  beatOffsetSec: number;
  beatsPerBar: number;
  sections: SongSection[];
  lyrics: LyricLine[];
  /** Normalized 0..1 waveform peaks for the overview canvas. */
  peaks: number[];
  /** Coarse normalized 0..1 energy envelope (per ~0.25s) for the energy lane. */
  energyEnvelope: number[];
  /** Absolute path to the persisted source audio (Tauri only; enables render). */
  audioPath?: string;
  /** Generated spoken/vocal layers (intro tags, ad-libs, narration…). */
  audioTracks?: AudioTrack[];
  /** The template this production is directed with (per-song memory). */
  templateId?: string;
  /** Magic Mode's "Video Type" pick (Performance/Narrative/Dance/…), per-song. */
  videoType?: string;
  /** Optional director style the production is inspired by, per-song. Absent
   *  means the user skipped it, which must stay a genuine no-op. */
  directorStyleId?: string;
  /** Magic Mode's Story Mode — the chosen story feeling, per-song. */
  storyFeeling?: string;
  /** User-written custom story idea (only meaningful when storyFeeling === "custom"). */
  storyIdea?: string;
  /** The six generated story beats — opening/verse/chorus/bridge/finalChorus/ending. */
  storyBeats?: {
    opening: string;
    verse: string;
    chorus: string;
    bridge: string;
    finalChorus: string;
    ending: string;
  };
  /** Result of running the parsing engine (scriptParser.ts) over uploaded
   *  lyrics/script text — title/genre/mood/themes/characters/etc. */
  parsedScript?: import("@/platform/lib/scriptParser").ParsedScript;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Decode
// ---------------------------------------------------------------------------

function getAudioContext(): AudioContext {
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) throw new Error("Web Audio API is not available in this environment.");
  return new Ctor();
}

/** Mix all channels down to a single mono Float32Array. */
function toMono(buffer: AudioBuffer): Float32Array {
  const channels = buffer.numberOfChannels;
  const length = buffer.length;
  if (channels === 1) return buffer.getChannelData(0);
  const mono = new Float32Array(length);
  for (let c = 0; c < channels; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < length; i++) mono[i] += data[i];
  }
  for (let i = 0; i < length; i++) mono[i] /= channels;
  return mono;
}

// ---------------------------------------------------------------------------
// Waveform peaks
// ---------------------------------------------------------------------------

function computePeaks(mono: Float32Array, buckets = 1400): number[] {
  const size = Math.max(1, Math.floor(mono.length / buckets));
  const peaks: number[] = [];
  let max = 0;
  for (let b = 0; b < buckets; b++) {
    const start = b * size;
    let peak = 0;
    for (let i = 0; i < size; i++) {
      const v = Math.abs(mono[start + i] ?? 0);
      if (v > peak) peak = v;
    }
    peaks.push(peak);
    if (peak > max) max = peak;
  }
  if (max > 0) for (let i = 0; i < peaks.length; i++) peaks[i] /= max;
  return peaks;
}

// ---------------------------------------------------------------------------
// Onset / energy envelope
// ---------------------------------------------------------------------------

interface OnsetData {
  onset: Float32Array; // positive energy novelty per frame
  energy: Float32Array; // RMS energy per frame
  frameRate: number; // frames per second
}

const HOP = 512;
const WIN = 1024;

function computeOnset(mono: Float32Array, sampleRate: number): OnsetData {
  const frames = Math.max(0, Math.floor((mono.length - WIN) / HOP));
  const energy = new Float32Array(frames);
  for (let i = 0; i < frames; i++) {
    const base = i * HOP;
    let sum = 0;
    for (let j = 0; j < WIN; j++) {
      const s = mono[base + j];
      sum += s * s;
    }
    energy[i] = Math.sqrt(sum / WIN);
  }
  // Half-wave-rectified first difference = a cheap onset/novelty signal.
  const onset = new Float32Array(frames);
  for (let i = 1; i < frames; i++) {
    const d = energy[i] - energy[i - 1];
    onset[i] = d > 0 ? d : 0;
  }
  return { onset, energy, frameRate: sampleRate / HOP };
}

// ---------------------------------------------------------------------------
// Tempo + beat phase
// ---------------------------------------------------------------------------

function estimateTempo(onset: Float32Array, frameRate: number): number {
  const minBpm = 70;
  const maxBpm = 180;
  const minLag = Math.max(1, Math.floor((frameRate * 60) / maxBpm));
  const maxLag = Math.ceil((frameRate * 60) / minBpm);
  let bestLag = minLag;
  let bestScore = -Infinity;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let score = 0;
    for (let i = lag; i < onset.length; i++) score += onset[i] * onset[i - lag];
    if (score > bestScore) {
      bestScore = score;
      bestLag = lag;
    }
  }
  let bpm = (frameRate * 60) / bestLag;
  // Fold octave errors into a musical range.
  while (bpm < minBpm) bpm *= 2;
  while (bpm > maxBpm) bpm /= 2;
  return Math.round(bpm);
}

function estimateBeatOffset(onset: Float32Array, frameRate: number, bpm: number): number {
  const period = Math.max(1, Math.round((frameRate * 60) / bpm));
  let bestOffset = 0;
  let bestScore = -Infinity;
  for (let off = 0; off < period; off++) {
    let score = 0;
    for (let i = off; i < onset.length; i += period) score += onset[i];
    if (score > bestScore) {
      bestScore = score;
      bestOffset = off;
    }
  }
  return bestOffset / frameRate;
}

/** Derive beat timestamps across the whole track from bpm + phase. */
export function beatTimes(song: Pick<SongMap, "bpm" | "beatOffsetSec" | "durationSec">): number[] {
  const period = 60 / Math.max(1, song.bpm);
  const out: number[] = [];
  for (let t = song.beatOffsetSec; t < song.durationSec; t += period) {
    if (t >= 0) out.push(t);
  }
  return out;
}

/** Bar (downbeat) timestamps — every `beatsPerBar`-th beat. */
export function barTimes(song: SongMap): number[] {
  const beats = beatTimes(song);
  const bars: number[] = [];
  for (let i = 0; i < beats.length; i += Math.max(1, song.beatsPerBar)) {
    bars.push(beats[i]);
  }
  return bars;
}

// ---------------------------------------------------------------------------
// Section segmentation
// ---------------------------------------------------------------------------

/** Coarse per-bar mean energy, normalized 0..1. */
function barEnergies(
  energy: Float32Array,
  frameRate: number,
  barDur: number,
  duration: number
): number[] {
  const bars = Math.max(1, Math.ceil(duration / barDur));
  const out: number[] = [];
  let max = 0;
  for (let b = 0; b < bars; b++) {
    const startF = Math.floor(b * barDur * frameRate);
    const endF = Math.min(energy.length, Math.floor((b + 1) * barDur * frameRate));
    let sum = 0;
    let n = 0;
    for (let i = startF; i < endF; i++) {
      sum += energy[i];
      n++;
    }
    const e = n > 0 ? sum / n : 0;
    out.push(e);
    if (e > max) max = e;
  }
  if (max > 0) for (let i = 0; i < out.length; i++) out[i] /= max;
  return out;
}

/**
 * Quantize energy into 3 perceptual levels using thresholds computed from
 * the song's own energy distribution (percentiles), not fixed magnitudes.
 * A fixed cutoff like "level 2 = 0.72+" works for songs with a big, loud
 * chorus but silently produces zero level-2 bars — and so never labels a
 * Chorus at all — for a ballad or an already-loud/compressed mix whose peak
 * bar never clears an absolute bar. Percentile thresholds guarantee the
 * loudest ~30% of any song's own bars register as "high," so there's always
 * a strongest section to surface as a Chorus candidate.
 */
function levelThresholds(bars: number[]): { lo: number; hi: number } {
  if (bars.length === 0) return { lo: 0.4, hi: 0.72 };
  const sorted = [...bars].sort((a, b) => a - b);
  const at = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
  return { lo: at(0.4), hi: at(0.7) };
}

/** Simple centered moving average — smooths bar-to-bar noise while keeping
 *  multi-bar structural swings (verse/chorus energy shifts) intact. */
function movingAverage(values: number[], window: number): number[] {
  const half = Math.floor(window / 2);
  return values.map((_, i) => {
    const lo = Math.max(0, i - half);
    const hi = Math.min(values.length, i + half + 1);
    const slice = values.slice(lo, hi);
    return slice.reduce((a, x) => a + x, 0) / slice.length;
  });
}

function energyLevel(e: number, thresholds: { lo: number; hi: number }): 0 | 1 | 2 {
  if (e < thresholds.lo) return 0;
  if (e < thresholds.hi) return 1;
  return 2;
}

interface RawSegment {
  startBar: number;
  endBar: number; // exclusive
  level: 0 | 1 | 2;
  energy: number;
}

/**
 * Segment the bar-energy curve into contiguous runs of similar energy level,
 * enforcing a musical minimum length, then label each run by energy + position.
 */
export function segmentSections(bars: number[], barDur: number, duration: number): SongSection[] {
  if (bars.length === 0) {
    return [makeSection("Verse", 0, duration, 0.5)];
  }

  const minBars = 4; // don't cut sections shorter than ~4 bars
  // Percentile thresholds are relative to the song's own distribution, which
  // reflects real structure (a verse-vs-chorus swing) far more than bar-to-bar
  // performance noise — but raw per-bar energy oscillates on both timescales
  // at once, so quantizing it directly fragments into many short alternating
  // runs that the merge step below collapses into one giant blob instead of
  // real sections. Smoothing first keeps the structural swings and damps the
  // noise, so the percentile thresholds land on genuine multi-bar plateaus.
  const smoothed = movingAverage(bars, 3);
  const thresholds = levelThresholds(smoothed);
  const levels = smoothed.map((e) => energyLevel(e, thresholds));

  // 1) Greedy grouping into runs of equal level.
  const runs: RawSegment[] = [];
  let start = 0;
  for (let b = 1; b <= bars.length; b++) {
    if (b === bars.length || levels[b] !== levels[start]) {
      const slice = bars.slice(start, b);
      runs.push({
        startBar: start,
        endBar: b,
        level: levels[start],
        energy: slice.reduce((a, x) => a + x, 0) / slice.length,
      });
      start = b;
    }
  }

  // 2) Merge runs shorter than minBars into a neighbour (prefer the closer level).
  const merged: RawSegment[] = [];
  for (const run of runs) {
    const len = run.endBar - run.startBar;
    if (len < minBars && merged.length > 0) {
      const prev = merged[merged.length - 1];
      prev.endBar = run.endBar;
      const slice = bars.slice(prev.startBar, prev.endBar);
      prev.energy = slice.reduce((a, x) => a + x, 0) / slice.length;
      prev.level = energyLevel(prev.energy, thresholds);
    } else {
      merged.push({ ...run });
    }
  }
  // A too-short leading run gets folded forward.
  if (merged.length > 1) {
    const first = merged[0];
    if (first.endBar - first.startBar < minBars) {
      const next = merged[1];
      next.startBar = first.startBar;
      const slice = bars.slice(next.startBar, next.endBar);
      next.energy = slice.reduce((a, x) => a + x, 0) / slice.length;
      merged.shift();
    }
  }

  // 3) Label by energy + position.
  return labelSegments(merged, barDur, duration);
}

function labelSegments(runs: RawSegment[], barDur: number, duration: number): SongSection[] {
  const n = runs.length;
  let chorusCount = 0;
  let verseCount = 0;
  let bridgeUsed = false;

  // Which sections count as "loud" is decided among the sections we actually
  // ended up with, not by the per-bar level they were quantized at.
  //
  // `level` is assigned before merging, and merging averages a short run into
  // its neighbour and re-quantizes the blend. On a track whose bars sit in a
  // narrow band — a loud, compressed mix, which is most modern pop and hip-hop
  // — that averaging walks every run down to level 1, so nothing is ever a
  // Chorus. Observed on a real track: nine sections, all Verse, one of them at
  // energy 0.80 while another song's Chorus sat at 0.74. A section cannot be
  // quieter than a Chorus elsewhere and still outrank it here.
  const sorted = runs.map((r) => r.energy).sort((a, b) => a - b);
  const percentile = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
  const loudFloor = percentile(0.7);
  const peak = sorted[sorted.length - 1];
  // A genuinely flat song (a drone, an ambient piece) has no chorus to find,
  // and forcing one would be a worse lie than reporting none.
  const hasContrast = peak - sorted[0] > 0.06;
  const isLoud = (run: RawSegment) => hasContrast && run.energy >= loudFloor;

  return runs.map((run, i) => {
    const start = run.startBar * barDur;
    const end = i === n - 1 ? duration : run.endBar * barDur;
    const isFirst = i === 0;
    const isLast = i === n - 1;
    // The opening and closing sections stay Intro/Outro unless the song's peak
    // moment happens to be one of them — a big final chorus is real, but a
    // merely loud outro is still an outro.
    const bookend = (isFirst || isLast) && run.energy < peak;

    let kind: SectionKind;
    if (isFirst && bookend) {
      kind = "Intro";
    } else if (isLast && bookend) {
      kind = "Outro";
    } else if (isLoud(run)) {
      kind = "Chorus";
    } else if (run.level >= 1) {
      // A distinct mid-energy run late in the song, after a chorus, reads as a bridge.
      if (!bridgeUsed && chorusCount >= 1 && i >= n - 3 && !isLast) {
        kind = "Bridge";
        bridgeUsed = true;
      } else {
        kind = "Verse";
      }
    } else {
      kind = isLast ? "Outro" : "Verse";
    }

    let label: string = kind;
    if (kind === "Chorus") label = `Chorus ${++chorusCount}`;
    else if (kind === "Verse") label = `Verse ${++verseCount}`;

    return makeSection(kind, start, end, run.energy, label);
  });
}

function makeSection(
  kind: SectionKind,
  start: number,
  end: number,
  energy: number,
  label?: string
): SongSection {
  return {
    id: crypto.randomUUID(),
    kind,
    label: label ?? kind,
    start,
    end,
    energy: Math.max(0, Math.min(1, energy)),
  };
}

// ---------------------------------------------------------------------------
// Coarse energy envelope (for the energy lane)
// ---------------------------------------------------------------------------

function coarseEnvelope(
  energy: Float32Array,
  frameRate: number,
  duration: number,
  step = 0.25
): number[] {
  const buckets = Math.max(1, Math.ceil(duration / step));
  const out: number[] = [];
  let max = 0;
  for (let b = 0; b < buckets; b++) {
    const startF = Math.floor(b * step * frameRate);
    const endF = Math.min(energy.length, Math.floor((b + 1) * step * frameRate));
    let sum = 0;
    let n = 0;
    for (let i = startF; i < endF; i++) {
      sum += energy[i];
      n++;
    }
    const e = n > 0 ? sum / n : 0;
    out.push(e);
    if (e > max) max = e;
  }
  if (max > 0) for (let i = 0; i < out.length; i++) out[i] /= max;
  return out;
}

// ---------------------------------------------------------------------------
// Public: analyze a file into a SongMap
// ---------------------------------------------------------------------------

/**
 * Re-run only the structural analysis over already-imported audio.
 *
 * Section detection used to be a one-shot side effect of import: once a track
 * was analyzed its sections were frozen for the life of the song, and even
 * "Replace audio" deliberately preserves them. That meant any improvement to
 * the detector never reached songs already in the library — a track imported
 * before a fix kept its old breakdown (e.g. all-Verse with no Chorus, which
 * then starves the Director of performance shots) with no way to refresh it.
 */
export async function detectSectionsFromBuffer(arrayBuffer: ArrayBuffer): Promise<{
  sections: SongSection[];
  bpm: number;
  beatOffsetSec: number;
  durationSec: number;
}> {
  const { buffer } = await decode(arrayBuffer);
  const mono = toMono(buffer);
  const { onset, energy, frameRate } = computeOnset(mono, buffer.sampleRate);
  const bpm = estimateTempo(onset, frameRate);
  const beatOffsetSec = estimateBeatOffset(onset, frameRate, bpm);
  const barDur = (60 / bpm) * 4;
  const bars = barEnergies(energy, frameRate, barDur, buffer.duration);
  return {
    sections: segmentSections(bars, barDur, buffer.duration),
    bpm,
    beatOffsetSec,
    durationSec: buffer.duration,
  };
}

/**
 * Move each old section's creative work onto the freshly-detected section that
 * covers the same moment.
 *
 * Matching is by time overlap, not by index: re-detection changes how many
 * sections there are and where they start, so the third section before and the
 * third section after are frequently different parts of the song. Overlap keeps
 * a verse's lyrics with that verse even when the split around it moves.
 */
export function carrySectionEdits(
  previous: SongSection[],
  detected: SongSection[]
): SongSection[] {
  return detected.map((next) => {
    let best: SongSection | null = null;
    let bestOverlap = 0;
    for (const old of previous) {
      const overlap = Math.min(next.end, old.end) - Math.max(next.start, old.start);
      if (overlap > bestOverlap) {
        bestOverlap = overlap;
        best = old;
      }
    }
    if (!best) return next;
    return {
      ...next,
      lyricsText: best.lyricsText,
      lead: best.lead,
      backup: best.backup,
      mood: best.mood,
      cameraNote: best.cameraNote,
      choreoNote: best.choreoNote,
      storyNote: best.storyNote,
      visualStyle: best.visualStyle,
      performerRole: best.performerRole,
    };
  });
}

async function decode(arrayBuffer: ArrayBuffer): Promise<{ buffer: AudioBuffer }> {
  const ctx = getAudioContext();
  try {
    return { buffer: await ctx.decodeAudioData(arrayBuffer.slice(0)) };
  } finally {
    void ctx.close();
  }
}

export async function analyzeAudioFile(file: File): Promise<SongMap> {
  const arrayBuffer = await file.arrayBuffer();
  const ctx = getAudioContext();
  let buffer: AudioBuffer;
  try {
    buffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
  } finally {
    // Free the decode context promptly.
    void ctx.close();
  }

  const mono = toMono(buffer);
  const sampleRate = buffer.sampleRate;
  const durationSec = buffer.duration;

  const { onset, energy, frameRate } = computeOnset(mono, sampleRate);
  const bpm = estimateTempo(onset, frameRate);
  const beatOffsetSec = estimateBeatOffset(onset, frameRate, bpm);
  const beatsPerBar = 4;
  const barDur = (60 / bpm) * beatsPerBar;

  const peaks = computePeaks(mono);
  const energyEnvelope = coarseEnvelope(energy, frameRate, durationSec);
  const bars = barEnergies(energy, frameRate, barDur, durationSec);
  const sections = segmentSections(bars, barDur, durationSec);

  const now = new Date().toISOString();
  const baseName = file.name.replace(/\.[^.]+$/, "");
  return {
    id: crypto.randomUUID(),
    name: baseName,
    fileName: file.name,
    durationSec,
    bpm,
    beatOffsetSec,
    beatsPerBar,
    sections,
    lyrics: [],
    peaks,
    energyEnvelope,
    createdAt: now,
    updatedAt: now,
  };
}

// ---------------------------------------------------------------------------
// Lyric alignment
// ---------------------------------------------------------------------------

const NON_VOCAL: SectionKind[] = ["Intro", "Instrumental", "Outro"];

/**
 * Lay pasted lyric lines onto the song's vocal sections. Lines are distributed
 * across sections in proportion to each section's duration, then spaced evenly
 * within the section. Heuristic but fully editable downstream — a magical
 * starting point, not ground truth.
 */
export function distributeLyrics(text: string, sections: SongSection[]): LyricLine[] {
  const lines = text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (lines.length === 0) return [];

  const vocal = sections.filter((s) => !NON_VOCAL.includes(s.kind));
  const pool = (vocal.length > 0 ? vocal : sections).slice().sort((a, b) => a.start - b.start);
  if (pool.length === 0) return [];

  const totalDur = pool.reduce((a, s) => a + (s.end - s.start), 0) || 1;

  // How many lines each section gets, proportional to its duration.
  const counts = pool.map((s) =>
    Math.max(0, Math.round((lines.length * (s.end - s.start)) / totalDur))
  );
  // Fix rounding drift so the counts sum to lines.length.
  let assigned = counts.reduce((a, x) => a + x, 0);
  let idx = 0;
  while (assigned < lines.length) {
    counts[idx % counts.length]++;
    assigned++;
    idx++;
  }
  while (assigned > lines.length) {
    const j = counts.findIndex((c) => c > 0);
    if (j < 0) break;
    counts[j]--;
    assigned--;
  }

  const out: LyricLine[] = [];
  let cursor = 0;
  pool.forEach((section, si) => {
    const count = counts[si];
    if (count <= 0) return;
    const span = section.end - section.start;
    for (let k = 0; k < count; k++) {
      const frac = (k + 0.5) / count;
      out.push({
        id: crypto.randomUUID(),
        text: lines[cursor++],
        start: section.start + frac * span,
        sectionId: section.id,
      });
    }
  });
  return out.sort((a, b) => a.start - b.start);
}

// ---------------------------------------------------------------------------
// Persistence (durable doc store; audio file itself is not persisted)
// ---------------------------------------------------------------------------

const LS_SONGS = "mf.songs";

export function loadSongs(): SongMap[] {
  try {
    const raw = getDoc(LS_SONGS);
    return raw ? (JSON.parse(raw) as SongMap[]) : [];
  } catch {
    return [];
  }
}

export function saveSong(song: SongMap): void {
  const next = { ...song, updatedAt: new Date().toISOString() };
  const all = loadSongs();
  const i = all.findIndex((s) => s.id === song.id);
  if (i >= 0) all[i] = next;
  else all.unshift(next);
  setDoc(LS_SONGS, JSON.stringify(all));
}

export function deleteSong(id: string): void {
  setDoc(LS_SONGS, JSON.stringify(loadSongs().filter((s) => s.id !== id)));
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

export function formatTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const SECTION_HUE: Record<SectionKind, string> = {
  Intro: "#64748b",
  Verse: "#6d5dfc",
  "Pre-Chorus": "#0891b2",
  Chorus: "#e0397f",
  Bridge: "#d97706",
  Instrumental: "#475569",
  Drop: "#dc2626",
  Outro: "#334155",
};

export function sectionColor(kind: SectionKind): string {
  return SECTION_HUE[kind] ?? "#6d5dfc";
}
