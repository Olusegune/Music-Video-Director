import { describe, expect, it } from "vitest";
import { draftPropFromLine } from "@/platform/lib/propDna";

describe("draftPropFromLine", () => {
  it("names the prop from the head of the line and keeps the full line as usage", () => {
    const p = draftPropFromLine("an ornate brass compass with a cracked lens");
    expect(p.name).toBe("an ornate brass compass with a cracked lens");
    expect(p.usage).toBe("an ornate brass compass with a cracked lens");
    // Composed, not blank — so the entity is usable before any manual editing.
    expect(p.promptDna.length).toBeGreaterThan(0);
  });

  it("truncates a very long spark to a sensible name but keeps the full usage", () => {
    const line = "a ".concat("very ".repeat(40), "long ceremonial staff");
    const p = draftPropFromLine(line);
    expect(p.name.length).toBeLessThanOrEqual(48);
    expect(p.usage).toBe(line.trim());
  });

  it("infers the category from the words in the spark", () => {
    expect(draftPropFromLine("a battered muscle car").category).toBe("Vehicle");
    expect(draftPropFromLine("a scaled fire-breathing dragon").category).toBe("Creature");
    expect(draftPropFromLine("a notched cavalry sword").category).toBe("Weapon");
    expect(draftPropFromLine("a tattered indigo coat with gold trim").category).toBe("Wardrobe");
    expect(draftPropFromLine("a carved oak throne").category).toBe("Set Dressing");
  });

  it("falls back to Prop when nothing matches", () => {
    expect(draftPropFromLine("a glowing hexagonal artifact").category).toBe("Prop");
  });

  it("does not throw on an empty line", () => {
    const p = draftPropFromLine("   ");
    expect(p.name).toBe("Untitled");
    expect(p.category).toBe("Prop");
  });
});
