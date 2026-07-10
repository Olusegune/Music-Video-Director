// Project Hub — a platform-level index over every module's own project store.
//
// Each module keeps owning its data shape and persistence; it registers a thin
// ProjectAdapter that maps its records to a normalized HubProject. The hub then
// provides the cross-studio surfaces (Recent, and later Open / Save As /
// snapshots) without any module reinventing them, and without the platform
// layer importing app code — modules register at startup instead.

import type { ModuleId } from "@/platform/lib/navModel";

export type HubModuleId = Exclude<ModuleId, null>;

/** Normalized project record shared across studios. */
export interface HubProject {
  moduleId: HubModuleId;
  id: string;
  name: string;
  /** ISO timestamp; used to sort Recent. Empty string sorts last. */
  updatedAt: string;
  thumbUrl?: string;
}

export interface ProjectAdapter {
  moduleId: HubModuleId;
  /** Human label for the studio (e.g. "Glam Studio"). */
  label: string;
  /** List the module's projects, already mapped to HubProject. */
  list: () => HubProject[];
  /** Save As: deep-copy the record under a new id + name. Returns the new id. */
  duplicate?: (id: string, newName: string) => string | null;
  rename?: (id: string, name: string) => void;
  remove?: (id: string) => void;
}

/** Which hub mutations a module supports (drives menu item visibility). */
export interface ProjectCapabilities {
  duplicate: boolean;
  rename: boolean;
  remove: boolean;
}

export function projectCapabilities(moduleId: HubModuleId): ProjectCapabilities {
  const adapter = adapters.get(moduleId);
  return {
    duplicate: Boolean(adapter?.duplicate),
    rename: Boolean(adapter?.rename),
    remove: Boolean(adapter?.remove),
  };
}

/**
 * "Launch Film" → "Launch Film copy" → "Launch Film copy 2" …
 * `taken` is the set of existing names in the same module.
 */
export function suggestCopyName(name: string, taken: string[]): string {
  const base = (name || "Untitled").replace(/ copy(?: \d+)?$/, "");
  const existing = new Set(taken);
  const first = `${base} copy`;
  if (!existing.has(first)) return first;
  for (let n = 2; n < 1000; n += 1) {
    const candidate = `${base} copy ${n}`;
    if (!existing.has(candidate)) return candidate;
  }
  return `${base} copy ${Date.now()}`;
}

/** Save As. Returns the new project id, or null when unsupported/failed. */
export function duplicateProject(
  moduleId: HubModuleId,
  id: string,
  newName?: string
): string | null {
  const adapter = adapters.get(moduleId);
  if (!adapter?.duplicate) return null;
  const projects = safeList(adapter);
  const source = projects.find((p) => p.id === id);
  const name =
    newName?.trim() ||
    suggestCopyName(
      source?.name ?? "Untitled",
      projects.map((p) => p.name)
    );
  try {
    return adapter.duplicate(id, name);
  } catch {
    return null;
  }
}

export function renameProject(moduleId: HubModuleId, id: string, name: string): boolean {
  const adapter = adapters.get(moduleId);
  const trimmed = name.trim();
  if (!adapter?.rename || !trimmed) return false;
  try {
    adapter.rename(id, trimmed);
    return true;
  } catch {
    return false;
  }
}

export function deleteProject(moduleId: HubModuleId, id: string): boolean {
  const adapter = adapters.get(moduleId);
  if (!adapter?.remove) return false;
  try {
    adapter.remove(id);
    return true;
  } catch {
    return false;
  }
}

const adapters = new Map<HubModuleId, ProjectAdapter>();

export function registerProjectAdapter(adapter: ProjectAdapter): void {
  adapters.set(adapter.moduleId, adapter);
}

export function clearProjectAdapters(): void {
  adapters.clear();
}

export function listProjectAdapters(): ProjectAdapter[] {
  return [...adapters.values()];
}

function safeList(adapter: ProjectAdapter): HubProject[] {
  try {
    return adapter.list();
  } catch {
    // A single broken store must never take down the whole Recent view.
    return [];
  }
}

/** Every project across every registered module, newest first. */
export function listAllProjects(): HubProject[] {
  return listProjectAdapters()
    .flatMap(safeList)
    .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
}

/** The N most recently touched projects across all studios. */
export function recentProjects(limit = 8): HubProject[] {
  return listAllProjects().slice(0, Math.max(0, limit));
}

/** Projects for a single module, newest first. */
export function projectsForModule(moduleId: HubModuleId): HubProject[] {
  const adapter = adapters.get(moduleId);
  return adapter
    ? safeList(adapter).sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""))
    : [];
}
