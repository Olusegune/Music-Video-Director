import { LayoutTemplate, Sparkles, FolderOpen, Clapperboard, X, ArrowRight } from "lucide-react";
import { useAppStore } from "@/platform/store/useAppStore";
import { Button } from "@/platform/components/ui/button";
import { cn } from "@/platform/lib/utils";

/**
 * New-project wizard — four ways to start, per the spec, Magic Mode first and
 * recommended:
 *  1. Magic Mode — guided wizard, fastest path to a finished video
 *  2. Director Mode — empty workspace, full manual control (formerly "Blank studio")
 *  3. Blank Project — the separate, non-music-video motion-graphics pipeline
 *  4. Template — start from a genre/style blueprint
 * The app never forces a template — Director Mode goes straight to an empty Song Studio.
 */
export function NewProjectWizard() {
  const open = useAppStore((s) => s.wizardOpen);
  const setOpen = useAppStore((s) => s.setWizardOpen);
  const openTemplates = useAppStore((s) => s.openTemplates);
  const openSong = useAppStore((s) => s.openSong);
  const openDashboard = useAppStore((s) => s.openDashboard);
  const openDirectorWizard = useAppStore((s) => s.openDirectorWizard);
  const setActiveTemplate = useAppStore((s) => s.setActiveTemplate);
  const setActiveSong = useAppStore((s) => s.setActiveSong);

  if (!open) return null;
  const close = (then?: () => void) => {
    setOpen(false);
    then?.();
  };

  const options = [
    {
      icon: <Clapperboard className="h-6 w-6" />,
      title: "Magic Mode",
      badge: "Recommended",
      desc: "Upload a song, add an artist, choose a style — the Director builds the whole video for you.",
      go: () => close(openDirectorWizard),
      primary: true,
    },
    {
      icon: <Sparkles className="h-6 w-6" />,
      title: "Director Mode",
      desc: "An empty workspace with full manual control — import a song and build every element by hand.",
      go: () =>
        close(() => {
          setActiveTemplate(null); // no blueprint bias
          setActiveSong(null); // fresh production
          openSong();
        }),
    },
    {
      icon: <FolderOpen className="h-6 w-6" />,
      title: "Blank Project",
      desc: "Start a non-music-video motion-graphics project — ads, explainers, and other one-off pieces.",
      go: () => close(openDashboard),
    },
    {
      icon: <LayoutTemplate className="h-6 w-6" />,
      title: "Template",
      desc: "Start with a genre/style blueprint — the Director adapts it to your song.",
      go: () =>
        close(() => {
          setActiveSong(null); // fresh production; the template only supplies the blueprint
          openTemplates();
        }),
    },
  ];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-background/80 p-6 backdrop-blur">
      <div className="w-full max-w-3xl overflow-hidden rounded-[var(--radius-modal)] border border-border bg-surface shadow-card">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold leading-tight">New production</h2>
            <p className="text-xs text-muted">How would you like to start?</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => close()} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid gap-3 p-6 sm:grid-cols-2 lg:grid-cols-4">
          {options.map((o) => (
            <button
              key={o.title}
              onClick={o.go}
              className={cn(
                "group relative flex flex-col items-start gap-3 rounded-[var(--radius-card)] border p-4 text-left transition-colors",
                o.primary
                  ? "border-[var(--color-gold)]/50 bg-[var(--color-gold)]/[0.06] hover:border-[var(--color-gold)]"
                  : "border-border bg-surface hover:border-primary/50 hover:bg-elevated/40"
              )}
            >
              {o.badge && (
                <span className="absolute right-3 top-3 rounded-full bg-[var(--color-gold)]/20 px-2 py-0.5 text-[10px] font-semibold text-[var(--color-gold-foreground)]">
                  {o.badge}
                </span>
              )}
              <span
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-xl",
                  o.primary ? "grad-gold text-[var(--color-gold-foreground)]" : "bg-elevated text-primary"
                )}
              >
                {o.icon}
              </span>
              <span className="flex-1">
                <span className="block text-sm font-semibold">{o.title}</span>
                <span className="mt-0.5 block text-xs text-muted">{o.desc}</span>
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-[11px] font-medium opacity-0 transition-opacity group-hover:opacity-100",
                  o.primary ? "text-[var(--color-gold-foreground)]" : "text-primary"
                )}
              >
                Start <ArrowRight className="h-3 w-3" />
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
