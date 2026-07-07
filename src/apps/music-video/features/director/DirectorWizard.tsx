// The Director Wizard — Magic Mode, the guided first-run experience. (Contrast:
// "Director Mode" is the rest of the app — Character Bible, World Bible,
// Storyboards, Prompt Studio, Animation Lab, Provider System, Choreography,
// Timeline — reached by skipping this wizard, e.g. via "Import a song" on the
// Welcome screen.)
//
// It ALWAYS starts from an empty canvas: import a song → add lyrics → confirm
// performers → choose a video type → pick a visual style → generate. It never
// loads an existing project, template, or pre-populated production.

import { useMemo, useState } from "react";
import {
  Clapperboard,
  Music,
  Mic2,
  Users,
  Palette,
  Sparkles,
  Loader2,
  Check,
  X,
  ArrowRight,
  ArrowLeft,
  Upload,
  Camera,
  BookOpen,
  Footprints,
  Wand2,
  Layers,
  FileText,
  Heart,
  TrendingUp,
  PartyPopper,
  Sunrise,
  Swords,
  CloudMoon,
  PenLine,
  Ban,
  Plus,
  Wand2 as WandIcon,
  Trash2,
  HelpCircle,
} from "lucide-react";
import { useAppStore } from "@/platform/store/useAppStore";
import { api, isTauri } from "@/platform/lib/ipc";
import {
  analyzeAudioFile,
  saveSong,
  distributeLyrics,
  type SongMap,
} from "@/apps/music-video/lib/songBrain";
import { parseScript } from "@/platform/lib/scriptParser";
import {
  autoCastFromSong,
  savePerformer,
  newPerformer,
  PERFORMER_ROLES,
  VOCAL_ROLES,
  type Performer,
  type PerformerRole,
} from "@/apps/music-video/lib/cast";
import { ROLE_META } from "@/apps/music-video/lib/roleMeta";
import { CardPicker } from "@/platform/components/ui/card-picker";
import { GenerationPanel, type GenerateOpts } from "@/platform/components/generation/GenerationPanel";
import { newCharacter } from "@/platform/lib/characterDna";
import { allTemplates } from "@/platform/lib/templates";
import { VIDEO_TYPES, stylePicksFor, type VideoTypeKey } from "@/apps/music-video/lib/videoTypes";
import { STORY_FEELINGS, buildStoryBeats, type StoryFeelingKey } from "@/apps/music-video/lib/storyMode";
import { TemplateCard, NoStyleCard } from "@/platform/components/templates/TemplateCard";
import { useAudioPlayer } from "@/apps/music-video/lib/audioPlayer";
import { Button } from "@/platform/components/ui/button";
import { Input } from "@/platform/components/ui/input";
import { Textarea } from "@/platform/components/ui/textarea";
import { cn } from "@/platform/lib/utils";

function toB64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000)
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

const STEPS = ["Song", "Lyrics", "Performers", "Video Type", "Story", "Style", "Direct"] as const;

const VIDEO_TYPE_ICON: Record<VideoTypeKey, React.ReactNode> = {
  performance: <Camera className="h-5 w-5" />,
  narrative: <BookOpen className="h-5 w-5" />,
  dance: <Footprints className="h-5 w-5" />,
  animated: <Wand2 className="h-5 w-5" />,
  "visual-album": <Layers className="h-5 w-5" />,
};

const STORY_FEELING_ICON: Record<StoryFeelingKey, React.ReactNode> = {
  none: <Ban className="h-5 w-5" />,
  love: <Heart className="h-5 w-5" />,
  "rise-up": <TrendingUp className="h-5 w-5" />,
  transformation: <Sparkles className="h-5 w-5" />,
  party: <PartyPopper className="h-5 w-5" />,
  spiritual: <Sunrise className="h-5 w-5" />,
  revenge: <Swords className="h-5 w-5" />,
  dream: <CloudMoon className="h-5 w-5" />,
  custom: <PenLine className="h-5 w-5" />,
};

export function DirectorWizard() {
  const open = useAppStore((s) => s.directorOpen);
  const setOpen = useAppStore((s) => s.setDirectorOpen);
  const setActiveSong = useAppStore((s) => s.setActiveSong);
  const setActiveTemplate = useAppStore((s) => s.setActiveTemplate);
  const setMagicSongId = useAppStore((s) => s.setMagicSongId);
  const openHelp = useAppStore((s) => s.openHelp);

  const [step, setStep] = useState(0);
  const [song, setSong] = useState<SongMap | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lyrics, setLyrics] = useState("");
  const [cast, setCast] = useState<Performer[]>([]);
  // Local preview cache (performer id -> data URL) so an uploaded portrait
  // shows instantly without waiting on a listCharacters round-trip.
  const [portraits, setPortraits] = useState<Record<string, string>>({});
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  // "Create Character from Prompt" — a short inline form, no long dialogs.
  const [addingFromPrompt, setAddingFromPrompt] = useState(false);
  const [promptName, setPromptName] = useState("");
  const [promptText, setPromptText] = useState("");
  // "Generate Character Portrait" — which performer's generator is open.
  const [genForId, setGenForId] = useState<string | null>(null);
  const [videoType, setVideoType] = useState<VideoTypeKey | null>(null);
  const [storyFeeling, setStoryFeeling] = useState<StoryFeelingKey | null>(null);
  const [storyIdea, setStoryIdea] = useState("");
  const [styleId, setStyleId] = useState<string | null>(null);

  const stylePicks = stylePicksFor(videoType, allTemplates());
  const parsedPreview = useMemo(() => (lyrics.trim() ? parseScript(lyrics) : null), [lyrics]);

  if (!open) return null;

  const reset = () => {
    setStep(0);
    setSong(null);
    setLyrics("");
    setCast([]);
    setPortraits({});
    setUploadingId(null);
    setAddingFromPrompt(false);
    setPromptName("");
    setPromptText("");
    setGenForId(null);
    setVideoType(null);
    setStoryFeeling(null);
    setStoryIdea("");
    setStyleId(null);
    setError(null);
  };
  const close = () => {
    setOpen(false);
    reset();
  };

  // --- step 1: import a brand-new song -------------------------------------
  const importSong = async (file: File) => {
    setError(null);
    setAnalyzing(true);
    try {
      const s = await analyzeAudioFile(file);
      if (isTauri) {
        try {
          const ext = file.name.split(".").pop() || "mp3";
          s.audioPath = await api.importSongAudio(
            s.id,
            toB64(new Uint8Array(await file.arrayBuffer())),
            ext
          );
        } catch {
          /* non-fatal */
        }
      }
      saveSong(s);
      useAudioPlayer.getState().load(s.id, s.name, URL.createObjectURL(file), true);
      setSong(s);
      setCast(autoCastFromSong(s));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not analyze that file. Try WAV or MP3.");
    } finally {
      setAnalyzing(false);
    }
  };

  // Shared by upload + AI generation: create-or-update the performer's linked
  // Character Bible entry with a new portrait, so it's the real generation
  // reference downstream, not just a wizard thumbnail. Merges onto the
  // existing character (if any) so a prompt-created identity, name, etc.
  // survive adding/regenerating the portrait afterward.
  const linkPortrait = async (performerId: string, url: string) => {
    const performer = cast.find((p) => p.id === performerId);
    const existing = performer?.characterId
      ? (await api.listCharacters()).find((c) => c.id === performer.characterId)
      : undefined;
    const character = {
      ...(existing ?? newCharacter(performer?.name || "New Character")),
      portraitUrl: url,
      referenceImages: existing?.referenceImages.includes(url)
        ? existing.referenceImages
        : [url, ...(existing?.referenceImages ?? [])].slice(0, 8),
      locked: true,
    };
    await api.saveCharacter(character);
    setPortraits((p) => ({ ...p, [performerId]: url }));
    setCast((c) =>
      c.map((x) => (x.id === performerId ? { ...x, characterId: character.id } : x))
    );
  };

  // Upload a portrait for a performer.
  const uploadPortrait = async (performerId: string, file: File) => {
    setUploadingId(performerId);
    try {
      const dataUrl = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      await linkPortrait(performerId, dataUrl);
    } catch {
      setError("Couldn't read that image — try a JPG or PNG.");
    } finally {
      setUploadingId(null);
    }
  };

  // "Add Performer" — a blank performer, ready to name and cast.
  const addPerformer = () => setCast((c) => [...c, newPerformer()]);

  // "Create Character from Prompt" — a new performer whose Character Bible
  // entry is described by a short text prompt (no portrait yet).
  const addFromPrompt = async () => {
    const name = promptName.trim() || "New Character";
    const prompt = promptText.trim();
    const performer = newPerformer();
    performer.name = name;
    const character = { ...newCharacter(name), promptDna: prompt };
    await api.saveCharacter(character);
    setCast((c) => [...c, { ...performer, characterId: character.id }]);
    setAddingFromPrompt(false);
    setPromptName("");
    setPromptText("");
  };

  // "Generate Character Portrait using selected image model" — reuses the
  // same image-generation panel used everywhere else in the app.
  const runGeneratePortrait = async (opts: GenerateOpts): Promise<string[]> => {
    const urls: string[] = [];
    for (let i = 0; i < opts.variations; i++) {
      const s = opts.seed !== undefined ? opts.seed + i : undefined;
      urls.push(
        await api.generateImagePro(
          opts.provider,
          opts.prompt,
          opts.width,
          opts.height,
          opts.references,
          s,
          opts.apiModel
        )
      );
    }
    return urls;
  };

  // Persist the lyrics into the song (per-section + the timed list), plus
  // whatever the parsing engine read out of the raw text (title, genre, mood,
  // themes, characters, hooks…) — the source text itself always survives in
  // parsedScript.sourceNotes even where a heuristic misses.
  const applyLyrics = () => {
    if (!song) return;
    if (!lyrics.trim()) return;
    const lines = distributeLyrics(lyrics, song.sections);
    const bySection = new Map<string, string[]>();
    for (const l of lines) {
      if (!l.sectionId) continue;
      const arr = bySection.get(l.sectionId) ?? [];
      arr.push(l.text);
      bySection.set(l.sectionId, arr);
    }
    const sections = song.sections.map((sec) => ({
      ...sec,
      lyricsText: bySection.get(sec.id)?.join("\n") ?? sec.lyricsText,
    }));
    const parsedScript = parseScript(lyrics);
    const next: SongMap = { ...song, sections, lyrics: lines, parsedScript };
    saveSong(next);
    setSong(next);
  };

  const finish = () => {
    if (!song) return;
    // Persist performers + video type + story + style onto the brand-new
    // production, then hand off to the staged Magic Mode pipeline (treatment
    // + choreography). Story beats are generated now, from whatever lyrics/
    // script text and feeling the user gave us, and saved with the song.
    for (const p of cast) savePerformer(p);
    const feeling = storyFeeling ?? "none";
    const storyBeats = buildStoryBeats(song, feeling, storyIdea);
    saveSong({
      ...song,
      videoType: videoType ?? undefined,
      storyFeeling: storyFeeling ?? undefined,
      storyIdea: storyFeeling === "custom" ? storyIdea.trim() || undefined : undefined,
      storyBeats,
    });
    setActiveSong(song.id);
    setActiveTemplate(styleId);
    setMagicSongId(song.id);
    close();
  };

  const canNext =
    step === 0 ? !!song : true; // later steps are optional

  const next = () => {
    if (step === 1) applyLyrics();
    if (step < STEPS.length - 1) setStep((s) => s + 1);
  };

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center bg-background/85 p-6 backdrop-blur">
      <div
        className={cn(
          "flex max-h-[90vh] w-full overflow-hidden rounded-[var(--radius-modal)] border border-border bg-surface shadow-card transition-[max-width]",
          step === 2 ? "max-w-5xl" : "max-w-3xl"
        )}
      >
        {/* Step rail */}
        <div className="hidden w-52 shrink-0 flex-col gap-1 border-r border-border bg-elevated/30 p-4 sm:flex">
          <div className="mb-3 flex items-center gap-2">
            <span className="magic-cta flex h-8 w-8 items-center justify-center rounded-lg">
              <Clapperboard className="h-4 w-4" />
            </span>
            <span className="text-sm font-semibold leading-tight">Magic Mode</span>
          </div>
          {STEPS.map((label, i) => (
            <div
              key={label}
              className={cn(
                "flex items-center gap-2 rounded-[var(--radius-button)] px-2.5 py-2 text-sm",
                i === step
                  ? "bg-primary/12 text-primary"
                  : i < step
                    ? "text-foreground"
                    : "text-muted"
              )}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full border border-current text-[10px]">
                {i < step ? <Check className="h-3 w-3" /> : i + 1}
              </span>
              {label}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <h2 className="text-sm font-semibold">
              Step {step + 1} of {STEPS.length} — {STEPS[step]}
            </h2>
            <div className="flex items-center gap-3">
              <button onClick={openHelp} aria-label="Help" title="Help — Magic Mode guide">
                <HelpCircle className="h-4 w-4 text-muted hover:text-foreground" />
              </button>
              <button onClick={close} aria-label="Close wizard">
                <X className="h-4 w-4 text-muted hover:text-foreground" />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            {error && (
              <div className="mb-3 rounded-[var(--radius-card)] border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
                {error}
              </div>
            )}

            {step === 0 && (
              <StepShell icon={<Music className="h-5 w-5" />} title="Import your song" desc="Everything starts from the track — an MP3/WAV export from Suno works exactly the same way. The Director maps tempo, sections, and energy locally.">
                {song ? (
                  <div className="flex items-center gap-3 rounded-[var(--radius-card)] border border-success/40 bg-success/10 p-3 text-sm">
                    <Check className="h-4 w-4 text-success" />
                    <span>
                      <b>{song.name}</b> · {song.bpm} BPM · {song.sections.length} sections
                    </span>
                  </div>
                ) : (
                  <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--radius-card)] border border-dashed border-border bg-elevated/40 py-10 text-center hover:border-primary/50">
                    {analyzing ? (
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    ) : (
                      <Upload className="h-6 w-6 text-muted" />
                    )}
                    <span className="text-sm font-medium">
                      {analyzing ? "Analyzing…" : "Click to import a song"}
                    </span>
                    <span className="text-xs text-muted">MP3, WAV, M4A, FLAC</span>
                    <input
                      type="file"
                      accept="audio/*,.mp3,.wav,.m4a,.ogg,.flac"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void importSong(f);
                        e.target.value = "";
                      }}
                    />
                  </label>
                )}
              </StepShell>
            )}

            {step === 1 && (
              <StepShell icon={<Mic2 className="h-5 w-5" />} title="Add the lyrics" desc="Paste the lyrics (or skip), or upload a lyrics/script file. The Director spaces the lines across the song's sections so each part can be staged.">
                <div className="mb-2 flex items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-button)] border border-border bg-elevated/40 px-2.5 py-1.5 text-xs font-medium text-foreground hover:border-primary/40">
                    <FileText className="h-3.5 w-3.5" /> Upload lyrics or script (.txt)
                    <input
                      type="file"
                      accept=".txt,.lrc,.srt,text/plain"
                      className="hidden"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        e.target.value = "";
                        if (!f) return;
                        try {
                          const text = await f.text();
                          setLyrics(text);
                        } catch {
                          setError("Couldn't read that file — try plain .txt.");
                        }
                      }}
                    />
                  </label>
                  {lyrics.trim() && (
                    <span className="text-[11px] text-muted">
                      {lyrics.trim().split(/\r?\n/).filter(Boolean).length} lines
                    </span>
                  )}
                </div>
                <Textarea
                  value={lyrics}
                  onChange={(e) => setLyrics(e.target.value)}
                  placeholder={"Paste lyrics here — one line per row.\n(Optional — you can skip this.)"}
                  className="min-h-48"
                />
                {parsedPreview && (
                  <div className="mt-3 rounded-[var(--radius-card)] border border-border bg-elevated/30 p-3">
                    <div className="mb-2 text-xs font-semibold text-muted">What we found</div>
                    <div className="flex flex-wrap gap-1.5">
                      {parsedPreview.songTitle && <Chip label={`Title: ${parsedPreview.songTitle}`} />}
                      {parsedPreview.artistName && <Chip label={`Artist: ${parsedPreview.artistName}`} />}
                      {parsedPreview.genre && <Chip label={parsedPreview.genre} />}
                      {parsedPreview.mood && <Chip label={parsedPreview.mood} />}
                      {parsedPreview.themes.map((t) => (
                        <Chip key={t} label={t} />
                      ))}
                      {parsedPreview.characters.slice(0, 4).map((c) => (
                        <Chip key={c} label={`Character: ${c}`} />
                      ))}
                      {parsedPreview.locations.slice(0, 3).map((l) => (
                        <Chip key={l} label={`Location: ${l}`} />
                      ))}
                      {parsedPreview.sections.length > 0 && (
                        <Chip label={`${parsedPreview.sections.length} sections marked`} />
                      )}
                      {parsedPreview.hookMoments.length > 0 && (
                        <Chip label={`${parsedPreview.hookMoments.length} hook line${parsedPreview.hookMoments.length === 1 ? "" : "s"}`} />
                      )}
                      {parsedPreview.choreographyMoments.length > 0 && (
                        <Chip label={`${parsedPreview.choreographyMoments.length} choreo moment${parsedPreview.choreographyMoments.length === 1 ? "" : "s"}`} />
                      )}
                    </div>
                  </div>
                )}
              </StepShell>
            )}

            {step === 2 && (
              <StepShell icon={<Users className="h-5 w-5" />} title="Who's performing?" desc="The Director detected these performers from your song. Upload or generate a photo, choose a role, and add a short vibe — no long forms.">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {cast.map((p, i) => (
                    <div key={p.id} className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-elevated/30">
                      {/* Portrait — the card's primary focus, casting-sheet sized. */}
                      <div className="relative aspect-[4/5] w-full bg-elevated">
                        <label
                          className={cn(
                            "group flex h-full w-full cursor-pointer items-center justify-center overflow-hidden",
                            !portraits[p.id] && "border-b border-dashed border-border hover:border-primary/50"
                          )}
                          title="Upload a photo — becomes this performer's generation reference"
                        >
                          {uploadingId === p.id ? (
                            <Loader2 className="h-6 w-6 animate-spin text-muted" />
                          ) : portraits[p.id] ? (
                            <>
                              <img src={portraits[p.id]} alt="" className="h-full w-full object-cover" />
                              <span className="absolute inset-0 hidden items-center justify-center bg-black/50 group-hover:flex">
                                <Camera className="h-6 w-6 text-white" />
                              </span>
                            </>
                          ) : (
                            <span className="flex flex-col items-center gap-1.5 text-muted">
                              <Camera className="h-7 w-7" />
                              <span className="text-xs font-medium">Upload a photo</span>
                            </span>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) void uploadPortrait(p.id, f);
                              e.target.value = "";
                            }}
                          />
                        </label>

                        <div className="absolute right-2 top-2 flex gap-1.5">
                          <button
                            onClick={() => setGenForId(genForId === p.id ? null : p.id)}
                            className={cn(
                              "flex h-8 w-8 items-center justify-center rounded-full backdrop-blur",
                              genForId === p.id
                                ? "bg-primary text-white"
                                : "bg-black/55 text-white hover:bg-black/75"
                            )}
                            title="Generate a portrait with AI"
                            aria-label="Generate portrait"
                          >
                            <WandIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setCast((c) => c.filter((_, j) => j !== i))}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur hover:bg-danger/80"
                            aria-label="Remove performer"
                            title="Remove performer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Identity — name, role, vibe. */}
                      <div className="space-y-2 p-3">
                        <Input
                          value={p.name}
                          onChange={(e) =>
                            setCast((c) => c.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
                          }
                          className="h-9 text-base font-semibold"
                          aria-label={`Performer ${i + 1} name`}
                        />

                        <CardPicker
                          value={p.role}
                          ariaLabel={`Role for ${p.name || "performer"}`}
                          options={PERFORMER_ROLES.map((r) => ({
                            key: r,
                            label: r,
                            icon: ROLE_META[r].icon,
                            tagline: ROLE_META[r].tagline,
                          }))}
                          onChange={(key) => {
                            const role = key as PerformerRole;
                            setCast((c) =>
                              c.map((x, j) =>
                                j === i ? { ...x, role, lipSync: VOCAL_ROLES.includes(role) } : x
                              )
                            );
                          }}
                        />

                        <Input
                          value={p.performanceNotes}
                          onChange={(e) =>
                            setCast((c) =>
                              c.map((x, j) => (j === i ? { ...x, performanceNotes: e.target.value } : x))
                            )
                          }
                          placeholder="Short vibe — e.g. confident, playful, intense"
                          className="h-8 text-xs"
                          aria-label={`Vibe for ${p.name || "performer"}`}
                        />
                      </div>

                      {genForId === p.id && (
                        <div className="border-t border-border p-3">
                          <GenerationPanel
                            title="Generate portrait"
                            initialPrompt={`${p.name || "A performer"}, ${p.role.toLowerCase()}, ${p.performanceNotes || "confident"}, portrait`}
                            defaultAspect="4:5"
                            onGenerate={runGeneratePortrait}
                            onPick={(url) => {
                              void linkPortrait(p.id, url);
                            }}
                            pickLabel="Use as portrait"
                            compact
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={addPerformer}>
                    <Plus className="h-3.5 w-3.5" /> Add Performer
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setAddingFromPrompt((v) => !v)}
                  >
                    <WandIcon className="h-3.5 w-3.5" /> Create from Prompt
                  </Button>
                </div>

                {addingFromPrompt && (
                  <div className="mt-3 space-y-2 rounded-[var(--radius-card)] border border-border bg-elevated/30 p-3">
                    <Input
                      value={promptName}
                      onChange={(e) => setPromptName(e.target.value)}
                      placeholder="Character name"
                      className="h-8 text-sm"
                      aria-label="New character name"
                    />
                    <Textarea
                      value={promptText}
                      onChange={(e) => setPromptText(e.target.value)}
                      placeholder="Describe them in a sentence — e.g. a confident dancer in a gold jacket…"
                      className="min-h-16 text-sm"
                      aria-label="New character prompt"
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setAddingFromPrompt(false)}>
                        Cancel
                      </Button>
                      <Button size="sm" onClick={() => void addFromPrompt()}>
                        Create
                      </Button>
                    </div>
                  </div>
                )}
              </StepShell>
            )}

            {step === 3 && (
              <StepShell icon={<Clapperboard className="h-5 w-5" />} title="What kind of video is this?" desc="This shapes how the Director approaches every section — performance-forward, story-led, choreography-first, animated, or an abstract run of movements.">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {VIDEO_TYPES.map((v) => (
                    <button
                      key={v.key}
                      onClick={() => setVideoType(videoType === v.key ? null : v.key)}
                      className={cn(
                        "flex flex-col items-start gap-2 rounded-[var(--radius-card)] border p-3 text-left transition-colors",
                        videoType === v.key
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/40"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-lg",
                          videoType === v.key ? "bg-primary/20 text-primary" : "bg-elevated text-muted"
                        )}
                      >
                        {VIDEO_TYPE_ICON[v.key]}
                      </span>
                      <span className="text-sm font-semibold">{v.label}</span>
                      <span className="text-[11px] text-muted">{v.tagline}</span>
                    </button>
                  ))}
                </div>
                {!videoType && (
                  <p className="mt-3 text-xs text-muted">
                    Optional — skip and the Director will balance it from your song's energy.
                  </p>
                )}
              </StepShell>
            )}

            {step === 4 && (
              <StepShell icon={<BookOpen className="h-5 w-5" />} title="Choose the story feeling" desc="Most music videos need a story layer, even while the performer sings. Pick a feeling — or skip it for performance only.">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {STORY_FEELINGS.map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setStoryFeeling(storyFeeling === f.key ? null : f.key)}
                      className={cn(
                        "flex flex-col items-start gap-2 rounded-[var(--radius-card)] border p-3 text-left transition-colors",
                        storyFeeling === f.key
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/40"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-lg",
                          storyFeeling === f.key ? "bg-primary/20 text-primary" : "bg-elevated text-muted"
                        )}
                      >
                        {STORY_FEELING_ICON[f.key]}
                      </span>
                      <span className="text-sm font-semibold">{f.label}</span>
                      <span className="text-[11px] text-muted">{f.tagline}</span>
                    </button>
                  ))}
                </div>
                {storyFeeling === "custom" && (
                  <Textarea
                    value={storyIdea}
                    onChange={(e) => setStoryIdea(e.target.value)}
                    placeholder="Describe your story idea in a sentence or two…"
                    className="mt-3 min-h-20"
                    aria-label="Custom story idea"
                  />
                )}
                {!storyFeeling && (
                  <p className="mt-3 text-xs text-muted">
                    Optional — skip for performance-only, no narrative layer.
                  </p>
                )}
              </StepShell>
            )}

            {step === 5 && (
              <StepShell icon={<Palette className="h-5 w-5" />} title="Pick a visual style" desc="Choose a blueprint the Director will adapt to your song — or go with no style for a neutral cinematic look.">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <NoStyleCard active={styleId === null} onClick={() => setStyleId(null)} />
                  {stylePicks.map((t) => (
                    <TemplateCard
                      key={t.id}
                      template={t}
                      active={styleId === t.id}
                      onClick={() => setStyleId(t.id)}
                    />
                  ))}
                </div>
              </StepShell>
            )}

            {step === 6 && (
              <StepShell icon={<Sparkles className="h-5 w-5" />} title="Direct my music video" desc="The Director will now analyze the song and generate a beat-synced treatment, shot list, and choreography into a brand-new production.">
                <ul className="space-y-1.5 text-sm text-muted">
                  {["Analyze the song", "Cast the performers", "Write the story beats", "Plan the beat-synced shot list", "Choreograph the chorus", "Assemble your treatment"].map((s) => (
                    <li key={s} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" /> {s}
                    </li>
                  ))}
                </ul>
              </StepShell>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-border px-5 py-3">
            <Button variant="ghost" size="sm" onClick={() => (step === 0 ? close() : setStep((s) => s - 1))}>
              <ArrowLeft className="h-4 w-4" /> {step === 0 ? "Cancel" : "Back"}
            </Button>
            {step < STEPS.length - 1 ? (
              <Button size="sm" onClick={next} disabled={!canNext}>
                {step === 1 && !lyrics.trim() ? "Skip" : "Next"} <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <button onClick={finish} className="magic-cta inline-flex items-center gap-2 rounded-[var(--radius-button)] px-4 py-2 text-sm font-bold">
                <Clapperboard className="h-4 w-4" /> Direct my music video
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-border bg-background/60 px-2 py-0.5 text-[11px] font-medium text-foreground">
      {label}
    </span>
  );
}

function StepShell({
  icon,
  title,
  desc,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <span className="grad-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white">
          {icon}
        </span>
        <div>
          <h3 className="text-base font-semibold leading-tight">{title}</h3>
          <p className="mt-0.5 text-sm text-muted">{desc}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

