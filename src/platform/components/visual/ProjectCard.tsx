import type { ReactNode } from "react";
import { ArrowRight, Clock3 } from "lucide-react";
import { Badge } from "@/platform/components/ui/badge";
import { cn } from "@/platform/lib/utils";
import { VISUAL_MODULE_THEME, type VisualModule } from "@/platform/components/visual/visualTheme";
import { AssetImage } from "@/platform/components/ui/asset-image";

export interface ProjectCardProps {
  title: string;
  subtitle?: string;
  thumbUrl?: string;
  module: VisualModule;
  progress?: number;
  status?: string;
  updatedAt?: string;
  icon?: ReactNode;
  active?: boolean;
  onResume: () => void;
  /** Optional overflow menu (Save As / Rename / Delete), rendered over the card. */
  actions?: ReactNode;
  className?: string;
}

export function ProjectCard({
  title,
  subtitle,
  thumbUrl,
  module,
  progress,
  status = "In progress",
  updatedAt,
  icon,
  active = false,
  onResume,
  actions,
  className,
}: ProjectCardProps) {
  const theme = VISUAL_MODULE_THEME[module];
  const normalizedProgress =
    typeof progress === "number" ? Math.max(0, Math.min(100, progress)) : undefined;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border bg-surface shadow-card transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-xl",
        active ? "border-primary ring-1 ring-primary/30" : "border-border",
        className
      )}
    >
      {actions ? <div className="absolute right-2 top-2 z-10">{actions}</div> : null}
      <button
        type="button"
        onClick={onResume}
        className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <span
          className={cn(
            "relative block aspect-[16/9] overflow-hidden bg-gradient-to-br",
            theme.gradient
          )}
        >
          {thumbUrl ? (
            <AssetImage
              src={thumbUrl}
              alt={`${title} thumbnail`}
              className="h-full w-full object-cover transition duration-200 ease-out group-hover:scale-[1.02]"
            />
          ) : (
            <span className="creative-grid absolute inset-0 flex items-center justify-center">
              <span
                className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-black/25 text-white/90 backdrop-blur"
                style={{ color: theme.accent }}
              >
                {icon}
              </span>
            </span>
          )}
          <span className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/75 to-transparent" />
          <Badge className="absolute left-3 top-3 border-white/15 bg-black/45 text-white">
            {theme.label}
          </Badge>
          <span className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/40 text-white transition group-hover:translate-x-0.5">
            <ArrowRight className="h-4 w-4" />
          </span>
        </span>
        <span className="block p-4">
          <span className="flex items-start justify-between gap-3">
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{title}</span>
              {subtitle ? (
                <span className="mt-1 block line-clamp-2 text-xs leading-relaxed text-muted">
                  {subtitle}
                </span>
              ) : null}
            </span>
            <Badge variant={status.toLowerCase() === "approved" ? "success" : "default"}>
              {status}
            </Badge>
          </span>
          {typeof normalizedProgress === "number" ? (
            <span className="mt-4 block">
              <span className="mb-1.5 flex justify-between text-[10px] uppercase tracking-wide text-muted">
                <span>Progress</span>
                <span>{normalizedProgress}%</span>
              </span>
              <span className="block h-1.5 overflow-hidden rounded-full bg-elevated">
                <span
                  className="block h-full rounded-full transition-[width] duration-200 ease-out"
                  style={{ width: `${normalizedProgress}%`, backgroundColor: theme.accent }}
                />
              </span>
            </span>
          ) : null}
          {updatedAt ? (
            <span className="mt-3 flex items-center gap-1.5 text-[11px] text-muted">
              <Clock3 className="h-3 w-3" />
              {updatedAt}
            </span>
          ) : null}
        </span>
      </button>
    </div>
  );
}
