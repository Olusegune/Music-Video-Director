import { useEffect, useState } from "react";
import { cn } from "@/platform/lib/utils";
import splashArt from "@/assets/director-studio-splash.png";

export function StartupSplash() {
  const [loaded, setLoaded] = useState(false);
  const [minimumElapsed, setMinimumElapsed] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const minimum = window.setTimeout(() => setMinimumElapsed(true), 900);
    const fallback = window.setTimeout(() => {
      setLoaded(true);
      setMinimumElapsed(true);
    }, 2200);
    return () => {
      window.clearTimeout(minimum);
      window.clearTimeout(fallback);
    };
  }, []);

  useEffect(() => {
    if (!loaded || !minimumElapsed) return;
    const exit = window.setTimeout(() => setDismissed(true), 520);
    return () => window.clearTimeout(exit);
  }, [loaded, minimumElapsed]);

  if (dismissed) return null;

  const exiting = loaded && minimumElapsed;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[90] flex items-center justify-center bg-black transition-opacity duration-500",
        exiting ? "pointer-events-none opacity-0" : "opacity-100"
      )}
      aria-label="Director Studio startup splash"
    >
      <img
        src={splashArt}
        alt="Director Studio"
        onLoad={() => setLoaded(true)}
        className="h-full w-full object-cover"
      />
    </div>
  );
}
