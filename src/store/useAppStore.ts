import { create } from "zustand";
import { getShowWelcome, getActiveSongId, setActiveSongId } from "@/lib/settings";
import { loadActiveTemplateId, saveActiveTemplateId } from "@/lib/templates";
import { loadSongs, saveSong } from "@/lib/songBrain";
import { loadDemoProject } from "@/lib/demoProject";

/** Resolve the template to show for a song: the song's own memory, else global. */
function templateForSong(songId: string | null): string | null {
  if (songId) {
    const s = loadSongs().find((x) => x.id === songId);
    if (s) return s.templateId ?? null;
  }
  return loadActiveTemplateId();
}

export type View =
  | "song"
  | "mvdirector"
  | "cast"
  | "choreography"
  | "timeline"
  | "templates"
  | "help"
  | "dashboard"
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
  | "models";
export type WorkspaceMode =
  | "storyboard"
  | "camera"
  | "lighting"
  | "audio"
  | "moodboard"
  | "prompt"
  | "exports";

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

  openSong: () => void;
  openMvDirector: () => void;
  openCast: () => void;
  openChoreography: () => void;
  openTimeline: () => void;
  openTemplates: () => void;
  openHelp: () => void;
  setWelcomeOpen: (open: boolean) => void;
  setWizardOpen: (open: boolean) => void;
  setMagicSongId: (id: string | null) => void;
  setPendingMagic: (v: boolean) => void;
  /** Launch the Magic Flow: direct the active/most-recent song, or guide to import. */
  startMagicFlow: () => void;
  /** Open the blank-canvas Director Wizard (the main "Direct My Music Video" CTA). */
  openDirectorWizard: () => void;
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
  openProject: (id: string) => void;
  setWorkspaceMode: (mode: WorkspaceMode) => void;
  toggleInspector: () => void;
}

const initialSongId = getActiveSongId();

export const useAppStore = create<AppState>((set) => ({
  view: "song",
  activeProjectId: null,
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

  openSong: () => set({ view: "song", activeProjectId: null }),
  openMvDirector: () => set({ view: "mvdirector" }),
  openCast: () => set({ view: "cast" }),
  openChoreography: () => set({ view: "choreography" }),
  openTimeline: () => set({ view: "timeline" }),
  openTemplates: () => set({ view: "templates" }),
  openHelp: () => set({ view: "help" }),
  setWelcomeOpen: (welcomeOpen) => set({ welcomeOpen }),
  setWizardOpen: (wizardOpen) => set({ wizardOpen }),
  setMagicSongId: (magicSongId) => set({ magicSongId }),
  setPendingMagic: (pendingMagic) => set({ pendingMagic }),
  startMagicFlow: () =>
    set((s) => {
      const songs = loadSongs();
      const target =
        (s.activeSongId && songs.find((x) => x.id === s.activeSongId)?.id) ||
        songs[0]?.id ||
        null;
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
  openDirectorWizard: () =>
    set({ directorOpen: true, welcomeOpen: false, wizardOpen: false }),
  setDirectorOpen: (directorOpen) => set({ directorOpen }),
  setSearchOpen: (searchOpen) => set({ searchOpen }),
  openDemoProject: () => {
    void loadDemoProject().then((songId) => {
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
      if (s.activeSongId) {
        const songs = loadSongs();
        const song = songs.find((x) => x.id === s.activeSongId);
        if (song) saveSong({ ...song, templateId: id ?? undefined });
      }
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
  openProject: (id) =>
    set({ view: "project", activeProjectId: id, workspaceMode: "storyboard" }),
  setWorkspaceMode: (workspaceMode) => set({ workspaceMode }),
  toggleInspector: () => set((s) => ({ inspectorOpen: !s.inspectorOpen })),
}));
