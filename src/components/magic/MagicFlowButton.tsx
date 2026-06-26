// The Magic Flow call-to-action — the visual focal point of the whole app.
//
// One click opens the Director Wizard, which guides the user from an empty
// canvas (import a song) to a fully planned music video. Premium violet→gold
// gradient, soft animated glow, sparkles, and hover/press motion.

import { Clapperboard, Sparkle } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { cn } from "@/lib/utils";

function Sparkles() {
  return (
    <>
      <Sparkle className="magic-sparkle pointer-events-none absolute -right-1 -top-1 h-3.5 w-3.5 text-white/90" aria-hidden />
      <Sparkle className="magic-sparkle-2 pointer-events-none absolute -bottom-1 left-2 h-2.5 w-2.5 text-amber-200/90" aria-hidden />
    </>
  );
}

export function MagicFlowButton({
  variant = "hero",
  className,
}: {
  variant?: "hero" | "fab";
  className?: string;
}) {
  const open = useAppStore((s) => s.openDirectorWizard);

  if (variant === "fab") {
    return (
      <div className={cn("fixed bottom-6 right-6 z-50", className)}>
        <span className="magic-glow absolute -inset-1 rounded-full" aria-hidden />
        <button
          onClick={open}
          title="Direct My Music Video"
          aria-label="Direct My Music Video"
          className="magic-cta relative inline-flex items-center gap-2 rounded-full px-5 py-3.5 text-sm font-bold"
        >
          <Clapperboard className="h-5 w-5" />
          Direct My Music Video
          <Sparkles />
        </button>
      </div>
    );
  }

  return (
    <div className={cn("relative inline-flex w-full max-w-lg", className)}>
      <span className="magic-glow absolute -inset-2 rounded-[1.75rem]" aria-hidden />
      <button
        onClick={open}
        className="magic-cta relative flex w-full items-center justify-center gap-3 rounded-[1.5rem] px-8 py-6 text-xl font-extrabold tracking-tight"
      >
        <Clapperboard className="h-7 w-7 shrink-0" />
        Direct My Music Video
        <Sparkles />
      </button>
    </div>
  );
}
