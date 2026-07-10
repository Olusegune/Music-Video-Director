import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  clearProjectAdapters,
  deleteProject,
  deleteProjectVersion,
  duplicateProject,
  listAllProjects,
  listProjectVersions,
  projectCapabilities,
  projectsForModule,
  recentProjects,
  registerProjectAdapter,
  renameProject,
  restoreProjectVersion,
  snapshotProject,
  suggestCopyName,
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

/** A writable in-memory module so hub mutations can be asserted end to end. */
function fakeGlam(initial: HubProject[]) {
  const store = new Map(initial.map((p) => [p.id, { ...p }]));
  registerProjectAdapter({
    moduleId: "glam",
    label: "Glam Studio",
    list: () => [...store.values()],
    duplicate: (id, newName) => {
      const source = store.get(id);
      if (!source) return null;
      const copy = { ...source, id: `${id}-copy`, name: newName };
      store.set(copy.id, copy);
      return copy.id;
    },
    rename: (id, name) => {
      const source = store.get(id);
      if (source) store.set(id, { ...source, name });
    },
    remove: (id) => void store.delete(id),
  });
  return store;
}

const glamProject = (id: string, name: string): HubProject => ({
  moduleId: "glam",
  id,
  name,
  updatedAt: "2026-07-01T00:00:00Z",
});

describe("suggestCopyName", () => {
  it("appends 'copy', then numbers, and never stacks suffixes", () => {
    expect(suggestCopyName("Launch Film", [])).toBe("Launch Film copy");
    expect(suggestCopyName("Launch Film", ["Launch Film copy"])).toBe("Launch Film copy 2");
    expect(suggestCopyName("Launch Film", ["Launch Film copy", "Launch Film copy 2"])).toBe(
      "Launch Film copy 3"
    );
    // Duplicating a duplicate must not yield "X copy copy".
    expect(suggestCopyName("Launch Film copy", ["Launch Film copy"])).toBe("Launch Film copy 2");
    expect(suggestCopyName("", [])).toBe("Untitled copy");
  });
});

describe("projectHub mutations", () => {
  it("reports capabilities from what each adapter implements", () => {
    registerProjectAdapter({ moduleId: "web", label: "Web Studio", list: () => [] });
    expect(projectCapabilities("web")).toEqual({
      duplicate: false,
      rename: false,
      remove: false,
      versioning: false,
    });
    fakeGlam([]);
    expect(projectCapabilities("glam")).toEqual({
      duplicate: true,
      rename: true,
      remove: true,
      versioning: false,
    });
  });

  it("duplicates under an auto-generated copy name, leaving the original intact", () => {
    const store = fakeGlam([glamProject("g1", "Launch Film")]);
    expect(duplicateProject("glam", "g1")).toBe("g1-copy");
    expect(store.get("g1-copy")?.name).toBe("Launch Film copy");
    expect(store.get("g1")?.name).toBe("Launch Film");
  });

  it("duplicate honors an explicit name and trims it", () => {
    const store = fakeGlam([glamProject("g1", "Hero")]);
    expect(duplicateProject("glam", "g1", "  Custom Name  ")).toBe("g1-copy");
    expect(store.get("g1-copy")?.name).toBe("Custom Name");
  });

  it("renames with trimming and rejects an empty name", () => {
    const store = fakeGlam([glamProject("g1", "Old")]);
    expect(renameProject("glam", "g1", "  New Name  ")).toBe(true);
    expect(store.get("g1")?.name).toBe("New Name");
    expect(renameProject("glam", "g1", "   ")).toBe(false);
    expect(store.get("g1")?.name).toBe("New Name");
  });

  it("deletes a project", () => {
    const store = fakeGlam([glamProject("g1", "Gone")]);
    expect(deleteProject("glam", "g1")).toBe(true);
    expect(store.has("g1")).toBe(false);
  });

  it("is a safe no-op for modules that do not implement a mutation", () => {
    registerProjectAdapter({ moduleId: "web", label: "Web Studio", list: () => [] });
    expect(duplicateProject("web", "x")).toBeNull();
    expect(renameProject("web", "x", "y")).toBe(false);
    expect(deleteProject("web", "x")).toBe(false);
  });

  it("a throwing adapter never propagates out of the hub", () => {
    registerProjectAdapter({
      moduleId: "motion",
      label: "Motion Studio",
      list: () => [],
      duplicate: () => {
        throw new Error("store exploded");
      },
      remove: () => {
        throw new Error("store exploded");
      },
    });
    expect(duplicateProject("motion", "x")).toBeNull();
    expect(deleteProject("motion", "x")).toBe(false);
  });
});

/** A generic module: exposes read/write, so the hub versions it for free. */
function genericModule(record: { id: string; name: string; body: string }) {
  const store = new Map([[record.id, { ...record }]]);
  registerProjectAdapter({
    moduleId: "glam",
    label: "Glam Studio",
    list: () => [...store.values()].map((p) => ({ ...glamProject(p.id, p.name) })),
    remove: (id) => void store.delete(id),
    read: (id) => store.get(id) ?? null,
    write: (rec) => {
      const typed = rec as { id: string; name: string; body: string };
      store.set(typed.id, { ...typed });
    },
  });
  return store;
}

describe("projectHub version history", () => {
  beforeEach(() => localStorage.clear());

  it("generic modules get versioning from read/write alone", () => {
    genericModule({ id: "g1", name: "Hero", body: "v1" });
    expect(projectCapabilities("glam").versioning).toBe(true);
    expect(listProjectVersions("glam", "g1")).toEqual([]);

    const versionId = snapshotProject("glam", "g1", "First cut");
    expect(versionId).toBeTruthy();
    const versions = listProjectVersions("glam", "g1");
    expect(versions).toHaveLength(1);
    expect(versions[0].label).toBe("First cut");
  });

  it("restores the snapshotted payload, and the restore is itself undoable", () => {
    const store = genericModule({ id: "g1", name: "Hero", body: "v1" });
    snapshotProject("glam", "g1", "First cut");

    // Move the project forward, then roll back.
    store.set("g1", { id: "g1", name: "Hero", body: "v2" });
    const versionId = listProjectVersions("glam", "g1")[0].id;
    expect(restoreProjectVersion("glam", "g1", versionId)).toBe(true);
    expect(store.get("g1")?.body).toBe("v1");

    // The pre-restore state was captured, so the rollback can be rolled back.
    const labels = listProjectVersions("glam", "g1").map((v) => v.label);
    expect(labels).toContain("Before restore");
    const beforeRestore = listProjectVersions("glam", "g1").find(
      (v) => v.label === "Before restore"
    )!;
    expect(restoreProjectVersion("glam", "g1", beforeRestore.id)).toBe(true);
    expect(store.get("g1")?.body).toBe("v2");
  });

  it("deleting a project drops its version history", () => {
    genericModule({ id: "g1", name: "Hero", body: "v1" });
    snapshotProject("glam", "g1", "First cut");
    expect(listProjectVersions("glam", "g1")).toHaveLength(1);
    expect(deleteProject("glam", "g1")).toBe(true);
    expect(listProjectVersions("glam", "g1")).toEqual([]);
  });

  it("a module with a native version system is delegated to, not duplicated", () => {
    const calls: string[] = [];
    registerProjectAdapter({
      moduleId: "motion",
      label: "Motion Studio",
      list: () => [],
      versions: () => {
        calls.push("versions");
        return [{ id: "v1", label: "Native", createdAt: "2026-07-01T00:00:00Z" }];
      },
      snapshot: (_id, label) => {
        calls.push(`snapshot:${label}`);
        return "v2";
      },
      restore: () => {
        calls.push("restore");
        return true;
      },
    });

    expect(projectCapabilities("motion").versioning).toBe(true);
    expect(listProjectVersions("motion", "m1")[0].label).toBe("Native");
    expect(snapshotProject("motion", "m1", "Manual")).toBe("v2");
    expect(restoreProjectVersion("motion", "m1", "v1")).toBe(true);
    // A native restore still snapshots the current state first.
    expect(calls).toContain("snapshot:Before restore");
    expect(calls).toContain("restore");
    // Generic history was never touched for this module.
    expect(deleteProjectVersion("motion", "m1", "v1")).toBe(false);
  });

  it("modules without read/write or the native trio cannot version", () => {
    registerProjectAdapter({ moduleId: "web", label: "Web Studio", list: () => [] });
    expect(projectCapabilities("web").versioning).toBe(false);
    expect(snapshotProject("web", "w1", "x")).toBeNull();
    expect(restoreProjectVersion("web", "w1", "v1")).toBe(false);
    expect(listProjectVersions("web", "w1")).toEqual([]);
  });

  it("restoring a missing version fails without mutating the project", () => {
    const store = genericModule({ id: "g1", name: "Hero", body: "v1" });
    expect(restoreProjectVersion("glam", "g1", "nope")).toBe(false);
    expect(store.get("g1")?.body).toBe("v1");
  });
});
