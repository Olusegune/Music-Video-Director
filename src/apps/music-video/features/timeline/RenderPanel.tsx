// Render dialog + result player + no-FFmpeg rundown export (extracted from TimelineView.tsx, Phase 2).
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Clapperboard as ClapperboardIcon } from "lucide-react";
import { formatTime, type SongMap } from "@/apps/music-video/lib/songBrain";
import { type MvTreatment } from "@/apps/music-video/lib/mvDirector";
import { type ChoreoPlan } from "@/apps/music-video/lib/choreography";
import { useAppStore } from "@/platform/store/useAppStore";
import { api } from "@/platform/lib/ipc";
import { Button } from "@/platform/components/ui/button";
import { AssetVideo } from "@/platform/components/ui/asset-image";

const RES_PRESETS = [
  { id: "720", label: "720p · 16:9", w: 1280, h: 720 },
  { id: "1080", label: "1080p · 16:9", w: 1920, h: 1080 },
  { id: "vertical", label: "Vertical · 9:16 (Shorts / Reels)", w: 1080, h: 1920 },
  { id: "square", label: "Square · 1:1", w: 1080, h: 1080 },
];

export function RenderSettings({
  song,
  shotCount,
  onRender,
  onClose,
}: {
  song: SongMap;
  shotCount: number;
  onRender: (w: number, h: number, fps: number) => void;
  onClose: () => void;
}) {
  const [resId, setResId] = useState("1080");
  const [fps, setFps] = useState(24);
  const res = RES_PRESETS.find((r) => r.id === resId) ?? RES_PRESETS[1];
  const voices = song.audioTracks ?? [];
  const openHelp = useAppStore((s) => s.openHelp);
  const { data: ffmpeg } = useQuery({
    queryKey: ["ffmpegStatus"],
    queryFn: api.checkFfmpeg,
  });

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 p-6 backdrop-blur">
      <div className="w-full max-w-md rounded-[var(--radius-card)] border border-border bg-surface shadow-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold">Render settings</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-4 p-5">
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted">
              Resolution
            </span>
            <select
              value={resId}
              onChange={(e) => setResId(e.target.value)}
              className="h-9 w-full rounded-[var(--radius-input)] border border-border bg-surface px-2 text-sm text-foreground focus-visible:border-primary focus-visible:outline-none"
            >
              {RES_PRESETS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label} — {r.w}×{r.h}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted">
              Frame rate
            </span>
            <select
              value={fps}
              onChange={(e) => setFps(Number(e.target.value))}
              className="h-9 w-full rounded-[var(--radius-input)] border border-border bg-surface px-2 text-sm text-foreground focus-visible:border-primary focus-visible:outline-none"
            >
              <option value={24}>24 fps (cinematic)</option>
              <option value={30}>30 fps</option>
            </select>
          </label>

          {/* Audio summary */}
          <div className="rounded-[var(--radius-input)] border border-border bg-elevated/40 p-3 text-xs">
            <div className="mb-1 font-semibold text-foreground/80">Audio mix</div>
            <div className="text-muted">
              Master track:{" "}
              {song.audioPath ? (
                <span className="text-foreground">{song.fileName}</span>
              ) : (
                <span className="text-warning">none stored — import in desktop app</span>
              )}
            </div>
            {voices.length > 0 ? (
              <ul className="mt-1 space-y-0.5 text-muted">
                {voices.map((t) => (
                  <li key={t.id}>
                    + {t.kind} @ {formatTime(t.atSec ?? 0)} ·{" "}
                    {Math.round((t.volume ?? 1) * 100)}%
                    {t.duck ? " · ducks music" : ""} —{" "}
                    <span className="italic">{t.text}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-1 text-muted">No voice layers.</div>
            )}
          </div>

          {/* FFmpeg readiness — the one external dependency for render. */}
          {ffmpeg && !ffmpeg.available && (
            <div className="flex items-center justify-between gap-2 rounded-[var(--radius-input)] border border-warning/40 bg-warning/5 px-3 py-2 text-xs">
              <span className="text-warning">FFmpeg not detected — needed to render.</span>
              <button
                onClick={() => {
                  onClose();
                  openHelp();
                }}
                className="shrink-0 font-medium text-primary hover:underline"
              >
                Set up FFmpeg →
              </button>
            </div>
          )}

          <p className="text-[11px] text-muted">
            {shotCount} shot{shotCount === 1 ? "" : "s"} → one MP4. Needs FFmpeg on
            the desktop app; the browser shows a sample.
          </p>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="accent" onClick={() => onRender(res.w, res.h, fps)}>
              <ClapperboardIcon className="h-4 w-4" />
              Render
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Render result — the finished, muxed MP4 from the Rust/FFmpeg core.
// ---------------------------------------------------------------------------

export function RenderResult({
  src,
  hasAudio,
  onClose,
}: {
  src: string;
  hasAudio: boolean;
  onClose: () => void;
}) {
  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-background/95 backdrop-blur">
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="text-sm font-semibold">
          Rendered music video
          <span className="ml-2 text-xs font-normal text-muted">
            {hasAudio ? "with audio" : "silent — no source audio stored"}
          </span>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close render">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center p-6">
        <AssetVideo
          src={src}
          controls
          className="aspect-video w-full max-w-4xl rounded-lg border border-border bg-black"
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Animatic — play the generated frames across the song timeline (silent).
// ---------------------------------------------------------------------------


export function exportRundown(
  song: SongMap,
  treatment: MvTreatment,
  choreo: ChoreoPlan | null
) {
  const lines: string[] = [];
  lines.push(`# ${song.name} — Music Video Rundown`);
  lines.push("");
  lines.push(
    `**${song.bpm} BPM · ${formatTime(song.durationSec)} · ${song.sections.length} sections · ${treatment.sections.reduce((a, s) => a + s.shots.length, 0)} shots**`
  );
  lines.push("");
  lines.push(`> ${treatment.logline}`);
  lines.push("");
  lines.push(`**Visual world.** ${treatment.visualWorld}`);
  lines.push("");
  lines.push(`**Energy arc.** ${treatment.energyArc}`);
  lines.push("");

  lines.push(`## Shot rundown`);
  for (const sec of treatment.sections) {
    lines.push("");
    lines.push(
      `### ${sec.label}  (${formatTime(sec.start)}–${formatTime(sec.end)}) · ${sec.approach}`
    );
    lines.push(`*${sec.concept}*`);
    lines.push(`Location: ${sec.location} · Wardrobe: ${sec.wardrobe} · ${sec.cutPace}`);
    lines.push("");
    for (let i = 0; i < sec.shots.length; i++) {
      const sh = sec.shots[i];
      lines.push(
        `${i + 1}. **[${formatTime(sh.start)}]** ${sh.idea}`
      );
      lines.push(
        `   - ${sh.shotType} · ${sh.movement} · ${sh.lighting} · ${sh.transition}`
      );
      lines.push(`   - _${sh.performanceNote}_`);
    }
  }

  if (choreo && choreo.sections.length > 0) {
    lines.push("");
    lines.push(`## Choreography (${choreo.style})`);
    for (const c of choreo.sections) {
      lines.push("");
      lines.push(`### ${c.label} · ${c.formation}`);
      lines.push(`${c.intensity}`);
      for (const ec of c.eightCounts) {
        lines.push(`- **Bar ${ec.bar}** (${formatTime(ec.startSec)}) — 1-4: ${ec.phraseA}; 5-8: ${ec.phraseB}`);
      }
      lines.push(`- Key poses: ${c.keyPoses.join(" / ")}`);
    }
  }

  const md = lines.join("\n");
  const blob = new Blob([md], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${song.name.replace(/[^a-z0-9]/gi, "-")}-rundown.md`;
  a.click();
  URL.revokeObjectURL(url);
}
