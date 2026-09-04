import type { View } from "@/platform/store/useAppStore";
// Value import of the manifest list (not just types) so the studio doors
// below are derived, not duplicated — moduleManifest.ts only imports *types*
// from this file, so this stays a type-level cycle only, not a runtime one.
import { listModuleManifests, type ConcreteModuleId } from "@/platform/lib/moduleManifest";

export type ModuleId = "musicvideo" | "motion" | "glam" | "web" | "campaign" | null;

export const VIEW_MODULE: Record<View, ModuleId> = {
  song: "musicvideo",
  mvdirector: "musicvideo",
  magicoutput: "musicvideo",
  cast: "musicvideo",
  choreography: "musicvideo",
  timeline: "musicvideo",
  motionstudio: "motion",
  glamstudio: "glam",
  webstudio: "web",
  campaignstudio: "campaign",
  templates: "musicvideo",
  help: null,
  dashboard: null,
  projects: null,
  project: null,
  settings: null,
  brandkits: null,
  assets: null,
  characters: null,
  world: null,
  props: null,
  scripts: null,
  animation: "musicvideo",
  export: null,
  apikeys: null,
  models: null,
};

export type NavIcon =
  | "music"
  | "motion"
  | "sparkles"
  | "globe"
  | "megaphone"
  | "templates"
  | "users"
  | "package"
  | "library"
  | "palette"
  | "dashboard"
  | "file"
  | "clapperboard"
  | "book"
  | "key"
  | "settings"
  | "video"
  | "footprints"
  | "list"
  | "boxes";

export type NavTone = "violet" | "cyan" | "gold" | "green" | "pink";

export interface NavItemModel {
  id: string;
  label: string;
  view: View;
  icon: NavIcon;
  moduleId?: Exclude<ModuleId, null>;
  tone?: NavTone;
  badge?: string;
  subItems?: NavItemModel[];
}

export interface NavSectionModel {
  id: string;
  label: string;
  items: NavItemModel[];
}

// Music Video is the only studio with its own workflow sub-doors today; a new
// module can add an entry here once it has one.
const STUDIO_SUB_ITEMS: Partial<Record<ConcreteModuleId, NavItemModel[]>> = {
  musicvideo: [
    { id: "song", label: "Song Studio", view: "song", icon: "music" },
    { id: "direct", label: "Direct", view: "mvdirector", icon: "video" },
    { id: "templates", label: "Templates", view: "templates", icon: "templates" },
    { id: "cast", label: "Cast", view: "cast", icon: "users" },
    { id: "choreography", label: "Choreography", view: "choreography", icon: "footprints" },
    { id: "timeline", label: "Timeline", view: "timeline", icon: "list" },
    { id: "animation", label: "Animation Lab", view: "animation", icon: "clapperboard" },
  ],
};

// The Director Studio section mirrors listModuleManifests() — one door per
// enabled studio, in manifest order, filtered to this build's product edition
// (productConfig.ts). The navModel test enforces id/label/view parity against
// the full manifest list, so the manifest stays the single source of truth. A
// new module needs a manifest entry (and, if it has sub-workflows, an entry in
// STUDIO_SUB_ITEMS above) — nothing else here.
export const NAV_MODEL: NavSectionModel[] = [
  {
    id: "studios",
    label: "Director Studio",
    items: listModuleManifests().map((manifest) => ({
      id: manifest.id,
      label: manifest.label,
      view: manifest.homeView,
      icon: manifest.icon,
      moduleId: manifest.id,
      tone: manifest.tone,
      subItems: STUDIO_SUB_ITEMS[manifest.id],
    })),
  },
  {
    id: "library",
    label: "Production Library",
    items: [
      { id: "characters", label: "Character Designer", view: "characters", icon: "users", tone: "violet", badge: "NEW" },
      { id: "world", label: "World Designer", view: "world", icon: "globe", tone: "cyan" },
      { id: "props", label: "Props & Vehicles", view: "props", icon: "package", tone: "green" },
      { id: "brandkits", label: "Brand Kits", view: "brandkits", icon: "palette", tone: "gold" },
      { id: "scripts", label: "Script Studio", view: "scripts", icon: "file", tone: "pink" },
    ],
  },
  {
    id: "tools",
    label: "Manage",
    items: [
      { id: "dashboard", label: "Dashboard", view: "dashboard", icon: "dashboard", tone: "violet" },
      { id: "projects", label: "Projects", view: "projects", icon: "file", tone: "pink" },
      { id: "assets", label: "Asset Library", view: "assets", icon: "library", tone: "cyan" },
      { id: "export", label: "Export Center", view: "export", icon: "book", tone: "green" },
    ],
  },
  {
    id: "system",
    label: "System",
    items: [
      { id: "models", label: "AI Models", view: "models", icon: "boxes", tone: "violet" },
      { id: "apikeys", label: "API Keys", view: "apikeys", icon: "key", tone: "gold" },
      { id: "settings", label: "Settings", view: "settings", icon: "settings" },
    ],
  },
];

export function moduleForView(view: View): ModuleId {
  return VIEW_MODULE[view];
}
