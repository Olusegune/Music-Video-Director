// Project Hub — a platform-level index over every module's own project store.
//
// Each module keeps owning its data shape and persistence; it registers a thin
// ProjectAdapter that maps its records to a normalized HubProject. The hub then
// provides the cross-studio surfaces (Recent, and later Open / Save As /
// snapshots) without any module reinventing them, and without the platform
// layer importing app code — modules register at startup instead.

import type { ModuleId } from "@/platform/lib/navModel";
import {
  deleteAllVersions,
  deleteVersion,
  listVersions,
  readVersionPayload,
  saveVersion,
  type ProjectVersion,
} from "@/platform/lib/projectVersions";
import { detachProject } from "@/platform/lib/directorProject";

export type { ProjectVersion };

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

  // --- version history -----------------------------------------------------
  // Either expose read/write and the hub stores versions generically, or
  // implement the native trio when the module already owns a version system.
  /** Serialize the whole project record (generic versioning). */
  read?: (id: string) => unknown | null;
  /** Write a previously-read record back (generic versioning). */
  write?: (record: unknown) => void;
  /** Native override: the module keeps its own history. */
  versions?: (id: string) => ProjectVersion[];
  snapshot?: (id: string, label: string) => string | null;
  restore?: (id: string, versionId: string) => boolean;
}

/** Which mutations a module supports (drives menu item visibility). */
export interface ProjectCapabilities {
  duplicate: boolean;
  rename: boolean;
  remove: boolean;
  versioning: boolean;
}

function nativeVersioning(adapter: ProjectAdapter | undefined): boolean {
  return Boolean(adapter?.versions && adapter?.snapshot && adapter?.restore);
}

function genericVersioning(adapter: ProjectAdapter | undefined): boolean {
  return Boolean(adapter?.read && adapter?.write);
}

export function projectCapabilities(moduleId: HubModuleId): ProjectCapabilities {
  const adapter = adapters.get(moduleId);
  return {
    duplicate: Boolean(adapter?.duplicate),
    rename: Boolean(adapter?.rename),
    remove: Boolean(adapter?.remove),
    versioning: nativeVersioning(adapter) || genericVersioning(adapter),
  };
}

/** True when the module already holds a project with this id. */
export function projectExists(moduleId: HubModuleId, id: string): boolean {
  const adapter = adapters.get(moduleId);
  return adapter ? safeList(adapter).some((project) => project.id === id) : false;
}

/** The module's raw project record, for bundling. Null when unsupported. */
export function readProjectRecord(moduleId: HubModuleId, id: string): unknown | null {
  const adapter = adapters.get(moduleId);
  if (!adapter?.read) return null;
  try {
    return adapter.read(id);
  } catch {
    return null;
  }
}

/** Write a raw project record back into its module's store. */
export function writeProjectRecord(moduleId: HubModuleId, record: unknown): boolean {
  const adapter = adapters.get(moduleId);
  if (!adapter?.write) return false;
  try {
    adapter.write(record);
    return true;
  } catch {
    return false;
  }
}

/** Saved versions for a project, newest first. */
export function listProjectVersions(moduleId: HubModuleId, id: string): ProjectVersion[] {
  const adapter = adapters.get(moduleId);
  if (!adapter) return [];
  try {
    if (nativeVersioning(adapter)) return adapter.versions!(id);
    if (genericVersioning(adapter)) return listVersions(moduleId, id);
  } catch {
    return [];
  }
  return [];
}

/** Snapshot the project now. Returns the new version id, or null. */
export function snapshotProject(moduleId: HubModuleId, id: string, label: string): string | null {
  const adapter = adapters.get(moduleId);
  if (!adapter) return null;
  const name = label.trim() || "Snapshot";
  try {
    if (nativeVersioning(adapter)) return adapter.snapshot!(id, name);
    if (genericVersioning(adapter)) {
      const record = adapter.read!(id);
      if (record == null) return null;
      return saveVersion(moduleId, id, name, record);
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Roll a project back to a saved version. The current state is snapshotted
 * first as "Before restore", so a restore is itself undoable.
 */
export function restoreProjectVersion(
  moduleId: HubModuleId,
  id: string,
  versionId: string
): boolean {
  const adapter = adapters.get(moduleId);
  if (!adapter) return false;
  try {
    if (nativeVersioning(adapter)) {
      adapter.snapshot!(id, "Before restore");
      return adapter.restore!(id, versionId);
    }
    if (genericVersioning(adapter)) {
      const payload = readVersionPayload(moduleId, id, versionId);
      if (payload == null) return false;
      const current = adapter.read!(id);
      if (current != null) saveVersion(moduleId, id, "Before restore", current);
      adapter.write!(payload);
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

export function deleteProjectVersion(
  moduleId: HubModuleId,
  id: string,
  versionId: string
): boolean {
  const adapter = adapters.get(moduleId);
  if (!adapter || nativeVersioning(adapter)) return false;
  if (!genericVersioning(adapter)) return false;
  try {
    deleteVersion(moduleId, id, versionId);
    return true;
  } catch {
    return false;
  }
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
    // A deleted project must not leave orphaned history or membership behind.
    if (genericVersioning(adapter)) deleteAllVersions(moduleId, id);
    detachProject(moduleId, id);
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
