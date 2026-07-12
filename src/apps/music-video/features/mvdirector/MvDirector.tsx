import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Clapperboard,
  Wand2,
  RefreshCw,
  Music,
  ImageIcon,
  Loader2,
  Sparkles,
  Video,
  LayoutTemplate,
  Users,
  X,
  HelpCircle,
  SlidersHorizontal,
} from "lucide-react";
import {
  directSong,
  getTreatment,
  saveTreatment,
  type MvTreatment,
  type MvSectionPlan,
  type MvShot,
} from "@/apps/music-video/lib/mvDirector";
import { loadSongs, type SongMap } from "@/apps/music-video/lib/songBrain";
import { loadCast, productionReferenceImages } from "@/apps/music-video/lib/cast";
import { getAutoProductionRefs, setAutoProductionRefs } from "@/platform/lib/settings";
import {
  buildShotImagePrompt,
  buildShotVideoPrompt,
  choreoHintForTime,
} from "@/apps/music-video/lib/mvGen";
import { getChoreo } from "@/apps/music-video/lib/choreography";
import { importImageToLibrary } from "@/platform/lib/assets";
import { detectSectionPerformer } from "@/apps/music-video/lib/performerDetect";
import { findModel, resolveSize, SIZE_PRESETS } from "@/platform/lib/imageGen";
import { VIDEO_MODELS, findVideoModel } from "@/platform/lib/videoGen";
import { useProviderReadiness } from "@/platform/lib/providerReady";
import { getTemplate } from "@/platform/lib/templates";
import { api } from "@/platform/lib/ipc";
import { useAppStore } from "@/platform/store/useAppStore";
import {
  GenerationPanel,
  type GenerateOpts,
} from "@/platform/components/generation/GenerationPanel";
import { cn } from "@/platform/lib/utils";
import { Button } from "@/platform/components/ui/button";
import { AssetImage, AssetVideo } from "@/platform/components/ui/asset-image";
import { collectRefs } from "@/platform/lib/refs";
import { GEN_MODELS } from "./shotHelpers";
import { TreatmentView } from "./TreatmentView";
import { SimpleTreatmentView } from "./SimpleTreatment";
import type { PerformerOption, ContinuityInfo } from "./ChoreoPanel";

/** Pull a song section's authored brief (lead, camera, mood, …) for prompting. */
function briefForSection(song: SongMap | null, sectionId: string) {
  const s = song?.sections.find((x) => x.id === sectionId);
  if (!s) return undefined;
  const { lead, backup, mood, cameraNote, choreoNote, storyNote, visualStyle } = s;
  // Use the assigned performer, or the confident auto-detection.
  const det = detectSectionPerformer(s);
  const performerRole = s.performerRole || (det.confident ? det.role : undefined);
  if (!(
    lead ||
    backup ||
    mood ||
    cameraNote ||
    choreoNote ||
    storyNote ||
    visualStyle ||
    performerRole
  ))
    return undefined;
  return { lead, backup, mood, cameraNote, choreoNote, storyNote, visualStyle, performerRole };
}

/** Image models that have a direct API (exclude manual/copy-prompt ones). */
const MV_ASPECTS = ["16:9", "9:16", "2.39:1", "4:5", "1:1"];
/** Quality presets (long-edge) the user picks per render. */
const SIZE_OPTS = SIZE_PRESETS.filter((s) => s.long);
const SIZE_LABEL: Record<string, string> = {
  small: "Draft · 768px",
  medium: "Standard · 1024px",
  large: "High · 1536px",
  hd: "Max · 2048px",
};

export function MvDirector() {
  const activeSongId = useAppStore((s) => s.activeSongId);
  const setActiveSong = useAppStore((s) => s.setActiveSong);
  const openSong = useAppStore((s) => s.openSong);
  const openApiKeys = useAppStore((s) => s.openApiKeys);
  const openHelp = useAppStore((s) => s.openHelp);
  const openTemplates = useAppStore((s) => s.openTemplates);
  const activeTemplateId = useAppStore((s) => s.activeTemplateId);
  const { isConfigured, isReady } = useProviderReadiness();

  const [songs] = useState<SongMap[]>(() => loadSongs());
  const song = useMemo(
    () => songs.find((s) => s.id === activeSongId) ?? songs[0] ?? null,
    [songs, activeSongId]
  );

  const [treatment, setTreatment] = useState<MvTreatment | null>(null);

  // Load the treatment for the active (song, template) — each template keeps its
  // own shot list + frames, so switching templates loads its own version.
  useEffect(() => {
    if (song) {
      if (activeSongId !== song.id) setActiveSong(song.id);
      setTreatment(getTreatment(song.id, activeTemplateId));
    }
  }, [song, activeSongId, activeTemplateId, setActiveSong]);

  const { data: characters = [] } = useQuery({
    queryKey: ["characters"],
    queryFn: api.listCharacters,
  });
  const [cast] = useState(() => loadCast());
  const [modelId, setModelId] = useState(GEN_MODELS[0].id);
  const [videoModelId, setVideoModelId] = useState(VIDEO_MODELS[0].id);
  const [aspect, setAspect] = useState("16:9");
  const [sizeId, setSizeId] = useState("large");
  const [autoRefs, setAutoRefs] = useState(() => getAutoProductionRefs());
  // Display tier — derived from the platform-wide StudioMode (Sidebar switch):
  // Director → big cards, one action per scene; Studio → full creative
  // controls; Creator → + prompt/model panels open by default.
  const studioMode = useAppStore((s) => s.studioMode);
  const viewMode =
    studioMode === "director" ? "simple" : studioMode === "studio" ? "director" : "expert";
  // Advanced generation controls (seed/variations/fps/…) are exactly the
  // Creator-mode surface — visible there, tucked away otherwise.
  const advanced = studioMode === "creator";
  const [seed, setSeed] = useState("");
  const [variations, setVariations] = useState(1);
  const [fps, setFps] = useState(24);
  const [motion, setMotion] = useState("medium");
  // Clip generation controls (granular).
  const [duration, setDuration] = useState(5);
  const [resolution, setResolution] = useState("720p");
  const [audioDialogue, setAudioDialogue] = useState(true);
  const [audioSfx, setAudioSfx] = useState(true);
  const [audioMusic, setAudioMusic] = useState(false);
  // Clip settings (size/seed/variations/video model/motion/fps/duration/
  // resolution/audio) are real Layer-3 controls, but a flat row of ~9 selects
  // reads as a form even to power users — collapsed behind one toggle instead
  // of dumping them all into the header whenever Creator mode is active.
  const [showClipSettings, setShowClipSettings] = useState(false);
  // Per-shot fine-tune via the unified GenerationPanel.
  const [tune, setTune] = useState<{ section: MvSectionPlan; shot: MvShot } | null>(null);

  // Production memory: the cast's linked Character portraits, auto-applied to
  // performance shots so the director never re-selects them.
  const prodRefs = useMemo(() => productionReferenceImages(cast, characters), [cast, characters]);

  // Performers available for choreography assignment: the cast + Character Bible.
  const performers = useMemo<PerformerOption[]>(() => {
    const out: PerformerOption[] = [];
    const seen = new Set<string>();
    const charById = new Map(characters.map((c) => [c.id, c]));
    for (const p of cast) {
      const name = p.name || p.role;
      const key = (p.characterId ?? name).toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const linked = p.characterId ? charById.get(p.characterId) : undefined;
      out.push({ name, characterId: p.characterId, role: p.role, image: linked?.portraitUrl });
    }
    for (const c of characters) {
      if (seen.has(c.id.toLowerCase()) || seen.has(c.name.toLowerCase())) continue;
      seen.add(c.id.toLowerCase());
      out.push({ name: c.name, characterId: c.id, role: "Character", image: c.portraitUrl });
    }
    return out;
  }, [cast, characters]);

  // Pose sheets generated in Choreography (stored as Props, category "Pose sheet").
  const { data: propList = [] } = useQuery({ queryKey: ["props"], queryFn: api.listProps });
  const poseSheets = useMemo<{ label: string; src: string }[]>(
    () =>
      propList
        .filter((p) => p.category === "Pose sheet" && p.heroUrl)
        .map((p) => ({ label: p.name, src: p.heroUrl })),
    [propList]
  );

  // Choreography moves/poses for this song, pulled from the Choreography library.
  const choreoMoves = useMemo<string[]>(() => {
    if (!song) return [];
    const plan = getChoreo(song.id);
    if (!plan) return [];
    const moves = new Set<string>();
    for (const s of plan.sections) {
      s.eightCounts?.forEach((e) => e.phraseA && moves.add(e.phraseA));
      s.keyPoses?.forEach((p) => p && moves.add(p));
    }
    return [...moves];
  }, [song]);

  /** Explicit shot refs + (when enabled) the production cast on non-abstract
   *  shots — deduped. This is what actually guides the shot's generation. */
  const mergeProductionRefs = useCallback(
    (shot: MvShot, section: MvSectionPlan): string[] => {
      const auto = autoRefs && section.approach !== "Abstract" ? prodRefs.map((r) => r.src) : [];
      return Array.from(new Set([...(shot.refImages ?? []), ...auto]));
    },
    [autoRefs, prodRefs]
  );

  const [genShotId, setGenShotId] = useState<string | null>(null);
  const [genClipId, setGenClipId] = useState<string | null>(null);
  const [genPoseId, setGenPoseId] = useState<string | null>(null);
  const [batch, setBatch] = useState<{ done: number; total: number } | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const qc = useQueryClient();

  const direct = () => {
    if (!song) return;
    const t = directSong(song, getTemplate(activeTemplateId));
    saveTreatment(t);
    setTreatment(t);
  };

  const patch = (next: MvTreatment) => {
    saveTreatment(next);
    setTreatment(next);
  };

  const setShotImage = useCallback(
    (sectionId: string, shotId: string, url: string, candidates?: string[]) => {
      setTreatment((prev) => {
        if (!prev) return prev;
        const next: MvTreatment = {
          ...prev,
          sections: prev.sections.map((s) =>
            s.sectionId === sectionId
              ? {
                  ...s,
                  shots: s.shots.map((sh) =>
                    sh.id === shotId
                      ? {
                          ...sh,
                          imageUrl: url,
                          ...(candidates ? { imageCandidates: candidates } : {}),
                        }
                      : sh
                  ),
                }
              : s
          ),
        };
        saveTreatment(next);
        return next;
      });
    },
    []
  );

  const genFrame = useCallback(
    async (section: MvSectionPlan, shot: MvShot): Promise<void> => {
      if (!treatment) return;
      // A user-edited prompt overrides the auto-assembled one (maximum control).
      const prompt =
        shot.promptOverride?.trim() ||
        buildShotImagePrompt({
          shot,
          section,
          treatment,
          cast,
          characters,
          aspect,
          choreoHint: song ? choreoHintForTime(getChoreo(song.id), shot.start) : undefined,
          brief: briefForSection(song, section.sectionId),
        });
      const model = findModel(shot.imageProvider ?? modelId);
      const { width, height } = resolveSize(aspect, sizeId);
      const refs = await collectRefs(mergeProductionRefs(shot, section));
      const baseSeed = seed.trim() ? parseInt(seed.trim(), 10) : undefined;
      const n = Math.max(1, Math.min(4, variations));
      const urls: string[] = [];
      for (let i = 0; i < n; i++) {
        const s = baseSeed !== undefined ? baseSeed + i : undefined;
        urls.push(
          await api.generateImageFromSpec({
            capability: "image",
            prompt,
            seed: s,
            batch: 1,
            aspect,
            resolution: { width, height },
            references: refs.map((url) => ({ url, category: "scene", strength: 0.75 })),
            providerPref: model.providerKey as never,
            modelHint: model.apiModel ?? model.id,
            moduleId: "musicvideo",
            projectRef: { moduleId: "musicvideo", projectId: song.id, entityId: shot.id },
          })
        );
      }
      setShotImage(section.sectionId, shot.id, urls[0], urls.length > 1 ? urls : undefined);
    },
    [
      song,
      treatment,
      cast,
      characters,
      aspect,
      sizeId,
      modelId,
      seed,
      variations,
      mergeProductionRefs,
      setShotImage,
    ]
  );

  const generateOne = useCallback(
    async (section: MvSectionPlan, shot: MvShot) => {
      setGenError(null);
      setGenShotId(shot.id);
      try {
        await genFrame(section, shot);
      } catch (e) {
        setGenError(
          e instanceof Error ? e.message : typeof e === "string" ? e : "Generation failed."
        );
      } finally {
        setGenShotId(null);
      }
    },
    [genFrame]
  );

  const generateAll = useCallback(async () => {
    if (!treatment) return;
    const jobs = treatment.sections.flatMap((s) => s.shots.map((sh) => ({ section: s, shot: sh })));
    setGenError(null);
    setBatch({ done: 0, total: jobs.length });
    for (let i = 0; i < jobs.length; i++) {
      try {
        await genFrame(jobs[i].section, jobs[i].shot);
      } catch (e) {
        setGenError(
          e instanceof Error ? e.message : typeof e === "string" ? e : "Generation failed."
        );
      }
      setBatch({ done: i + 1, total: jobs.length });
    }
    setBatch(null);
  }, [treatment, genFrame]);

  const setShotVideo = useCallback((sectionId: string, shotId: string, url: string) => {
    setTreatment((prev) => {
      if (!prev) return prev;
      const next: MvTreatment = {
        ...prev,
        sections: prev.sections.map((s) =>
          s.sectionId === sectionId
            ? {
                ...s,
                shots: s.shots.map((sh) => (sh.id === shotId ? { ...sh, videoUrl: url } : sh)),
              }
            : s
        ),
      };
      saveTreatment(next);
      return next;
    });
  }, []);

  // Patch arbitrary fields on one shot (e.g. a per-shot model override) —
  // used by the Tune modal's video-model select.
  const patchShot = useCallback((sectionId: string, shotId: string, fields: Partial<MvShot>) => {
    setTreatment((prev) => {
      if (!prev) return prev;
      const next: MvTreatment = {
        ...prev,
        sections: prev.sections.map((s) =>
          s.sectionId === sectionId
            ? { ...s, shots: s.shots.map((sh) => (sh.id === shotId ? { ...sh, ...fields } : sh)) }
            : s
        ),
      };
      saveTreatment(next);
      return next;
    });
  }, []);

  const generateClip = useCallback(
    async (section: MvSectionPlan, shot: MvShot) => {
      if (!song || !treatment) return;
      setGenError(null);
      setGenClipId(shot.id);
      try {
        const audioWanted = [
          audioDialogue && "dialogue / vocals",
          audioSfx && "sound effects / foley",
          audioMusic && "background music",
        ].filter(Boolean) as string[];
        const generateAudio = audioWanted.length > 0;
        const audioLine = generateAudio
          ? `Audio: include ${audioWanted.join(", ")}.`
          : "Audio: silent (no generated audio).";
        const motionLine = `Camera motion: ${motion} intensity. Target ${fps} fps. ${audioLine}`;
        const basePrompt =
          shot.promptOverride?.trim() ||
          buildShotVideoPrompt({
            shot,
            section,
            treatment,
            cast,
            characters,
            aspect,
            choreoHint: choreoHintForTime(getChoreo(song.id), shot.start),
            brief: briefForSection(song, section.sectionId),
          });
        const prompt = `${basePrompt} ${motionLine}`;
        // Image-to-video: drive the clip from the shot's own frame first, then
        // its references + the production cast — so the clip matches the board.
        const refSrcs = [shot.imageUrl, ...mergeProductionRefs(shot, section)].filter(
          (s): s is string => !!s
        );
        const refs = await collectRefs(refSrcs);
        const vModel = findVideoModel(shot.videoProvider ?? videoModelId);
        // Omni references (only used by models that support them, e.g. Seedance).
        const [endFrameArr, audioRefs, videoRefs] = await Promise.all([
          collectRefs(shot.endFrame ? [shot.endFrame] : []),
          collectRefs(shot.refAudio),
          collectRefs(shot.refVideo),
        ]);
        const url = await api.generateVideoFromSpec(
          {
            capability: "video",
            prompt,
            references: refs.map((url) => ({ url, category: "scene", strength: 0.85 })),
            providerPref: vModel.providerKey as never,
            modelHint: vModel.apiModel ?? vModel.id,
            moduleId: "musicvideo",
            projectRef: { moduleId: "musicvideo", projectId: song.id, entityId: shot.id },
          },
          song.id,
          shot.id,
          {
            endFrame: endFrameArr[0],
            audioRefs: audioRefs.length ? audioRefs : undefined,
            videoRefs: videoRefs.length ? videoRefs : undefined,
            duration,
            resolution,
            generateAudio,
          }
        );
        setShotVideo(section.sectionId, shot.id, url);
      } catch (e) {
        setGenError(
          e instanceof Error ? e.message : typeof e === "string" ? e : "Clip generation failed."
        );
      } finally {
        setGenClipId(null);
      }
    },
    [
      song,
      treatment,
      cast,
      characters,
      aspect,
      videoModelId,
      motion,
      fps,
      duration,
      resolution,
      audioDialogue,
      audioSfx,
      audioMusic,
      mergeProductionRefs,
      setShotVideo,
    ]
  );

  // Generate a pose / model sheet for the shot's assigned performer + moves, and
  // save it to the library — where it returns as a thumbnail in the move browser.
  const generatePoseSheet = useCallback(
    async (section: MvSectionPlan, shot: MvShot) => {
      if (!song) return;
      setGenError(null);
      setGenPoseId(shot.id);
      try {
        const assign = shot.choreo?.find((a) => a.performer || a.move);
        const who = assign?.performer || cast[0]?.name || "the lead performer";
        const moves = (shot.choreo ?? []).map((a) => a.move).filter(Boolean);
        const moveLine = moves.length ? moves.join("; ") : shot.idea;
        const prompt = [
          `Character dance pose / model sheet for ${who}.`,
          `Poses / moves: ${moveLine}.`,
          `Dynamic dance positions for the ${section.label} (${section.kind}).`,
          "Show front, side, and 3/4 views of each pose, full body, clearly labeled panels, neutral studio background, consistent character across all panels, professional concept art.",
        ].join(" ");
        const refSrcs: string[] = [...(shot.refImages ?? [])];
        const ch = assign?.characterId ? characters.find((c) => c.id === assign.characterId) : null;
        if (ch?.portraitUrl) refSrcs.unshift(ch.portraitUrl);
        const refs = await collectRefs(refSrcs);
        const model = findModel(shot.imageProvider ?? modelId);
        const url = await api.generateImageFromSpec({
          capability: "image",
          prompt,
          aspect: "4:5",
          resolution: { width: 1024, height: 1280, label: "1024x1280" },
          references: refs.map((url) => ({ url, category: "pose", strength: 0.8 })),
          providerPref: model.providerKey as never,
          modelHint: model.apiModel ?? model.id,
          moduleId: "musicvideo",
          projectRef: { moduleId: "musicvideo", projectId: song.id, entityId: shot.id },
        });
        await importImageToLibrary("Pose sheet", `${who} — ${section.label} poses`, url);
        await qc.invalidateQueries({ queryKey: ["props"] });
      } catch (e) {
        setGenError(
          e instanceof Error
            ? e.message
            : typeof e === "string"
              ? e
              : "Pose sheet generation failed."
        );
      } finally {
        setGenPoseId(null);
      }
    },
    [song, cast, characters, modelId, qc]
  );

  if (!song) {
    return (
      <div className="flex h-full items-center justify-center p-10">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-elevated">
            <Music className="h-7 w-7 text-muted" />
          </div>
          <h2 className="text-base font-semibold">No song to direct yet</h2>
          <p className="mt-1 text-sm text-muted">
            Import and analyze a track in Song Studio first — Direct builds the video around its
            structure and energy.
          </p>
          <Button className="mt-4" onClick={openSong}>
            <Music className="h-4 w-4" />
            Go to Song Studio
          </Button>
        </div>
      </div>
    );
  }

  const imageModel = findModel(modelId);
  const videoModel = findVideoModel(videoModelId);
  const imageReady = isReady(imageModel.keyIds);
  const videoReady = isReady(videoModel.keyIds);
  const activeTemplate = getTemplate(activeTemplateId);

  // Flat, ordered shot list for cross-shot continuity analysis.
  const flatShots = useMemo(() => {
    const out: { section: MvSectionPlan; shot: MvShot }[] = [];
    treatment?.sections.forEach((s) => s.shots.forEach((sh) => out.push({ section: s, shot: sh })));
    return out;
  }, [treatment]);

  // Continuity intelligence: how this shot relates to the one before it.
  const continuityFor = (section: MvSectionPlan, shot: MvShot): ContinuityInfo => {
    const idx = flatShots.findIndex((x) => x.shot.id === shot.id);
    const prev = idx > 0 ? flatShots[idx - 1] : null;
    const prevMatches =
      !!prev &&
      !!(shot.movement || shot.lighting) &&
      prev.shot.movement === shot.movement &&
      prev.shot.lighting === shot.lighting &&
      (prev.shot.storyIntent || "") === (shot.storyIntent || "");
    // First appearance of a performer across the whole treatment.
    const here = (shot.choreo ?? []).map((a) => a.characterId || a.performer).filter(Boolean);
    let firstAppearance: string | undefined;
    for (const who of here) {
      const earlier = flatShots
        .slice(0, idx)
        .some((x) => (x.shot.choreo ?? []).some((a) => (a.characterId || a.performer) === who));
      if (!earlier) {
        firstAppearance = (shot.choreo ?? []).find(
          (a) => (a.characterId || a.performer) === who
        )?.performer;
        break;
      }
    }
    const energyRising = !!prev && section.energy > prev.section.energy + 0.05;
    return { prevMatches, firstAppearance, energyRising };
  };

  // Live assembled prompt for a shot — what generation will actually send
  // (Character DNA + section + choreography + camera + lighting + story intent).
  const buildPromptPreview = (section: MvSectionPlan, shot: MvShot): string => {
    if (!treatment) return "";
    return buildShotImagePrompt({
      shot,
      section,
      treatment,
      cast,
      characters,
      aspect,
      choreoHint: song ? choreoHintForTime(getChoreo(song.id), shot.start) : undefined,
      brief: briefForSection(song, section.sectionId),
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="grad-primary flex h-9 w-9 items-center justify-center rounded-lg">
            <Clapperboard className="h-4.5 w-4.5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-tight">Direct</h1>
            <p className="text-xs text-muted">
              Directing <span className="text-foreground">{song.name}</span> · {song.bpm} BPM ·{" "}
              {song.sections.length} sections
            </p>
          </div>
          <button
            onClick={openTemplates}
            className="ml-1 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors hover:bg-elevated"
            style={
              activeTemplate
                ? { backgroundColor: `${activeTemplate.accent}1f`, color: activeTemplate.accent }
                : undefined
            }
            title="Choose a template blueprint"
          >
            <LayoutTemplate className="h-3.5 w-3.5" />
            {activeTemplate ? activeTemplate.name : "No template"}
          </button>
          {prodRefs.length > 0 && (
            <button
              onClick={() => {
                const next = !autoRefs;
                setAutoRefs(next);
                setAutoProductionRefs(next);
              }}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors",
                autoRefs ? "bg-success/15 text-success" : "text-muted hover:bg-elevated"
              )}
              title={
                autoRefs
                  ? `Production cast auto-applied to performance shots: ${prodRefs.map((r) => r.label).join(", ")}. Click to turn off.`
                  : "Production cast OFF — click to auto-apply the cast to performance shots."
              }
            >
              <Users className="h-3.5 w-3.5" />
              Cast {autoRefs ? "on" : "off"} · {prodRefs.length}
            </button>
          )}
          <button
            onClick={openHelp}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted transition-colors hover:bg-elevated hover:text-foreground"
            title="Help — Direct guide"
            aria-label="Help"
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {treatment && (
            <>
              <select
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                className="h-9 rounded-[var(--radius-input)] border border-border bg-surface px-2 text-xs text-foreground focus-visible:border-primary focus-visible:outline-none"
                aria-label="Image model"
                title="Image provider"
              >
                {GEN_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {isConfigured(m.keyIds) ? "✓ " : "• "}
                    {m.label}
                  </option>
                ))}
              </select>
              <select
                value={aspect}
                onChange={(e) => setAspect(e.target.value)}
                className="h-9 rounded-[var(--radius-input)] border border-border bg-surface px-2 text-xs text-foreground focus-visible:border-primary focus-visible:outline-none"
                aria-label="Aspect ratio"
                title="Frame aspect ratio"
              >
                {MV_ASPECTS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
              {/* Display tier follows the platform-wide Director / Studio /
                  Creator switch in the Sidebar (StudioMode, decision D1). */}
              {advanced && (
                <button
                  type="button"
                  onClick={() => setShowClipSettings((v) => !v)}
                  className={cn(
                    "inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-input)] border px-2 text-xs font-medium transition-colors",
                    showClipSettings
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : "border-border bg-surface text-muted hover:text-foreground"
                  )}
                  title="Clip size, seed, variations, video model, motion, fps, duration, resolution, audio"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Clip settings
                </button>
              )}
              {advanced && showClipSettings && (
                <>
                  <select
                    value={sizeId}
                    onChange={(e) => setSizeId(e.target.value)}
                    className="h-9 rounded-[var(--radius-input)] border border-border bg-surface px-2 text-xs text-foreground focus-visible:border-primary focus-visible:outline-none"
                    aria-label="Image quality"
                    title="Frame resolution / quality"
                  >
                    {SIZE_OPTS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {SIZE_LABEL[s.id] ?? s.label}
                      </option>
                    ))}
                  </select>
                  <input
                    value={seed}
                    onChange={(e) => setSeed(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="Seed"
                    inputMode="numeric"
                    className="h-9 w-20 rounded-[var(--radius-input)] border border-border bg-surface px-2 text-xs text-foreground focus-visible:border-primary focus-visible:outline-none"
                    aria-label="Seed"
                    title="Seed (fal / Stability) — repeat for consistent results"
                  />
                  <select
                    value={variations}
                    onChange={(e) => setVariations(Number(e.target.value))}
                    className="h-9 rounded-[var(--radius-input)] border border-border bg-surface px-2 text-xs text-foreground focus-visible:border-primary focus-visible:outline-none"
                    aria-label="Variations"
                    title="Frame variations to generate per shot"
                  >
                    {[1, 2, 3, 4].map((n) => (
                      <option key={n} value={n}>
                        {n}×
                      </option>
                    ))}
                  </select>
                  <select
                    value={videoModelId}
                    onChange={(e) => setVideoModelId(e.target.value)}
                    className="h-9 rounded-[var(--radius-input)] border border-border bg-surface px-2 text-xs text-foreground focus-visible:border-primary focus-visible:outline-none"
                    aria-label="Video model"
                    title="Video provider for per-shot clips"
                  >
                    {VIDEO_MODELS.map((m) => (
                      <option key={m.id} value={m.id}>
                        🎬 {isConfigured(m.keyIds) ? "✓ " : "• "}
                        {m.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={motion}
                    onChange={(e) => setMotion(e.target.value)}
                    className="h-9 rounded-[var(--radius-input)] border border-border bg-surface px-2 text-xs text-foreground focus-visible:border-primary focus-visible:outline-none"
                    aria-label="Motion intensity"
                    title="Clip camera-motion intensity"
                  >
                    {["low", "medium", "high"].map((m) => (
                      <option key={m} value={m}>
                        Motion: {m}
                      </option>
                    ))}
                  </select>
                  <select
                    value={fps}
                    onChange={(e) => setFps(Number(e.target.value))}
                    className="h-9 rounded-[var(--radius-input)] border border-border bg-surface px-2 text-xs text-foreground focus-visible:border-primary focus-visible:outline-none"
                    aria-label="Frame rate"
                    title="Clip target frame rate"
                  >
                    {[24, 30].map((f) => (
                      <option key={f} value={f}>
                        {f} fps
                      </option>
                    ))}
                  </select>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="h-9 rounded-[var(--radius-input)] border border-border bg-surface px-2 text-xs text-foreground focus-visible:border-primary focus-visible:outline-none"
                    aria-label="Clip duration"
                    title="Clip length in seconds (model-dependent; Seedance up to 15s)"
                  >
                    {[4, 5, 6, 8, 10, 12, 15].map((d) => (
                      <option key={d} value={d}>
                        {d}s
                      </option>
                    ))}
                  </select>
                  <select
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    className="h-9 rounded-[var(--radius-input)] border border-border bg-surface px-2 text-xs text-foreground focus-visible:border-primary focus-visible:outline-none"
                    aria-label="Clip resolution"
                    title="Output resolution (model-dependent)"
                  >
                    {["480p", "720p", "1080p"].map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <div
                    className="flex items-center gap-1 rounded-[var(--radius-input)] border border-border bg-surface px-2"
                    title="Which audio the model should generate (where supported)"
                  >
                    <span className="text-[10px] text-muted">Audio:</span>
                    {[
                      { k: "dlg", label: "Dialogue", on: audioDialogue, set: setAudioDialogue },
                      { k: "sfx", label: "SFX", on: audioSfx, set: setAudioSfx },
                      { k: "mus", label: "Music", on: audioMusic, set: setAudioMusic },
                    ].map((a) => (
                      <button
                        key={a.k}
                        type="button"
                        onClick={() => a.set(!a.on)}
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors",
                          a.on
                            ? "bg-primary/85 text-white"
                            : "bg-elevated/60 text-muted hover:text-foreground"
                        )}
                        aria-pressed={a.on}
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
              <Button
                variant="accent"
                onClick={generateAll}
                disabled={batch !== null || !imageReady}
                title={
                  imageReady ? undefined : `No key for ${imageModel.label} — add one in API Keys`
                }
              >
                {batch ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {batch ? `Generating ${batch.done}/${batch.total}` : "Generate all frames"}
              </Button>
            </>
          )}
          <Button variant="primary" onClick={direct} disabled={batch !== null}>
            {treatment ? <RefreshCw className="h-4 w-4" /> : <Wand2 className="h-4 w-4" />}
            {treatment ? "Re-direct" : "Direct this video"}
          </Button>
        </div>
      </header>

      {treatment && (!imageReady || !videoReady) && (
        <div className="flex items-center gap-2 border-b border-warning/30 bg-warning/10 px-6 py-2 text-xs text-warning">
          <span>
            {!imageReady && `No image key for ${imageModel.label}. `}
            {!videoReady && `No video key for ${videoModel.label}. `}
            Generation is disabled until a key is added.
          </span>
          <button
            onClick={openApiKeys}
            className="ml-auto font-semibold underline hover:no-underline"
          >
            Open API Keys
          </button>
        </div>
      )}

      {genError && (
        <div className="border-b border-danger/30 bg-danger/10 px-6 py-2 text-xs text-danger">
          {genError}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {!treatment ? (
          <div className="flex h-full items-center justify-center p-10">
            <button
              onClick={direct}
              className="flex max-w-md flex-col items-center gap-4 rounded-[var(--radius-card)] border border-dashed border-border bg-surface/60 px-10 py-14 text-center transition-colors hover:border-primary/50 hover:bg-elevated/40"
            >
              <div className="grad-primary flex h-14 w-14 items-center justify-center rounded-2xl">
                <Clapperboard className="h-7 w-7 text-white" />
              </div>
              <div>
                <div className="text-base font-semibold">Direct “{song.name}”</div>
                <p className="mt-1 text-sm text-muted">
                  The Director Brain lays a section-aware shot list onto the song — fast performance
                  cuts in the choruses, narrative in the verses, texture in the intro and bridge.
                  Beat-synced. Fully editable.
                </p>
              </div>
              <span className="text-xs font-medium text-primary">Generate the treatment</span>
            </button>
          </div>
        ) : viewMode === "simple" ? (
          <SimpleTreatmentView
            treatment={treatment}
            onGenerate={generateOne}
            onGenerateClip={generateClip}
            onEdit={(section, shot) => setTune({ section, shot })}
            genShotId={genShotId}
            genClipId={genClipId}
            isImageReady={(id) => isReady(findModel(id).keyIds)}
            defaultImageModelId={modelId}
            bpm={song?.bpm ?? 0}
          />
        ) : (
          <TreatmentView
            treatment={treatment}
            onChange={patch}
            onGenerate={generateOne}
            onGenerateClip={generateClip}
            onGeneratePoseSheet={generatePoseSheet}
            onTune={(section, shot) => setTune({ section, shot })}
            genShotId={genShotId}
            genClipId={genClipId}
            genPoseId={genPoseId}
            isImageReady={(id) => isReady(findModel(id).keyIds)}
            defaultImageModelId={modelId}
            isVideoReady={(id) => isReady(findVideoModel(id).keyIds)}
            defaultVideoModelId={videoModelId}
            performers={performers}
            choreoMoves={choreoMoves}
            poseSheets={poseSheets}
            buildPrompt={buildPromptPreview}
            continuityFor={continuityFor}
            bpm={song?.bpm ?? 0}
            startExpanded={viewMode === "expert"}
          />
        )}
      </div>

      {/* Per-shot fine-tune — the full shot interface: preview, versions,
          frame prompt/model, and clip/video model, all in one roomy modal
          instead of a cramped popup. */}
      {tune &&
        treatment &&
        (() => {
          // Re-read the shot from live treatment state so the preview/version
          // strip never goes stale after a generation inside this same modal.
          const liveSection =
            treatment.sections.find((s) => s.sectionId === tune.section.sectionId) ?? tune.section;
          const liveShot = liveSection.shots.find((sh) => sh.id === tune.shot.id) ?? tune.shot;
          return (
            <div
              className="fixed inset-0 z-[70] flex items-center justify-center bg-background/80 p-6 backdrop-blur"
              onClick={() => setTune(null)}
            >
              <div
                className="flex max-h-[88vh] w-full max-w-4xl overflow-hidden rounded-[var(--radius-modal)] border border-border bg-surface shadow-card"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Left — live preview, version compare, clip controls */}
                <div className="flex w-72 shrink-0 flex-col gap-3 overflow-y-auto border-r border-border bg-elevated/20 p-4">
                  <div className="aspect-video w-full overflow-hidden rounded-lg border border-border bg-black">
                    {liveShot.videoUrl ? (
                      <AssetVideo
                        src={liveShot.videoUrl}
                        controls
                        className="h-full w-full object-cover"
                        label="Clip"
                      />
                    ) : liveShot.imageUrl ? (
                      <AssetImage
                        src={liveShot.imageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                        label="Frame"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted">
                        <ImageIcon className="h-6 w-6" />
                      </div>
                    )}
                  </div>

                  {(liveShot.imageCandidates?.length ?? 0) > 1 && (
                    <div>
                      <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted">
                        Versions
                      </p>
                      <div className="grid grid-cols-3 gap-1.5">
                        {liveShot.imageCandidates!.map((c, i) => (
                          <button
                            key={i}
                            onClick={() =>
                              setShotImage(
                                liveSection.sectionId,
                                liveShot.id,
                                c,
                                liveShot.imageCandidates
                              )
                            }
                            className={cn(
                              "aspect-square overflow-hidden rounded border",
                              c === liveShot.imageUrl
                                ? "border-primary ring-1 ring-primary"
                                : "border-border"
                            )}
                            title={`Use version ${i + 1}`}
                          >
                            <AssetImage
                              src={c}
                              alt={`Version ${i + 1}`}
                              className="h-full w-full object-cover"
                              label="Version"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 border-t border-border pt-3">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
                      Video / clip
                    </p>
                    <select
                      value={liveShot.videoProvider ?? ""}
                      onChange={(e) =>
                        patchShot(liveSection.sectionId, liveShot.id, {
                          videoProvider: e.target.value || undefined,
                        })
                      }
                      className="h-8 w-full rounded-[var(--radius-input)] border border-border bg-surface px-2 text-xs text-foreground focus-visible:border-primary focus-visible:outline-none"
                      aria-label="Clip model"
                      title="Override the video provider for this shot"
                    >
                      <option value="">Clip model: inherit</option>
                      {VIDEO_MODELS.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      disabled={genClipId === liveShot.id || !liveShot.imageUrl}
                      onClick={() => generateClip(liveSection, liveShot)}
                      title={
                        liveShot.imageUrl
                          ? undefined
                          : "Generate a frame first — clips are driven from the shot's frame"
                      }
                    >
                      {genClipId === liveShot.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Video className="h-3.5 w-3.5" />
                      )}
                      {liveShot.videoUrl ? "Regenerate clip" : "Generate clip"}
                    </Button>
                  </div>
                </div>

                {/* Right — frame prompt/model, full GenerationPanel power */}
                <div className="min-w-0 flex-1 overflow-y-auto p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <h2 className="text-sm font-semibold">Tune shot — {liveSection.label}</h2>
                    <button onClick={() => setTune(null)} aria-label="Close tune">
                      <X className="h-4 w-4 text-muted hover:text-foreground" />
                    </button>
                  </div>
                  <GenerationPanel
                    title="Tune frame"
                    initialPrompt={buildShotImagePrompt({
                      shot: liveShot,
                      section: liveSection,
                      treatment,
                      cast,
                      characters,
                      aspect,
                      choreoHint: song
                        ? choreoHintForTime(getChoreo(song.id), liveShot.start)
                        : undefined,
                      brief: briefForSection(song, liveSection.sectionId),
                    })}
                    defaultAspect="16:9"
                    references={mergeProductionRefs(liveShot, liveSection)}
                    onGenerate={async (opts: GenerateOpts) => {
                      // opts.references = shot/production refs + any pulled from the library.
                      const refs = await collectRefs(
                        opts.references.length
                          ? opts.references
                          : mergeProductionRefs(liveShot, liveSection)
                      );
                      const urls: string[] = [];
                      for (let i = 0; i < opts.variations; i++) {
                        const s = opts.seed !== undefined ? opts.seed + i : undefined;
                        urls.push(
                          await api.generateImageFromSpec({
                            ...opts.spec,
                            seed: s,
                            batch: 1,
                            references: refs.map((url) => ({
                              url,
                              category: "scene",
                              strength: 0.75,
                            })),
                            providerPref: opts.provider as never,
                            modelHint: opts.apiModel ?? opts.modelId,
                            moduleId: "musicvideo",
                            projectRef: {
                              moduleId: "musicvideo",
                              projectId: song?.id,
                              entityId: liveShot.id,
                            },
                          })
                        );
                      }
                      return urls;
                    }}
                    onPick={(url) => setShotImage(liveSection.sectionId, liveShot.id, url)}
                    pickLabel="Use as frame"
                  />
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
}
