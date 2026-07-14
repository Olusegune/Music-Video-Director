/**
 * Director Project Persistence — localStorage/IndexedDB-backed project storage
 */

import type { PromptPack } from "./types";
import type { AudioDirection } from "./audio";

export interface ProjectMetadata {
  clientName?: string;
  projectDate?: string;
  status?: "draft" | "approved" | "delivered" | "archived";
  tags?: string[];
}

export interface DirectorProject {
  id: string;
  name: string;
  type: "mv" | "commercial" | "campaign" | "other";
  brief: string;
  pack: PromptPack;
  metadata: ProjectMetadata;
  createdAt: string;
  updatedAt: string;
  storageType: "localStorage" | "indexedDB";
}

const LS_METADATA_KEY = "DIRECTOR_PROJECTS_META";
const IDB_NAME = "DirectorStudio";
const IDB_STORE = "projects";

function generateProjectId(): string {
  return `proj_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export interface ProjectMetadataOnly extends Omit<DirectorProject, "pack"> {}

// localStorage operations (metadata only)
function getProjectsMetadata(): ProjectMetadataOnly[] {
  try {
    const raw = localStorage.getItem(LS_METADATA_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveProjectMetadata(meta: ProjectMetadataOnly[]) {
  localStorage.setItem(LS_METADATA_KEY, JSON.stringify(meta));
}

// IndexedDB for full projects (with pack)
async function getIDBDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveToIndexedDB(project: DirectorProject): Promise<void> {
  try {
    const db = await getIDBDatabase();
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put(project);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Fallback to localStorage if IndexedDB fails
    localStorage.setItem(`PROJECT_FULL_${project.id}`, JSON.stringify(project));
  }
}

async function loadFromIndexedDB(id: string): Promise<DirectorProject | null> {
  try {
    const db = await getIDBDatabase();
    const tx = db.transaction(IDB_STORE, "readonly");
    const req = tx.objectStore(IDB_STORE).get(id);
    return new Promise((resolve) => {
      req.onsuccess = () => resolve(req.result || null);
    });
  } catch {
    // Fallback to localStorage
    const raw = localStorage.getItem(`PROJECT_FULL_${id}`);
    return raw ? JSON.parse(raw) : null;
  }
}

// Public API

export async function createProject(
  name: string,
  type: DirectorProject["type"],
  brief: string,
  metadata: ProjectMetadata = {}
): Promise<DirectorProject> {
  const now = new Date().toISOString();
  const emptyPack: PromptPack = {
    creativeDirection: {
      workingTitle: name,
      goal: "",
      audience: "",
      duration: "",
      aspectRatio: "16:9",
      emotionalTone: "",
      recommendedModels: [],
    },
    style: {
      visualLanguage: "",
      colorPalette: [],
      typography: "",
      materials: "",
      mood: "",
      atmosphere: "",
    },
    shots: [],
    textLocks: [],
    audio: {} as AudioDirection,
    referenceHierarchy: [],
    qcChecklist: [],
  };

  const project: DirectorProject = {
    id: generateProjectId(),
    name,
    type,
    brief,
    pack: emptyPack,
    metadata,
    createdAt: now,
    updatedAt: now,
    storageType: "indexedDB",
  };

  await saveToIndexedDB(project);

  const meta = getProjectsMetadata();
  meta.push({
    id: project.id,
    name,
    type,
    brief,
    metadata,
    createdAt: now,
    updatedAt: now,
    storageType: "indexedDB",
  });
  saveProjectMetadata(meta);

  return project;
}

export async function openProject(id: string): Promise<DirectorProject | null> {
  return loadFromIndexedDB(id);
}

export function listProjects(): ProjectMetadataOnly[] {
  const projects = getProjectsMetadata();
  return projects.sort((a, b) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export async function saveProject(project: DirectorProject): Promise<void> {
  const now = new Date().toISOString();
  const updated = { ...project, updatedAt: now };

  await saveToIndexedDB(updated);

  const meta = getProjectsMetadata();
  const idx = meta.findIndex((p) => p.id === project.id);
  if (idx >= 0) {
    const { pack, ...metadata } = updated;
    meta[idx] = { ...metadata, updatedAt: now } as ProjectMetadataOnly;
  }
  saveProjectMetadata(meta);
}

export async function deleteProject(id: string): Promise<void> {
  try {
    const db = await getIDBDatabase();
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).delete(id);
    await new Promise((resolve) => {
      tx.oncomplete = () => resolve(null);
    });
  } catch {
    localStorage.removeItem(`PROJECT_FULL_${id}`);
  }

  const meta = getProjectsMetadata();
  saveProjectMetadata(meta.filter((p) => p.id !== id));
}

export async function duplicateProject(id: string): Promise<DirectorProject | null> {
  const original = await openProject(id);
  if (!original) return null;

  const now = new Date().toISOString();
  const dup: DirectorProject = {
    ...original,
    id: generateProjectId(),
    name: `${original.name} (copy)`,
    createdAt: now,
    updatedAt: now,
  };

  await saveToIndexedDB(dup);

  const meta = getProjectsMetadata();
  meta.push({
    id: dup.id,
    name: dup.name,
    type: dup.type,
    brief: dup.brief,
    metadata: dup.metadata,
    createdAt: dup.createdAt,
    updatedAt: dup.updatedAt,
    storageType: dup.storageType,
  });
  saveProjectMetadata(meta);

  return dup;
}

export function exportProject(project: DirectorProject): string {
  return JSON.stringify(project, null, 2);
}

export async function importProject(json: string): Promise<DirectorProject | null> {
  try {
    const data = JSON.parse(json);
    const project: DirectorProject = {
      ...data,
      id: generateProjectId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveToIndexedDB(project);

    const meta = getProjectsMetadata();
    meta.push({
      id: project.id,
      name: project.name,
      type: project.type,
      brief: project.brief,
      metadata: project.metadata,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      storageType: project.storageType,
    });
    saveProjectMetadata(meta);

    return project;
  } catch {
    return null;
  }
}

export function getStorageQuota(): { used: number; limit: number; percentage: number } {
  const meta = getProjectsMetadata();
  const metaSize = new Blob([JSON.stringify(meta)]).size;

  // Estimate total size (rough)
  const estimated = metaSize * 2; // Conservative estimate
  const limit = 5 * 1024 * 1024; // 5MB

  return {
    used: estimated,
    limit,
    percentage: (estimated / limit) * 100,
  };
}
