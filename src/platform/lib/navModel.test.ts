import { describe, expect, it } from "vitest";
import { NAV_MODEL, VIEW_MODULE } from "@/platform/lib/navModel";
import { MODULE_MANIFESTS } from "@/platform/lib/moduleManifest";
import type { View } from "@/platform/store/useAppStore";

const ALL_VIEWS: View[] = [
  "song",
  "mvdirector",
  "magicoutput",
  "cast",
  "choreography",
  "timeline",
  "templates",
  "help",
  "dashboard",
  "project",
  "settings",
  "brandkits",
  "assets",
  "characters",
  "world",
  "props",
  "scripts",
  "animation",
  "export",
  "apikeys",
  "models",
  "motionstudio",
  "glamstudio",
  "webstudio",
  "campaignstudio",
];

describe("navigation model", () => {
  it("maps every app view to a module owner", () => {
    expect(Object.keys(VIEW_MODULE).sort()).toEqual([...ALL_VIEWS].sort());
  });

  it("keeps Music Video workflow views under the Music Video module", () => {
    expect(VIEW_MODULE.song).toBe("musicvideo");
    expect(VIEW_MODULE.mvdirector).toBe("musicvideo");
    expect(VIEW_MODULE.magicoutput).toBe("musicvideo");
    expect(VIEW_MODULE.cast).toBe("musicvideo");
    expect(VIEW_MODULE.choreography).toBe("musicvideo");
    expect(VIEW_MODULE.timeline).toBe("musicvideo");
  });

  it("lists Music Video subviews only as children of the studio door", () => {
    const studios = NAV_MODEL.find((section) => section.id === "studios");
    const musicVideo = studios?.items.find((item) => item.id === "musicvideo");
    const topLevelViews = NAV_MODEL.flatMap((section) => section.items.map((item) => item.view));

    expect(musicVideo?.subItems?.map((item) => item.view)).toEqual([
      "song",
      "mvdirector",
      "templates",
      "cast",
      "choreography",
      "timeline",
      "animation",
    ]);
    expect(topLevelViews).not.toContain("cast");
    expect(topLevelViews).not.toContain("choreography");
    expect(topLevelViews).not.toContain("timeline");
  });

  it("derives the studio nav doors from the module manifests", () => {
    const studios = NAV_MODEL.find((section) => section.id === "studios");
    const doorIds = studios?.items.map((item) => item.id) ?? [];
    // Every manifest has exactly one studio door, in manifest order.
    expect(doorIds).toEqual(MODULE_MANIFESTS.map((m) => m.id));
    for (const manifest of MODULE_MANIFESTS) {
      const door = studios?.items.find((item) => item.id === manifest.id);
      expect(door?.view).toBe(manifest.homeView);
      expect(door?.label).toBe(manifest.label);
      expect(door?.moduleId).toBe(manifest.id);
    }
  });

  it("places Script Studio in Production Library, not Tools", () => {
    const library = NAV_MODEL.find((section) => section.id === "library");
    const tools = NAV_MODEL.find((section) => section.id === "tools");

    expect(library?.items.map((item) => item.view)).toContain("scripts");
    expect(tools?.items.map((item) => item.view)).not.toContain("scripts");
    expect(VIEW_MODULE.scripts).toBeNull();
  });
});
