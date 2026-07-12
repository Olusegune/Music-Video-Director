// Director-mode storyboard cards: SimpleTreatmentView + SimpleShotCard (extracted, Phase 2).
import { Film, Scissors, ImageIcon, Loader2, Sparkles, Video, Users } from "lucide-react";
import {
  type MvTreatment,
  type MvSectionPlan,
  type MvShot,
} from "@/apps/music-video/lib/mvDirector";
import { sectionColor, formatTime } from "@/apps/music-video/lib/songBrain";
import { Button } from "@/platform/components/ui/button";
import { Badge } from "@/platform/components/ui/badge";
import { Card, CardContent } from "@/platform/components/ui/card";
import { AssetImage, AssetVideo } from "@/platform/components/ui/asset-image";
import { beatRangeLabel } from "./shotHelpers";

export function SimpleTreatmentView({
  treatment,
  onGenerate,
  onGenerateClip,
  onEdit,
  genShotId,
  genClipId,
  isImageReady,
  defaultImageModelId,
  bpm,
}: {
  treatment: MvTreatment;
  onGenerate: (section: MvSectionPlan, shot: MvShot) => void;
  onGenerateClip: (section: MvSectionPlan, shot: MvShot) => void;
  onEdit: (section: MvSectionPlan, shot: MvShot) => void;
  genShotId: string | null;
  genClipId: string | null;
  isImageReady: (modelId: string) => boolean;
  defaultImageModelId: string;
  bpm: number;
}) {
  const totalShots = treatment.sections.reduce((a, s) => a + s.shots.length, 0);
  const imageReady = isImageReady(defaultImageModelId);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-6">
      <Card className="overflow-hidden">
        <div className="grad-primary h-1 w-full" />
        <CardContent className="space-y-2 p-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
            <Film className="h-3.5 w-3.5" />
            Story
            <Badge variant="primary" className="ml-1 normal-case">
              {totalShots} shots
            </Badge>
          </div>
          <p className="text-base font-semibold leading-snug">{treatment.logline}</p>
          <p className="text-sm text-muted">{treatment.energyArc}</p>
        </CardContent>
      </Card>

      {treatment.sections.map((section) => {
        const color = sectionColor(section.kind);
        return (
          <div key={section.sectionId} className="space-y-3">
            <div className="flex items-center gap-2.5 px-1">
              <span
                className="flex h-6 items-center rounded-md px-2 text-xs font-semibold text-white shadow-sm"
                style={{ backgroundColor: color }}
              >
                {section.label}
              </span>
              <span className="text-xs tabular-nums text-muted">
                {formatTime(section.start)} – {formatTime(section.end)}
              </span>
              <span
                className="h-px flex-1"
                style={{ background: `linear-gradient(90deg, ${color}55, transparent)` }}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {section.shots.map((shot, i) => (
                <SimpleShotCard
                  key={shot.id}
                  shot={shot}
                  index={i}
                  accent={color}
                  bpm={bpm}
                  generating={genShotId === shot.id}
                  clipGenerating={genClipId === shot.id}
                  imageReady={imageReady}
                  onGenerate={() => onGenerate(section, shot)}
                  onGenerateClip={() => onGenerateClip(section, shot)}
                  onEdit={() => onEdit(section, shot)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SimpleShotCard({
  shot,
  index,
  accent,
  bpm,
  generating,
  clipGenerating,
  imageReady,
  onGenerate,
  onGenerateClip,
  onEdit,
}: {
  shot: MvShot;
  index: number;
  accent: string;
  bpm: number;
  generating: boolean;
  clipGenerating: boolean;
  imageReady: boolean;
  onGenerate: () => void;
  onGenerateClip: () => void;
  onEdit: () => void;
}) {
  const who = (shot.choreo ?? []).map((a) => a.performer).filter(Boolean);
  const cameraVibe = [shot.shotType, shot.movement].filter(Boolean).join(" · ");
  const busy = generating || clipGenerating;
  const hasMedia = Boolean(shot.videoUrl || shot.imageUrl);

  // One primary action per scene: get a frame, then a clip, then let them
  // regenerate — the natural next step, never a dead end.
  const primary = !shot.imageUrl
    ? { label: "Generate Frame", action: onGenerate, busy: generating }
    : !shot.videoUrl
      ? { label: "Generate Clip", action: onGenerateClip, busy: clipGenerating }
      : { label: "Regenerate Scene", action: onGenerate, busy: generating };

  return (
    <div className="group overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface shadow-card transition-shadow hover:shadow-md">
      <div
        className="relative aspect-[4/3] w-full overflow-hidden"
        style={
          !hasMedia
            ? { background: `linear-gradient(160deg, ${accent}22, var(--color-elevated) 65%)` }
            : { backgroundColor: "var(--color-elevated)" }
        }
      >
        {shot.videoUrl ? (
          <AssetVideo src={shot.videoUrl} className="h-full w-full object-cover" />
        ) : shot.imageUrl ? (
          <AssetImage
            src={shot.imageUrl}
            alt={shot.idea}
            className="h-full w-full object-cover"
            label="Frame"
            onRegenerate={onGenerate}
          />
        ) : (
          <button
            type="button"
            onClick={onGenerate}
            disabled={busy || !imageReady}
            className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted transition-colors hover:text-foreground disabled:cursor-not-allowed"
          >
            {generating ? (
              <Loader2 className="h-7 w-7 animate-spin" style={{ color: accent }} />
            ) : (
              <ImageIcon className="h-7 w-7 opacity-60 transition-opacity group-hover:opacity-100" />
            )}
            <span className="text-[11px] font-medium">
              {generating ? "Directing this shot…" : "Click to generate this shot"}
            </span>
          </button>
        )}
        <span
          className="absolute left-2 top-2 flex h-5 min-w-[1.25rem] items-center justify-center rounded px-1 text-[10px] font-bold text-white"
          style={{ backgroundColor: accent }}
        >
          {index + 1}
        </span>
        <span className="absolute right-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-white">
          {formatTime(shot.start)}–{formatTime(shot.end)}
          {bpm > 0 && ` · ${beatRangeLabel(shot.start, shot.end, bpm)}`}
        </span>
      </div>

      <div className="space-y-2 p-3">
        <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
          {shot.idea}
        </p>

        <div className="flex flex-wrap gap-1.5 text-[11px] text-muted">
          <span className="inline-flex items-center gap-1 rounded bg-elevated px-1.5 py-0.5">
            <Users className="h-3 w-3" />
            {who.length > 0 ? who.join(", ") : "No one assigned"}
          </span>
          {cameraVibe && (
            <span className="inline-flex items-center gap-1 rounded bg-elevated px-1.5 py-0.5">
              <Video className="h-3 w-3" />
              {cameraVibe}
            </span>
          )}
          {shot.storyIntent && (
            <span className="rounded bg-elevated px-1.5 py-0.5">{shot.storyIntent}</span>
          )}
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Button
            size="sm"
            className="grad-primary flex-1 border-0 text-white shadow-sm"
            onClick={primary.action}
            disabled={busy || !imageReady}
            title={imageReady ? undefined : "Add an image provider key in API Keys"}
          >
            {primary.busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {primary.label}
          </Button>
          <button
            onClick={onEdit}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-button)] border border-border text-muted hover:border-primary/40 hover:text-primary"
            title="Edit Scene — full prompt, model, and reference controls"
            aria-label="Edit scene"
          >
            <Scissors className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
