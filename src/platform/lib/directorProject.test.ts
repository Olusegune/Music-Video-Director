import { beforeEach, describe, expect, it } from "vitest";
import {
  addMember,
  deleteDirectorProject,
  detachProject,
  ensureDirectorProject,
  getDirectorProject,
  listDirectorProjects,
  removeMember,
  umbrellaFor,
} from "@/platform/lib/directorProject";
import {
  clearProjectAdapters,
  deleteProject,
  registerProjectAdapter,
} from "@/platform/lib/projectHub";

describe("DirectorProject umbrella", () => {
  beforeEach(() => {
    localStorage.clear();
    clearProjectAdapters();
  });

  it("ensure creates once and is idempotent, refreshing name and brand", () => {
    ensureDirectorProject({ id: "c1", name: "Launch", brandDnaId: "b1" });
    ensureDirectorProject({ id: "c1", name: "Launch v2" });
    const all = listDirectorProjects();
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe("Launch v2");
    // An omitted brand must not wipe the existing one.
    expect(all[0].brandDnaId).toBe("b1");
  });

  it("holds members from many studios and finds the umbrella for each", () => {
    ensureDirectorProject({
      id: "c1",
      name: "Launch",
      members: [{ moduleId: "campaign", projectId: "c1", role: "orchestrator" }],
    });
    addMember("c1", { moduleId: "glam", projectId: "g1", role: "hero" });
    addMember("c1", { moduleId: "web", projectId: "w1", role: "landing-page" });

    expect(getDirectorProject("c1")?.members).toHaveLength(3);
    expect(umbrellaFor("glam", "g1")?.id).toBe("c1");
    expect(umbrellaFor("web", "w1")?.name).toBe("Launch");
    expect(umbrellaFor("motion", "m1")).toBeNull();
  });

  it("re-adding the same project updates its role instead of duplicating it", () => {
    ensureDirectorProject({ id: "c1", name: "Launch" });
    addMember("c1", { moduleId: "glam", projectId: "g1", role: "hero" });
    addMember("c1", { moduleId: "glam", projectId: "g1", role: "social" });
    const members = getDirectorProject("c1")!.members;
    expect(members).toHaveLength(1);
    expect(members[0].role).toBe("social");
  });

  it("addMember on a missing umbrella is a no-op, not a crash", () => {
    expect(addMember("nope", { moduleId: "glam", projectId: "g1" })).toBeNull();
    expect(listDirectorProjects()).toEqual([]);
  });

  it("removeMember and detachProject drop membership", () => {
    ensureDirectorProject({ id: "c1", name: "Launch" });
    addMember("c1", { moduleId: "glam", projectId: "g1" });
    removeMember("c1", { moduleId: "glam", projectId: "g1" });
    expect(umbrellaFor("glam", "g1")).toBeNull();

    addMember("c1", { moduleId: "web", projectId: "w1" });
    detachProject("web", "w1");
    expect(umbrellaFor("web", "w1")).toBeNull();
    // The umbrella itself survives losing its members.
    expect(getDirectorProject("c1")).not.toBeNull();
  });

  it("deleting a project through the hub detaches it from its umbrella", () => {
    ensureDirectorProject({ id: "c1", name: "Launch" });
    addMember("c1", { moduleId: "glam", projectId: "g1", role: "hero" });
    registerProjectAdapter({
      moduleId: "glam",
      label: "Glam Studio",
      list: () => [],
      remove: () => undefined,
    });

    expect(umbrellaFor("glam", "g1")?.id).toBe("c1");
    expect(deleteProject("glam", "g1")).toBe(true);
    expect(umbrellaFor("glam", "g1")).toBeNull();
  });

  it("deleting the umbrella leaves member projects untouched", () => {
    ensureDirectorProject({ id: "c1", name: "Launch" });
    addMember("c1", { moduleId: "glam", projectId: "g1" });
    deleteDirectorProject("c1");
    expect(listDirectorProjects()).toEqual([]);
    expect(umbrellaFor("glam", "g1")).toBeNull();
  });
});
