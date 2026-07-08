// Per-shot choreography assignment editor (extracted from MvDirector.tsx, Phase 2).
import { Plus } from "lucide-react";
import { type MvShot, type ChoreoAssignment } from "@/apps/music-video/lib/mvDirector";
import { cn } from "@/platform/lib/utils";
import { AssetImage } from "@/platform/components/ui/asset-image";
import { CHOREO_ENERGY, CHOREO_ROLES, mapCastRole } from "./shotHelpers";

export interface PerformerOption {
  name: string;
  characterId?: string;
  role: string;
  /** Portrait src for a visual performer chip, when available. */
  image?: string;
}

/** How a shot relates to its neighbours, for continuity intelligence. */
export interface ContinuityInfo {
  /** Same camera + lighting + intent as the previous shot. */
  prevMatches: boolean;
  /** A performer making their first appearance in the video, if any. */
  firstAppearance?: string;
  /** This section's energy is higher than the previous shot's. */
  energyRising: boolean;
}

/** Per-shot choreography + story-intent + editable final prompt. */
export function ChoreoPanel({
  shot,
  performers,
  choreoMoves,
  poseSheets,
  assignments,
  onAdd,
  onUpdate,
  onRemove,
  onChange,
}: {
  shot: MvShot;
  performers: PerformerOption[];
  choreoMoves: string[];
  poseSheets: { label: string; src: string }[];
  assignments: ChoreoAssignment[];
  onAdd: () => void;
  onUpdate: (i: number, patch: Partial<ChoreoAssignment>) => void;
  onRemove: (i: number) => void;
  onChange: (next: MvShot) => void;
}) {
  const inputCls =
    "h-7 w-full rounded border border-border bg-surface px-1.5 text-[11px] focus-visible:border-primary focus-visible:outline-none";
  return (
    <div className="mt-1.5 space-y-2 rounded-md border border-border/60 bg-elevated/30 p-2">
      {/* Story intent */}
      <label className="block">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted/80">
          Story intent (emotional goal of camera + light)
        </span>
        <textarea
          value={shot.storyIntent ?? ""}
          onChange={(e) => onChange({ ...shot, storyIntent: e.target.value || undefined })}
          rows={2}
          className="mt-0.5 w-full rounded border border-border bg-surface px-1.5 py-1 text-[11px] focus-visible:border-primary focus-visible:outline-none"
          placeholder="e.g. Low-angle push-in makes Neo Dude feel heroic as he celebrates the wonder of creation"
        />
      </label>

      {/* Performer assignments */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted/80">
          Choreography assignments
        </span>
        <datalist id={`moves-${shot.id}`}>
          {choreoMoves.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
        <datalist id={`perf-${shot.id}`}>
          {performers.map((p, i) => (
            <option key={p.characterId ?? `${p.name}-${i}`} value={p.name} />
          ))}
        </datalist>
        {assignments.length === 0 && (
          <p className="text-[10px] text-muted/70">
            No moves assigned — the shot uses the section's auto choreography. Add one to assign a
            specific performer + move.
          </p>
        )}
        {assignments.map((a, i) => (
          <div key={i} className="rounded border border-border/60 bg-surface/50 p-1.5">
            {/* Visual performer picker — portrait chips */}
            {performers.length > 0 && (
              <div className="mb-1 flex gap-1.5 overflow-x-auto pb-1">
                {performers.map((p, pi) => {
                  const on = a.performer === p.name;
                  return (
                    <button
                      key={p.characterId ?? `${p.name}-${pi}`}
                      type="button"
                      onClick={() =>
                        onUpdate(i, {
                          performer: p.name,
                          characterId: p.characterId,
                          role: p.role === "Character" ? a.role : mapCastRole(p.role),
                        })
                      }
                      className={cn(
                        "flex shrink-0 items-center gap-1.5 rounded-full border py-0.5 pl-0.5 pr-2.5 transition-colors",
                        on
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border bg-surface text-muted hover:border-primary/40 hover:text-foreground"
                      )}
                      title={`${p.name} — ${p.role}`}
                    >
                      {p.image ? (
                        <AssetImage
                          src={p.image}
                          alt={p.name}
                          className="h-7 w-7 rounded-full object-cover"
                        />
                      ) : (
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-elevated text-[10px] font-semibold uppercase">
                          {p.name.slice(0, 2)}
                        </span>
                      )}
                      <span className="text-[12px] font-medium">{p.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
            <div className="grid grid-cols-2 gap-1">
              <input
                list={`perf-${shot.id}`}
                value={a.performer}
                onChange={(e) => {
                  const match = performers.find((p) => p.name === e.target.value);
                  onUpdate(i, { performer: e.target.value, characterId: match?.characterId });
                }}
                className={inputCls}
                placeholder="Performer (or pick above)"
              />
              <select
                value={a.role}
                onChange={(e) => onUpdate(i, { role: e.target.value })}
                className={inputCls}
              >
                {CHOREO_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            {/* Pose-sheet thumbnails — generated in Choreography (visual moves) */}
            {poseSheets.length > 0 && (
              <div className="mt-1 flex gap-1.5 overflow-x-auto pb-1">
                {poseSheets.map((ps, psi) => (
                  <button
                    key={psi}
                    type="button"
                    onClick={() => {
                      onUpdate(i, { move: ps.label });
                      const cur = shot.refImages ?? [];
                      if (!cur.includes(ps.src)) onChange({ ...shot, refImages: [...cur, ps.src] });
                    }}
                    className="flex w-16 shrink-0 flex-col items-center gap-0.5"
                    title={`Use pose: ${ps.label} (adds it as a reference image)`}
                  >
                    <AssetImage
                      src={ps.src}
                      alt={ps.label}
                      className={cn(
                        "h-16 w-16 rounded-md border-2 object-cover",
                        a.move === ps.label ? "border-primary" : "border-border"
                      )}
                    />
                    <span className="w-full truncate text-center text-[9px] text-muted">
                      {ps.label}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {/* Visual move browser — from the song's choreography library */}
            {choreoMoves.length > 0 && (
              <div className="mt-1 flex max-h-24 flex-wrap gap-1 overflow-y-auto rounded border border-border/40 bg-elevated/20 p-1">
                {choreoMoves.map((m, mi) => (
                  <button
                    key={mi}
                    type="button"
                    onClick={() => onUpdate(i, { move: m })}
                    className={cn(
                      "rounded border px-1.5 py-1 text-left text-[11px] leading-tight transition-colors",
                      a.move === m
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border bg-surface text-muted hover:border-primary/40 hover:text-foreground"
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
            <input
              list={`moves-${shot.id}`}
              value={a.move}
              onChange={(e) => onUpdate(i, { move: e.target.value })}
              className={cn(inputCls, "mt-1")}
              placeholder={
                choreoMoves.length
                  ? "Move / pose (pick above or type)"
                  : "Move / pose — generate choreography to browse the library, or type here"
              }
            />
            <div className="mt-1 grid grid-cols-3 gap-1">
              <select
                value={a.energy ?? ""}
                onChange={(e) => onUpdate(i, { energy: e.target.value || undefined })}
                className={inputCls}
                title="Energy"
              >
                {CHOREO_ENERGY.map((en) => (
                  <option key={en} value={en}>
                    {en || "Energy…"}
                  </option>
                ))}
              </select>
              <input
                value={a.expression ?? ""}
                onChange={(e) => onUpdate(i, { expression: e.target.value || undefined })}
                className={inputCls}
                placeholder="Expression"
              />
              <input
                value={a.formation ?? ""}
                onChange={(e) => onUpdate(i, { formation: e.target.value || undefined })}
                className={inputCls}
                placeholder="Formation"
              />
            </div>
            <button
              onClick={() => onRemove(i)}
              className="mt-1 text-[10px] text-danger hover:underline"
            >
              Remove assignment
            </button>
          </div>
        ))}
        <button
          onClick={onAdd}
          className="flex items-center gap-1 rounded border border-dashed border-border px-2 py-1 text-[10px] font-medium text-muted hover:border-primary/50 hover:text-primary"
        >
          <Plus className="h-3 w-3" /> Add performer + move
        </button>
      </div>
    </div>
  );
}

/** Roles a choreography move can be assigned to within a shot. */
