import {
  ArrowRight,
  Boxes,
  Clapperboard,
  Download,
  FilePlus2,
  Image,
  Layers3,
  Palette,
  Route,
  Settings2,
  Sparkles,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/platform/lib/ipc";
import { loadRouterConfig, ROUTER_MODES } from "@/platform/lib/providers";
import { STUDIO_MODES } from "@/platform/lib/settings";
import { STYLE_GROUPS } from "@/platform/lib/styles";
import { useAppStore } from "@/platform/store/useAppStore";
import { Badge } from "@/platform/components/ui/badge";
import { Button } from "@/platform/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/platform/components/ui/card";

const workflow = [
  {
    icon: <FilePlus2 className="h-4 w-4" />,
    title: "New Motion Project",
    text: "Capture the brief, dimensions, duration, and delivery target.",
  },
  {
    icon: <Boxes className="h-4 w-4" />,
    title: "Choose Project Type",
    text: "Ads, explainers, product loops, launch graphics, or custom motion pieces.",
  },
  {
    icon: <Palette className="h-4 w-4" />,
    title: "Style / Creative Direction",
    text: "Reuse the shared style system, Creative DNA, and production libraries.",
  },
  {
    icon: <Clapperboard className="h-4 w-4" />,
    title: "Storyboard Placeholder",
    text: "A thin planning surface only. Full Motion Studio features come later.",
  },
  {
    icon: <Download className="h-4 w-4" />,
    title: "Export Placeholder",
    text: "Confirm packaging and export paths without building the renderer yet.",
  },
];

export function MotionStudio() {
  const studioMode = useAppStore((s) => s.studioMode);
  const openAssets = useAppStore((s) => s.openAssets);
  const openTemplates = useAppStore((s) => s.openTemplates);
  const openProject = useAppStore((s) => s.openProject);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: api.listProjects,
  });

  const routerMode = loadRouterConfig().mode;
  const routerLabel =
    routerMode === "local"
      ? "Local planning"
      : ROUTER_MODES.find((m) => m.id === routerMode)?.label ?? "Auto router";
  const modeLabel = STUDIO_MODES.find((m) => m.id === studioMode)?.label ?? "Director";
  const styleCount = STYLE_GROUPS.length;

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-background">
      <header className="border-b border-border bg-surface/80 px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge>Platform proof</Badge>
              <Badge>{modeLabel} mode</Badge>
              <Badge>{routerLabel}</Badge>
            </div>
            <h1 className="text-2xl font-semibold tracking-normal">Motion Studio</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              A thin second app shell that consumes Director Studio platform systems without
              importing Music Video Director modules.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={openTemplates}>
              <Palette className="h-4 w-4" /> Styles
            </Button>
            <Button variant="secondary" onClick={openAssets}>
              <Image className="h-4 w-4" /> Assets
            </Button>
          </div>
        </div>
      </header>

      <div className="grid gap-5 p-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <div className="grid gap-3 md:grid-cols-5">
            {workflow.map((step, index) => (
              <Card key={step.title} className="shadow-none">
                <CardHeader>
                  <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-[var(--radius-button)] bg-primary/12 text-primary">
                    {step.icon}
                  </div>
                  <CardTitle className="leading-snug">{step.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="min-h-14 text-xs leading-5 text-muted">{step.text}</p>
                  <div className="mt-3 text-[11px] font-semibold uppercase text-muted/70">
                    Step {index + 1}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Storyboard Placeholder</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-3">
                {["Opening frame", "Motion beat", "Final hold"].map((label) => (
                  <div
                    key={label}
                    className="flex aspect-video items-center justify-center rounded-[var(--radius-card)] border border-dashed border-border bg-elevated/40 text-sm font-medium text-muted"
                  >
                    {label}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Shared Platform Systems</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <PlatformLine icon={<Settings2 className="h-4 w-4" />} label="StudioMode" value={modeLabel} />
              <PlatformLine icon={<Route className="h-4 w-4" />} label="Provider router" value={routerLabel} />
              <PlatformLine icon={<Layers3 className="h-4 w-4" />} label="Style groups" value={`${styleCount}`} />
              <PlatformLine icon={<Sparkles className="h-4 w-4" />} label="Projects" value={`${projects.length}`} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Projects</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {projects.length === 0 ? (
                <p className="text-sm text-muted">No platform projects yet.</p>
              ) : (
                projects.slice(0, 4).map((project) => (
                  <button
                    key={project.id}
                    onClick={() => openProject(project.id)}
                    className="flex w-full items-center justify-between rounded-[var(--radius-button)] border border-border px-3 py-2 text-left text-sm transition hover:border-primary/40 hover:bg-elevated/50"
                  >
                    <span className="truncate">{project.name}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted" />
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </section>
  );
}

function PlatformLine({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[var(--radius-button)] bg-elevated/50 px-3 py-2">
      <span className="flex min-w-0 items-center gap-2 text-muted">
        {icon}
        <span className="truncate">{label}</span>
      </span>
      <span className="shrink-0 font-medium text-foreground">{value}</span>
    </div>
  );
}
