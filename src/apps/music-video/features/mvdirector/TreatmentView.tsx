// Studio/Creator treatment: TreatmentView + SectionCard + Field/EditableText (extracted, Phase 2).
import { useEffect, useState } from "react";
import { Film, MapPin, Shirt, Scissors } from "lucide-react";
import {
  approachColor,
  type MvTreatment,
  type MvSectionPlan,
  type MvShot,
} from "@/apps/music-video/lib/mvDirector";
import { sectionColor, formatTime } from "@/apps/music-video/lib/songBrain";
import { cn } from "@/platform/lib/utils";
import { Badge } from "@/platform/components/ui/badge";
import { Card, CardContent } from "@/platform/components/ui/card";
import { ShotRow } from "./ShotRow";
import type { PerformerOption, ContinuityInfo } from "./ChoreoPanel";

export function TreatmentView({
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
  /** Expert tier — default every shot's prompt/choreo panels open. */
  startExpanded?: boolean;
}) {
  const totalShots = treatment.sections.reduce((a, s) => a + s.shots.length, 0);
  const withFrames = treatment.sections.reduce(
    (a, s) => a + s.shots.filter((sh) => sh.imageUrl).length,
    0
  );

  return (
    <div className="space-y-5 p-6">
      {/* Treatment overview */}
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
            <Film className="h-3.5 w-3.5" />
            Treatment
            <Badge variant="primary" className="ml-1 normal-case">
              {totalShots} shots
            </Badge>
            {withFrames > 0 && (
              <Badge variant="accent" className="normal-case">
                {withFrames} frames generated
              </Badge>
            )}
          </div>
          <EditableText
            value={treatment.logline}
            onChange={(logline) => onChange({ ...treatment, logline })}
            className="text-lg font-semibold leading-snug"
            ariaLabel="Logline"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Visual world">
              <EditableText
                value={treatment.visualWorld}
                onChange={(visualWorld) => onChange({ ...treatment, visualWorld })}
                className="text-sm text-muted"
                ariaLabel="Visual world"
                multiline
              />
            </Field>
            <Field label="Energy arc">
              <p className="text-sm leading-relaxed text-muted">{treatment.energyArc}</p>
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* Sections */}
      {treatment.sections.map((section, si) => (
        <SectionCard
          key={section.sectionId}
          section={section}
          onChange={(next) =>
            onChange({
              ...treatment,
              sections: treatment.sections.map((s, i) => (i === si ? next : s)),
            })
          }
          onGenerate={onGenerate}
          onGenerateClip={onGenerateClip}
          onGeneratePoseSheet={onGeneratePoseSheet}
          onTune={onTune}
          genShotId={genShotId}
          genClipId={genClipId}
          genPoseId={genPoseId}
          isImageReady={isImageReady}
          defaultImageModelId={defaultImageModelId}
          isVideoReady={isVideoReady}
          defaultVideoModelId={defaultVideoModelId}
          performers={performers}
          choreoMoves={choreoMoves}
          poseSheets={poseSheets}
          buildPrompt={buildPrompt}
          continuityFor={continuityFor}
          bpm={bpm}
          startExpanded={startExpanded}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Simple View — big storyboard cards, plain-language summaries, one primary
// action per scene. The default tier for new users. Reads the exact same
// treatment data as Director/Expert; "Edit Scene" opens the same fine-tune
// panel those tiers use inline, so nothing here is a dead end.
// ---------------------------------------------------------------------------

function SectionCard({
  section,
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
  section: MvSectionPlan;
  onChange: (next: MvSectionPlan) => void;
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
  const color = sectionColor(section.kind);
  const aColor = approachColor(section.approach);
  return (
    <Card className="overflow-hidden">
      {/* Header strip */}
      <div
        className="flex flex-wrap items-center gap-3 px-5 py-3"
        style={{ backgroundColor: `${color}14`, borderBottom: `1px solid ${color}33` }}
      >
        <span
          className="flex h-6 items-center rounded-md px-2 text-xs font-semibold text-white"
          style={{ backgroundColor: color }}
        >
          {section.label}
        </span>
        <span className="text-xs tabular-nums text-muted">
          {formatTime(section.start)} – {formatTime(section.end)}
        </span>
        <Badge className="normal-case" style={{ backgroundColor: `${aColor}1f`, color: aColor }}>
          {section.approach}
        </Badge>
        <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted">
          <Scissors className="h-3.5 w-3.5" />
          {section.cutPace}
        </span>
      </div>

      <CardContent className="space-y-4 p-5">
        <EditableText
          value={section.concept}
          onChange={(concept) => onChange({ ...section, concept })}
          className="text-sm"
          ariaLabel="Section concept"
          multiline
        />

        <div className="flex flex-wrap gap-4 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            {section.location}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Shirt className="h-3.5 w-3.5" />
            {section.wardrobe}
          </span>
        </div>

        {/* Shot list */}
        <div className="space-y-2">
          {section.shots.map((shot, k) => (
            <ShotRow
              key={shot.id}
              shot={shot}
              index={k}
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
                  ...section,
                  shots: section.shots.map((s, i) => (i === k ? next : s)),
                })
              }
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/** A compact capability-gated reference upload chip (end frame / audio / video). */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
        {label}
      </div>
      {children}
    </div>
  );
}

/** Click-to-edit text that swaps to a textarea/input on focus. */

function EditableText({
  value,
  onChange,
  className,
  ariaLabel,
  multiline,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  ariaLabel: string;
  multiline?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => setDraft(value), [value]);

  const commit = () => {
    setEditing(false);
    if (draft !== value) onChange(draft.trim());
  };

  if (editing) {
    return multiline ? (
      <textarea
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        aria-label={ariaLabel}
        className={cn(
          "w-full resize-y rounded-[var(--radius-input)] border border-primary bg-surface px-2 py-1 text-foreground focus-visible:outline-none",
          className
        )}
        rows={2}
      />
    ) : (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && commit()}
        aria-label={ariaLabel}
        className={cn(
          "w-full rounded-[var(--radius-input)] border border-primary bg-surface px-2 py-1 text-foreground focus-visible:outline-none",
          className
        )}
      />
    );
  }

  return (
    <p
      tabIndex={0}
      role="button"
      aria-label={`Edit ${ariaLabel}`}
      onClick={() => setEditing(true)}
      onFocus={() => setEditing(true)}
      className={cn(
        "cursor-text rounded-[var(--radius-input)] px-2 py-1 transition-colors hover:bg-elevated/50",
        className
      )}
    >
      {value}
    </p>
  );
}
