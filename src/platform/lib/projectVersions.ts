// Generic per-project version history.
//
// Modules that already own a version system (Motion Studio) delegate to it
// through their ProjectAdapter. Every other module gets history for free by
// exposing read(id)/write(record): the hub serializes the whole project record
// into this store and writes it back on restore. Nothing here knows any
// module's shape.

import { createVersionedStorage, notifyStorage } from "@/platform/lib/storage";

/** What the UI shows for one saved version. */
export interface ProjectVersion {
  id: string;
  label: string;
  createdAt: string;
}

interface StoredVersion extends ProjectVersion {
  payload: unknown;
}

/** Keyed by `${moduleId}:${projectId}`, newest first. */
type VersionMap = Record<string, StoredVersion[]>;

const MAX_VERSIONS_PER_PROJECT = 20;

const versionStorage = createVersionedStorage<VersionMap>({
  namespace: "platform",
  key: "projectVersions",
  version: 1,
  fallback: () => ({}),
});

function keyFor(moduleId: string, projectId: string): string {
  return `${moduleId}:${projectId}`;
}

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `ver-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  }
}

function strip(version: StoredVersion): ProjectVersion {
  const { id, label, createdAt } = version;
  return { id, label, createdAt };
}

export function listVersions(moduleId: string, projectId: string): ProjectVersion[] {
  return (versionStorage.read()[keyFor(moduleId, projectId)] ?? []).map(strip);
}

/** Save `payload` as a new version. Returns its id. Oldest are trimmed, loudly. */
export function saveVersion(
  moduleId: string,
  projectId: string,
  label: string,
  payload: unknown,
  now = new Date()
): string {
  const map = versionStorage.read();
  const key = keyFor(moduleId, projectId);
  const existing = map[key] ?? [];
  const version: StoredVersion = {
    id: newId(),
    label: label.trim() || "Snapshot",
    createdAt: now.toISOString(),
    payload,
  };
  const next = [version, ...existing];
  if (next.length > MAX_VERSIONS_PER_PROJECT) {
    const dropped = next.length - MAX_VERSIONS_PER_PROJECT;
    notifyStorage(
      `Version history is capped at ${MAX_VERSIONS_PER_PROJECT}; removed the ${dropped} oldest.`
    );
  }
  map[key] = next.slice(0, MAX_VERSIONS_PER_PROJECT);
  versionStorage.write(map);
  return version.id;
}

/** The stored payload for a version, or null when it is gone. */
export function readVersionPayload(
  moduleId: string,
  projectId: string,
  versionId: string
): unknown | null {
  const versions = versionStorage.read()[keyFor(moduleId, projectId)] ?? [];
  const match = versions.find((version) => version.id === versionId);
  return match ? match.payload : null;
}

export function deleteVersion(moduleId: string, projectId: string, versionId: string): void {
  const map = versionStorage.read();
  const key = keyFor(moduleId, projectId);
  const versions = map[key];
  if (!versions) return;
  map[key] = versions.filter((version) => version.id !== versionId);
  versionStorage.write(map);
}

/** Drop a project's whole history (called when the project is deleted). */
export function deleteAllVersions(moduleId: string, projectId: string): void {
  const map = versionStorage.read();
  delete map[keyFor(moduleId, projectId)];
  versionStorage.write(map);
}
