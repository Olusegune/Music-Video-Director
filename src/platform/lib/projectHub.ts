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
