import { beforeEach, describe, expect, it, vi } from "vitest";
import { createVersionedStorage } from "@/platform/lib/storage";

describe("versioned local storage", () => {
  beforeEach(() => localStorage.clear());

  it("writes a namespaced schema envelope", () => {
    const storage = createVersionedStorage({
      namespace: "test",
      key: "projects",
      version: 2,
      fallback: () => [] as string[],
    });

    expect(storage.write(["Director Studio"])).toBe(true);
    expect(JSON.parse(localStorage.getItem(storage.storageKey) ?? "")).toEqual({
      schemaVersion: 2,
      data: ["Director Studio"],
    });
  });

  it("migrates legacy unversioned keys and removes the old key", () => {
    localStorage.setItem("mf.legacy.projects", JSON.stringify(["legacy"]));
    const storage = createVersionedStorage({
      namespace: "test",
      key: "projects",
      version: 1,
      fallback: () => [] as string[],
      legacyKeys: ["mf.legacy.projects"],
      migrate: (data) => [...(data as string[]), "migrated"],
    });

    expect(storage.read()).toEqual(["legacy", "migrated"]);
    expect(localStorage.getItem("mf.legacy.projects")).toBeNull();
  });

  it("surfaces corrupt JSON and returns the fallback", () => {
    const onToast = vi.fn();
    window.addEventListener("mf-toast", onToast);
    const storage = createVersionedStorage({
      namespace: "test",
      key: "broken",
      version: 1,
      fallback: () => ["safe"],
    });
    localStorage.setItem(storage.storageKey, "{not-json");

    expect(storage.read()).toEqual(["safe"]);
    expect(onToast).toHaveBeenCalledOnce();
    window.removeEventListener("mf-toast", onToast);
  });
});
