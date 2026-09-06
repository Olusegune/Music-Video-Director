import { describe, expect, it } from "vitest";
import {
  alignScriptToSong,
  applyScriptToSong,
  describeAlignment,
} from "@/apps/music-video/lib/scriptAlign";
import type { SongMap, SongSection, SectionKind } from "@/apps/music-video/lib/songBrain";
import type { ParsedScript, MarkedSection } from "@/platform/lib/scriptParser";

const sec = (kind: SectionKind, i: number, label?: string): SongSection => ({
  id: `s${i}`,
  kind,
  label: label ?? `${kind} ${i}`,
  start: i * 30,
  end: (i + 1) * 30,
  energy: 0.5,
});

const song = (kinds: SectionKind[]): SongMap => ({
  id: "song-1",
  name: "Test",
  fileName: "t.wav",
  durationSec: kinds.length * 30,
  bpm: 120,
  beatOffsetSec: 0,
  beatsPerBar: 4,
  sections: kinds.map((k, i) => sec(k, i)),
  lyrics: [],
  peaks: [],
  energyEnvelope: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

const marked = (kind: SectionKind, lines: string[], label?: string): MarkedSection => ({
  kind,
  label: label ?? kind,
  lines,
});

const script = (sections: MarkedSection[]): ParsedScript => ({
  themes: [],
  characters: [],
  locations: [],
  sections,
  hookMoments: [],
  emotionalArc: "",
  visualSymbols: [],
  performanceOpportunities: [],
  choreographyMoments: [],
  sourceNotes: "",
});

describe("alignScriptToSong", () => {
  it("pairs like with like when both sides agree", () => {
    const a = alignScriptToSong(
      script([marked("Intro", ["a"]), marked("Verse", ["b"]), marked("Chorus", ["c"])]),
      song(["Intro", "Verse", "Chorus"])
    );
    expect(a.pairs.map((p) => p.scriptIndex)).toEqual([0, 1, 2]);
    expect(a.pairs.every((p) => p.basis === "kind")).toBe(true);
    expect(a.unusedScriptIndexes).toEqual([]);
  });

  // The case that makes naive index-matching wrong: the detector heard an
  // extra verse, so from there on every script section is one slot out.
  it("keeps the nth chorus on the nth chorus when a verse is inserted", () => {
    const a = alignScriptToSong(
      script([marked("Verse", ["v1"]), marked("Chorus", ["hook"])]),
      song(["Verse", "Verse", "Chorus"])
    );
    const chorusPair = a.pairs.find((p) => p.songKind === "Chorus")!;
    expect(chorusPair.scriptIndex).toBe(1);
    expect(chorusPair.basis).toBe("kind");
  });

  it("falls back to reading order for kinds the script doesn't mark", () => {
    const a = alignScriptToSong(
      script([marked("Verse", ["v1"]), marked("Verse", ["v2"])]),
      song(["Verse", "Bridge"])
    );
    expect(a.pairs[0]).toMatchObject({ scriptIndex: 0, basis: "kind" });
    expect(a.pairs[1]).toMatchObject({ scriptIndex: 1, basis: "order" });
  });

  it("reports script sections it could not place rather than forcing them", () => {
    const a = alignScriptToSong(
      script([marked("Verse", ["v1"]), marked("Verse", ["v2"]), marked("Bridge", ["b"])]),
      song(["Verse"])
    );
    expect(a.pairs[0].scriptIndex).toBe(0);
    expect(a.unusedScriptIndexes).toEqual([1, 2]);
  });

  it("leaves song sections unmatched when the script runs out", () => {
    const a = alignScriptToSong(script([marked("Verse", ["v1"])]), song(["Verse", "Chorus"]));
    expect(a.pairs[1]).toMatchObject({ scriptIndex: null, basis: "none" });
  });

  it("never assigns one script section to two song sections", () => {
    const a = alignScriptToSong(
      script([marked("Chorus", ["hook"])]),
      song(["Chorus", "Chorus", "Chorus"])
    );
    const used = a.pairs.map((p) => p.scriptIndex).filter((i): i is number => i !== null);
    expect(new Set(used).size).toBe(used.length);
  });

  it("handles an empty script without inventing pairings", () => {
    const a = alignScriptToSong(script([]), song(["Verse", "Chorus"]));
    expect(a.pairs.every((p) => p.scriptIndex === null)).toBe(true);
    expect(a.unusedScriptIndexes).toEqual([]);
  });
});

describe("applyScriptToSong", () => {
  it("puts the script's words on the section they were matched to", () => {
    const s = song(["Verse", "Chorus"]);
    const sc = script([marked("Verse", ["first line", "second line"]), marked("Chorus", ["the hook"])]);
    const out = applyScriptToSong(s, sc, alignScriptToSong(sc, s));
    expect(out.sections[0].lyricsText).toBe("first line\nsecond line");
    expect(out.sections[1].lyricsText).toBe("the hook");
  });

  it("lifts a movement line into the choreography note", () => {
    const s = song(["Chorus"]);
    const sc = script([marked("Chorus", ["we dance until the lights go out"])]);
    const out = applyScriptToSong(s, sc, alignScriptToSong(sc, s));
    expect(out.sections[0].choreoNote).toContain("dance");
  });

  it("lifts an action line into the story note", () => {
    const s = song(["Verse"]);
    const sc = script([marked("Verse", ["he walks out into the rain"])]);
    const out = applyScriptToSong(s, sc, alignScriptToSong(sc, s));
    expect(out.sections[0].storyNote).toContain("walks");
  });

  // Applying a script must not quietly wipe work the user did by hand.
  it("leaves an unmatched section's existing notes alone", () => {
    const s = song(["Verse", "Chorus"]);
    s.sections[1].lyricsText = "my own hook";
    s.sections[1].choreoNote = "my own move";
    const sc = script([marked("Verse", ["v"])]);
    const out = applyScriptToSong(s, sc, alignScriptToSong(sc, s));
    expect(out.sections[1].lyricsText).toBe("my own hook");
    expect(out.sections[1].choreoNote).toBe("my own move");
  });

  it("keeps an existing choreo note when the script has no movement cue", () => {
    const s = song(["Verse"]);
    s.sections[0].choreoNote = "hand-written move";
    const sc = script([marked("Verse", ["just some words"])]);
    const out = applyScriptToSong(s, sc, alignScriptToSong(sc, s));
    expect(out.sections[0].lyricsText).toBe("just some words");
    expect(out.sections[0].choreoNote).toBe("hand-written move");
  });

  it("does not mutate the song it was given", () => {
    const s = song(["Verse"]);
    const sc = script([marked("Verse", ["new words"])]);
    applyScriptToSong(s, sc, alignScriptToSong(sc, s));
    expect(s.sections[0].lyricsText).toBeUndefined();
  });
});

describe("describeAlignment", () => {
  it("says what matched and what was left over", () => {
    const s = song(["Verse"]);
    const sc = script([marked("Verse", ["v"]), marked("Bridge", ["b"], "Bridge")]);
    const text = describeAlignment(alignScriptToSong(sc, s), sc);
    expect(text).toContain("1 of 1");
    expect(text).toContain("Bridge");
  });
});

// The claim Phase 2 makes: give the app a script and the acting, movement and
// words reach the generated prompt. This walks the whole chain rather than
// trusting the pieces individually.
describe("script reaches the generated prompt", () => {
  it("carries words, action and choreography from raw text into an image prompt", async () => {
    const { parseScript } = await import("@/platform/lib/scriptParser");
    const { directSong } = await import("@/apps/music-video/lib/mvDirector");
    const { buildShotImagePrompt } = await import("@/apps/music-video/lib/mvGen");

    const raw = [
      "[Verse 1]",
      "he walks out into the rain alone",
      "",
      "[Chorus]",
      "we dance until the lights go out",
    ].join("\n");

    const base = song(["Verse", "Chorus"]);
    const parsed = parseScript(raw);
    const applied = applyScriptToSong(base, parsed, alignScriptToSong(parsed, base));

    // The brief the Director hands to the prompt builder is assembled from the
    // song section, exactly as MvDirector's briefForSection does.
    const chorus = applied.sections[1];
    const treatment = directSong(applied);
    const plan = treatment.sections[1];

    const prompt = buildShotImagePrompt({
      shot: plan.shots[0],
      section: plan,
      treatment,
      cast: [],
      characters: [],
      aspect: "16:9",
      brief: {
        choreoNote: chorus.choreoNote,
        storyNote: chorus.storyNote,
      },
    });

    expect(prompt).toContain("Choreography: we dance until the lights go out");
    expect(applied.sections[0].storyNote).toContain("walks out into the rain");
    expect(applied.sections[0].lyricsText).toContain("walks out into the rain");
  });
});
