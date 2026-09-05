// The loaded-song editor surface (extracted from SongStudio.tsx, Phase 2).
import { useEffect, useState } from "react";
import {
  Upload,
  Play,
  Pause,
  Trash2,
  Wand2,
  Gauge,
  Clock,
  Radio,
  Clapperboard,
  Sparkles,
  Mic2,
  SkipBack,
  SkipForward,
  Square,
  Repeat,
  Volume2,
  FileText,
} from "lucide-react";
import {
  formatTime,
  sectionColor,
  SECTION_KINDS,
  type SongMap,
  type SongSection,
  type SectionKind,
  type LyricLine,
  detectSectionsFromBuffer,
  carrySectionEdits,
} from "@/apps/music-video/lib/songBrain";
import {
  detectSectionPerformer,
  detectAllPerformers,
} from "@/apps/music-video/lib/performerDetect";
import { Button } from "@/platform/components/ui/button";
import { Input } from "@/platform/components/ui/input";
import { Badge } from "@/platform/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/platform/components/ui/card";
import { resolveAssetSrc } from "@/platform/components/ui/asset-image";
import { useAudioPlayer } from "@/apps/music-video/lib/audioPlayer";
import { VoiceLab } from "./VoiceLab";
import { SectionRow, SectionEditor } from "./SectionEditor";
import { SongMapCanvas } from "./SongMapCanvas";
import { cn } from "@/platform/lib/utils";

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

export function SongView({
  song,
  onChange,
  onDelete,
  onReimport,
  onReplace,
  onDirect,
  onOpenDirector,
  onOpenScripts,
}: {
  song: SongMap;
  onChange: (next: SongMap) => void;
  onDelete: () => void;
  onReimport: () => void;
  onReplace: () => void;
  onDirect: () => void;
  onOpenDirector: () => void;
  onOpenScripts: () => void;
}) {
  const player = useAudioPlayer();
  const [selectedSectionId, setSelectedSectionId] = useState<string>(song.sections[0]?.id ?? "");

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

  const setSections = (sections: SongSection[]) => onChange({ ...song, sections });

  // Manual override for auto-detection: split one section into two at a
  // chosen moment — e.g. "the chorus actually starts here", which the
  // energy-based detector can miss on flatter-dynamic songs (ballads,
  // already-loud mixes). The second half starts as a copy of the first
  // (same kind/energy/brief) so nothing is lost; retag it via the kind
  // dropdown once split.
  const splitSectionAt = (sectionId: string, time: number) => {
    const idx = song.sections.findIndex((s) => s.id === sectionId);
    if (idx === -1) return;
    const original = song.sections[idx];
    if (time <= original.start + 0.25 || time >= original.end - 0.25) return;
    const second: SongSection = {
      ...original,
      id: crypto.randomUUID(),
      start: time,
      label: SECTION_KINDS.includes(original.label as SectionKind)
        ? original.label
        : `${original.label} (2)`,
    };
    const first: SongSection = { ...original, end: time };
    const sections = [...song.sections];
    sections.splice(idx, 1, first, second);
    setSections(sections);
    setSelectedSectionId(second.id);
  };

  // Re-run section detection over the already-imported audio.
  //
  // Detection used to happen once, at import, and never again — "Replace audio"
  // deliberately keeps the existing sections. So a track analyzed by an older
  // detector kept its old breakdown forever; a song stuck with no Chorus at all
  // starves the Director of performance shots and there was no way to refresh
  // it short of deleting and re-importing (losing lyrics, briefs, and cast).
  //
  // Boundaries are recomputed, but the creative work is carried across to
  // whichever new section overlaps each old one most, so re-detecting costs
  // only the section split itself.
  const [redetecting, setRedetecting] = useState(false);
  const [redetectError, setRedetectError] = useState<string | null>(null);
  const redetectSections = async () => {
    const edited = song.sections.filter(
      (s) =>
        s.lyricsText?.trim() ||
        s.performerRole ||
        s.lead ||
        s.backup ||
        s.mood ||
        s.cameraNote ||
        s.choreoNote ||
        s.storyNote ||
        s.visualStyle
    ).length;
    const warning = edited
      ? `\n\n${edited} section${edited === 1 ? " has" : "s have"} lyrics, a performer, or creative notes. That work moves to whichever new section covers the same moment, but the section boundaries themselves will change.`
      : "";
    if (!confirm(`Re-analyze "${song.name}" and rebuild its section list?${warning}`)) return;

    setRedetecting(true);
    setRedetectError(null);
    try {
      const src = await resolveAssetSrc(song.audioPath || "");
      if (!src) throw new Error("This track's audio file couldn't be found.");
      const bytes = await (await fetch(src)).arrayBuffer();
      const fresh = await detectSectionsFromBuffer(bytes);

      const carried = carrySectionEdits(song.sections, fresh.sections);

      onChange({
        ...song,
        sections: carried,
        bpm: fresh.bpm,
        beatOffsetSec: fresh.beatOffsetSec,
        updatedAt: new Date().toISOString(),
      });
      setSelectedSectionId(carried[0]?.id ?? "");
    } catch (e) {
      setRedetectError(e instanceof Error ? e.message : "Couldn't re-analyze this track.");
    } finally {
      setRedetecting(false);
    }
  };

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
    const lyrics = patch.lyricsText !== undefined ? lyricsFromSections(sections) : song.lyrics;
    onChange({ ...song, sections, lyrics });
  };

  const currentSection = song.sections.find((s) => currentTime >= s.start && currentTime < s.end);

  return (
    <div className="space-y-5 p-6">
      {/* Your Song — the beginner-friendly summary + main CTA */}
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Your Song</div>
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
            <Stat icon={<Clock className="h-3.5 w-3.5" />} label={formatTime(song.durationSec)} />
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
          <Button
            variant="secondary"
            size="sm"
            onClick={onOpenDirector}
            title="Open Direct without auto-directing"
          >
            <Clapperboard className="h-4 w-4" />
            Open Director
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={onOpenScripts}
            title="Open Script Studio to extract characters, locations, props, and story cues into shared Bibles"
          >
            <FileText className="h-4 w-4" />
            Deep-analyze script
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
          <Button variant="ghost" size="sm" onClick={onDelete} aria-label="Delete track">
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Transport + map */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => player.skip(-10)}
              disabled={!hasAudio}
              aria-label="Back 10 seconds"
              title="Back 10s"
            >
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
            <Button
              variant="ghost"
              size="icon"
              onClick={() => player.stop()}
              disabled={!hasAudio}
              aria-label="Stop"
              title="Stop"
            >
              <Square className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => player.skip(10)}
              disabled={!hasAudio}
              aria-label="Forward 10 seconds"
              title="Forward 10s"
            >
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

          <SongMapCanvas song={song} currentTime={currentTime} onSeek={seek} />

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
              <div className="flex shrink-0 gap-1.5">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={redetectSections}
                  disabled={redetecting}
                  title="Re-run section detection on this track's audio, keeping lyrics, briefs, and performers."
                >
                  <Radio className={cn("h-3.5 w-3.5", redetecting && "animate-pulse")} />
                  {redetecting ? "Re-detecting…" : "Re-detect sections"}
                </Button>
                <Button variant="secondary" size="sm" onClick={autoDetectPerformers}>
                  <Mic2 className="h-3.5 w-3.5" /> Auto-detect performers
                </Button>
              </div>
            </div>
            <CardDescription>
              Pick a section to add lyrics, performer, mood, and camera direction.
              {needsPerformer > 0 && (
                <span className="ml-1 text-warning">
                  {needsPerformer} section{needsPerformer === 1 ? "" : "s"} need a performer.
                </span>
              )}
              {!song.sections.some((s) => s.kind === "Chorus") && (
                <span className="ml-1 text-warning">
                  No chorus detected — the Director won't plan performance shots. Try “Re-detect
                  sections”, or retag a section as Chorus.
                </span>
              )}
              {redetectError && <span className="ml-1 text-danger">{redetectError}</span>}
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
                  setSections(song.sections.map((x) => (x.id === s.id ? next : x)))
                }
                onSplit={
                  hasAudio && currentTime > s.start + 0.25 && currentTime < s.end - 0.25
                    ? () => splitSectionAt(s.id, currentTime)
                    : undefined
                }
                onDelete={
                  song.sections.length > 1
                    ? () => setSections(song.sections.filter((x) => x.id !== s.id))
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
            <CardContent className="p-6 text-sm text-muted">No sections yet.</CardContent>
          </Card>
        )}
      </div>

      <VoiceLab song={song} onChange={onChange} />
    </div>
  );
}

function Stat({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-elevated px-2 py-0.5 text-xs text-muted">
      {icon}
      {label}
    </span>
  );
}
