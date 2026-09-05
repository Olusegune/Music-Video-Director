import { describe, expect, it } from "vitest";
import { directSong } from "@/apps/music-video/lib/mvDirector";
import type { SongMap, SongSection } from "@/apps/music-video/lib/songBrain";

function section(overrides: Partial<SongSection>): SongSection {
  return {
    id: "s1",
    kind: "Intro",
    label: "Intro",
    start: 0,
    end: 16,
    energy: 0.3,
    ...overrides,
  };
}

function songWith(id: string, sections: SongSection[]): SongMap {
  return {
    id,
    name: "Test Song",
    fileName: "test.wav",
    durationSec: 32,
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

describe("directSong per-song variation", () => {
  // Shot ideas, locations, and wardrobe used to be picked by index alone.
  // Shot 0 is always the first shot of the first section, which is always
  // the Intro (always Abstract), so *every* song opened on the literal same
  // shot idea — "Macro texture — light raking through haze" — no matter what
  // the track sounded like.
  const sections = [
    section({ id: "a", kind: "Intro", label: "Intro", start: 0, end: 16, energy: 0.3 }),
    section({ id: "b", kind: "Chorus", label: "Chorus 1", start: 16, end: 32, energy: 0.85 }),
  ];

  it("gives two different songs different opening shots", () => {
    const a = directSong(songWith("song-aaa", sections));
    const b = directSong(songWith("song-zzz", sections));
    expect(a.sections[0].shots[0].shotType).not.toBe(b.sections[0].shots[0].shotType);
  });

  it("gives two different songs different locations and wardrobe", () => {
    const a = directSong(songWith("song-aaa", sections));
    const b = directSong(songWith("song-zzz", sections));
    const sig = (p: ReturnType<typeof directSong>) =>
      p.sections.map((s) => `${s.location}/${s.wardrobe}`).join("|");
    expect(sig(a)).not.toBe(sig(b));
  });

  it("is deterministic — re-directing the same song gives the same plan", () => {
    const song = songWith("song-stable", sections);
    const first = directSong(song);
    const second = directSong(song);
    const sig = (p: ReturnType<typeof directSong>) =>
      p.sections.flatMap((s) => [s.location, s.wardrobe, ...s.shots.map((x) => x.shotType)]).join("|");
    expect(sig(first)).toBe(sig(second));
  });
});
