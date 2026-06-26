// One-click Demo Project — a fully planned example production.
//
// Builds a complete, explorable music video (song + sections + lyrics +
// performer roles, cast, characters/set/prop with DNA, a directed treatment,
// and choreography) so a first-time user can see the whole workflow without any
// setup or API keys. Everything uses fixed ids, so re-loading replaces the demo
// rather than duplicating it. It lives in its own area and is NEVER auto-loaded
// by the Magic Flow.

import {
  saveSong,
  type SongMap,
  type SongSection,
  type LyricLine,
} from "@/lib/songBrain";
import { api } from "@/lib/ipc";
import { newCharacter } from "@/lib/characterDna";
import { newEnvironment } from "@/lib/environmentDna";
import { newProp } from "@/lib/propDna";
import { newPerformer, savePerformer } from "@/lib/cast";
import { directSong, saveTreatment } from "@/lib/mvDirector";
import { choreographSong, saveChoreo } from "@/lib/choreography";

export const DEMO_SONG_ID = "demo-space-learned";

const SECTIONS: Array<[string, string, number, number, number, string, string]> = [
  // [kind, label, start, end, energy, performerRole, lyrics]
  ["Intro", "Intro", 0, 18, 0.25, "Spoken narrator", "Before there were stars…\nbefore there was a 'before'…"],
  ["Verse", "Verse 1", 18, 52, 0.5, "Rapper", "I got Schrödinger in the cockpit, two opinions at once\nback past the distance, back when the Milky Way wasn't a thought yet"],
  ["Chorus", "Chorus 1", 52, 82, 0.96, "Lead vocal", "It wasn't a bomb, it was space opening wide\nturning energy and time into a cosmic ride"],
  ["Verse", "Verse 2", 82, 116, 0.55, "Rapper", "First came the fire, the pressure, the heat\nphysics writing rhythms with a newborn beat"],
  ["Chorus", "Chorus 2", 116, 146, 0.97, "Lead vocal", "It wasn't a bomb, it was space opening wide\nturning energy and time into a cosmic ride"],
  ["Bridge", "Bridge", 146, 168, 0.6, "Choir", "The iron in your blood, the calcium in your bones\nyou are not separate from cosmic history"],
  ["Chorus", "Chorus 3", 168, 196, 0.98, "Lead vocal", "Stretch, stretch, stretch — the universe began to grow"],
  ["Outro", "Outro", 196, 212, 0.35, "Spoken narrator", "The Big Bang isn't just where the universe began.\nIt's where your story began too."],
];

function buildSong(): SongMap {
  const now = new Date().toISOString();
  const sections: SongSection[] = SECTIONS.map(([kind, label, start, end, energy, role, lyrics], i) => ({
    id: `demo-sec-${i}`,
    kind: kind as SongSection["kind"],
    label,
    start,
    end,
    energy,
    lyricsText: lyrics,
    performerRole: role,
    mood: energy > 0.9 ? "Euphoric" : energy < 0.4 ? "Reverent" : "Driven",
  }));
  // Synthetic waveform/energy so the overview + lanes look alive.
  const peaks = Array.from({ length: 1400 }, (_, i) => {
    const t = (i / 1400) * 212;
    const sec = sections.find((s) => t >= s.start && t < s.end);
    return Math.min(1, (sec?.energy ?? 0.4) * (0.6 + 0.4 * Math.abs(Math.sin(i / 9))));
  });
  const lyrics: LyricLine[] = [];
  for (const s of sections) {
    const lines = (s.lyricsText ?? "").split("\n").filter(Boolean);
    const span = Math.max(1, s.end - s.start);
    lines.forEach((text, k) =>
      lyrics.push({ id: `${s.id}-${k}`, text, start: s.start + ((k + 0.5) / lines.length) * span, sectionId: s.id })
    );
  }
  return {
    id: DEMO_SONG_ID,
    name: "Space Learned to Stretch (Demo)",
    fileName: "demo.wav",
    durationSec: 212,
    bpm: 94,
    beatOffsetSec: 0,
    beatsPerBar: 4,
    sections,
    lyrics,
    peaks,
    energyEnvelope: sections.flatMap((s) => Array(8).fill(s.energy)),
    createdAt: now,
    updatedAt: now,
  };
}

/** Build + persist the demo production. Returns the demo song id. */
export async function loadDemoProject(): Promise<string> {
  const song = buildSong();
  saveSong(song);

  // A character, a set, and a prop — DNA only (no images; explorable without keys).
  const neo = {
    ...newCharacter("Neo Dude"),
    id: "demo-char-neo",
    role: "Lead Singer",
    age: "20s",
    gender: "Male",
    bodyType: "lean, athletic",
    hairStyle: "tight curls, faded sides",
    primaryOutfit: "iridescent bomber jacket over a tech-knit top",
    promptDna:
      "Neo Dude — a charismatic 20s lead artist, lean athletic build, tight curls with faded sides, iridescent bomber jacket, futuristic streetwear, warm brown skin",
    consistencyRules: "Keep the same face, hair, and jacket across every shot.",
  };
  const cosmos = {
    ...newEnvironment("Tesseract Bridge"),
    id: "demo-env-bridge",
    mood: "awe, vastness",
    timeOfDay: "deep space",
    promptDna:
      "the bridge of a tesseract starship — floating geometric panels, volumetric nebula light, infinite reflective floor, cosmic scale",
  };
  const guitar = {
    ...newProp("Lightstring Guitar", "Prop"),
    id: "demo-prop-guitar",
    materials: "carbon + glowing fiber strings",
    promptDna: "a sleek black guitar with glowing fiber-optic strings, neon edge lighting",
  };
  await api.saveCharacter(neo);
  await api.saveEnvironment(cosmos);
  await api.saveProp(guitar);

  // Cast — fixed ids so re-loading the demo replaces rather than duplicates.
  const cast = [
    { ...newPerformer("Lead Singer"), id: "demo-perf-lead", name: "Neo Dude", characterId: "demo-char-neo" },
    { ...newPerformer("Rapper"), id: "demo-perf-rap", name: "Neo Dude (verses)", characterId: "demo-char-neo" },
    { ...newPerformer("Backing Singer"), id: "demo-perf-choir", name: "The Cosmos Choir" },
    { ...newPerformer("Dancer"), id: "demo-perf-dance", name: "Zero-G Dance Crew" },
  ];
  cast.forEach(savePerformer);

  // A directed treatment + choreography so MV Director and Choreography are full.
  saveTreatment(directSong(song, null));
  saveChoreo(choreographSong(song));

  return DEMO_SONG_ID;
}
