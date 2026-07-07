import { useEffect } from "react";
import { Sidebar } from "@/platform/components/layout/Sidebar";
import { Inspector } from "@/platform/components/layout/Inspector";
import { Dashboard } from "@/platform/features/dashboard/Dashboard";
import { ProjectWorkspace } from "@/platform/features/projects/ProjectWorkspace";
import { SettingsView } from "@/platform/features/settings/SettingsView";
import { BrandKitManager } from "@/platform/features/brandkits/BrandKitManager";
import { AssetLibrary } from "@/platform/features/assets/AssetLibrary";
import { CharacterBible } from "@/platform/features/characters/CharacterBible";
import { WorldBible } from "@/platform/features/world/WorldBible";
import { PropBible } from "@/platform/features/props/PropBible";
import { ScriptStudio } from "@/platform/features/scripts/ScriptStudio";
import { AnimationLab } from "@/apps/music-video/features/animation/AnimationLab";
import { BibleExport } from "@/platform/features/export/BibleExport";
import { ApiKeyDashboard } from "@/platform/features/apikeys/ApiKeyDashboard";
import { ModelRegistryView } from "@/platform/features/models/ModelRegistryView";
import { SongStudio } from "@/apps/music-video/features/song/SongStudio";
import { MvDirector } from "@/apps/music-video/features/mvdirector/MvDirector";
import { MagicOutputScreen } from "@/apps/music-video/features/mvdirector/MagicOutputScreen";
import { CastView } from "@/apps/music-video/features/cast/CastView";
import { ChoreographyView } from "@/apps/music-video/features/choreography/ChoreographyView";
import { TimelineView } from "@/apps/music-video/features/timeline/TimelineView";
import { TemplatesView } from "@/platform/features/templates/TemplatesView";
import { HelpCenter } from "@/platform/features/help/HelpCenter";
import { WelcomeScreen } from "@/platform/features/welcome/WelcomeScreen";
import { NewProjectWizard } from "@/platform/features/projects/NewProjectWizard";
import { MagicDirect } from "@/apps/music-video/features/mvdirector/MagicDirect";
import { SessionGuard } from "@/platform/features/recovery/SessionGuard";
import { MagicFlowButton } from "@/apps/music-video/components/magic/MagicFlowButton";
import { MiniPlayer } from "@/apps/music-video/components/magic/MiniPlayer";
import { DirectorWizard } from "@/apps/music-video/features/director/DirectorWizard";
import { Toast } from "@/platform/components/ui/toast";
import { GlobalSearch } from "@/platform/features/search/GlobalSearch";
import { useGlobalShortcuts } from "@/platform/lib/useGlobalShortcuts";
import { installUndo } from "@/platform/lib/undo";
import { useAppStore } from "@/platform/store/useAppStore";

export default function App() {
  const view = useAppStore((s) => s.view);
  const inspectorOpen = useAppStore((s) => s.inspectorOpen);
  const welcomeOpen = useAppStore((s) => s.welcomeOpen);
  const wizardOpen = useAppStore((s) => s.wizardOpen);
  const magicSongId = useAppStore((s) => s.magicSongId);
  const directorOpen = useAppStore((s) => s.directorOpen);
  const dataVersion = useAppStore((s) => s.dataVersion);
  useGlobalShortcuts();
  useEffect(() => {
    installUndo();
  }, []);

  // The Magic Flow is always one click away — except when an overlay is up, or
  // on the surfaces that already show the big hero button.
  const showFab =
    !welcomeOpen &&
    !wizardOpen &&
    !magicSongId &&
    !directorOpen &&
    view !== "dashboard" &&
    view !== "song" &&
    view !== "magicoutput";

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* LEFT — navigation, projects */}
      <Sidebar />

      {/* CENTER — workspace. Keyed by dataVersion so an undo/redo restore
          remounts the active view and it re-reads the restored state. */}
      <main key={dataVersion} className="flex min-w-0 flex-1 flex-col">
        {view === "song" && <SongStudio />}
        {view === "mvdirector" && <MvDirector />}
        {view === "magicoutput" && <MagicOutputScreen />}
        {view === "cast" && <CastView />}
        {view === "choreography" && <ChoreographyView />}
        {view === "timeline" && <TimelineView />}
        {view === "templates" && <TemplatesView />}
        {view === "help" && <HelpCenter />}
        {view === "dashboard" && <Dashboard />}
        {view === "project" && <ProjectWorkspace />}
        {view === "settings" && <SettingsView />}
        {view === "brandkits" && <BrandKitManager />}
        {view === "assets" && <AssetLibrary />}
        {view === "characters" && <CharacterBible />}
        {view === "world" && <WorldBible />}
        {view === "props" && <PropBible />}
        {view === "scripts" && <ScriptStudio />}
        {view === "animation" && <AnimationLab />}
        {view === "export" && <BibleExport />}
        {view === "apikeys" && <ApiKeyDashboard />}
        {view === "models" && <ModelRegistryView />}
      </main>

      {/* RIGHT — inspector (only in project view) */}
      {view === "project" && inspectorOpen && <Inspector />}

      {/* First-run welcome overlay + new-project wizard */}
      <WelcomeScreen />
      <NewProjectWizard />
      <MagicDirect />
      <DirectorWizard />
      <SessionGuard />
      <MiniPlayer />
      <GlobalSearch />
      <Toast />
      {showFab && <MagicFlowButton variant="fab" />}
    </div>
  );
}
