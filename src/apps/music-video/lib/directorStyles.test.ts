import { describe, expect, it } from "vitest";
import {
  DIRECTOR_STYLES,
  getDirectorStyle,
  styleDirectionFragment,
  blendPool,
  styleVisualWorld,
  styleOrBase,
  getDirectorStyle as resolve,
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

  it("puts flavor first, weighted, but keeps the base variety", () => {
    const pool = blendPool(["a", "b"], ["x"]);
    expect(pool[0]).toBe("x");
    expect(pool.slice(-2)).toEqual(["a", "b"]);
    expect(pool.filter((v) => v === "x").length).toBeGreaterThan(1);
  });
});

describe("blendPool weighting", () => {
  // Measured regression: with the flavor merely prepended, a real track
  // produced a shot, camera move and lighting identical to choosing no style.
  it("lets the style win most picks, not a third of them", () => {
    const base = ["b1", "b2", "b3", "b4", "b5", "b6", "b7", "b8"];
    const flavor = ["f1", "f2", "f3", "f4"];
    const pool = blendPool(base, flavor);
    const flavored = pool.filter((x) => x.startsWith("f")).length;
    expect(flavored / pool.length).toBeGreaterThan(0.6);
  });

  it("still keeps the base entries for variety", () => {
    const pool = blendPool(["b1", "b2"], ["f1"]);
    expect(pool).toContain("b1");
    expect(pool).toContain("b2");
  });
});

describe("styleOrBase", () => {
  // Camera and lighting are the signature. A generic entry drawn alongside a
  // style's own doesn't read as variety, it reads as a mistake.
  it("uses only the style's vocabulary when it has one", () => {
    const picks = [0, 1, 2, 3, 4, 5].map((i) => styleOrBase(["generic"], ["cold track", "slow drift"], i));
    expect(picks).not.toContain("generic");
    expect(new Set(picks)).toEqual(new Set(["cold track", "slow drift"]));
  });

  it("falls back to the base pool when the style offers none", () => {
    expect(styleOrBase(["generic"], undefined, 3)).toBe("generic");
    expect(styleOrBase(["generic"], [], 1)).toBe("generic");
  });
});

describe("styleVisualWorld", () => {
  // The prompt already carries `direction` as its own clause; repeating the
  // same sentence as the world wastes budget and over-weights it.
  it("does not restate the direction sentence", () => {
    const style = resolve("art-house-strange")!;
    expect(styleVisualWorld(style)).not.toContain(style.direction);
  });

  it("describes texture and palette instead", () => {
    const style = resolve("art-house-strange")!;
    const world = styleVisualWorld(style);
    expect(world).toContain("Alienation");
    expect(world).toContain("Palette:");
  });
});
