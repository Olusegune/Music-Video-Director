import { useEffect, useMemo, useState } from "react";
import {
  Footprints,
  Wand2,
  RefreshCw,
  Music,
  Users,
  LayoutGrid,
  Sparkles,
  Camera,
  Drama,
  Lightbulb,
  Image as ImageIcon,
  Video,
} from "lucide-react";
import {
  choreographSong,
  getChoreo,
  saveChoreo,
  inferStyle,
  defaultPerformance,
  CHOREO_STYLES,
  CHOREO_CAMERA_MOVES,
  CHOREO_LIGHTING,
  type ChoreoPlan,
  type ChoreoSection,
  type PerformanceBrief,
} from "@/lib/choreography";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { loadSongs, sectionColor, formatTime, type SongMap } from "@/lib/songBrain";
import { loadCast } from "@/lib/cast";
import { getTemplate } from "@/lib/templates";
import { useAppStore } from "@/store/useAppStore";
import { api } from "@/lib/ipc";
import type { Character } from "@/lib/types";
import { composeCharacterDna } from "@/lib/characterDna";
import { importImageToLibrary } from "@/lib/assets";
import { addMotionTest } from "@/lib/motionTest";
import { GenerationPanel, type GenerateOpts } from "@/components/generation/GenerationPanel";
import { VIDEO_MODELS } from "@/lib/videoGen";
import { useAudioPlayer } from "@/lib/audioPlayer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const VIDEO_GEN_MODELS = VIDEO_MODELS.map((m) => ({
  id: m.id,
  label: m.label,
  providerKey: m.providerKey || "custom",
}));

function perfOf(section: ChoreoSection): PerformanceBrief {
  return section.performance ?? defaultPerformance(section.kind, section.energy);
}

/** Compose a pose-sheet image prompt from a choreo section + chosen performer. */
function posePrompt(section: ChoreoSection, c: Character | null): string {
  const dna = c ? c.promptDna || composeCharacterDna(c).promptDna : "a dancer";
  const poses = section.keyPoses.filter(Boolean).join("; ");
  const perf = perfOf(section);
  return [
    `Character dance pose / model sheet for ${dna}.`,
    `Poses for the ${section.label} (${section.intensity}, ${section.formation}).`,
    poses ? `Key poses: ${poses}.` : "",
    `Acting: ${perf.emotion}, expression ${perf.facialExpression}.`,
    "Show front view, side view, and 3/4 view of each pose, full body, dynamic dance positions, clearly labeled panels, neutral studio background, consistent character across all panels, professional concept art.",
  ]
    .filter(Boolean)
    .join(" ");
}

/** Compose a motion-test video prompt from a choreo section + chosen performer. */
function motionPrompt(section: ChoreoSection, c: Character | null): string {
  const dna = c ? c.promptDna || composeCharacterDna(c).promptDna : "a dancer";
  const moves = section.eightCounts.map((e) => e.phraseA).filter(Boolean).slice(0, 4).join(", ");
  const perf = perfOf(section);
  const cam = (section.cameraMoves ?? []).filter(Boolean).join(" → ");
  return [
    `${dna} performing dance choreography: ${moves || section.keyPoses.join(", ")}.`,
    `${section.intensity}, ${section.formation}. Emotion: ${perf.emotion}.`,
    cam ? `Camera: ${cam}.` : "",
    "Smooth full-body dance motion, cinematic music-video clip.",
  ]
    .filter(Boolean)
    .join(" ");
}

/** Single key-pose still — one performer, one pose, camera + lighting for it. */
function singlePosePrompt(section: ChoreoSection, c: Character | null, poseIndex: number, poseText: string): string {
  const dna = c ? c.promptDna || composeCharacterDna(c).promptDna : "a dancer";
  const cam = (section.cameraMoves ?? [])[poseIndex];
  const light = (section.lightingMoves ?? [])[poseIndex];
  const perf = perfOf(section);
  return [
    `Single dynamic dance pose: ${poseText}.`,
    `${dna}. Full body, ${section.intensity}. Emotion: ${perf.emotion}, expression ${perf.facialExpression}.`,
    cam ? `Shot: ${cam}.` : "",
    light ? `Lighting: ${light}.` : "",
    "Cinematic music-video still, clean background, high detail, professional color grade.",
  ]
    .filter(Boolean)
    .join(" ");
}

/** Single key-pose motion clip — performer moving into/through one pose. */
function singlePoseMotionPrompt(section: ChoreoSection, c: Character | null, poseIndex: number, poseText: string): string {
  const dna = c ? c.promptDna || composeCharacterDna(c).promptDna : "a dancer";
  const cam = (section.cameraMoves ?? [])[poseIndex];
  return [
    `${dna} dancing into the pose: ${poseText}.`,
    `${section.intensity}. ${cam ? `Camera: ${cam}.` : ""}`,
    "Smooth full-body dance motion, short cinematic music-video clip.",
  ]
    .filter(Boolean)
    .join(" ");
}

/** Compose a top-down formation-diagram prompt for a multi-performer section. */
function formationPrompt(section: ChoreoSection, lead: Character | null): string {
  const leadName = lead?.name || "the lead";
  return [
    `Top-down stage formation diagram for the ${section.label}.`,
    `${leadName} plus a group of backup dancers, formation: ${section.formation}.`,
    "Show four formations labeled A, B, C, D as a clean schematic — performer positions as labeled dots on a grid floor, with arrows for the movement paths between formations.",
    "Flat top view, infographic style, high contrast, clearly labeled.",
  ].join(" ");
}

export function ChoreographyView() {
  const activeSongId = useAppStore((s) => s.activeSongId);
  const setActiveSong = useAppStore((s) => s.setActiveSong);
  const openSong = useAppStore((s) => s.openSong);
  const activeTemplateId = useAppStore((s) => s.activeTemplateId);

  const [songs] = useState<SongMap[]>(() => loadSongs());
  const song = useMemo(
    () => songs.find((s) => s.id === activeSongId) ?? songs[0] ?? null,
    [songs, activeSongId]
  );

  // Default style: a cast dancer's style, else the template's dance style.
  const castDefaultStyle = useMemo(() => {
    const cast = loadCast();
    const dancer = cast.find((p) => p.danceStyle && CHOREO_STYLES.includes(p.danceStyle));
    if (dancer?.danceStyle) return dancer.danceStyle;
    const tmpl = getTemplate(activeTemplateId);
    return tmpl?.danceStyle && CHOREO_STYLES.includes(tmpl.danceStyle)
      ? tmpl.danceStyle
      : "";
  }, [activeTemplateId]);

  const [plan, setPlan] = useState<ChoreoPlan | null>(null);
  const [style, setStyle] = useState<string>("");
  const { data: characters = [] } = useQuery({ queryKey: ["characters"], queryFn: api.listCharacters });
  // Per-shot fine generation: pose sheet (image) or motion test (video).
  const [gen, setGen] = useState<{
    section: ChoreoSection;
    mode: "pose" | "motion" | "formation";
    character: Character | null;
    /** When set, generate a single key pose (image or clip) instead of a sheet. */
    pose?: { index: number; text: string };
  } | null>(null);

  useEffect(() => {
    if (!song) return;
    if (activeSongId !== song.id) setActiveSong(song.id);
    const existing = getChoreo(song.id);
    setPlan(existing);
    setStyle(existing?.style ?? castDefaultStyle ?? inferStyle(song));
  }, [song, activeSongId, setActiveSong, castDefaultStyle]);

  const generate = () => {
    if (!song) return;
    const p = choreographSong(song, style);
    saveChoreo(p);
    setPlan(p);
    setStyle(p.style);
  };

  if (!song) {
    return (
      <div className="flex h-full items-center justify-center p-10">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-elevated">
            <Music className="h-7 w-7 text-muted" />
          </div>
          <h2 className="text-base font-semibold">No song to choreograph</h2>
          <p className="mt-1 text-sm text-muted">
            Import a track in Song Studio first — choreography is built onto its
            performance sections.
          </p>
          <Button className="mt-4" onClick={openSong}>
            <Music className="h-4 w-4" />
            Go to Song Studio
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="grad-primary flex h-9 w-9 items-center justify-center rounded-lg">
            <Footprints className="h-4.5 w-4.5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-tight">Choreography</h1>
            <p className="text-xs text-muted">
              Routines for the performance sections of{" "}
              <span className="text-foreground">{song.name}</span> · {song.bpm} BPM
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={style}
            onChange={(e) => setStyle(e.target.value)}
            className="h-9 rounded-[var(--radius-input)] border border-border bg-surface px-2 text-sm text-foreground focus-visible:border-primary focus-visible:outline-none"
            aria-label="Dance style"
          >
            {CHOREO_STYLES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <Button variant="primary" onClick={generate}>
            {plan ? <RefreshCw className="h-4 w-4" /> : <Wand2 className="h-4 w-4" />}
            {plan ? "Re-choreograph" : "Choreograph"}
          </Button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {!plan ? (
          <div className="flex h-full items-center justify-center p-10">
            <button
              onClick={generate}
              className="flex max-w-md flex-col items-center gap-4 rounded-[var(--radius-card)] border border-dashed border-border bg-surface/60 px-10 py-14 text-center transition-colors hover:border-primary/50 hover:bg-elevated/40"
            >
              <div className="grad-primary flex h-14 w-14 items-center justify-center rounded-2xl">
                <Footprints className="h-7 w-7 text-white" />
              </div>
              <div>
                <div className="text-base font-semibold">
                  Choreograph “{song.name}”
                </div>
                <p className="mt-1 text-sm text-muted">
                  The engine lays {style || "a"} routine onto each performance
                  section — 8-counts mapped to the bars, formations, and a key-pose
                  sheet. Verses and intros stay free for natural movement.
                </p>
              </div>
              <span className="text-xs font-medium text-primary">
                Generate the routine
              </span>
            </button>
          </div>
        ) : (
          <div className="space-y-5 p-6">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="primary" className="normal-case">
                <Sparkles className="mr-1 h-3 w-3" />
                {plan.style}
              </Badge>
              <span className="text-muted">
                {plan.sections.length} choreographed section
                {plan.sections.length === 1 ? "" : "s"}
              </span>
              {plan.freeSections.length > 0 && (
                <span className="text-muted">
                  · free movement: {plan.freeSections.join(", ")}
                </span>
              )}
            </div>

            {plan.sections.length > 0 && (
              <ChoreoTimeline plan={plan} durationSec={song.durationSec} songId={song.id} />
            )}

            {plan.sections.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-sm text-muted">
                  No high-energy performance sections were detected in this song,
                  so there's nothing to set. Adjust section energy in Song Studio,
                  or treat the whole video as free movement.
                </CardContent>
              </Card>
            ) : (
              plan.sections.map((section) => (
                <ChoreoCard
                  key={section.sectionId}
                  section={section}
                  characters={characters}
                  onGenerate={(mode, character, pose) => setGen({ section, mode, character, pose })}
                  onChange={(next) => {
                    const updated: ChoreoPlan = {
                      ...plan,
                      sections: plan.sections.map((s) =>
                        s.sectionId === section.sectionId ? next : s
                      ),
                    };
                    saveChoreo(updated);
                    setPlan(updated);
                  }}
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* Pose-sheet / motion-test / per-pose generation via the unified panel */}
      {gen && (() => {
        const who = gen.character?.name ?? "Dancer";
        const p = gen.pose;
        const isVideo = gen.mode === "motion";
        const poseN = p ? p.index + 1 : 0;
        const title = p
          ? `${isVideo ? "Pose clip" : "Pose image"} ${poseN} — ${gen.section.label}`
          : `${gen.mode === "pose" ? "Pose sheet" : gen.mode === "formation" ? "Formation sheet" : "Motion test"} — ${gen.section.label}`;
        const prompt = p
          ? isVideo
            ? singlePoseMotionPrompt(gen.section, gen.character, p.index, p.text)
            : singlePosePrompt(gen.section, gen.character, p.index, p.text)
          : gen.mode === "pose"
            ? posePrompt(gen.section, gen.character)
            : gen.mode === "formation"
              ? formationPrompt(gen.section, gen.character)
              : motionPrompt(gen.section, gen.character);
        const aspect = isVideo ? "16:9" : gen.mode === "formation" ? "1:1" : "4:5";
        const useRefs = gen.mode !== "formation" && gen.character?.portraitUrl;
        return (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-background/80 p-6 backdrop-blur"
          onClick={() => setGen(null)}
        >
          <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold">
                {title}{gen.character ? ` · ${gen.character.name}` : ""}
              </h2>
              <button onClick={() => setGen(null)} aria-label="Close">
                <X className="h-4 w-4 text-muted hover:text-foreground" />
              </button>
            </div>
            <GenerationPanel
              title={`Generate ${isVideo ? "clip" : "image"}`}
              mode={isVideo ? "video" : "image"}
              models={isVideo ? VIDEO_GEN_MODELS : undefined}
              initialPrompt={prompt}
              defaultAspect={aspect}
              references={useRefs ? [gen.character!.portraitUrl] : []}
              onGenerate={async (opts: GenerateOpts) => {
                const refs = opts.references.length
                  ? opts.references
                  : useRefs
                    ? [gen.character!.portraitUrl]
                    : undefined;
                if (opts.mode === "video") {
                  const urls: string[] = [];
                  for (let i = 0; i < opts.variations; i++)
                    urls.push(
                      await api.generateMvShotVideo("choreo", crypto.randomUUID(), opts.prompt, opts.provider || undefined, refs)
                    );
                  return urls;
                }
                const urls: string[] = [];
                for (let i = 0; i < opts.variations; i++) {
                  const s = opts.seed !== undefined ? opts.seed + i : undefined;
                  urls.push(await api.generateImagePro(opts.provider, opts.prompt, opts.width, opts.height, refs, s));
                }
                return urls;
              }}
              onPick={(url) => {
                const tag = p ? `Pose ${poseN}` : gen.mode === "pose" ? "poses" : "motion";
                if (isVideo) {
                  addMotionTest({
                    label: `${who} — ${gen.section.label} ${tag}`,
                    characterName: who,
                    motionLabel: `${gen.section.label} ${tag}`,
                    prompt,
                    url,
                  });
                } else if (gen.mode === "formation") {
                  void importImageToLibrary("Formation sheet", `${gen.section.label} formation`, url);
                } else {
                  void importImageToLibrary("Pose sheet", `${who} — ${gen.section.label} ${tag}`, url);
                }
              }}
              pickLabel={isVideo ? "Save motion test" : "Save to library"}
            />
          </div>
        </div>
        );
      })()}
    </div>
  );
}

/** Synchronized choreography timeline — Sections / Moves / Camera / Performance
 *  lanes laid out across the song's duration, with a live playhead. */
function ChoreoTimeline({
  plan,
  durationSec,
  songId,
}: {
  plan: ChoreoPlan;
  durationSec: number;
  songId: string;
}) {
  const player = useAudioPlayer();
  const dur = Math.max(1, durationSec);
  const pct = (t: number) => `${Math.max(0, Math.min(100, (t / dur) * 100))}%`;
  const playhead = player.songId === songId ? (player.time / dur) * 100 : null;

  // Position each section's key poses evenly across its span.
  const poseMarks = plan.sections.flatMap((s) =>
    s.keyPoses.map((pose, i) => {
      const span = s.end - s.start;
      const t = s.start + ((i + 0.5) / Math.max(1, s.keyPoses.length)) * span;
      return {
        t,
        pose,
        camera: (s.cameraMoves ?? [])[i] ?? "",
        lighting: (s.lightingMoves ?? [])[i] ?? "",
        color: sectionColor(s.kind),
      };
    })
  );

  const Lane = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex items-center gap-2">
      <span className="w-20 shrink-0 text-right text-[10px] uppercase tracking-wide text-muted">{label}</span>
      <div className="relative h-7 flex-1 rounded bg-elevated/40">{children}</div>
    </div>
  );

  return (
    <Card>
      <CardContent className="space-y-1.5 p-4">
        <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
          <LayoutGrid className="h-3.5 w-3.5" /> Choreography timeline
        </div>
        <div className="relative">
          <div className="space-y-1.5">
            <Lane label="Sections">
              {plan.sections.map((s) => (
                <div
                  key={s.sectionId}
                  className="absolute top-0 flex h-full items-center justify-center overflow-hidden rounded px-1 text-[9px] font-medium text-white"
                  style={{ left: pct(s.start), width: pct(s.end - s.start), backgroundColor: sectionColor(s.kind) }}
                  title={`${s.label} · ${formatTime(s.start)}–${formatTime(s.end)}`}
                >
                  {s.label}
                </div>
              ))}
            </Lane>
            <Lane label="Moves">
              {plan.sections.flatMap((s) =>
                s.eightCounts.map((ec, i) => (
                  <div
                    key={`${s.sectionId}-${i}`}
                    className="absolute top-1 h-5 w-px bg-accent/70"
                    style={{ left: pct(ec.startSec) }}
                    title={`Bar ${ec.bar}: ${ec.phraseA}`}
                  />
                ))
              )}
            </Lane>
            <Lane label="Poses">
              {poseMarks.map((m, i) => (
                <div
                  key={i}
                  className="absolute top-1.5 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-surface"
                  style={{ left: pct(m.t), backgroundColor: m.color }}
                  title={`Pose: ${m.pose}`}
                />
              ))}
            </Lane>
            <Lane label="Camera">
              {poseMarks.filter((m) => m.camera).map((m, i) => (
                <span
                  key={i}
                  className="absolute top-1 -translate-x-1/2 whitespace-nowrap rounded bg-surface px-1 text-[9px] text-muted"
                  style={{ left: pct(m.t) }}
                  title={`Camera: ${m.camera}`}
                >
                  {m.camera}
                </span>
              ))}
            </Lane>
            <Lane label="Lighting">
              {poseMarks.filter((m) => m.lighting).map((m, i) => (
                <span
                  key={i}
                  className="absolute top-1 -translate-x-1/2 whitespace-nowrap rounded bg-surface px-1 text-[9px] text-amber-300/90"
                  style={{ left: pct(m.t) }}
                  title={`Lighting: ${m.lighting}`}
                >
                  {m.lighting}
                </span>
              ))}
            </Lane>
            <Lane label="Performance">
              {plan.sections.map((s) => (
                <span
                  key={s.sectionId}
                  className="absolute top-1 overflow-hidden whitespace-nowrap rounded px-1 text-[9px] text-foreground/80"
                  style={{ left: pct(s.start + (s.end - s.start) / 2), transform: "translateX(-50%)" }}
                  title={`${s.label} emotion`}
                >
                  {(s.performance ?? defaultPerformance(s.kind, s.energy)).emotion}
                </span>
              ))}
            </Lane>
          </div>
          {/* Playhead */}
          {playhead != null && (
            <div
              className="pointer-events-none absolute top-0 bottom-0 z-10 w-px bg-primary"
              style={{ left: `calc(5rem + 0.5rem + (100% - 5rem - 0.5rem) * ${playhead / 100})` }}
            >
              <span className="absolute -top-0.5 -left-1 h-2 w-2 rounded-full bg-primary" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ChoreoCard({
  section,
  characters,
  onGenerate,
  onChange,
}: {
  section: ChoreoSection;
  characters: Character[];
  onGenerate: (
    mode: "pose" | "motion" | "formation",
    character: Character | null,
    pose?: { index: number; text: string }
  ) => void;
  onChange: (next: ChoreoSection) => void;
}) {
  const color = sectionColor(section.kind);
  const [applyToId, setApplyToId] = useState<string>("");
  const applyTo = characters.find((c) => c.id === applyToId) ?? null;
  const perf = section.performance ?? defaultPerformance(section.kind, section.energy);
  const setPerf = (key: keyof PerformanceBrief, v: string) =>
    onChange({ ...section, performance: { ...perf, [key]: v } });
  const cameraMoves =
    section.cameraMoves ?? section.keyPoses.map((_, i) => CHOREO_CAMERA_MOVES[i % CHOREO_CAMERA_MOVES.length]);
  const setCamera = (i: number, v: string) =>
    onChange({
      ...section,
      cameraMoves: section.keyPoses.map((_, j) => (j === i ? v : cameraMoves[j] ?? "")),
    });
  const lightingMoves =
    section.lightingMoves ?? section.keyPoses.map((_, i) => CHOREO_LIGHTING[i % CHOREO_LIGHTING.length]);
  const setLighting = (i: number, v: string) =>
    onChange({
      ...section,
      lightingMoves: section.keyPoses.map((_, j) => (j === i ? v : lightingMoves[j] ?? "")),
    });
  const setCount = (i: number, key: "phraseA" | "phraseB", v: string) =>
    onChange({
      ...section,
      eightCounts: section.eightCounts.map((ec, j) => (j === i ? { ...ec, [key]: v } : ec)),
    });
  const setPose = (i: number, v: string) =>
    onChange({ ...section, keyPoses: section.keyPoses.map((p, j) => (j === i ? v : p)) });
  return (
    <Card className="overflow-hidden">
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
        <span className="text-xs text-muted">{section.intensity}</span>
        <span className="inline-flex items-center gap-1.5 text-xs text-muted">
          <Users className="h-3.5 w-3.5" />
          {section.formation}
        </span>
        {/* Apply to a performer, then generate a pose sheet / motion test */}
        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-[11px] text-muted">Apply to:</span>
          <select
            value={applyToId}
            onChange={(e) => setApplyToId(e.target.value)}
            className="h-7 rounded-[var(--radius-input)] border border-border bg-surface px-1.5 text-xs text-foreground focus-visible:border-primary focus-visible:outline-none"
            aria-label={`Performer for ${section.label}`}
          >
            <option value="">Generic dancer</option>
            {characters.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
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

      <CardContent className="space-y-4 p-5">
        {/* 8-counts */}
        <div className="space-y-1.5">
          {section.eightCounts.map((ec, i) => (
            <div
              key={i}
              className="flex items-stretch gap-3 rounded-[var(--radius-button)] border border-border bg-surface p-2.5"
            >
              <div className="flex w-16 shrink-0 flex-col items-center justify-center border-r border-border pr-2">
                <span className="text-[10px] uppercase tracking-wide text-muted">
                  Bar {ec.bar}
                </span>
                <span className="text-[10px] tabular-nums text-muted">
                  {formatTime(ec.startSec)}
                </span>
              </div>
              <div className="min-w-0 flex-1 space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-accent">1-4</span>
                  <input
                    defaultValue={ec.phraseA}
                    onChange={(e) => setCount(i, "phraseA", e.target.value)}
                    aria-label={`Bar ${ec.bar} counts 1-4`}
                    className="flex-1 rounded border border-transparent bg-transparent px-1 hover:border-border focus-visible:border-primary focus-visible:outline-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-accent">5-8</span>
                  <input
                    defaultValue={ec.phraseB}
                    onChange={(e) => setCount(i, "phraseB", e.target.value)}
                    aria-label={`Bar ${ec.bar} counts 5-8`}
                    className="flex-1 rounded border border-transparent bg-transparent px-1 hover:border-border focus-visible:border-primary focus-visible:outline-none"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Key poses */}
        <div>
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
            <LayoutGrid className="h-3.5 w-3.5" /> Key pose sheet
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
                  <select
                    value={cameraMoves[i] ?? ""}
                    onChange={(e) => setCamera(i, e.target.value)}
                    aria-label={`Camera for pose ${i + 1}`}
                    className="w-full rounded border border-transparent bg-transparent text-[11px] text-muted hover:border-border focus-visible:border-primary focus-visible:outline-none"
                  >
                    {CHOREO_CAMERA_MOVES.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="mt-1 flex items-center gap-1">
                  <Lightbulb className="h-3 w-3 shrink-0 text-muted" />
                  <select
                    value={lightingMoves[i] ?? ""}
                    onChange={(e) => setLighting(i, e.target.value)}
                    aria-label={`Lighting for pose ${i + 1}`}
                    className="w-full rounded border border-transparent bg-transparent text-[11px] text-muted hover:border-border focus-visible:border-primary focus-visible:outline-none"
                  >
                    {CHOREO_LIGHTING.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
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

        {/* Performance / acting brief */}
        <div>
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
            <Drama className="h-3.5 w-3.5" /> Performance sheet
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {([
              ["emotion", "Emotion"],
              ["facialExpression", "Facial expression"],
              ["intent", "Intent"],
              ["subtext", "Subtext"],
              ["energy", "Energy"],
            ] as [keyof PerformanceBrief, string][]).map(([key, label]) => (
              <label key={key} className="block">
                <span className="mb-0.5 block text-[10px] uppercase tracking-wide text-muted">{label}</span>
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
      </CardContent>
    </Card>
  );
}
