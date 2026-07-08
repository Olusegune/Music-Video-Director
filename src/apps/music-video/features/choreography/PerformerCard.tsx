// PerformerCard — a real card in place of the old identity-only pill, for the
// Choreography page's top-of-page cast roster. Clicking a card focuses that
// performer everywhere below: every section's "Choreographing for" selector
// jumps to them at once, instead of re-picking per section.
import { Users } from "lucide-react";
import type { Performer } from "@/apps/music-video/lib/cast";
import { roleColor } from "@/apps/music-video/lib/cast";
import type { Character } from "@/platform/lib/types";
import { AssetImage } from "@/platform/components/ui/asset-image";
import { cn } from "@/platform/lib/utils";

export function PerformerCard({
  performer,
  character,
  active,
  onClick,
}: {
  performer: Performer;
  character: Character | null;
  active: boolean;
  onClick: () => void;
}) {
  const color = roleColor(performer.role);
  return (
    <button
      type="button"
      onClick={onClick}
      title={`Choreograph for ${performer.name || "this performer"} across every section`}
      className={cn(
        "flex w-40 shrink-0 flex-col items-center gap-2 rounded-[var(--radius-card)] border p-3 text-center transition-colors",
        active ? "border-primary bg-primary/10" : "border-border bg-surface hover:border-primary/40"
      )}
    >
      <span
        className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full"
        style={{ backgroundColor: `${color}22` }}
      >
        {character?.portraitUrl ? (
          <AssetImage
            src={character.portraitUrl}
            alt={performer.name}
            className="h-full w-full object-cover"
            label="Portrait"
          />
        ) : (
          <span className="text-lg font-bold" style={{ color }}>
            {(performer.name || "?").slice(0, 2).toUpperCase()}
          </span>
        )}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">
          {performer.name || "Unnamed"}
        </p>
        <p className="truncate text-[11px] font-medium" style={{ color }}>
          {performer.role}
        </p>
        {performer.danceStyle && (
          <p className="mt-0.5 truncate text-[10px] text-muted">{performer.danceStyle}</p>
        )}
      </div>
    </button>
  );
}

/** The "no specific performer" option, kept visually consistent with real cards. */
export function GenericPerformerCard({
  active,
  onClick,
}: {
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Generic performer — no specific cast member"
      className={cn(
        "flex w-40 shrink-0 flex-col items-center gap-2 rounded-[var(--radius-card)] border border-dashed p-3 text-center transition-colors",
        active ? "border-primary bg-primary/10" : "border-border bg-surface hover:border-primary/40"
      )}
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-elevated">
        <Users className="h-6 w-6 text-muted" />
      </span>
      <div>
        <p className="text-sm font-semibold text-foreground">Generic</p>
        <p className="text-[11px] text-muted">No cast member</p>
      </div>
    </button>
  );
}
