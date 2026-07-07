// Saved scripts + their analysis. Stored in localStorage (persists in both the
// Tauri webview and browser dev), consistent with styleDna.ts. The valuable,
// canonical artifacts an analysis produces — Character DNA records — are saved
// through the Rust core; the raw script text + derived analysis live here.

import type { ScriptAnalysis } from "@/platform/lib/scriptAnalysis";

export interface ScriptDoc {
  id: string;
  title: string;
  content: string;
  /** Extension/source format: txt | pdf | docx | fountain | pasted */
  format: string;
  analysis: ScriptAnalysis | null;
  createdAt: string;
  updatedAt: string;
}

const LS = "mf.scripts";

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `script-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  }
}

export function loadScripts(): ScriptDoc[] {
  try {
    const raw = localStorage.getItem(LS);
    return raw ? (JSON.parse(raw) as ScriptDoc[]) : [];
  } catch {
    return [];
  }
}

function persist(list: ScriptDoc[]) {
  localStorage.setItem(LS, JSON.stringify(list));
}

export function newScript(title = "Untitled Script", format = "pasted"): ScriptDoc {
  const now = new Date().toISOString();
  return {
    id: newId(),
    title,
    content: "",
    format,
    analysis: null,
    createdAt: now,
    updatedAt: now,
  };
}

/** Insert or update a script (newest first). */
export function saveScript(doc: ScriptDoc): ScriptDoc {
  const next = { ...doc, updatedAt: new Date().toISOString() };
  const all = loadScripts();
  const idx = all.findIndex((s) => s.id === doc.id);
  if (idx >= 0) all[idx] = next;
  else all.unshift(next);
  persist(all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
  return next;
}

export function deleteScript(id: string) {
  persist(loadScripts().filter((s) => s.id !== id));
}
