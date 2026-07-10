import { beforeEach, describe, expect, it } from "vitest";
import {
  clearPromptHistory,
  deletePromptHistory,
  describeEntry,
  listPromptHistory,
  recordPromptHistory,
  thumbForStorage,
  type PromptHistoryEntry,
} from "@/platform/lib/promptHistory";
import type { PromptPipeline } from "@/platform/lib/promptPipeline";

const pipeline = (muted = 0): PromptPipeline => ({
  layers: [
    { id: "dna", kind: "dna", label: "DNA", text: "a hero" },
    { id: "user", kind: "user", label: "You", text: "smiling", muted: muted > 0 },
  ],
});

const entry = (over: Partial<Omit<PromptHistoryEntry, "id" | "createdAt">> = {}) => ({
  prompt: "a hero. smiling.",
  pipeline: pipeline(),
  ...over,
});

const at = (iso: string) => new Date(iso);

describe("promptHistory", () => {
  beforeEach(() => localStorage.clear());

  it("records newest-first and returns what it stored", () => {
    recordPromptHistory(entry({ prompt: "first" }), at("2026-07-01T00:00:00Z"));
    recordPromptHistory(entry({ prompt: "second" }), at("2026-07-02T00:00:00Z"));
    expect(listPromptHistory().map((e) => e.prompt)).toEqual(["second", "first"]);
  });

  it("scopes by module and entity so a Bible entry sees only its own", () => {
    recordPromptHistory(entry({ moduleId: "glam", entityId: "g1", prompt: "glam" }));
    recordPromptHistory(entry({ moduleId: "musicvideo", entityId: "c1", prompt: "mv" }));
    expect(listPromptHistory({ moduleId: "glam" }).map((e) => e.prompt)).toEqual(["glam"]);
    expect(listPromptHistory({ entityId: "c1" }).map((e) => e.prompt)).toEqual(["mv"]);
    expect(listPromptHistory({ moduleId: "glam", entityId: "c1" })).toEqual([]);
    expect(listPromptHistory({ limit: 1 })).toHaveLength(1);
  });

  it("stores the full pipeline so a replay restores mutes, not just text", () => {
    recordPromptHistory(entry({ pipeline: pipeline(1) }));
    const [saved] = listPromptHistory();
    expect(saved.pipeline.layers[1].muted).toBe(true);
  });

  it("keeps a cheap thumbnail and drops an oversized inline one", () => {
    expect(thumbForStorage("C:/assets/hero.png")).toBe("C:/assets/hero.png");
    expect(thumbForStorage("data:image/png;base64,AAA")).toBe("data:image/png;base64,AAA");
    expect(thumbForStorage("data:image/png;base64," + "A".repeat(50_000))).toBeUndefined();
    expect(thumbForStorage(undefined)).toBeUndefined();
  });

  it("does not persist an oversized thumbnail through record()", () => {
    recordPromptHistory(entry({ thumbUrl: "data:image/png;base64," + "A".repeat(50_000) }));
    expect(listPromptHistory()[0].thumbUrl).toBeUndefined();
  });

  it("caps the log, keeping the newest", () => {
    for (let i = 0; i < 65; i += 1) recordPromptHistory(entry({ prompt: `p${i}` }));
    const all = listPromptHistory();
    expect(all).toHaveLength(60);
    expect(all[0].prompt).toBe("p64");
    expect(all.some((e) => e.prompt === "p0")).toBe(false);
  });

  it("deletes one entry and clears by scope", () => {
    const a = recordPromptHistory(entry({ moduleId: "glam", prompt: "a" }));
    recordPromptHistory(entry({ moduleId: "glam", prompt: "b" }));
    recordPromptHistory(entry({ moduleId: "web", prompt: "c" }));

    deletePromptHistory(a.id);
    expect(listPromptHistory().map((e) => e.prompt)).toEqual(["c", "b"]);

    clearPromptHistory({ moduleId: "glam" });
    expect(listPromptHistory().map((e) => e.prompt)).toEqual(["c"]);

    clearPromptHistory();
    expect(listPromptHistory()).toEqual([]);
  });

  it("describes an entry from what it actually contains", () => {
    expect(
      describeEntry({
        id: "1",
        createdAt: "",
        prompt: "x",
        pipeline: pipeline(1), // one layer muted -> one active
        modelId: "fal_flux_dev",
        seed: 42,
        referenceCount: 2,
      })
    ).toBe("1 layer · fal_flux_dev · seed 42 · 2 ref");

    expect(describeEntry({ id: "1", createdAt: "", prompt: "x", pipeline: pipeline() })).toBe(
      "2 layers"
    );
  });
});
