import { useState } from "react";
import {
  Music,
  Rocket,
  LifeBuoy,
  KeyRound,
  Film,
  LayoutTemplate,
  Sparkles,
  X,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { cn } from "@/lib/utils";
import { getShowWelcome, setShowWelcome } from "@/lib/settings";
import { Button } from "@/components/ui/button";
import { MagicFlowButton } from "@/components/magic/MagicFlowButton";
import splashArt from "@/assets/splash.jpg";

/**
 * Welcome overlay. Visibility is driven by the store (`welcomeOpen`), which is
 * initialized from the persisted "show on startup" preference and can be
 * reopened anytime from Settings → "Show welcome now".
 */
export function WelcomeScreen() {
  const open = useAppStore((s) => s.welcomeOpen);
  const setWelcomeOpen = useAppStore((s) => s.setWelcomeOpen);
  // The checkbox reflects (and writes) the persistent startup preference.
  const [showOnStartup, setShowOnStartup] = useState(() => getShowWelcome());
  const [splashLoaded, setSplashLoaded] = useState(false);

  const openSong = useAppStore((s) => s.openSong);
  const openHelp = useAppStore((s) => s.openHelp);
  const openApiKeys = useAppStore((s) => s.openApiKeys);
  const openTemplates = useAppStore((s) => s.openTemplates);
  const openDemoProject = useAppStore((s) => s.openDemoProject);

  if (!open) return null;

  const toggleStartup = (next: boolean) => {
    setShowOnStartup(next);
    setShowWelcome(next);
  };

  const close = (then?: () => void) => {
    setWelcomeOpen(false);
    then?.();
  };

  const actions = [
    {
      icon: <Music className="h-5 w-5" />,
      title: "Import a song",
      desc: "Director Mode — start in Song Studio and map tempo, sections, and lyrics yourself. No key needed.",
      go: () => close(openSong),
      primary: true,
    },
    {
      icon: <LayoutTemplate className="h-5 w-5" />,
      title: "Start from a template",
      desc: "Pick a genre/style blueprint — the Director adapts it to your song.",
      go: () => close(openTemplates),
    },
    {
      icon: <Sparkles className="h-5 w-5" />,
      title: "Explore the demo project",
      desc: "Open a fully planned example — song, cast, treatment & choreography. No setup.",
      go: () => close(openDemoProject),
    },
    {
      icon: <Rocket className="h-5 w-5" />,
      title: "Getting started",
      desc: "A 4-step walkthrough from song to finished video.",
      go: () => close(openHelp),
    },
    {
      icon: <KeyRound className="h-5 w-5" />,
      title: "Connect AI keys",
      desc: "Add provider keys to generate frames, clips, and voices.",
      go: () => close(openApiKeys),
    },
    {
      icon: <Film className="h-5 w-5" />,
      title: "Install FFmpeg",
      desc: "One-click setup for the final video render.",
      go: () => close(openHelp),
    },
  ];

  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center bg-background/85 p-6 backdrop-blur">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-[var(--radius-modal)] border border-border bg-surface shadow-card">
        {/* Hero splash art — full-bleed 16:9, matching the artwork's own ratio
            so it fills edge-to-edge with no letterbox bars and no cropping. */}
        <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-black">
          <img
            src={splashArt}
            alt="Wheelbarrow Studios — Music Video Director"
            onLoad={() => setSplashLoaded(true)}
            className={cn(
              "h-full w-full object-cover transition-opacity duration-700 ease-out",
              splashLoaded ? "opacity-100" : "opacity-0"
            )}
          />
          {/* Gentle bottom scrim to seat the art against the panel below. */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-surface/80 to-transparent" />
          <button
            onClick={() => close()}
            className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-md bg-black/40 text-white/90 hover:bg-black/70 hover:text-white"
            aria-label="Close welcome"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="shrink-0 border-b border-border px-7 py-3 text-center">
          <p className="text-sm text-muted">
            Turn a song into a directed music video — plan locally for free,
            generate when you're ready.
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">

        {/* The one button that matters — direct a full music video in one click */}
        <div className="flex flex-col items-center gap-1.5 px-6 pt-6 text-center">
          <MagicFlowButton variant="hero" />
          <p className="text-[11px] text-muted">
            Create a complete music video from your song — one click. Prefer full
            manual control? Import a song below to work in Director Mode instead.
          </p>
        </div>

        {/* Actions */}
        <div className="grid gap-3 p-6 sm:grid-cols-2">
          {actions.map((a) => (
            <button
              key={a.title}
              onClick={a.go}
              className="group flex items-start gap-3 rounded-[var(--radius-card)] border border-border bg-surface p-4 text-left transition-colors hover:border-primary/50 hover:bg-elevated/40"
            >
              <span
                className={
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg " +
                  (a.primary
                    ? "grad-primary text-white"
                    : "bg-elevated text-primary")
                }
              >
                {a.icon}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{a.title}</span>
                <span className="block text-xs text-muted">{a.desc}</span>
              </span>
            </button>
          ))}
        </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border px-6 py-3">
          <label className="flex items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={showOnStartup}
              onChange={(e) => toggleStartup(e.target.checked)}
              className="h-3.5 w-3.5 accent-[var(--color-primary)]"
            />
            Show this welcome on startup
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => close(openHelp)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              <LifeBuoy className="h-3.5 w-3.5" /> Open Help Center
            </button>
            <Button size="sm" onClick={() => close(openSong)}>
              Start creating
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
