import { describe, expect, it } from "vitest";
import { newCharacter, hasVisualDna, identityAnchor } from "@/platform/lib/characterDna";

// Linking a performer to a character is presented as locking their likeness.
// On real data six of seven characters had no appearance fields at all, so the
// promise was empty for almost every performer in the cast.

describe("hasVisualDna", () => {
  it("is false for a character that only has a name", () => {
    expect(hasVisualDna(newCharacter("Solara"))).toBe(false);
  });

  it("is false when only identity fields are filled", () => {
    const c = { ...newCharacter("Solara"), age: "20s", gender: "Female", role: "Supporting" };
    expect(hasVisualDna(c)).toBe(false);
  });

  it.each([
    ["hairColor", "auburn"],
    ["eyeColor", "green"],
    ["skinTone", "deep brown"],
    ["bodyType", "athletic"],
    ["primaryOutfit", "gold slip dress"],
    ["accessories", "hoop earrings"],
    ["distinguishingFeatures", "scar through one eyebrow"],
    ["faceShape", "heart-shaped"],
    ["eyeShape", "almond"],
    ["hairStyle", "braided"],
  ])("is true once %s describes a look", (field, value) => {
    const c = { ...newCharacter("Solara"), [field]: value };
    expect(hasVisualDna(c)).toBe(true);
  });

  it("accepts a hand-written prompt DNA on its own", () => {
    const c = { ...newCharacter("Neo Dude"), promptDna: "African-American science explorer" };
    expect(hasVisualDna(c)).toBe(true);
  });

  it("ignores whitespace-only fields", () => {
    const c = { ...newCharacter("Solara"), hairColor: "   ", promptDna: "\n" };
    expect(hasVisualDna(c)).toBe(false);
  });
});

describe("identityAnchor", () => {
  it("names the person and how they read", () => {
    const c = { ...newCharacter("Neo Dude"), age: "30s", gender: "Male" };
    expect(identityAnchor(c)).toContain("Neo Dude");
  });

  it("falls back to role, then to a generic noun", () => {
    expect(identityAnchor({ ...newCharacter("Solara"), role: "Supporting" })).toBe(
      "Solara, Supporting"
    );
    expect(identityAnchor({ ...newCharacter("Solara"), role: "" })).toBe("Solara, character");
  });
});
