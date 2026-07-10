import { beforeEach, describe, expect, it } from "vitest";
import {
  bundleFilename,
  exportBundle,
  importBundle,
  parseBundle,
  BUNDLE_FORMAT,
} from "@/platform/lib/projectBundle";
import { clearProjectAdapters, registerProjectAdapter } from "@/platform/lib/projectHub";
import { addMember, ensureDirectorProject, umbrellaFor } from "@/platform/lib/directorProject";
import { createDeliverable, listDeliverables } from "@/platform/lib/deliverables";

interface Rec {
  id: string;
  name: string;
  body: string;
}

/** Register a writable in-memory module. */
function mod(moduleId: "glam" | "web" | "campaign", seed: Rec[] = []) {
  const store = new Map(seed.map((r) => [r.id, { ...r }]));
  registerProjectAdapter({
    moduleId,
    label: moduleId,
    list: () =>
      [...store.values()].map((r) => ({
        moduleId,
        id: r.id,
        name: r.name,
        updatedAt: "2026-07-01T00:00:00Z",
      })),
    read: (id) => store.get(id) ?? null,
    write: (record) => {
      const typed = record as Rec;
      store.set(typed.id, { ...typed });
    },
  });
  return store;
}

describe("project bundles (.dsproj)", () => {
  beforeEach(() => {
    localStorage.clear();
    clearProjectAdapters();
  });

  it("exports a lone project when it has no umbrella", () => {
    mod("glam", [{ id: "g1", name: "Hero", body: "v1" }]);
    const bundle = exportBundle("glam", "g1", "1.1.0")!;
    expect(bundle.format).toBe(BUNDLE_FORMAT);
    expect(bundle.appVersion).toBe("1.1.0");
    expect(bundle.projects).toHaveLength(1);
    expect(bundle.projects[0].record).toMatchObject({ id: "g1", body: "v1" });
    expect(bundle.umbrella).toBeUndefined();
  });

  it("exporting any member pulls the whole umbrella with it", () => {
    mod("glam", [{ id: "g1", name: "Hero", body: "v1" }]);
    mod("web", [{ id: "w1", name: "Landing", body: "site" }]);
    mod("campaign", [{ id: "c1", name: "Aurora", body: "plan" }]);
    ensureDirectorProject({
      id: "c1",
      name: "Aurora",
      members: [{ moduleId: "campaign", projectId: "c1", role: "orchestrator" }],
    });
    addMember("c1", { moduleId: "glam", projectId: "g1", role: "hero" });
    addMember("c1", { moduleId: "web", projectId: "w1", role: "landing-page" });

    // Exporting the Glam member alone still yields the campaign and the site.
    const bundle = exportBundle("glam", "g1")!;
    expect(bundle.umbrella?.name).toBe("Aurora");
    expect(bundle.projects.map((p) => p.projectId).sort()).toEqual(["c1", "g1", "w1"]);
    expect(bundleFilename(bundle)).toBe("aurora.dsproj");
  });

  it("carries only the deliverables of the bundled projects", () => {
    mod("glam", [{ id: "g1", name: "Hero", body: "v1" }]);
    mod("web", [{ id: "w1", name: "Landing", body: "site" }]);
    createDeliverable({
      moduleId: "glam",
      projectId: "g1",
      kind: "hero",
      format: "png",
      status: "approved",
      title: "Hero shot",
      assetRefs: [],
    });
    createDeliverable({
      moduleId: "web",
      projectId: "w1",
      kind: "site",
      format: "zip",
      status: "draft",
      title: "Site",
      assetRefs: [],
    });

    const bundle = exportBundle("glam", "g1")!;
    expect(bundle.deliverables).toHaveLength(1);
    expect(bundle.deliverables[0].title).toBe("Hero shot");
  });

  it("round-trips into an empty workspace, umbrella and deliverables included", () => {
    const glam = mod("glam", [{ id: "g1", name: "Hero", body: "v1" }]);
    mod("campaign", [{ id: "c1", name: "Aurora", body: "plan" }]);
    ensureDirectorProject({
      id: "c1",
      name: "Aurora",
      members: [{ moduleId: "campaign", projectId: "c1" }],
    });
    addMember("c1", { moduleId: "glam", projectId: "g1", role: "hero" });
    createDeliverable({
      moduleId: "glam",
      projectId: "g1",
      kind: "hero",
      format: "png",
      status: "approved",
      title: "Hero shot",
      assetRefs: [],
    });
    const text = JSON.stringify(exportBundle("glam", "g1"));

    // Fresh workspace: same modules, empty stores, no umbrella, no deliverables.
    localStorage.clear();
    clearProjectAdapters();
    const glam2 = mod("glam");
    mod("campaign");

    const result = importBundle(parseBundle(text));
    expect(result.imported.map((r) => r.projectId).sort()).toEqual(["c1", "g1"]);
    expect(result.skipped).toEqual([]);
    expect(result.umbrellaName).toBe("Aurora");
    expect(glam2.get("g1")).toMatchObject({ body: "v1" });
    expect(umbrellaFor("glam", "g1")?.name).toBe("Aurora");
    expect(listDeliverables({ moduleId: "glam", projectId: "g1" })).toHaveLength(1);
    // The original store is untouched by the round trip.
    expect(glam.get("g1")?.body).toBe("v1");
  });

  it("re-importing into the same workspace skips rather than overwrites", () => {
    const glam = mod("glam", [{ id: "g1", name: "Hero", body: "original" }]);
    const text = JSON.stringify(exportBundle("glam", "g1"));

    // Local edit, then re-import the older bundle.
    glam.set("g1", { id: "g1", name: "Hero", body: "edited" });
    const result = importBundle(parseBundle(text));

    expect(result.imported).toEqual([]);
    expect(result.skipped.map((r) => r.projectId)).toEqual(["g1"]);
    // The local edit survives — an import never clobbers existing work.
    expect(glam.get("g1")?.body).toBe("edited");
  });

  it("reports modules that cannot accept a record", () => {
    mod("glam", [{ id: "g1", name: "Hero", body: "v1" }]);
    const text = JSON.stringify(exportBundle("glam", "g1"));

    clearProjectAdapters();
    // Web is registered read-only: it can list but not write.
    registerProjectAdapter({ moduleId: "glam", label: "glam", list: () => [] });

    const result = importBundle(parseBundle(text));
    expect(result.imported).toEqual([]);
    expect(result.failed.map((r) => r.projectId)).toEqual(["g1"]);
  });

  it("rejects junk, foreign, and future-format files with readable errors", () => {
    expect(() => parseBundle("not json")).toThrow(/not valid JSON/i);
    expect(() => parseBundle(JSON.stringify({ format: "something-else" }))).toThrow(
      /not a Director Studio project bundle/i
    );
    expect(() =>
      parseBundle(JSON.stringify({ format: BUNDLE_FORMAT, formatVersion: 99, projects: [{}] }))
    ).toThrow(/newer Director Studio/i);
    expect(() =>
      parseBundle(JSON.stringify({ format: BUNDLE_FORMAT, formatVersion: 1, projects: [] }))
    ).toThrow(/no projects/i);
    expect(() =>
      parseBundle(
        JSON.stringify({
          format: BUNDLE_FORMAT,
          formatVersion: 1,
          projects: [{ moduleId: "glam" }],
        })
      )
    ).toThrow(/missing project data/i);
  });

  it("exporting an unknown or unserializable project returns null", () => {
    registerProjectAdapter({ moduleId: "glam", label: "glam", list: () => [] });
    expect(exportBundle("glam", "nope")).toBeNull();
  });
});
