import { useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Disc3,
  Fingerprint,
  LayoutDashboard,
  Sparkles,
  Users2,
  X,
} from "lucide-react";
import { useAppStore } from "@/platform/store/useAppStore";
import { getShowWelcome, setShowWelcome } from "@/platform/lib/settings";
import { Button } from "@/platform/components/ui/button";
import heroArt from "@/assets/mv-splash/hero.jpg";

// Grounded in what the app actually does — no capability listed here that
// isn't real and shipping. Each pairs a plain outcome with the mechanism
// that makes it true, so this doubles as a one-glance orientation to the
// pipeline (Song → Cast → Choreography → Direct → Render) rather than
// marketing copy that overpromises what a first-time user will then have
// to discover is untrue.
const HIGHLIGHTS = [
  {
    icon: Disc3,
    title: "Song-aware direction",
    desc: "Tempo, sections, and chorus detection plan every shot from the track itself.",
  },
  {
    icon: Fingerprint,
    title: "Consistent characters",
    desc: "Lock a performer's likeness once — the same face, every scene.",
  },
  {
    icon: Users2,
    title: "Real choreography",
    desc: "Moves and formations built from your lyrics, locked into every prompt.",
  },
  {
    icon: Sparkles,
    title: "One click to render",
    desc: "Frames, clips, and audio mixed into a finished video.",
  },
] as const;

export function MusicVideoWelcomeScreen() {
  const open = useAppStore((s) => s.welcomeOpen);
  const setWelcomeOpen = useAppStore((s) => s.setWelcomeOpen);
  const [showOnStartup, setShowOnStartup] = useState(() => getShowWelcome());
  const setWizardOpen = useAppStore((s) => s.setWizardOpen);
  const openDashboard = useAppStore((s) => s.openDashboard);
  const openHelp = useAppStore((s) => s.openHelp);
  if (!open) return null;

  const close = (then?: () => void) => {
    setWelcomeOpen(false);
    then?.();
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#07080b] p-4 sm:p-6">
      <div className="relative flex h-full max-h-[880px] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#101216] shadow-2xl shadow-black/70">
        <button
          onClick={() => close()}
          aria-label="Close welcome"
          className="absolute right-4 top-4 z-10 rounded-lg border border-white/10 bg-black/35 p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Hero — the splash art carries the identity (wordmark is baked in,
            bottom-left); everything interactive lives below it so nothing
            ever overlaps or fights the artwork for attention. */}
        <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden sm:aspect-[21/9]">
          <img
            src={heroArt}
            alt="Music Video Director — three performers on stage, directed by the app"
            className="absolute inset-0 h-full w-full object-cover"
          />
          {/* A short, sharp fade right at the seam so the panel below reads
              as one continuous surface — not a wash over the artwork itself,
              which would dim the baked-in wordmark it's meant to set off. */}
          <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#101216] to-transparent" />
        </div>

        <section className="flex min-w-0 flex-1 flex-col overflow-y-auto px-6 pb-6 pt-5 sm:px-9 sm:pb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            AI creative director for music videos
          </p>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/60 sm:text-base">
            Import a song and go from tempo to a finished, cast, choreographed video — one
            connected flow, start to render.
          </p>

          <div className="mt-6 rounded-xl border border-primary/25 bg-gradient-to-br from-primary/15 via-white/[0.03] to-transparent p-5">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="font-semibold text-white">Ready to direct your first video?</p>
                <p className="mt-1 text-xs text-white/50">
                  A guided flow will ask one question at a time — import, cast, and direct.
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={() => close(openDashboard)}
                  className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                >
                  <LayoutDashboard className="h-4 w-4" /> My projects
                </Button>
                <Button size="lg" onClick={() => close(() => setWizardOpen(true))}>
                  New Music Video <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
            {HIGHLIGHTS.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3.5"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Icon className="h-4.5 w-4.5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-white">{title}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-white/50">{desc}</span>
                </span>
              </div>
            ))}
          </div>

          <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5 text-xs">
            <label className="flex items-center gap-2 text-white/45">
              <input
                type="checkbox"
                checked={showOnStartup}
                onChange={(e) => {
                  setShowOnStartup(e.target.checked);
                  setShowWelcome(e.target.checked);
                }}
                className="accent-[var(--color-primary)]"
              />
              Show on startup
            </label>
            <button
              onClick={() => close(openHelp)}
              className="flex items-center gap-1.5 font-medium text-primary hover:underline"
            >
              <BookOpen className="h-3.5 w-3.5" /> Docs &amp; guides
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
