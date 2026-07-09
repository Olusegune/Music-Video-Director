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
import { loadSongs } from "@/apps/music-video/lib/songBrain";
import { listMotionProjects } from "@/apps/motion-studio/lib/projects";
import { listGlamProjects } from "@/apps/glam-studio/lib/glamStore";
import { listWebProjects } from "@/apps/webstudio/lib/webStore";
import { listCampaigns } from "@/apps/campaign/lib/campaignStore";

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
  });
  registerProjectAdapter({
    moduleId: "motion",
    label: "Motion Studio",
    list: () => map("motion", listMotionProjects(), "Untitled Motion Project"),
  });
  registerProjectAdapter({
    moduleId: "glam",
    label: "Glam Studio",
    list: () => map("glam", listGlamProjects(), "Untitled Campaign"),
  });
  registerProjectAdapter({
    moduleId: "web",
    label: "Web Studio",
    list: () => map("web", listWebProjects(), "Untitled Website"),
  });
  registerProjectAdapter({
    moduleId: "campaign",
    label: "Campaign Studio",
    list: () => map("campaign", listCampaigns(), "Untitled Campaign"),
  });
}
