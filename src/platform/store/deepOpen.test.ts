import { beforeEach, describe, expect, it } from "vitest";
import { useAppStore } from "@/platform/store/useAppStore";

// Slice-2 deep-open signal: openModuleProject + consumePendingProjectOpen.
describe("Project Hub deep-open signal", () => {
  beforeEach(() => useAppStore.setState({ pendingProjectOpen: null }));

  it("routes a non-MV module to its home view and stashes the pending project", () => {
    useAppStore.getState().openModuleProject("web", "w-1");
    expect(useAppStore.getState().view).toBe("webstudio");
    expect(useAppStore.getState().pendingProjectOpen).toEqual({
      moduleId: "web",
      projectId: "w-1",
    });
  });

  it("consume returns the id and clears it, but only for the matching module", () => {
    useAppStore.getState().openModuleProject("glam", "g-1");
    // A different module must not consume another module's pending open.
    expect(useAppStore.getState().consumePendingProjectOpen("motion")).toBeNull();
    expect(useAppStore.getState().pendingProjectOpen).not.toBeNull();
    // The owning module consumes it once.
    expect(useAppStore.getState().consumePendingProjectOpen("glam")).toBe("g-1");
    expect(useAppStore.getState().pendingProjectOpen).toBeNull();
    expect(useAppStore.getState().consumePendingProjectOpen("glam")).toBeNull();
  });

  it("Music Video selects the active song directly and needs no pending signal", () => {
    useAppStore.getState().openModuleProject("musicvideo", "song-1");
    expect(useAppStore.getState().view).toBe("song");
    expect(useAppStore.getState().activeSongId).toBe("song-1");
    expect(useAppStore.getState().pendingProjectOpen).toBeNull();
  });
});
