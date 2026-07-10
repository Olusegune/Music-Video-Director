import { beforeEach, describe, expect, it } from "vitest";
import {
  bundleFilename,
  collectAssetRefs,
  exportBundle,
  exportBundleWithAssets,
  importBundle,
  looksLikeAssetPath,
  parseBundle,
  summarizeAssets,
  ASSET_TOKEN_PREFIX,
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

// --- embedded assets -------------------------------------------------------

const PNG = "data:image/png;base64,";
/** A data URL whose decoded payload is roughly `bytes` long. */
const dataUrlOf = (bytes: number) => PNG + "A".repeat(Math.ceil((bytes * 4) / 3));

describe("asset detection", () => {
  it("recognizes local media paths and ignores everything else", () => {
    expect(looksLikeAssetPath("C:\\Users\\me\\assets\\hero.png")).toBe(true);
    expect(looksLikeAssetPath("/home/me/render.mp4")).toBe(true);
    // Not media, not a path, or already portable.
    expect(looksLikeAssetPath("https://cdn.example.com/a.png")).toBe(false);
    expect(looksLikeAssetPath("data:image/png;base64,AAA")).toBe(false);
    expect(looksLikeAssetPath("blob:abc")).toBe(false);
    expect(looksLikeAssetPath("hero.png")).toBe(false); // no directory
    expect(looksLikeAssetPath("/notes/readme.txt")).toBe(false);
    expect(looksLikeAssetPath("a cinematic hero shot")).toBe(false);
  });

  it("finds refs at any depth, deduplicated", () => {
    const refs = collectAssetRefs({
      a: "/x/one.png",
      b: [{ c: "/x/two.mp4" }, "/x/one.png"],
      d: { e: { f: "https://skip.me/a.png" } },
    });
    expect(refs.sort()).toEqual(["/x/one.png", "/x/two.mp4"]);
  });
});

describe("bundles with embedded media", () => {
  beforeEach(() => {
    localStorage.clear();
    clearProjectAdapters();
  });

  const withMedia = () =>
    mod("glam", [
      {
        id: "g1",
        name: "Hero",
        body: "v1",
        // deliberately nested, to prove the walk is shape-agnostic
        heroAssets: [{ url: "/assets/hero.png" }],
      } as unknown as Rec,
    ]);

  it("embeds media, tokenizes records, and restores on import", async () => {
    withMedia();
    const bundle = (await exportBundleWithAssets("glam", "g1", {
      resolve: async () => dataUrlOf(1000),
    }))!;

    // The path is gone from the record; a token stands in its place.
    const text = JSON.stringify(bundle.projects[0].record);
    expect(text).not.toContain("/assets/hero.png");
    expect(text).toContain(ASSET_TOKEN_PREFIX);
    expect(bundle.assets).toHaveLength(1);
    expect(bundle.assets![0].originalRef).toBe("/assets/hero.png");
    expect(summarizeAssets(bundle)).toMatchObject({ embedded: 1, omitted: 0 });

    // Fresh workspace: the media arrives inline, not as a dead path.
    clearProjectAdapters();
    const glam2 = mod("glam");
    importBundle(parseBundle(JSON.stringify(bundle)));
    const landed = glam2.get("g1") as unknown as { heroAssets: { url: string }[] };
    expect(landed.heroAssets[0].url.startsWith("data:image/png")).toBe(true);
  });

  it("skips assets over the per-asset cap and keeps their original path", async () => {
    withMedia();
    const bundle = (await exportBundleWithAssets("glam", "g1", {
      resolve: async () => dataUrlOf(5000),
      perAssetMaxBytes: 1000,
    }))!;
    expect(bundle.assets![0]).toMatchObject({ omitted: "too-large" });
    expect(bundle.assets![0].dataUrl).toBeUndefined();
    expect(summarizeAssets(bundle)).toMatchObject({ embedded: 0, omitted: 1 });

    clearProjectAdapters();
    const glam2 = mod("glam");
    importBundle(parseBundle(JSON.stringify(bundle)));
    const landed = glam2.get("g1") as unknown as { heroAssets: { url: string }[] };
    // Falls back to the original path rather than leaving a dangling token.
    expect(landed.heroAssets[0].url).toBe("/assets/hero.png");
  });

  it("stops embedding once the whole-bundle budget is spent", async () => {
    mod("glam", [
      {
        id: "g1",
        name: "Hero",
        body: "v1",
        shots: ["/a/one.png", "/a/two.png", "/a/three.png"],
      } as unknown as Rec,
    ]);
    const bundle = (await exportBundleWithAssets("glam", "g1", {
      resolve: async () => dataUrlOf(1000),
      totalMaxBytes: 2500,
    }))!;
    const reasons = bundle.assets!.map((a) => a.omitted ?? "embedded");
    expect(reasons).toEqual(["embedded", "embedded", "budget-exceeded"]);
  });

  it("marks unreadable media instead of failing the whole export", async () => {
    withMedia();
    const bundle = (await exportBundleWithAssets("glam", "g1", {
      resolve: async () => {
        throw new Error("file vanished");
      },
    }))!;
    expect(bundle.assets![0].omitted).toBe("unreadable");
    expect(bundle.projects).toHaveLength(1); // export still succeeded
  });

  it("a records-only bundle (no assets field) still imports", () => {
    mod("glam", [{ id: "g1", name: "Hero", body: "v1" }]);
    const legacy = exportBundle("glam", "g1")!;
    expect(legacy.assets).toBeUndefined();
    clearProjectAdapters();
    const glam2 = mod("glam");
    const result = importBundle(parseBundle(JSON.stringify(legacy)));
    expect(result.imported).toHaveLength(1);
    expect(glam2.get("g1")?.body).toBe("v1");
  });
});
