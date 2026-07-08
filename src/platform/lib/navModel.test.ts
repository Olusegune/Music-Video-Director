import { describe, expect, it } from "vitest";
import { NAV_MODEL, VIEW_MODULE } from "@/platform/lib/navModel";
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
      "cast",
      "choreography",
      "timeline",
    ]);
    expect(topLevelViews).not.toContain("cast");
    expect(topLevelViews).not.toContain("choreography");
    expect(topLevelViews).not.toContain("timeline");
  });
});
