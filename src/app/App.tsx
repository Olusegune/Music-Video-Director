import { lazy, Suspense, useEffect } from "react";
import { Sidebar } from "@/platform/components/layout/Sidebar";
import { Inspector } from "@/platform/components/layout/Inspector";
import { StartupSplash } from "@/platform/components/layout/StartupSplash";
import { StudioErrorBoundary } from "@/platform/components/layout/StudioErrorBoundary";
import { moduleManifestForView } from "@/platform/lib/moduleManifest";
import { Dashboard } from "@/platform/features/dashboard/Dashboard";
import { AnimationLab } from "@/apps/music-video/features/animation/AnimationLab";
import { SongStudio } from "@/apps/music-video/features/song/SongStudio";
import { MvDirector } from "@/apps/music-video/features/mvdirector/MvDirector";
import { MagicOutputScreen } from "@/apps/music-video/features/mvdirector/MagicOutputScreen";
import { CastView } from "@/apps/music-video/features/cast/CastView";
import { ChoreographyView } from "@/apps/music-video/features/choreography/ChoreographyView";
import { TimelineView } from "@/apps/music-video/features/timeline/TimelineView";
import { WelcomeScreen } from "@/platform/features/welcome/WelcomeScreen";
import { NewProjectWizard } from "@/platform/features/projects/NewProjectWizard";
import { MagicDirect } from "@/apps/music-video/features/mvdirector/MagicDirect";
import { SessionGuard } from "@/platform/features/recovery/SessionGuard";
import { MiniPlayer } from "@/apps/music-video/components/magic/MiniPlayer";
import { MusicVideoGuidedFlow } from "@/apps/music-video/features/director/MusicVideoGuidedFlow";
import { Toast } from "@/platform/components/ui/toast";
import { GlobalSearch } from "@/platform/features/search/GlobalSearch";
import { useGlobalShortcuts } from "@/platform/lib/useGlobalShortcuts";
import { installUndo } from "@/platform/lib/undo";
import { useAppStore } from "@/platform/store/useAppStore";
import { installMusicVideoBindings } from "@/apps/music-video/musicVideoBindings";
import { installProjectAdapters } from "@/app/projectAdapters";
import { hydrateStartupStores, markAppShellMounted } from "@/platform/lib/startupReadiness";

const MotionStudio = lazy(() =>
  import("@/apps/motion-studio/MotionStudio").then((module) => ({
    default: module.MotionStudio,
  }))
);
const GlamStudio = lazy(() =>
  import("@/apps/glam-studio/GlamStudio").then((module) => ({
    default: module.GlamStudio,
  }))
);
const WebStudio = lazy(() =>
  import("@/apps/webstudio/WebStudio").then((module) => ({
    default: module.WebStudio,
  }))
);
const CampaignStudio = lazy(() =>
  import("@/apps/campaign/CampaignStudio").then((module) => ({
    default: module.CampaignStudio,
  }))
);
const ProjectWorkspace = lazy(() =>
  import("@/platform/features/projects/ProjectWorkspace").then((module) => ({
    default: module.ProjectWorkspace,
  }))
);
const SettingsView = lazy(() =>
  import("@/platform/features/settings/SettingsView").then((module) => ({
    default: module.SettingsView,
  }))
);
const BrandKitManager = lazy(() =>
  import("@/platform/features/brandkits/BrandKitManager").then((module) => ({
    default: module.BrandKitManager,
  }))
);
const AssetLibrary = lazy(() =>
  import("@/platform/features/assets/AssetLibrary").then((module) => ({
    default: module.AssetLibrary,
  }))
);
const CharacterBible = lazy(() =>
  import("@/platform/features/characters/CharacterBible").then((module) => ({
    default: module.CharacterBible,
  }))
);
const WorldBible = lazy(() =>
  import("@/platform/features/world/WorldBible").then((module) => ({
    default: module.WorldBible,
  }))
);
const PropBible = lazy(() =>
  import("@/platform/features/props/PropBible").then((module) => ({
    default: module.PropBible,
  }))
);
const ScriptStudio = lazy(() =>
  import("@/platform/features/scripts/ScriptStudio").then((module) => ({
    default: module.ScriptStudio,
  }))
);
const BibleExport = lazy(() =>
  import("@/platform/features/export/BibleExport").then((module) => ({
    default: module.BibleExport,
  }))
);
const ApiKeyDashboard = lazy(() =>
  import("@/platform/features/apikeys/ApiKeyDashboard").then((module) => ({
    default: module.ApiKeyDashboard,
  }))
);
const ModelRegistryView = lazy(() =>
  import("@/platform/features/models/ModelRegistryView").then((module) => ({
    default: module.ModelRegistryView,
  }))
);
const TemplatesView = lazy(() =>
  import("@/platform/features/templates/TemplatesView").then((module) => ({
    default: module.TemplatesView,
  }))
);
const HelpCenter = lazy(() =>
  import("@/platform/features/help/HelpCenter").then((module) => ({
    default: module.HelpCenter,
  }))
);

installMusicVideoBindings();
installProjectAdapters();

function StudioLoading() {
  return (
    <div className="flex flex-1 items-center justify-center bg-background">
      <div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-5 py-4 text-sm text-muted shadow-card">
        <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
        Opening studio…
      </div>
    </div>
  );
}

export default function App() {
  const view = useAppStore((s) => s.view);
  const inspectorOpen = useAppStore((s) => s.inspectorOpen);
  const dataVersion = useAppStore((s) => s.dataVersion);
  useGlobalShortcuts();
  useEffect(() => {
    installUndo();
    hydrateStartupStores();
    markAppShellMounted();
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* LEFT — navigation, projects */}
      <Sidebar />

      {/* CENTER — workspace. Keyed by dataVersion so an undo/redo restore
          remounts the active view and it re-reads the restored state. */}
      <main
        key={dataVersion}
        className={`studio-view studio-view-${view} flex min-w-0 flex-1 flex-col`}
      >
        <StudioErrorBoundary key={view} label={moduleManifestForView(view)?.label}>
          <Suspense fallback={<StudioLoading />}>
            {view === "song" && <SongStudio />}
            {view === "mvdirector" && <MvDirector />}
            {view === "magicoutput" && <MagicOutputScreen />}
            {view === "cast" && <CastView />}
            {view === "choreography" && <ChoreographyView />}
            {view === "timeline" && <TimelineView />}
            {view === "motionstudio" && <MotionStudio />}
            {view === "glamstudio" && <GlamStudio />}
            {view === "webstudio" && <WebStudio />}
            {view === "campaignstudio" && <CampaignStudio />}
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
          </Suspense>
        </StudioErrorBoundary>
      </main>

      {/* RIGHT — inspector (only in project view) */}
      {view === "project" && inspectorOpen && <Inspector />}

      {/* First-run welcome overlay + new-project wizard */}
      <WelcomeScreen />
      <NewProjectWizard />
      <MagicDirect />
      <MusicVideoGuidedFlow />
      <SessionGuard />
      <MiniPlayer />
      <GlobalSearch />
      <Toast />
      <StartupSplash />
    </div>
  );
}
