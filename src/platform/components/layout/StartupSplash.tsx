import { useEffect, useState } from "react";
import { cn } from "@/platform/lib/utils";
import splashArt from "@/assets/director-studio-splash-afrofuturist-v1.jpg";
import { useAppStore } from "@/platform/store/useAppStore";

export function StartupSplash() {
  const welcomeOpen = useAppStore((s) => s.welcomeOpen);
  const [loaded, setLoaded] = useState(false);
  const [appReady, setAppReady] = useState(false);
  const [minimumElapsed, setMinimumElapsed] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const minimum = window.setTimeout(() => setMinimumElapsed(true), 400);
    const fallback = window.setTimeout(() => {
      setLoaded(true);
      setAppReady(true);
      setMinimumElapsed(true);
    }, 4000);
    const frame = window.requestAnimationFrame(() => setAppReady(true));
    return () => {
      window.clearTimeout(minimum);
      window.clearTimeout(fallback);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (!loaded || !appReady || !minimumElapsed) return;
    const exit = window.setTimeout(() => setDismissed(true), 300);
    return () => window.clearTimeout(exit);
  }, [appReady, loaded, minimumElapsed]);

  // The welcome screen is itself the full-size launch experience. Rendering a
  // second splash above it caused the small→large flash reported in packaged builds.
  if (dismissed || welcomeOpen) return null;

  const exiting = loaded && appReady && minimumElapsed;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[90] flex items-center justify-center overflow-hidden bg-[#07080b] transition-opacity duration-300",
        exiting ? "pointer-events-none opacity-0" : "opacity-100"
      )}
      aria-label="Director Studio startup splash"
    >
      <div className={cn("relative h-full w-full transition duration-300", exiting ? "opacity-0" : "opacity-100")}>
        <img
          src={splashArt}
          alt="Director Studio creative ecosystem"
          onLoad={() => setLoaded(true)}
          className="absolute inset-0 h-full w-full object-cover object-[center_72%]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/45" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white">
          <div className="rounded-2xl border border-white/10 bg-black/35 px-10 py-7 shadow-2xl backdrop-blur-md">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/55">Wheelbarrow</p>
            <p className="mt-2 text-4xl font-black tracking-[0.08em]">DIRECTOR</p>
            <p className="text-sm font-semibold tracking-[0.5em] text-primary">STUDIO</p>
            <p className="mt-4 text-sm text-white/65">Every idea. Every style. One vision.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
