import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  hydrateDurableStore,
  getDoc,
  setDoc,
  deleteDoc,
  flushDurableStore,
  isDurableStoreReady,
  __resetDurableStoreForTests,
  reclaimableBytes,
  reclaimMigratedCopies,
} from "@/platform/lib/durableStore";

// The store talks to Tauri through a lazy `import("@tauri-apps/api/core")`,
// so the mock has to stand in for that module.
const invokeMock = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (cmd: string, args?: Record<string, unknown>) => invokeMock(cmd, args),
}));

/** The store decides Tauri vs browser by sniffing window; tests drive both. */
function setTauri(on: boolean) {
  if (on) (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {};
  else delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;
}

beforeEach(() => {
  __resetDurableStoreForTests();
  invokeMock.mockReset();
  localStorage.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  setTauri(false);
  vi.restoreAllMocks();
});

describe("hydration", () => {
  it("loads existing rows out of the database", async () => {
    setTauri(true);
    invokeMock.mockImplementation((cmd: string) =>
      cmd === "doc_get_all" ? Promise.resolve([["mf.songs", '[{"id":"a"}]']]) : Promise.resolve()
    );

    await hydrateDurableStore();

    expect(isDurableStoreReady()).toBe(true);
    expect(getDoc("mf.songs")).toBe('[{"id":"a"}]');
  });

  // The whole point of the migration: a user with existing productions in
  // localStorage must not open the app to an empty library.
  it("migrates pre-existing localStorage work into the database", async () => {
    setTauri(true);
    localStorage.setItem("mf.songs", '[{"id":"legacy-song"}]');
    invokeMock.mockImplementation((cmd: string) =>
      cmd === "doc_get_all" ? Promise.resolve([]) : Promise.resolve()
    );

    await hydrateDurableStore();

    expect(getDoc("mf.songs")).toBe('[{"id":"legacy-song"}]');
    expect(invokeMock).toHaveBeenCalledWith("doc_set", {
      key: "mf.songs",
      value: '[{"id":"legacy-song"}]',
    });
  });

  it("leaves the localStorage copy in place so a failed migration can retry", async () => {
    setTauri(true);
    localStorage.setItem("mf.songs", '[{"id":"legacy-song"}]');
    invokeMock.mockImplementation((cmd: string) =>
      cmd === "doc_get_all" ? Promise.resolve([]) : Promise.resolve()
    );

    await hydrateDurableStore();

    expect(localStorage.getItem("mf.songs")).toBe('[{"id":"legacy-song"}]');
  });

  it("keeps serving the user's work even when the database write fails", async () => {
    setTauri(true);
    localStorage.setItem("mf.songs", '[{"id":"legacy-song"}]');
    invokeMock.mockImplementation((cmd: string) =>
      cmd === "doc_get_all" ? Promise.resolve([]) : Promise.reject(new Error("db locked"))
    );

    await hydrateDurableStore();

    // Visible and editable this session rather than silently gone.
    expect(getDoc("mf.songs")).toBe('[{"id":"legacy-song"}]');
  });

  it("does not overwrite database rows with stale localStorage copies", async () => {
    setTauri(true);
    localStorage.setItem("mf.songs", '[{"id":"stale"}]');
    invokeMock.mockImplementation((cmd: string) =>
      cmd === "doc_get_all" ? Promise.resolve([["mf.songs", '[{"id":"fresh"}]']]) : Promise.resolve()
    );

    await hydrateDurableStore();

    expect(getDoc("mf.songs")).toBe('[{"id":"fresh"}]');
  });
});

describe("reads and writes", () => {
  it("reads back a write synchronously, before it is persisted", async () => {
    setTauri(true);
    invokeMock.mockResolvedValue([]);
    await hydrateDurableStore();

    setDoc("mf.songs", '[{"id":"new"}]');

    // No await: the sync contract the ~48 render-path call sites depend on.
    expect(getDoc("mf.songs")).toBe('[{"id":"new"}]');
  });

  it("coalesces rapid writes to one database round-trip", async () => {
    setTauri(true);
    invokeMock.mockResolvedValue([]);
    await hydrateDurableStore();
    invokeMock.mockClear();

    setDoc("mf.songs", "v1");
    setDoc("mf.songs", "v2");
    setDoc("mf.songs", "v3");
    await vi.advanceTimersByTimeAsync(300);

    const writes = invokeMock.mock.calls.filter(([cmd]) => cmd === "doc_set");
    expect(writes).toHaveLength(1);
    expect(writes[0][1]).toEqual({ key: "mf.songs", value: "v3" });
  });

  it("flushes a pending write on demand", async () => {
    setTauri(true);
    invokeMock.mockResolvedValue([]);
    await hydrateDurableStore();
    invokeMock.mockClear();

    setDoc("mf.cast", "pending");
    await flushDurableStore();

    expect(invokeMock).toHaveBeenCalledWith("doc_set", { key: "mf.cast", value: "pending" });
  });

  it("removes a document", async () => {
    setTauri(true);
    invokeMock.mockResolvedValue([]);
    await hydrateDurableStore();

    setDoc("mf.choreo", "x");
    deleteDoc("mf.choreo");

    expect(getDoc("mf.choreo")).toBeNull();
  });
});

describe("browser fallback (no Tauri)", () => {
  it("reads and writes localStorage instead of the database", async () => {
    setTauri(false);
    localStorage.setItem("mf.songs", '[{"id":"browser"}]');

    await hydrateDurableStore();
    expect(getDoc("mf.songs")).toBe('[{"id":"browser"}]');

    setDoc("mf.songs", '[{"id":"updated"}]');
    expect(localStorage.getItem("mf.songs")).toBe('[{"id":"updated"}]');
    expect(invokeMock).not.toHaveBeenCalled();
  });
});

describe("reclaiming migrated copies", () => {
  const value = '[{"id":"s1"}]';

  const hydrateWithLegacy = async () => {
    setTauri(true);
    localStorage.setItem("mf.songs", value);
    invokeMock.mockImplementation((cmd: string) =>
      cmd === "doc_get_all" ? Promise.resolve([]) : Promise.resolve()
    );
    await hydrateDurableStore();
  };

  // Migration leaves the originals behind on purpose, but once SQLite holds
  // them they keep the storage warning lit and push the user toward deleting
  // real productions to free space nothing needs.
  it("reports and releases a copy the database has taken over", async () => {
    await hydrateWithLegacy();

    expect(reclaimableBytes()).toBeGreaterThan(0);
    expect(reclaimMigratedCopies()).toBe(1);
    expect(localStorage.getItem("mf.songs")).toBeNull();
    expect(reclaimableBytes()).toBe(0);
  });

  // The database still serves it, so releasing the duplicate must not change
  // what the app reads.
  it("leaves the value readable after release", async () => {
    await hydrateWithLegacy();
    reclaimMigratedCopies();
    expect(getDoc("mf.songs")).toBe(value);
  });

  it("releases nothing before hydration", () => {
    setTauri(true);
    localStorage.setItem("mf.songs", value);
    expect(reclaimableBytes()).toBe(0);
    expect(reclaimMigratedCopies()).toBe(0);
    expect(localStorage.getItem("mf.songs")).toBe(value);
  });

  // Outside the desktop app localStorage is the only store, so these copies
  // are the originals, not duplicates.
  it("releases nothing when there is no database behind it", async () => {
    setTauri(false);
    localStorage.setItem("mf.songs", value);
    await hydrateDurableStore();
    expect(reclaimableBytes()).toBe(0);
    expect(reclaimMigratedCopies()).toBe(0);
    expect(localStorage.getItem("mf.songs")).toBe(value);
  });
});
