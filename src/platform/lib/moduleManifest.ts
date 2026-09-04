import type { View } from "@/platform/store/useAppStore";
import type { Capability } from "@/platform/lib/providers";
import type { ModuleId, NavIcon, NavTone } from "@/platform/lib/navModel";
import { ENABLED_MODULES } from "@/platform/lib/productConfig";

export type ConcreteModuleId = Exclude<ModuleId, null>;

export interface ModuleManifest {
  id: ConcreteModuleId;
  label: string;
  homeView: View;
  icon: NavIcon;
  tone: NavTone;
  capabilities: Capability[];
  generationCapabilities: Capability[];
  guidedFlowId?: string;
  outputKinds: string[];
}

export const MODULE_MANIFESTS: ModuleManifest[] = [
  {
    id: "musicvideo",
    label: "Music Video Director",
    homeView: "song",
    icon: "music",
    tone: "violet",
    capabilities: ["text", "image", "video", "audio"],
    generationCapabilities: ["image", "video", "audio"],
    guidedFlowId: "music-video-magic-flow",
    outputKinds: ["treatment", "storyboard", "video", "render-pack"],
  },
  {
    id: "motion",
    label: "Motion Studio",
    homeView: "motionstudio",
    icon: "motion",
    tone: "cyan",
    capabilities: ["text", "image", "video", "audio"],
    generationCapabilities: ["text", "image", "video"],
    guidedFlowId: "motion-studio-flow",
    outputKinds: ["storyboard", "motion-plan", "export-pack"],
  },
  {
    id: "glam",
    label: "Glam Studio",
    homeView: "glamstudio",
    icon: "sparkles",
    tone: "gold",
    capabilities: ["text", "image"],
    generationCapabilities: ["image"],
    guidedFlowId: "glam-campaign-flow",
    outputKinds: ["hero", "format-pack", "campaign-export"],
  },
  {
    id: "web",
    label: "Web Studio",
    homeView: "webstudio",
    icon: "globe",
    tone: "green",
    capabilities: ["text", "image"],
    generationCapabilities: ["text", "image"],
    guidedFlowId: "web-studio-flow",
    outputKinds: ["site-spec", "html-export", "asset-pack"],
  },
  {
    id: "campaign",
    label: "Campaign Studio",
    homeView: "campaignstudio",
    icon: "megaphone",
    tone: "pink",
    capabilities: ["text", "image"],
    generationCapabilities: ["text", "image"],
    guidedFlowId: "campaign-studio-flow",
    outputKinds: ["campaign-plan", "social-graphic", "launch-pack"],
  },
];

/** All studios this build ships. The single place every nav/search/help/
 *  wizard surface should read the studio list from — see productConfig.ts. */
export function listModuleManifests(): ModuleManifest[] {
  return MODULE_MANIFESTS.filter((manifest) => ENABLED_MODULES.includes(manifest.id));
}

/** Unfiltered — every studio that exists in code, regardless of this build's
 *  edition. Only for places that must reason about the whole platform (tests,
 *  the manifest/nav parity check) — UI surfaces should use listModuleManifests(). */
export function listAllModuleManifests(): ModuleManifest[] {
  return MODULE_MANIFESTS;
}

export function moduleManifestById(id: ConcreteModuleId): ModuleManifest {
  const manifest = MODULE_MANIFESTS.find((item) => item.id === id);
  if (!manifest) throw new Error(`Unknown Director Studio module: ${id}`);
  return manifest;
}

export function moduleManifestForView(view: View): ModuleManifest | null {
  return MODULE_MANIFESTS.find((item) => item.homeView === view) ?? null;
}
