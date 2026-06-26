// The Director Wizard — the first-run "Direct My Music Video" experience.
//
// It ALWAYS starts from an empty canvas: import a song → add lyrics → confirm
// performers → pick a visual style → then the AI Director generates the full
// treatment, shot list, and choreography into a brand-new production. It never
// loads an existing project, template, or pre-populated production.

import { useState } from "react";
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
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { api, isTauri } from "@/lib/ipc";
import {
  analyzeAudioFile,
  saveSong,
  distributeLyrics,
  type SongMap,
} from "@/lib/songBrain";
import { autoCastFromSong, savePerformer, type Performer } from "@/lib/cast";
import { TEMPLATES } from "@/lib/templates";
import { useAudioPlayer } from "@/lib/audioPlayer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

function toB64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000)
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

const STEPS = ["Song", "Lyrics", "Performers", "Style", "Direct"] as const;
const STYLE_PICKS = TEMPLATES.slice(0, 6);

export function DirectorWizard() {
  const open = useAppStore((s) => s.directorOpen);
  const setOpen = useAppStore((s) => s.setDirectorOpen);
  const setActiveSong = useAppStore((s) => s.setActiveSong);
  const setActiveTemplate = useAppStore((s) => s.setActiveTemplate);
  const setMagicSongId = useAppStore((s) => s.setMagicSongId);

  const [step, setStep] = useState(0);
  const [song, setSong] = useState<SongMap | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lyrics, setLyrics] = useState("");
  const [cast, setCast] = useState<Performer[]>([]);
  const [styleId, setStyleId] = useState<string | null>(null);

  if (!open) return null;

  const reset = () => {
    setStep(0);
    setSong(null);
    setLyrics("");
    setCast([]);
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

  // Persist the lyrics into the song (per-section + the timed list).
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
    const next: SongMap = { ...song, sections, lyrics: lines };
    saveSong(next);
    setSong(next);
  };

  const finish = () => {
    if (!song) return;
    // Persist performers + style onto the brand-new production, then hand off
    // to the staged AI Director pipeline (treatment + choreography).
    for (const p of cast) savePerformer(p);
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
      <div className="flex max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-[var(--radius-modal)] border border-border bg-surface shadow-card">
        {/* Step rail */}
        <div className="hidden w-52 shrink-0 flex-col gap-1 border-r border-border bg-elevated/30 p-4 sm:flex">
          <div className="mb-3 flex items-center gap-2">
            <span className="magic-cta flex h-8 w-8 items-center justify-center rounded-lg">
              <Clapperboard className="h-4 w-4" />
            </span>
            <span className="text-sm font-semibold leading-tight">AI Director</span>
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
            <button onClick={close} aria-label="Close wizard">
              <X className="h-4 w-4 text-muted hover:text-foreground" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            {error && (
              <div className="mb-3 rounded-[var(--radius-card)] border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
                {error}
              </div>
            )}

            {step === 0 && (
              <StepShell icon={<Music className="h-5 w-5" />} title="Import your song" desc="Everything starts from the track. Drop an MP3/WAV — the Director maps tempo, sections, and energy locally.">
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
              <StepShell icon={<Mic2 className="h-5 w-5" />} title="Add the lyrics" desc="Paste the lyrics (or skip). The Director spaces them across the song's sections so each part can be staged.">
                <Textarea
                  value={lyrics}
                  onChange={(e) => setLyrics(e.target.value)}
                  placeholder={"Paste lyrics here — one line per row.\n(Optional — you can skip this.)"}
                  className="min-h-48"
                />
              </StepShell>
            )}

            {step === 2 && (
              <StepShell icon={<Users className="h-5 w-5" />} title="Who's performing?" desc="The Director detected these performers from your song. Adjust names and roles — they'll be cast automatically.">
                <div className="space-y-2">
                  {cast.length === 0 && (
                    <p className="text-sm text-muted">No performers detected — a lead vocalist will be cast.</p>
                  )}
                  {cast.map((p, i) => (
                    <div key={p.id} className="flex items-center gap-2">
                      <Input
                        value={p.name}
                        onChange={(e) =>
                          setCast((c) => c.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
                        }
                        className="h-9 flex-1"
                        aria-label={`Performer ${i + 1} name`}
                      />
                      <span className="w-32 shrink-0 rounded-[var(--radius-input)] border border-border bg-elevated px-2 py-1.5 text-center text-xs text-muted">
                        {p.role}
                      </span>
                      <button
                        onClick={() => setCast((c) => c.filter((_, j) => j !== i))}
                        className="text-muted hover:text-danger"
                        aria-label="Remove performer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </StepShell>
            )}

            {step === 3 && (
              <StepShell icon={<Palette className="h-5 w-5" />} title="Pick a visual style" desc="Choose a blueprint the Director will adapt to your song — or go with no style for a neutral cinematic look.">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <StyleChip label="No style" active={styleId === null} onClick={() => setStyleId(null)} accent="#64748b" tagline="Neutral cinematic" />
                  {STYLE_PICKS.map((t) => (
                    <StyleChip
                      key={t.id}
                      label={t.name}
                      tagline={t.tagline}
                      accent={t.accent}
                      active={styleId === t.id}
                      onClick={() => setStyleId(t.id)}
                    />
                  ))}
                </div>
              </StepShell>
            )}

            {step === 4 && (
              <StepShell icon={<Sparkles className="h-5 w-5" />} title="Direct my music video" desc="The AI Director will now analyze the song and generate a beat-synced treatment, shot list, and choreography into a brand-new production.">
                <ul className="space-y-1.5 text-sm text-muted">
                  {["Analyze the song", "Cast the performers", "Plan the beat-synced shot list", "Choreograph the chorus", "Assemble your treatment"].map((s) => (
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

function StyleChip({
  label,
  tagline,
  accent,
  active,
  onClick,
}: {
  label: string;
  tagline: string;
  accent: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-start gap-1 rounded-[var(--radius-card)] border p-3 text-left transition-colors",
        active ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"
      )}
    >
      <span className="h-1.5 w-8 rounded-full" style={{ backgroundColor: accent }} />
      <span className="text-sm font-semibold">{label}</span>
      <span className="line-clamp-2 text-[11px] text-muted">{tagline}</span>
    </button>
  );
}
