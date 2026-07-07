import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Clapperboard,
  Wand2,
  RefreshCw,
  Music,
  Film,
  MapPin,
  Shirt,
  Scissors,
  Quote,
  ImageIcon,
  Loader2,
  Sparkles,
  Video,
  LayoutTemplate,
  Users,
  Download,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Plus,
  X,
  Check,
  Upload,
  SlidersHorizontal,
  LayoutGrid,
  HelpCircle,
} from "lucide-react";
import {
  directSong,
  getTreatment,
  saveTreatment,
  approachColor,
  type MvTreatment,
  type MvSectionPlan,
  type MvShot,
  type ChoreoAssignment,
} from "@/lib/mvDirector";
import { loadSongs, sectionColor, formatTime, type SongMap } from "@/lib/songBrain";
import { loadCast, productionReferenceImages } from "@/lib/cast";
import { getAutoProductionRefs, setAutoProductionRefs } from "@/lib/settings";
import { buildShotImagePrompt, buildShotVideoPrompt, choreoHintForTime } from "@/lib/mvGen";
import { getChoreo } from "@/lib/choreography";
import { importImageToLibrary } from "@/lib/assets";
import { detectSectionPerformer } from "@/lib/performerDetect";
import { IMAGE_MODELS, findModel, resolveSize, SIZE_PRESETS } from "@/lib/imageGen";
import { VIDEO_MODELS, findVideoModel, videoCaps } from "@/lib/videoGen";
import { useProviderReadiness } from "@/lib/providerReady";
import { getTemplate } from "@/lib/templates";
import { api } from "@/lib/ipc";
import { useAppStore } from "@/store/useAppStore";
import { GenerationPanel, type GenerateOpts } from "@/components/generation/GenerationPanel";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AssetImage, AssetVideo, resolveAssetSrc } from "@/components/ui/asset-image";
import { AssetPicker } from "@/features/assets/AssetPicker";
import { MentionTextarea } from "@/components/ui/mention-textarea";
import { collectRefs } from "@/lib/refs";

/** Pull a song section's authored brief (lead, camera, mood, …) for prompting. */
function briefForSection(song: SongMap | null, sectionId: string) {
  const s = song?.sections.find((x) => x.id === sectionId);
  if (!s) return undefined;
  const { lead, backup, mood, cameraNote, choreoNote, storyNote, visualStyle } = s;
  // Use the assigned performer, or the confident auto-detection.
  const det = detectSectionPerformer(s);
  const performerRole = s.performerRole || (det.confident ? det.role : undefined);
  if (
    !(lead || backup || mood || cameraNote || choreoNote || storyNote || visualStyle || performerRole)
  )
    return undefined;
  return { lead, backup, mood, cameraNote, choreoNote, storyNote, visualStyle, performerRole };
}

/** Image models that have a direct API (exclude manual/copy-prompt ones). */
const GEN_MODELS = IMAGE_MODELS.filter((m) => !m.manual);
const MV_ASPECTS = ["16:9", "9:16", "2.39:1", "4:5", "1:1"];
/** Quality presets (long-edge) the user picks per render. */
const SIZE_OPTS = SIZE_PRESETS.filter((s) => s.long);
const SIZE_LABEL: Record<string, string> = {
  small: "Draft · 768px",
  medium: "Standard · 1024px",
  large: "High · 1536px",
  hd: "Max · 2048px",
};

/** Fetch with a hard timeout so a slow/unreachable ref never stalls generation. */
async function fetchWithTimeout(url: string, ms = 15000): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Download a displayable asset src to disk (works for http, data:, Tauri path). */
async function downloadAsset(src: string, filename: string) {
  const resolved = await resolveAssetSrc(src);
  let href = resolved;
  if (!resolved.startsWith("data:") && !resolved.startsWith("blob:")) {
    try {
      const blob = await (await fetchWithTimeout(resolved)).blob();
      href = URL.createObjectURL(blob);
    } catch {
      href = resolved;
    }
  }
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.click();
  if (href.startsWith("blob:")) setTimeout(() => URL.revokeObjectURL(href), 1000);
}

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
  const viewMode = studioMode === "director" ? "simple" : studioMode === "studio" ? "director" : "expert";
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
  // Per-shot fine-tune via the unified GenerationPanel.
  const [tune, setTune] = useState<{ section: MvSectionPlan; shot: MvShot } | null>(null);

  // Production memory: the cast's linked Character portraits, auto-applied to
  // performance shots so the director never re-selects them.
  const prodRefs = useMemo(
    () => productionReferenceImages(cast, characters),
    [cast, characters]
  );

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
      const auto =
        autoRefs && section.approach !== "Abstract"
          ? prodRefs.map((r) => r.src)
          : [];
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
          await api.generateImagePro(model.providerKey, prompt, width, height, refs, s, model.apiModel)
        );
      }
      setShotImage(section.sectionId, shot.id, urls[0], urls.length > 1 ? urls : undefined);
    },
    [song, treatment, cast, characters, aspect, sizeId, modelId, seed, variations, mergeProductionRefs, setShotImage]
  );

  const generateOne = useCallback(
    async (section: MvSectionPlan, shot: MvShot) => {
      setGenError(null);
      setGenShotId(shot.id);
      try {
        await genFrame(section, shot);
      } catch (e) {
        setGenError(e instanceof Error ? e.message : typeof e === "string" ? e : "Generation failed.");
      } finally {
        setGenShotId(null);
      }
    },
    [genFrame]
  );

  const generateAll = useCallback(async () => {
    if (!treatment) return;
    const jobs = treatment.sections.flatMap((s) =>
      s.shots.map((sh) => ({ section: s, shot: sh }))
    );
    setGenError(null);
    setBatch({ done: 0, total: jobs.length });
    for (let i = 0; i < jobs.length; i++) {
      try {
        await genFrame(jobs[i].section, jobs[i].shot);
      } catch (e) {
        setGenError(e instanceof Error ? e.message : typeof e === "string" ? e : "Generation failed.");
      }
      setBatch({ done: i + 1, total: jobs.length });
    }
    setBatch(null);
  }, [treatment, genFrame]);

  const setShotVideo = useCallback(
    (sectionId: string, shotId: string, url: string) => {
      setTreatment((prev) => {
        if (!prev) return prev;
        const next: MvTreatment = {
          ...prev,
          sections: prev.sections.map((s) =>
            s.sectionId === sectionId
              ? {
                  ...s,
                  shots: s.shots.map((sh) =>
                    sh.id === shotId ? { ...sh, videoUrl: url } : sh
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
        const url = await api.generateMvShotVideo(
          song.id,
          shot.id,
          prompt,
          vModel.providerKey,
          refs,
          vModel.apiModel,
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
        setGenError(e instanceof Error ? e.message : typeof e === "string" ? e : "Clip generation failed.");
      } finally {
        setGenClipId(null);
      }
    },
    [song, treatment, cast, characters, aspect, videoModelId, motion, fps, duration, resolution, audioDialogue, audioSfx, audioMusic, mergeProductionRefs, setShotVideo]
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
        const url = await api.generateImagePro(
          model.providerKey,
          prompt,
          1024,
          1280,
          refs.length ? refs : undefined,
          undefined,
          model.apiModel
        );
        await importImageToLibrary("Pose sheet", `${who} — ${section.label} poses`, url);
        await qc.invalidateQueries({ queryKey: ["props"] });
      } catch (e) {
        setGenError(e instanceof Error ? e.message : typeof e === "string" ? e : "Pose sheet generation failed.");
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
            Import and analyze a track in Song Studio first — the MV Director
            builds the video around its structure and energy.
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
        firstAppearance = (shot.choreo ?? []).find((a) => (a.characterId || a.performer) === who)?.performer;
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
            <h1 className="text-lg font-semibold leading-tight">MV Director</h1>
            <p className="text-xs text-muted">
              Directing <span className="text-foreground">{song.name}</span> ·{" "}
              {song.bpm} BPM · {song.sections.length} sections
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
                autoRefs
                  ? "bg-success/15 text-success"
                  : "text-muted hover:bg-elevated"
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
            title="Help — MV Director guide"
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
                  imageReady
                    ? undefined
                    : `No key for ${imageModel.label} — add one in API Keys`
                }
              >
                {batch ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {batch
                  ? `Generating ${batch.done}/${batch.total}`
                  : "Generate all frames"}
              </Button>
            </>
          )}
          <Button variant="primary" onClick={direct} disabled={batch !== null}>
            {treatment ? (
              <RefreshCw className="h-4 w-4" />
            ) : (
              <Wand2 className="h-4 w-4" />
            )}
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
                <div className="text-base font-semibold">
                  Direct “{song.name}”
                </div>
                <p className="mt-1 text-sm text-muted">
                  The Director Brain lays a section-aware shot list onto the song —
                  fast performance cuts in the choruses, narrative in the verses,
                  texture in the intro and bridge. Beat-synced. Fully editable.
                </p>
              </div>
              <span className="text-xs font-medium text-primary">
                Generate the treatment
              </span>
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
      {tune && treatment && (() => {
        // Re-read the shot from live treatment state so the preview/version
        // strip never goes stale after a generation inside this same modal.
        const liveSection = treatment.sections.find((s) => s.sectionId === tune.section.sectionId) ?? tune.section;
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
                    <AssetVideo src={liveShot.videoUrl} controls className="h-full w-full object-cover" label="Clip" />
                  ) : liveShot.imageUrl ? (
                    <AssetImage src={liveShot.imageUrl} alt="" className="h-full w-full object-cover" label="Frame" />
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
                          onClick={() => setShotImage(liveSection.sectionId, liveShot.id, c, liveShot.imageCandidates)}
                          className={cn(
                            "aspect-square overflow-hidden rounded border",
                            c === liveShot.imageUrl ? "border-primary ring-1 ring-primary" : "border-border"
                          )}
                          title={`Use version ${i + 1}`}
                        >
                          <AssetImage src={c} alt={`Version ${i + 1}`} className="h-full w-full object-cover" label="Version" />
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
                      patchShot(liveSection.sectionId, liveShot.id, { videoProvider: e.target.value || undefined })
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
                    title={liveShot.imageUrl ? undefined : "Generate a frame first — clips are driven from the shot's frame"}
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
                  <h2 className="text-sm font-semibold">
                    Tune shot — {liveSection.label}
                  </h2>
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
                        await api.generateImagePro(
                          opts.provider,
                          opts.prompt,
                          opts.width,
                          opts.height,
                          refs,
                          s,
                          opts.apiModel
                        )
                      );
                    }
                    return urls;
                  }}
                  onPick={(url) =>
                    setShotImage(liveSection.sectionId, liveShot.id, url)
                  }
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

function TreatmentView({
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
              <p className="text-sm leading-relaxed text-muted">
                {treatment.energyArc}
              </p>
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

function SimpleTreatmentView({
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
        <Badge
          className="normal-case"
          style={{ backgroundColor: `${aColor}1f`, color: aColor }}
        >
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
interface PerformerOption {
  name: string;
  characterId?: string;
  role: string;
  /** Portrait src for a visual performer chip, when available. */
  image?: string;
}

/** How a shot relates to its neighbours, for continuity intelligence. */
interface ContinuityInfo {
  /** Same camera + lighting + intent as the previous shot. */
  prevMatches: boolean;
  /** A performer making their first appearance in the video, if any. */
  firstAppearance?: string;
  /** This section's energy is higher than the previous shot's. */
  energyRising: boolean;
}

/** Per-shot choreography + story-intent + editable final prompt. */
function ChoreoPanel({
  shot,
  performers,
  choreoMoves,
  poseSheets,
  assignments,
  onAdd,
  onUpdate,
  onRemove,
  onChange,
}: {
  shot: MvShot;
  performers: PerformerOption[];
  choreoMoves: string[];
  poseSheets: { label: string; src: string }[];
  assignments: ChoreoAssignment[];
  onAdd: () => void;
  onUpdate: (i: number, patch: Partial<ChoreoAssignment>) => void;
  onRemove: (i: number) => void;
  onChange: (next: MvShot) => void;
}) {
  const inputCls =
    "h-7 w-full rounded border border-border bg-surface px-1.5 text-[11px] focus-visible:border-primary focus-visible:outline-none";
  return (
    <div className="mt-1.5 space-y-2 rounded-md border border-border/60 bg-elevated/30 p-2">
      {/* Story intent */}
      <label className="block">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted/80">
          Story intent (emotional goal of camera + light)
        </span>
        <textarea
          value={shot.storyIntent ?? ""}
          onChange={(e) => onChange({ ...shot, storyIntent: e.target.value || undefined })}
          rows={2}
          className="mt-0.5 w-full rounded border border-border bg-surface px-1.5 py-1 text-[11px] focus-visible:border-primary focus-visible:outline-none"
          placeholder="e.g. Low-angle push-in makes Neo Dude feel heroic as he celebrates the wonder of creation"
        />
      </label>

      {/* Performer assignments */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted/80">
          Choreography assignments
        </span>
        <datalist id={`moves-${shot.id}`}>
          {choreoMoves.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
        <datalist id={`perf-${shot.id}`}>
          {performers.map((p, i) => (
            <option key={p.characterId ?? `${p.name}-${i}`} value={p.name} />
          ))}
        </datalist>
        {assignments.length === 0 && (
          <p className="text-[10px] text-muted/70">
            No moves assigned — the shot uses the section's auto choreography. Add one to
            assign a specific performer + move.
          </p>
        )}
        {assignments.map((a, i) => (
          <div key={i} className="rounded border border-border/60 bg-surface/50 p-1.5">
            {/* Visual performer picker — portrait chips */}
            {performers.length > 0 && (
              <div className="mb-1 flex gap-1.5 overflow-x-auto pb-1">
                {performers.map((p, pi) => {
                  const on = a.performer === p.name;
                  return (
                    <button
                      key={p.characterId ?? `${p.name}-${pi}`}
                      type="button"
                      onClick={() =>
                        onUpdate(i, {
                          performer: p.name,
                          characterId: p.characterId,
                          role: p.role === "Character" ? a.role : mapCastRole(p.role),
                        })
                      }
                      className={cn(
                        "flex shrink-0 items-center gap-1.5 rounded-full border py-0.5 pl-0.5 pr-2.5 transition-colors",
                        on
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border bg-surface text-muted hover:border-primary/40 hover:text-foreground"
                      )}
                      title={`${p.name} — ${p.role}`}
                    >
                      {p.image ? (
                        <AssetImage src={p.image} alt={p.name} className="h-7 w-7 rounded-full object-cover" />
                      ) : (
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-elevated text-[10px] font-semibold uppercase">
                          {p.name.slice(0, 2)}
                        </span>
                      )}
                      <span className="text-[12px] font-medium">{p.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
            <div className="grid grid-cols-2 gap-1">
              <input
                list={`perf-${shot.id}`}
                value={a.performer}
                onChange={(e) => {
                  const match = performers.find((p) => p.name === e.target.value);
                  onUpdate(i, { performer: e.target.value, characterId: match?.characterId });
                }}
                className={inputCls}
                placeholder="Performer (or pick above)"
              />
              <select
                value={a.role}
                onChange={(e) => onUpdate(i, { role: e.target.value })}
                className={inputCls}
              >
                {CHOREO_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            {/* Pose-sheet thumbnails — generated in Choreography (visual moves) */}
            {poseSheets.length > 0 && (
              <div className="mt-1 flex gap-1.5 overflow-x-auto pb-1">
                {poseSheets.map((ps, psi) => (
                  <button
                    key={psi}
                    type="button"
                    onClick={() => {
                      onUpdate(i, { move: ps.label });
                      const cur = shot.refImages ?? [];
                      if (!cur.includes(ps.src)) onChange({ ...shot, refImages: [...cur, ps.src] });
                    }}
                    className="flex w-16 shrink-0 flex-col items-center gap-0.5"
                    title={`Use pose: ${ps.label} (adds it as a reference image)`}
                  >
                    <AssetImage
                      src={ps.src}
                      alt={ps.label}
                      className={cn(
                        "h-16 w-16 rounded-md border-2 object-cover",
                        a.move === ps.label ? "border-primary" : "border-border"
                      )}
                    />
                    <span className="w-full truncate text-center text-[9px] text-muted">{ps.label}</span>
                  </button>
                ))}
              </div>
            )}
            {/* Visual move browser — from the song's choreography library */}
            {choreoMoves.length > 0 && (
              <div className="mt-1 flex max-h-24 flex-wrap gap-1 overflow-y-auto rounded border border-border/40 bg-elevated/20 p-1">
                {choreoMoves.map((m, mi) => (
                  <button
                    key={mi}
                    type="button"
                    onClick={() => onUpdate(i, { move: m })}
                    className={cn(
                      "rounded border px-1.5 py-1 text-left text-[11px] leading-tight transition-colors",
                      a.move === m
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border bg-surface text-muted hover:border-primary/40 hover:text-foreground"
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
            <input
              list={`moves-${shot.id}`}
              value={a.move}
              onChange={(e) => onUpdate(i, { move: e.target.value })}
              className={cn(inputCls, "mt-1")}
              placeholder={
                choreoMoves.length
                  ? "Move / pose (pick above or type)"
                  : "Move / pose — generate choreography to browse the library, or type here"
              }
            />
            <div className="mt-1 grid grid-cols-3 gap-1">
              <select
                value={a.energy ?? ""}
                onChange={(e) => onUpdate(i, { energy: e.target.value || undefined })}
                className={inputCls}
                title="Energy"
              >
                {CHOREO_ENERGY.map((en) => (
                  <option key={en} value={en}>
                    {en || "Energy…"}
                  </option>
                ))}
              </select>
              <input
                value={a.expression ?? ""}
                onChange={(e) => onUpdate(i, { expression: e.target.value || undefined })}
                className={inputCls}
                placeholder="Expression"
              />
              <input
                value={a.formation ?? ""}
                onChange={(e) => onUpdate(i, { formation: e.target.value || undefined })}
                className={inputCls}
                placeholder="Formation"
              />
            </div>
            <button
              onClick={() => onRemove(i)}
              className="mt-1 text-[10px] text-danger hover:underline"
            >
              Remove assignment
            </button>
          </div>
        ))}
        <button
          onClick={onAdd}
          className="flex items-center gap-1 rounded border border-dashed border-border px-2 py-1 text-[10px] font-medium text-muted hover:border-primary/50 hover:text-primary"
        >
          <Plus className="h-3 w-3" /> Add performer + move
        </button>
      </div>

    </div>
  );
}

/** Roles a choreography move can be assigned to within a shot. */
const CHOREO_ROLES = [
  "Lead Artist",
  "Featured Artist",
  "Backup Singer",
  "Dancer",
  "Dance Crew",
  "Choir",
  "Band Member",
  "Character",
];

/** Energy levels for a choreography assignment. */
const CHOREO_ENERGY = ["", "Low", "Medium", "Medium-high", "High", "Explosive"];

/** Map a cast PerformerRole to the nearest choreography-assignment role label. */
function mapCastRole(role: string): string {
  switch (role) {
    case "Lead Singer":
      return "Lead Artist";
    case "Backing Singer":
      return "Backup Singer";
    case "Featured Artist":
      return "Featured Artist";
    case "Dancer":
      return "Dancer";
    case "Band Member":
      return "Band Member";
    default:
      return CHOREO_ROLES.includes(role) ? role : "Lead Artist";
  }
}

/** Camera direction presets — label (chip) → prompt value (technical + intent). */
const CAMERA_PRESETS: { label: string; value: string }[] = [
  { label: "Push In", value: "Slow push-in to increase emotional intensity" },
  { label: "Orbit", value: "Orbit around the subject to create wonder" },
  { label: "Crane Up", value: "Crane up to reveal scale" },
  { label: "Wide", value: "Wide establishing shot" },
  { label: "Close Up", value: "Intimate close-up on the subject" },
  { label: "Low Angle", value: "Low-angle hero shot — make the performer feel heroic" },
  { label: "Handheld", value: "Handheld motion to create urgency" },
  { label: "Dolly Back", value: "Slow dolly back to show isolation" },
];

/** Lighting direction presets — label (chip) → prompt value (look + intent). */
const LIGHTING_PRESETS: { label: string; value: string }[] = [
  { label: "Gold Rim", value: "Gold rim light for triumph" },
  { label: "Blue Ambient", value: "Soft blue ambient light for reflection" },
  { label: "Sunset Glow", value: "Warm sunset glow for hope" },
  { label: "Top Light", value: "Harsh top light for tension" },
  { label: "Strobe", value: "Strobe lighting for high-energy dance" },
  { label: "Spotlights", value: "Stage spotlight pools" },
  { label: "Concert", value: "Concert lighting — haze and beams" },
  { label: "Heavenly", value: "Soft heavenly glow for awe and worship" },
];

/** First-class story-intent emotions, selectable as tags. */
const STORY_EMOTIONS = [
  "Wonder", "Triumph", "Mystery", "Discovery", "Joy",
  "Isolation", "Celebration", "Tension", "Hope", "Awe",
];

/** A selectable directing chip-card (camera / lighting preset). */
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
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

/** Beat range a shot spans, from the song tempo. */
function beatRangeLabel(start: number, end: number, bpm: number): string {
  if (!bpm) return "";
  const a = Math.floor((start * bpm) / 60) + 1;
  const b = Math.max(a, Math.ceil((end * bpm) / 60));
  return `Beat ${a}–${b}`;
}

/** Human energy band from a 0..1 section energy. */
function energyLabel(e: number): string {
  if (e >= 0.66) return "Peak";
  if (e >= 0.4) return "Build";
  return "Low";
}

/** A plain-English "Director's Intent" summary assembled from the shot's pieces. */
function directorSummary(shot: MvShot, approach: string): string {
  const emotions = shot.storyIntent?.trim();
  const cam = shot.movement?.toLowerCase();
  const light = shot.lighting?.toLowerCase();
  const perfLine = shot.choreo?.length
    ? shot.choreo
        .filter((a) => a.performer || a.move)
        .map((a) => `${a.performer || "a performer"}${a.move ? ` (${a.move})` : ""}`)
        .join("; ")
    : shot.performanceNote?.trim();
  const parts = [
    `This ${approach.toLowerCase()} shot ${emotions ? `leans into ${emotions.toLowerCase()}` : "carries the section's energy"}.`,
    cam ? `The camera ${cam}.` : "",
    light ? `Lighting: ${light}.` : "",
    perfLine ? `Performance: ${perfLine}.` : "No performer in frame — the world itself becomes the subject.",
  ];
  return parts.filter(Boolean).join(" ");
}

/** Local "Director Brain" — context-aware tips + one-click actions for a shot. */
function directorBrain(
  shot: MvShot,
  sectionKind: string,
  energy: number,
  approach: string
): { tips: string[]; actions: { label: string; patch: Partial<MvShot> }[] } {
  const tips: string[] = [];
  const actions: { label: string; patch: Partial<MvShot> }[] = [];
  const isChorus = /chorus|drop|hook/i.test(sectionKind);
  const isIntro = /intro|outro/i.test(sectionKind);

  if (!shot.storyIntent?.trim()) {
    const intent = isChorus ? "Triumph, Celebration" : isIntro ? "Wonder, Mystery" : "Discovery";
    tips.push(`No story intent yet — ${isChorus ? "choruses hit hardest with triumph/celebration" : isIntro ? "intros set wonder + mystery" : "give the shot a reason to exist"}.`);
    actions.push({ label: `Set intent: ${intent}`, patch: { storyIntent: intent } });
  }
  if (isChorus && approach !== "Abstract" && !shot.choreo?.length) {
    tips.push("Chorus = performance payoff. Assign your lead + a move in Choreography & Direction.");
  }
  // Camera suggestion by section.
  const camSuggest = isChorus
    ? CAMERA_PRESETS.find((c) => c.label === "Low Angle")!
    : isIntro
      ? CAMERA_PRESETS.find((c) => c.label === "Push In")!
      : CAMERA_PRESETS.find((c) => c.label === "Close Up")!;
  if (shot.movement !== camSuggest.value) {
    actions.push({ label: `Camera: ${camSuggest.label}`, patch: { movement: camSuggest.value } });
  }
  // Lighting suggestion by energy.
  const lightSuggest = energy >= 0.66
    ? LIGHTING_PRESETS.find((l) => l.label === "Concert")!
    : energy >= 0.4
      ? LIGHTING_PRESETS.find((l) => l.label === "Gold Rim")!
      : LIGHTING_PRESETS.find((l) => l.label === "Blue Ambient")!;
  if (shot.lighting !== lightSuggest.value) {
    actions.push({ label: `Lighting: ${lightSuggest.label}`, patch: { lighting: lightSuggest.value } });
  }
  return { tips, actions };
}

/** Compact a model label for an on-preview badge: drop the ★ and the trailing
 *  provider parenthetical, and truncate. "★ Seedance 2.0 (Fal · audio)" → "Seedance 2.0". */
function badgeLabel(label: string): string {
  const cleaned = label.replace(/^★\s*/, "").replace(/\s*\([^)]*\)\s*$/, "").trim();
  return cleaned.length > 22 ? `${cleaned.slice(0, 21)}…` : cleaned;
}

function ShotRow({
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
