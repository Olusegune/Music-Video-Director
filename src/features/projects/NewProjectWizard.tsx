import { LayoutTemplate, Sparkles, FolderOpen, X, ArrowRight } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";

/**
 * New-project wizard — three ways to start, per the spec:
 *  1. From a template (built-in blueprints)
 *  2. Blank studio (empty workspace; nothing auto-generated)
 *  3. Open existing production
 * The app never forces a template — Blank goes straight to an empty Song Studio.
 */
export function NewProjectWizard() {
  const open = useAppStore((s) => s.wizardOpen);
  const setOpen = useAppStore((s) => s.setWizardOpen);
  const openTemplates = useAppStore((s) => s.openTemplates);
  const openSong = useAppStore((s) => s.openSong);
  const openDashboard = useAppStore((s) => s.openDashboard);
  const setActiveTemplate = useAppStore((s) => s.setActiveTemplate);
  const setActiveSong = useAppStore((s) => s.setActiveSong);

  if (!open) return null;
  const close = (then?: () => void) => {
    setOpen(false);
    then?.();
  };

  const options = [
    {
      icon: <LayoutTemplate className="h-6 w-6" />,
      title: "Create from a template",
      desc: "Start with a genre/style blueprint — the Director adapts it to your song.",
      go: () =>
        close(() => {
          setActiveSong(null); // fresh production; the template only supplies the blueprint
          openTemplates();
        }),
      primary: true,
    },
    {
      icon: <Sparkles className="h-6 w-6" />,
      title: "Blank studio",
      desc: "An empty workspace — import a song and build every element by hand. Nothing is generated until you ask.",
      go: () =>
        close(() => {
          setActiveTemplate(null); // no blueprint bias
          setActiveSong(null); // fresh production
          openSong();
        }),
    },
    {
      icon: <FolderOpen className="h-6 w-6" />,
      title: "Open existing production",
      desc: "Pick up a song you've already imported — its treatment, cast, and timeline are remembered.",
      go: () => close(openDashboard),
    },
  ];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-background/80 p-6 backdrop-blur">
      <div className="w-full max-w-2xl overflow-hidden rounded-[var(--radius-modal)] border border-border bg-surface shadow-card">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold leading-tight">New production</h2>
            <p className="text-xs text-muted">How would you like to start?</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => close()} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid gap-3 p-6 sm:grid-cols-3">
          {options.map((o) => (
            <button
              key={o.title}
              onClick={o.go}
              className="group flex flex-col items-start gap-3 rounded-[var(--radius-card)] border border-border bg-surface p-4 text-left transition-colors hover:border-primary/50 hover:bg-elevated/40"
            >
              <span
                className={
                  "flex h-11 w-11 items-center justify-center rounded-xl " +
                  (o.primary ? "grad-primary text-white" : "bg-elevated text-primary")
                }
              >
                {o.icon}
              </span>
              <span className="flex-1">
                <span className="block text-sm font-semibold">{o.title}</span>
                <span className="mt-0.5 block text-xs text-muted">{o.desc}</span>
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                Start <ArrowRight className="h-3 w-3" />
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
