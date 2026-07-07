// ShotRow + private pieces: OmniSlot, DirChip, ShotPreview, MetaEdit (extracted from MvDirector.tsx, Phase 2).
import { useEffect, useRef, useState } from "react";
import { MapPin, Quote, ImageIcon, Loader2, Sparkles, Video, Download, Maximize2, ZoomIn, ZoomOut, Plus, X, Check, Upload, SlidersHorizontal, LayoutGrid } from "lucide-react";
import { type MvShot, type ChoreoAssignment } from "@/lib/mvDirector";
import { formatTime } from "@/lib/songBrain";
import { VIDEO_MODELS, videoCaps } from "@/lib/videoGen";
import { useAppStore } from "@/store/useAppStore";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AssetImage, AssetVideo } from "@/components/ui/asset-image";
import { AssetPicker } from "@/features/assets/AssetPicker";
import { MentionTextarea } from "@/components/ui/mention-textarea";
import { CAMERA_PRESETS, LIGHTING_PRESETS, STORY_EMOTIONS, GEN_MODELS, badgeLabel, beatRangeLabel, directorBrain, directorSummary, downloadAsset, energyLabel, fileToDataUrl } from "./shotHelpers";
import { ChoreoPanel, type PerformerOption, type ContinuityInfo } from "./ChoreoPanel";

function OmniSlot({
  label,
  accept,
  filled,
  preview,
  onPick,
  onClear,
}: {
  label: string;
  accept: string;
  filled: boolean;
  preview?: string;
  onPick: (file: File) => void;
  onClear: () => void;
}) {
  return (
    <div className="relative">
      <label
        className={cn(
          "flex h-11 w-11 cursor-pointer flex-col items-center justify-center gap-0.5 overflow-hidden rounded-md border text-center text-[8px] font-medium leading-tight",
          filled
            ? "border-primary/60 bg-primary/10 text-primary"
            : "border-dashed border-border text-muted hover:border-primary/50 hover:text-primary"
        )}
        title={`Attach ${label}`}
      >
        {preview ? (
          <AssetImage src={preview} alt={label} className="h-full w-full object-cover" />
        ) : (
          <>
            {filled ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3 w-3" />}
            <span className="px-0.5">{label}</span>
          </>
        )}
        <input
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onPick(f);
            e.target.value = "";
          }}
        />
      </label>
      {filled && (
        <button
          onClick={onClear}
          className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-white"
          title={`Remove ${label}`}
        >
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </div>
  );
}

/** A performer the user can assign a choreography move to. */

function DirChip({
  label,
  active,
  accent,
  onClick,
}: {
  label: string;
  active: boolean;
  accent?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md border px-3 py-1.5 text-[13px] font-medium leading-tight transition-colors",
        active
          ? "border-primary bg-primary/15 text-primary"
          : "border-border bg-surface text-muted hover:border-primary/40 hover:text-foreground"
      )}
      style={active && accent ? { borderColor: accent, color: accent, background: `${accent}1a` } : undefined}
    >
      {label}
    </button>
  );
}

/** Read a picked file into a data URL for storage as a shot reference. */

export function ShotRow({
  shot,
  index,
  accent,
  generating,
  clipGenerating,
  poseGenerating,
  isImageReady,
  defaultImageModelId,
  isVideoReady,
  defaultVideoModelId,
  onGenerate,
  onGenerateClip,
  onGeneratePoseSheet,
  onTune,
  onChange,
  performers,
  choreoMoves,
  poseSheets,
  sectionLabel,
  sectionKind,
  energy,
  bpm,
  approach,
  continuity,
  promptPreview,
  startExpanded,
}: {
  shot: MvShot;
  index: number;
  accent: string;
  generating: boolean;
  clipGenerating: boolean;
  poseGenerating: boolean;
  isImageReady: (modelId: string) => boolean;
  defaultImageModelId: string;
  isVideoReady: (modelId: string) => boolean;
  defaultVideoModelId: string;
  onGenerate: () => void;
  onGenerateClip: () => void;
  onGeneratePoseSheet: () => void;
  onTune: () => void;
  onChange: (next: MvShot) => void;
  performers: PerformerOption[];
  choreoMoves: string[];
  poseSheets: { label: string; src: string }[];
  sectionLabel: string;
  sectionKind: string;
  energy: number;
  bpm: number;
  approach: string;
  continuity: ContinuityInfo;
  promptPreview: string;
  startExpanded?: boolean;
}) {
  const focusShotInTimeline = useAppStore((s) => s.focusShotInTimeline);
  const effectiveImageModel = shot.imageProvider ?? defaultImageModelId;
  const imageReady = isImageReady(effectiveImageModel);
  const effectiveVideoModel = shot.videoProvider ?? defaultVideoModelId;
  const videoReady = isVideoReady(effectiveVideoModel);
  const imgModelLabel =
    GEN_MODELS.find((m) => m.id === effectiveImageModel)?.label ?? "Frame";
  const vidModelLabel = VIDEO_MODELS.find((m) => m.id === effectiveVideoModel)?.label;
  const caps = videoCaps(effectiveVideoModel);
  const omniAudio = shot.refAudio ?? [];
  const omniVideo = shot.refVideo ?? [];
  const [preview, setPreview] = useState<null | "image" | "video">(null);
  const [assetPicker, setAssetPicker] = useState(false);
  const [showChoreo, setShowChoreo] = useState(!!startExpanded);
  const [showPrompt, setShowPrompt] = useState(!!startExpanded);
  // Switching to Expert view (startExpanded) after this row is already mounted
  // must actually open these panels — useState's initial value only applies
  // once, on mount, so a plain prop change wouldn't otherwise take effect.
  // One-directional: leaving Expert doesn't forcibly re-collapse a panel the
  // user has open, since Director view exposes the same toggles too.
  useEffect(() => {
    if (startExpanded) {
      setShowChoreo(true);
      setShowPrompt(true);
    }
  }, [startExpanded]);
  const refs = shot.refImages ?? [];
  const assignments = shot.choreo ?? [];

  const removeRef = (i: number) =>
    onChange({ ...shot, refImages: refs.filter((_, idx) => idx !== i) });

  // --- choreography assignment helpers -------------------------------------
  const updateAssignment = (i: number, patch: Partial<ChoreoAssignment>) =>
    onChange({
      ...shot,
      choreo: assignments.map((a, idx) => (idx === i ? { ...a, ...patch } : a)),
    });
  const addAssignment = () =>
    onChange({
      ...shot,
      choreo: [...assignments, { performer: "", role: "Lead Artist", move: "" }],
    });
  const removeAssignment = (i: number) =>
    onChange({ ...shot, choreo: assignments.filter((_, idx) => idx !== i) });

  const toggleEmotion = (emotion: string) => {
    const cur = shot.storyIntent ?? "";
    const re = new RegExp(`\\b${emotion}\\b`, "i");
    const next = re.test(cur)
      ? cur.replace(new RegExp(`\\s*,?\\s*\\b${emotion}\\b\\s*,?`, "i"), " ").replace(/\s{2,}/g, " ").replace(/^[,\s]+|[,\s]+$/g, "")
      : cur
        ? `${cur}, ${emotion}`
        : emotion;
    onChange({ ...shot, storyIntent: next || undefined });
  };

  return (
    <div
      className="overflow-hidden rounded-lg border border-border bg-surface"
      style={{ borderLeft: `3px solid ${accent}` }}
    >
      {/* Directing-card header */}
      <div className="flex items-center gap-2 border-b border-border/60 bg-elevated/30 px-3 py-2">
        <span
          className="flex h-6 min-w-[1.5rem] items-center justify-center rounded-md px-1.5 text-[11px] font-bold text-white"
          style={{ backgroundColor: accent }}
        >
          {index + 1}
        </span>
        <span
          className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
          style={{ background: `${accent}22`, color: accent }}
        >
          {sectionLabel}
        </span>
        <span className="rounded bg-elevated px-1.5 py-0.5 text-[10px] font-medium text-muted">
          {approach}
        </span>
        {/* Music sync */}
        <span className="ml-auto flex items-center gap-2 text-[10px] tabular-nums text-muted">
          <span>{formatTime(shot.start)}–{formatTime(shot.end)}</span>
          {bpm > 0 && <span className="hidden sm:inline">{beatRangeLabel(shot.start, shot.end, bpm)}</span>}
          <span
            className="rounded px-1.5 py-0.5 font-medium not-italic"
            style={{ background: `${accent}1f`, color: accent }}
            title="Section energy"
          >
            {energyLabel(energy)}
          </span>
          <button
            type="button"
            onClick={() => focusShotInTimeline(shot.id)}
            className="rounded p-0.5 text-muted hover:bg-primary/10 hover:text-primary"
            title="Show this shot's position on the Timeline"
            aria-label={`Locate shot ${index + 1} on the Timeline`}
          >
            <MapPin className="h-3.5 w-3.5" />
          </button>
        </span>
      </div>

      <div className="flex gap-3 p-3">
        <div className="min-w-0 flex-1 space-y-2.5">
          {shot.lyric ? (
            <div className="flex items-start gap-1.5 text-xs text-accent">
              <Quote className="mt-0.5 h-3 w-3 shrink-0" />
              <span className="italic">{shot.lyric}</span>
            </div>
          ) : (
            <p className="text-[10px] italic text-muted/60">No lyric in this window — instrumental / atmosphere.</p>
          )}
          <MentionTextarea
            value={shot.idea}
            onChange={(idea) => onChange({ ...shot, idea })}
            onMention={(idea, src) =>
              onChange({
                ...shot,
                idea,
                refImages: Array.from(new Set([...(shot.refImages ?? []), src])),
              })
            }
            className="text-sm font-semibold"
            ariaLabel={`Shot ${index + 1} idea`}
            placeholder="Describe the shot… type @ to reference a character, set, or prop"
          />

          {/* Director's Intent — auto summary */}
          <div className="rounded-md border border-accent/30 bg-accent/5 px-2 py-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-accent/80">🎬 Director's intent</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted">{directorSummary(shot, approach)}</p>
          </div>

          {/* Director Brain — context-aware suggestions */}
          {(() => {
            const brain = directorBrain(shot, sectionKind, energy, approach);
            if (brain.tips.length === 0 && brain.actions.length === 0) return null;
            return (
              <div className="rounded-md border border-primary/30 bg-primary/5 px-2 py-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-primary/80">🧠 Director Brain</p>
                {brain.tips.map((t, ti) => (
                  <p key={ti} className="mt-0.5 text-[11px] leading-relaxed text-muted">
                    {t}
                  </p>
                ))}
                {brain.actions.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {brain.actions.map((act, ai) => (
                      <button
                        key={ai}
                        type="button"
                        onClick={() => onChange({ ...shot, ...act.patch })}
                        className="rounded-md border border-primary/40 bg-surface px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/10"
                      >
                        + {act.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Continuity intelligence — how this shot relates to its neighbours */}
          {(continuity.prevMatches || continuity.firstAppearance || continuity.energyRising) && (
            <div className="rounded-md border border-warning/30 bg-warning/5 px-2 py-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-warning/80">🔗 Continuity</p>
              {continuity.firstAppearance && (
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
                  First appearance of <span className="font-medium text-foreground">{continuity.firstAppearance}</span> — establish importance.
                </p>
              )}
              {continuity.prevMatches && (
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
                  Same look as the previous shot — continue the language, or push the energy.
                </p>
              )}
              {continuity.energyRising && !continuity.prevMatches && (
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
                  Energy rises into this section — a bolder camera + brighter light sells the lift.
                </p>
              )}
              <div className="mt-1 flex flex-wrap gap-1">
                {continuity.firstAppearance && (
                  <button
                    type="button"
                    onClick={() =>
                      onChange({
                        ...shot,
                        movement: CAMERA_PRESETS.find((c) => c.label === "Low Angle")!.value,
                        lighting: LIGHTING_PRESETS.find((l) => l.label === "Gold Rim")!.value,
                        storyIntent: /\bwonder\b/i.test(shot.storyIntent ?? "")
                          ? shot.storyIntent
                          : shot.storyIntent
                            ? `${shot.storyIntent}, Wonder`
                            : "Wonder",
                      })
                    }
                    className="rounded-md border border-warning/50 bg-surface px-2 py-1 text-[11px] font-medium text-warning hover:bg-warning/10"
                  >
                    ✨ Apply hero look
                  </button>
                )}
                {(continuity.prevMatches || continuity.energyRising) && (
                  <button
                    type="button"
                    onClick={() =>
                      onChange({
                        ...shot,
                        movement: CAMERA_PRESETS.find((c) => c.label === "Push In")!.value,
                        lighting: LIGHTING_PRESETS.find((l) => l.label === "Concert")!.value,
                      })
                    }
                    className="rounded-md border border-warning/50 bg-surface px-2 py-1 text-[11px] font-medium text-warning hover:bg-warning/10"
                  >
                    📈 Intensify
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Story intent — first-class */}
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted/80">
              🎯 Why this shot exists
            </p>
            <div className="flex flex-wrap gap-1">
              {STORY_EMOTIONS.map((e) => (
                <DirChip
                  key={e}
                  label={e}
                  active={new RegExp(`\\b${e}\\b`, "i").test(shot.storyIntent ?? "")}
                  accent={accent}
                  onClick={() => toggleEmotion(e)}
                />
              ))}
            </div>
            <input
              value={shot.storyIntent ?? ""}
              onChange={(e) => onChange({ ...shot, storyIntent: e.target.value || undefined })}
              className="w-full rounded border border-border bg-surface px-1.5 py-1 text-[11px] focus-visible:border-primary focus-visible:outline-none"
              placeholder="Refine the story intent… (e.g. Neo Dude celebrates the wonder of creation)"
            />
          </div>

          {/* Camera direction */}
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted/80">
              🎬 Camera <span className="font-normal normal-case text-muted/60">— {shot.movement}</span>
            </p>
            <div className="flex flex-wrap gap-1">
              {CAMERA_PRESETS.map((c) => (
                <DirChip
                  key={c.label}
                  label={c.label}
                  active={shot.movement === c.value}
                  onClick={() => onChange({ ...shot, movement: c.value })}
                />
              ))}
            </div>
          </div>

          {/* Lighting direction */}
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted/80">
              💡 Lighting <span className="font-normal normal-case text-muted/60">— {shot.lighting}</span>
            </p>
            <div className="flex flex-wrap gap-1">
              {LIGHTING_PRESETS.map((l) => (
                <DirChip
                  key={l.label}
                  label={l.label}
                  active={shot.lighting === l.value}
                  onClick={() => onChange({ ...shot, lighting: l.value })}
                />
              ))}
            </div>
          </div>

          {/* Shot type + cut (compact) */}
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-muted">
            <MetaEdit label="Shot" value={shot.shotType} onChange={(v) => onChange({ ...shot, shotType: v })} />
            <MetaEdit label="Cut" value={shot.transition} onChange={(v) => onChange({ ...shot, transition: v })} />
          </div>

          {/* Performance */}
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted/80">
              🎭 Performance
            </p>
            <MentionTextarea
              value={shot.performanceNote}
              onChange={(v) => onChange({ ...shot, performanceNote: v })}
              onMention={(v, src) =>
                onChange({
                  ...shot,
                  performanceNote: v,
                  refImages: Array.from(new Set([...(shot.refImages ?? []), src])),
                })
              }
              rows={1}
              className="text-[11px] italic text-muted/90"
              ariaLabel={`Shot ${index + 1} performance note`}
              placeholder="Performance note… type @ to reference a performer"
            />
          </div>

        {/* Choreography & story-intent toggle */}
        <button
          type="button"
          onClick={() => setShowChoreo((v) => !v)}
          className={cn(
            "flex w-full items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
            assignments.length || shot.storyIntent || shot.promptOverride
              ? "border-primary/50 bg-primary/10 text-primary"
              : "border-border bg-surface text-muted hover:text-foreground"
          )}
        >
          <Sparkles className="h-3 w-3" />
          Choreography & Direction
          {assignments.length > 0 && (
            <span className="ml-0.5 rounded bg-primary/20 px-1 text-[9px]">
              {assignments.length}
            </span>
          )}
          {shot.promptOverride && (
            <span className="rounded bg-accent/20 px-1 text-[9px] text-accent">custom prompt</span>
          )}
          <span className="ml-auto text-[9px]">{showChoreo ? "▲" : "▼"}</span>
        </button>

        {showChoreo && (
          <ChoreoPanel
            shot={shot}
            performers={performers}
            choreoMoves={choreoMoves}
            poseSheets={poseSheets}
            assignments={assignments}
            onAdd={addAssignment}
            onUpdate={updateAssignment}
            onRemove={removeAssignment}
            onChange={onChange}
          />
        )}

        {/* View Final Prompt — the assembled prompt generation will send */}
        <button
          type="button"
          onClick={() => setShowPrompt((v) => !v)}
          className={cn(
            "flex w-full items-center gap-1.5 rounded-md border px-2 py-1.5 text-[12px] font-semibold transition-colors",
            shot.promptOverride
              ? "border-accent/60 bg-accent/10 text-accent"
              : "border-border bg-surface text-foreground hover:border-primary/40"
          )}
        >
          <Sparkles className="h-3.5 w-3.5" />
          View Final Prompt
          {shot.promptOverride && (
            <span className="rounded bg-accent/20 px-1 text-[9px] text-accent">edited</span>
          )}
          <span className="ml-auto text-[9px]">{showPrompt ? "▲" : "▼"}</span>
        </button>
        {showPrompt && (
          <div className="space-y-1.5 rounded-md border border-border/60 bg-elevated/30 p-2">
            <p className="text-[10px] leading-relaxed text-muted/70">
              Character Bible + Story Intent + Camera + Lighting + Performance + Choreography + Style → final prompt.
            </p>
            {shot.promptOverride ? (
              <>
                <textarea
                  value={shot.promptOverride}
                  onChange={(e) => onChange({ ...shot, promptOverride: e.target.value || undefined })}
                  rows={6}
                  className="w-full rounded border border-accent/50 bg-surface px-2 py-1.5 text-[11px] leading-relaxed focus-visible:border-primary focus-visible:outline-none"
                />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-accent">✎ Manual prompt — sent verbatim.</span>
                  <button
                    onClick={() => onChange({ ...shot, promptOverride: undefined })}
                    className="text-[10px] text-danger hover:underline"
                  >
                    Reset to auto
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded border border-border/60 bg-surface px-2 py-1.5 text-[11px] leading-relaxed text-muted">
                  {promptPreview || "Add direction above to assemble the prompt…"}
                </p>
                <button
                  onClick={() => onChange({ ...shot, promptOverride: promptPreview })}
                  className="rounded-md border border-primary/40 bg-surface px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/10"
                >
                  ✎ Edit prompt manually
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Frame / clip preview monitor */}
      <div className="w-80 shrink-0 lg:w-96">
        <div
          className="group relative aspect-video min-h-[200px] overflow-hidden rounded-lg border-2 bg-elevated/50 shadow-sm"
          style={{ borderColor: `${accent}55` }}
        >
          {/* Prefer the rendered clip when present, else the frame. */}
          {shot.videoUrl ? (
            <button
              type="button"
              className="h-full w-full cursor-zoom-in"
              onClick={() => setPreview("video")}
              title="Click to play full size"
            >
              <AssetVideo
                src={shot.videoUrl}
                poster={shot.imageUrl}
                controls={false}
                className="h-full w-full object-cover"
              />
            </button>
          ) : shot.imageUrl ? (
            <div
              role="button"
              tabIndex={0}
              className="h-full w-full cursor-zoom-in"
              onClick={() => setPreview("image")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setPreview("image");
              }}
              title="Click to view full size"
            >
              <AssetImage
                src={shot.imageUrl}
                alt={`Shot ${index + 1} frame`}
                className="h-full w-full object-cover"
                label="Frame"
                onRegenerate={onGenerate}
              />
            </div>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted/50">
              <ImageIcon className="h-8 w-8" />
              <span className="text-[10px]">No frame yet</span>
            </div>
          )}
          {(generating || clipGenerating) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/75">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <span className="text-[10px] font-medium text-muted">
                {clipGenerating ? "Rendering clip…" : "Rendering frame…"}
              </span>
            </div>
          )}
          {/* Provider / model / aspect badges */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-1 bg-gradient-to-t from-black/75 to-transparent p-1.5">
            {shot.videoUrl && vidModelLabel ? (
              <span className="rounded bg-success/90 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                ▶ {badgeLabel(vidModelLabel)}
              </span>
            ) : shot.imageUrl ? (
              <span className="rounded bg-primary/85 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                {badgeLabel(imgModelLabel)}
              </span>
            ) : null}
            {(shot.imageUrl || shot.videoUrl) && (
              <span className="rounded bg-black/55 px-1.5 py-0.5 text-[9px] font-medium text-white/90">
                16:9
              </span>
            )}
          </div>
          {/* hover actions */}
          {(shot.imageUrl || shot.videoUrl) && (
            <div className="absolute right-1 top-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              {shot.imageUrl && (
                <button
                  className="flex h-6 w-6 items-center justify-center rounded bg-black/60 text-white hover:bg-black/80"
                  onClick={() =>
                    downloadAsset(shot.imageUrl!, `shot-${index + 1}.png`)
                  }
                  title="Download frame"
                >
                  <Download className="h-3 w-3" />
                </button>
              )}
              {shot.imageUrl && (
                <button
                  className="flex h-6 w-6 items-center justify-center rounded bg-black/60 text-white hover:bg-black/80"
                  onClick={() => setPreview("image")}
                  title="View full size"
                >
                  <Maximize2 className="h-3 w-3" />
                </button>
              )}
            </div>
          )}
          {shot.videoUrl && (
            <button
              onClick={() => setPreview("video")}
              className="absolute left-1 top-1 inline-flex items-center gap-0.5 rounded bg-success/90 px-1 py-0.5 text-[9px] font-semibold text-white hover:bg-success"
              title="Play clip"
            >
              <Video className="h-2.5 w-2.5" /> clip
            </button>
          )}
        </div>
        {(shot.imageCandidates?.length ?? 0) > 1 && (
          <div className="mt-1.5 flex flex-wrap gap-1" title="Pick the frame variation to keep">
            {shot.imageCandidates!.map((c, i) => (
              <button
                key={i}
                onClick={() => onChange({ ...shot, imageUrl: c })}
                className={cn(
                  "h-9 w-9 overflow-hidden rounded border",
                  c === shot.imageUrl ? "border-primary ring-1 ring-primary/40" : "border-border hover:border-primary/50"
                )}
                title={`Variation ${i + 1}`}
              >
                <AssetImage src={c} alt={`Variation ${i + 1}`} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
        {(shot.imageUrl || shot.videoUrl) && (
          <div className="mt-1.5 flex gap-1.5">
            {shot.videoUrl && (
              <Button
                variant="secondary"
                size="sm"
                className="flex-1 px-2"
                onClick={() => downloadAsset(shot.videoUrl!, `shot-${index + 1}.mp4`)}
                title="Download the rendered clip"
              >
                <Download className="h-3.5 w-3.5" /> Clip
              </Button>
            )}
            {shot.imageUrl && (
              <Button
                variant="secondary"
                size="sm"
                className="flex-1 px-2"
                onClick={() => downloadAsset(shot.imageUrl!, `shot-${index + 1}.png`)}
                title="Download the frame image"
              >
                <Download className="h-3.5 w-3.5" /> Frame
              </Button>
            )}
          </div>
        )}
        <div className="mt-1.5 flex gap-1.5">
          <Button
            variant="secondary"
            size="sm"
            className="flex-1 px-2"
            onClick={onGenerate}
            disabled={generating || !imageReady}
            title={imageReady ? undefined : "No image provider key — add one in API Keys"}
          >
            {generating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ImageIcon className="h-3.5 w-3.5" />
            )}
            Frame
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="flex-1 px-2"
            onClick={onGenerateClip}
            disabled={clipGenerating || !videoReady}
            title={
              !videoReady
                ? "No video provider key — add one in API Keys"
                : shot.imageUrl
                  ? `Animate this shot from its frame${refs.length ? ` + ${refs.length} asset${refs.length === 1 ? "" : "s"}` : ""} (image-to-video)`
                  : refs.length
                    ? `Generate a clip using ${refs.length} attached asset${refs.length === 1 ? "" : "s"}`
                    : "Generate a video clip (generate a frame first for image-to-video)"
            }
          >
            {clipGenerating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Video className="h-3.5 w-3.5" />
            )}
            Clip
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={onTune}
            title="Fine-tune this frame — full prompt, model, size, seed, variations"
            aria-label={`Tune shot ${index + 1} frame`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
          </Button>
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="mt-1.5 w-full px-2"
          onClick={onGeneratePoseSheet}
          disabled={poseGenerating || !imageReady}
          title={
            imageReady
              ? "Generate a pose / model sheet for this shot's performer + moves — saved to the library and shown in the move browser"
              : "No image provider key — add one in API Keys"
          }
        >
          {poseGenerating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <LayoutGrid className="h-3.5 w-3.5" />
          )}
          Pose sheet
        </Button>
        <select
          value={shot.imageProvider ?? ""}
          onChange={(e) =>
            onChange({ ...shot, imageProvider: e.target.value || undefined })
          }
          className="mt-1 h-7 w-full rounded-[var(--radius-input)] border border-border bg-surface px-1.5 text-[10px] text-muted focus-visible:border-primary focus-visible:outline-none"
          aria-label={`Shot ${index + 1} image model`}
          title="Override the image provider for this shot"
        >
          <option value="">Frame model: inherit</option>
          {GEN_MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
        <select
          value={shot.videoProvider ?? ""}
          onChange={(e) =>
            onChange({ ...shot, videoProvider: e.target.value || undefined })
          }
          className="mt-1 h-7 w-full rounded-[var(--radius-input)] border border-border bg-surface px-1.5 text-[10px] text-muted focus-visible:border-primary focus-visible:outline-none"
          aria-label={`Shot ${index + 1} video model`}
          title="Override the video provider for this shot"
        >
          <option value="">Clip model: inherit</option>
          {VIDEO_MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>

        {/* Reference assets — characters / environments / props / uploads */}
        <div className="mt-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {refs.map((src, i) => (
              <div key={i} className="relative h-11 w-11 shrink-0">
                <AssetImage
                  src={src}
                  alt={`ref ${i + 1}`}
                  className="h-11 w-11 rounded-md border border-border object-cover"
                />
                <button
                  onClick={() => removeRef(i)}
                  className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-white"
                  title="Remove reference"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            ))}
            <button
              onClick={() => setAssetPicker(true)}
              className="flex h-11 w-11 shrink-0 flex-col items-center justify-center gap-0.5 rounded-md border border-dashed border-border text-muted hover:border-primary/50 hover:text-primary"
              title="Add character / environment / prop references from your Bibles"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="text-[8px] font-medium">Assets</span>
            </button>
            <label
              className="flex h-11 w-11 shrink-0 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-md border border-dashed border-border text-muted hover:border-primary/50 hover:text-primary"
              title="Upload an image file directly as a reference (no library step)"
            >
              <Upload className="h-3.5 w-3.5" />
              <span className="text-[8px] font-medium">Upload</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={async (e) => {
                  const files = Array.from(e.target.files ?? []);
                  const urls = await Promise.all(files.map(fileToDataUrl));
                  if (urls.length) onChange({ ...shot, refImages: [...refs, ...urls] });
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          {refs.length > 0 && (
            <p className="mt-1 text-[9px] text-muted">
              {refs.length} reference{refs.length === 1 ? "" : "s"} guide this shot
            </p>
          )}
        </div>

        {/* Omni references — capability-gated by the chosen video model */}
        {(caps.endFrame || caps.audioRef || caps.videoRef) && (
          <div className="mt-2 space-y-1 rounded-md border border-border/60 bg-elevated/30 p-1.5">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-muted/80">
              Omni reference
            </p>
            <div className="flex flex-wrap gap-1.5">
              {caps.endFrame && (
                <OmniSlot
                  label="End frame"
                  accept="image/*"
                  filled={!!shot.endFrame}
                  preview={shot.endFrame}
                  onPick={async (f) =>
                    onChange({ ...shot, endFrame: await fileToDataUrl(f) })
                  }
                  onClear={() => onChange({ ...shot, endFrame: undefined })}
                />
              )}
              {caps.audioRef &&
                omniAudio.map((_, i) => (
                  <OmniSlot
                    key={`a${i}`}
                    label={`Audio ${i + 1}`}
                    accept="audio/*"
                    filled
                    onPick={() => {}}
                    onClear={() =>
                      onChange({
                        ...shot,
                        refAudio: omniAudio.filter((_, idx) => idx !== i),
                      })
                    }
                  />
                ))}
              {caps.audioRef && omniAudio.length < 3 && (
                <OmniSlot
                  label="Audio ref"
                  accept="audio/*"
                  filled={false}
                  onPick={async (f) =>
                    onChange({ ...shot, refAudio: [...omniAudio, await fileToDataUrl(f)] })
                  }
                  onClear={() => {}}
                />
              )}
              {caps.videoRef &&
                omniVideo.map((_, i) => (
                  <OmniSlot
                    key={`v${i}`}
                    label={`Video ${i + 1}`}
                    accept="video/*"
                    filled
                    onPick={() => {}}
                    onClear={() =>
                      onChange({
                        ...shot,
                        refVideo: omniVideo.filter((_, idx) => idx !== i),
                      })
                    }
                  />
                ))}
              {caps.videoRef && omniVideo.length < 3 && (
                <OmniSlot
                  label="Video ref"
                  accept="video/*"
                  filled={false}
                  onPick={async (f) =>
                    onChange({ ...shot, refVideo: [...omniVideo, await fileToDataUrl(f)] })
                  }
                  onClear={() => {}}
                />
              )}
            </div>
            <p className="text-[9px] text-muted/70">
              {caps.audioRef
                ? "Up to 9 image, 3 audio & 3 video references guide this clip."
                : caps.endFrame
                  ? "End frame sets the clip's final image."
                  : ""}
            </p>
          </div>
        )}
        </div>
      </div>

      {assetPicker && (
        <AssetPicker
          onAdd={(srcs) => onChange({ ...shot, refImages: [...refs, ...srcs] })}
          onClose={() => setAssetPicker(false)}
        />
      )}

      {preview && (
        <ShotPreview
          kind={preview}
          shot={shot}
          index={index}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
}


function ShotPreview({
  kind,
  shot,
  index,
  onClose,
}: {
  kind: "image" | "video";
  shot: MvShot;
  index: number;
  onClose: () => void;
}) {
  const src = kind === "image" ? shot.imageUrl : shot.videoUrl;
  const [zoom, setZoom] = useState(1); // 1 = fit-to-screen
  const wrapRef = useRef<HTMLDivElement>(null);
  if (!src) return null;

  const fit = zoom === 1;
  const toggleFullscreen = () => {
    const el = wrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-black/90"
      onClick={onClose}
    >
      {/* Toolbar */}
      <div
        className="flex shrink-0 items-center justify-center gap-2 p-3"
        onClick={(e) => e.stopPropagation()}
      >
        {kind === "image" && (
          <>
            <Button variant="secondary" size="sm" onClick={() => setZoom((z) => Math.max(0.25, (fit ? 1 : z) - 0.25))} aria-label="Zoom out">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="w-12 text-center text-xs tabular-nums text-white/80">
              {fit ? "Fit" : `${Math.round(zoom * 100)}%`}
            </span>
            <Button variant="secondary" size="sm" onClick={() => setZoom((z) => Math.min(5, (fit ? 1 : z) + 0.25))} aria-label="Zoom in">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setZoom(1)}>Fit</Button>
            <Button variant="secondary" size="sm" onClick={() => setZoom(1.0001)} title="Actual size (100%)">1:1</Button>
          </>
        )}
        <Button variant="secondary" size="sm" onClick={toggleFullscreen} aria-label="Fullscreen">
          <Maximize2 className="h-4 w-4" /> Fullscreen
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => downloadAsset(src, `shot-${index + 1}.${kind === "image" ? "png" : "mp4"}`)}
        >
          <Download className="h-4 w-4" /> Download
        </Button>
        <Button variant="ghost" size="sm" className="text-white" onClick={onClose}>
          <X className="h-4 w-4" /> Close
        </Button>
      </div>

      {/* Stage */}
      <div
        ref={wrapRef}
        className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-black p-4"
        onClick={(e) => e.stopPropagation()}
      >
        {kind === "image" ? (
          <AssetImage
            src={src}
            alt={`Shot ${index + 1} frame`}
            className={fit ? "max-h-full max-w-full rounded-lg object-contain" : "rounded-lg"}
            style={fit ? undefined : { width: `${zoom * 100}%`, maxWidth: "none" }}
          />
        ) : (
          <AssetVideo src={src} controls className="max-h-full max-w-full rounded-lg" />
        )}
      </div>
    </div>
  );
}

/** Inline-editable "Label: value" — click the value to edit it (live commit). */

function MetaEdit({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  return (
    <span className="inline-flex items-center gap-1">
      <span className="font-semibold text-foreground/70">{label}:</span>
      {editing ? (
        <input
          autoFocus
          defaultValue={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setEditing(false)}
          onKeyDown={(e) => e.key === "Enter" && setEditing(false)}
          aria-label={label}
          className="w-32 rounded border border-primary bg-surface px-1 text-[11px] text-foreground focus-visible:outline-none"
        />
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="rounded px-0.5 text-left hover:bg-elevated hover:text-foreground"
          title={`Edit ${label}`}
        >
          {value || "—"}
        </button>
      )}
    </span>
  );
}

