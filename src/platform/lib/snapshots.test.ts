import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  snapshot,
  loadSnapshots,
  restoreSnapshot,
  deleteSnapshot,
  latestSnapshot,
} from "@/platform/lib/snapshots";
import {
  hydrateDurableStore,
  getDoc,
  setDoc,
  __resetDurableStoreForTests,
} from "@/platform/lib/durableStore";

// Crash recovery had no tests at all, which is how the SQLite migration
// silently cut it: songs, treatments, choreography and cast moved into the
// database while snapshot/restore kept reading and writing localStorage, so
// "Restore snapshot" cleared keys nobody reads and restored nothing the app
// would ever load.

const invokeMock = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (cmd: string, args?: Record<string, unknown>) => invokeMock(cmd, args),
}));

function setTauri(on: boolean) {
  if (on) (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {};
  else delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;
}

beforeEach(async () => {
  __resetDurableStoreForTests();
  invokeMock.mockReset();
  localStorage.clear();
  setTauri(true);
  invokeMock.mockImplementation((cmd: string) =>
    cmd === "doc_get_all" ? Promise.resolve([]) : Promise.resolve()
  );
  await hydrateDurableStore();
});

afterEach(() => {
  setTauri(false);
  vi.restoreAllMocks();
});

describe("snapshot capture", () => {
  it("captures durable data from the database, not a stale localStorage copy", () => {
    setDoc("mf.songs", '[{"id":"current"}]');
    localStorage.setItem("mf.songs", '[{"id":"stale"}]');

    const snap = snapshot("test", 1000);
    expect(snap?.data["mf.songs"]).toBe('[{"id":"current"}]');
  });

  it("still captures keys that only live in localStorage", () => {
    localStorage.setItem("mf.scripts", '[{"id":"s1"}]');
    const snap = snapshot("test", 1000);
    expect(snap?.data["mf.scripts"]).toBe('[{"id":"s1"}]');
  });

  it("never snapshots the snapshot list itself", () => {
    setDoc("mf.songs", "[]");
    const snap = snapshot("test", 1000);
    expect(snap?.data["mf.snapshots"]).toBeUndefined();
  });

  it("skips a snapshot when nothing changed", () => {
    setDoc("mf.songs", '[{"id":"a"}]');
    expect(snapshot("first", 1000)).not.toBeNull();
    expect(snapshot("second", 2000)).toBeNull();
  });
});

describe("snapshot storage", () => {
  it("keeps the list where the app can still read it after a restart", () => {
    setDoc("mf.songs", '[{"id":"a"}]');
    snapshot("test", 1000);
    // Stored as a durable key, so it survives in the database rather than
    // competing for the localStorage quota.
    expect(getDoc("mf.snapshots")).toBeTruthy();
    expect(loadSnapshots()).toHaveLength(1);
    expect(latestSnapshot()?.reason).toBe("test");
  });

  it("deletes a snapshot", () => {
    setDoc("mf.songs", '[{"id":"a"}]');
    const snap = snapshot("test", 1000)!;
    deleteSnapshot(snap.id);
    expect(loadSnapshots()).toHaveLength(0);
  });
});

describe("restore", () => {
  // The bug this file was written for: restoring wrote localStorage while the
  // app read SQLite, so the user's data was never actually rolled back.
  it("puts durable data back where the app will read it", () => {
    setDoc("mf.songs", '[{"id":"original"}]');
    const snap = snapshot("before", 1000)!;

    setDoc("mf.songs", '[{"id":"edited"}]');
    expect(getDoc("mf.songs")).toBe('[{"id":"edited"}]');

    expect(restoreSnapshot(snap.id)).toBe(true);
    expect(getDoc("mf.songs")).toBe('[{"id":"original"}]');
  });

  it("restores localStorage-only keys too", () => {
    localStorage.setItem("mf.scripts", '["original"]');
    const snap = snapshot("before", 1000)!;
    localStorage.setItem("mf.scripts", '["edited"]');

    restoreSnapshot(snap.id);
    expect(localStorage.getItem("mf.scripts")).toBe('["original"]');
  });

  // A key created after the snapshot should not survive a rollback, or the
  // restore is partial in a way the user cannot see.
  it("clears durable data the snapshot did not contain", () => {
    setDoc("mf.songs", '[{"id":"a"}]');
    const snap = snapshot("before", 1000)!;

    setDoc("mf.cast", '[{"id":"added-later"}]');
    restoreSnapshot(snap.id);
    expect(getDoc("mf.cast")).toBeNull();
  });

  it("reports failure for an unknown snapshot", () => {
    expect(restoreSnapshot("nope")).toBe(false);
  });
});
