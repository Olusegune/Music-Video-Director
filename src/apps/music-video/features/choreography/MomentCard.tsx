// MomentCard — a visual choreography "moment" card, replacing the raw
// "BAR 45 / 1-4 sharp arm choreo" text row. Collapsed, it reads as a
// performance beat you can scan at a glance; expanded, it's the same
// editable bar-by-bar text fields that were always here — nothing lost,
// just tucked one tap down.
import { useState } from "react";
import { ChevronDown, Music } from "lucide-react";
import { cn } from "@/platform/lib/utils";
import { formatTime } from "@/apps/music-video/lib/songBrain";
import type { EightCount } from "@/apps/music-video/lib/choreography";

const ENERGY_DOTS: Record<string, number> = {
  Low: 1,
  Medium: 2,
  High: 3,
  Peak: 4,
};

/** Best-effort dot count from a freeform intensity string like "High — sharp and committed". */
function energyLevel(intensity: string): number {
  const hit = Object.keys(ENERGY_DOTS).find((k) =>
    intensity.toLowerCase().includes(k.toLowerCase())
  );
  return hit ? ENERGY_DOTS[hit] : 2;
}

/** A short, title-cased label pulled from the move text, e.g. "sharp arm
 *  choreo, snap on the count" → "Sharp Arm Choreo" — purely presentational,
 *  the full text is never lost (it's still the editable field underneath). */
function momentTitle(phrase: string): string {
  const words = phrase.split(/[,;]/)[0]?.trim().split(/\s+/).slice(0, 3) ?? [];
  if (words.length === 0) return "Move";
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

export function MomentCard({
  ec,
  intensity,
  onChangePhrase,
}: {
  ec: EightCount;
  /** The section's overall intensity — moments don't track energy individually. */
  intensity: string;
  onChangePhrase: (key: "phraseA" | "phraseB", value: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const level = energyLevel(intensity);
  const title = momentTitle(ec.phraseA) || momentTitle(ec.phraseB);

  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start gap-3 p-3 text-left"
        aria-expanded={expanded}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-elevated text-accent">
          <Music className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-foreground">{title}</span>
            <span className="flex shrink-0 items-center gap-0.5" title={`Energy: ${intensity}`}>
              {[1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    i <= level ? "bg-primary" : "bg-elevated"
                  )}
                />
              ))}
            </span>
          </div>
          <p className="truncate text-[11px] text-muted">
            Bar {ec.bar} · {formatTime(ec.startSec)}
          </p>
          <p className="mt-1 line-clamp-2 text-xs text-muted">
            {ec.phraseA}
            {ec.phraseB ? ` → ${ec.phraseB}` : ""}
          </p>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted transition-transform",
            expanded && "rotate-180"
          )}
        />
      </button>

      {expanded && (
        <div className="space-y-1.5 border-t border-border bg-elevated/30 p-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-accent">1-4</span>
            <input
              defaultValue={ec.phraseA}
              onChange={(e) => onChangePhrase("phraseA", e.target.value)}
              aria-label={`Bar ${ec.bar} counts 1-4`}
              className="flex-1 rounded border border-transparent bg-transparent px-1 text-sm hover:border-border focus-visible:border-primary focus-visible:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-accent">5-8</span>
            <input
              defaultValue={ec.phraseB}
              onChange={(e) => onChangePhrase("phraseB", e.target.value)}
              aria-label={`Bar ${ec.bar} counts 5-8`}
              className="flex-1 rounded border border-transparent bg-transparent px-1 text-sm hover:border-border focus-visible:border-primary focus-visible:outline-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}
