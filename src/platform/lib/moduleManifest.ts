import type { View } from "@/platform/store/useAppStore";
import type { Capability } from "@/platform/lib/providers";
import type { ModuleId, NavIcon, NavTone } from "@/platform/lib/navModel";

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

export function listModuleManifests(): ModuleManifest[] {
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
