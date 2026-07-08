import { useEffect, useState } from "react";
import { cn } from "@/platform/lib/utils";
import splashArt from "@/assets/director-studio-splash.png";

export function StartupSplash() {
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

  if (dismissed) return null;

  const exiting = loaded && appReady && minimumElapsed;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[90] flex items-center justify-center bg-background/95 p-6 backdrop-blur-sm transition-opacity duration-300",
        exiting ? "pointer-events-none opacity-0" : "opacity-100"
      )}
      aria-label="Director Studio startup splash"
    >
      <div
        className={cn(
          "flex h-[260px] w-[min(420px,calc(100vw-32px))] items-center justify-center rounded-2xl border border-white/10 bg-black/55 p-3 shadow-2xl shadow-black/40 transition duration-300",
          exiting ? "scale-[0.98] opacity-0" : "scale-100 opacity-100"
        )}
      >
        <img
          src={splashArt}
          alt="Director Studio"
          onLoad={() => setLoaded(true)}
          className="max-h-full max-w-full rounded-xl object-contain"
        />
      </div>
    </div>
  );
}
