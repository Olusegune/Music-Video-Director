// ProjectHome — the shared "you have work here" landing, used by every module
// that keeps a list of local projects.
//
// Before this, a returning user with three saved campaigns and a user who had
// never opened the studio saw the exact same first-run empty state the moment
// no project was active. ProjectHome fixes that divergence once: a hero that
// starts the module's Magic Flow, a Resume card for the most recently touched
// project, and a grid of the rest. It renders only when there IS prior work —
// true first-run still belongs to the module's own CreativeEmptyState.

import type { ReactNode } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/platform/components/ui/button";
import { ProjectCard } from "@/platform/components/visual/ProjectCard";
import { VISUAL_MODULE_THEME, type VisualModule } from "@/platform/components/visual/visualTheme";
import { cn } from "@/platform/lib/utils";

export interface ProjectHomeItem {
  id: string;
  title: string;
  subtitle?: string;
  thumbUrl?: string;
  status?: string;
  progress?: number;
  updatedAt?: string;
}

export function ProjectHome({
  module,
  icon,
  flowLabel,
  onStartFlow,
  projects,
  onResume,
  actionsFor,
  className,
}: {
  module: VisualModule;
  icon: ReactNode;
  /** e.g. "Start Glam Magic Flow" */
  flowLabel: string;
  onStartFlow: () => void;
  /** Newest-first; the first entry becomes the Resume card. */
  projects: ProjectHomeItem[];
  onResume: (id: string) => void;
  /** Optional per-card overflow menu (Save As / Rename / Delete). */
  actionsFor?: (id: string) => ReactNode;
  className?: string;
}) {
  const theme = VISUAL_MODULE_THEME[module];
  const [latest, ...rest] = projects;
  if (!latest) return null;

  return (
    <div className={cn("space-y-6", className)}>
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br p-6 shadow-card",
          theme.gradient
        )}
      >
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-black/25 text-white shadow-lg">
              {icon}
            </span>
            <div>
              <h2 className="text-lg font-semibold text-white">Pick up where you left off</h2>
              <p className="text-xs text-white/70">
                {projects.length} project{projects.length === 1 ? "" : "s"} in this studio.
              </p>
            </div>
          </div>
          <Button onClick={onStartFlow} className="shrink-0">
            <Sparkles className="h-4 w-4" /> {flowLabel}
          </Button>
        </div>
      </div>

      <section>
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
          Resume
        </h3>
        <ProjectCard
          module={module}
          title={latest.title}
          subtitle={latest.subtitle}
          thumbUrl={latest.thumbUrl}
          status={latest.status}
          progress={latest.progress}
          updatedAt={latest.updatedAt}
          icon={icon}
          onResume={() => onResume(latest.id)}
          actions={actionsFor?.(latest.id)}
          className="max-w-sm"
        />
      </section>

      {rest.length > 0 ? (
        <section>
          <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
            Recent <ArrowRight className="h-3 w-3" />
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((project) => (
              <ProjectCard
                key={project.id}
                module={module}
                title={project.title}
                subtitle={project.subtitle}
                thumbUrl={project.thumbUrl}
                status={project.status}
                progress={project.progress}
                updatedAt={project.updatedAt}
                icon={icon}
                onResume={() => onResume(project.id)}
                actions={actionsFor?.(project.id)}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
