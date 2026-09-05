import { describe, expect, it } from "vitest";
import {
  DIRECTOR_STYLES,
  getDirectorStyle,
  styleDirectionFragment,
  blendPool,
} from "@/apps/music-video/lib/directorStyles";

describe("DIRECTOR_STYLES", () => {
  it("has unique ids", () => {
    const ids = DIRECTOR_STYLES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every style the fields the Director Brain and prompts read", () => {
    for (const style of DIRECTOR_STYLES) {
      expect(style.name).toBeTruthy();
      expect(style.signature).toBeTruthy();
      expect(style.direction).toBeTruthy();
      expect(style.techniques.length).toBeGreaterThan(2);
      expect(style.shotFlavor.length).toBeGreaterThan(2);
      expect(style.cameraMoves.length).toBeGreaterThan(0);
      expect(style.lighting.length).toBeGreaterThan(0);
      expect(style.cutBias).toBeGreaterThan(0);
    }
  });

  // The point of the whole design: the director's name is an inspiration
  // credit in our UI, never an instruction to a generation model. A name in a
  // prompt is both less effective (providers filter or ignore them) and edges
  // toward implying a real person made the output.
  it("never names a director in text that reaches a model", () => {
    const surnames = DIRECTOR_STYLES.flatMap((style) =>
      style.name
        .split(/\s+/)
        // Skip initials and one-letter names ("F.", "X") — too short to match
        // meaningfully, and "X" would false-positive on ordinary words.
        .filter((part) => part.replace(/\W/g, "").length > 2)
        .map((part) => part.replace(/\W/g, ""))
    );

    for (const style of DIRECTOR_STYLES) {
      const modelFacing = [style.direction, ...style.techniques, ...style.shotFlavor].join(" ");
      for (const surname of surnames) {
        // Whole words only. "Hype" is a substring of "hyper-saturated", which
        // is ordinary craft vocabulary, not a name leak.
        const asWord = new RegExp(`\\b${surname}\\b`, "i");
        expect(
          asWord.test(modelFacing),
          `"${surname}" appears in model-facing text for ${style.name}`
        ).toBe(false);
      }
    }
  });

  it("resolves a style by id and tolerates none", () => {
    expect(getDirectorStyle("glossy-kinetic-hiphop")?.name).toBe("Hype Williams");
    expect(getDirectorStyle(undefined)).toBeUndefined();
    expect(getDirectorStyle("nope")).toBeUndefined();
  });
});

describe("styleDirectionFragment", () => {
  it("is empty with no style, so skipping costs nothing", () => {
    expect(styleDirectionFragment(null)).toBe("");
    expect(styleDirectionFragment(undefined)).toBe("");
  });

  it("carries the direction when a style is chosen", () => {
    const style = getDirectorStyle("precise-ominous");
    expect(styleDirectionFragment(style)).toContain("low-key");
  });
});

describe("blendPool", () => {
  it("returns the base pool untouched when there is no flavor", () => {
    const base = ["a", "b"];
    expect(blendPool(base)).toBe(base);
    expect(blendPool(base, [])).toBe(base);
  });

  it("puts flavor first but keeps the base variety", () => {
    expect(blendPool(["a", "b"], ["x"])).toEqual(["x", "a", "b"]);
  });
});
