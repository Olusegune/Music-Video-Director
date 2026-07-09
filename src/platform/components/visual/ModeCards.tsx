import { STUDIO_MODES, type StudioMode } from "@/platform/lib/settings";
import { cn } from "@/platform/lib/utils";
import directorArt from "@/assets/modes/director.webp";
import studioArt from "@/assets/modes/studio.webp";
import creatorArt from "@/assets/modes/creator.webp";

// Premium visual mode selector shared by every module. One component, one set of
// artwork, one set of taglines — so Director / Studio / Creator read identically
// across Music Video, Motion, Glam, Web, and Campaign. Presentation-only:
// switching a mode never loses work.

const ART: Record<StudioMode, string> = {
  director: directorArt,
  studio: studioArt,
  creator: creatorArt,
};

const TAGLINE: Record<StudioMode, string> = {
  director: "One visionary directing a cinematic production.",
  studio: "A professional creative team bringing the vision to life.",
  creator: "A master creator orchestrating an entire creative universe.",
};

export function ModeCards({
  mode,
  onModeChange,
  layout = "stack",
  className,
}: {
  mode: StudioMode;
  onModeChange: (mode: StudioMode) => void;
  /** "stack" for sidebar columns, "row" for a horizontal strip. */
  layout?: "stack" | "row";
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Studio mode"
      className={cn(
        layout === "row" ? "grid grid-cols-1 gap-3 sm:grid-cols-3" : "space-y-3",
        className
      )}
    >
      {STUDIO_MODES.map((m) => {
        const active = mode === m.id;
        return (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={active}
            title={m.hint}
            onClick={() => onModeChange(m.id)}
            className={cn(
              "group relative block w-full overflow-hidden rounded-xl border text-left transition duration-200 ease-out",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              active
                ? "border-primary ring-1 ring-primary/60"
                : "border-border hover:-translate-y-0.5 hover:border-primary/40"
            )}
          >
            <div className="relative aspect-[16/9] w-full">
              <img
                src={ART[m.id]}
                alt=""
                aria-hidden
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition duration-300 ease-out group-hover:scale-[1.03]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/5" />
              {active && (
                <span className="absolute right-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground shadow">
                  Active
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 p-3">
                <div className="text-sm font-semibold text-white drop-shadow">{m.label}</div>
                <div className="mt-0.5 text-[11px] leading-snug text-white/75">{TAGLINE[m.id]}</div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
