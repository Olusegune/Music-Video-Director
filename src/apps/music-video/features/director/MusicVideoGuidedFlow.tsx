import { useMemo, useState } from "react";
import { Clapperboard, FileText, Loader2, Music, UserPlus } from "lucide-react";
import { GuidedFlowShell } from "@/platform/components/flow";
import { IntakeFormStep } from "@/platform/components/flow/steps/IntakeFormStep";
import { PickCardStep } from "@/platform/components/flow/steps/PickCardStep";
import { SummaryStep } from "@/platform/components/flow/steps/SummaryStep";
import { Button } from "@/platform/components/ui/button";
import { Input } from "@/platform/components/ui/input";
import { Textarea } from "@/platform/components/ui/textarea";
import { Badge } from "@/platform/components/ui/badge";
import { TemplateCard, NoStyleCard } from "@/platform/components/templates/TemplateCard";
import { api, isTauri } from "@/platform/lib/ipc";
import { newCharacter } from "@/platform/lib/characterDna";
import { parseScript } from "@/platform/lib/scriptParser";
import { allTemplates } from "@/platform/lib/templates";
import type { GuidedFlowDefinition, GuidedFlowStepComponentProps } from "@/platform/lib/guidedFlow";
import { useAppStore } from "@/platform/store/useAppStore";
import {
  analyzeAudioFile,
  distributeLyrics,
  loadSongs,
  saveSong,
  type SongMap,
} from "@/apps/music-video/lib/songBrain";
import {
  autoCastFromSong,
  savePerformer,
  type Performer,
  type PerformerRole,
  PERFORMER_ROLES,
  VOCAL_ROLES,
} from "@/apps/music-video/lib/cast";
import { stylePicksFor, VIDEO_TYPES, type VideoTypeKey } from "@/apps/music-video/lib/videoTypes";
import {
  buildStoryBeats,
  STORY_FEELINGS,
  type StoryFeelingKey,
} from "@/apps/music-video/lib/storyMode";
import { cn } from "@/platform/lib/utils";

interface MusicVideoFlowState {
  songId: string | null;
  songName: string;
  songSummary: string;
  lyrics: string;
  cast: Performer[];
  videoType: VideoTypeKey | null;
  storyFeeling: StoryFeelingKey | null;
  storyIdea: string;
  styleId: string | null;
}

const INITIAL_STATE: MusicVideoFlowState = {
  songId: null,
  songName: "",
  songSummary: "",
  lyrics: "",
  cast: [],
  videoType: null,
  storyFeeling: null,
  storyIdea: "",
  styleId: null,
};

function toB64(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    out += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(out);
}

function findSong(id: string | null): SongMap | null {
  if (!id) return null;
  return loadSongs().find((song) => song.id === id) ?? null;
}

// A performer typed into the guided flow is just a name/role until it's
// linked to a Character Bible entry — without that link, "Performance" shots
// have nobody consistent to render (a different anonymous face each time).
// Reuse an existing character with a matching name if one exists (avoids
// creating a duplicate of a character the user already built), otherwise
// create a minimal placeholder character so there's at least a stable
// identity to lock the DNA to; the user can flesh out the portrait later.
async function linkPerformerToCharacter(performer: Performer): Promise<Performer> {
  if (performer.characterId || !performer.name.trim()) return performer;
  try {
    const characters = await api.listCharacters();
    const existing = characters.find(
      (c) => c.name.trim().toLowerCase() === performer.name.trim().toLowerCase()
    );
    if (existing) return { ...performer, characterId: existing.id };
    const created = { ...newCharacter(performer.name.trim()), role: "Supporting" };
    await api.saveCharacter(created);
    return { ...performer, characterId: created.id };
  } catch {
    // Character Bible lookup/creation is best-effort — a performer without a
    // link still saves fine, it just won't have a locked visual identity yet.
    return performer;
  }
}

function applyLyrics(song: SongMap, lyrics: string): SongMap {
  if (!lyrics.trim()) return song;
  const lines = distributeLyrics(lyrics, song.sections);
  const bySection = new Map<string, string[]>();
  for (const line of lines) {
    if (!line.sectionId) continue;
    const sectionLines = bySection.get(line.sectionId) ?? [];
    sectionLines.push(line.text);
    bySection.set(line.sectionId, sectionLines);
  }
  return {
    ...song,
    lyrics: lines,
    parsedScript: parseScript(lyrics),
    sections: song.sections.map((section) => ({
      ...section,
      lyricsText: bySection.get(section.id)?.join("\n") ?? section.lyricsText,
    })),
  };
}

function summarizeSong(song: SongMap): string {
  return `${song.bpm} BPM · ${Math.round(song.durationSec)} sec · ${song.sections.length} sections`;
}

function SongImportStep({ state, patch }: GuidedFlowStepComponentProps<MusicVideoFlowState>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function importSong(file: File) {
    setBusy(true);
    setError(null);
    try {
      const song = await analyzeAudioFile(file);
      if (isTauri) {
        try {
          const ext = file.name.split(".").pop() || "mp3";
          song.audioPath = await api.importSongAudio(
            song.id,
            toB64(new Uint8Array(await file.arrayBuffer())),
            ext
          );
        } catch {
          /* audio import is non-fatal for planning */
        }
      }
      saveSong(song);
      patch({
        songId: song.id,
        songName: song.name,
        songSummary: summarizeSong(song),
        cast: autoCastFromSong(song, song.id),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not analyze that song.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {state.songId ? (
        <div className="rounded-[var(--radius-card)] border border-success/40 bg-success/10 p-4">
          <div className="flex items-center gap-3">
            <Music className="h-5 w-5 text-success" />
            <div>
              <div className="text-sm font-semibold">{state.songName}</div>
              <div className="text-xs text-muted">{state.songSummary}</div>
            </div>
          </div>
        </div>
      ) : (
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--radius-card)] border border-dashed border-border bg-elevated/40 py-12 text-center hover:border-primary/50">
          {busy ? (
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          ) : (
            <Music className="h-7 w-7 text-muted" />
          )}
          <span className="text-sm font-semibold">
            {busy ? "Analyzing the song" : "Import a song"}
          </span>
          <span className="text-xs text-muted">MP3, WAV, M4A, OGG, FLAC</span>
          <input
            type="file"
            accept="audio/*,.mp3,.wav,.m4a,.ogg,.flac"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void importSong(file);
            }}
          />
        </label>
      )}
      {error ? (
        <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function LyricsStep({ state, patch }: GuidedFlowStepComponentProps<MusicVideoFlowState>) {
  const openScripts = useAppStore((s) => s.openScripts);
  const parsed = state.lyrics.trim() ? parseScript(state.lyrics) : null;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-[var(--radius-button)] border border-border bg-elevated px-3 py-2 text-xs font-medium hover:border-primary/40">
          <FileText className="h-3.5 w-3.5" /> Upload lyrics/script
          <input
            type="file"
            accept=".txt,.lrc,.srt,text/plain"
            className="hidden"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              patch({ lyrics: await file.text() });
            }}
          />
        </label>
        {state.lyrics.trim() ? (
          <Badge>{state.lyrics.trim().split(/\r?\n/).filter(Boolean).length} lines</Badge>
        ) : null}
        <Button variant="secondary" size="sm" onClick={openScripts}>
          <FileText className="h-3.5 w-3.5" />
          Deep-analyze in Script Studio
        </Button>
      </div>
      <Textarea
        value={state.lyrics}
        onChange={(event) => patch({ lyrics: event.target.value })}
        placeholder={"Paste lyrics here.\nOptional: skip this for a performance-only plan."}
        className="min-h-48"
      />
      {parsed ? (
        <div className="rounded-[var(--radius-card)] border border-border bg-elevated/30 p-3">
          <div className="mb-2 text-xs font-semibold text-muted">Detected creative hints</div>
          <div className="flex flex-wrap gap-1.5">
            {parsed.songTitle ? <Badge>Title: {parsed.songTitle}</Badge> : null}
            {parsed.genre ? <Badge>{parsed.genre}</Badge> : null}
            {parsed.mood ? <Badge>{parsed.mood}</Badge> : null}
            {parsed.themes.slice(0, 5).map((theme) => (
              <Badge key={theme}>{theme}</Badge>
            ))}
            {parsed.characters.slice(0, 3).map((character) => (
              <Badge key={character}>Character: {character}</Badge>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CastStep({ state, patch }: GuidedFlowStepComponentProps<MusicVideoFlowState>) {
  function update(index: number, next: Partial<Performer>) {
    patch({
      cast: state.cast.map((performer, i) =>
        i === index
          ? {
              ...performer,
              ...next,
              lipSync: next.role ? VOCAL_ROLES.includes(next.role) : performer.lipSync,
            }
          : performer
      ),
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        {state.cast.map((performer, index) => (
          <div
            key={performer.id}
            className="rounded-[var(--radius-card)] border border-border bg-elevated/30 p-3"
          >
            <Input
              value={performer.name}
              onChange={(event) => update(index, { name: event.target.value })}
              placeholder="Performer name"
              className="mb-2"
            />
            <select
              value={performer.role}
              onChange={(event) => update(index, { role: event.target.value as PerformerRole })}
              className="h-9 w-full rounded-[var(--radius-input)] border border-border bg-surface px-3 text-sm"
            >
              {PERFORMER_ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
            <Input
              value={performer.performanceNotes}
              onChange={(event) => update(index, { performanceNotes: event.target.value })}
              placeholder="Vibe, wardrobe, or movement note"
              className="mt-2"
            />
          </div>
        ))}
      </div>
      <Button
        variant="secondary"
        onClick={() =>
          patch((current) => ({
            ...current,
            cast: [
              ...current.cast,
              {
                id: crypto.randomUUID(),
                name: "New Performer",
                role: "Lead Singer",
                danceStyle: "",
                wardrobe: "",
                performanceNotes: "",
                lipSync: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ],
          }))
        }
      >
        <UserPlus /> Add performer
      </Button>
    </div>
  );
}

// Golden-path merge: song import, lyrics, and cast used to be three separate
// steps a user had to click "Continue" through even though lyrics/cast only
// exist once a song does. One screen instead: drop the file, and both lyrics
// and the auto-cast roster appear live underneath, already editable — nothing
// hidden behind an extra click, nothing lost (each piece is still the exact
// same component, just composed together).
function SongCastStep(props: GuidedFlowStepComponentProps<MusicVideoFlowState>) {
  const { state } = props;
  return (
    <div className="space-y-6">
      <SongImportStep {...props} />
      {state.songId ? (
        <>
          <div className="space-y-3 border-t border-border pt-5">
            <div>
              <h3 className="text-sm font-semibold">Lyrics / script</h3>
              <p className="text-xs text-muted">
                Optional — source text for story, hooks, and section staging. Skip for a
                performance-only plan.
              </p>
            </div>
            <LyricsStep {...props} />
          </div>
          <div className="space-y-3 border-t border-border pt-5">
            <div>
              <h3 className="text-sm font-semibold">Performers</h3>
              <p className="text-xs text-muted">
                Auto-cast from the song — confirm names, roles, and vibe, or add more.
              </p>
            </div>
            <CastStep {...props} />
          </div>
        </>
      ) : null}
    </div>
  );
}

function VideoTypeStep({ state, patch }: GuidedFlowStepComponentProps<MusicVideoFlowState>) {
  return (
    <PickCardStep
      value={state.videoType ?? undefined}
      onChange={(id) => patch({ videoType: id as VideoTypeKey })}
      options={VIDEO_TYPES.map((type) => ({
        id: type.key,
        title: type.label,
        description: type.tagline,
      }))}
    />
  );
}

function StoryStep({ state, patch }: GuidedFlowStepComponentProps<MusicVideoFlowState>) {
  return (
    <div className="space-y-4">
      <PickCardStep
        value={state.storyFeeling ?? undefined}
        onChange={(id) => patch({ storyFeeling: id as StoryFeelingKey })}
        options={STORY_FEELINGS.map((feeling) => ({
          id: feeling.key,
          title: feeling.label,
          description: feeling.tagline,
        }))}
      />
      {state.storyFeeling === "custom" ? (
        <Textarea
          value={state.storyIdea}
          onChange={(event) => patch({ storyIdea: event.target.value })}
          placeholder="Describe the custom story in a few sentences."
          className="min-h-24"
        />
      ) : null}
    </div>
  );
}

function StyleStep({ state, patch }: GuidedFlowStepComponentProps<MusicVideoFlowState>) {
  const stylePicks = stylePicksFor(state.videoType, allTemplates());
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      <NoStyleCard active={state.styleId === null} onClick={() => patch({ styleId: null })} />
      {stylePicks.map((template) => (
        <TemplateCard
          key={template.id}
          template={template}
          active={state.styleId === template.id}
          onClick={() => patch({ styleId: template.id })}
        />
      ))}
    </div>
  );
}

function CreativeControls({ state, patch }: GuidedFlowStepComponentProps<MusicVideoFlowState>) {
  return (
    <IntakeFormStep
      value={{
        storyIdea: state.storyIdea,
      }}
      onChange={(next) => patch({ storyIdea: next.storyIdea ?? "" })}
      fields={[
        {
          id: "storyIdea",
          label: "Additional creative direction",
          type: "textarea",
          placeholder: "Performance tone, visual motifs, colors, pacing, or must-have moments.",
        },
      ]}
    />
  );
}

function CreatorControls({ state }: GuidedFlowStepComponentProps<MusicVideoFlowState>) {
  const prompt = [
    `Song: ${state.songName || "Untitled"}`,
    `Video type: ${state.videoType ?? "auto"}`,
    `Story feeling: ${state.storyFeeling ?? "none"}`,
    `Style id: ${state.styleId ?? "neutral cinematic"}`,
    `Cast: ${state.cast.map((performer) => performer.name || performer.role).join(", ") || "auto"}`,
  ].join("\n");
  return (
    <pre className="max-h-56 overflow-auto rounded-md border border-border bg-background/70 p-3 text-xs text-muted">
      {prompt}
    </pre>
  );
}

function DirectStep({ state }: GuidedFlowStepComponentProps<MusicVideoFlowState>) {
  const type = VIDEO_TYPES.find((item) => item.key === state.videoType)?.label ?? "Auto";
  const story =
    STORY_FEELINGS.find((item) => item.key === state.storyFeeling)?.label ?? "Performance only";
  const style = state.styleId
    ? (allTemplates().find((template) => template.id === state.styleId)?.name ?? state.styleId)
    : "Neutral cinematic";
  return (
    <SummaryStep
      title="Ready to direct"
      items={[
        { label: "Song", value: state.songName || "No song imported" },
        { label: "Video type", value: type },
        { label: "Story", value: story },
        { label: "Style", value: style },
        { label: "Performers", value: `${state.cast.length || 0}` },
        { label: "Lyrics", value: state.lyrics.trim() ? "Added" : "Skipped" },
      ]}
    />
  );
}

export function MusicVideoGuidedFlow() {
  const open = useAppStore((state) => state.directorOpen);
  const setOpen = useAppStore((state) => state.setDirectorOpen);
  const setActiveSong = useAppStore((state) => state.setActiveSong);
  const setActiveTemplate = useAppStore((state) => state.setActiveTemplate);
  const setMagicSongId = useAppStore((state) => state.setMagicSongId);

  const definition = useMemo<GuidedFlowDefinition<MusicVideoFlowState>>(
    () => ({
      id: "music-video.magic-v2",
      moduleId: "music-video",
      version: 1,
      title: "Music Video Magic Flow",
      description: "A guided Director Studio flow for turning a song into a planned music video.",
      initialState: INITIAL_STATE,
      steps: [
        {
          id: "song",
          title: "Song, Lyrics & Cast",
          subtitle: "Import a track — lyrics and the cast roster populate live, both editable.",
          component: SongCastStep,
          validate: (state) => Boolean(state.songId) || "Import a song first.",
          advancedComponent: CreativeControls,
          technicalComponent: CreatorControls,
        },
        {
          id: "video-type",
          title: "Video Type",
          subtitle: "Choose the directing bias for shot planning.",
          component: VideoTypeStep,
          advancedComponent: CreativeControls,
          technicalComponent: CreatorControls,
          skippable: true,
        },
        {
          id: "story",
          title: "Story Feeling",
          subtitle: "Pick the narrative layer or keep it performance-first.",
          component: StoryStep,
          advancedComponent: CreativeControls,
          technicalComponent: CreatorControls,
          skippable: true,
        },
        {
          id: "style",
          title: "Visual Style",
          subtitle: "Choose a reusable style template for the Director Brain.",
          component: StyleStep,
          advancedComponent: CreativeControls,
          technicalComponent: CreatorControls,
          skippable: true,
        },
        {
          id: "direct",
          title: "Direct",
          subtitle: "Approve and hand off to the existing MagicDirect pipeline.",
          component: DirectStep,
          technicalComponent: CreatorControls,
        },
      ],
      onComplete: async (state) => {
        const song = findSong(state.songId);
        if (!song) return;
        const withLyrics = applyLyrics(song, state.lyrics);
        const storyFeeling = state.storyFeeling ?? "none";
        const storyBeats = buildStoryBeats(
          withLyrics,
          storyFeeling,
          storyFeeling === "custom" ? state.storyIdea : undefined
        );
        const finalSong: SongMap = {
          ...withLyrics,
          templateId: state.styleId ?? undefined,
          videoType: state.videoType ?? undefined,
          storyFeeling,
          storyIdea: storyFeeling === "custom" ? state.storyIdea.trim() || undefined : undefined,
          storyBeats,
        };
        saveSong(finalSong);
        await Promise.all(
          state.cast.map(async (performer) => savePerformer(await linkPerformerToCharacter(performer)))
        );
        setActiveSong(finalSong.id);
        setActiveTemplate(state.styleId);
        setMagicSongId(finalSong.id);
        setOpen(false);
      },
    }),
    [setActiveSong, setActiveTemplate, setMagicSongId, setOpen]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[85] overflow-y-auto bg-background/90 p-6 backdrop-blur">
      <div
        className={cn(
          "mx-auto flex min-h-[calc(100vh-48px)] w-full max-w-6xl flex-col rounded-[var(--radius-modal)] border border-border bg-background p-5 shadow-card"
        )}
      >
        <div className="mb-4 flex items-center gap-3 border-b border-border pb-4">
          <span className="grad-primary flex h-10 w-10 items-center justify-center rounded-xl text-white">
            <Clapperboard className="h-5 w-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold">Magic Flow</h2>
              <Badge variant="primary">Guided Flow</Badge>
            </div>
            <p className="text-xs text-muted">
              Same Music Video Director engine, platform flow shell.
            </p>
          </div>
        </div>
        <GuidedFlowShell
          definition={definition}
          onExit={() => setOpen(false)}
          onComplete={() => undefined}
        />
      </div>
    </div>
  );
}
