import { afterEach, describe, expect, it } from "vitest";
import {
  clearProjectAdapters,
  listAllProjects,
  projectsForModule,
  recentProjects,
  registerProjectAdapter,
  type HubProject,
} from "@/platform/lib/projectHub";

function fixtures(): void {
  registerProjectAdapter({
    moduleId: "glam",
    label: "Glam Studio",
    list: (): HubProject[] => [
      { moduleId: "glam", id: "g1", name: "Perfume", updatedAt: "2026-07-05T10:00:00Z" },
      { moduleId: "glam", id: "g2", name: "Watch", updatedAt: "2026-07-09T10:00:00Z" },
    ],
  });
  registerProjectAdapter({
    moduleId: "web",
    label: "Web Studio",
    list: (): HubProject[] => [
      { moduleId: "web", id: "w1", name: "Landing", updatedAt: "2026-07-08T10:00:00Z" },
    ],
  });
}

afterEach(() => clearProjectAdapters());

describe("projectHub", () => {
  it("merges projects across modules newest-first", () => {
    fixtures();
    expect(listAllProjects().map((p) => p.id)).toEqual(["g2", "w1", "g1"]);
  });

  it("recentProjects limits the merged list", () => {
    fixtures();
    expect(recentProjects(2).map((p) => p.id)).toEqual(["g2", "w1"]);
  });

  it("projectsForModule returns only that module, newest-first", () => {
    fixtures();
    expect(projectsForModule("glam").map((p) => p.id)).toEqual(["g2", "g1"]);
    expect(projectsForModule("motion")).toEqual([]);
  });

  it("a throwing adapter does not break the merged view", () => {
    fixtures();
    registerProjectAdapter({
      moduleId: "motion",
      label: "Motion Studio",
      list: () => {
        throw new Error("corrupt store");
      },
    });
    expect(listAllProjects().map((p) => p.id)).toEqual(["g2", "w1", "g1"]);
  });
});
