import { describe, expect, it } from "vitest";
import { choreographSong, FORMATION_INTENTS, type FormationIntentKey } from "@/apps/music-video/lib/choreography";
import type { SongMap, SongSection } from "@/apps/music-video/lib/songBrain";

// Formation-intent presets (Solo/Duo/Group/Freestyle/Stage/Narrative Movement)
// must actually change what gets generated — a button that changes nothing
// when clicked is the exact dishonest-control shape already fixed elsewhere
// in this app (the placeholder shot frames, the character-consistency claim
// with no appearance data behind it). Every preset here is checked against
// real output, not just that it doesn't crash.

function section(overrides: Partial<SongSection>): SongSection {
  return {
    id: "s1",
    kind: "Chorus",
    label: "Chorus 1",
    start: 0,
    end: 16,
    energy: 0.8,
    ...overrides,
  };
}

function songWith(sections: SongSection[]): SongMap {
  return {
    id: "song-1",
    name: "Test Song",
    fileName: "test.wav",
    durationSec: 16,
    bpm: 120,
    beatOffsetSec: 0,
    beatsPerBar: 4,
    sections,
    lyrics: [],
    peaks: [],
    energyEnvelope: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

const GROUP_FORMATIONS = [
  "tight symmetrical line",
  "triangle, lead at apex",
  "mirror pairs",
  "V-formation",
];

describe("FORMATION_INTENTS", () => {
  it("lists Group first as the default, matching today's unlabeled behavior", () => {
    expect(FORMATION_INTENTS[0].key).toBe("group");
  });

  it("has a unique key for every preset", () => {
    const keys = FORMATION_INTENTS.map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("choreographSong formation intent", () => {
  it("defaults to Group and reproduces the pre-existing, unlabeled behavior exactly", () => {
    const song = songWith([section({})]);
    const withoutArg = choreographSong(song, "Pop / Commercial");
    const withGroup = choreographSong(song, "Pop / Commercial", "group");
    expect(withGroup).toEqual({ ...withoutArg, formationIntent: "group" });
    expect(GROUP_FORMATIONS).toContain(withoutArg.sections[0].formation);
  });

  it("Solo drops crew language entirely from the formation", () => {
    const song = songWith([section({})]);
    const plan = choreographSong(song, "Pop / Commercial", "solo");
    for (const s of plan.sections) {
      expect(s.formation).not.toMatch(/pairs|line|v-formation|triangle/i);
    }
  });

  it("Duo formations name a partner, which Group's never do", () => {
    const song = songWith([section({})]);
    const plan = choreographSong(song, "Pop / Commercial", "duo");
    for (const s of plan.sections) {
      expect(s.formation).toMatch(/partner|duo|pair/i);
    }
  });

  it("Freestyle drops Pop/Commercial's counted accent language ('clean freeze', 'snap on the count')", () => {
    // Moves stay genre-flavored by design ("a solo dancer doing Hip Hop still
    // moves like Hip Hop") — only formations and accents are freestyle's own.
    const song = songWith([section({})]);
    const plan = choreographSong(song, "Pop / Commercial", "freestyle");
    const allText = plan.sections.flatMap((s) => s.eightCounts.flatMap((c) => [c.phraseA, c.phraseB])).join(" ");
    expect(allText).not.toMatch(/clean freeze|snap on the count|pose hold|head tilt accent/i);
    expect(allText).toMatch(/vibe, not count|loose freeze, whenever it lands/i);
  });

  it("Stage formations read as theatrical staging, distinct from a plain crew line", () => {
    const song = songWith([section({})]);
    const plan = choreographSong(song, "Pop / Commercial", "stage");
    for (const s of plan.sections) {
      expect(s.formation).toMatch(/stage|tiered|ensemble/i);
    }
  });

  it("Narrative Movement replaces danced moves with blocking, not a smaller dance vocabulary", () => {
    const song = songWith([section({})]);
    const plan = choreographSong(song, "Pop / Commercial", "narrative");
    const allMoves = plan.sections.flatMap((s) => s.eightCounts.flatMap((c) => [c.phraseA, c.phraseB])).join(" ");
    // None of the dance-specific vocabulary should survive.
    expect(allMoves).not.toMatch(/hair flip|pivot step|hip switch|box step/i);
    // Blocking language should be present instead.
    expect(allMoves).toMatch(/walk|turn|reach|glance|pace|lean|cross/i);
  });

  // The one behavior change that isn't just a vocabulary swap: Narrative
  // Movement must reach quiet sections danced choreography would skip.
  it("Narrative Movement writes blocking for a low-energy verse, unlike every other intent", () => {
    const quiet = songWith([section({ kind: "Verse", energy: 0.2 })]);
    const asGroup = choreographSong(quiet, "Pop / Commercial", "group");
    const asNarrative = choreographSong(quiet, "Pop / Commercial", "narrative");
    expect(asGroup.freeSections).toEqual(["Chorus 1"]);
    expect(asGroup.sections).toHaveLength(0);
    expect(asNarrative.freeSections).toEqual([]);
    expect(asNarrative.sections).toHaveLength(1);
  });

  it("persists the chosen intent on the plan, and every preset produces a resolvable one", () => {
    const song = songWith([section({})]);
    for (const preset of FORMATION_INTENTS) {
      const plan = choreographSong(song, "Pop / Commercial", preset.key as FormationIntentKey);
      expect(plan.formationIntent).toBe(preset.key);
    }
  });
});
