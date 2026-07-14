import { create } from "zustand";
import {
  getShowWelcome,
  getActiveSongId,
  setActiveSongId,
  getStudioMode,
  setStudioMode as persistStudioMode,
  getSidebarCollapsed,
  setSidebarCollapsed as persistSidebarCollapsed,
  type StudioMode,
} from "@/platform/lib/settings";
import { saveActiveTemplateId } from "@/platform/lib/templates";
import {
  loadBoundDemoProduction,
  loadBoundProductions,
  saveBoundProductionTemplate,
  templateForBoundProduction,
} from "@/platform/lib/appBindings";

/** Resolve the template to show for a song: the song's own memory, else global. */
function templateForSong(songId: string | null): string | null {
  return templateForBoundProduction(songId);
}

export type View =
  | "song"
  | "mvdirector"
  | "magicoutput"
  | "cast"
  | "choreography"
  | "timeline"
  | "templates"
  | "help"
  | "dashboard"
  | "projects"
  | "project"
  | "settings"
  | "brandkits"
  | "assets"
  | "characters"
  | "world"
  | "props"
  | "scripts"
  | "animation"
  | "export"
  | "apikeys"
  | "models"
  | "motionstudio"
  | "glamstudio"
  | "webstudio"
  | "campaignstudio";
export type WorkspaceMode =
  "storyboard" | "camera" | "lighting" | "audio" | "moodboard" | "prompt" | "exports";

interface AppState {
  view: View;
  activeProjectId: string | null;
  activeSongId: string | null;
  activeTemplateId: string | null;
  workspaceMode: WorkspaceMode;
  inspectorOpen: boolean;
  welcomeOpen: boolean;
  wizardOpen: boolean;
  /** Song id currently being auto-directed by the "Direct This Music Video" flow. */
  magicSongId: string | null;
  /** True when the user launched the Magic Flow but needs to import a song first. */
  pendingMagic: boolean;
  /** The first-run Director Wizard (blank-canvas → fully planned music video). */
  directorOpen: boolean;
  /** Global command-palette search (Ctrl+K). */
  searchOpen: boolean;
  /** Epoch ms of the last autosave snapshot (drives the "Saved" indicator). */
  lastSavedAt: number | null;
  /** Bumped after an undo/redo restore to remount views so they re-read storage. */
  dataVersion: number;
  /** Shot id to scroll-to + highlight when the Timeline opens (cross-view focus). */
  focusedShotId: string | null;
  /** When true, the Timeline opens straight into the Render dialog — the
   *  Magic Mode "Render Video" button's entry point, so clicking it never
   *  drops the user onto the bare scene lanes unannounced. */
  timelineAutoRender: boolean;
  /** Platform-wide progressive-disclosure tier (Director / Studio / Creator).
   *  Presentation-only — switching never loses work. Persisted via settings. */
  studioMode: StudioMode;
  setStudioMode: (mode: StudioMode) => void;

  openSong: () => void;
  openMvDirector: () => void;
  /** Land here after Magic Mode finishes — the friendly result screen, not the
   *  full Director UI. Director Mode is reached only via its own button. */
  openMagicOutput: () => void;
  openCast: () => void;
  openChoreography: () => void;
  openTimeline: () => void;
  /** Jump straight to the Timeline's Render dialog (Magic Mode's Render Video). */
  openTimelineToRender: () => void;
  clearTimelineAutoRender: () => void;
  /** Jump to the Timeline and highlight a specific shot. */
  focusShotInTimeline: (shotId: string) => void;
  clearFocusedShot: () => void;
  openTemplates: () => void;
  openHelp: () => void;
  setWelcomeOpen: (open: boolean) => void;
  setWizardOpen: (open: boolean) => void;
  setMagicSongId: (id: string | null) => void;
  setPendingMagic: (v: boolean) => void;
  /** Launch the Magic Flow: direct the active/most-recent song, or guide to import. */
  startMagicFlow: () => void;
  /** Open the Music Video guided flow (the main "Direct My Music Video" CTA). */
  openMusicVideoGuidedFlow: () => void;
  setDirectorOpen: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  /** Load the prebuilt demo production and open it in the MV Director. */
  openDemoProject: () => void;
  setLastSavedAt: (ts: number) => void;
  /** Re-read active song/template from storage + remount views (after undo/redo). */
  syncFromStorage: () => void;
  setActiveSong: (id: string | null) => void;
  setActiveTemplate: (id: string | null) => void;
  openDashboard: () => void;
  openSettings: () => void;
  openBrandKits: () => void;
  openAssets: () => void;
  openCharacters: () => void;
  openWorld: () => void;
  openProps: () => void;
  openScripts: () => void;
  openAnimation: () => void;
  openExport: () => void;
  openApiKeys: () => void;
  openModels: () => void;
  openMotionStudio: () => void;
  openGlamStudio: () => void;
  openWebStudio: () => void;
  openCampaignStudio: () => void;
  openProject: (id: string) => void;
  /** Deep-open a specific project in its owning studio (from Recent / Project Hub). */
  openModuleProject: (moduleId: OpenableModuleId, projectId: string) => void;
  /** A module reads this on mount to select the project a deep-open requested. */
  pendingProjectOpen: { moduleId: OpenableModuleId; projectId: string } | null;
  consumePendingProjectOpen: (moduleId: OpenableModuleId) => string | null;
  setWorkspaceMode: (mode: WorkspaceMode) => void;
  toggleInspector: () => void;
  openProjects: () => void;
  /** Left nav rail collapsed to icon-only width. Persisted across sessions. */
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

const initialSongId = getActiveSongId();

/** Modules whose projects can be deep-opened from the Project Hub / Recent. */
export type OpenableModuleId = "musicvideo" | "motion" | "glam" | "web" | "campaign";

const MODULE_HOME_VIEW: Record<OpenableModuleId, View> = {
  musicvideo: "song",
  motion: "motionstudio",
  glam: "glamstudio",
  web: "webstudio",
  campaign: "campaignstudio",
};

export const useAppStore = create<AppState>((set, get) => ({
  view: "dashboard",
  activeProjectId: null,
  pendingProjectOpen: null,
  activeSongId: initialSongId,
  activeTemplateId: templateForSong(initialSongId),
  workspaceMode: "storyboard",
  inspectorOpen: true,
  welcomeOpen: getShowWelcome(),
  wizardOpen: false,
  magicSongId: null,
  pendingMagic: false,
  directorOpen: false,
  searchOpen: false,
  lastSavedAt: null,
  dataVersion: 0,
  focusedShotId: null,
  timelineAutoRender: false,
  studioMode: getStudioMode(),
  setStudioMode: (mode: StudioMode) => {
    persistStudioMode(mode);
    set({ studioMode: mode });
  },

  openSong: () => set({ view: "song", activeProjectId: null }),
  openModuleProject: (moduleId, projectId) => {
    if (moduleId === "musicvideo") {
      // MV selects its project through the global active song, not a pending signal.
      setActiveSongId(projectId);
      set({ view: "song", activeSongId: projectId, activeProjectId: null, pendingProjectOpen: null });
      return;
    }
    set({ view: MODULE_HOME_VIEW[moduleId], pendingProjectOpen: { moduleId, projectId } });
  },
  consumePendingProjectOpen: (moduleId) => {
    const pending = get().pendingProjectOpen;
    if (pending && pending.moduleId === moduleId) {
      set({ pendingProjectOpen: null });
      return pending.projectId;
    }
    return null;
  },
  openMvDirector: () => set({ view: "mvdirector" }),
  openMagicOutput: () => set({ view: "magicoutput" }),
  openCast: () => set({ view: "cast" }),
  openChoreography: () => set({ view: "choreography" }),
  openTimeline: () => set({ view: "timeline" }),
  openTimelineToRender: () => set({ view: "timeline", timelineAutoRender: true }),
  clearTimelineAutoRender: () => set({ timelineAutoRender: false }),
  focusShotInTimeline: (shotId: string) => set({ view: "timeline", focusedShotId: shotId }),
  clearFocusedShot: () => set({ focusedShotId: null }),
  openTemplates: () => set({ view: "templates" }),
  openHelp: () => set({ view: "help" }),
  setWelcomeOpen: (welcomeOpen) => set({ welcomeOpen }),
  setWizardOpen: (wizardOpen) => set({ wizardOpen }),
  setMagicSongId: (magicSongId) => set({ magicSongId }),
  setPendingMagic: (pendingMagic) => set({ pendingMagic }),
  startMagicFlow: () =>
    set((s) => {
      const songs = loadBoundProductions();
      const target =
        (s.activeSongId && songs.find((x) => x.id === s.activeSongId)?.id) || songs[0]?.id || null;
      if (target) {
        setActiveSongId(target);
        return {
          welcomeOpen: false,
          activeSongId: target,
          activeTemplateId: templateForSong(target),
          magicSongId: target,
          pendingMagic: false,
        };
      }
      // No song yet — guide the user to import one, then auto-continue.
      return { welcomeOpen: false, view: "song", pendingMagic: true };
    }),
  openMusicVideoGuidedFlow: () =>
    set({ directorOpen: true, welcomeOpen: false, wizardOpen: false }),
  setDirectorOpen: (directorOpen) => set({ directorOpen }),
  setSearchOpen: (searchOpen) => set({ searchOpen }),
  openDemoProject: () => {
    void loadBoundDemoProduction().then((songId) => {
      setActiveSongId(songId);
      set((s) => ({
        welcomeOpen: false,
        view: "mvdirector",
        activeSongId: songId,
        activeTemplateId: templateForSong(songId),
        dataVersion: s.dataVersion + 1,
      }));
    });
  },
  setLastSavedAt: (lastSavedAt) => set({ lastSavedAt }),
  syncFromStorage: () =>
    set((s) => {
      const songId = getActiveSongId();
      return {
        activeSongId: songId,
        activeTemplateId: templateForSong(songId),
        dataVersion: s.dataVersion + 1,
      };
    }),
  setActiveSong: (id) => {
    // Persist the active production and restore THAT song's remembered template.
    setActiveSongId(id);
    const tmpl = templateForSong(id);
    saveActiveTemplateId(tmpl);
    set({ activeSongId: id, activeTemplateId: tmpl });
  },
  setActiveTemplate: (id) => {
    saveActiveTemplateId(id);
    // Remember the template on the active song so each production keeps its own.
    set((s) => {
      if (s.activeSongId) saveBoundProductionTemplate(s.activeSongId, id);
      return { activeTemplateId: id };
    });
  },
  openDashboard: () => set({ view: "dashboard", activeProjectId: null }),
  openSettings: () => set({ view: "settings" }),
  openBrandKits: () => set({ view: "brandkits" }),
  openAssets: () => set({ view: "assets" }),
  openCharacters: () => set({ view: "characters" }),
  openWorld: () => set({ view: "world" }),
  openProps: () => set({ view: "props" }),
  openScripts: () => set({ view: "scripts" }),
  openAnimation: () => set({ view: "animation" }),
  openExport: () => set({ view: "export" }),
  openApiKeys: () => set({ view: "apikeys" }),
  openModels: () => set({ view: "models" }),
  openMotionStudio: () => set({ view: "motionstudio", activeProjectId: null }),
  openGlamStudio: () => set({ view: "glamstudio", activeProjectId: null }),
  openWebStudio: () => set({ view: "webstudio", activeProjectId: null }),
  openCampaignStudio: () => set({ view: "campaignstudio", activeProjectId: null }),
  openProject: (id) => set({ view: "project", activeProjectId: id, workspaceMode: "storyboard" }),
  setWorkspaceMode: (workspaceMode) => set({ workspaceMode }),
  toggleInspector: () => set((s) => ({ inspectorOpen: !s.inspectorOpen })),
  openProjects: () => set({ view: "projects" }),
  sidebarCollapsed: getSidebarCollapsed(),
  toggleSidebar: () =>
    set((s) => {
      const next = !s.sidebarCollapsed;
      persistSidebarCollapsed(next);
      return { sidebarCollapsed: next };
    }),
}));
