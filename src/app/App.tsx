import { useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Inspector } from "@/components/layout/Inspector";
import { Dashboard } from "@/features/dashboard/Dashboard";
import { ProjectWorkspace } from "@/features/projects/ProjectWorkspace";
import { SettingsView } from "@/features/settings/SettingsView";
import { BrandKitManager } from "@/features/brandkits/BrandKitManager";
import { AssetLibrary } from "@/features/assets/AssetLibrary";
import { CharacterBible } from "@/features/characters/CharacterBible";
import { WorldBible } from "@/features/world/WorldBible";
import { PropBible } from "@/features/props/PropBible";
import { ScriptStudio } from "@/features/scripts/ScriptStudio";
import { AnimationLab } from "@/features/animation/AnimationLab";
import { BibleExport } from "@/features/export/BibleExport";
import { ApiKeyDashboard } from "@/features/apikeys/ApiKeyDashboard";
import { ModelRegistryView } from "@/features/models/ModelRegistryView";
import { SongStudio } from "@/features/song/SongStudio";
import { MvDirector } from "@/features/mvdirector/MvDirector";
import { MagicOutputScreen } from "@/features/mvdirector/MagicOutputScreen";
import { CastView } from "@/features/cast/CastView";
import { ChoreographyView } from "@/features/choreography/ChoreographyView";
import { TimelineView } from "@/features/timeline/TimelineView";
import { TemplatesView } from "@/features/templates/TemplatesView";
import { HelpCenter } from "@/features/help/HelpCenter";
import { WelcomeScreen } from "@/features/welcome/WelcomeScreen";
import { NewProjectWizard } from "@/features/projects/NewProjectWizard";
import { MagicDirect } from "@/features/mvdirector/MagicDirect";
import { SessionGuard } from "@/features/recovery/SessionGuard";
import { MagicFlowButton } from "@/components/magic/MagicFlowButton";
import { MiniPlayer } from "@/components/magic/MiniPlayer";
import { DirectorWizard } from "@/features/director/DirectorWizard";
import { Toast } from "@/components/ui/toast";
import { GlobalSearch } from "@/features/search/GlobalSearch";
import { useGlobalShortcuts } from "@/lib/useGlobalShortcuts";
import { installUndo } from "@/lib/undo";
import { useAppStore } from "@/store/useAppStore";

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
