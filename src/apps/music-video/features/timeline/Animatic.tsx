// Silent frame-preview animatic (extracted from TimelineView.tsx, Phase 2).
import { useEffect, useState } from "react";
import { Play, Pause, X } from "lucide-react";
import { sectionColor, formatTime, type SongMap } from "@/apps/music-video/lib/songBrain";
import { Button } from "@/platform/components/ui/button";
import { AssetImage } from "@/platform/components/ui/asset-image";
import type { FlatShot } from "./TimelineView";

export function Animatic({
  song,
  shots,
  onClose,
}: {
  song: SongMap;
  shots: FlatShot[];
  onClose: () => void;
}) {
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(true);
  const dur = song.durationSec || 1;
  const withFrames = shots.filter((s) => s.imageUrl).length;

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setT((prev) => {
        const next = prev + dt;
        if (next >= dur) {
          setPlaying(false);
          return dur;
        }
        return next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, dur]);

  const current = shots.find((s) => t >= s.start && t < s.end) ?? shots[0] ?? null;
  const section = song.sections.find((s) => t >= s.start && t < s.end);
  const lyricsUpTo = song.lyrics.filter((l) => l.start <= t);
  const lyric = lyricsUpTo[lyricsUpTo.length - 1];

  const toggle = () => {
    if (!playing && t >= dur) setT(0);
    setPlaying((p) => !p);
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-background/95 backdrop-blur">
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="text-sm font-semibold">
          Animatic — {song.name}
          <span className="ml-2 text-xs font-normal text-muted">
            silent preview · {withFrames}/{shots.length} frames generated
          </span>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close animatic">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center p-6">
        <div className="relative aspect-video w-full max-w-4xl overflow-hidden rounded-lg border border-border bg-black">
          {current?.imageUrl ? (
            <AssetImage
              src={current.imageUrl}
              alt=""
              className="h-full w-full object-cover"
              label="Frame"
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center text-sm text-white/60"
              style={{ background: current ? `${current.color}33` : undefined }}
            >
              {current ? current.shotType : "No shots"}
            </div>
          )}
          {/* Lyric overlay */}
          {lyric && (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-6 pt-12 text-center">
              <span className="text-lg font-semibold text-white drop-shadow">{lyric.text}</span>
            </div>
          )}
          {section && (
            <span
              className="absolute left-3 top-3 rounded-md px-2 py-0.5 text-[11px] font-semibold text-white"
              style={{ backgroundColor: sectionColor(section.kind) }}
            >
              {section.label}
            </span>
          )}
        </div>
      </div>

      {/* Transport */}
      <div className="flex items-center gap-3 border-t border-border px-6 py-3">
        <Button
          variant="primary"
          size="icon"
          onClick={toggle}
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <span className="text-xs tabular-nums text-muted">
          {formatTime(t)} <span className="opacity-50">/ {formatTime(dur)}</span>
        </span>
        <div
          className="relative h-2 flex-1 cursor-pointer rounded-full bg-elevated"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setT(((e.clientX - rect.left) / rect.width) * dur);
          }}
        >
          {/* section ticks */}
          {song.sections.map((s) => (
            <span
              key={s.id}
              className="absolute top-0 h-full w-px"
              style={{ left: `${(s.start / dur) * 100}%`, backgroundColor: sectionColor(s.kind) }}
            />
          ))}
          <span
            className="absolute top-0 h-full rounded-full bg-primary/70"
            style={{ width: `${(t / dur) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Export — a full text rundown of the assembled video.
// ---------------------------------------------------------------------------
