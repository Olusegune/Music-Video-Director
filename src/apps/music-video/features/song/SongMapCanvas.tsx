// Song-map waveform/section canvas (extracted from SongStudio.tsx, Phase 2).
import { useEffect, useRef, useState } from "react";
import { barTimes, sectionColor, type SongMap } from "@/apps/music-video/lib/songBrain";

function cssVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return v || fallback;
}

export function SongMapCanvas({
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
