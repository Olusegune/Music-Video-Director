import { useEffect, useState, useSyncExternalStore } from "react";
import { cn } from "@/platform/lib/utils";
import directorStudioLogo from "@/assets/director-studio-icon.png";
import { useAppStore } from "@/platform/store/useAppStore";
import { getStartupReadiness, subscribeStartupReadiness } from "@/platform/lib/startupReadiness";

export function StartupSplash() {
  const welcomeOpen = useAppStore((s) => s.welcomeOpen);
  const readiness = useSyncExternalStore(
    subscribeStartupReadiness,
    getStartupReadiness,
    getStartupReadiness
  );
  const [loaded, setLoaded] = useState(false);
  const [minimumElapsed, setMinimumElapsed] = useState(false);
  const [safetyFallback, setSafetyFallback] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const minimum = window.setTimeout(() => setMinimumElapsed(true), 400);
    const fallback = window.setTimeout(() => setSafetyFallback(true), 4000);
    return () => {
      window.clearTimeout(minimum);
      window.clearTimeout(fallback);
    };
  }, []);

  useEffect(() => {
    const appReady = safetyFallback || (readiness.appShellMounted && readiness.storesHydrated);
    if (!loaded || !appReady || !minimumElapsed) return;
    const exit = window.setTimeout(() => setDismissed(true), 280);
    return () => window.clearTimeout(exit);
  }, [loaded, minimumElapsed, readiness, safetyFallback]);

  // The welcome screen is itself the full-size launch experience. Rendering a
  // second splash above it caused the small→large flash reported in packaged builds.
  if (dismissed || welcomeOpen) return null;

  const appReady = safetyFallback || (readiness.appShellMounted && readiness.storesHydrated);
  const exiting = loaded && appReady && minimumElapsed;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[90] flex items-center justify-center overflow-hidden bg-background/96 p-4 backdrop-blur-sm transition-opacity duration-[280ms] ease-out",
        exiting ? "pointer-events-none opacity-0" : "opacity-100"
      )}
      aria-label="Director Studio startup splash"
    >
      <section
        className={cn(
          "relative flex h-[260px] w-[420px] max-w-full flex-col items-center justify-center overflow-hidden rounded-[22px] border border-border bg-surface px-10 py-7 text-center shadow-2xl transition-[opacity,transform] duration-[280ms] ease-out",
          exiting ? "scale-[0.97] opacity-0" : "scale-100 opacity-100"
        )}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,color-mix(in_oklab,var(--color-primary)_18%,transparent),transparent_58%)]" />
        <img
          src={directorStudioLogo}
          alt="Director Studio"
          onLoad={() => setLoaded(true)}
          className="relative h-36 w-36 object-contain"
        />
        <div className="relative mt-4 w-48 overflow-hidden rounded-full bg-elevated">
          <div className="h-1 w-1/2 animate-[pulse_1.4s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-primary via-accent to-gold" />
        </div>
        <p className="relative mt-4 text-xs font-medium tracking-[0.16em] text-muted">
          PREPARING YOUR STUDIO
        </p>
      </section>
    </div>
  );
}
