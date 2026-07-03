import { useCallback, useEffect, useRef, useState } from "react";

/** Build timed lyric lines from each section's lyricsText (spread across its span). */
function lyricsFromSections(sections: SongSection[]): LyricLine[] {
  const out: LyricLine[] = [];
  for (const s of sections) {
    const lines = (s.lyricsText ?? "")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) continue;
    const span = Math.max(0.1, s.end - s.start);
    lines.forEach((text, k) => {
      out.push({
        id: `${s.id}-${k}`,
        text,
        start: s.start + ((k + 0.5) / lines.length) * span,
        sectionId: s.id,
      });
    });
  }
  return out.sort((a, b) => a.start - b.start);
}

/** Base64-encode bytes in chunks (avoids call-stack overflow on big files). */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

import {
  Music,
  Upload,
  Play,
  Pause,
  Loader2,
  Trash2,
  Wand2,
  AlignLeft,
  Gauge,
  Clock,
  Radio,
  AudioLines,
  Clapperboard,
  Sparkles,
  Mic2,
  Plus,
  SkipBack,
  SkipForward,
  Square,
  Repeat,
  Volume2,
  ChevronDown,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react";
import {
  analyzeAudioFile,
  loadSongs,
  saveSong,
  deleteSong,
  barTimes,
  formatTime,
  sectionColor,
  SECTION_KINDS,
  AUDIO_TRACK_KINDS,
  defaultAudioAt,
  defaultAudioDuck,
  type SongMap,
  type SongSection,
  type SectionKind,
  type AudioTrack,
  type AudioTrackKind,
  type LyricLine,
} from "@/lib/songBrain";
import {
  detectSectionPerformer,
  detectAllPerformers,
  SECTION_PERFORMER_ROLES,
} from "@/lib/performerDetect";
import { api, isTauri } from "@/lib/ipc";
import { useProviderReadiness } from "@/lib/providerReady";
import { OnboardingChecklist } from "@/features/onboarding/OnboardingChecklist";
import { useAppStore } from "@/store/useAppStore";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAssetSrc, resolveAssetSrc } from "@/components/ui/asset-image";
import { useAudioPlayer } from "@/lib/audioPlayer";

export function SongStudio() {
  const [songs, setSongs] = useState<SongMap[]>(() => loadSongs());
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // The store is the single source of truth for the active song — so a "Blank
  // studio" (which sets it to null) actually shows an empty studio, instead of
  // falling back to the most recent track.
  const activeId = useAppStore((s) => s.activeSongId);
  const setActiveId = useAppStore((s) => s.setActiveSong);
  const openMvDirector = useAppStore((s) => s.openMvDirector);
  const setMagicSongId = useAppStore((s) => s.setMagicSongId);

  const active = songs.find((s) => s.id === activeId) ?? null;

  const importFile = useCallback(async (file: File) => {
    setError(null);
    setAnalyzing(true);
    try {
      const song = await analyzeAudioFile(file);
      // In the desktop app, persist the source audio so the MV render can mux
      // it. (No-op in the browser, where there's no FFmpeg anyway.)
      if (isTauri) {
        try {
          const ext = file.name.split(".").pop() || "mp3";
          const b64 = bytesToBase64(new Uint8Array(await file.arrayBuffer()));
          song.audioPath = await api.importSongAudio(song.id, b64, ext);
        } catch {
          /* non-fatal — render will fall back to silent */
        }
      }
      saveSong(song);
      setSongs(loadSongs());
      setActiveId(song.id);
      // Hand the audio to the global player (it owns the object URL's lifecycle).
      useAudioPlayer.getState().load(song.id, song.name, URL.createObjectURL(file), true);
      // If the user launched the Magic Flow before importing, auto-continue now.
      if (useAppStore.getState().pendingMagic) {
        useAppStore.getState().setPendingMagic(false);
        useAppStore.getState().setMagicSongId(song.id);
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not analyze that file. Try a WAV or MP3."
      );
    } finally {
      setAnalyzing(false);
    }
  }, []);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void importFile(file);
    e.target.value = "";
  };

  // Replace the active track's AUDIO while preserving all creative work
  // (sections, lyrics, per-section brief, name, template — and the treatment /
  // cast / choreography, which are keyed by song id and so carry over untouched).
  const replaceFileRef = useRef<HTMLInputElement>(null);
  const replaceActive = useCallback(
    async (file: File) => {
      const cur = loadSongs().find((s) => s.id === activeId);
      if (!cur) return;
      setError(null);
      setAnalyzing(true);
      try {
        const fresh = await analyzeAudioFile(file);
        let audioPath: string | undefined;
        if (isTauri) {
          try {
            const ext = file.name.split(".").pop() || "mp3";
            const b64 = bytesToBase64(new Uint8Array(await file.arrayBuffer()));
            audioPath = await api.importSongAudio(cur.id, b64, ext);
          } catch {
            /* non-fatal */
          }
        }
        // Keep the creative fields; swap audio + waveform/tempo.
        const merged: SongMap = {
          ...cur,
          fileName: file.name,
          durationSec: fresh.durationSec,
          bpm: fresh.bpm,
          beatOffsetSec: fresh.beatOffsetSec,
          peaks: fresh.peaks,
          energyEnvelope: fresh.energyEnvelope,
          audioPath: audioPath ?? cur.audioPath,
          updatedAt: new Date().toISOString(),
        };
        saveSong(merged);
        setSongs(loadSongs());
        useAudioPlayer.getState().load(cur.id, merged.name, URL.createObjectURL(file), true);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Could not analyze that file. Try a WAV or MP3."
        );
      } finally {
        setAnalyzing(false);
      }
    },
    [activeId]
  );

  const onReplacePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void replaceActive(file);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) void importFile(file);
  };

  const updateActive = useCallback(
    (next: SongMap) => {
      saveSong(next);
      setSongs(loadSongs());
    },
    []
  );

  const removeSong = (id: string) => {
    const s = loadSongs().find((x) => x.id === id);
    if (!confirm(`Delete "${s?.name ?? "this song"}"? This can't be undone.`)) return;
    deleteSong(id);
    const remaining = loadSongs();
    setSongs(remaining);
    if (useAudioPlayer.getState().songId === id) useAudioPlayer.getState().unload();
    if (activeId === id) {
      setActiveId(remaining[0]?.id ?? null);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <header className="flex items-center justify-between gap-4 border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="grad-primary flex h-9 w-9 items-center justify-center rounded-lg">
            <Music className="h-4.5 w-4.5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-tight">Song Studio</h1>
            <p className="text-xs text-muted">
              Import a track — the Song Brain maps tempo, sections, and lyrics. No
              key needed.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,.mp3,.wav,.m4a,.ogg,.flac"
            className="hidden"
            onChange={onPick}
          />
          <input
            ref={replaceFileRef}
            type="file"
            accept="audio/*,.mp3,.wav,.m4a,.ogg,.flac"
            className="hidden"
            onChange={onReplacePick}
          />
          <Button
            variant="primary"
            onClick={() => fileInputRef.current?.click()}
            disabled={analyzing}
          >
            {analyzing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {analyzing ? "Analyzing…" : "Import track"}
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Library rail */}
        <aside className="flex w-56 shrink-0 flex-col border-r border-border">
          <div className="px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted">
            Tracks
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-3">
            {songs.length === 0 && (
              <p className="px-2 py-3 text-xs text-muted">
                No tracks yet. Import an MP3 or WAV to begin.
              </p>
            )}
            {songs.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveId(s.id)}
                className={cn(
                  "group flex w-full items-center gap-2 rounded-[var(--radius-button)] px-2.5 py-2 text-left text-sm transition-colors",
                  s.id === activeId
                    ? "bg-primary/12 text-primary"
                    : "text-muted hover:bg-elevated/60 hover:text-foreground"
                )}
              >
                <AudioLines className="h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{s.name}</span>
                <span className="text-[10px] tabular-nums opacity-70">
                  {s.bpm}
                </span>
              </button>
            ))}
          </div>
        </aside>

        {/* Main */}
        <main
          className="min-w-0 flex-1 overflow-y-auto"
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
        >
          <div className="px-6 pt-6">
            <OnboardingChecklist hasSongs={songs.length > 0} />
          </div>

          {error && (
            <div className="m-6 rounded-[var(--radius-card)] border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
            </div>
          )}

          {!active ? (
            <EmptyState
              onPick={() => fileInputRef.current?.click()}
              analyzing={analyzing}
            />
          ) : (
            <SongView
              song={active}
              onChange={updateActive}
              onDelete={() => removeSong(active.id)}
              onReimport={() => fileInputRef.current?.click()}
              onReplace={() => replaceFileRef.current?.click()}
              onDirect={() => {
                setActiveId(active.id);
                setMagicSongId(active.id);
              }}
              onOpenDirector={() => {
                setActiveId(active.id);
                openMvDirector();
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
}

function EmptyState({
  onPick,
  analyzing,
}: {
  onPick: () => void;
  analyzing: boolean;
}) {
  return (
    <div className="flex h-full items-center justify-center p-10">
      <button
        onClick={onPick}
        disabled={analyzing}
        className="flex max-w-md flex-col items-center gap-4 rounded-[var(--radius-card)] border border-dashed border-border bg-surface/60 px-10 py-14 text-center transition-colors hover:border-primary/50 hover:bg-elevated/40"
      >
        <div className="grad-primary flex h-14 w-14 items-center justify-center rounded-2xl">
          <Music className="h-7 w-7 text-white" />
        </div>
        <div>
          <div className="text-base font-semibold">Drop a track to begin</div>
          <p className="mt-1 text-sm text-muted">
            MP3, WAV, M4A, FLAC. The Song Brain detects tempo, lays out the
            sections, and gives you a song map to direct against — all locally.
          </p>
        </div>
        <span className="text-xs font-medium text-primary">
          {analyzing ? "Analyzing…" : "Click or drag a file anywhere"}
        </span>
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Song view
// ---------------------------------------------------------------------------

function SongView({
  song,
  onChange,
  onDelete,
  onReimport,
  onReplace,
  onDirect,
  onOpenDirector,
}: {
  song: SongMap;
  onChange: (next: SongMap) => void;
  onDelete: () => void;
  onReimport: () => void;
  onReplace: () => void;
  onDirect: () => void;
  onOpenDirector: () => void;
}) {
  const player = useAudioPlayer();
  const [selectedSectionId, setSelectedSectionId] = useState<string>(
    song.sections[0]?.id ?? ""
  );

  // Make sure THIS song is the one loaded in the global player. The import path
  // already loads freshly-imported tracks (object URL); here we resolve a
  // persisted track's audio so playback survives navigation + restarts.
  useEffect(() => {
    if (useAudioPlayer.getState().songId === song.id) return;
    let alive = true;
    resolveAssetSrc(song.audioPath || "").then((src) => {
      if (!alive) return;
      if (useAudioPlayer.getState().songId === song.id) return;
      if (src) useAudioPlayer.getState().load(song.id, song.name, src, false);
      else useAudioPlayer.getState().unload();
    });
    return () => {
      alive = false;
    };
  }, [song.id, song.audioPath, song.name]);

  const loaded = player.songId === song.id;
  const hasAudio = loaded && !!player.src;
  const playing = loaded && player.playing;
  const currentTime = loaded ? player.time : 0;
  const seek = (t: number) => {
    if (hasAudio) player.seek(Math.max(0, Math.min(song.durationSec, t)));
  };
  const togglePlay = () => player.toggle();

  const setSections = (sections: SongSection[]) =>
    onChange({ ...song, sections });

  // Fill confident performer roles; leave unclear ones unset so they still prompt.
  const autoDetectPerformers = () => {
    const { byId } = detectAllPerformers(song.sections);
    setSections(
      song.sections.map((s) => {
        if (s.performerRole) return s;
        const d = byId[s.id];
        return d?.confident ? { ...s, performerRole: d.role } : s;
      })
    );
  };
  const needsPerformer = song.sections.filter(
    (s) => !s.performerRole && !detectSectionPerformer(s).confident
  ).length;

  const selectedSection =
    song.sections.find((s) => s.id === selectedSectionId) ?? song.sections[0] ?? null;
  const patchSection = (patch: Partial<SongSection>) => {
    if (!selectedSection) return;
    const sections = song.sections.map((x) =>
      x.id === selectedSection.id ? { ...x, ...patch } : x
    );
    // When section lyrics change, rebuild the timed lyric list the Timeline and
    // MV Director read from — so per-section lyrics flow through the pipeline.
    const lyrics =
      patch.lyricsText !== undefined ? lyricsFromSections(sections) : song.lyrics;
    onChange({ ...song, sections, lyrics });
  };

  const currentSection = song.sections.find(
    (s) => currentTime >= s.start && currentTime < s.end
  );

  return (
    <div className="space-y-5 p-6">
      {/* Your Song — the beginner-friendly summary + main CTA */}
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">
        Your Song
      </div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <Input
            value={song.name}
            onChange={(e) => onChange({ ...song, name: e.target.value })}
            className="h-9 max-w-md border-transparent bg-transparent px-0 text-xl font-semibold focus-visible:border-border focus-visible:px-3"
            aria-label="Song name"
          />
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Stat icon={<Gauge className="h-3.5 w-3.5" />} label={`${song.bpm} BPM`} />
            <Stat
              icon={<Clock className="h-3.5 w-3.5" />}
              label={formatTime(song.durationSec)}
            />
            <Stat
              icon={<Radio className="h-3.5 w-3.5" />}
              label={`${song.sections.length} sections`}
            />
            {currentSection && (
              <Badge
                variant="primary"
                style={{
                  backgroundColor: `${sectionColor(currentSection.kind)}22`,
                  color: sectionColor(currentSection.kind),
                }}
              >
                {currentSection.label}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" onClick={onDirect}>
            <Sparkles className="h-4 w-4" />
            Direct this music video
          </Button>
          <Button variant="secondary" size="sm" onClick={onOpenDirector} title="Open the MV Director without auto-directing">
            <Clapperboard className="h-4 w-4" />
            Open Director
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onReplace}
            title="Swap the audio file, keeping your lyrics, sections, cast & choreography"
          >
            <Upload className="h-4 w-4" />
            Replace
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            aria-label="Delete track"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Transport + map */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => player.skip(-10)} disabled={!hasAudio} aria-label="Back 10 seconds" title="Back 10s">
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button
              variant={hasAudio ? "primary" : "secondary"}
              size="icon"
              onClick={togglePlay}
              disabled={!hasAudio}
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => player.stop()} disabled={!hasAudio} aria-label="Stop" title="Stop">
              <Square className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => player.skip(10)} disabled={!hasAudio} aria-label="Forward 10 seconds" title="Forward 10s">
              <SkipForward className="h-4 w-4" />
            </Button>

            {/* Loop the current section */}
            <Button
              variant={player.loop ? "primary" : "ghost"}
              size="icon"
              disabled={!hasAudio || !currentSection}
              title={player.loop ? "Looping section — click to stop" : "Loop the current section"}
              aria-label="Loop section"
              onClick={() =>
                player.setLoop(
                  player.loop
                    ? null
                    : currentSection
                      ? { start: currentSection.start, end: currentSection.end }
                      : null
                )
              }
            >
              <Repeat className="h-4 w-4" />
            </Button>

            <div className="ml-1 text-sm tabular-nums text-muted">
              {formatTime(currentTime)}{" "}
              <span className="opacity-50">/ {formatTime(song.durationSec)}</span>
            </div>

            {/* Volume */}
            <div className="ml-auto flex items-center gap-1.5">
              <Volume2 className="h-3.5 w-3.5 text-muted" />
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(player.volume * 100)}
                onChange={(e) => player.setVolume(Number(e.target.value) / 100)}
                className="w-24 accent-[var(--color-primary)]"
                aria-label="Volume"
                disabled={!hasAudio}
              />
            </div>

            {!hasAudio && (
              <button
                onClick={onReimport}
                className="text-xs font-medium text-primary hover:underline"
              >
                Re-import audio to enable playback
              </button>
            )}
          </div>

          <SongMapCanvas
            song={song}
            currentTime={currentTime}
            onSeek={seek}
          />

          {/* Section chips legend */}
          <div className="flex flex-wrap gap-1.5">
            {song.sections.map((s) => (
              <button
                key={s.id}
                onClick={() => seek(s.start + 0.01)}
                className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium transition-transform hover:-translate-y-px"
                style={{
                  backgroundColor: `${sectionColor(s.kind)}1f`,
                  color: sectionColor(s.kind),
                }}
                title={`${formatTime(s.start)} – ${formatTime(s.end)}`}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: sectionColor(s.kind) }}
                />
                {s.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        {/* Song structure — click a section to edit its lyrics + brief */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="h-4 w-4 text-accent" />
                Song structure
              </CardTitle>
              <Button variant="secondary" size="sm" onClick={autoDetectPerformers}>
                <Mic2 className="h-3.5 w-3.5" /> Auto-detect performers
              </Button>
            </div>
            <CardDescription>
              Pick a section to add lyrics, performer, mood, and camera direction.
              {needsPerformer > 0 && (
                <span className="ml-1 text-warning">
                  {needsPerformer} section{needsPerformer === 1 ? "" : "s"} need a performer.
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {song.sections.map((s, i) => (
              <SectionRow
                key={s.id}
                section={s}
                selected={s.id === selectedSectionId}
                hasLyrics={!!s.lyricsText?.trim()}
                onSelect={() => setSelectedSectionId(s.id)}
                onSeek={() => seek(s.start + 0.01)}
                onChange={(next) =>
                  setSections(
                    song.sections.map((x) => (x.id === s.id ? next : x))
                  )
                }
                onDelete={
                  song.sections.length > 1
                    ? () =>
                        setSections(song.sections.filter((x) => x.id !== s.id))
                    : undefined
                }
                active={currentTime >= s.start && currentTime < s.end}
                index={i}
              />
            ))}
          </CardContent>
        </Card>

        {/* Section editor — lyrics + per-section creative brief */}
        {selectedSection ? (
          <SectionEditor
            key={selectedSection.id}
            section={selectedSection}
            onPatch={patchSection}
            onSeek={() => seek(selectedSection.start + 0.01)}
          />
        ) : (
          <Card>
            <CardContent className="p-6 text-sm text-muted">
              No sections yet.
            </CardContent>
          </Card>
        )}
      </div>

      <VoiceLab song={song} onChange={onChange} />
    </div>
  );
}

function VoiceLab({
  song,
  onChange,
}: {
  song: SongMap;
  onChange: (next: SongMap) => void;
}) {
  const [kind, setKind] = useState<AudioTrackKind>("Intro tag");
  const [text, setText] = useState("");
  const [voice, setVoice] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tracks = song.audioTracks ?? [];
  const { isReady } = useProviderReadiness();
  const audioReady = isReady(["elevenlabs"]);

  const generate = async () => {
    if (!text.trim()) return;
    setError(null);
    setBusy(true);
    try {
      const url = await api.generateMvAudio(song.id, text.trim(), voice.trim() || undefined);
      const track: AudioTrack = {
        id: crypto.randomUUID(),
        kind,
        text: text.trim(),
        voice: voice.trim(),
        url,
        atSec: defaultAudioAt(kind, song.durationSec),
        volume: 1,
        duck: defaultAudioDuck(kind),
        createdAt: new Date().toISOString(),
      };
      onChange({ ...song, audioTracks: [track, ...tracks] });
      setText("");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not generate audio. Add an ElevenLabs key in API Keys."
      );
    } finally {
      setBusy(false);
    }
  };

  const remove = (id: string) =>
    onChange({ ...song, audioTracks: tracks.filter((t) => t.id !== id) });

  const patchTrack = (id: string, patch: Partial<AudioTrack>) =>
    onChange({
      ...song,
      audioTracks: tracks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic2 className="h-4 w-4 text-accent" />
          Voice & spoken audio
        </CardTitle>
        <CardDescription>
          Generate spoken layers — intro tags, ad-libs, narration, spoken hooks —
          with ElevenLabs. The master track stays your imported song.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as AudioTrackKind)}
            className="h-9 rounded-[var(--radius-input)] border border-border bg-surface px-2 text-sm text-foreground focus-visible:border-primary focus-visible:outline-none"
            aria-label="Audio kind"
          >
            {AUDIO_TRACK_KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <Input
            value={voice}
            onChange={(e) => setVoice(e.target.value)}
            placeholder="Voice (ElevenLabs voice id / name — optional)"
            className="h-9 max-w-xs flex-1"
            aria-label="Voice"
          />
        </div>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What should be spoken? e.g. “Wheelbarrow… let’s go.”"
          className="min-h-16"
          aria-label="Spoken text"
        />
        {error && <p className="text-xs text-danger">{error}</p>}
        {!audioReady && (
          <p className="text-xs text-warning">
            No ElevenLabs key configured — add one in API Keys to generate audio.
          </p>
        )}
        <Button
          variant="secondary"
          onClick={generate}
          disabled={busy || !text.trim() || !audioReady}
          title={audioReady ? undefined : "No ElevenLabs key — add one in API Keys"}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Generate audio
        </Button>

        {tracks.length > 0 && (
          <div className="space-y-2 pt-1">
            {tracks.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-3 rounded-[var(--radius-button)] border border-border bg-surface p-2.5"
              >
                <Badge variant="accent" className="shrink-0 normal-case">
                  {t.kind}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{t.text}</p>
                  <AudioPlayer src={t.url} />
                </div>
                <label
                  className="flex shrink-0 items-center gap-1 text-[11px] text-muted"
                  title="Start time in the render (seconds)"
                >
                  @
                  <Input
                    type="number"
                    min={0}
                    step={0.5}
                    value={t.atSec ?? 0}
                    onChange={(e) =>
                      patchTrack(t.id, {
                        atSec: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    className="h-7 w-16 px-1.5 text-center text-xs"
                    aria-label="Start time (seconds)"
                  />
                  s
                </label>
                <label
                  className="flex shrink-0 items-center gap-1 text-[11px] text-muted"
                  title="Layer volume"
                >
                  <input
                    type="range"
                    min={0}
                    max={2}
                    step={0.1}
                    value={t.volume ?? 1}
                    onChange={(e) =>
                      patchTrack(t.id, { volume: Number(e.target.value) })
                    }
                    className="h-1 w-16 accent-primary"
                    aria-label="Layer volume"
                  />
                  <span className="w-8 tabular-nums">
                    {Math.round((t.volume ?? 1) * 100)}%
                  </span>
                </label>
                <button
                  onClick={() => patchTrack(t.id, { duck: !t.duck })}
                  className={cn(
                    "shrink-0 rounded-md px-2 py-1 text-[10px] font-semibold transition-colors",
                    t.duck
                      ? "bg-primary/15 text-primary"
                      : "bg-elevated text-muted hover:text-foreground"
                  )}
                  title="Duck the music under this layer (sidechain)"
                >
                  DUCK
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => remove(t.id)}
                  aria-label="Delete audio"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AudioPlayer({ src }: { src: string }) {
  const resolved = useAssetSrc(src);
  if (!resolved) return null;
  return <audio src={resolved} controls className="mt-1 h-8 w-full max-w-sm" />;
}

function Stat({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-elevated px-2 py-0.5 text-xs text-muted">
      {icon}
      {label}
    </span>
  );
}

function SectionRow({
  section,
  onChange,
  onDelete,
  onSeek,
  onSelect,
  selected,
  hasLyrics,
  active,
  index,
}: {
  section: SongSection;
  onChange: (next: SongSection) => void;
  onDelete?: () => void;
  onSeek: () => void;
  onSelect: () => void;
  selected: boolean;
  hasLyrics: boolean;
  active: boolean;
  index: number;
}) {
  return (
    <div
      onClick={onSelect}
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-[var(--radius-button)] border px-2 py-1.5 transition-colors",
        selected
          ? "border-primary bg-primary/12"
          : active
            ? "border-primary/30 bg-primary/8"
            : "border-transparent hover:bg-elevated/50"
      )}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onSeek();
        }}
        className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold tabular-nums text-white"
        style={{ backgroundColor: sectionColor(section.kind) }}
        title="Jump to section"
        aria-label={`Jump to ${section.label}`}
      >
        {index + 1}
        {hasLyrics && (
          <span
            className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-success ring-2 ring-surface"
            title="Has lyrics"
          />
        )}
      </button>
      <select
        value={section.kind}
        onChange={(e) => {
          const kind = e.target.value as SectionKind;
          onChange({
            ...section,
            kind,
            // keep a custom label, otherwise track the kind
            label: SECTION_KINDS.includes(section.label as SectionKind)
              ? kind
              : section.label,
          });
        }}
        className="h-8 rounded-[var(--radius-input)] border border-border bg-surface px-2 text-xs text-foreground focus-visible:border-primary focus-visible:outline-none"
        aria-label="Section type"
      >
        {SECTION_KINDS.map((k) => (
          <option key={k} value={k}>
            {k}
          </option>
        ))}
      </select>
      <Input
        value={section.label}
        onChange={(e) => onChange({ ...section, label: e.target.value })}
        className="h-8 flex-1 text-sm"
        aria-label="Section label"
      />
      <span className="shrink-0 text-[11px] tabular-nums text-muted">
        {formatTime(section.start)}–{formatTime(section.end)}
      </span>
      {onDelete && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={onDelete}
          aria-label="Delete section"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

/** Per-section editor: lyrics for THIS section + a creative brief. */
function SectionEditor({
  section,
  onPatch,
  onSeek,
}: {
  section: SongSection;
  onPatch: (patch: Partial<SongSection>) => void;
  onSeek: () => void;
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const color = sectionColor(section.kind);
  const Field = ({
    label,
    value,
    onChange,
    placeholder,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
  }) => (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-muted">{label}</span>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-8 text-sm" />
    </label>
  );

  return (
    <Card className="overflow-hidden">
      <div
        className="flex items-center gap-2 px-4 py-2.5"
        style={{ backgroundColor: `${color}14`, borderBottom: `1px solid ${color}33` }}
      >
        <span className="flex h-6 items-center rounded-md px-2 text-xs font-semibold text-white" style={{ backgroundColor: color }}>
          {section.label}
        </span>
        <span className="text-[11px] tabular-nums text-muted">
          {formatTime(section.start)}–{formatTime(section.end)}
        </span>
        <button
          onClick={onSeek}
          className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
        >
          <Play className="h-3 w-3" /> Jump
        </button>
      </div>
      <CardContent className="space-y-3 p-4">
        <label className="block">
          <span className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-muted">
            <AlignLeft className="h-3.5 w-3.5" /> Lyrics — {section.label}
          </span>
          <Textarea
            value={section.lyricsText ?? ""}
            onChange={(e) => onPatch({ lyricsText: e.target.value })}
            placeholder={`Lyrics for ${section.label}… (one line per row)`}
            className="min-h-28"
            aria-label={`Lyrics for ${section.label}`}
          />
        </label>

        {/* Who performs this section? — assigned, or detected with a hint. */}
        {(() => {
          const det = detectSectionPerformer(section);
          const assigned = section.performerRole;
          return (
            <label className="block">
              <span className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-muted">
                <Mic2 className="h-3.5 w-3.5" /> Who performs this section?
                {!assigned && (
                  <span
                    className={cn(
                      "ml-1 rounded px-1.5 py-0.5 text-[10px]",
                      det.confident
                        ? "bg-primary/12 text-primary"
                        : "bg-warning/15 text-warning"
                    )}
                  >
                    {det.confident ? `Suggested: ${det.role}` : `Unclear — ${det.why}`}
                  </span>
                )}
              </span>
              <select
                value={assigned ?? ""}
                onChange={(e) => onPatch({ performerRole: e.target.value || undefined })}
                className="h-9 w-full rounded-[var(--radius-input)] border border-border bg-surface px-2 text-sm text-foreground focus-visible:border-primary focus-visible:outline-none"
                aria-label={`Performer for ${section.label}`}
              >
                <option value="">
                  {det.confident ? `Use suggestion (${det.role})` : "— choose performer —"}
                </option>
                {SECTION_PERFORMER_ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </label>
          );
        })()}

        <button
          onClick={() => setShowAdvanced((v) => !v)}
          className="flex items-center gap-1.5 text-[11px] font-medium text-muted hover:text-foreground"
        >
          {showAdvanced ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
          <SlidersHorizontal className="h-3 w-3" />
          Advanced — mood, visual style, choreography, energy
        </button>

        {showAdvanced && (
          <>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Field label="Lead vocalist(s)" value={section.lead ?? ""} onChange={(v) => onPatch({ lead: v })} placeholder="e.g. Neo Dude" />
              <Field label="Backup / dancers" value={section.backup ?? ""} onChange={(v) => onPatch({ backup: v })} placeholder="e.g. 8 dancers" />
              <Field label="Mood / emotion" value={section.mood ?? ""} onChange={(v) => onPatch({ mood: v })} placeholder="e.g. Curious" />
              <Field label="Visual style" value={section.visualStyle ?? ""} onChange={(v) => onPatch({ visualStyle: v })} placeholder="e.g. neon, hazy" />
              <Field label="Camera" value={section.cameraNote ?? ""} onChange={(v) => onPatch({ cameraNote: v })} placeholder="e.g. slow push-in" />
              <Field label="Choreography" value={section.choreoNote ?? ""} onChange={(v) => onPatch({ choreoNote: v })} placeholder="e.g. full routine" />
            </div>
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-muted">Story / performance notes</span>
              <Textarea
                value={section.storyNote ?? ""}
                onChange={(e) => onPatch({ storyNote: e.target.value })}
                placeholder="What happens in this section…"
                className="min-h-16"
              />
            </label>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted">Energy</span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round((section.energy ?? 0.5) * 100)}
                onChange={(e) => onPatch({ energy: Number(e.target.value) / 100 })}
                className="flex-1 accent-[var(--color-primary)]"
                aria-label="Energy level"
              />
              <span className="w-8 text-right text-[11px] tabular-nums text-muted">
                {Math.round((section.energy ?? 0.5) * 100)}
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Canvas: waveform + section bands + beat grid + playhead
// ---------------------------------------------------------------------------

function cssVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return v || fallback;
}

function SongMapCanvas({
  song,
  currentTime,
  onSeek,
}: {
  song: SongMap;
  currentTime: number;
  onSeek: (t: number) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(800);
  const height = 132;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(Math.floor(w));
    });
    ro.observe(el);
    setWidth(Math.floor(el.clientWidth));
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const dur = song.durationSec || 1;
    const xFor = (t: number) => (t / dur) * width;
    const muted = cssVar("--c-muted", "#9aa1ac");
    const border = cssVar("--c-border", "#262a31");
    const primary = cssVar("--c-primary", "#7d6dff");

    // 1) Section bands (background tint).
    for (const s of song.sections) {
      const x0 = xFor(s.start);
      const x1 = xFor(s.end);
      ctx.fillStyle = hexWithAlpha(sectionColor(s.kind), 0.16);
      ctx.fillRect(x0, 0, x1 - x0, height);
      // boundary line
      ctx.strokeStyle = hexWithAlpha(sectionColor(s.kind), 0.5);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(Math.round(x0) + 0.5, 0);
      ctx.lineTo(Math.round(x0) + 0.5, height);
      ctx.stroke();
      // label
      ctx.fillStyle = sectionColor(s.kind);
      ctx.font = "600 10px Inter, system-ui, sans-serif";
      ctx.textBaseline = "top";
      if (x1 - x0 > 28) ctx.fillText(s.label, x0 + 4, 4, x1 - x0 - 6);
    }

    // 2) Bar ticks (subtle) — only if not too dense.
    const bars = barTimes(song);
    if (bars.length > 0 && bars.length < 300) {
      ctx.strokeStyle = hexWithAlpha(border, 0.9);
      ctx.lineWidth = 1;
      for (const t of bars) {
        const x = Math.round(xFor(t)) + 0.5;
        ctx.beginPath();
        ctx.moveTo(x, height - 10);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
    }

    // 3) Waveform (mirrored), drawn over bands.
    const peaks = song.peaks;
    const mid = height / 2;
    const maxAmp = mid - 14;
    ctx.fillStyle = hexWithAlpha(muted, 0.55);
    const n = peaks.length;
    const barW = width / n;
    for (let i = 0; i < n; i++) {
      const x = i * barW;
      const a = peaks[i] * maxAmp;
      ctx.fillRect(x, mid - a, Math.max(0.5, barW * 0.8), a * 2);
    }

    // 4) Played portion overlay.
    const px = xFor(currentTime);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, px, height);
    ctx.clip();
    ctx.fillStyle = hexWithAlpha(primary, 0.85);
    for (let i = 0; i < n; i++) {
      const x = i * barW;
      const a = peaks[i] * maxAmp;
      ctx.fillRect(x, mid - a, Math.max(0.5, barW * 0.8), a * 2);
    }
    ctx.restore();

    // 5) Playhead.
    ctx.strokeStyle = primary;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px, height);
    ctx.stroke();
  }, [song, currentTime, width]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = (e.clientX - rect.left) / rect.width;
    onSeek(frac * song.durationSec);
  };

  return (
    <div ref={wrapRef} className="w-full">
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height }}
        className="cursor-pointer rounded-[var(--radius-input)] border border-border bg-surface"
        onClick={handleClick}
        role="slider"
        aria-label="Song timeline — click to seek"
        aria-valuemin={0}
        aria-valuemax={Math.round(song.durationSec)}
        aria-valuenow={Math.round(currentTime)}
      />
    </div>
  );
}

function hexWithAlpha(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h.split("").map((c) => c + c).join("")
      : h.padEnd(6, "0").slice(0, 6);
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
