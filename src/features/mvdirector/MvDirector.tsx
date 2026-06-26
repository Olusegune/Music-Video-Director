import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  Sliders,
  SlidersHorizontal,
} from "lucide-react";
import {
  directSong,
  getTreatment,
  saveTreatment,
  approachColor,
  type MvTreatment,
  type MvSectionPlan,
  type MvShot,
} from "@/lib/mvDirector";
import { loadSongs, sectionColor, formatTime, type SongMap } from "@/lib/songBrain";
import { loadCast, productionReferenceImages } from "@/lib/cast";
import { getAutoProductionRefs, setAutoProductionRefs } from "@/lib/settings";
import { buildShotImagePrompt, buildShotVideoPrompt, choreoHintForTime } from "@/lib/mvGen";
import { getChoreo } from "@/lib/choreography";
import { detectSectionPerformer } from "@/lib/performerDetect";
import { IMAGE_MODELS, findModel, resolveSize, SIZE_PRESETS } from "@/lib/imageGen";
import { VIDEO_MODELS, findVideoModel } from "@/lib/videoGen";
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

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(blob);
  });
}

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

/** Resolve ref-image srcs to raw base64 (no data: prefix) for the provider.
 *  Each ref is time-boxed and failures are skipped, so generation never hangs. */
async function collectRefs(srcs?: string[]): Promise<string[]> {
  if (!srcs?.length) return [];
  const out: string[] = [];
  for (const s of srcs) {
    try {
      const resolved = await resolveAssetSrc(s);
      let dataUrl = resolved;
      if (!resolved.startsWith("data:")) {
        const resp = await fetchWithTimeout(resolved);
        dataUrl = await blobToDataUrl(await resp.blob());
      }
      const b64 = dataUrl.split(",")[1];
      if (b64) out.push(b64);
    } catch {
      /* skip an unreadable/slow ref */
    }
  }
  return out;
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
  // Advanced generation controls (progressive disclosure).
  const [advanced, setAdvanced] = useState(false);
  const [seed, setSeed] = useState("");
  const [variations, setVariations] = useState(1);
  const [fps, setFps] = useState(24);
  const [motion, setMotion] = useState("medium");
  // Per-shot fine-tune via the unified GenerationPanel.
  const [tune, setTune] = useState<{ section: MvSectionPlan; shot: MvShot } | null>(null);

  // Production memory: the cast's linked Character portraits, auto-applied to
  // performance shots so the director never re-selects them.
  const prodRefs = useMemo(
    () => productionReferenceImages(cast, characters),
    [cast, characters]
  );

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
  const [batch, setBatch] = useState<{ done: number; total: number } | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

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
      const prompt = buildShotImagePrompt({
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
          await api.generateImagePro(model.providerKey, prompt, width, height, refs, s)
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
        setGenError(e instanceof Error ? e.message : "Generation failed.");
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
        setGenError(e instanceof Error ? e.message : "Generation failed.");
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

  const generateClip = useCallback(
    async (section: MvSectionPlan, shot: MvShot) => {
      if (!song || !treatment) return;
      setGenError(null);
      setGenClipId(shot.id);
      try {
        const motionLine = `Camera motion: ${motion} intensity. Target ${fps} fps.`;
        const prompt = `${buildShotVideoPrompt({
          shot,
          section,
          treatment,
          cast,
          characters,
          aspect,
          choreoHint: choreoHintForTime(getChoreo(song.id), shot.start),
          brief: briefForSection(song, section.sectionId),
        })} ${motionLine}`;
        // Image-to-video: drive the clip from the shot's own frame first, then
        // its references + the production cast — so the clip matches the board.
        const refSrcs = [shot.imageUrl, ...mergeProductionRefs(shot, section)].filter(
          (s): s is string => !!s
        );
        const refs = await collectRefs(refSrcs);
        const url = await api.generateMvShotVideo(
          song.id,
          shot.id,
          prompt,
          findVideoModel(shot.videoProvider ?? videoModelId).providerKey,
          refs
        );
        setShotVideo(section.sectionId, shot.id, url);
      } catch (e) {
        setGenError(e instanceof Error ? e.message : "Clip generation failed.");
      } finally {
        setGenClipId(null);
      }
    },
    [song, treatment, cast, characters, aspect, videoModelId, motion, fps, mergeProductionRefs, setShotVideo]
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
              <button
                onClick={() => setAdvanced((v) => !v)}
                className={cn(
                  "inline-flex h-9 items-center gap-1 rounded-[var(--radius-input)] border px-2.5 text-xs font-medium transition-colors",
                  advanced
                    ? "border-primary/40 bg-primary/12 text-primary"
                    : "border-border text-muted hover:bg-elevated"
                )}
                title="Toggle advanced generation controls"
              >
                <Sliders className="h-3.5 w-3.5" />
                {advanced ? "Advanced" : "Simple"}
              </button>
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
          {genError} — add a key in API Keys, or this runs as a local placeholder
          in the browser.
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
        ) : (
          <TreatmentView
            treatment={treatment}
            onChange={patch}
            onGenerate={generateOne}
            onGenerateClip={generateClip}
            onTune={(section, shot) => setTune({ section, shot })}
            genShotId={genShotId}
            genClipId={genClipId}
            isImageReady={(id) => isReady(findModel(id).keyIds)}
            defaultImageModelId={modelId}
            isVideoReady={(id) => isReady(findVideoModel(id).keyIds)}
            defaultVideoModelId={videoModelId}
          />
        )}
      </div>

      {/* Per-shot fine-tune via the unified generation panel */}
      {tune && treatment && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-background/80 p-6 backdrop-blur"
          onClick={() => setTune(null)}
        >
          <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold">
                Tune frame — {tune.section.label}
              </h2>
              <button onClick={() => setTune(null)} aria-label="Close tune">
                <X className="h-4 w-4 text-muted hover:text-foreground" />
              </button>
            </div>
            <GenerationPanel
              title="Tune frame"
              initialPrompt={buildShotImagePrompt({
                shot: tune.shot,
                section: tune.section,
                treatment,
                cast,
                characters,
                aspect,
                choreoHint: song
                  ? choreoHintForTime(getChoreo(song.id), tune.shot.start)
                  : undefined,
                brief: briefForSection(song, tune.section.sectionId),
              })}
              defaultAspect="16:9"
              references={mergeProductionRefs(tune.shot, tune.section)}
              onGenerate={async (opts: GenerateOpts) => {
                // opts.references = shot/production refs + any pulled from the library.
                const refs = await collectRefs(
                  opts.references.length
                    ? opts.references
                    : mergeProductionRefs(tune.shot, tune.section)
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
                      s
                    )
                  );
                }
                return urls;
              }}
              onPick={(url) =>
                setShotImage(tune.section.sectionId, tune.shot.id, url)
              }
              pickLabel="Use as frame"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function TreatmentView({
  treatment,
  onChange,
  onGenerate,
  onGenerateClip,
  onTune,
  genShotId,
  genClipId,
  isImageReady,
  defaultImageModelId,
  isVideoReady,
  defaultVideoModelId,
}: {
  treatment: MvTreatment;
  onChange: (t: MvTreatment) => void;
  onGenerate: (section: MvSectionPlan, shot: MvShot) => void;
  onGenerateClip: (section: MvSectionPlan, shot: MvShot) => void;
  onTune: (section: MvSectionPlan, shot: MvShot) => void;
  genShotId: string | null;
  genClipId: string | null;
  isImageReady: (modelId: string) => boolean;
  defaultImageModelId: string;
  isVideoReady: (modelId: string) => boolean;
  defaultVideoModelId: string;
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
          onTune={onTune}
          genShotId={genShotId}
          genClipId={genClipId}
          isImageReady={isImageReady}
          defaultImageModelId={defaultImageModelId}
          isVideoReady={isVideoReady}
          defaultVideoModelId={defaultVideoModelId}
        />
      ))}
    </div>
  );
}

function SectionCard({
  section,
  onChange,
  onGenerate,
  onGenerateClip,
  onTune,
  genShotId,
  genClipId,
  isImageReady,
  defaultImageModelId,
  isVideoReady,
  defaultVideoModelId,
}: {
  section: MvSectionPlan;
  onChange: (next: MvSectionPlan) => void;
  onGenerate: (section: MvSectionPlan, shot: MvShot) => void;
  onGenerateClip: (section: MvSectionPlan, shot: MvShot) => void;
  onTune: (section: MvSectionPlan, shot: MvShot) => void;
  genShotId: string | null;
  genClipId: string | null;
  isImageReady: (modelId: string) => boolean;
  defaultImageModelId: string;
  isVideoReady: (modelId: string) => boolean;
  defaultVideoModelId: string;
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
              isImageReady={isImageReady}
              defaultImageModelId={defaultImageModelId}
              isVideoReady={isVideoReady}
              defaultVideoModelId={defaultVideoModelId}
              onGenerate={() => onGenerate(section, shot)}
              onGenerateClip={() => onGenerateClip(section, shot)}
              onTune={() => onTune(section, shot)}
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

function ShotRow({
  shot,
  index,
  accent,
  generating,
  clipGenerating,
  isImageReady,
  defaultImageModelId,
  isVideoReady,
  defaultVideoModelId,
  onGenerate,
  onGenerateClip,
  onTune,
  onChange,
}: {
  shot: MvShot;
  index: number;
  accent: string;
  generating: boolean;
  clipGenerating: boolean;
  isImageReady: (modelId: string) => boolean;
  defaultImageModelId: string;
  isVideoReady: (modelId: string) => boolean;
  defaultVideoModelId: string;
  onGenerate: () => void;
  onGenerateClip: () => void;
  onTune: () => void;
  onChange: (next: MvShot) => void;
}) {
  const effectiveImageModel = shot.imageProvider ?? defaultImageModelId;
  const imageReady = isImageReady(effectiveImageModel);
  const effectiveVideoModel = shot.videoProvider ?? defaultVideoModelId;
  const videoReady = isVideoReady(effectiveVideoModel);
  const [preview, setPreview] = useState<null | "image" | "video">(null);
  const [assetPicker, setAssetPicker] = useState(false);
  const refs = shot.refImages ?? [];

  const removeRef = (i: number) =>
    onChange({ ...shot, refImages: refs.filter((_, idx) => idx !== i) });

  return (
    <div className="flex gap-3 rounded-[var(--radius-button)] border border-border bg-surface p-3">
      <div className="flex flex-col items-center gap-1 pt-0.5">
        <span
          className="flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-semibold text-white"
          style={{ backgroundColor: accent }}
        >
          {index + 1}
        </span>
        <span className="text-[10px] tabular-nums text-muted">
          {formatTime(shot.start)}
        </span>
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        {shot.lyric && (
          <div className="flex items-start gap-1.5 text-xs text-accent">
            <Quote className="mt-0.5 h-3 w-3 shrink-0" />
            <span className="italic">{shot.lyric}</span>
          </div>
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
          className="font-medium"
          ariaLabel={`Shot ${index + 1} idea`}
          placeholder="Describe the shot… type @ to reference a character, set, or prop"
        />
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted">
          <MetaEdit label="Shot" value={shot.shotType} onChange={(v) => onChange({ ...shot, shotType: v })} />
          <MetaEdit label="Move" value={shot.movement} onChange={(v) => onChange({ ...shot, movement: v })} />
          <MetaEdit label="Light" value={shot.lighting} onChange={(v) => onChange({ ...shot, lighting: v })} />
          <MetaEdit label="Cut" value={shot.transition} onChange={(v) => onChange({ ...shot, transition: v })} />
        </div>
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

      {/* Frame thumbnail / generate */}
      <div className="w-52 shrink-0">
        <div
          className="group relative aspect-video overflow-hidden rounded-md border border-border bg-elevated/50"
          style={{ borderColor: `${accent}40` }}
        >
          {shot.imageUrl ? (
            <button
              type="button"
              className="h-full w-full cursor-zoom-in"
              onClick={() => setPreview("image")}
              title="Click to view full size"
            >
              <AssetImage
                src={shot.imageUrl}
                alt={`Shot ${index + 1} frame`}
                className="h-full w-full object-cover"
              />
            </button>
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ImageIcon className="h-5 w-5 text-muted/50" />
            </div>
          )}
          {generating && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/70">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          )}
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
              title="Add character / environment / prop references"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="text-[8px] font-medium">Assets</span>
            </button>
          </div>
          {refs.length > 0 && (
            <p className="mt-1 text-[9px] text-muted">
              {refs.length} reference{refs.length === 1 ? "" : "s"} guide this shot
            </p>
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
