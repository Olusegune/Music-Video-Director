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
  UsersRound,
  LifeBuoy,
  LayoutTemplate,
  Plus,
  Check,
  Boxes,
  Search as SearchIcon,
} from "lucide-react";
import { api, isTauri } from "@/platform/lib/ipc";
import { loadRouterConfig, ROUTER_MODES } from "@/platform/lib/providers";
import { STUDIO_MODES } from "@/platform/lib/settings";
import { cn } from "@/platform/lib/utils";
import { useAppStore } from "@/platform/store/useAppStore";
import { ThemeToggle } from "@/platform/components/ui/theme-toggle";

export function Sidebar() {
  const {
    view,
    activeProjectId,
    openSong,
    openMvDirector,
    openCast,
    openChoreography,
    openTimeline,
    openTemplates,
    openHelp,
    openDashboard,
    openSettings,
    openBrandKits,
    openAssets,
    openCharacters,
    openWorld,
    openProps,
    openScripts,
    openAnimation,
    openExport,
    openApiKeys,
    openModels,
    openMotionStudio,
    openProject,
    setWizardOpen,
    openDirectorWizard,
    setSearchOpen,
    lastSavedAt,
    studioMode,
    setStudioMode,
  } = useAppStore();

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: api.listProjects,
  });

  return (
    <aside
      aria-label="Primary navigation"
      className="flex w-60 shrink-0 flex-col border-r border-border bg-surface"
    >
      {/* Brand */}
      <div className="flex items-center gap-2 px-4 py-4">
        <div className="grad-primary flex h-8 w-8 items-center justify-center rounded-lg shadow-sm shadow-primary/30">
          <Film className="h-4 w-4 text-white" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold">AI Director</div>
          <div className="text-[10px] text-muted">Wheelbarrow MotionForge</div>
        </div>
      </div>

      {/* Always-visible primary action — start a new production from anywhere. */}
      <div className="space-y-1.5 px-3 pb-2">
        <button
          onClick={() => setWizardOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-button)] border border-border px-3 py-2 text-sm font-semibold text-foreground transition hover:border-primary/40 hover:bg-elevated/60"
        >
          <Plus className="h-4 w-4" /> New production
        </button>
        <button
          onClick={openDirectorWizard}
          title="Magic Mode — direct a full music video in one click"
          className="grad-gold flex w-full items-center justify-center gap-2 rounded-[var(--radius-button)] px-3 py-2 text-sm font-semibold text-[var(--color-gold-foreground)] shadow-sm shadow-[var(--color-gold)]/25 transition hover:brightness-105"
        >
          <Clapperboard className="h-4 w-4" /> Magic Mode
        </button>
        <button
          onClick={() => setSearchOpen(true)}
          className="flex w-full items-center gap-2 rounded-[var(--radius-button)] border border-border px-3 py-1.5 text-xs text-muted transition hover:border-primary/40 hover:text-foreground"
        >
          <SearchIcon className="h-3.5 w-3.5" /> Search
          <kbd className="ml-auto rounded bg-elevated px-1.5 py-0.5 text-[10px]">Ctrl K</kbd>
        </button>
        {/* Platform-wide disclosure tier — every surface follows this switch.
            Presentation-only: switching modes never loses work. */}
        <div
          role="tablist"
          aria-label="Studio mode"
          className="flex items-center gap-0.5 rounded-[var(--radius-button)] border border-border bg-background/40 p-0.5"
        >
          {STUDIO_MODES.map((m) => (
            <button
              key={m.id}
              role="tab"
              aria-selected={studioMode === m.id}
              onClick={() => setStudioMode(m.id)}
              title={m.hint}
              className={cn(
                "flex-1 rounded-[calc(var(--radius-button)-2px)] px-1.5 py-1 text-[11px] font-medium transition-colors",
                studioMode === m.id
                  ? "bg-primary/15 text-primary"
                  : "text-muted hover:text-foreground"
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grouped nav — reads as a director's production flow, top to bottom. */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        <NavGroup label="Director Studio apps">
          <NavItem icon={<Music className="h-4 w-4" />} label="Music Video Director" active={view === "song" || view === "mvdirector"} onClick={openSong} />
          <NavItem icon={<Boxes className="h-4 w-4" />} label="Motion Studio" active={view === "motionstudio"} onClick={openMotionStudio} />
        </NavGroup>

        <NavGroup label="Director Mode / Advanced">
          <NavItem icon={<LayoutTemplate className="h-4 w-4" />} label="Templates" active={view === "templates"} onClick={openTemplates} />
          <NavItem icon={<Music className="h-4 w-4" />} label="Song Studio" active={view === "song"} onClick={openSong} />
          <NavItem icon={<Video className="h-4 w-4" />} label="MV Director" active={view === "mvdirector"} onClick={openMvDirector} />
          <NavItem icon={<UsersRound className="h-4 w-4" />} label="Cast" active={view === "cast"} onClick={openCast} />
          <NavItem icon={<Footprints className="h-4 w-4" />} label="Choreography" active={view === "choreography"} onClick={openChoreography} />
          <NavItem icon={<LayoutList className="h-4 w-4" />} label="Timeline" active={view === "timeline"} onClick={openTimeline} />
        </NavGroup>

        <NavGroup label="Production library">
          <NavItem icon={<Users className="h-4 w-4" />} label="Character Bible" active={view === "characters"} onClick={openCharacters} />
          <NavItem icon={<Globe className="h-4 w-4" />} label="World Bible" active={view === "world"} onClick={openWorld} />
          <NavItem icon={<Package className="h-4 w-4" />} label="Props & Vehicles" active={view === "props"} onClick={openProps} />
          <NavItem icon={<Library className="h-4 w-4" />} label="Asset Library" active={view === "assets"} onClick={openAssets} />
          <NavItem icon={<Palette className="h-4 w-4" />} label="Brand Kits" active={view === "brandkits"} onClick={openBrandKits} />
        </NavGroup>

        <NavGroup label="Tools">
          <NavItem icon={<LayoutDashboard className="h-4 w-4" />} label="Dashboard" active={view === "dashboard"} onClick={openDashboard} />
          <NavItem icon={<FileText className="h-4 w-4" />} label="Script Studio" active={view === "scripts"} onClick={openScripts} />
          <NavItem icon={<Clapperboard className="h-4 w-4" />} label="Animation Lab" active={view === "animation"} onClick={openAnimation} />
          <NavItem icon={<BookMarked className="h-4 w-4" />} label="Export Center" active={view === "export"} onClick={openExport} />
        </NavGroup>

        <NavGroup label="System">
          <NavItem icon={<KeyRound className="h-4 w-4" />} label="API Keys" active={view === "apikeys"} onClick={openApiKeys} />
          <NavItem icon={<Boxes className="h-4 w-4" />} label="AI Models" active={view === "models"} onClick={openModels} />
          <NavItem icon={<Settings className="h-4 w-4" />} label="Settings" active={view === "settings"} onClick={openSettings} />
        </NavGroup>

        {projects.length > 0 && (
          <NavGroup label="Projects">
            {projects.map((p) => (
              <NavItem
                key={p.id}
                icon={<Folder className="h-4 w-4" />}
                label={p.name}
                active={view === "project" && activeProjectId === p.id}
                onClick={() => openProject(p.id)}
              />
            ))}
          </NavGroup>
        )}
      </div>

      {/* Footer */}
      <div className="flex flex-col gap-2 border-t border-border p-3">
        <button
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
        <div className="flex items-center gap-1.5 px-1 text-[11px] text-muted" title="Your work autosaves continuously">
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

function engineLabel(): string {
  const mode = loadRouterConfig().mode;
  if (mode === "local" || !isTauri) return "Local engine · no key";
  const label = ROUTER_MODES.find((m) => m.id === mode)?.label ?? "Auto";
  return `Router · ${label}`;
}

function NavGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
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
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex w-full items-center gap-2.5 rounded-[var(--radius-button)] px-2.5 py-1.5 text-sm transition-colors",
        active
          ? "bg-primary/12 text-primary"
          : "text-muted hover:bg-elevated/60 hover:text-foreground"
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
      )}
      <span className={cn("shrink-0", active && "text-primary")}>{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );
}
