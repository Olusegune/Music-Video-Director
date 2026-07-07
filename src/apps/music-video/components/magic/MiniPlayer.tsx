// Persistent mini-player — stays docked at the bottom whenever a track is
// loaded, so the user can hear the song from any screen without returning to
// Song Studio. Driven by the single global audio player.

import { Play, Pause, Square, SkipBack, SkipForward, Music } from "lucide-react";
import { useAudioPlayer } from "@/apps/music-video/lib/audioPlayer";
import { formatTime } from "@/apps/music-video/lib/songBrain";
import { useAppStore } from "@/platform/store/useAppStore";

export function MiniPlayer() {
  const player = useAudioPlayer();
  const view = useAppStore((s) => s.view);

  // No track loaded → nothing to show. Hide on Song Studio (it has its own
  // full transport) to avoid a duplicate control bar.
  if (!player.songId || !player.src || view === "song") return null;

  const dur = player.duration || 0;
  const pct = dur ? (player.time / dur) * 100 : 0;

  return (
    <div className="fixed bottom-4 left-1/2 z-40 w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2">
      <div className="flex items-center gap-2 rounded-full border border-border bg-surface/95 px-3 py-2 shadow-card backdrop-blur">
        <span className="grad-primary flex h-7 w-7 shrink-0 items-center justify-center rounded-full">
          <Music className="h-3.5 w-3.5 text-white" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-xs font-medium">{player.name || "Track"}</span>
          <div
            className="group relative mt-0.5 h-1.5 cursor-pointer rounded-full bg-elevated"
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              if (dur) player.seek(((e.clientX - r.left) / r.width) * dur);
            }}
            title="Seek"
          >
            <div className="grad-primary h-full rounded-full" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <span className="shrink-0 text-[10px] tabular-nums text-muted">
          {formatTime(player.time)} / {formatTime(dur)}
        </span>
        <div className="flex shrink-0 items-center gap-0.5">
          <button onClick={() => player.skip(-10)} className="rounded p-1 text-muted hover:text-foreground" aria-label="Back 10s" title="Back 10s">
            <SkipBack className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => player.toggle()}
            className="grad-primary flex h-7 w-7 items-center justify-center rounded-full text-white"
            aria-label={player.playing ? "Pause" : "Play"}
          >
            {player.playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </button>
          <button onClick={() => player.skip(10)} className="rounded p-1 text-muted hover:text-foreground" aria-label="Forward 10s" title="Forward 10s">
            <SkipForward className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => player.stop()} className="rounded p-1 text-muted hover:text-foreground" aria-label="Stop" title="Stop">
            <Square className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
