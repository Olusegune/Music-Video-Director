export type VisualModule =
  "music-video" | "motionstudio" | "glam-studio" | "webstudio" | "campaignstudio" | "platform";

export const VISUAL_MODULE_THEME: Record<
  VisualModule,
  { label: string; accent: string; gradient: string }
> = {
  "music-video": {
    label: "Music Video",
    accent: "#8b7cff",
    gradient: "from-violet-500/45 via-indigo-500/20 to-slate-950",
  },
  motionstudio: {
    label: "Motion Studio",
    accent: "#22d3ee",
    gradient: "from-cyan-400/45 via-blue-500/20 to-slate-950",
  },
  "glam-studio": {
    label: "Glam Studio",
    accent: "#f3c969",
    gradient: "from-amber-300/45 via-orange-500/20 to-stone-950",
  },
  webstudio: {
    label: "Web Studio",
    accent: "#34d399",
    gradient: "from-emerald-400/45 via-teal-500/20 to-slate-950",
  },
  campaignstudio: {
    label: "Campaign Studio",
    accent: "#f472b6",
    gradient: "from-fuchsia-400/45 via-rose-500/20 to-slate-950",
  },
  platform: {
    label: "Director Studio",
    accent: "#a78bfa",
    gradient: "from-violet-400/40 via-slate-500/15 to-slate-950",
  },
};
