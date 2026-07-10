import { describe, expect, it } from "vitest";
import { SHORTCUT_GROUPS, renderKey } from "@/platform/lib/shortcuts";

describe("shortcut registry", () => {
  it("is non-empty and every shortcut has keys and a label", () => {
    expect(SHORTCUT_GROUPS.length).toBeGreaterThan(0);
    for (const group of SHORTCUT_GROUPS) {
      expect(group.shortcuts.length).toBeGreaterThan(0);
      for (const shortcut of group.shortcuts) {
        expect(shortcut.keys.length).toBeGreaterThan(0);
        expect(shortcut.label.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("has no duplicate labels — each shortcut is documented once", () => {
    const labels = SHORTCUT_GROUPS.flatMap((g) => g.shortcuts.map((s) => s.label));
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("documents the shortcuts the handler actually implements", () => {
    // A guard against the sheet drifting from useGlobalShortcuts. If a binding
    // is added/removed there, this list must move in lockstep.
    const labels = SHORTCUT_GROUPS.flatMap((g) => g.shortcuts.map((s) => s.label));
    expect(labels).toEqual(
      expect.arrayContaining([
        "Search across everything",
        "Open notifications",
        "This shortcut sheet",
        "Help & learning",
        "Undo",
        "Redo",
      ])
    );
  });
});

describe("renderKey", () => {
  it("resolves the platform modifier", () => {
    expect(renderKey("Mod", true)).toBe("⌘");
    expect(renderKey("Mod", false)).toBe("Ctrl");
    expect(renderKey("Shift", true)).toBe("⇧");
    expect(renderKey("Shift", false)).toBe("Shift");
  });

  it("passes plain keys through unchanged", () => {
    expect(renderKey("K", true)).toBe("K");
    expect(renderKey("?", false)).toBe("?");
    expect(renderKey("F1", true)).toBe("F1");
  });
});
