// ChoreoCard — the per-section choreography editor. Extracted out of
// ChoreographyView.tsx (previously an inline function) so it can grow
// (visual moments, formation stage, AI director panel) without the parent
// file becoming unmanageable.
import { useState } from "react";
import {
  Users,
  Sparkles,
  LayoutGrid,
  Camera,
  Lightbulb,
  Drama,
  Music,
  Image as ImageIcon,
  Video,
  ChevronDown,
} from "lucide-react";
import {
  CHOREO_CAMERA_MOVES,
  CHOREO_LIGHTING,
  defaultPerformance,
  type ChoreoSection,
  type PerformanceBrief,
} from "@/apps/music-video/lib/choreography";
import { sectionColor, formatTime } from "@/apps/music-video/lib/songBrain";
import type { Character } from "@/platform/lib/types";
import { AssetImage } from "@/platform/components/ui/asset-image";
import { Button } from "@/platform/components/ui/button";
import { Card, CardContent } from "@/platform/components/ui/card";
import { cn } from "@/platform/lib/utils";
import { HelpHint } from "@/platform/components/ui/help-hint";
import { MomentCard } from "./MomentCard";
import { FormationStage } from "./FormationStage";
import { GuidedSectionPrompt } from "./GuidedSectionPrompt";
import { AiDirectorPanel } from "./AiDirectorPanel";
import { MotionPreview } from "./MotionPreview";
import { Select } from "@/platform/components/ui/select";

export function ChoreoCard({
  section,
  characters,
  focusCharacterId,
  highlighted,
  performerCount = 3,
  nextFormation,
  viewMode = "professional",
  onGenerate,
  onChange,
}: {
  section: ChoreoSection;
  characters: Character[];
  /** Set by clicking a PerformerCard at the top of the page — pre-selects
   *  that performer here too, so every section jumps to them at once. */
  focusCharacterId?: string;
  /** Briefly true after jumping here from the Energy Map or Preview Strip. */
  highlighted?: boolean;
  /** How many performer dots the Formation Stage draws — the cast size. */
  performerCount?: number;
  /** The next choreographed section's formation, for the stage's transition arrows. */
  nextFormation?: string;
  /** "guided" collapses pose sheet / performance sheet / counts behind one
   *  tap and shows the feeling-prompt chips; "professional" expands everything. */
  /** Disclosure tier, derived from the platform StudioMode by the parent:
   *  "guided" (Director mode) or "professional" (Studio / Creator). */
  viewMode?: "guided" | "professional";
  onGenerate: (
    mode: "pose" | "motion" | "formation",
    character: Character | null,
    pose?: { index: number; text: string }
  ) => void;
  onChange: (next: ChoreoSection) => void;
}) {
  const color = sectionColor(section.kind);
  // Local selection normally follows the top-of-page focus; a direct click
  // on a card here overrides it until focus changes again (React's
  // "adjust state while rendering" pattern — no effect needed).
  const [applySync, setApplySync] = useState({
    focus: focusCharacterId,
    applyToId: focusCharacterId ?? "",
  });
  if (applySync.focus !== focusCharacterId) {
    setApplySync({ focus: focusCharacterId, applyToId: focusCharacterId ?? "" });
  }
  const applyToId = applySync.applyToId;
  const setApplyToId = (id: string) => setApplySync({ focus: focusCharacterId, applyToId: id });
  const applyTo = characters.find((c) => c.id === applyToId) ?? null;
  // Professional mode expands the pose sheet / performance sheet / raw counts
  // by default; Guided starts collapsed behind one tap. Re-sync when the mode
  // changes at runtime (initial useState value only applies on mount) via the
  // same "adjust state while rendering" pattern used above.
  const [advSync, setAdvSync] = useState({ mode: viewMode, open: viewMode === "professional" });
  if (advSync.mode !== viewMode) {
    setAdvSync({ mode: viewMode, open: viewMode === "professional" });
  }
  const showAdvanced = advSync.open;
  const setShowAdvanced = (open: boolean) => setAdvSync({ mode: viewMode, open });

  const perf = section.performance ?? defaultPerformance(section.kind, section.energy);
  const setPerf = (key: keyof PerformanceBrief, v: string) =>
    onChange({ ...section, performance: { ...perf, [key]: v } });
  const cameraMoves =
    section.cameraMoves ??
    section.keyPoses.map((_, i) => CHOREO_CAMERA_MOVES[i % CHOREO_CAMERA_MOVES.length]);
  const setCamera = (i: number, v: string) =>
    onChange({
      ...section,
      cameraMoves: section.keyPoses.map((_, j) => (j === i ? v : (cameraMoves[j] ?? ""))),
    });
  const lightingMoves =
    section.lightingMoves ??
    section.keyPoses.map((_, i) => CHOREO_LIGHTING[i % CHOREO_LIGHTING.length]);
  const setLighting = (i: number, v: string) =>
    onChange({
      ...section,
      lightingMoves: section.keyPoses.map((_, j) => (j === i ? v : (lightingMoves[j] ?? ""))),
    });
  const setCount = (i: number, key: "phraseA" | "phraseB", v: string) =>
    onChange({
      ...section,
      eightCounts: section.eightCounts.map((ec, j) => (j === i ? { ...ec, [key]: v } : ec)),
    });
  const setPose = (i: number, v: string) =>
    onChange({ ...section, keyPoses: section.keyPoses.map((p, j) => (j === i ? v : p)) });

  return (
    <Card
      id={`choreo-section-${section.sectionId}`}
      className={cn("overflow-hidden transition-shadow", highlighted && "ring-2 ring-primary")}
    >
      <div
        className="space-y-3 px-5 py-3.5"
        style={{ backgroundColor: `${color}14`, borderBottom: `1px solid ${color}33` }}
      >
        {/* What section is active, and what its routine looks like at a glance. */}
        <div className="flex flex-wrap items-center gap-3">
          <span
            className="flex h-7 items-center rounded-md px-2.5 text-sm font-bold text-white"
            style={{ backgroundColor: color }}
          >
            {section.label}
          </span>
          <span className="text-xs tabular-nums text-muted">
            {formatTime(section.start)} – {formatTime(section.end)}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 text-xs font-medium text-foreground">
            {section.intensity}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2 py-0.5 text-xs text-muted">
            <Users className="h-3.5 w-3.5" />
            {section.formation}
          </span>
        </div>

        {/* Choreographing for — larger, name-always-visible performer cards
            (not tiny chips) plus the section's actions right alongside. */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted">
            Choreographing for
          </span>
          <div
            className="flex flex-wrap items-center gap-1.5"
            aria-label={`Performer for ${section.label}`}
          >
            <button
              type="button"
              onClick={() => setApplyToId("")}
              title="Generic performer — no specific cast member"
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full border py-1 pl-1 pr-3 transition-colors",
                applyToId === ""
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border bg-surface text-muted hover:border-primary/40 hover:text-foreground"
              )}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-elevated">
                <Users className="h-4 w-4" />
              </span>
              <span className="text-xs font-semibold">Generic</span>
            </button>
            {characters.map((c, ci) => (
              <button
                key={`${c.id}-${ci}`}
                type="button"
                onClick={() => setApplyToId(c.id)}
                title={c.name}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full border py-1 pl-1 pr-3 transition-colors",
                  applyToId === c.id
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border bg-surface text-muted hover:border-primary/40 hover:text-foreground"
                )}
              >
                {c.portraitUrl ? (
                  <AssetImage
                    src={c.portraitUrl}
                    alt={c.name}
                    className="h-8 w-8 rounded-full object-cover"
                    label="Portrait"
                  />
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-elevated text-[11px] font-semibold uppercase">
                    {c.name.slice(0, 2)}
                  </span>
                )}
                <span className="text-xs font-semibold">{c.name}</span>
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <Button size="sm" variant="secondary" onClick={() => onGenerate("pose", applyTo)}>
              <LayoutGrid className="h-3.5 w-3.5" /> Pose sheet
            </Button>
            <Button size="sm" variant="secondary" onClick={() => onGenerate("formation", applyTo)}>
              <Users className="h-3.5 w-3.5" /> Formation
            </Button>
            <Button size="sm" variant="secondary" onClick={() => onGenerate("motion", applyTo)}>
              <Sparkles className="h-3.5 w-3.5" /> Motion test
            </Button>
          </div>
        </div>
      </div>

      <CardContent className="space-y-4 p-5">
        {/* Formation — the stage diagram, not just a prose description. */}
        <div>
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
            <Users className="h-3.5 w-3.5" /> Formation
            <HelpHint
              title="Formation"
              body="A top-down view of the stage — where each performer stands and moves for this section. The larger accent dot is the lead; arrows show how the group shifts into the next section's formation."
              example="A triangle with the lead at the front apex reads as 'star out front, crew fanned behind' on camera."
            />
          </div>
          <FormationStage
            formation={section.formation}
            performerCount={performerCount}
            accent={color}
            nextFormation={nextFormation}
          />
        </div>

        {viewMode === "guided" && (
          <GuidedSectionPrompt
            section={section}
            onChange={onChange}
            onSignatureMove={() => onGenerate("motion", applyTo)}
          />
        )}

        {/* Available in both modes — the fast, type-it-yourself path
            alongside (never instead of) the manual controls below. */}
        <AiDirectorPanel section={section} onChange={onChange} />

        {viewMode === "guided" && (
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
          >
            <ChevronDown
              className={cn("h-3.5 w-3.5 transition-transform", showAdvanced && "rotate-180")}
            />
            {showAdvanced ? "Hide" : "Show"} pose sheet, counts &amp; performance sheet
          </button>
        )}

        {showAdvanced && (
          <>
            {/* Moments — visual choreography cards, not a bar-by-bar text table. */}
            <div>
              <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
                <Music className="h-3.5 w-3.5" /> Moments
                <HelpHint
                  title="Moments"
                  body="Each card is one bar of the section (two counts of 4). Tap a card to open and edit the exact move text — the words here feed the pose-sheet and motion-test prompts."
                  example="'Sharp arm snap → clean freeze' becomes the move the AI draws and animates for that bar."
                />
              </div>
              <p className="mb-2 text-[11px] text-muted">
                Each card is one bar (two counts of 4) — tap to open and edit the move text
                directly; it feeds the pose sheet and motion test prompts below.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {section.eightCounts.map((ec, i) => (
                  <MomentCard
                    key={i}
                    ec={ec}
                    intensity={section.intensity}
                    onChangePhrase={(key, v) => setCount(i, key, v)}
                  />
                ))}
              </div>
            </div>

            {/* Key poses */}
            <div>
              <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
                <LayoutGrid className="h-3.5 w-3.5" /> Key pose sheet
                <HelpHint
                  title="Key pose sheet"
                  body="The signature freeze-frames of the section, each with its own camera angle and lighting. Generate a reference image or a short clip of any pose — this is what carries the look into the final shots."
                  example="Pose 2 with a low-angle 'hero' camera and hard key light = the shot that sells the drop."
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                {section.keyPoses.map((pose, i) => (
                  <div
                    key={i}
                    className="rounded-[var(--radius-button)] border border-dashed border-border bg-elevated/40 px-3 py-2 text-xs text-muted"
                  >
                    <span className="font-semibold text-foreground/70">Pose {i + 1}.</span>{" "}
                    <input
                      defaultValue={pose}
                      onChange={(e) => setPose(i, e.target.value)}
                      aria-label={`Key pose ${i + 1}`}
                      className="w-full rounded border border-transparent bg-transparent hover:border-border focus-visible:border-primary focus-visible:outline-none"
                    />
                    <div className="mt-1.5 flex items-center gap-1">
                      <Camera className="h-3 w-3 shrink-0 text-muted" />
                      <Select
                        value={cameraMoves[i] ?? ""}
                        onChange={(value: string) => setCamera(i, value)}
                        aria-label={`Camera for pose ${i + 1}`}
                        className="w-full rounded border border-transparent bg-transparent text-[11px] text-muted hover:border-border focus-visible:border-primary focus-visible:outline-none"
                      >
                        {CHOREO_CAMERA_MOVES.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="mt-1 flex items-center gap-1">
                      <Lightbulb className="h-3 w-3 shrink-0 text-muted" />
                      <Select
                        value={lightingMoves[i] ?? ""}
                        onChange={(value: string) => setLighting(i, value)}
                        aria-label={`Lighting for pose ${i + 1}`}
                        className="w-full rounded border border-transparent bg-transparent text-[11px] text-muted hover:border-border focus-visible:border-primary focus-visible:outline-none"
                      >
                        {CHOREO_LIGHTING.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </Select>
                    </div>
                    {/* Per-pose generation */}
                    <div className="mt-1.5 flex gap-1">
                      <button
                        onClick={() => onGenerate("pose", applyTo, { index: i, text: pose })}
                        className="inline-flex flex-1 items-center justify-center gap-1 rounded bg-elevated px-1.5 py-1 text-[10px] font-medium text-foreground hover:bg-primary/15 hover:text-primary"
                        title="Generate an image of this pose"
                      >
                        <ImageIcon className="h-3 w-3" /> Image
                      </button>
                      <button
                        onClick={() => onGenerate("motion", applyTo, { index: i, text: pose })}
                        className="inline-flex flex-1 items-center justify-center gap-1 rounded bg-elevated px-1.5 py-1 text-[10px] font-medium text-foreground hover:bg-primary/15 hover:text-primary"
                        title="Generate a motion clip into this pose"
                      >
                        <Video className="h-3 w-3" /> Clip
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Motion preview — instant local stick-figure sketch of the movement,
            next to (never instead of) the real AI "Motion test" above. */}
            <MotionPreview poses={section.keyPoses} accent={color} />

            {/* Performance / acting brief */}
            <div>
              <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
                <Drama className="h-3.5 w-3.5" /> Performance sheet
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {(
                  [
                    ["emotion", "Emotion"],
                    ["facialExpression", "Facial expression"],
                    ["intent", "Intent"],
                    ["subtext", "Subtext"],
                    ["energy", "Energy"],
                  ] as [keyof PerformanceBrief, string][]
                ).map(([key, label]) => (
                  <label key={key} className="block">
                    <span className="mb-0.5 block text-[10px] uppercase tracking-wide text-muted">
                      {label}
                    </span>
                    <input
                      value={perf[key]}
                      onChange={(e) => setPerf(key, e.target.value)}
                      aria-label={`${label} for ${section.label}`}
                      className="h-7 w-full rounded-[var(--radius-input)] border border-border bg-surface px-2 text-xs text-foreground focus-visible:border-primary focus-visible:outline-none"
                    />
                  </label>
                ))}
              </div>
            </div>

            <textarea
              defaultValue={section.continuity}
              onChange={(e) => onChange({ ...section, continuity: e.target.value })}
              aria-label="Continuity note"
              rows={2}
              className="w-full resize-y rounded-[var(--radius-input)] border border-transparent bg-transparent text-[11px] italic text-muted hover:border-border focus-visible:border-primary focus-visible:outline-none"
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
