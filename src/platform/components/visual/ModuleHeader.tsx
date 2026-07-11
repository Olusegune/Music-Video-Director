import type { ReactNode } from "react";
import { House } from "lucide-react";
import { Button } from "@/platform/components/ui/button";
import { cn } from "@/platform/lib/utils";
import type { StudioMode } from "@/platform/lib/settings";
import { VISUAL_MODULE_THEME, type VisualModule } from "@/platform/components/visual/visualTheme";

const MODES: { id: StudioMode; label: string }[] = [
  { id: "director", label: "Director" },
  { id: "studio", label: "Studio" },
  { id: "creator", label: "Creator" },
];

export function ModuleHeader({
  module,
  icon,
  title,
  subtitle,
  mode,
  onModeChange,
  primaryLabel,
  primaryIcon,
  onPrimary,
  /** Present only when there is somewhere to return to (an open project). */
  onHome,
  className,
}: {
  module: VisualModule;
  icon: ReactNode;
  title: string;
  subtitle: string;
  mode: StudioMode;
  onModeChange: (mode: StudioMode) => void;
  primaryLabel: string;
  primaryIcon?: ReactNode;
  onPrimary: () => void;
  onHome?: () => void;
  className?: string;
}) {
  const theme = VISUAL_MODULE_THEME[module];
  return (
    <header
      className={cn(
        "flex flex-wrap items-center justify-between gap-4 border-b border-border px-8 py-5",
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br text-white shadow-lg",
            theme.gradient
          )}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold">{title}</h1>
          <p className="truncate text-xs text-muted">{subtitle}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {onHome ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={onHome}
            aria-label={`${title} home`}
            title="Back to studio home"
          >
            <House className="h-4 w-4" />
          </Button>
        ) : null}
        <div className="flex rounded-lg border border-border bg-elevated/65 p-1">
          {MODES.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onModeChange(option.id)}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-xs font-medium transition duration-200 ease-out",
                mode === option.id
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-muted hover:text-foreground"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <Button onClick={onPrimary}>
          {primaryIcon}
          {primaryLabel}
        </Button>
      </div>
    </header>
  );
}
