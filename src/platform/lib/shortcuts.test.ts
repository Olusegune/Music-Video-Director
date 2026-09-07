import { describe, expect, it } from "vitest";
import { SHORTCUT_GROUPS, renderKey } from "@/platform/lib/shortcuts";
import { NAV_MODEL } from "@/platform/lib/navModel";

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

  it("has a Ctrl+N shortcut for every Music Video sidebar stage", () => {
    // Regression guard: Story, Templates, and Animation Lab were added to
    // the sidebar but Ctrl+1..5 (and the "?" sheet) weren't extended to
    // cover them, so three real sidebar screens had no keyboard shortcut at
    // all. This fails again if a stage is ever added to STUDIO_SUB_ITEMS
    // without a matching entry in the "Music Video stages" shortcut group.
    const musicVideoStudio = NAV_MODEL[0].items.find((item) => item.id === "musicvideo");
    const stageLabels = (musicVideoStudio?.subItems ?? []).map((item) => item.label);
    expect(stageLabels.length).toBeGreaterThan(0);

    const documented = SHORTCUT_GROUPS.find((g) => g.title === "Music Video stages")?.shortcuts ?? [];
    const documentedLabels = documented.map((s) => s.label);
    expect(documentedLabels).toEqual(expect.arrayContaining(stageLabels));
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
