import { describe, expect, it } from "vitest";
import { lyricsFromSections, songWithSections } from "./SongView";
import type { SongMap, SongSection } from "@/apps/music-video/lib/songBrain";

// directSong reads song.lyrics — a separate timed list — not section.lyricsText.
// Bulk transcription wrote lyricsText for nine sections and none of it reached a
// prompt, because the timed list was never rebuilt from it. These lock the
// derivation that keeps the two in step.

const section = (over: Partial<SongSection>): SongSection =>
  ({ id: "s", kind: "Verse", label: "Verse", start: 0, end: 10, energy: 0.5, ...over }) as SongSection;

describe("lyricsFromSections", () => {
  it("gives every written line a time inside its own section", () => {
    const out = lyricsFromSections([
      section({ id: "a", start: 0, end: 10, lyricsText: "one\ntwo" }),
      section({ id: "b", start: 10, end: 20, lyricsText: "three" }),
    ]);
    expect(out.map((l) => l.text)).toEqual(["one", "two", "three"]);
    for (const line of out) {
      const owner = line.sectionId === "a" ? [0, 10] : [10, 20];
      expect(line.start).toBeGreaterThanOrEqual(owner[0]);
      expect(line.start).toBeLessThan(owner[1]);
    }
  });

  it("keeps written order within a section", () => {
    const out = lyricsFromSections([section({ id: "a", lyricsText: "first\nsecond\nthird" })]);
    expect(out.map((l) => l.text)).toEqual(["first", "second", "third"]);
    expect(out[0].start).toBeLessThan(out[1].start);
    expect(out[1].start).toBeLessThan(out[2].start);
  });

  // The Outro had five written lines and no timed lines at all, so ten shots
  // were directed over it carrying no words.
  it("does not skip a section that gained words after the others", () => {
    const out = lyricsFromSections([
      section({ id: "a", start: 0, end: 10, lyricsText: "early" }),
      section({ id: "outro", start: 10, end: 20, lyricsText: "Mic's down — universe is up" }),
    ]);
    expect(out.filter((l) => l.sectionId === "outro")).toHaveLength(1);
  });

  it("strands no lines from a section that no longer exists", () => {
    const out = lyricsFromSections([section({ id: "a", lyricsText: "kept" })]);
    expect(out.every((l) => l.sectionId === "a")).toBe(true);
  });

  it("ignores blank lines rather than timing empty text", () => {
    const out = lyricsFromSections([section({ id: "a", lyricsText: "one\n\n  \ntwo" })]);
    expect(out.map((l) => l.text)).toEqual(["one", "two"]);
  });

  it("returns nothing for sections with no words", () => {
    expect(lyricsFromSections([section({ id: "a", lyricsText: "" })])).toEqual([]);
    expect(lyricsFromSections([section({ id: "a" })])).toEqual([]);
  });
});

describe("songWithSections", () => {
  const song = {
    id: "song-1",
    name: "Track",
    sections: [],
    lyrics: [{ id: "old-0", text: "words from before", start: 1, sectionId: "a" }],
  } as unknown as SongMap;

  // The bug this exists to prevent: sections updated, timed lyrics left behind,
  // and the Director quietly directing against the previous words.
  it("rebuilds the timed lyrics from the sections it is given", () => {
    const next = songWithSections(song, [
      section({ id: "a", start: 0, end: 10, lyricsText: "brand new line" }),
    ]);
    expect(next.lyrics.map((l) => l.text)).toEqual(["brand new line"]);
    expect(next.lyrics.some((l) => l.text === "words from before")).toBe(false);
  });

  it("clears timed lyrics when the words are removed", () => {
    const next = songWithSections(song, [section({ id: "a", lyricsText: "" })]);
    expect(next.lyrics).toEqual([]);
  });

  it("carries the rest of the song through untouched", () => {
    const next = songWithSections(song, [section({ id: "a", lyricsText: "x" })]);
    expect(next.id).toBe("song-1");
    expect(next.name).toBe("Track");
  });
});
