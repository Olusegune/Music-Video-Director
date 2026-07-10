import { describe, expect, it } from "vitest";
import {
  compareLayers,
  comparePipelines,
  diffWords,
  forkVariant,
} from "@/platform/lib/promptCompare";
import type { PromptLayer, PromptPipeline } from "@/platform/lib/promptPipeline";

const layer = (id: string, text: string, extra: Partial<PromptLayer> = {}): PromptLayer => ({
  id,
  kind: "template",
  label: id,
  text,
  ...extra,
});
const pipe = (layers: PromptLayer[], variables?: Record<string, string>): PromptPipeline => ({
  layers,
  variables,
});

describe("diffWords", () => {
  it("marks identical text entirely 'same'", () => {
    expect(diffWords("a hero shot", "a hero shot").every((p) => p.kind === "same")).toBe(true);
  });

  it("captures a single word substitution as removed + added", () => {
    const parts = diffWords("a warm hero shot", "a cold hero shot");
    expect(parts.filter((p) => p.kind === "removed").map((p) => p.value.trim())).toEqual(["warm"]);
    expect(parts.filter((p) => p.kind === "added").map((p) => p.value.trim())).toEqual(["cold"]);
    // The unchanged words survive on both sides.
    expect(
      parts
        .filter((p) => p.kind === "same")
        .map((p) => p.value)
        .join("")
        .replace(/\s+/g, " ")
        .trim()
    ).toBe("a hero shot");
  });

  it("reconstructs both inputs from the diff", () => {
    const before = "the quick brown fox";
    const after = "the lazy brown dog jumps";
    const parts = diffWords(before, after);
    const rebuiltBefore = parts
      .filter((p) => p.kind !== "added")
      .map((p) => p.value)
      .join("");
    const rebuiltAfter = parts
      .filter((p) => p.kind !== "removed")
      .map((p) => p.value)
      .join("");
    expect(rebuiltBefore.trim()).toBe(before);
    expect(rebuiltAfter.trim()).toBe(after);
  });

  it("handles empty sides", () => {
    expect(diffWords("", "new words").every((p) => p.kind === "added")).toBe(true);
    expect(diffWords("old words", "").every((p) => p.kind === "removed")).toBe(true);
    expect(diffWords("", "")).toEqual([]);
  });
});

describe("compareLayers", () => {
  it("classifies edited, removed, added, muted and unmuted", () => {
    const a = pipe([
      layer("keep", "same"),
      layer("edit", "before"),
      layer("gone", "dropped"),
      layer("mute-me", "x"),
      layer("wake-me", "y", { muted: true }),
    ]);
    const b = pipe([
      layer("keep", "same"),
      layer("edit", "after"),
      layer("mute-me", "x", { muted: true }),
      layer("wake-me", "y"),
      layer("new", "fresh"),
    ]);
    const byId = Object.fromEntries(compareLayers(a, b).map((c) => [c.id, c.kind]));
    expect(byId).toEqual({
      keep: "unchanged",
      edit: "edited",
      gone: "removed",
      "mute-me": "muted",
      "wake-me": "unmuted",
      new: "added",
    });
  });

  it("keeps A's order, then appends B-only layers", () => {
    const a = pipe([layer("one", "1"), layer("two", "2")]);
    const b = pipe([layer("two", "2"), layer("one", "1"), layer("three", "3")]);
    expect(compareLayers(a, b).map((c) => c.id)).toEqual(["one", "two", "three"]);
  });

  it("carries before/after text for an edited layer", () => {
    const change = compareLayers(pipe([layer("x", "old")]), pipe([layer("x", "new")]))[0];
    expect(change).toMatchObject({ kind: "edited", before: "old", after: "new" });
  });
});

describe("comparePipelines", () => {
  it("reports identical pipelines as identical", () => {
    const p = pipe([layer("a", "hero"), layer("b", "golden hour")]);
    const result = comparePipelines(p, forkVariant(p));
    expect(result.identical).toBe(true);
    expect(result.wordDiff.every((part) => part.kind === "same")).toBe(true);
  });

  it("muting a layer in B shows up in both the layer list and the word diff", () => {
    const a = pipe([layer("dna", "a hero"), layer("style", "cartoon")]);
    const b = pipe([layer("dna", "a hero"), layer("style", "cartoon", { muted: true })]);
    const result = comparePipelines(a, b);
    expect(result.identical).toBe(false);
    expect(result.layers.find((c) => c.id === "style")?.kind).toBe("muted");
    // "cartoon" is present in A's composed prompt, absent from B's.
    expect(result.wordDiff.some((p) => p.kind === "removed" && /cartoon/.test(p.value))).toBe(true);
  });

  it("is not fooled by a muted edit that changes no output", () => {
    // Editing the text of an already-muted layer changes the layer view but not
    // the composed prompt, so it is an edit but not identical-output.
    const a = pipe([layer("u", "hero"), layer("m", "one", { muted: true })]);
    const b = pipe([layer("u", "hero"), layer("m", "two", { muted: true })]);
    const result = comparePipelines(a, b);
    expect(result.layers.find((c) => c.id === "m")?.kind).toBe("edited");
    expect(result.wordDiff.every((p) => p.kind === "same")).toBe(true);
    expect(result.identical).toBe(false); // a layer differs, even if output matches
  });
});

describe("forkVariant", () => {
  it("deep-copies layers and variables so edits do not leak back to A", () => {
    const a = pipe([layer("x", "one")], { product: "watch" });
    const b = forkVariant(a);
    b.layers[0].text = "two";
    b.variables!.product = "ring";
    expect(a.layers[0].text).toBe("one");
    expect(a.variables!.product).toBe("watch");
  });
});
