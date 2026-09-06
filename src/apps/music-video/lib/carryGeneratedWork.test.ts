import { describe, expect, it } from "vitest";
import { carryGeneratedWork } from "@/apps/music-video/lib/mvDirector";
import type { MvTreatment, MvShot, MvSectionPlan } from "@/apps/music-video/lib/mvDirector";

const shot = (over: Partial<MvShot>): MvShot =>
  ({
    id: crypto.randomUUID(),
    start: 0,
    end: 2,
    idea: "",
    shotType: "",
    movement: "",
    lighting: "",
    performanceNote: "",
    transition: "",
    ...over,
  }) as MvShot;

const section = (kind: string, shots: MvShot[]): MvSectionPlan =>
  ({ sectionId: `sec-${kind}`, label: kind, kind, approach: "Performance", shots }) as MvSectionPlan;

const treatment = (sections: MvSectionPlan[]): MvTreatment =>
  ({ songId: "s", sections, logline: "", visualWorld: "", energyArc: "" }) as MvTreatment;

describe("carryGeneratedWork", () => {
  it("moves a frame onto the shot covering the same moment", () => {
    const prev = treatment([section("Chorus", [shot({ start: 0, end: 2, imageUrl: "frame.png" })])]);
    const next = treatment([section("Chorus", [shot({ start: 0, end: 2 })])]);
    const r = carryGeneratedWork(prev, next);
    expect(r.treatment.sections[0].shots[0].imageUrl).toBe("frame.png");
    expect(r).toMatchObject({ carried: 1, dropped: 0 });
  });

  it("carries clips and hand-set references, not just stills", () => {
    const prev = treatment([
      section("Chorus", [
        shot({
          start: 0,
          end: 2,
          videoUrl: "clip.mp4",
          refImages: ["ref.png"],
          promptOverride: "my words",
        }),
      ]),
    ]);
    const next = treatment([section("Chorus", [shot({ start: 0, end: 2 })])]);
    const out = carryGeneratedWork(prev, next).treatment.sections[0].shots[0];
    expect(out.videoUrl).toBe("clip.mp4");
    expect(out.refImages).toEqual(["ref.png"]);
    expect(out.promptOverride).toBe("my words");
  });

  it("never overwrites what the new plan directed", () => {
    const prev = treatment([section("Chorus", [shot({ start: 0, end: 2, imageUrl: "f.png" })])]);
    const next = treatment([
      section("Chorus", [shot({ start: 0, end: 2, idea: "a new idea", lyric: "new line" })]),
    ]);
    const out = carryGeneratedWork(prev, next).treatment.sections[0].shots[0];
    expect(out.idea).toBe("a new idea");
    expect(out.lyric).toBe("new line");
    expect(out.imageUrl).toBe("f.png");
  });

  // A re-direct that cuts faster splits one shot into several. Copying the
  // frame onto all of them would show the same image three times.
  it("gives a split shot's frame to the best-covering half only", () => {
    const prev = treatment([section("Verse", [shot({ start: 0, end: 6, imageUrl: "wide.png" })])]);
    const next = treatment([
      section("Verse", [shot({ start: 0, end: 4 }), shot({ start: 4, end: 6 })]),
    ]);
    const shots = carryGeneratedWork(prev, next).treatment.sections[0].shots;
    expect(shots[0].imageUrl).toBe("wide.png");
    expect(shots[1].imageUrl).toBeUndefined();
  });

  it("takes each frame once when several shots merge into one", () => {
    const prev = treatment([
      section("Verse", [
        shot({ start: 0, end: 3, imageUrl: "a.png" }),
        shot({ start: 3, end: 6, imageUrl: "b.png" }),
      ]),
    ]);
    const next = treatment([section("Verse", [shot({ start: 0, end: 6 })])]);
    const r = carryGeneratedWork(prev, next);
    expect(r.treatment.sections[0].shots[0].imageUrl).toBe("a.png");
    expect(r).toMatchObject({ carried: 1, dropped: 1 });
  });

  // A chorus frame landing on a verse would be worse than no frame.
  it("will not move a frame between different kinds of section", () => {
    const prev = treatment([section("Chorus", [shot({ start: 0, end: 2, imageUrl: "c.png" })])]);
    const next = treatment([section("Verse", [shot({ start: 0, end: 2 })])]);
    const r = carryGeneratedWork(prev, next);
    expect(r.treatment.sections[0].shots[0].imageUrl).toBeUndefined();
    expect(r).toMatchObject({ carried: 0, dropped: 1 });
  });

  it("reports work whose moment no longer exists rather than losing it quietly", () => {
    const prev = treatment([section("Verse", [shot({ start: 90, end: 92, imageUrl: "gone.png" })])]);
    const next = treatment([section("Verse", [shot({ start: 0, end: 2 })])]);
    expect(carryGeneratedWork(prev, next)).toMatchObject({ carried: 0, dropped: 1 });
  });

  it("ignores shots that were never generated", () => {
    const prev = treatment([section("Verse", [shot({ start: 0, end: 2 })])]);
    const next = treatment([section("Verse", [shot({ start: 0, end: 2 })])]);
    expect(carryGeneratedWork(prev, next)).toMatchObject({ carried: 0, dropped: 0 });
  });

  it("passes the new plan straight through when there is no previous one", () => {
    const next = treatment([section("Verse", [shot({ start: 0, end: 2 })])]);
    expect(carryGeneratedWork(null, next)).toEqual({ treatment: next, carried: 0, dropped: 0 });
  });

  it("does not mutate the treatment it was given", () => {
    const prev = treatment([section("Verse", [shot({ start: 0, end: 2, imageUrl: "f.png" })])]);
    const next = treatment([section("Verse", [shot({ start: 0, end: 2 })])]);
    carryGeneratedWork(prev, next);
    expect(next.sections[0].shots[0].imageUrl).toBeUndefined();
  });
});

describe("bestPriorTreatment", () => {
  // A production here had 54 generated shots saved under "no template". Once
  // the song gained one, Direct offered to generate from scratch as though
  // none of it existed, and re-directing would have orphaned it permanently.
  it("is exercised through carryGeneratedWork: work from another slot still moves", () => {
    const stranded = treatment([
      section("Chorus", [shot({ start: 0, end: 2, imageUrl: "paid-for.png" })]),
    ]);
    const fresh = treatment([section("Chorus", [shot({ start: 0, end: 2 })])]);
    const r = carryGeneratedWork(stranded, fresh);
    expect(r.treatment.sections[0].shots[0].imageUrl).toBe("paid-for.png");
    expect(r.carried).toBe(1);
  });
});
