import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Settings,
  Film,
  Folder,
  Sparkles,
  Palette,
  Library,
  Users,
  KeyRound,
  FileText,
  Globe,
  Package,
  Clapperboard,
  BookMarked,
  Music,
  Video,
  Footprints,
  LayoutList,
  LifeBuoy,
  LayoutTemplate,
  Plus,
  Check,
  Boxes,
  Search as SearchIcon,
  Megaphone,
} from "lucide-react";
import { api, isTauri } from "@/platform/lib/ipc";
import { NAV_MODEL, moduleForView, type NavIcon, type NavItemModel } from "@/platform/lib/navModel";
import { loadRouterConfig, ROUTER_MODES } from "@/platform/lib/providers";
import { STUDIO_MODES } from "@/platform/lib/settings";
import { cn } from "@/platform/lib/utils";
import { useAppStore, type View } from "@/platform/store/useAppStore";
import { ThemeToggle } from "@/platform/components/ui/theme-toggle";

const ICONS: Record<NavIcon, React.ReactNode> = {
  music: <Music className="h-4 w-4" />,
  motion: <Boxes className="h-4 w-4" />,
  sparkles: <Sparkles className="h-4 w-4" />,
  globe: <Globe className="h-4 w-4" />,
  megaphone: <Megaphone className="h-4 w-4" />,
  templates: <LayoutTemplate className="h-4 w-4" />,
  users: <Users className="h-4 w-4" />,
  package: <Package className="h-4 w-4" />,
  library: <Library className="h-4 w-4" />,
  palette: <Palette className="h-4 w-4" />,
  dashboard: <LayoutDashboard className="h-4 w-4" />,
  file: <FileText className="h-4 w-4" />,
  clapperboard: <Clapperboard className="h-4 w-4" />,
  book: <BookMarked className="h-4 w-4" />,
  key: <KeyRound className="h-4 w-4" />,
  settings: <Settings className="h-4 w-4" />,
  video: <Video className="h-4 w-4" />,
  footprints: <Footprints className="h-4 w-4" />,
  list: <LayoutList className="h-4 w-4" />,
  boxes: <Boxes className="h-4 w-4" />,
};

export function Sidebar() {
  const view = useAppStore((s) => s.view);
  const activeProjectId = useAppStore((s) => s.activeProjectId);
  const openProject = useAppStore((s) => s.openProject);
  const setWizardOpen = useAppStore((s) => s.setWizardOpen);
  const setSearchOpen = useAppStore((s) => s.setSearchOpen);
  const lastSavedAt = useAppStore((s) => s.lastSavedAt);
  const studioMode = useAppStore((s) => s.studioMode);
  const setStudioMode = useAppStore((s) => s.setStudioMode);
  const openHelp = useAppStore((s) => s.openHelp);
  const navigateTo = useNavigateToView();

  const activeModule = moduleForView(view);
  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: api.listProjects,
  });

  return (
    <aside
      aria-label="Primary navigation"
      className="flex w-60 shrink-0 flex-col border-r border-border bg-surface"
    >
      <button
        type="button"
        onClick={() => navigateTo("dashboard")}
        className="flex items-center gap-2 px-4 py-4 text-left"
      >
        <div className="grad-primary flex h-8 w-8 items-center justify-center rounded-lg shadow-sm shadow-primary/30">
          <Film className="h-4 w-4 text-white" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold">Director Studio</div>
          <div className="text-[10px] text-muted">Wheelbarrow</div>
        </div>
      </button>

      <div className="space-y-1.5 px-3 pb-2">
        <button
          type="button"
          onClick={() => setWizardOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-button)] border border-border px-3 py-2 text-sm font-semibold text-foreground transition hover:border-primary/40 hover:bg-elevated/60"
        >
          <Plus className="h-4 w-4" /> New production
        </button>
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="flex w-full items-center gap-2 rounded-[var(--radius-button)] border border-border px-3 py-1.5 text-xs text-muted transition hover:border-primary/40 hover:text-foreground"
        >
          <SearchIcon className="h-3.5 w-3.5" /> Search
          <kbd className="ml-auto rounded bg-elevated px-1.5 py-0.5 text-[10px]">Ctrl K</kbd>
        </button>
        <div
          role="tablist"
          aria-label="Studio mode"
          className="flex items-center gap-0.5 rounded-[var(--radius-button)] border border-border bg-background/40 p-0.5"
        >
          {STUDIO_MODES.map((mode) => (
            <button
              type="button"
              key={mode.id}
              role="tab"
              aria-selected={studioMode === mode.id}
              onClick={() => setStudioMode(mode.id)}
              title={mode.hint}
              className={cn(
                "flex-1 rounded-[calc(var(--radius-button)-2px)] px-1.5 py-1 text-[11px] font-medium transition-colors",
                studioMode === mode.id
                  ? "bg-primary/15 text-primary"
                  : "text-muted hover:text-foreground"
              )}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {NAV_MODEL.map((section) => (
          <NavGroup key={section.id} label={section.label}>
            {section.items.map((item) => (
              <NavTreeItem
                key={item.id}
                item={item}
                activeView={view}
                activeModule={activeModule}
                onNavigate={navigateTo}
              />
            ))}
          </NavGroup>
        ))}

        {projects.length > 0 && (
          <NavGroup label="Projects">
            {projects.map((project) => (
              <NavItem
                key={project.id}
                icon={<Folder className="h-4 w-4" />}
                label={project.name}
                active={view === "project" && activeProjectId === project.id}
                onClick={() => openProject(project.id)}
              />
            ))}
          </NavGroup>
        )}
      </div>

      <div className="flex flex-col gap-2 border-t border-border p-3">
        <button
          type="button"
          onClick={openHelp}
          className={cn(
            "flex w-full items-center gap-2 rounded-[var(--radius-button)] px-3 py-2 text-sm font-medium transition-colors",
            view === "help"
              ? "bg-primary/12 text-primary"
              : "text-muted hover:bg-elevated hover:text-foreground"
          )}
          title="Help Center (F1)"
        >
          <LifeBuoy className="h-4 w-4" />
          Help &amp; learning
          <span className="ml-auto text-[10px] text-muted">F1</span>
        </button>
        <ThemeToggle />
        <div className="flex items-center gap-2 rounded-[var(--radius-button)] bg-elevated px-3 py-2 text-xs text-muted">
          <Sparkles className="h-3.5 w-3.5 text-accent" />
          <span>{engineLabel()}</span>
        </div>
        <div
          className="flex items-center gap-1.5 px-1 text-[11px] text-muted"
          title="Your work autosaves continuously"
        >
          <Check className="h-3 w-3 text-success" />
          {lastSavedAt ? (
            <span>
              Saved{" "}
              {new Date(lastSavedAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          ) : (
            <span>All changes saved</span>
          )}
        </div>
      </div>
    </aside>
  );
}

function useNavigateToView(): (view: View) => void {
  const openSong = useAppStore((s) => s.openSong);
  const openMvDirector = useAppStore((s) => s.openMvDirector);
  const openCast = useAppStore((s) => s.openCast);
  const openChoreography = useAppStore((s) => s.openChoreography);
  const openTimeline = useAppStore((s) => s.openTimeline);
  const openTemplates = useAppStore((s) => s.openTemplates);
  const openDashboard = useAppStore((s) => s.openDashboard);
  const openSettings = useAppStore((s) => s.openSettings);
  const openBrandKits = useAppStore((s) => s.openBrandKits);
  const openAssets = useAppStore((s) => s.openAssets);
  const openCharacters = useAppStore((s) => s.openCharacters);
  const openWorld = useAppStore((s) => s.openWorld);
  const openProps = useAppStore((s) => s.openProps);
  const openScripts = useAppStore((s) => s.openScripts);
  const openAnimation = useAppStore((s) => s.openAnimation);
  const openExport = useAppStore((s) => s.openExport);
  const openApiKeys = useAppStore((s) => s.openApiKeys);
  const openModels = useAppStore((s) => s.openModels);
  const openMotionStudio = useAppStore((s) => s.openMotionStudio);
  const openGlamStudio = useAppStore((s) => s.openGlamStudio);
  const openWebStudio = useAppStore((s) => s.openWebStudio);
  const openCampaignStudio = useAppStore((s) => s.openCampaignStudio);

  return (nextView: View) => {
    const actions: Partial<Record<View, () => void>> = {
      song: openSong,
      mvdirector: openMvDirector,
      cast: openCast,
      choreography: openChoreography,
      timeline: openTimeline,
      templates: openTemplates,
      dashboard: openDashboard,
      settings: openSettings,
      brandkits: openBrandKits,
      assets: openAssets,
      characters: openCharacters,
      world: openWorld,
      props: openProps,
      scripts: openScripts,
      animation: openAnimation,
      export: openExport,
      apikeys: openApiKeys,
      models: openModels,
      motionstudio: openMotionStudio,
      glamstudio: openGlamStudio,
      webstudio: openWebStudio,
      campaignstudio: openCampaignStudio,
    };
    actions[nextView]?.();
  };
}

function engineLabel(): string {
  const mode = loadRouterConfig().mode;
  if (mode === "local" || !isTauri) return "Local engine · no key";
  const label = ROUTER_MODES.find((candidate) => candidate.id === mode)?.label ?? "Auto";
  return `Router · ${label}`;
}

function NavTreeItem({
  item,
  activeView,
  activeModule,
  onNavigate,
}: {
  item: NavItemModel;
  activeView: View;
  activeModule: ReturnType<typeof moduleForView>;
  onNavigate: (view: View) => void;
}) {
  const expanded = Boolean(
    item.moduleId && item.moduleId === activeModule && item.subItems?.length
  );
  const active = item.moduleId ? item.moduleId === activeModule : item.view === activeView;

  return (
    <div>
      <NavItem
        icon={ICONS[item.icon]}
        label={item.label}
        active={active}
        tone={item.tone}
        onClick={() => onNavigate(item.view)}
      />
      {expanded && (
        <div className="ml-4 mt-1 border-l border-primary/25 pl-2">
          {item.subItems?.map((subItem) => (
            <NavItem
              key={subItem.id}
              icon={ICONS[subItem.icon]}
              label={subItem.label}
              active={subItem.view === activeView}
              compact
              onClick={() => onNavigate(subItem.view)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NavGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-1.5 mt-3 first:mt-1">
      <div className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted/70">
        {label}
      </div>
      {children}
    </div>
  );
}

function NavItem({
  icon,
  label,
  active,
  onClick,
  tone,
  compact,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
  tone?: "violet" | "cyan" | "gold" | "green" | "pink";
  compact?: boolean;
}) {
  const activeTone = {
    violet: "bg-violet-500/12 text-violet-400",
    cyan: "bg-cyan-500/12 text-cyan-400",
    gold: "bg-amber-500/12 text-amber-400",
    green: "bg-emerald-500/12 text-emerald-400",
    pink: "bg-fuchsia-500/12 text-fuchsia-400",
  };
  const barTone = {
    violet: "bg-violet-400",
    cyan: "bg-cyan-400",
    gold: "bg-amber-400",
    green: "bg-emerald-400",
    pink: "bg-fuchsia-400",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex w-full items-center gap-2.5 rounded-[var(--radius-button)] text-sm transition-colors",
        compact ? "px-2 py-1.5 text-xs" : "px-2.5 py-1.5",
        active
          ? tone
            ? activeTone[tone]
            : "bg-primary/12 text-primary"
          : "text-muted hover:bg-elevated/60 hover:text-foreground"
      )}
    >
      {active && (
        <span
          className={cn(
            "absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full",
            tone ? barTone[tone] : "bg-primary"
          )}
        />
      )}
      <span className={cn("shrink-0", active && !tone && "text-primary")}>{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );
}
