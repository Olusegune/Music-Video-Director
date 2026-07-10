import { describe, expect, it } from "vitest";
import {
  composePrompt,
  resolveVariables,
  setLayer,
  singleLayerPipeline,
  usedVariables,
  type PromptLayer,
  type PromptPipeline,
} from "@/platform/lib/promptPipeline";

const layer = (id: string, text: string, extra: Partial<PromptLayer> = {}): PromptLayer => ({
  id,
  kind: "template",
  label: id,
  text,
  ...extra,
});

const pipeline = (layers: PromptLayer[], variables?: Record<string, string>): PromptPipeline => ({
  layers,
  variables,
});

describe("resolveVariables", () => {
  it("substitutes known names and reports unknown ones", () => {
    const { text, missing } = resolveVariables("A {product} in {place}", { product: "watch" });
    expect(text).toBe("A watch in {place}");
    expect(missing).toEqual(["place"]);
  });

  it("treats an empty value as missing, not as a blank substitution", () => {
    const { text, missing } = resolveVariables("A {product}", { product: "" });
    expect(text).toBe("A {product}");
    expect(missing).toEqual(["product"]);
  });

  it("reports each missing name once, however often it appears", () => {
    expect(resolveVariables("{a} {a} {b}", {}).missing).toEqual(["a", "b"]);
  });

  it("leaves text with no placeholders untouched", () => {
    expect(resolveVariables("plain text", { a: "1" })).toEqual({ text: "plain text", missing: [] });
  });
});

describe("composePrompt", () => {
  it("joins several layers in order, punctuating each", () => {
    const result = composePrompt(pipeline([layer("a", "A hero shot"), layer("b", "golden hour")]));
    expect(result.prompt).toBe("A hero shot. golden hour.");
    expect(result.negativePrompt).toBeUndefined();
  });

  it("passes a lone layer through verbatim, adding no punctuation", () => {
    // A host that supplies one plain prompt must get back exactly what it wrote.
    expect(composePrompt(pipeline([layer("a", "A hero shot")])).prompt).toBe("A hero shot");
    expect(composePrompt(pipeline([layer("a", "A hero shot!")])).prompt).toBe("A hero shot!");
  });

  it("keeps existing sentence punctuation rather than doubling it", () => {
    const result = composePrompt(pipeline([layer("a", "A hero shot!"), layer("b", "golden hour")]));
    expect(result.prompt).toBe("A hero shot! golden hour.");
  });

  it("routes negative layers to the negative prompt", () => {
    const result = composePrompt(
      pipeline([layer("a", "A hero shot"), layer("n", "blurry", { kind: "negative" })])
    );
    expect(result.prompt).toBe("A hero shot");
    expect(result.negativePrompt).toBe("blurry");
  });

  it("skips muted layers entirely", () => {
    const result = composePrompt(
      pipeline([layer("a", "A hero shot"), layer("b", "cartoon style", { muted: true })])
    );
    expect(result.prompt).toBe("A hero shot");
  });

  it("drops a layer that only repeats another, case and punctuation aside", () => {
    const result = composePrompt(
      pipeline([layer("a", "Golden hour"), layer("b", "golden hour."), layer("c", "  ")])
    );
    expect(result.prompt).toBe("Golden hour");
  });

  it("resolves variables across every layer and collects what is missing", () => {
    const result = composePrompt(
      pipeline([layer("a", "A {product} ad"), layer("b", "shot for {audience}")], {
        product: "watch",
      })
    );
    expect(result.prompt).toBe("A watch ad. shot for {audience}.");
    expect(result.missingVariables).toEqual(["audience"]);
  });

  it("an all-muted pipeline composes to an empty prompt, not to junk", () => {
    const result = composePrompt(pipeline([layer("a", "x", { muted: true })]));
    expect(result.prompt).toBe("");
    expect(result.negativePrompt).toBeUndefined();
  });
});

describe("usedVariables", () => {
  it("lists every placeholder in first-seen order, deduplicated", () => {
    expect(usedVariables(pipeline([layer("a", "{b} {a}"), layer("c", "{a} {c}")]))).toEqual([
      "b",
      "a",
      "c",
    ]);
  });
});

describe("singleLayerPipeline", () => {
  it("wraps a flat prompt so legacy hosts still get a pipeline, unchanged", () => {
    const result = composePrompt(singleLayerPipeline("A hero shot", "blurry"));
    expect(result.prompt).toBe("A hero shot");
    expect(result.negativePrompt).toBe("blurry");
  });

  it("omits the negative layer when there is no negative prompt", () => {
    expect(singleLayerPipeline("A hero shot").layers).toHaveLength(1);
  });
});

describe("setLayer", () => {
  it("patches one layer without touching the others", () => {
    const before = pipeline([layer("a", "one"), layer("b", "two")]);
    const after = setLayer(before, "b", { muted: true });
    expect(after.layers[0]).toEqual(before.layers[0]);
    expect(after.layers[1].muted).toBe(true);
    expect(before.layers[1].muted).toBeUndefined(); // original untouched
  });
});
