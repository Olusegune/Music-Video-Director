// Direct workspace — Console layout. One shot at a time, full attention, with
// a scene navigator to move around the treatment without scrolling past 80+
// shot cards. Reuses ShotRow entirely for the shot surface (same generation
// wiring, same fields) — this is a spatial re-arrangement, not a new editor.
import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  Video as VideoIcon,
  Sparkles,
  Loader2,
  Wand2,
  SkipForward,
  Film,
} from "lucide-react";
import {
  approachColor,
  type MvTreatment,
  type MvSectionPlan,
  type MvShot,
} from "@/apps/music-video/lib/mvDirector";
import { sectionColor, formatTime } from "@/apps/music-video/lib/songBrain";
import { cn } from "@/platform/lib/utils";
import { AssetImage, AssetVideo } from "@/platform/components/ui/asset-image";
import { Button } from "@/platform/components/ui/button";
import { Toolbar, ToolbarSpacer } from "@/platform/components/ui/toolbar";
import { Tooltip } from "@/platform/components/ui/tooltip";
import { ShotRow } from "./ShotRow";
import type { PerformerOption, ContinuityInfo } from "./ChoreoPanel";

export function DirectConsole({
  treatment,
  onChange,
  onGenerate,
  onGenerateClip,
  onGeneratePoseSheet,
  onTune,
  genShotId,
  genClipId,
  genPoseId,
  isImageReady,
  defaultImageModelId,
  isVideoReady,
  defaultVideoModelId,
  performers,
  choreoMoves,
  poseSheets,
  buildPrompt,
  continuityFor,
  bpm,
  startExpanded,
}: {
  treatment: MvTreatment;
  onChange: (t: MvTreatment) => void;
  onGenerate: (section: MvSectionPlan, shot: MvShot) => void;
  onGenerateClip: (section: MvSectionPlan, shot: MvShot) => void;
  onGeneratePoseSheet: (section: MvSectionPlan, shot: MvShot) => void;
  onTune: (section: MvSectionPlan, shot: MvShot) => void;
  genShotId: string | null;
  genClipId: string | null;
  genPoseId: string | null;
  isImageReady: (modelId: string) => boolean;
  defaultImageModelId: string;
  isVideoReady: (modelId: string) => boolean;
  defaultVideoModelId: string;
  performers: PerformerOption[];
  choreoMoves: string[];
  poseSheets: { label: string; src: string }[];
  buildPrompt: (section: MvSectionPlan, shot: MvShot) => string;
  continuityFor: (section: MvSectionPlan, shot: MvShot) => ContinuityInfo;
  bpm: number;
  startExpanded?: boolean;
}) {
  // Flat, ordered (section, shot) pairs — the console's unit of navigation.
  const flat = treatment.sections.flatMap((section) =>
    section.shots.map((shot) => ({ section, shot }))
  );
  const [selectedId, setSelectedId] = useState<string>(flat[0]?.shot.id ?? "");
  useEffect(() => {
    // If the treatment reloads (new song / re-direct) with a shot id that no
    // longer exists, fall back to the first shot instead of a blank console.
    if (!flat.some((f) => f.shot.id === selectedId)) {
      setSelectedId(flat[0]?.shot.id ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [treatment.songId]);

  const idx = flat.findIndex((f) => f.shot.id === selectedId);
  const current = flat[idx] ?? flat[0];
  if (!current) return null;
  const { section, shot } = current;
  const color = sectionColor(section.kind);
  const aColor = approachColor(section.approach);
  const shotIndexInSection = section.shots.findIndex((s) => s.id === shot.id);

  const go = (delta: number) => {
    const next = flat[idx + delta];
    if (next) setSelectedId(next.shot.id);
  };

  // --- AI Director Copilot -------------------------------------------------
  // Real, computed navigation over the whole treatment — not a duplicate of
  // ShotRow's per-shot Director Brain suggestions, which stay where they are.
  const framesDone = flat.filter((f) => f.shot.imageUrl).length;
  const clipsDone = flat.filter((f) => f.shot.videoUrl).length;
  const sectionFramesDone = section.shots.filter((s) => s.imageUrl).length;

  const nextIndexMatching = (from: number, test: (f: (typeof flat)[number]) => boolean) => {
    for (let i = 1; i <= flat.length; i++) {
      const j = (from + i) % flat.length;
      if (test(flat[j])) return j;
    }
    return -1;
  };
  const nextEmptyIdx = nextIndexMatching(idx, (f) => !f.shot.imageUrl);
  const nextUnclippedIdx = nextIndexMatching(idx, (f) => Boolean(f.shot.imageUrl) && !f.shot.videoUrl);

  return (
    <div className="flex h-full min-h-0">
      {/* Scene navigator */}
      <div className="w-56 shrink-0 overflow-y-auto border-r border-border p-3">
        <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
          Scenes
        </p>
        <div className="space-y-3">
          {treatment.sections.map((s) => {
            const sColor = sectionColor(s.kind);
            const hasSelected = s.sectionId === section.sectionId;
            return (
              <div key={s.sectionId}>
                <div
                  className="mb-1 flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[11px] font-semibold"
                  style={{ color: sColor }}
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: sColor }} />
                  {s.label}
                  <span className="ml-auto font-normal tabular-nums text-muted">
                    {formatTime(s.start)}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {s.shots.map((sh, i) => {
                    const active = sh.id === shot.id;
                    return (
                      <button
                        key={sh.id}
                        onClick={() => setSelectedId(sh.id)}
                        title={`Shot ${i + 1} · ${formatTime(sh.start)}–${formatTime(sh.end)}`}
                        className={cn(
                          "relative aspect-square overflow-hidden rounded border transition-colors",
                          active
                            ? "border-primary ring-1 ring-primary"
                            : "border-border/60 hover:border-primary/50"
                        )}
                        style={
                          !active && hasSelected
                            ? { borderColor: `${sColor}55` }
                            : undefined
                        }
                      >
                        {sh.imageUrl ? (
                          <AssetImage
                            src={sh.imageUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-elevated">
                            <ImageIcon className="h-3 w-3 text-muted/40" />
                          </div>
                        )}
                        {sh.videoUrl && (
                          <span className="absolute bottom-0 right-0 flex h-3 w-3 items-center justify-center rounded-tl bg-success/90">
                            <VideoIcon className="h-2 w-2 text-white" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Console stage */}
      <div className="min-w-0 flex-1 overflow-y-auto">
        <Toolbar>
          <Tooltip label="Previous shot">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => go(-1)}
              disabled={idx <= 0}
              aria-label="Previous shot"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Tooltip>
          <span
            className="rounded-md px-2 py-1 text-xs font-semibold text-white"
            style={{ backgroundColor: color }}
          >
            {section.label}
          </span>
          <span
            className="rounded px-1.5 py-0.5 text-[10px] font-medium"
            style={{ background: `${aColor}1f`, color: aColor }}
          >
            {section.approach}
          </span>
          <span className="text-xs tabular-nums text-muted">
            Shot {shotIndexInSection + 1} of {section.shots.length} · {idx + 1}/{flat.length} overall
          </span>
          <Tooltip label="Next shot">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => go(1)}
              disabled={idx >= flat.length - 1}
              aria-label="Next shot"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Tooltip>
          <ToolbarSpacer />
        </Toolbar>

        {/* Large live shot preview — the console's hero surface. Distinct
            from ShotRow's own small monitor below (that one stays as the
            working reference while editing fields; this one is the "what am
            I directing right now" focal point). */}
        <div className="border-b border-border bg-background/40 px-4 py-4">
          <div
            className="relative mx-auto flex aspect-video max-h-[52vh] w-full max-w-4xl items-center justify-center overflow-hidden rounded-lg border"
            style={{ borderColor: `${color}55`, backgroundColor: "var(--color-elevated)" }}
          >
            {shot.videoUrl ? (
              <AssetVideo src={shot.videoUrl} className="h-full w-full object-contain" controls />
            ) : shot.imageUrl ? (
              <AssetImage
                src={shot.imageUrl}
                alt={shot.idea}
                className="h-full w-full object-contain"
                label="Frame"
              />
            ) : (
              <button
                type="button"
                onClick={() => onGenerate(section, shot)}
                disabled={genShotId === shot.id || !isImageReady(defaultImageModelId)}
                className="flex h-full w-full flex-col items-center justify-center gap-3 text-muted transition-colors hover:text-foreground disabled:cursor-not-allowed"
              >
                {genShotId === shot.id ? (
                  <Loader2 className="h-10 w-10 animate-spin" style={{ color }} />
                ) : (
                  <ImageIcon className="h-10 w-10 opacity-50" />
                )}
                <span className="text-sm font-medium">
                  {genShotId === shot.id ? "Directing this shot…" : "Click to direct this shot"}
                </span>
              </button>
            )}
            {!genShotId && (shot.imageUrl || shot.videoUrl) && (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-6">
                <p className="line-clamp-1 text-xs font-medium text-white/90">{shot.idea}</p>
              </div>
            )}
          </div>
          {!shot.imageUrl && !genShotId && (
            <div className="mx-auto mt-3 flex max-w-4xl justify-center">
              <Button size="sm" onClick={() => onGenerate(section, shot)} disabled={!isImageReady(defaultImageModelId)}>
                <Sparkles className="h-3.5 w-3.5" />
                Create Shot
              </Button>
            </div>
          )}
        </div>

        <div className="p-4">
          <ShotRow
            key={shot.id}
            shot={shot}
            index={shotIndexInSection}
            accent={color}
            generating={genShotId === shot.id}
            clipGenerating={genClipId === shot.id}
            poseGenerating={genPoseId === shot.id}
            isImageReady={isImageReady}
            defaultImageModelId={defaultImageModelId}
            isVideoReady={isVideoReady}
            defaultVideoModelId={defaultVideoModelId}
            onGenerate={() => onGenerate(section, shot)}
            onGenerateClip={() => onGenerateClip(section, shot)}
            onGeneratePoseSheet={() => onGeneratePoseSheet(section, shot)}
            onTune={() => onTune(section, shot)}
            performers={performers}
            choreoMoves={choreoMoves}
            poseSheets={poseSheets}
            sectionLabel={section.label}
            sectionKind={section.kind}
            energy={section.energy}
            bpm={bpm}
            approach={section.approach}
            continuity={continuityFor(section, shot)}
            promptPreview={buildPrompt(section, shot)}
            startExpanded={startExpanded}
            onChange={(next) =>
              onChange({
                ...treatment,
                sections: treatment.sections.map((s) =>
                  s.sectionId === section.sectionId
                    ? { ...s, shots: s.shots.map((sh) => (sh.id === shot.id ? next : sh)) }
                    : s
                ),
              })
            }
          />
        </div>
      </div>

      {/* AI Director Copilot — treatment-wide progress and smart navigation.
          Doesn't duplicate ShotRow's per-shot Director Brain suggestions;
          this is the thing only possible with a view over all 80+ shots. */}
      <div className="w-64 shrink-0 overflow-y-auto border-l border-border p-3">
        <div className="mb-3 flex items-center gap-1.5 px-1 text-[10px] font-semibold uppercase tracking-wide text-accent">
          <Wand2 className="h-3 w-3" />
          AI Director Copilot
        </div>

        <div className="space-y-3">
          <div className="rounded-md border border-border bg-surface p-2.5">
            <div className="mb-1.5 flex items-center justify-between text-[11px]">
              <span className="text-muted">Frames</span>
              <span className="font-medium tabular-nums">
                {framesDone}/{flat.length}
              </span>
            </div>
            <div className="h-1 overflow-hidden rounded bg-elevated">
              <div
                className="h-full bg-accent transition-all"
                style={{ width: `${flat.length ? (framesDone / flat.length) * 100 : 0}%` }}
              />
            </div>
            <div className="mb-1.5 mt-2.5 flex items-center justify-between text-[11px]">
              <span className="text-muted">Clips</span>
              <span className="font-medium tabular-nums">
                {clipsDone}/{flat.length}
              </span>
            </div>
            <div className="h-1 overflow-hidden rounded bg-elevated">
              <div
                className="h-full bg-success transition-all"
                style={{ width: `${flat.length ? (clipsDone / flat.length) * 100 : 0}%` }}
              />
            </div>
          </div>

          <div className="rounded-md border border-border bg-surface p-2.5">
            <p className="mb-1 text-[11px] font-medium">{section.label}</p>
            <p className="text-[11px] text-muted">
              {sectionFramesDone}/{section.shots.length} shots have a frame in this scene.
            </p>
          </div>

          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => nextEmptyIdx >= 0 && setSelectedId(flat[nextEmptyIdx].shot.id)}
              disabled={nextEmptyIdx < 0}
              className="flex w-full items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-2 text-left text-[11px] font-medium transition-colors hover:border-accent/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <SkipForward className="h-3.5 w-3.5 shrink-0 text-accent" />
              {nextEmptyIdx < 0 ? "Every shot has a frame" : "Jump to next shot needing a frame"}
            </button>
            <button
              type="button"
              onClick={() => nextUnclippedIdx >= 0 && setSelectedId(flat[nextUnclippedIdx].shot.id)}
              disabled={nextUnclippedIdx < 0}
              className="flex w-full items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-2 text-left text-[11px] font-medium transition-colors hover:border-accent/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Film className="h-3.5 w-3.5 shrink-0 text-accent" />
              {nextUnclippedIdx < 0
                ? "Every framed shot has a clip"
                : "Jump to next shot ready for a clip"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
