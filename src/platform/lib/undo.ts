// Global time-machine undo/redo.
//
// Everything the user creates persists to localStorage, so instead of wiring
// undo into every store, we snapshot the whole `mf.*` production state whenever
// it changes (debounced) and let Ctrl+Z / Ctrl+Shift+Z step backward/forward.
// Restoring writes the snapshot back and remounts the views (via the store's
// dataVersion) so they re-read — no full page reload.

import { useAppStore } from "@/platform/store/useAppStore";

// Keys that are NOT undoable production data.
const VOLATILE = new Set([
  "mf.snapshots",
  "mf.sessionOpen",
  "mf.theme",
  "mf.showWelcome",
  "mf.activeSongId", // active selection follows the data, not the undo stack
]);

const MAX = 40;

let past: string[] = [];
let future: string[] = [];
let current = "";
let restoring = false;
let timer: ReturnType<typeof setTimeout> | null = null;
let installed = false;
const listeners = new Set<() => void>();

function snapshot(): string {
  const o: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith("mf.") || VOLATILE.has(k)) continue;
    const v = localStorage.getItem(k);
    if (v != null) o[k] = v;
  }
  return JSON.stringify(o);
}

function emit() {
  listeners.forEach((l) => l());
}

function record() {
  timer = null;
  const s = snapshot();
  if (s === current) return;
  if (current) {
    past.push(current);
    if (past.length > MAX) past.shift();
  }
  future = [];
  current = s;
  emit();
}

function schedule() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(record, 600);
}

/** Flush any pending capture so an immediate undo includes the latest edit. */
function flush() {
  if (timer) {
    clearTimeout(timer);
    record();
  }
}

function apply(stateJson: string) {
  restoring = true;
  try {
    const data = JSON.parse(stateJson) as Record<string, string>;
    // Remove tracked keys not in the target snapshot.
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("mf.") && !VOLATILE.has(k) && !(k in data)) toRemove.push(k);
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
    Object.entries(data).forEach(([k, v]) => localStorage.setItem(k, v));
  } finally {
    restoring = false;
  }
  // Remount views so they re-read the restored state.
  useAppStore.getState().syncFromStorage();
  emit();
}

export function installUndo(): void {
  if (installed) return;
  installed = true;
  current = snapshot();
  const setItem = localStorage.setItem.bind(localStorage);
  const removeItem = localStorage.removeItem.bind(localStorage);
  localStorage.setItem = (k: string, v: string) => {
    setItem(k, v);
    if (!restoring && k.startsWith("mf.") && !VOLATILE.has(k)) schedule();
  };
  localStorage.removeItem = (k: string) => {
    removeItem(k);
    if (!restoring && k.startsWith("mf.") && !VOLATILE.has(k)) schedule();
  };
}

export function undo(): boolean {
  flush();
  if (past.length === 0) return false;
  future.push(current);
  const prev = past.pop()!;
  current = prev;
  apply(prev);
  return true;
}

export function redo(): boolean {
  flush();
  if (future.length === 0) return false;
  past.push(current);
  const next = future.pop()!;
  current = next;
  apply(next);
  return true;
}

export const canUndo = () => past.length > 0;
export const canRedo = () => future.length > 0;

export function onUndoChange(l: () => void): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
