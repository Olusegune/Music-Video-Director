// Click-a-shot detail panel (extracted from TimelineView.tsx, Phase 2).
import { useState } from "react";
import {
  Film,
  X,
  Sparkles,
  Users,
  Camera,
  CheckCircle2,
  Circle,
  ImageIcon,
  RefreshCw,
  Video,
  ArrowLeftFromLine,
  ArrowRightFromLine,
  Loader2,
} from "lucide-react";
import { formatTime } from "@/apps/music-video/lib/songBrain";
import { type MvTreatment, type MvShot } from "@/apps/music-video/lib/mvDirector";
import { type Performer } from "@/apps/music-video/lib/cast";
import { buildShotImagePrompt, buildShotVideoPrompt } from "@/apps/music-video/lib/mvGen";
import type { Character } from "@/platform/lib/types";
import { api } from "@/platform/lib/ipc";
import { AssetImage, AssetVideo } from "@/platform/components/ui/asset-image";
import { Button } from "@/platform/components/ui/button";

export function ShotDetailPanel({
  treatment,
  sectionId,
  shotId,
  cast,
  characters,
  prevShot,
  nextShot,
  onPatch,
  onClose,
}: {
  treatment: MvTreatment;
  sectionId: string;
  shotId: string;
  cast: Performer[];
  characters: Character[];
  /** Adjacent shots in timeline order, for "Match Previous/Next Shot". */
  prevShot?: { imageUrl?: string } | null;
  nextShot?: { imageUrl?: string } | null;
  /** Persist a field patch on this shot (image/video url, etc). */
  onPatch?: (sectionId: string, shotId: string, patch: Partial<MvShot>) => void;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState<"image" | "video" | "matchPrev" | "matchNext" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const section = treatment.sections.find((s) => s.sectionId === sectionId);
  const shot = section?.shots.find((s) => s.id === shotId);
  if (!section || !shot) return null;

  const prompt = buildShotImagePrompt({
    shot,
    section,
    treatment,
    cast,
    characters,
    aspect: "16:9",
  });

  const regenerateImage = async (matchRef?: string) => {
    setError(null);
    setBusy(matchRef ? (matchRef === prevShot?.imageUrl ? "matchPrev" : "matchNext") : "image");
    try {
      const url = await api.generateImageFromSpec({
        capability: "image",
        prompt,
        aspect: "16:9",
        references: matchRef ? [{ url: matchRef, category: "style", strength: 0.7 }] : undefined,
        moduleId: "musicvideo",
        projectRef: { moduleId: "musicvideo", projectId: treatment.songId, entityId: shot.id },
      });
      onPatch?.(sectionId, shot.id, { imageUrl: url });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const regenerateVideo = async () => {
    setError(null);
    setBusy("video");
    try {
      const videoPrompt = buildShotVideoPrompt({
        shot,
        section,
        treatment,
        cast,
        characters,
        aspect: "16:9",
      });
      const url = await api.generateVideoFromSpec(
        {
          capability: "video",
          prompt: videoPrompt,
          references: shot.imageUrl ? [{ url: shot.imageUrl, category: "scene" }] : undefined,
          moduleId: "musicvideo",
          projectRef: { moduleId: "musicvideo", projectId: treatment.songId, entityId: shot.id },
        },
        treatment.songId,
        shot.id
      );
      onPatch?.(sectionId, shot.id, { videoUrl: url });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };
  const who = (shot.choreo ?? []).map((a) => a.performer).filter(Boolean);
  const status: { label: string; icon: React.ReactNode; color: string } = shot.videoUrl
    ? { label: "Clip rendered", icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: "#16a34a" }
    : shot.imageUrl
      ? {
          label: "Frame only — no clip yet",
          icon: <Circle className="h-3.5 w-3.5 fill-current" />,
          color: "#d97706",
        }
      : {
          label: "Nothing generated yet",
          icon: <Circle className="h-3.5 w-3.5" />,
          color: "var(--color-muted)",
        };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-background/80 p-6 backdrop-blur"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-[var(--radius-modal)] border border-border bg-surface shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold">
            {section.label} · {formatTime(shot.start)}–{formatTime(shot.end)}
          </h2>
          <button onClick={onClose} aria-label="Close">
            <X className="h-4 w-4 text-muted hover:text-foreground" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="aspect-video w-full overflow-hidden rounded-lg bg-elevated">
            {shot.videoUrl ? (
              <AssetVideo src={shot.videoUrl} className="h-full w-full object-cover" controls />
            ) : shot.imageUrl ? (
              <AssetImage
                src={shot.imageUrl}
                alt=""
                className="h-full w-full object-cover"
                label="Frame"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted">
                <ImageIcon className="h-6 w-6" />
              </div>
            )}
          </div>

          <DetailField icon={<Sparkles className="h-3.5 w-3.5" />} label="Story beat">
            {section.concept || shot.idea}
          </DetailField>

          <DetailField icon={<Users className="h-3.5 w-3.5" />} label="Characters">
            {who.length > 0 ? who.join(", ") : "No one assigned yet"}
          </DetailField>

          <DetailField icon={<Camera className="h-3.5 w-3.5" />} label="Camera">
            {[shot.shotType, shot.movement, shot.lighting].filter(Boolean).join(" · ") || "—"}
          </DetailField>

          <DetailField
            icon={<span style={{ color: status.color }}>{status.icon}</span>}
            label="Render status"
          >
            <span style={{ color: status.color }}>{status.label}</span>
          </DetailField>

          <DetailField icon={<Film className="h-3.5 w-3.5" />} label="Prompt">
            <p className="whitespace-pre-wrap text-xs leading-relaxed text-muted">{prompt}</p>
          </DetailField>

          {error && (
            <p className="rounded-md border border-danger/30 bg-danger/10 p-2 text-[11px] text-danger">
              {error}
            </p>
          )}

          <div>
            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
              <Sparkles className="h-3.5 w-3.5" />
              AI actions
            </div>
            <div className="grid grid-cols-2 gap-2">
              <ShotActionButton
                icon={busy === "image" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                label="Regenerate Image"
                disabled={busy !== null}
                onClick={() => regenerateImage()}
              />
              <ShotActionButton
                icon={busy === "video" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Video className="h-3.5 w-3.5" />}
                label="Regenerate Video"
                disabled={busy !== null || !shot.imageUrl}
                title={!shot.imageUrl ? "Generate a frame first" : undefined}
                onClick={regenerateVideo}
              />
              <ShotActionButton
                icon={
                  busy === "matchPrev" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ArrowLeftFromLine className="h-3.5 w-3.5" />
                  )
                }
                label="Match Previous Shot"
                disabled={busy !== null || !prevShot?.imageUrl}
                title={!prevShot?.imageUrl ? "Previous shot has no frame yet" : undefined}
                onClick={() => regenerateImage(prevShot?.imageUrl)}
              />
              <ShotActionButton
                icon={
                  busy === "matchNext" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ArrowRightFromLine className="h-3.5 w-3.5" />
                  )
                }
                label="Match Next Shot"
                disabled={busy !== null || !nextShot?.imageUrl}
                title={!nextShot?.imageUrl ? "Next shot has no frame yet" : undefined}
                onClick={() => regenerateImage(nextShot?.imageUrl)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailField({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
        {icon}
        {label}
      </div>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
}

function ShotActionButton({
  icon,
  label,
  onClick,
  disabled,
  title,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="justify-start"
    >
      {icon}
      <span className="truncate">{label}</span>
    </Button>
  );
}
