import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import {
  isQuotaError,
  safeSetItem,
  storageBytesUsed,
  isStorageUnderPressure,
  largestStorageEntries,
  describeStorageKey,
  STORAGE_SOFT_LIMIT_BYTES,
} from "@/platform/lib/storage";

function quotaError(): DOMException {
  return new DOMException("exceeded", "QuotaExceededError");
}

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("safeSetItem", () => {
  it("writes normally and reports success", () => {
    expect(safeSetItem("mf.test.key", "value")).toBe(true);
    expect(localStorage.getItem("mf.test.key")).toBe("value");
  });

  // The bug this exists to prevent: a full quota used to either throw into a
  // silent `catch {}` or crash mid-save, so the app kept looking like it was
  // saving while the user's work went nowhere.
  it("reports failure instead of throwing when the quota is full", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw quotaError();
    });
    expect(() => safeSetItem("mf.test.key", "value")).not.toThrow();
    expect(safeSetItem("mf.test.key", "value")).toBe(false);
  });

  it("tells the user the write did not land, naming the key", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw quotaError();
    });
    const events: string[] = [];
    const listener = (e: Event) => events.push((e as CustomEvent<string>).detail);
    window.addEventListener("mf-toast", listener);

    safeSetItem("mf.songs", "payload");

    window.removeEventListener("mf-toast", listener);
    expect(events).toHaveLength(1);
    expect(events[0]).toContain("mf.songs");
    expect(events[0]).toMatch(/NOT saved/i);
  });

  it("still surfaces non-quota write failures", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("disk on fire");
    });
    const events: string[] = [];
    const listener = (e: Event) => events.push((e as CustomEvent<string>).detail);
    window.addEventListener("mf-toast", listener);

    expect(safeSetItem("mf.songs", "payload")).toBe(false);

    window.removeEventListener("mf-toast", listener);
    expect(events).toHaveLength(1);
  });
});

describe("isQuotaError", () => {
  it("recognizes the Chromium quota error", () => {
    expect(isQuotaError(quotaError())).toBe(true);
  });

  it("recognizes the Firefox spelling", () => {
    expect(isQuotaError(new DOMException("full", "NS_ERROR_DOM_QUOTA_REACHED"))).toBe(true);
  });

  it("does not treat an ordinary error as a quota failure", () => {
    expect(isQuotaError(new Error("nope"))).toBe(false);
  });
});

describe("storage pressure", () => {
  it("counts both keys and values, in UTF-16 bytes", () => {
    localStorage.clear();
    localStorage.setItem("ab", "cd"); // 2 + 2 chars = 8 bytes
    expect(storageBytesUsed()).toBe(8);
  });

  it("is not under pressure when nearly empty", () => {
    localStorage.clear();
    expect(isStorageUnderPressure()).toBe(false);
  });

  it("reports pressure once usage passes the soft threshold", () => {
    // Report a value past 75% of the soft limit without actually allocating
    // megabytes in the test environment.
    const over = STORAGE_SOFT_LIMIT_BYTES * 0.8;
    vi.spyOn(Storage.prototype, "key").mockReturnValue("big");
    vi.spyOn(Storage.prototype, "getItem").mockReturnValue("x".repeat(over / 2));
    vi.spyOn(Storage.prototype, "length", "get").mockReturnValue(1);
    expect(isStorageUnderPressure()).toBe(true);
  });
});

describe("storage breakdown", () => {
  beforeEach(() => localStorage.clear());

  // "Local storage is full — delete a production" is a dead end when the space
  // isn't productions. On a real machine 9 of 9.8 MB was something else.
  it("names the biggest entries, largest first", () => {
    localStorage.setItem("mf.songs", "x".repeat(100));
    localStorage.setItem("mf.snapshots", "x".repeat(1000));
    localStorage.setItem("mf.cast", "x".repeat(10));

    const top = largestStorageEntries(2);
    expect(top.map((e) => e.key)).toEqual(["mf.snapshots", "mf.songs"]);
    expect(top[0].bytes).toBeGreaterThan(top[1].bytes);
  });

  it("counts both key and value, in UTF-16 units", () => {
    localStorage.setItem("ab", "cd");
    expect(largestStorageEntries(1)[0].bytes).toBe((2 + 2) * 2);
  });

  it("returns nothing for empty storage", () => {
    expect(largestStorageEntries()).toEqual([]);
  });

  it("gives storage keys names a person recognises", () => {
    expect(describeStorageKey("mf.treatments")).toBe("Shot lists");
    expect(describeStorageKey("mf.snapshots")).toBe("Session snapshots");
    // Unknown keys still read better without the internal prefix.
    expect(describeStorageKey("mf.somethingNew")).toBe("somethingNew");
  });
});
