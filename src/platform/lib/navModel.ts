import type { View } from "@/platform/store/useAppStore";

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
  subItems?: NavItemModel[];
}

export interface NavSectionModel {
  id: string;
  label: string;
  items: NavItemModel[];
}

// The Director Studio section mirrors the module manifests (MODULE_MANIFESTS):
// id / label / view / icon / tone per studio door, in the same order. The
// navModel test enforces that parity, so the manifest stays the source of truth
// without a runtime import cycle (moduleManifest imports nav *types*). A new
// module therefore needs a manifest entry plus a door here.
export const NAV_MODEL: NavSectionModel[] = [
  {
    id: "studios",
    label: "Director Studio",
    items: [
      {
        id: "musicvideo",
        label: "Music Video Director",
        view: "song",
        icon: "music",
        moduleId: "musicvideo",
        tone: "violet",
        subItems: [
          { id: "song", label: "Song Studio", view: "song", icon: "music" },
          { id: "direct", label: "Direct", view: "mvdirector", icon: "video" },
          { id: "templates", label: "Templates", view: "templates", icon: "templates" },
          { id: "cast", label: "Cast", view: "cast", icon: "users" },
          { id: "choreography", label: "Choreography", view: "choreography", icon: "footprints" },
          { id: "timeline", label: "Timeline", view: "timeline", icon: "list" },
          { id: "animation", label: "Animation Lab", view: "animation", icon: "clapperboard" },
        ],
      },
      { id: "motion", label: "Motion Studio", view: "motionstudio", icon: "motion", moduleId: "motion", tone: "cyan" },
      { id: "glam", label: "Glam Studio", view: "glamstudio", icon: "sparkles", moduleId: "glam", tone: "gold" },
      { id: "web", label: "Web Studio", view: "webstudio", icon: "globe", moduleId: "web", tone: "green" },
      { id: "campaign", label: "Campaign Studio", view: "campaignstudio", icon: "megaphone", moduleId: "campaign", tone: "pink" },
    ],
  },
  {
    id: "library",
    label: "Production Library",
    items: [
      { id: "characters", label: "Character Bible", view: "characters", icon: "users" },
      { id: "world", label: "World Bible", view: "world", icon: "globe" },
      { id: "props", label: "Props & Vehicles", view: "props", icon: "package" },
      { id: "assets", label: "Asset Library", view: "assets", icon: "library" },
      { id: "brandkits", label: "Brand Kits", view: "brandkits", icon: "palette" },
      { id: "scripts", label: "Script Studio", view: "scripts", icon: "file" },
    ],
  },
  {
    id: "tools",
    label: "Tools",
    items: [
      { id: "dashboard", label: "Dashboard", view: "dashboard", icon: "dashboard" },
      { id: "export", label: "Export Center", view: "export", icon: "book" },
    ],
  },
  {
    id: "system",
    label: "System",
    items: [
      { id: "apikeys", label: "API Keys", view: "apikeys", icon: "key" },
      { id: "models", label: "AI Models", view: "models", icon: "boxes" },
      { id: "settings", label: "Settings", view: "settings", icon: "settings" },
    ],
  },
];

export function moduleForView(view: View): ModuleId {
  return VIEW_MODULE[view];
}
