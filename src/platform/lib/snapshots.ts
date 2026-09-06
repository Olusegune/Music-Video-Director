// Session snapshots + crash recovery.
//
// Everything in the app already persists on every change, so a normal restart
// never loses data. This adds two things on top: timestamped snapshots the
// user can roll back to, and crash detection — if the app didn't shut down
// cleanly last time, we offer to restore the most recent snapshot.
//
// Songs, treatments, choreography and cast live in SQLite behind the durable
// store, not localStorage. Reading or writing them here through localStorage
// therefore captures stale copies and restores nothing the app will ever read
// — which silently broke the recovery button this whole file exists to
// provide. Every durable key goes through getDoc/setDoc; everything else is
// still plain localStorage.
//
// Safe to call getDoc/setDoc at module level because main.tsx awaits
// hydrateDurableStore() before mounting, and every caller here is inside a
// mounted component.

import { getDoc, setDoc, deleteDoc, DURABLE_KEYS } from "@/platform/lib/durableStore";

const LS_SNAPSHOTS = "mf.snapshots";
const LS_SESSION_OPEN = "mf.sessionOpen";
const MAX_SNAPSHOTS = 12;

// Keys that are NOT production data (don't snapshot/restore these).
const EXCLUDED = new Set([LS_SNAPSHOTS, LS_SESSION_OPEN, "mf.theme", "mf.showWelcome"]);

export interface Snapshot {
  id: string;
  ts: number;
  reason: string;
  data: Record<string, string>;
}

const DURABLE = new Set<string>(DURABLE_KEYS);

function captureState(): Record<string, string> {
  const data: Record<string, string> = {};
  for (const k of DURABLE_KEYS) {
    if (EXCLUDED.has(k)) continue;
    const v = getDoc(k);
    if (v != null) data[k] = v;
  }
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith("mf.") || EXCLUDED.has(k) || DURABLE.has(k)) continue;
    const v = localStorage.getItem(k);
    if (v != null) data[k] = v;
  }
  return data;
}

/** A cheap signature of the current production state, for change detection. */
export function stateSignature(): string {
  const data = captureState();
  return Object.keys(data)
    .sort()
    .map((k) => `${k}:${data[k].length}`)
    .join("|");
}

export function loadSnapshots(): Snapshot[] {
  try {
    const raw = getDoc(LS_SNAPSHOTS);
    return raw ? (JSON.parse(raw) as Snapshot[]) : [];
  } catch {
    return [];
  }
}

function saveSnapshots(list: Snapshot[]): void {
  // Snapshots are a durable key themselves, so this lands in SQLite rather
  // than competing with production data for the localStorage quota — twelve
  // full-state copies had grown to 9 MB of a 9.8 MB budget.
  setDoc(LS_SNAPSHOTS, JSON.stringify(list.slice(0, MAX_SNAPSHOTS)));
}

/**
 * Take a snapshot now. Returns null (no-op) when the state is empty or unchanged
 * since the most recent snapshot, so the list stays meaningful.
 */
export function snapshot(reason: string, now: number): Snapshot | null {
  const data = captureState();
  if (Object.keys(data).length === 0) return null;
  const list = loadSnapshots();
  const sig = Object.keys(data)
    .sort()
    .map((k) => `${k}:${data[k].length}`)
    .join("|");
  const lastSig = list[0]
    ? Object.keys(list[0].data)
        .sort()
        .map((k) => `${k}:${list[0].data[k].length}`)
        .join("|")
    : "";
  if (sig === lastSig) return null;
  const snap: Snapshot = {
    id: `snap-${now}-${Math.floor((now % 1) * 1e6) || list.length}`,
    ts: now,
    reason,
    data,
  };
  saveSnapshots([snap, ...list]);
  return snap;
}

export function latestSnapshot(): Snapshot | null {
  return loadSnapshots()[0] ?? null;
}

/** Restore a snapshot: replace all production keys with the snapshot's data. */
export function restoreSnapshot(id: string): boolean {
  const snap = loadSnapshots().find((s) => s.id === id);
  if (!snap) return false;
  // Clear current production keys, then write the snapshot's — each through
  // whichever store actually backs it.
  const toClear: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith("mf.") && !EXCLUDED.has(k) && !DURABLE.has(k)) toClear.push(k);
  }
  toClear.forEach((k) => localStorage.removeItem(k));
  for (const k of DURABLE_KEYS) {
    if (EXCLUDED.has(k)) continue;
    if (!(k in snap.data)) deleteDoc(k);
  }
  for (const [k, v] of Object.entries(snap.data)) {
    if (DURABLE.has(k)) setDoc(k, v);
    else localStorage.setItem(k, v);
  }
  return true;
}

export function deleteSnapshot(id: string): void {
  saveSnapshots(loadSnapshots().filter((s) => s.id !== id));
}

// --- crash detection -------------------------------------------------------

/** True if the previous session didn't shut down cleanly (likely a crash). */
export function wasUncleanShutdown(): boolean {
  return localStorage.getItem(LS_SESSION_OPEN) === "1";
}

export function markSessionOpen(): void {
  localStorage.setItem(LS_SESSION_OPEN, "1");
}

export function markSessionClosed(): void {
  localStorage.setItem(LS_SESSION_OPEN, "0");
}
