// Registers each module's project store with the platform Project Hub.
//
// This lives in the app layer (not platform) so the platform hub never imports
// app code. Called once at startup so Recent-across-studios is populated before
// any specific module is opened.

import {
  registerProjectAdapter,
  type HubModuleId,
  type HubProject,
} from "@/platform/lib/projectHub";
import { listDeliverables, deliverableThumbnail } from "@/platform/lib/deliverables";
import { loadSongs, saveSong, deleteSong } from "@/apps/music-video/lib/songBrain";
import {
  listMotionProjects,
  saveMotionProject,
  deleteMotionProject,
  listMotionVersions,
  snapshotMotionProjectId,
  restoreMotionVersion,
} from "@/apps/motion-studio/lib/projects";
import {
  listGlamProjects,
  saveGlamProject,
  deleteGlamProject,
} from "@/apps/glam-studio/lib/glamStore";
import { listWebProjects, saveWebProject, deleteWebProject } from "@/apps/webstudio/lib/webStore";
import { listCampaigns, saveCampaign, deleteCampaign } from "@/apps/campaign/lib/campaignStore";

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `proj-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  }
}

/**
 * Deep-copy a module record under a fresh id + name. Deliberately generic: the
 * hub never needs to know a module's shape, and a duplicate carries no
 * deliverables (those belong to the original production).
 */
function cloneRecord<
  T extends { id: string; name: string; createdAt?: string; updatedAt?: string },
>(source: T, name: string): T {
  const now = new Date().toISOString();
  return {
    ...structuredClone(source),
    id: newId(),
    name,
    createdAt: source.createdAt ?? now,
    updatedAt: now,
  };
}

function renamed<T extends { name: string; updatedAt?: string }>(source: T, name: string): T {
  return { ...source, name, updatedAt: new Date().toISOString() };
}

function thumb(moduleId: HubModuleId, projectId: string): string | undefined {
  return deliverableThumbnail(listDeliverables({ moduleId, projectId }), projectId);
}

function map<T extends { id: string; name?: string; updatedAt?: string; createdAt?: string }>(
  moduleId: HubModuleId,
  items: T[],
  fallbackName: string
): HubProject[] {
  return items.map((item) => ({
    moduleId,
    id: item.id,
    name: item.name?.trim() || fallbackName,
    updatedAt: item.updatedAt || item.createdAt || "",
    thumbUrl: thumb(moduleId, item.id),
  }));
}

let installed = false;

export function installProjectAdapters(): void {
  if (installed) return;
  installed = true;

  registerProjectAdapter({
    moduleId: "musicvideo",
    label: "Music Video Director",
    list: () => map("musicvideo", loadSongs(), "Untitled Song"),
    // A song's duplicate shares the same imported audio file on disk.
    duplicate: (id, name) => {
      const source = loadSongs().find((song) => song.id === id);
      if (!source) return null;
      const copy = cloneRecord(source, name);
      saveSong(copy);
      return copy.id;
    },
    rename: (id, name) => {
      const source = loadSongs().find((song) => song.id === id);
      if (source) saveSong(renamed(source, name));
    },
    remove: deleteSong,
    read: (id) => loadSongs().find((song) => song.id === id) ?? null,
    write: (record) => saveSong(record as ReturnType<typeof loadSongs>[number]),
  });
  registerProjectAdapter({
    moduleId: "motion",
    label: "Motion Studio",
    list: () => map("motion", listMotionProjects(), "Untitled Motion Project"),
    duplicate: (id, name) => {
      const source = listMotionProjects().find((project) => project.id === id);
      if (!source) return null;
      const copy = cloneRecord(source, name);
      saveMotionProject(copy);
      return copy.id;
    },
    rename: (id, name) => {
      const source = listMotionProjects().find((project) => project.id === id);
      if (source) saveMotionProject(renamed(source, name));
    },
    remove: deleteMotionProject,
    // read/write power bundling; versioning still uses Motion's native history.
    read: (id) => listMotionProjects().find((project) => project.id === id) ?? null,
    write: (record) =>
      void saveMotionProject(record as ReturnType<typeof listMotionProjects>[number]),
    // Motion already owns a version system — delegate rather than duplicate it.
    versions: (id) =>
      listMotionVersions(id).map((version) => ({
        id: version.id,
        label: version.label,
        createdAt: version.createdAt,
      })),
    snapshot: snapshotMotionProjectId,
    restore: restoreMotionVersion,
  });
  registerProjectAdapter({
    moduleId: "glam",
    label: "Glam Studio",
    list: () => map("glam", listGlamProjects(), "Untitled Campaign"),
    duplicate: (id, name) => {
      const source = listGlamProjects().find((project) => project.id === id);
      if (!source) return null;
      const copy = cloneRecord(source, name);
      saveGlamProject(copy);
      return copy.id;
    },
    rename: (id, name) => {
      const source = listGlamProjects().find((project) => project.id === id);
      if (source) saveGlamProject(renamed(source, name));
    },
    remove: deleteGlamProject,
    read: (id) => listGlamProjects().find((project) => project.id === id) ?? null,
    write: (record) => void saveGlamProject(record as ReturnType<typeof listGlamProjects>[number]),
  });
  registerProjectAdapter({
    moduleId: "web",
    label: "Web Studio",
    list: () => map("web", listWebProjects(), "Untitled Website"),
    duplicate: (id, name) => {
      const source = listWebProjects().find((project) => project.id === id);
      if (!source) return null;
      const copy = cloneRecord(source, name);
      saveWebProject(copy);
      return copy.id;
    },
    rename: (id, name) => {
      const source = listWebProjects().find((project) => project.id === id);
      if (source) saveWebProject(renamed(source, name));
    },
    remove: deleteWebProject,
    read: (id) => listWebProjects().find((project) => project.id === id) ?? null,
    write: (record) => void saveWebProject(record as ReturnType<typeof listWebProjects>[number]),
  });
  registerProjectAdapter({
    moduleId: "campaign",
    label: "Campaign Studio",
    list: () => map("campaign", listCampaigns(), "Untitled Campaign"),
    duplicate: (id, name) => {
      const source = listCampaigns().find((project) => project.id === id);
      if (!source) return null;
      const copy = cloneRecord(source, name);
      saveCampaign(copy);
      return copy.id;
    },
    rename: (id, name) => {
      const source = listCampaigns().find((project) => project.id === id);
      if (source) saveCampaign(renamed(source, name));
    },
    remove: deleteCampaign,
    read: (id) => listCampaigns().find((project) => project.id === id) ?? null,
    write: (record) => void saveCampaign(record as ReturnType<typeof listCampaigns>[number]),
  });
}
