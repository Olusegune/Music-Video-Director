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
