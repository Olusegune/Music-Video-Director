import { describe, expect, it } from "vitest";
import { choreographSong, isChoreoStale } from "@/apps/music-video/lib/choreography";
import type { SongMap, SongSection } from "@/apps/music-video/lib/songBrain";

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

describe("choreographSong lyric/script-aware selection", () => {
  it("biases the formation and poses toward the section's lyrics when they match a gesture theme", () => {
    const song = songWith([
      section({ lyricsText: "reach for the sky, hands up high" }),
    ]);
    const plan = choreographSong(song, "Gospel");
    const s = plan.sections[0];
    // Every gesture-bearing field should be pulled toward the "reach up"
    // theme rather than round-robin — at least one of them has to contain a
    // theme word, or this degenerated back to plain pick().
    const all = [s.formation, ...s.keyPoses, s.eightCounts[0].phraseA, s.eightCounts[0].phraseB]
      .join(" ")
      .toLowerCase();
    expect(/raise|reach|high|sky/.test(all)).toBe(true);
  });

  it("reads choreoNote/storyNote the same way it reads lyrics", () => {
    const song = songWith([
      section({ choreoNote: "kneel and pray to the ground" }),
    ]);
    const plan = choreographSong(song, "Gospel");
    const s = plan.sections[0];
    const all = [s.formation, ...s.keyPoses].join(" ").toLowerCase();
    expect(/kneel|pray|ground|low|down/.test(all)).toBe(true);
  });

  it("falls back to normal round-robin selection when nothing matches a theme", () => {
    const song = songWith([section({ lyricsText: "la la la nothing special here" })]);
    // Should not throw, and should still produce a full section.
    const plan = choreographSong(song, "Hip Hop");
    expect(plan.sections).toHaveLength(1);
    expect(plan.sections[0].formation.length).toBeGreaterThan(0);
  });
});

describe("choreographSong per-song variation", () => {
  // Picks used to be keyed on section index alone, so section 0 of every
  // song got pool[0] — identical camera moves and lighting in every music
  // video the app ever produced. Two different songs must not choreograph
  // to the same camera/lighting plan.
  it("gives two different songs different camera and lighting plans", () => {
    const sections = [section({ lyricsText: "la la la nothing special here" })];
    const a = choreographSong({ ...songWith(sections), id: "song-aaa" }, "Hip Hop");
    const b = choreographSong({ ...songWith(sections), id: "song-zzz" }, "Hip Hop");

    const sig = (p: ReturnType<typeof choreographSong>) =>
      [...(p.sections[0].cameraMoves ?? []), ...(p.sections[0].lightingMoves ?? [])].join("|");

    expect(sig(a)).not.toBe(sig(b));
  });

  it("is deterministic — re-choreographing the same song gives the same plan", () => {
    const sections = [section({ lyricsText: "la la la nothing special here" })];
    const song = { ...songWith(sections), id: "song-stable" };
    const first = choreographSong(song, "Hip Hop");
    const second = choreographSong(song, "Hip Hop");

    const sig = (p: ReturnType<typeof choreographSong>) =>
      [...(p.sections[0].cameraMoves ?? []), ...(p.sections[0].lightingMoves ?? [])].join("|");

    expect(sig(first)).toBe(sig(second));
  });
});

describe("isChoreoStale", () => {
  const song = songWith([
    section({ id: "a", kind: "Verse", label: "Verse 1", start: 0, end: 30 }),
    section({ id: "b", kind: "Chorus", label: "Chorus 1", start: 30, end: 60 }),
  ]);

  it("accepts a plan made from the current sections", () => {
    expect(isChoreoStale(choreographSong(song), song)).toBe(false);
  });

  it("treats a missing plan as missing, not stale", () => {
    expect(isChoreoStale(null, song)).toBe(false);
    expect(isChoreoStale(undefined, song)).toBe(false);
  });

  // The real case: re-detection mints new section ids, orphaning every
  // reference. A real track carried a plan calling its choruses verses.
  it("spots a plan whose sections no longer exist", () => {
    const plan = choreographSong(song);
    const reDetected = songWith([
      section({ id: "fresh-1", kind: "Verse", label: "Verse 1", start: 0, end: 30 }),
      section({ id: "fresh-2", kind: "Chorus", label: "Chorus 1", start: 30, end: 60 }),
    ]);
    expect(isChoreoStale(plan, reDetected)).toBe(true);
  });

  it("spots a section retagged to a different kind", () => {
    const plan = choreographSong(song);
    const retagged = songWith([
      section({ id: "a", kind: "Verse", label: "Verse 1", start: 0, end: 30 }),
      section({ id: "b", kind: "Bridge", label: "Bridge", start: 30, end: 60 }),
    ]);
    expect(isChoreoStale(plan, retagged)).toBe(true);
  });

  it("spots a section that moved in time", () => {
    const plan = choreographSong(song);
    const shifted = songWith([
      section({ id: "a", kind: "Verse", label: "Verse 1", start: 0, end: 24 }),
      section({ id: "b", kind: "Chorus", label: "Chorus 1", start: 24, end: 60 }),
    ]);
    expect(isChoreoStale(plan, shifted)).toBe(true);
  });

  it("tolerates sub-second drift rather than churning", () => {
    const plan = choreographSong(song);
    const nudged = songWith([
      section({ id: "a", kind: "Verse", label: "Verse 1", start: 0, end: 30 }),
      section({ id: "b", kind: "Chorus", label: "Chorus 1", start: 30.2, end: 60 }),
    ]);
    expect(isChoreoStale(plan, nudged)).toBe(false);
  });
});
