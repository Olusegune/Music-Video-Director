import { useEffect, useMemo, useState } from "react";
import {
  Footprints,
  Wand2,
  RefreshCw,
  Music,
  Users,
  LayoutGrid,
  Sparkles,
  ChevronDown,
  Video,
  Drama,
} from "lucide-react";
import { DANCE_STYLE_META } from "@/apps/music-video/lib/danceStyleMeta";
import {
  choreographSong,
  isChoreoStale,
  getChoreo,
  saveChoreo,
  inferStyle,
  defaultPerformance,
  CHOREO_STYLES,
  type ChoreoPlan,
  type ChoreoSection,
  type PerformanceBrief,
} from "@/apps/music-video/lib/choreography";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import {
  loadSongs,
  sectionColor,
  formatTime,
  type SongMap,
} from "@/apps/music-video/lib/songBrain";
import { loadCast, type Performer } from "@/apps/music-video/lib/cast";
import { getTemplate } from "@/platform/lib/templates";
import { useAppStore } from "@/platform/store/useAppStore";
import { api } from "@/platform/lib/ipc";
import type { Character } from "@/platform/lib/types";
import { composeCharacterDna } from "@/platform/lib/characterDna";
import { importImageToLibrary } from "@/platform/lib/assets";
import { addMotionTest } from "@/apps/music-video/lib/motionTest";
import {
  GenerationPanel,
  type GenerateOpts,
} from "@/platform/components/generation/GenerationPanel";
import { cn } from "@/platform/lib/utils";
import { VIDEO_MODELS } from "@/platform/lib/videoGen";
import { useAudioPlayer } from "@/apps/music-video/lib/audioPlayer";
import { Button } from "@/platform/components/ui/button";
import { Badge } from "@/platform/components/ui/badge";
import { Card, CardContent } from "@/platform/components/ui/card";
import { ChoreoCard } from "./ChoreoCard";
import { PerformerCard, GenericPerformerCard } from "./PerformerCard";
import { EnergyMap } from "./EnergyMap";
import { ChoreographyPreviewStrip } from "./ChoreographyPreviewStrip";
import { HelpHint } from "@/platform/components/ui/help-hint";

const VIDEO_GEN_MODELS = VIDEO_MODELS.map((m) => ({
  id: m.id,
  label: m.label,
  providerKey: m.providerKey || "custom",
  apiModel: m.apiModel,
}));

/** Compact trigger + popover grid — replaces a plain <select> with the same
 *  visual-card language as Magic Mode's Video Type step. */
function StylePicker({ value, onChange }: { value: string; onChange: (s: string) => void }) {
  const [open, setOpen] = useState(false);
  const meta = DANCE_STYLE_META[value];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 items-center gap-2 rounded-[var(--radius-input)] border border-border bg-surface px-3 text-sm text-foreground hover:border-primary/40"
        aria-label="Dance style"
        aria-expanded={open}
      >
        {meta?.icon}
        {value || "Choose a style"}
        <ChevronDown className="h-3.5 w-3.5 text-muted" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute left-0 top-full z-20 mt-1.5 grid w-[36rem] max-w-[90vw] grid-cols-2 gap-2 rounded-[var(--radius-card)] border border-border bg-surface p-3 shadow-card sm:grid-cols-2">
            {CHOREO_STYLES.map((s) => {
              const m = DANCE_STYLE_META[s];
              const active = s === value;
              return (
                <button
                  key={s}
                  onClick={() => {
                    onChange(s);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex flex-col items-start gap-1.5 rounded-[var(--radius-card)] border p-2.5 text-left transition-colors",
                    active
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/40"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-lg",
                      active ? "bg-primary/20 text-primary" : "bg-elevated text-muted"
                    )}
                  >
                    {m?.icon}
                  </span>
                  <span className="text-xs font-semibold leading-tight">{s}</span>
                  <span className="text-[10px] leading-snug text-muted">{m?.tagline}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

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
  const moves = section.eightCounts
    .map((e) => e.phraseA)
    .filter(Boolean)
    .slice(0, 4)
    .join(", ");
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
function singlePosePrompt(
  section: ChoreoSection,
  c: Character | null,
  poseIndex: number,
  poseText: string
): string {
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
function singlePoseMotionPrompt(
  section: ChoreoSection,
  c: Character | null,
  poseIndex: number,
  poseText: string
): string {
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
    return tmpl?.danceStyle && CHOREO_STYLES.includes(tmpl.danceStyle) ? tmpl.danceStyle : "";
  }, [activeTemplateId]);

  const [plan, setPlan] = useState<ChoreoPlan | null>(null);
  const [style, setStyle] = useState<string>("");
  // Display tier follows the platform-wide StudioMode (Sidebar switch):
  // Director mode → guided view; Studio and Creator → professional view.
  const studioMode = useAppStore((s) => s.studioMode);
  const viewMode = studioMode === "director" ? "guided" : "professional";
  const { data: characters = [] } = useQuery({
    queryKey: ["characters"],
    queryFn: api.listCharacters,
  });
  const [cast] = useState<Performer[]>(() => loadCast());
  // Clicking a PerformerCard focuses that performer across every section
  // below at once, instead of re-picking them per section. Keyed by
  // performer id (not characterId) so an unlinked performer and "Generic"
  // are never conflated as the same selection.
  const [focusedPerformerId, setFocusedPerformerId] = useState<string | undefined>(undefined);
  const focusCharacterId = cast.find((p) => p.id === focusedPerformerId)?.characterId;
  // Clicking the Energy Map or the Preview Strip jumps to and briefly
  // highlights the matching section card below.
  const [flashSectionId, setFlashSectionId] = useState<string | null>(null);
  const jumpToSection = (sectionId: string) => {
    const el = document.getElementById(`choreo-section-${sectionId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    setFlashSectionId(sectionId);
    window.setTimeout(() => setFlashSectionId((id) => (id === sectionId ? null : id)), 1600);
  };
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

  // `styleOverride` lets the empty state's four starting points each nudge
  // toward a different flavor without a separate engine — same
  // choreographSong() call, just a different style vocabulary. `openSignature`
  // chains straight into the motion-test generator on the freshly-built plan
  // (not stale `plan` state, since the generate above hasn't re-rendered yet).
  const generate = (styleOverride?: string, openSignature?: boolean) => {
    if (!song) return;
    const p = choreographSong(song, styleOverride ?? style);
    saveChoreo(p);
    setPlan(p);
    setStyle(p.style);
    if (openSignature && p.sections.length > 0) {
      const hero = [...p.sections].sort((a, b) => b.energy - a.energy)[0];
      setGen({ section: hero, mode: "motion", character: null });
    }
  };

  // "Create Signature Move" — jump straight to a motion test on the highest-
  // energy choreographed section, the natural hero moment for the video.
  const createSignatureMove = () => {
    if (!plan || plan.sections.length === 0) return;
    const hero = [...plan.sections].sort((a, b) => b.energy - a.energy)[0];
    setGen({ section: hero, mode: "motion", character: null });
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
            Import a track in Song Studio first — choreography is built onto its performance
            sections.
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
              <span className="text-foreground">{song.name}</span> · {song.bpm} BPM · reads each
              section&rsquo;s lyrics and director&rsquo;s notes to pick matching moves
            </p>
          </div>
          {/* Display tier follows the platform-wide Director / Studio /
              Creator switch in the Sidebar (StudioMode, decision D1). */}
        </div>
        <div className="flex items-center gap-2">
          <StylePicker value={style} onChange={setStyle} />
          <Button
            variant="primary"
            onClick={() => generate()}
            title="Plans moves, formations, and poses from each section's tempo and energy — biased toward its lyrics and any choreography/story notes when they suggest a gesture (e.g. 'reach for the sky', 'kneel and pray')"
          >
            {plan ? <RefreshCw className="h-4 w-4" /> : <Wand2 className="h-4 w-4" />}
            {plan ? "Re-choreograph" : "Choreograph"}
          </Button>
        </div>
      </header>

      {/* A routine planned against an older section list is worse than none:
          it hands chorus shots verse-energy movement while looking complete.
          Surfaced rather than silently re-planned, because the moment cards
          below are hand-editable and re-planning discards those edits. */}
      {plan && isChoreoStale(plan, song) && (
        <div className="flex flex-wrap items-center gap-3 border-b border-warning/30 bg-warning/5 px-6 py-3">
          <span className="text-xs text-warning">
            This routine was planned for an older version of the song&rsquo;s sections — some
            moments no longer line up with the track.
          </span>
          <Button size="sm" variant="secondary" onClick={() => generate()}>
            <RefreshCw className="h-3.5 w-3.5" /> Re-choreograph to match
          </Button>
        </div>
      )}

      {/* AI Choreographer — the panel that frames this as a choreographer's
          workflow, not a spreadsheet. Per-shot Pose sheet / Formation / Motion
          test live on each moment card below; this is the whole-song shortcut. */}
      {plan && plan.sections.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-elevated/30 px-6 py-3">
          <span className="mr-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> AI Choreographer
          </span>
          <Button size="sm" variant="secondary" onClick={() => generate()}>
            <RefreshCw className="h-3.5 w-3.5" /> Generate Choreography
          </Button>
          <Button size="sm" variant="secondary" onClick={createSignatureMove}>
            <Sparkles className="h-3.5 w-3.5" /> Create Signature Move
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              setGen({ section: plan.sections[0], mode: "formation", character: null })
            }
          >
            <Users className="h-3.5 w-3.5" /> Generate Formations
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setGen({ section: plan.sections[0], mode: "pose", character: null })}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Generate Pose Sheet
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setGen({ section: plan.sections[0], mode: "motion", character: null })}
          >
            <Video className="h-3.5 w-3.5" /> Motion Test
          </Button>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {!plan ? (
          <div className="flex h-full items-center justify-center p-10">
            <div className="max-w-2xl text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl grad-primary">
                <Footprints className="h-7 w-7 text-white" />
              </div>
              <div className="text-base font-semibold">Choreograph “{song.name}”</div>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted">
                Pick what this song should feel like — the engine lays a routine onto each
                performance section. Verses and intros stay free for natural movement.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {(
                  [
                    {
                      key: "performance",
                      label: "Performance",
                      desc: "Polished, camera-ready choreography — the default.",
                      icon: <Sparkles className="h-5 w-5" />,
                      action: () => generate(),
                    },
                    {
                      key: "dance-break",
                      label: "Dance Break",
                      desc: "High-energy, crew-forward — Street/Krump vocabulary.",
                      icon: <Video className="h-5 w-5" />,
                      action: () => generate("Street / Krump"),
                    },
                    {
                      key: "story",
                      label: "Story Sequence",
                      desc: "Grounded, narrative movement — Contemporary vocabulary.",
                      icon: <Drama className="h-5 w-5" />,
                      action: () => generate("Contemporary"),
                    },
                    {
                      key: "signature",
                      label: "Signature Move",
                      desc: "Generate, then jump straight to a motion test on the hero moment.",
                      icon: <Wand2 className="h-5 w-5" />,
                      action: () => generate(undefined, true),
                    },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.key}
                    onClick={opt.action}
                    className="flex flex-col items-start gap-2 rounded-[var(--radius-card)] border border-dashed border-border bg-surface/60 p-4 text-left transition-colors hover:border-primary/50 hover:bg-elevated/40"
                  >
                    <span className="grad-primary flex h-9 w-9 items-center justify-center rounded-lg text-white">
                      {opt.icon}
                    </span>
                    <span className="text-sm font-semibold">{opt.label}</span>
                    <span className="text-xs text-muted">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>
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
                <span className="text-muted">· free movement: {plan.freeSections.join(", ")}</span>
              )}
            </div>

            <EnergyMap song={song} plan={plan} onSelectSection={jumpToSection} />

            {cast.length > 0 && (
              <div>
                <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
                  <Users className="h-3.5 w-3.5" /> Performers
                  <HelpHint
                    title="Performers"
                    body="Your cast, from the Cast page. Click a performer to choreograph for them across every section at once — pose sheets and motion tests then generate with their look. 'Generic' means no specific cast member."
                    example="Click 'Sade' and every section's pose-sheet generation uses Sade's portrait as the reference."
                  />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  <GenericPerformerCard
                    active={focusedPerformerId === undefined}
                    onClick={() => setFocusedPerformerId(undefined)}
                  />
                  {cast.map((p) => {
                    const char = characters.find((c) => c.id === p.characterId) ?? null;
                    return (
                      <PerformerCard
                        key={p.id}
                        performer={p}
                        character={char}
                        active={focusedPerformerId === p.id}
                        onClick={() => setFocusedPerformerId(p.id)}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {plan.sections.length > 0 && (
              <ChoreographyPreviewStrip
                plan={plan}
                onSelectSection={jumpToSection}
                onReorderPoses={(sectionId, poses) => {
                  const updated: ChoreoPlan = {
                    ...plan,
                    sections: plan.sections.map((s) =>
                      s.sectionId === sectionId ? { ...s, keyPoses: poses } : s
                    ),
                  };
                  saveChoreo(updated);
                  setPlan(updated);
                }}
              />
            )}

            {plan.sections.length > 0 && (
              <ChoreoTimeline plan={plan} durationSec={song.durationSec} songId={song.id} />
            )}

            {plan.sections.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-sm text-muted">
                  No high-energy performance sections were detected in this song, so there's nothing
                  to set. Adjust section energy in Song Studio, or treat the whole video as free
                  movement.
                </CardContent>
              </Card>
            ) : (
              plan.sections.map((section, si) => (
                <ChoreoCard
                  key={section.sectionId}
                  section={section}
                  characters={characters}
                  focusCharacterId={focusCharacterId}
                  highlighted={flashSectionId === section.sectionId}
                  performerCount={cast.length || 3}
                  nextFormation={plan.sections[si + 1]?.formation}
                  viewMode={viewMode}
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
      {gen &&
        (() => {
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
                    {title}
                    {gen.character ? ` · ${gen.character.name}` : ""}
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
                          await api.generateVideoFromSpec(
                            {
                              ...opts.spec,
                              references: (refs ?? []).map((url) => ({
                                url,
                                category: "character",
                                strength: 0.75,
                              })),
                              providerPref: opts.provider as never,
                              modelHint: opts.apiModel ?? opts.modelId,
                              moduleId: "musicvideo",
                              projectRef: {
                                moduleId: "musicvideo",
                                projectId: "choreo",
                                entityId: crypto.randomUUID(),
                              },
                            },
                            "choreo"
                          )
                        );
                      return urls;
                    }
                    const urls: string[] = [];
                    for (let i = 0; i < opts.variations; i++) {
                      const s = opts.seed !== undefined ? opts.seed + i : undefined;
                      urls.push(
                        await api.generateImageFromSpec({
                          ...opts.spec,
                          seed: s,
                          batch: 1,
                          references: (refs ?? []).map((url) => ({
                            url,
                            category: "character",
                            strength: 0.75,
                          })),
                          providerPref: opts.provider as never,
                          modelHint: opts.apiModel ?? opts.modelId,
                          moduleId: "musicvideo",
                          projectRef: { moduleId: "musicvideo", projectId: "choreo" },
                        })
                      );
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
                      void importImageToLibrary(
                        "Formation sheet",
                        `${gen.section.label} formation`,
                        url
                      );
                    } else {
                      void importImageToLibrary(
                        "Pose sheet",
                        `${who} — ${gen.section.label} ${tag}`,
                        url
                      );
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
      <span className="w-20 shrink-0 text-right text-[10px] uppercase tracking-wide text-muted">
        {label}
      </span>
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
                  style={{
                    left: pct(s.start),
                    width: pct(s.end - s.start),
                    backgroundColor: sectionColor(s.kind),
                  }}
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
              {poseMarks
                .filter((m) => m.camera)
                .map((m, i) => (
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
              {poseMarks
                .filter((m) => m.lighting)
                .map((m, i) => (
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
                  style={{
                    left: pct(s.start + (s.end - s.start) / 2),
                    transform: "translateX(-50%)",
                  }}
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
