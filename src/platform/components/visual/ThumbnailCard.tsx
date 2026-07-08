import type { ReactNode } from "react";
import { ImageIcon } from "lucide-react";
import { Badge } from "@/platform/components/ui/badge";
import { cn } from "@/platform/lib/utils";
import { VISUAL_MODULE_THEME, type VisualModule } from "@/platform/components/visual/visualTheme";

export interface ThumbnailCardProps {
  title: string;
  subtitle?: string;
  thumbUrl?: string;
  module?: VisualModule;
  badge?: string;
  icon?: ReactNode;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}

export function ThumbnailCard({
  title,
  subtitle,
  thumbUrl,
  module = "platform",
  badge,
  icon,
  selected = false,
  onClick,
  className,
}: ThumbnailCardProps) {
  const theme = VISUAL_MODULE_THEME[module];
  const content = (
    <>
      <span
        className={cn(
          "relative block aspect-video overflow-hidden bg-gradient-to-br",
          theme.gradient
        )}
      >
        {thumbUrl ? (
          <img src={thumbUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="creative-grid absolute inset-0 flex items-center justify-center">
            <span
              className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-black/20 text-white/80 backdrop-blur"
              style={{ color: theme.accent }}
            >
              {icon ?? <ImageIcon className="h-5 w-5" />}
            </span>
          </span>
        )}
        {badge ? (
          <Badge className="absolute left-3 top-3 border-white/15 bg-black/45 text-white">
            {badge}
          </Badge>
        ) : null}
      </span>
      <span className="block p-3">
        <span className="block truncate text-sm font-semibold">{title}</span>
        {subtitle ? (
          <span className="mt-1 block line-clamp-2 text-xs leading-relaxed text-muted">
            {subtitle}
          </span>
        ) : null}
      </span>
    </>
  );

  const classes = cn(
    "group overflow-hidden rounded-xl border bg-surface text-left shadow-card transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-xl",
    selected ? "border-primary ring-1 ring-primary/30" : "border-border",
    className
  );

  return onClick ? (
    <button type="button" onClick={onClick} className={classes}>
      {content}
    </button>
  ) : (
    <article className={classes}>{content}</article>
  );
}
