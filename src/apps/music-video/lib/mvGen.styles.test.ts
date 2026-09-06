import { describe, expect, it } from "vitest";
import { buildShotImagePrompt, buildShotVideoPrompt, type GenContext } from "@/apps/music-video/lib/mvGen";
import type { MvShot, MvSectionPlan, MvTreatment } from "@/apps/music-video/lib/mvDirector";
import { DIRECTOR_STYLES } from "@/apps/music-video/lib/directorStyles";

// The prompt is the only thing a generation model ever sees, so this is where
// the director-style contract actually has to hold.

const shot: MvShot = {
  id: "shot-1",
  start: 0,
  end: 4,
  idea: "Wide on the rooftop",
  shotType: "Wide",
  movement: "Slow push-in",
  lighting: "Hard key",
  performanceNote: "Direct to camera",
  transition: "Cut on the beat",
};

const section: MvSectionPlan = {
  sectionId: "sec-1",
  kind: "Chorus",
  label: "Chorus 1",
  start: 0,
  end: 16,
  approach: "Performance",
  energy: 0.9,
  concept: "The hook lands",
  location: "Rooftop at dusk",
  wardrobe: "Statement jacket",
  cutPace: "Fast · ~1.4s / shot · 4 shots",
  shots: [shot],
};

const treatment = (directorStyleId?: string): MvTreatment => ({
  songId: "song-1",
  logline: "A test treatment",
  visualWorld: "Neutral cinematic look.",
  energyArc: "Builds",
  sections: [section],
  directorStyleId,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

const ctx = (directorStyleId?: string): GenContext => ({
  shot,
  section,
  treatment: treatment(directorStyleId),
  cast: [],
  characters: [],
  aspect: "16:9",
});

describe("director style in generated prompts", () => {
  it("adds craft direction to the image prompt", () => {
    const styled = buildShotImagePrompt(ctx("glossy-kinetic-hiphop"));
    expect(styled).toContain("Style direction:");
    expect(styled.toLowerCase()).toContain("fisheye");
  });

  it("adds craft direction to the video prompt", () => {
    const styled = buildShotVideoPrompt(ctx("biomechanical-dark"));
    expect(styled).toContain("Style direction:");
    expect(styled.toLowerCase()).toContain("industrial");
  });

  it("leaves the prompt untouched when the user skipped the step", () => {
    expect(buildShotImagePrompt(ctx())).toBe(buildShotImagePrompt(ctx(undefined)));
    expect(buildShotImagePrompt(ctx())).not.toContain("Style direction:");
    expect(buildShotVideoPrompt(ctx())).not.toContain("Style direction:");
  });

  it("ignores an unknown style rather than emitting an empty clause", () => {
    const prompt = buildShotImagePrompt(ctx("no-such-style"));
    expect(prompt).not.toContain("Style direction:");
    expect(prompt).toBe(buildShotImagePrompt(ctx()));
  });

  // The whole reason `direction` is written in craft terms: a real person's
  // name must not travel to a third-party generation service as an instruction.
  it("never sends a director's name to a model", () => {
    const names = DIRECTOR_STYLES.flatMap((s) =>
      s.name.split(/\s+/).map((p) => p.replace(/\W/g, "")).filter((p) => p.length > 2)
    );
    for (const style of DIRECTOR_STYLES) {
      const prompts = [buildShotImagePrompt(ctx(style.id)), buildShotVideoPrompt(ctx(style.id))];
      for (const prompt of prompts) {
        for (const name of names) {
          expect(
            new RegExp(`\\b${name}\\b`, "i").test(prompt),
            `"${name}" reached a prompt via ${style.name}`
          ).toBe(false);
        }
      }
    }
  });
});

// The lyric was arriving rendered as typography across the generated frame,
// because the prompt opened with it in curly quotes.
describe("lyric text never reaches the frame as typography", () => {
  const sung: MvShot = {
    ...shot,
    lyric: "let's rewind existence,",
    idea: "“let's rewind existence,” — artist against a pure saturated color field",
  };
  const sungCtx = (): GenContext => ({ ...ctx(), shot: sung, section: { ...section, shots: [sung] } });

  it("keeps the quoted lyric out of the image prompt", () => {
    const prompt = buildShotImagePrompt(sungCtx());
    expect(prompt).not.toContain("let's rewind existence");
    expect(prompt).not.toContain("“");
  });

  it("keeps the quoted lyric out of the video prompt", () => {
    const prompt = buildShotVideoPrompt(sungCtx());
    expect(prompt).not.toContain("let's rewind existence");
  });

  it("still describes the shot the lyric belonged to", () => {
    expect(buildShotImagePrompt(sungCtx())).toContain("artist against a pure saturated color field");
  });

  it("says the performer is singing, so the mouth is still right", () => {
    expect(buildShotImagePrompt(sungCtx()).toLowerCase()).toContain("singing");
  });

  it("tells the model not to letter anything", () => {
    expect(buildShotImagePrompt(sungCtx())).toContain("No on-screen text");
    expect(buildShotVideoPrompt(sungCtx())).toContain("No on-screen text");
  });

  // The first attempt at this stripped nothing when the lyric contained an
  // apostrophe, because the quote character class swallowed it.
  it("strips a lyric that contains an apostrophe", () => {
    const awkward: MvShot = {
      ...shot,
      lyric: "don't look back now",
      idea: "“don't look back now” — low-angle hero",
    };
    const prompt = buildShotImagePrompt({
      ...ctx(),
      shot: awkward,
      section: { ...section, shots: [awkward] },
    });
    expect(prompt).not.toContain("don't look back");
    expect(prompt).toContain("low-angle hero");
  });

  it("leaves an instrumental shot's idea untouched", () => {
    const prompt = buildShotImagePrompt(ctx());
    expect(prompt).toContain("Wide on the rooftop");
    expect(prompt).not.toContain("singing");
  });
});
