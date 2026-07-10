import { describe, expect, it } from "vitest";
import {
  buildSheetPrompt,
  buildSheetPromptParts,
  joinSheetParts,
  type SheetPromptParts,
} from "@/platform/lib/imageGen";
import { sheetPromptLayers } from "@/platform/lib/bibleLayers";
import { composePrompt } from "@/platform/lib/promptPipeline";
import { newCharacter } from "@/platform/lib/characterDna";
import { newEnvironment } from "@/platform/lib/environmentDna";
import { newProp } from "@/platform/lib/propDna";

const character = () => ({
  ...newCharacter("Neo Dude"),
  promptDna: "indigo coat",
  stylePreset: "",
});
const environment = () => ({ ...newEnvironment("Observatory"), promptDna: "brass domes" });
const prop = () => ({ ...newProp("Star Compass"), promptDna: "ornate brass" });

describe("buildSheetPromptParts", () => {
  it("names every contribution instead of returning one blob", () => {
    const parts = buildSheetPromptParts("character", character(), "deluxe", "4:5");
    expect(parts.layout).toMatch(/character design sheet/i);
    expect(parts.identity).toMatch(/Design DNA: indigo coat/);
    expect(parts.consistency).toMatch(/same character identity/i);
    expect(parts.board).toMatch(/ONE single composed production board/);
    expect(parts.quality).toMatch(/studio quality/);
  });

  it("carries the aspect ratio into the layout, and omits it for custom", () => {
    expect(buildSheetPromptParts("character", character(), "deluxe", "4:5").layout).toContain(
      "4:5 aspect ratio."
    );
    expect(
      buildSheetPromptParts("character", character(), "deluxe", "custom").layout
    ).not.toContain("aspect ratio");
  });

  it("only environments forbid people", () => {
    expect(buildSheetPromptParts("environment", environment(), "deluxe", "16:9").constraints).toBe(
      "no people."
    );
    expect(
      buildSheetPromptParts("character", character(), "deluxe", "4:5").constraints
    ).toBeUndefined();
    expect(buildSheetPromptParts("prop", prop(), "deluxe", "1:1").constraints).toBeUndefined();
  });

  it("falls back to the deluxe layout for an unknown template", () => {
    const known = buildSheetPromptParts("prop", prop(), "deluxe", "1:1").layout;
    expect(buildSheetPromptParts("prop", prop(), "no-such-template", "1:1").layout).toBe(known);
  });

  it("drops an empty style rather than leaving a hole in the prompt", () => {
    const parts = buildSheetPromptParts("character", character(), "deluxe", "4:5");
    expect(parts.style).toBe("");
    expect(joinSheetParts(parts)).not.toMatch(/ {2}/); // no double space where style would sit
  });
});

describe("buildSheetPrompt stays byte-identical after decomposition", () => {
  // The legacy builders joined their fragments with a single space, in this
  // order. buildSheetPrompt must still produce exactly that.
  const legacy = (parts: SheetPromptParts) =>
    [
      parts.layout,
      parts.identity,
      parts.consistency,
      parts.style,
      parts.board,
      parts.quality,
      parts.constraints,
    ]
      .filter(Boolean)
      .join(" ");

  it.each([
    ["character", character(), "deluxe", "4:5"],
    ["character", character(), "turnaround", "custom"],
    ["environment", environment(), "coverage", "16:9"],
    ["prop", prop(), "orthographic", "1:1"],
  ] as const)("%s / %s", (kind, entity, template, aspect) => {
    const parts = buildSheetPromptParts(kind, entity, template, aspect);
    expect(buildSheetPrompt(kind, entity, template, aspect)).toBe(legacy(parts));
  });
});

describe("sheetPromptLayers", () => {
  it("exposes every part as a layer, none muted — this prompt was always being sent", () => {
    const parts = buildSheetPromptParts("environment", environment(), "deluxe", "16:9");
    const layers = sheetPromptLayers(parts, "Observatory", "World Bible");
    expect(layers.map((l) => l.id)).toEqual([
      "layout",
      "identity",
      "consistency",
      "board",
      "quality",
      "constraints",
    ]);
    expect(layers.every((l) => !l.muted)).toBe(true);
    expect(layers.find((l) => l.id === "identity")?.source).toBe("World Bible · Observatory");
  });

  it("includes a style layer only when the entity has a style preset", () => {
    const styled = buildSheetPromptParts(
      "character",
      { ...character(), stylePreset: "flat-vector" },
      "deluxe",
      "4:5"
    );
    expect(sheetPromptLayers(styled, "Neo", "Character Bible").map((l) => l.id)).toContain("style");
    const unstyled = buildSheetPromptParts("character", character(), "deluxe", "4:5");
    expect(sheetPromptLayers(unstyled, "Neo", "Character Bible").map((l) => l.id)).not.toContain(
      "style"
    );
  });

  it("composing the layers reproduces the sheet prompt, modulo sentence punctuation", () => {
    // Every legacy fragment already ends in punctuation EXCEPT the style
    // fragment, which composePrompt terminates. That single added period is the
    // only difference between the flattened legacy string and the composed one.
    const parts = buildSheetPromptParts(
      "character",
      { ...character(), stylePreset: "flat-vector" },
      "deluxe",
      "4:5"
    );
    const layers = sheetPromptLayers(parts, "Neo", "Character Bible");
    const composed = composePrompt({ layers }).prompt;
    const legacyText = joinSheetParts(parts);

    expect(composed).not.toBe(legacyText);
    expect(composed.replace(`${parts.style}.`, parts.style)).toBe(legacyText);
  });

  it("muting a layer removes exactly that contribution", () => {
    const parts = buildSheetPromptParts("prop", prop(), "deluxe", "1:1");
    const layers = sheetPromptLayers(parts, "Star Compass", "Prop Bible");
    const withoutQuality = layers.map((l) => (l.id === "quality" ? { ...l, muted: true } : l));
    expect(composePrompt({ layers: withoutQuality }).prompt).not.toContain(parts.quality);
    expect(composePrompt({ layers: withoutQuality }).prompt).toContain(parts.board);
  });
});
