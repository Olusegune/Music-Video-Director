// Magic Output Screen — the friendly landing point after Magic Mode finishes.
//
// This is the fix for "Magic Mode throws users into advanced MV Director UI."
// After generation, land HERE — a plain-language summary with simple actions —
// never straight into the full Director surface. Director Mode is one clearly
// labeled button away, not the default.

import { useMemo, useState } from "react";
import {
  Sparkles,
  Users,
  Palette,
  Clapperboard,
  LayoutGrid,
  RefreshCw,
  Wand2,
  BookOpen,
  UsersRound,
  Video,
  Loader2,
  X,
} from "lucide-react";
import { useAppStore } from "@/platform/store/useAppStore";
import { loadSongs, saveSong, type SongMap } from "@/apps/music-video/lib/songBrain";
import { getTreatment, directSong, saveTreatment } from "@/apps/music-video/lib/mvDirector";
import { getTemplate } from "@/platform/lib/templates";
import { loadCast } from "@/apps/music-video/lib/cast";
import { applyVideoTypeBias } from "@/apps/music-video/lib/videoTypes";
import {
  STORY_FEELINGS,
  findStoryFeeling,
  buildStoryBeats,
  type StoryFeelingKey,
} from "@/apps/music-video/lib/storyMode";
import { AssetImage } from "@/platform/components/ui/asset-image";
import { formatTime } from "@/apps/music-video/lib/songBrain";
import { Button } from "@/platform/components/ui/button";
import { Textarea } from "@/platform/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/platform/components/ui/card";
import { cn } from "@/platform/lib/utils";
import { roleColor } from "@/apps/music-video/lib/cast";

export function MagicOutputScreen() {
  const activeSongId = useAppStore((s) => s.activeSongId);
  const activeTemplateId = useAppStore((s) => s.activeTemplateId);
  const openMvDirector = useAppStore((s) => s.openMvDirector);
  const openTemplates = useAppStore((s) => s.openTemplates);
  const openSong = useAppStore((s) => s.openSong);
  const openCast = useAppStore((s) => s.openCast);
  const openTimelineToRender = useAppStore((s) => s.openTimelineToRender);
  const [regenerating, setRegenerating] = useState(false);
  const [changingStory, setChangingStory] = useState(false);
  // Bumped after any local mutation (regenerate, change story) so the memos
  // below re-read from storage instead of serving a stale cached song/treatment.
  const [refreshTick, setRefreshTick] = useState(0);
  const forceRefresh = () => setRefreshTick((n) => n + 1);

  const song = useMemo(
    () => loadSongs().find((s) => s.id === activeSongId) ?? null,
    [activeSongId, refreshTick]
  );
  const treatment = useMemo(
    () => (song ? getTreatment(song.id, song.templateId ?? activeTemplateId) : null),
    [song, activeTemplateId, refreshTick]
  );
  const template = getTemplate(song?.templateId ?? activeTemplateId);
  const cast = useMemo(() => loadCast(), [refreshTick]);

  if (!song) {
    return (
      <div className="flex h-full items-center justify-center p-10 text-center text-sm text-muted">
        No production selected. Head back to the Dashboard to start one.
      </div>
    );
  }

  if (!treatment) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-10 text-center">
        <Sparkles className="h-8 w-8 text-muted" />
        <p className="text-sm text-muted">
          No plan yet for "{song.name}" — direct it first from Song Studio.
        </p>
        <Button onClick={openSong}>Go to Song Studio</Button>
      </div>
    );
  }

  const allShots = treatment.sections.flatMap((sec) => sec.shots);
  const keyMoments = allShots.filter((s) => s.lyric || s.idea).slice(0, 6);
  const renderedShots = allShots.filter((s) => s.imageUrl || s.videoUrl).length;
  const storyFeelingDef = findStoryFeeling(song.storyFeeling);
  const storyFeelingLabel = storyFeelingDef && storyFeelingDef.key !== "none" ? storyFeelingDef.label : null;

  const regenerate = () => {
    if (!song) return;
    setRegenerating(true);
    try {
      const biased = applyVideoTypeBias(template, song.videoType);
      const next = directSong(song, biased);
      saveTreatment(next);
    } finally {
      setRegenerating(false);
      forceRefresh();
    }
  };

  const changeStory = (feeling: StoryFeelingKey, idea: string) => {
    const storyBeats = buildStoryBeats(song, feeling, idea);
    saveSong({
      ...song,
      storyFeeling: feeling,
      storyIdea: feeling === "custom" ? idea.trim() || undefined : undefined,
      storyBeats,
    } satisfies SongMap);
    setChangingStory(false);
    forceRefresh();
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <header className="border-b border-border px-8 py-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl grad-gold">
          <Sparkles className="h-6 w-6 text-[var(--color-gold-foreground)]" />
        </div>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight">
          Your Music Video Is Ready
        </h1>
        <p className="mt-1 text-sm text-muted">
          "{song.name}" · {template?.name ?? "No style"} · {allShots.length} shots
        </p>
      </header>

      <div className="mx-auto w-full max-w-4xl space-y-4 p-6">
        {/* Story */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" /> Story
              {storyFeelingLabel && (
                <span className="ml-1 rounded-full bg-primary/12 px-2 py-0.5 text-[10px] font-medium text-primary">
                  {storyFeelingLabel}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="text-foreground">{treatment.logline}</p>
            <p className="text-xs text-muted">{treatment.energyArc}</p>
            {song.storyBeats && (
              <div className="mt-3 grid gap-2 border-t border-border pt-3 sm:grid-cols-2">
                <StoryBeat label="Opening Setup" text={song.storyBeats.opening} />
                <StoryBeat label="Verse Story Beats" text={song.storyBeats.verse} />
                <StoryBeat label="Chorus Performance Moments" text={song.storyBeats.chorus} />
                <StoryBeat label="Bridge Turning Point" text={song.storyBeats.bridge} />
                <StoryBeat label="Final Chorus Payoff" text={song.storyBeats.finalChorus} />
                <StoryBeat label="Ending Image" text={song.storyBeats.ending} />
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Cast */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UsersRound className="h-4 w-4 text-accent" /> Cast
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cast.length === 0 ? (
                <p className="text-xs text-muted">No performers added yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {cast.map((p) => (
                    <span
                      key={p.id}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-elevated px-2 py-1 text-xs"
                    >
                      <span
                        className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                        style={{ backgroundColor: roleColor(p.role) }}
                      >
                        {(p.name || "?").slice(0, 1).toUpperCase()}
                      </span>
                      {p.name || "Unnamed"}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Visual Style */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-success" /> Visual Style
              </CardTitle>
            </CardHeader>
            <CardContent>
              {template ? (
                <div className="space-y-1.5">
                  <p className="text-sm font-medium">{template.name}</p>
                  <p className="text-xs text-muted">{template.tagline}</p>
                  <div className="flex gap-1">
                    {template.palette.map((c) => (
                      <span
                        key={c}
                        className="h-4 w-4 rounded-full border border-border"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted">No style chosen — neutral cinematic look.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Key Moments / Storyboard Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4 text-primary" /> Storyboard Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            {keyMoments.length === 0 ? (
              <p className="text-xs text-muted">No shots yet.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {keyMoments.map((shot, i) => (
                  <ShotThumb key={shot.id} shot={shot} index={i} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Render Plan */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-4 w-4 text-warning" /> Render Plan
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3 text-center text-sm">
            <div>
              <div className="text-lg font-semibold">{treatment.sections.length}</div>
              <div className="text-[11px] text-muted">sections</div>
            </div>
            <div>
              <div className="text-lg font-semibold">{allShots.length}</div>
              <div className="text-[11px] text-muted">shots planned</div>
            </div>
            <div>
              <div className="text-lg font-semibold">{renderedShots}</div>
              <div className="text-[11px] text-muted">rendered so far</div>
            </div>
          </CardContent>
        </Card>

        {/* Simple actions — everything a beginner needs, nothing more. */}
        <div className="flex flex-wrap justify-center gap-2 pt-2">
          <Button variant="gold" onClick={openTimelineToRender}>
            <Clapperboard className="h-4 w-4" /> Render Video
          </Button>
          <Button variant="secondary" onClick={regenerate} disabled={regenerating}>
            {regenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Regenerate
          </Button>
          <Button variant="secondary" onClick={openTemplates}>
            <Palette className="h-4 w-4" /> Change Style
          </Button>
          <Button variant="secondary" onClick={() => setChangingStory(true)}>
            <BookOpen className="h-4 w-4" /> Change Story
          </Button>
          <Button variant="secondary" onClick={openCast}>
            <Users className="h-4 w-4" /> Edit Characters
          </Button>
          <Button variant="outline" onClick={openMvDirector}>
            <Wand2 className="h-4 w-4" /> Open Director Mode
          </Button>
        </div>
      </div>

      {changingStory && (
        <ChangeStoryOverlay
          current={song.storyFeeling}
          currentIdea={song.storyIdea}
          onCancel={() => setChangingStory(false)}
          onChoose={changeStory}
        />
      )}
    </div>
  );
}

function ChangeStoryOverlay({
  current,
  currentIdea,
  onCancel,
  onChoose,
}: {
  current?: string;
  currentIdea?: string;
  onCancel: () => void;
  onChoose: (feeling: StoryFeelingKey, idea: string) => void;
}) {
  const [feeling, setFeeling] = useState<StoryFeelingKey>((current as StoryFeelingKey) || "none");
  const [idea, setIdea] = useState(currentIdea ?? "");

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-background/80 p-6 backdrop-blur"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-[var(--radius-modal)] border border-border bg-surface shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold">Choose the story feeling</h2>
          <button onClick={onCancel} aria-label="Close">
            <X className="h-4 w-4 text-muted hover:text-foreground" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {STORY_FEELINGS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFeeling(f.key)}
                className={cn(
                  "flex flex-col items-start gap-1 rounded-[var(--radius-card)] border p-2.5 text-left transition-colors",
                  feeling === f.key ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"
                )}
              >
                <span className="text-xs font-semibold">{f.label}</span>
                <span className="text-[10px] leading-snug text-muted">{f.tagline}</span>
              </button>
            ))}
          </div>
          {feeling === "custom" && (
            <Textarea
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="Describe your story idea in a sentence or two…"
              className="mt-3 min-h-20"
              aria-label="Custom story idea"
            />
          )}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" onClick={() => onChoose(feeling, idea)}>
            Apply
          </Button>
        </div>
      </div>
    </div>
  );
}

function StoryBeat({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</div>
      <p className="text-xs text-foreground">{text}</p>
    </div>
  );
}

// A small rotating accent set so "no frame yet" placeholders read as
// intentional storyboard art, not an empty/broken state — same idea as the
// Template card's premium fallback treatment.
const THUMB_ACCENTS = ["#7c5cff", "#c2557f", "#2557c2", "#c28a25", "#25a3c2"];

function ShotThumb({
  shot,
  index,
}: {
  shot: { imageUrl?: string; idea: string; start: number; shotType?: string; movement?: string };
  index: number;
}) {
  const accent = THUMB_ACCENTS[index % THUMB_ACCENTS.length];
  const cameraLine = [shot.shotType, shot.movement].filter(Boolean).join(" · ");
  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-elevated/40">
      <div className="relative aspect-video w-full">
        {shot.imageUrl ? (
          <AssetImage src={shot.imageUrl} alt={shot.idea} className="h-full w-full object-cover" label="Frame" />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{
              backgroundImage: `radial-gradient(130% 110% at 15% -10%, ${accent}50, transparent 60%), linear-gradient(160deg, ${accent}30, #0a0b10 88%)`,
            }}
          >
            <Clapperboard className="h-8 w-8" style={{ color: accent, opacity: 0.55 }} strokeWidth={1.25} />
          </div>
        )}
        <span className="absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-white">
          {formatTime(shot.start)}
        </span>
      </div>
      <div className="space-y-0.5 p-3">
        <p className="line-clamp-2 text-sm leading-snug text-foreground">{shot.idea}</p>
        {cameraLine && <p className="text-[11px] text-muted">{cameraLine}</p>}
      </div>
    </div>
  );
}
