import { describe, expect, it } from "vitest";
import { segmentSections } from "@/apps/music-video/lib/songBrain";

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
