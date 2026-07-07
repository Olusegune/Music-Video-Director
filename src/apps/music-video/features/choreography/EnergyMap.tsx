// EnergyMap — a whole-song energy shape at a glance: every section (verse,
// chorus, dance break, ...) as one bar, height driven by the song's own
// per-section energy value. Choreographed sections are full-opacity and
// clickable (jump to their card below); free-movement sections are dimmed,
// since there's nothing below to jump to.
import { Activity } from "lucide-react";
import { sectionColor, type SongMap } from "@/apps/music-video/lib/songBrain";
import type { ChoreoPlan } from "@/apps/music-video/lib/choreography";
import { cn } from "@/platform/lib/utils";
import { HelpHint } from "@/platform/components/ui/help-hint";

export function EnergyMap({
  song,
  plan,
  onSelectSection,
}: {
  song: SongMap;
  plan: ChoreoPlan | null;
  onSelectSection?: (sectionId: string) => void;
}) {
  const dur = Math.max(1, song.durationSec);
  if (song.sections.length === 0) return null;

  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-surface p-3">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
        <Activity className="h-3.5 w-3.5" /> Energy map
        <HelpHint
          title="Energy map"
          body="The whole song's intensity at a glance — each bar is one section, taller = higher energy. Full-color bars are choreographed (click one to jump to it); dimmed bars are free-movement."
          example="A tall pink bar is your chorus at peak energy — that's where the biggest choreography moment lands."
        />
      </div>
      <div className="flex h-16 items-end gap-0.5">
        {song.sections.map((s) => {
          const choreoSection = plan?.sections.find((cs) => cs.sectionId === s.id);
          const energy = choreoSection?.energy ?? s.energy;
          const widthPct = ((s.end - s.start) / dur) * 100;
          const heightPct = Math.max(10, Math.round(energy * 100));
          const clickable = !!choreoSection && !!onSelectSection;
          return (
            <button
              key={s.id}
              type="button"
              disabled={!clickable}
              onClick={() => choreoSection && onSelectSection?.(choreoSection.sectionId)}
              className={cn(
                "group relative flex h-full flex-col justify-end",
                clickable ? "cursor-pointer" : "cursor-default"
              )}
              style={{ width: `${widthPct}%`, minWidth: "3px" }}
              title={`${s.label} — ${Math.round(energy * 100)}% energy${choreoSection ? " · choreographed, click to jump to it" : " · free movement"}`}
            >
              <span
                className="w-full rounded-t transition-opacity group-hover:opacity-80"
                style={{
                  height: `${heightPct}%`,
                  backgroundColor: sectionColor(s.kind),
                  opacity: choreoSection ? 1 : 0.3,
                }}
              />
            </button>
          );
        })}
      </div>
      <div className="mt-1.5 flex justify-between text-[9px] uppercase tracking-wide text-muted">
        <span>Low</span>
        <span>Medium</span>
        <span>High</span>
        <span>Peak</span>
      </div>
    </div>
  );
}
