// Director-mode storyboard cards: SimpleTreatmentView + SimpleShotCard (extracted, Phase 2).
import { Film, Scissors, ImageIcon, Loader2, Sparkles, Video, Users } from "lucide-react";
import { type MvTreatment, type MvSectionPlan, type MvShot } from "@/apps/music-video/lib/mvDirector";
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
    <div className="space-y-5 p-6">
      <Card>
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
          <div key={section.sectionId} className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <span
                className="flex h-6 items-center rounded-md px-2 text-xs font-semibold text-white"
                style={{ backgroundColor: color }}
              >
                {section.label}
              </span>
              <span className="text-xs tabular-nums text-muted">
                {formatTime(section.start)} – {formatTime(section.end)}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {section.shots.map((shot) => (
                <SimpleShotCard
                  key={shot.id}
                  shot={shot}
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

  // One primary action per scene: get a frame, then a clip, then let them
  // regenerate — the natural next step, never a dead end.
  const primary = !shot.imageUrl
    ? { label: "Generate Frame", action: onGenerate, busy: generating }
    : !shot.videoUrl
      ? { label: "Generate Clip", action: onGenerateClip, busy: clipGenerating }
      : { label: "Regenerate Scene", action: onGenerate, busy: generating };

  return (
    <div
      className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface"
      style={{ borderLeft: `3px solid ${accent}` }}
    >
      <div className="relative aspect-video w-full bg-elevated">
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
          <div className="flex h-full w-full items-center justify-center text-muted">
            <ImageIcon className="h-6 w-6" />
          </div>
        )}
        <span className="absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-white">
          {formatTime(shot.start)}–{formatTime(shot.end)}
          {bpm > 0 && ` · ${beatRangeLabel(shot.start, shot.end, bpm)}`}
        </span>
      </div>

      <div className="space-y-2 p-3">
        <p className="line-clamp-2 text-sm text-foreground">{shot.idea}</p>

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
            className="flex-1"
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

