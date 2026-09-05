import { useMemo, useState } from "react";
import {
  BookOpen,
  Clapperboard,
  Loader2,
  Palette,
  RefreshCw,
  SlidersHorizontal,
  Users,
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
import { Card, CardContent } from "@/platform/components/ui/card";
import { Filmstrip, FilmstripItem } from "@/platform/components/visual/Filmstrip";
import { RevealStage } from "@/platform/components/visual/RevealStage";
import { cn } from "@/platform/lib/utils";

export function MagicOutputScreen() {
  const activeSongId = useAppStore((state) => state.activeSongId);
  const activeTemplateId = useAppStore((state) => state.activeTemplateId);
  const openMvDirector = useAppStore((state) => state.openMvDirector);
  const openTemplates = useAppStore((state) => state.openTemplates);
  const openSong = useAppStore((state) => state.openSong);
  const openCast = useAppStore((state) => state.openCast);
  const openTimelineToRender = useAppStore((state) => state.openTimelineToRender);
  const [regenerating, setRegenerating] = useState(false);
  const [changingStory, setChangingStory] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const song = useMemo(
    () => loadSongs().find((item) => item.id === activeSongId) ?? null,
    [activeSongId, refreshTick]
  );
  const treatment = useMemo(
    () => (song ? getTreatment(song.id, song.templateId ?? activeTemplateId) : null),
    [song, activeTemplateId, refreshTick]
  );
  const template = getTemplate(song?.templateId ?? activeTemplateId);
  const cast = useMemo(() => loadCast(), [refreshTick]);

  if (!song)
    return <Empty message="No production selected. Head back to the Dashboard to start one." />;
  if (!treatment)
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-10 text-center">
        <p className="text-sm text-muted">
          No plan yet for “{song.name}” — direct it first from Song Studio.
        </p>
        <Button onClick={openSong}>Go to Song Studio</Button>
      </div>
    );

  const allShots = treatment.sections.flatMap((section) => section.shots);
  const keyMoments = allShots.filter((shot) => shot.lyric || shot.idea).slice(0, 6);
  const renderedShots = allShots.filter((shot) => shot.imageUrl || shot.videoUrl).length;
  const storyFeeling = findStoryFeeling(song.storyFeeling);
  const storyLabel = storyFeeling?.key !== "none" ? storyFeeling?.label : null;
  const regenerate = () => {
    setRegenerating(true);
    try {
      saveTreatment(directSong(song, applyVideoTypeBias(template, song.videoType)));
    } finally {
      setRegenerating(false);
      setRefreshTick((value) => value + 1);
    }
  };
  const changeStory = (feeling: StoryFeelingKey, idea: string) => {
    saveSong({
      ...song,
      storyFeeling: feeling,
      storyIdea: feeling === "custom" ? idea.trim() || undefined : undefined,
      storyBeats: buildStoryBeats(song, feeling, idea),
    } satisfies SongMap);
    setChangingStory(false);
    setRefreshTick((value) => value + 1);
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <header className="border-b border-border px-8 py-6 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight">Your treatment is ready.</h1>
        <p className="mt-2 text-sm text-muted">
          {allShots.length} shots directed across {treatment.sections.length} sections — render when
          you’re ready.
        </p>
      </header>
      <div className="mx-auto w-full max-w-6xl space-y-6 p-6">
        <RevealStage revealed title="Treatment premiere" className="border-warning/30 p-0">
          <div className="relative min-h-[360px] overflow-hidden rounded-xl bg-black">
            <ShotBoard shot={keyMoments[0] ?? allShots[0]} hero />
            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-8 sm:p-12">
              <div className="text-xs font-semibold uppercase tracking-[0.3em] text-warning">
                A Director Studio treatment
              </div>
              <h2 className="mt-3 max-w-3xl text-4xl font-black tracking-[-0.04em] text-white sm:text-6xl">
                {song.name}
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/75">{treatment.logline}</p>
            </div>
          </div>
        </RevealStage>

        <Filmstrip label="Storyboard filmstrip">
          {keyMoments.map((shot) => (
            <FilmstripItem key={shot.id} className="animate-[studio-enter_220ms_ease-out_both]">
              <ShotBoard shot={shot} />
            </FilmstripItem>
          ))}
        </Filmstrip>

        <Card>
          <CardContent className="grid gap-5 p-5 md:grid-cols-[1.6fr_1fr_auto] md:items-center">
            <div>
              <div className="eyebrow">Treatment</div>
              <p className="mt-2 text-sm leading-6">{treatment.logline}</p>
              <p className="mt-1 text-xs text-muted">{treatment.energyArc}</p>
            </div>
            <div>
              <div className="eyebrow">Credits</div>
              <p className="mt-2 text-sm">
                {cast.length
                  ? `Starring ${cast.map((person) => person.name || "Unnamed").join(", ")}`
                  : "Cast open"}
              </p>
              <p className="mt-1 text-xs text-muted">
                {template?.name ?? "Neutral cinematic look"}
                {storyLabel ? ` · ${storyLabel}` : ""}
              </p>
            </div>
            <div className="flex gap-6 text-center">
              <Stat value={treatment.sections.length} label="sections" />
              <Stat value={allShots.length} label="shots" />
              <Stat value={renderedShots} label="rendered" />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col items-center gap-4 rounded-2xl border border-warning/20 bg-warning/5 p-6">
          <Button variant="gold" size="lg" className="min-w-72" onClick={openTimelineToRender}>
            <Clapperboard className="h-5 w-5" /> Render Video — {allShots.length} shots
          </Button>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="mr-1 flex items-center gap-1 text-xs font-semibold text-muted">
              <SlidersHorizontal className="h-3.5 w-3.5" /> Adjust
            </span>
            <Button variant="secondary" onClick={regenerate} disabled={regenerating}>
              {regenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}{" "}
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
          </div>
          <button className="text-sm text-primary hover:underline" onClick={openMvDirector}>
            Fine-tune in the studio →
          </button>
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

function Empty({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center p-10 text-center text-sm text-muted">
      {message}
    </div>
  );
}
function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="text-xl font-semibold">{value}</div>
      <div className="text-[10px] text-muted">{label}</div>
    </div>
  );
}

/** Exported for tests: an empty slot must never look like a generated frame. */
export function ShotBoard({
  shot,
  hero = false,
}: {
  shot?: { imageUrl?: string; idea: string; start: number; shotType?: string; movement?: string };
  hero?: boolean;
}) {
  if (!shot)
    return (
      <div className="flex h-full min-h-[360px] flex-col items-center justify-center gap-2 bg-surface text-muted">
        <Clapperboard className="h-7 w-7 opacity-40" />
        <span className="text-xs">No shot here yet</span>
      </div>
    );
  const camera = [shot.shotType, shot.movement].filter(Boolean).join(" · ");
  return (
    <div
      className={cn(
        "overflow-hidden border border-border bg-elevated/40",
        hero ? "h-full border-0" : "rounded-xl"
      )}
    >
      <div className={cn("relative w-full", hero ? "h-full min-h-[360px]" : "aspect-video")}>
        {shot.imageUrl ? (
          <AssetImage
            src={shot.imageUrl}
            alt={shot.idea}
            className="h-full w-full object-cover"
            label="Frame"
          />
        ) : (
          // Deliberately plain. This slot used to render a per-shot gradient with
          // abstract shapes laid out like a composition, which read as a real
          // generated frame — each tile a different colour made the board look
          // like finished work that didn't exist. An empty slot should look empty.
          <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 bg-surface text-muted">
            <Clapperboard className="h-6 w-6 opacity-40" />
            <span className="text-[10px]">Not generated yet</span>
          </div>
        )}
        <span className="absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] tabular-nums text-white">
          {formatTime(shot.start)}
        </span>
      </div>
      {!hero && (
        <div className="space-y-0.5 p-3">
          <p className="line-clamp-2 text-sm leading-snug">{shot.idea}</p>
          {camera && <p className="text-[11px] text-muted">{camera}</p>}
        </div>
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
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-surface shadow-card"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold">Choose the story feeling</h2>
          <button onClick={onCancel} aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {STORY_FEELINGS.map((item) => (
              <button
                key={item.key}
                onClick={() => setFeeling(item.key)}
                className={cn(
                  "rounded-xl border p-2.5 text-left",
                  feeling === item.key ? "border-primary bg-primary/10" : "border-border"
                )}
              >
                <span className="text-xs font-semibold">{item.label}</span>
                <span className="mt-1 block text-[10px] text-muted">{item.tagline}</span>
              </button>
            ))}
          </div>
          {feeling === "custom" && (
            <Textarea
              value={idea}
              onChange={(event) => setIdea(event.target.value)}
              placeholder="Describe your story idea…"
              className="mt-3"
            />
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
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
