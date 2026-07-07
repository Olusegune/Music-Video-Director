import { useCallback, useRef, useState } from "react";
function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

import { Music, Upload, Loader2, AudioLines } from "lucide-react";
import { analyzeAudioFile, loadSongs, saveSong, deleteSong, type SongMap } from "@/lib/songBrain";
import { api, isTauri } from "@/lib/ipc";
import { OnboardingChecklist } from "@/features/onboarding/OnboardingChecklist";
import { useAppStore } from "@/store/useAppStore";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAudioPlayer } from "@/lib/audioPlayer";
import { SongView } from "./SongView";

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

