// Durable document storage for the app's large records — songs, treatments,
// choreography plans, cast.
//
// Why this exists: those records used to live in localStorage, which has a
// hard ~5-10MB per-origin ceiling. A couple of real productions is enough to
// reach it, and past the ceiling writes simply fail. SQLite has no such
// ceiling.
//
// Why it's a *cache* rather than a straight async API: the music-video layer
// reads these synchronously in render paths — `useState(() => loadSongs())`,
// `useMemo(() => loadSongs().find(...))` — across ~48 call sites. Making the
// reads async would turn every one of those into a loading state with a
// first-render race. So reads stay synchronous against an in-memory cache
// hydrated once at startup, and writes update that cache synchronously before
// being persisted to SQLite in the background. Callers see the same
// synchronous contract they always did.
//
// In the browser (dev, no Tauri) there is no SQLite, so this falls back to
// localStorage and behaves exactly as before.

import { safeSetItem, notifyStorage } from "@/platform/lib/storage";

// Deliberately not imported from ipc.ts: this module is loaded at startup
// before the first render, and importing ipc would pull its whole provider /
// model-registry graph along with it. The check is one line, and the Tauri
// API is loaded lazily below for the same reason ipc.ts does it — a static
// import breaks the plain-browser dev path.
//
// Evaluated per call rather than captured in a module-level const: a const is
// frozen at import time, which makes the two environments impossible to test
// independently and would silently pick the wrong branch if this module were
// ever imported before the Tauri bridge finished attaching to window.
function tauriAvailable(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke: call } = await import("@tauri-apps/api/core");
  return call<T>(cmd, args);
}

/** Keys owned by this store. Anything not listed keeps using localStorage —
 *  small settings records are fine there and not worth the migration risk. */
export const DURABLE_KEYS = ["mf.songs", "mf.treatments", "mf.choreo", "mf.cast"] as const;

const cache = new Map<string, string>();
let hydrated = false;

/** Coalesces rapid writes to the same key into one IPC round-trip — a single
 *  edit can touch a store several times in a tick, and each persist is a
 *  serialize + IPC hop. */
const pending = new Map<string, string>();
let flushTimer: number | null = null;

async function flush(): Promise<void> {
  flushTimer = null;
  const batch = Array.from(pending.entries());
  pending.clear();
  for (const [key, value] of batch) {
    try {
      await invoke("doc_set", { key, value });
    } catch (error) {
      // The cache already has the value, so the session continues correctly;
      // what's at risk is durability across a restart, which the user needs
      // to know about rather than discover later.
      const detail = error instanceof Error ? ` ${error.message}` : "";
      notifyStorage(`Could not save "${key}" to the local database.${detail}`);
    }
  }
}

function scheduleFlush(): void {
  if (flushTimer !== null) return;
  flushTimer = window.setTimeout(() => void flush(), 250);
}

/**
 * Load everything into memory, migrating any pre-existing localStorage data
 * on first run. Must be awaited before the app renders — every read after
 * this point is synchronous and assumes the cache is warm.
 */
export async function hydrateDurableStore(): Promise<void> {
  if (hydrated) return;

  if (!tauriAvailable()) {
    // Browser dev: localStorage is all there is. Seed the cache from it so
    // reads and writes behave identically to the Tauri path.
    for (const key of DURABLE_KEYS) {
      const raw = localStorage.getItem(key);
      if (raw != null) cache.set(key, raw);
    }
    hydrated = true;
    return;
  }

  try {
    const rows = await invoke<[string, string][]>("doc_get_all");
    for (const [key, value] of rows) cache.set(key, value);
  } catch (error) {
    const detail = error instanceof Error ? ` ${error.message}` : "";
    notifyStorage(`Could not read the local database.${detail}`);
  }

  // One-time migration: anything still only in localStorage moves across.
  // localStorage is deliberately NOT cleared afterwards — if the SQLite write
  // fails or the app is killed mid-migration, the original data is still
  // there to migrate again on the next launch. It costs a few MB of stale
  // duplication once, which is a far better trade than a lost production.
  for (const key of DURABLE_KEYS) {
    if (cache.has(key)) continue;
    const legacy = localStorage.getItem(key);
    if (legacy == null) continue;
    try {
      await invoke("doc_set", { key, value: legacy });
      cache.set(key, legacy);
    } catch (error) {
      // Migration failed — keep serving the legacy value from cache so the
      // user's work is still visible and editable this session.
      cache.set(key, legacy);
      const detail = error instanceof Error ? ` ${error.message}` : "";
      notifyStorage(`Could not move "${key}" into the local database yet.${detail}`);
    }
  }

  hydrated = true;
}

/**
 * Bytes of localStorage still holding a copy of something now in SQLite.
 *
 * Migration deliberately leaves the originals behind so a failed or
 * interrupted move can be retried. Once the database genuinely holds the same
 * key, that copy is dead weight — and worse than dead weight, because it
 * keeps the storage-pressure warning lit and pushes the user toward deleting
 * real productions to reclaim space nothing needs.
 */
export function reclaimableBytes(): number {
  if (!hydrated || !tauriAvailable()) return 0;
  let total = 0;
  for (const key of DURABLE_KEYS) {
    if (!cache.has(key)) continue; // Not in the database — not safe to drop.
    const legacy = localStorage.getItem(key);
    if (legacy != null) total += key.length + legacy.length;
  }
  return total * 2; // UTF-16 code units, matching storageBytesUsed().
}

/**
 * Drop the localStorage copies the database has already taken over.
 *
 * Only ever removes a key the cache proves SQLite is serving, and only in the
 * desktop app where SQLite is the real store — in a plain browser these
 * copies are still the only copy. Returns the number of keys released.
 */
export function reclaimMigratedCopies(): number {
  if (!hydrated || !tauriAvailable()) return 0;
  let released = 0;
  for (const key of DURABLE_KEYS) {
    if (!cache.has(key)) continue;
    if (localStorage.getItem(key) == null) continue;
    try {
      localStorage.removeItem(key);
      released += 1;
    } catch {
      // A failed removal is harmless: the copy simply stays.
    }
  }
  return released;
}

/** True once hydration has run. Reads before this point return nothing, which
 *  would look like data loss — callers should not race it. */
export function isDurableStoreReady(): boolean {
  return hydrated;
}

/** Synchronous read from the in-memory cache. */
export function getDoc(key: string): string | null {
  return cache.get(key) ?? null;
}

/** Synchronous write: cache updates immediately, persistence follows. */
export function setDoc(key: string, value: string): void {
  cache.set(key, value);
  if (!tauriAvailable()) {
    safeSetItem(key, value);
    return;
  }
  pending.set(key, value);
  scheduleFlush();
}

export function deleteDoc(key: string): void {
  cache.delete(key);
  pending.delete(key);
  if (!tauriAvailable()) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* removal failing is not worth interrupting the user */
    }
    return;
  }
  void invoke("doc_delete", { key }).catch(() => {
    /* the cache is already authoritative for this session */
  });
}

/** Flush anything still queued — call before the window closes so a write in
 *  the last 250ms isn't lost. */
export async function flushDurableStore(): Promise<void> {
  if (flushTimer !== null) {
    window.clearTimeout(flushTimer);
    flushTimer = null;
  }
  await flush();
}

/** Test seam — resets module state between tests. */
export function __resetDurableStoreForTests(): void {
  cache.clear();
  pending.clear();
  if (flushTimer !== null) {
    window.clearTimeout(flushTimer);
    flushTimer = null;
  }
  hydrated = false;
}
