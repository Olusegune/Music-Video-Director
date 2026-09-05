import { describe, expect, it } from "vitest";
import {
  segmentSections,
  carrySectionEdits,
  type SongSection,
} from "@/apps/music-video/lib/songBrain";

const BAR_DUR = 2; // seconds per bar, arbitrary for this test

describe("segmentSections", () => {
  it("labels a clearly dynamic song with a Chorus", () => {
    // 8 quiet intro bars, 8 loud chorus bars, 8 quiet outro bars.
    const bars = [
      ...Array(8).fill(0.2),
      ...Array(8).fill(0.9),
      ...Array(8).fill(0.2),
    ];
    const sections = segmentSections(bars, BAR_DUR, bars.length * BAR_DUR);
    expect(sections.some((s) => s.kind === "Chorus")).toBe(true);
  });

  it("still surfaces a Chorus on a flat-dynamic song (a ballad with no loud peak)", () => {
    // Every bar sits in a narrow, quiet band (a ballad or an already-loud,
    // compressed mix) — no bar comes close to an old fixed "0.72+" cutoff,
    // but the loudest stretch should still register as the strongest
    // section now that levels are relative to the song's own distribution.
    const bars = [
      ...Array(8).fill(0.3),
      ...Array(8).fill(0.5), // the relatively "loudest" stretch
      ...Array(8).fill(0.3),
    ];
    const sections = segmentSections(bars, BAR_DUR, bars.length * BAR_DUR);
    expect(sections.some((s) => s.kind === "Chorus")).toBe(true);
  });

  it("doesn't collapse a noisy but structured song into one giant section", () => {
    // Real bar-to-bar energy oscillates on top of the slower verse/chorus
    // swing (percussion hits, breaths, mix noise) — percentile thresholds
    // applied directly to that raw noise fragment into many <minBars runs
    // that the merge step then collapses into one segment covering the
    // whole song. A jittered version of the same three-part shape as the
    // first test should still resolve into multiple sections.
    let seed = 7;
    const jitter = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return (seed / 2147483648 - 0.5) * 0.1;
    };
    const bars = [
      ...Array(10).fill(0).map(() => 0.2 + jitter()),
      ...Array(10).fill(0).map(() => 0.85 + jitter()),
      ...Array(10).fill(0).map(() => 0.2 + jitter()),
    ].map((v) => Math.max(0, Math.min(1, v)));
    const sections = segmentSections(bars, BAR_DUR, bars.length * BAR_DUR);
    expect(sections.length).toBeGreaterThan(1);
    expect(sections.some((s) => s.kind === "Chorus")).toBe(true);
  });

  it("never produces a zero-length or out-of-order section", () => {
    const bars = [0.1, 0.9, 0.9, 0.9, 0.2, 0.2, 0.2, 0.2, 0.6, 0.6, 0.6, 0.6];
    const duration = bars.length * BAR_DUR;
    const sections = segmentSections(bars, BAR_DUR, duration);
    expect(sections.length).toBeGreaterThan(0);
    for (const s of sections) expect(s.end).toBeGreaterThan(s.start);
    expect(sections[0].start).toBe(0);
    expect(sections[sections.length - 1].end).toBe(duration);
    for (let i = 1; i < sections.length; i++) {
      expect(sections[i].start).toBe(sections[i - 1].end);
    }
  });

  it("falls back to a single Verse when there's no bar data", () => {
    const sections = segmentSections([], BAR_DUR, 30);
    expect(sections).toHaveLength(1);
    expect(sections[0].kind).toBe("Verse");
    expect(sections[0].start).toBe(0);
    expect(sections[0].end).toBe(30);
  });
});

describe("carrySectionEdits", () => {
  const sec = (over: Partial<SongSection> & { start: number; end: number }): SongSection => ({
    id: `s${over.start}`,
    kind: "Verse",
    label: "Verse",
    energy: 0.5,
    ...over,
  });

  it("keeps a section's lyrics with the moment they belong to when boundaries move", () => {
    const previous = [
      sec({ start: 0, end: 30, lyricsText: "first verse" }),
      sec({ start: 30, end: 60, lyricsText: "the hook" }),
    ];
    // Re-detection splits the song differently: three sections, not two.
    const detected = [sec({ start: 0, end: 20 }), sec({ start: 20, end: 45 }), sec({ start: 45, end: 60 })];

    const got = carrySectionEdits(previous, detected);
    expect(got[0].lyricsText).toBe("first verse"); // 0-20 sits wholly inside the old first
    // 20-45 straddles the old split: 10s of the verse, 15s of the hook. It
    // takes the hook's words because that's the larger share — index-based
    // matching would have handed it the verse's.
    expect(got[1].lyricsText).toBe("the hook");
    expect(got[2].lyricsText).toBe("the hook");
  });

  it("carries every creative field, not just lyrics", () => {
    const previous = [
      sec({
        start: 0,
        end: 60,
        lyricsText: "words",
        lead: "Neo",
        backup: "crew",
        mood: "defiant",
        cameraNote: "push in",
        choreoNote: "step touch",
        storyNote: "he arrives",
        visualStyle: "neon",
        performerRole: "lead",
      }),
    ];
    const got = carrySectionEdits(previous, [sec({ start: 0, end: 60 })]);
    expect(got[0]).toMatchObject({
      lyricsText: "words",
      lead: "Neo",
      backup: "crew",
      mood: "defiant",
      cameraNote: "push in",
      choreoNote: "step touch",
      storyNote: "he arrives",
      visualStyle: "neon",
      performerRole: "lead",
    });
  });

  it("uses the detected kind and timing, not the old one", () => {
    const previous = [sec({ start: 0, end: 60, kind: "Verse", label: "Verse 1" })];
    const detected = [sec({ start: 0, end: 60, kind: "Chorus", label: "Chorus 1", energy: 0.9 })];
    const got = carrySectionEdits(previous, detected);
    expect(got[0].kind).toBe("Chorus");
    expect(got[0].label).toBe("Chorus 1");
  });

  it("leaves a new section untouched when nothing overlaps it", () => {
    const got = carrySectionEdits([], [sec({ start: 0, end: 30 })]);
    expect(got[0].lyricsText).toBeUndefined();
  });
});

describe("segmentSections — chorus labelling", () => {
  // Bar energies rebuilt from a real imported track: a loud, compressed hip-hop
  // mix whose sections all sit in a narrow 0.70–0.80 band above a quiet intro.
  // The shipped detector labelled every one of these Verse and found no Chorus,
  // which left the Director with no performance shots to plan.
  const REAL_TRACK: [number, number][] = [
    [0, 0.48],
    [86.8, 0.701],
    [112.3, 0.802],
    [130.2, 0.549],
    [145.5, 0.723],
    [176.2, 0.781],
    [217.0, 0.785],
    [240, 0.8],
    [280.9, 0.755],
  ];
  const DURATION = 302;
  const REAL_BAR = (60 / 94) * 4;

  const barsFor = (plan: [number, number][], duration: number, barDur: number) => {
    const bars: number[] = [];
    for (let b = 0; b < Math.ceil(duration / barDur); b++) {
      const t = b * barDur;
      let e = plan[0][1];
      for (const [start, energy] of plan) if (t >= start) e = energy;
      bars.push(e);
    }
    return bars;
  };

  it("finds a chorus in a loud, narrow-dynamic-range mix", () => {
    const sections = segmentSections(barsFor(REAL_TRACK, DURATION, REAL_BAR), REAL_BAR, DURATION);
    expect(sections.filter((s) => s.kind === "Chorus").length).toBeGreaterThan(0);
  });

  it("never labels a section Verse while a quieter one is a Chorus", () => {
    const sections = segmentSections(barsFor(REAL_TRACK, DURATION, REAL_BAR), REAL_BAR, DURATION);
    const quietestChorus = Math.min(
      ...sections.filter((s) => s.kind === "Chorus").map((s) => s.energy)
    );
    for (const verse of sections.filter((s) => s.kind === "Verse")) {
      expect(verse.energy).toBeLessThan(quietestChorus);
    }
  });

  it("still opens on an Intro and closes on an Outro", () => {
    const sections = segmentSections(barsFor(REAL_TRACK, DURATION, REAL_BAR), REAL_BAR, DURATION);
    expect(sections[0].kind).toBe("Intro");
    expect(sections[sections.length - 1].kind).toBe("Outro");
  });

  it("reports no chorus on a genuinely flat track rather than inventing one", () => {
    const flat = Array(60).fill(0.5);
    const sections = segmentSections(flat, 2, 120);
    expect(sections.some((s) => s.kind === "Chorus")).toBe(false);
  });
});
