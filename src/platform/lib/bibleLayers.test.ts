import { describe, expect, it } from "vitest";
import { bibleEntityLayers } from "@/platform/lib/bibleLayers";
import { composePrompt } from "@/platform/lib/promptPipeline";

const entity = (over: Partial<Parameters<typeof bibleEntityLayers>[0]> = {}) => ({
  name: "Neo Dude",
  promptDna: "",
  ...over,
});

describe("bibleEntityLayers", () => {
  it("prefers a hand-written DNA over the composed one", () => {
    const [dna] = bibleEntityLayers(
      entity({ promptDna: "hand written" }),
      "composed",
      "Character Bible"
    );
    expect(dna.text).toBe("hand written");
  });

  it("falls back to the composed DNA when the entity has none", () => {
    const [dna] = bibleEntityLayers(entity(), "composed", "Character Bible");
    expect(dna.text).toBe("composed");
  });

  it("names the layer for its Bible and cites the entity as its source", () => {
    const [dna] = bibleEntityLayers(entity(), "x", "World Bible");
    expect(dna.label).toBe("World DNA");
    expect(dna.source).toBe("World Bible · Neo Dude");
  });

  it("omits consistency and style when the entity has none", () => {
    expect(bibleEntityLayers(entity(), "x", "Prop Bible")).toHaveLength(1);
  });

  it("ships consistency rules muted, so existing prompts are unchanged", () => {
    const layers = bibleEntityLayers(
      entity({ promptDna: "a hero", consistencyRules: "always curls" }),
      "",
      "Character Bible"
    );
    expect(layers[1]).toMatchObject({ id: "consistency", muted: true });
    // The composed prompt is the DNA alone — byte-identical to the old behavior.
    expect(composePrompt({ layers }).prompt).toBe("a hero");
  });

  it("ignores an unknown style preset rather than inventing an empty layer", () => {
    const layers = bibleEntityLayers(
      entity({ promptDna: "a hero", stylePreset: "not-a-real-preset" }),
      "",
      "Character Bible"
    );
    expect(layers.map((l) => l.id)).toEqual(["dna"]);
  });

  it("only the DNA layer is editable; the contributed ones are not", () => {
    const layers = bibleEntityLayers(
      entity({ promptDna: "a", consistencyRules: "b" }),
      "",
      "Character Bible"
    );
    expect(layers[0].editable).toBe(true);
    expect(layers[1].editable).toBeUndefined();
  });
});
