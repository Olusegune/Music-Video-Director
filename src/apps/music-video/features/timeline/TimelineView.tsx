import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LayoutList, Music, Clapperboard, Download, Film, Footprints, Quote, Play, Loader2, Magnet, Copy, Trash2, Clapperboard as ClapperboardIcon, CheckCircle2, Circle, ImageIcon } from "lucide-react";
import { loadSongs, sectionColor, formatTime, type SongMap } from "@/apps/music-video/lib/songBrain";
import {
  getTreatment,
  saveTreatment,
  type MvTreatment,
  type MvShot,
} from "@/apps/music-video/lib/mvDirector";
import { getChoreo, saveChoreo, type ChoreoPlan } from "@/apps/music-video/lib/choreography";
import { loadCast, type Performer } from "@/apps/music-video/lib/cast";
import type { Character } from "@/platform/lib/types";
import { useAppStore } from "@/platform/store/useAppStore";
import { api } from "@/platform/lib/ipc";
import { Button } from "@/platform/components/ui/button";
import { AssetImage, AssetVideo } from "@/platform/components/ui/asset-image";
import { cn } from "@/platform/lib/utils";
import { ShotDetailPanel } from "./ShotDetailPanel";
import { RenderSettings, RenderResult, exportRundown } from "./RenderPanel";
import { Animatic } from "./Animatic";

/** Four named zoom levels (spec: Overview / Scene / Shot / Frame), each a
 *  pixels-per-second value driving the exact same xFor()/width layout math
 *  the timeline already used with its old continuous zoom stepper. */
const ZOOM_LEVELS = [
  { key: "overview", label: "Overview", px: 5 },
  { key: "scene", label: "Scene", px: 12 },
  { key: "shot", label: "Shot", px: 26 },
  { key: "frame", label: "Frame", px: 60 },
] as const;

export interface FlatShot {
  id: string;
  sectionId: string;
  secStart: number;
  secEnd: number;
  start: number;
  end: number;
  label: string;
  lyric?: string;
  color: string;
  shotType: string;
  movement: string;
  imageUrl?: string;
  videoUrl?: string;
}

export function TimelineView() {
  const activeSongId = useAppStore((s) => s.activeSongId);
  const setActiveSong = useAppStore((s) => s.setActiveSong);
  const openSong = useAppStore((s) => s.openSong);
  const openMvDirector = useAppStore((s) => s.openMvDirector);
  const activeTemplateId = useAppStore((s) => s.activeTemplateId);

  const [songs] = useState<SongMap[]>(() => loadSongs());
  const song = useMemo(
    () => songs.find((s) => s.id === activeSongId) ?? songs[0] ?? null,
    [songs, activeSongId]
  );

  const [treatment, setTreatment] = useState<MvTreatment | null>(null);
  const [choreo, setChoreo] = useState<ChoreoPlan | null>(null);
  const [zoom, setZoom] = useState(12);
  const [animatic, setAnimatic] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [renderUrl, setRenderUrl] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  // Click-to-open shot detail (Preview / Prompt / Characters / Story beat /
  // Camera / Render status) — a click, not a drag, opens it (see beginDrag).
  const [detail, setDetail] = useState<{ sectionId: string; shotId: string } | null>(null);
  const [cast] = useState<Performer[]>(() => loadCast());
  const { data: characters = [] } = useQuery<Character[]>({
    queryKey: ["characters"],
    queryFn: api.listCharacters,
  });

  useEffect(() => {
    if (!song) return;
    if (activeSongId !== song.id) setActiveSong(song.id);
    setTreatment(getTreatment(song.id, activeTemplateId));
    setChoreo(getChoreo(song.id));
  }, [song, activeSongId, activeTemplateId, setActiveSong]);

  const shots: FlatShot[] = useMemo(() => {
    if (!treatment) return [];
    return treatment.sections.flatMap((sec) =>
      sec.shots.map((sh) => ({
        id: sh.id,
        sectionId: sec.sectionId,
        secStart: sec.start,
        secEnd: sec.end,
        start: sh.start,
        end: sh.end,
        label: sh.lyric ?? sh.shotType,
        lyric: sh.lyric,
        color: sectionColor(sec.kind),
        shotType: sh.shotType,
        movement: sh.movement,
        imageUrl: sh.imageUrl,
        videoUrl: sh.videoUrl,
      }))
    );
  }, [treatment]);

  // --- timeline editing --------------------------------------------------
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [snap, setSnap] = useState(true);
  // Cross-view focus: a shot the MV Director asked us to highlight.
  const focusedShotId = useAppStore((s) => s.focusedShotId);
  const clearFocusedShot = useAppStore((s) => s.clearFocusedShot);
  const [flashId, setFlashId] = useState<string | null>(null);
  const scrollWrapRef = useRef<HTMLDivElement>(null);
  // Live drag preview for shots (id → position) and the marquee rectangle.
  const [preview, setPreview] = useState<Record<string, { start: number; end: number }>>({});
  const [marquee, setMarquee] = useState<{ x: number; w: number } | null>(null);
  const previewRef = useRef<Record<string, { start: number; end: number }>>({});

  // When the MV Director asks to locate a shot, select it, scroll it into view,
  // and flash it briefly — then clear the request.
  useEffect(() => {
    if (!focusedShotId || !song) return;
    const sh = shots.find((s) => s.id === focusedShotId);
    if (!sh) return;
    setSelected(new Set([focusedShotId]));
    setFlashId(focusedShotId);
    const d = song.durationSec || 1;
    const w = Math.max(900, Math.round(d * zoom));
    const x = (sh.start / d) * w;
    const el = scrollWrapRef.current;
    if (el) el.scrollTo({ left: Math.max(0, x - el.clientWidth / 2), behavior: "smooth" });
    const timer = setTimeout(() => {
      setFlashId(null);
      clearFocusedShot();
    }, 2600);
    return () => clearTimeout(timer);
  }, [focusedShotId, shots, song, zoom, clearFocusedShot]);

  // Magic Mode's "Render Video" jumps straight here with the Render dialog
  // already open, instead of dropping the user onto the bare scene lanes.
  const timelineAutoRender = useAppStore((s) => s.timelineAutoRender);
  const clearTimelineAutoRender = useAppStore((s) => s.clearTimelineAutoRender);
  useEffect(() => {
    if (!timelineAutoRender) return;
    setShowSettings(true);
    clearTimelineAutoRender();
  }, [timelineAutoRender, clearTimelineAutoRender]);

  const beatDur = 60 / Math.max(1, song?.bpm ?? 120);
  const beatOff = song?.beatOffsetSec ?? 0;
  const snapT = useCallback(
    (t: number) => (snap ? beatOff + Math.round((t - beatOff) / beatDur) * beatDur : t),
    [snap, beatDur, beatOff]
  );

  // Move shots to wherever they now land — reassigning each to the section that
  // contains its new start time (true cross-section dragging).
  const commitMoves = useCallback(
    (moves: { id: string; start: number; end: number }[]) => {
      if (moves.length === 0) return;
      const byId = new Map(moves.map((m) => [m.id, m]));
      setTreatment((prev) => {
        if (!prev) return prev;
        // 1) collect + remove moved shots from their current sections
        const moved: MvShot[] = [];
        const sections = prev.sections.map((sec) => ({
          ...sec,
          shots: sec.shots.filter((sh) => {
            const m = byId.get(sh.id);
            if (!m) return true;
            moved.push({ ...sh, start: m.start, end: m.end });
            return false;
          }),
        }));
        // 2) re-insert each into the section containing its new start
        for (const sh of moved) {
          let target =
            sections.find((s) => sh.start >= s.start && sh.start < s.end) ??
            sections.reduce((a, b) =>
              Math.abs(b.start - sh.start) < Math.abs(a.start - sh.start) ? b : a
            );
          target.shots = [...target.shots, sh].sort((a, b) => a.start - b.start);
        }
        const next = { ...prev, sections };
        saveTreatment(next);
        return next;
      });
    },
    []
  );

  const patchShot = useCallback((sectionId: string, shotId: string, patch: Partial<MvShot>) => {
    setTreatment((prev) => {
      if (!prev) return prev;
      const next = {
        ...prev,
        sections: prev.sections.map((sec) =>
          sec.sectionId === sectionId
            ? { ...sec, shots: sec.shots.map((sh) => (sh.id === shotId ? { ...sh, ...patch } : sh)) }
            : sec
        ),
      };
      saveTreatment(next);
      return next;
    });
  }, []);

  const deleteShots = useCallback((ids: Set<string>) => {
    if (ids.size === 0) return;
    setTreatment((prev) => {
      if (!prev) return prev;
      const next = {
        ...prev,
        sections: prev.sections.map((sec) => ({
          ...sec,
          shots: sec.shots.filter((sh) => !ids.has(sh.id)),
        })),
      };
      saveTreatment(next);
      return next;
    });
    setSelected(new Set());
  }, []);

  const duplicateShot = useCallback((sectionId: string, shotId: string) => {
    setTreatment((prev) => {
      if (!prev) return prev;
      const next = {
        ...prev,
        sections: prev.sections.map((sec) => {
          if (sec.sectionId !== sectionId) return sec;
          const i = sec.shots.findIndex((sh) => sh.id === shotId);
          if (i < 0) return sec;
          const src = sec.shots[i];
          const dur = src.end - src.start;
          const copy: MvShot = {
            ...src,
            id: crypto.randomUUID(),
            start: Math.min(sec.end - dur, src.end),
            end: Math.min(sec.end, src.end + dur),
          };
          const shots = [...sec.shots];
          shots.splice(i + 1, 0, copy);
          return { ...sec, shots };
        }),
      };
      saveTreatment(next);
      return next;
    });
  }, []);

  // Drag a shot (or the whole multi-selection) to move; right edge to resize.
  const beginDrag = useCallback(
    (e: React.PointerEvent, sh: FlatShot, mode: "move" | "resize") => {
      e.preventDefault();
      e.stopPropagation();
      const multi = e.shiftKey || e.ctrlKey || e.metaKey;
      if (multi) {
        // toggle membership; don't start a drag
        setSelected((prev) => {
          const n = new Set(prev);
          n.has(sh.id) ? n.delete(sh.id) : n.add(sh.id);
          return n;
        });
        return;
      }
      // Effective selection for this drag: keep group if shot is already in it.
      const group = selected.has(sh.id) && selected.size > 1 ? new Set(selected) : new Set([sh.id]);
      setSelected(group);

      const startX = e.clientX;
      const z = zoom;
      const dur = song?.durationSec || 1;
      if (mode === "resize") {
        const onMove = (ev: PointerEvent) => {
          const dt = (ev.clientX - startX) / z;
          let ne = snapT(sh.end + dt);
          ne = Math.max(sh.start + 0.3, Math.min(dur, ne));
          const p = { [sh.id]: { start: sh.start, end: ne } };
          previewRef.current = p;
          setPreview(p);
        };
        const onUp = () => {
          window.removeEventListener("pointermove", onMove);
          window.removeEventListener("pointerup", onUp);
          const p = previewRef.current[sh.id];
          previewRef.current = {};
          setPreview({});
          if (p && p.end !== sh.end) patchShot(sh.sectionId, sh.id, { end: p.end });
        };
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
        return;
      }
      // move (group-aware, cross-section)
      const items = shots
        .filter((s) => group.has(s.id))
        .map((s) => ({ id: s.id, origStart: s.start, dur: s.end - s.start }));
      const anchor = items.find((it) => it.id === sh.id)!;
      const onMove = (ev: PointerEvent) => {
        const dt = (ev.clientX - startX) / z;
        const anchorNew = Math.max(0, Math.min(dur - anchor.dur, snapT(anchor.origStart + dt)));
        const delta = anchorNew - anchor.origStart;
        const p: Record<string, { start: number; end: number }> = {};
        for (const it of items) {
          const ns = Math.max(0, Math.min(dur - it.dur, it.origStart + delta));
          p[it.id] = { start: ns, end: ns + it.dur };
        }
        previewRef.current = p;
        setPreview(p);
      };
      const onUp = (ev: PointerEvent) => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        const p = previewRef.current;
        previewRef.current = {};
        setPreview({});
        // A click, not a drag — open the shot's detail panel instead of
        // committing a (zero-distance) move.
        if (Math.abs(ev.clientX - startX) < 4) {
          setDetail({ sectionId: sh.sectionId, shotId: sh.id });
          return;
        }
        const moves = Object.entries(p)
          .filter(([id, v]) => {
            const orig = items.find((it) => it.id === id);
            return orig && v.start !== orig.origStart;
          })
          .map(([id, v]) => ({ id, start: v.start, end: v.end }));
        commitMoves(moves);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [selected, shots, song, zoom, snapT, patchShot, commitMoves]
  );

  // Marquee box-select on the Shots lane background.
  const beginMarquee = useCallback(
    (e: React.PointerEvent) => {
      const laneEl = e.currentTarget as HTMLElement;
      const rect = laneEl.getBoundingClientRect();
      const x0 = e.clientX - rect.left;
      setMarquee({ x: x0, w: 0 });
      const onMove = (ev: PointerEvent) => {
        const x = ev.clientX - rect.left;
        setMarquee({ x: Math.min(x0, x), w: Math.abs(x - x0) });
      };
      const onUp = (ev: PointerEvent) => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        const x = ev.clientX - rect.left;
        const t1 = Math.min(x0, x) / zoom;
        const t2 = Math.max(x0, x) / zoom;
        setMarquee(null);
        if (Math.abs(x - x0) < 4) {
          setSelected(new Set()); // a click on empty space clears selection
          return;
        }
        const hit = new Set(
          shots.filter((s) => s.start < t2 && s.end > t1).map((s) => s.id)
        );
        setSelected(hit);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [shots, zoom]
  );

  // --- choreography segment dragging (move + resize) ---------------------
  const [choreoPreview, setChoreoPreview] = useState<{ id: string; start: number; end: number } | null>(null);
  const choreoPreviewRef = useRef<{ id: string; start: number; end: number } | null>(null);

  const beginChoreoDrag = useCallback(
    (e: React.PointerEvent, cs: { sectionId: string; start: number; end: number }, mode: "move" | "resize") => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const z = zoom;
      const dur = song?.durationSec || 1;
      const segDur = cs.end - cs.start;
      const onMove = (ev: PointerEvent) => {
        const dt = (ev.clientX - startX) / z;
        let p: { id: string; start: number; end: number };
        if (mode === "move") {
          const ns = Math.max(0, Math.min(dur - segDur, snapT(cs.start + dt)));
          p = { id: cs.sectionId, start: ns, end: ns + segDur };
        } else {
          const ne = Math.max(cs.start + 0.5, Math.min(dur, snapT(cs.end + dt)));
          p = { id: cs.sectionId, start: cs.start, end: ne };
        }
        choreoPreviewRef.current = p;
        setChoreoPreview(p);
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        const p = choreoPreviewRef.current;
        choreoPreviewRef.current = null;
        setChoreoPreview(null);
        if (p && (p.start !== cs.start || p.end !== cs.end)) {
          setChoreo((prev) => {
            if (!prev) return prev;
            const next = {
              ...prev,
              sections: prev.sections.map((c) =>
                c.sectionId === p.id ? { ...c, start: p.start, end: p.end } : c
              ),
            };
            saveChoreo(next);
            return next;
          });
        }
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [song, zoom, snapT]
  );

  const selectedShots = shots.filter((s) => selected.has(s.id));

  // Delete key removes all selected shots (when not typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      if ((e.key === "Delete" || e.key === "Backspace") && selected.size > 0) {
        e.preventDefault();
        deleteShots(selected);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, deleteShots]);

  const doRender = useCallback(
    async (width: number, height: number, fps: number) => {
      if (!song) return;
      setShowSettings(false);
      setRenderError(null);
      setRenderUrl(null);
      setRendering(true);
      try {
        const segments = shots
          .map((s) => ({
            src: s.videoUrl || s.imageUrl || "",
            duration: Math.max(0.2, s.end - s.start),
          }))
          .filter((s) => s.src);
        if (segments.length === 0) {
          throw new Error(
            "Generate at least one frame or clip in the MV Director first."
          );
        }
        const voiceLayers = (song.audioTracks ?? [])
          .filter((t) => t.url)
          .map((t) => ({
            src: t.url,
            atSec: t.atSec ?? 0,
            volume: t.volume ?? 1,
            duck: Boolean(t.duck),
          }));
        const url = await api.renderMusicVideo(
          song.id,
          song.audioPath ?? null,
          segments,
          voiceLayers,
          width,
          height,
          fps
        );
        setRenderUrl(url);
      } catch (e) {
        setRenderError(e instanceof Error ? e.message : "Render failed.");
      } finally {
        setRendering(false);
      }
    },
    [song, shots]
  );

  if (!song) {
    return <Empty onAction={openSong} label="Go to Song Studio" message="Import a track in Song Studio to assemble its timeline." />;
  }

  if (!treatment) {
    return (
      <Empty
        onAction={openMvDirector}
        label="Open MV Director"
        message={`Direct “${song.name}” first — the timeline assembles the shots the MV Director lays out.`}
      />
    );
  }

  const dur = song.durationSec || 1;
  const width = Math.max(900, Math.round(dur * zoom));
  const xFor = (t: number) => (t / dur) * width;

  const tickStep = dur > 180 ? 30 : dur > 90 ? 15 : dur > 40 ? 10 : 5;
  const ticks: number[] = [];
  for (let t = 0; t <= dur; t += tickStep) ticks.push(t);


  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="grad-primary flex h-9 w-9 items-center justify-center rounded-lg">
            <LayoutList className="h-4.5 w-4.5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-tight">Timeline</h1>
            <p className="text-xs text-muted">
              <span className="text-foreground">{song.name}</span> · {song.bpm} BPM ·{" "}
              {formatTime(song.durationSec)} · {shots.length} shots
              {choreo ? ` · ${choreo.sections.length} routines` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div
            role="tablist"
            aria-label="Zoom level"
            className="flex h-9 items-center gap-0.5 rounded-[var(--radius-input)] border border-border bg-surface p-0.5"
          >
            {ZOOM_LEVELS.map((z) => (
              <button
                key={z.key}
                role="tab"
                aria-selected={zoom === z.px}
                onClick={() => setZoom(z.px)}
                className={cn(
                  "rounded-[calc(var(--radius-input)-2px)] px-2 py-1 text-xs font-medium transition-colors",
                  zoom === z.px ? "bg-primary/15 text-primary" : "text-muted hover:text-foreground"
                )}
              >
                {z.label}
              </button>
            ))}
          </div>
          <Button
            variant={snap ? "primary" : "ghost"}
            size="icon"
            onClick={() => setSnap((v) => !v)}
            title={snap ? "Beat snap on" : "Beat snap off"}
            aria-label="Toggle beat snap"
          >
            <Magnet className="h-4 w-4" />
          </Button>
          {selectedShots.length > 0 && (
            <>
              <span className="text-[11px] text-muted">{selectedShots.length} selected</span>
              {selectedShots.length === 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => duplicateShot(selectedShots[0].sectionId, selectedShots[0].id)}
                  title="Duplicate shot"
                  aria-label="Duplicate shot"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteShots(selected)}
                title="Delete selected (Del)"
                aria-label="Delete shot"
                className="text-muted hover:text-danger"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
          <Button variant="secondary" onClick={() => setAnimatic(true)}>
            <Play className="h-4 w-4" />
            Preview animatic
          </Button>
          <Button
            variant="accent"
            onClick={() => setShowSettings(true)}
            disabled={rendering}
          >
            {rendering ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ClapperboardIcon className="h-4 w-4" />
            )}
            {rendering ? "Rendering…" : "Render video"}
          </Button>
          <Button variant="secondary" onClick={() => exportRundown(song, treatment, choreo)}>
            <Download className="h-4 w-4" />
            Export rundown
          </Button>
        </div>
      </header>

      {renderError && (
        <div className="border-b border-danger/30 bg-danger/10 px-6 py-2 text-xs text-danger">
          {renderError}
        </div>
      )}

      {showSettings && (
        <RenderSettings
          song={song}
          shotCount={shots.length}
          onRender={doRender}
          onClose={() => setShowSettings(false)}
        />
      )}

      {animatic && (
        <Animatic song={song} shots={shots} onClose={() => setAnimatic(false)} />
      )}

      {renderUrl && (
        <RenderResult
          src={renderUrl}
          hasAudio={Boolean(song.audioPath)}
          onClose={() => setRenderUrl(null)}
        />
      )}

      {detail && treatment && (
        <ShotDetailPanel
          treatment={treatment}
          sectionId={detail.sectionId}
          shotId={detail.shotId}
          cast={cast}
          characters={characters}
          onClose={() => setDetail(null)}
        />
      )}

      <div ref={scrollWrapRef} className="min-h-0 flex-1 overflow-auto p-6">
        <div className="inline-block min-w-full align-top" style={{ width }}>
          {/* Ruler */}
          <div className="relative mb-1 h-5" style={{ width }}>
            {ticks.map((t) => (
              <div
                key={t}
                className="absolute top-0 flex h-full flex-col items-start"
                style={{ left: xFor(t) }}
              >
                <span className="text-[10px] tabular-nums text-muted">
                  {formatTime(t)}
                </span>
              </div>
            ))}
          </div>

          <Lane label="Sections" icon={<Music className="h-3.5 w-3.5" />}>
            {song.sections.map((s) => {
              const left = xFor(s.start);
              const w = xFor(s.end) - left;
              const color = sectionColor(s.kind);
              return (
                <div
                  key={s.id}
                  className="absolute top-1 bottom-1 flex items-center overflow-hidden rounded-md px-2"
                  style={{
                    left,
                    width: Math.max(2, w - 2),
                    backgroundColor: `${color}26`,
                    border: `1px solid ${color}66`,
                  }}
                  title={`${s.label} · ${formatTime(s.start)}–${formatTime(s.end)}`}
                >
                  <span className="truncate text-[11px] font-semibold" style={{ color }}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </Lane>

          <Lane
            label="Shots"
            icon={<Film className="h-3.5 w-3.5" />}
            height={88}
            onBgPointerDown={beginMarquee}
            overlay={
              marquee && (
                <div
                  className="pointer-events-none absolute top-0 bottom-0 z-20 rounded border border-primary bg-primary/15"
                  style={{ left: marquee.x, width: marquee.w }}
                />
              )
            }
          >
            {shots.map((sh) => {
              const live = preview[sh.id] ?? sh;
              const left = xFor(live.start);
              const w = xFor(live.end) - left;
              const isSel = selected.has(sh.id);
              return (
                <div
                  key={sh.id}
                  onPointerDown={(e) => beginDrag(e, sh, "move")}
                  className={cn(
                    "group absolute top-1 bottom-1 z-10 cursor-grab touch-none select-none overflow-hidden rounded-md active:cursor-grabbing",
                    isSel ? "ring-2 ring-primary" : "",
                    flashId === sh.id ? "z-20 animate-pulse ring-4 ring-warning" : ""
                  )}
                  style={{
                    left,
                    width: Math.max(3, w - 2),
                    backgroundColor: `${sh.color}1f`,
                    borderLeft: `3px solid ${sh.color}`,
                  }}
                  title={`${formatTime(live.start)}–${formatTime(live.end)} · ${sh.shotType} · ${sh.movement}${sh.lyric ? `\n“${sh.lyric}”` : ""}\nClick for details · drag to move · drag right edge to resize`}
                >
                  {sh.videoUrl ? (
                    <AssetVideo
                      src={sh.videoUrl}
                      className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                      controls={false}
                      muted
                      loop
                      autoPlay
                    />
                  ) : sh.imageUrl ? (
                    <AssetImage
                      src={sh.imageUrl}
                      alt=""
                      className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                      label="Frame"
                    />
                  ) : (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-muted/50">
                      <ImageIcon className="h-5 w-5" />
                    </div>
                  )}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 pb-1 pt-3">
                    <div className="truncate text-[10px] font-medium leading-tight text-white">
                      {sh.label}
                    </div>
                    {w > 60 && (
                      <div className="truncate text-[9px] leading-tight text-white/70">
                        {formatTime(Math.max(0.1, live.end - live.start))} · {sh.movement}
                      </div>
                    )}
                  </div>
                  {/* resize handle (right edge) */}
                  <div
                    onPointerDown={(e) => beginDrag(e, sh, "resize")}
                    className="absolute inset-y-0 right-0 w-2 cursor-ew-resize bg-foreground/0 hover:bg-foreground/20"
                    title="Drag to change duration"
                  />
                </div>
              );
            })}
          </Lane>

          <Lane label="Render" icon={<CheckCircle2 className="h-3.5 w-3.5" />}>
            {shots.map((sh) => {
              const live = preview[sh.id] ?? sh;
              const left = xFor(live.start);
              const w = xFor(live.end) - left;
              const status = sh.videoUrl ? "clip" : sh.imageUrl ? "frame" : "none";
              const color = status === "clip" ? "#16a34a" : status === "frame" ? "#d97706" : undefined;
              return (
                <div
                  key={sh.id}
                  className="pointer-events-none absolute top-1 bottom-1 flex items-center justify-center overflow-hidden rounded-md"
                  style={{
                    left,
                    width: Math.max(3, w - 2),
                    backgroundColor: color ? `${color}22` : "transparent",
                    border: `1px solid ${color ?? "var(--color-border)"}`,
                  }}
                  title={
                    status === "clip"
                      ? "Clip rendered"
                      : status === "frame"
                        ? "Frame only — no clip yet"
                        : "Nothing generated yet"
                  }
                >
                  {status === "clip" ? (
                    <CheckCircle2 className="h-3 w-3" style={{ color }} />
                  ) : status === "frame" ? (
                    <Circle className="h-3 w-3 fill-current" style={{ color }} />
                  ) : (
                    <Circle className="h-3 w-3 text-muted/40" />
                  )}
                </div>
              );
            })}
          </Lane>

          <Lane label="Lyrics" icon={<Quote className="h-3.5 w-3.5" />}>
            {song.lyrics.map((l) => (
              <div
                key={l.id}
                className="absolute top-1 bottom-1 flex items-center"
                style={{ left: xFor(l.start), maxWidth: 160 }}
                title={l.text}
              >
                <span className="h-full w-px bg-accent/60" />
                <span className="ml-1 truncate text-[10px] italic text-accent">
                  {l.text}
                </span>
              </div>
            ))}
          </Lane>

          <Lane label="Choreo" icon={<Footprints className="h-3.5 w-3.5" />}>
            {choreo ? (
              choreo.sections.map((c) => {
                const lc = choreoPreview?.id === c.sectionId ? choreoPreview : c;
                const left = xFor(lc.start);
                const w = xFor(lc.end) - left;
                return (
                  <div
                    key={c.sectionId}
                    onPointerDown={(e) => beginChoreoDrag(e, c, "move")}
                    className="group absolute top-1 bottom-1 flex cursor-grab touch-none select-none items-center overflow-hidden rounded-md px-2 active:cursor-grabbing"
                    style={{
                      left,
                      width: Math.max(3, w - 2),
                      backgroundColor: "#6d5dfc1f",
                      border: "1px solid #6d5dfc66",
                    }}
                    title={`${choreo.style} · ${c.formation} · ${c.eightCounts.length} eight-counts\nDrag to move · drag right edge to resize`}
                  >
                    <span className="pointer-events-none truncate text-[10px] font-medium text-primary">
                      {choreo.style} · {c.eightCounts.length}×8
                    </span>
                    <div
                      onPointerDown={(e) => beginChoreoDrag(e, c, "resize")}
                      className="absolute inset-y-0 right-0 w-2 cursor-ew-resize hover:bg-primary/30"
                      title="Drag to change duration"
                    />
                  </div>
                );
              })
            ) : (
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-muted">
                No choreography yet — generate it in the Choreography tab.
              </span>
            )}
          </Lane>
        </div>
      </div>
    </div>
  );
}

function Lane({
  label,
  icon,
  tall,
  height,
  children,
  onBgPointerDown,
  overlay,
}: {
  label: string;
  icon: React.ReactNode;
  tall?: boolean;
  /** Explicit pixel height — takes priority over `tall` when set. */
  height?: number;
  children: React.ReactNode;
  onBgPointerDown?: (e: React.PointerEvent) => void;
  overlay?: React.ReactNode;
}) {
  return (
    <div className="mb-2 flex">
      <div className="sticky left-0 z-10 flex w-20 shrink-0 items-center gap-1.5 pr-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
        {icon}
        {label}
      </div>
      <div
        className="relative flex-1 rounded-[var(--radius-input)] border border-border bg-surface/50"
        style={{ height: height ?? (tall ? 56 : 32) }}
        onPointerDown={onBgPointerDown}
      >
        {children}
        {overlay}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shot detail panel — click a thumbnail to see Preview / Prompt / Characters /
// Story beat / Camera / Render status, per the Timeline upgrade spec.
// ---------------------------------------------------------------------------

function Empty({
  onAction,
  label,
  message,
}: {
  onAction: () => void;
  label: string;
  message: string;
}) {
  return (
    <div className="flex h-full items-center justify-center p-10">
      <div className="max-w-sm text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-elevated">
          <Clapperboard className="h-7 w-7 text-muted" />
        </div>
        <h2 className="text-base font-semibold">Nothing to assemble yet</h2>
        <p className="mt-1 text-sm text-muted">{message}</p>
        <Button className="mt-4" onClick={onAction}>
          {label}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Render settings — resolution / fps + the audio layers that will be muxed.
// ---------------------------------------------------------------------------

