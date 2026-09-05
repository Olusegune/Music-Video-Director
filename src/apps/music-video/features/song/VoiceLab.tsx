// Voice & spoken audio lab + private AudioPlayer (extracted from SongStudio.tsx, Phase 2).
import { useState } from "react";
import { Loader2, Trash2, Mic2, Plus } from "lucide-react";
import {
  AUDIO_TRACK_KINDS,
  defaultAudioAt,
  defaultAudioDuck,
  type SongMap,
  type AudioTrack,
  type AudioTrackKind,
} from "@/apps/music-video/lib/songBrain";
import { api } from "@/platform/lib/ipc";
import { useProviderReadiness } from "@/platform/lib/providerReady";
import { cn } from "@/platform/lib/utils";
import { Button } from "@/platform/components/ui/button";
import { Input } from "@/platform/components/ui/input";
import { Textarea } from "@/platform/components/ui/textarea";
import { Badge } from "@/platform/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/platform/components/ui/card";
import { useAssetSrc } from "@/platform/components/ui/asset-image";
import { Select } from "@/platform/components/ui/select";

export function VoiceLab({ song, onChange }: { song: SongMap; onChange: (next: SongMap) => void }) {
  const [kind, setKind] = useState<AudioTrackKind>("Intro tag");
  const [text, setText] = useState("");
  const [voice, setVoice] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tracks = song.audioTracks ?? [];
  const { isReady } = useProviderReadiness();
  const audioReady = isReady(["elevenlabs"]);

  const generate = async () => {
    if (!text.trim()) return;
    setError(null);
    setBusy(true);
    try {
      const url = await api.generateMvAudio(song.id, text.trim(), voice.trim() || undefined);
      const track: AudioTrack = {
        id: crypto.randomUUID(),
        kind,
        text: text.trim(),
        voice: voice.trim(),
        url,
        atSec: defaultAudioAt(kind, song.durationSec),
        volume: 1,
        duck: defaultAudioDuck(kind),
        createdAt: new Date().toISOString(),
      };
      onChange({ ...song, audioTracks: [track, ...tracks] });
      setText("");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not generate audio. Add an ElevenLabs key in API Keys."
      );
    } finally {
      setBusy(false);
    }
  };

  const remove = (id: string) =>
    onChange({ ...song, audioTracks: tracks.filter((t) => t.id !== id) });

  const patchTrack = (id: string, patch: Partial<AudioTrack>) =>
    onChange({
      ...song,
      audioTracks: tracks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic2 className="h-4 w-4 text-accent" />
          Voice & spoken audio
        </CardTitle>
        <CardDescription>
          Generate spoken layers — intro tags, ad-libs, narration, spoken hooks — with ElevenLabs.
          The master track stays your imported song.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Select
            value={kind}
            onChange={(value: string) => setKind(value as AudioTrackKind)}
            className="h-9 rounded-[var(--radius-input)] border border-border bg-surface px-2 text-sm text-foreground focus-visible:border-primary focus-visible:outline-none"
            aria-label="Audio kind"
          >
            {AUDIO_TRACK_KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </Select>
          <Input
            value={voice}
            onChange={(e) => setVoice(e.target.value)}
            placeholder="Voice (ElevenLabs voice id / name — optional)"
            className="h-9 max-w-xs flex-1"
            aria-label="Voice"
          />
        </div>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What should be spoken? e.g. “Wheelbarrow… let’s go.”"
          className="min-h-16"
          aria-label="Spoken text"
        />
        {error && <p className="text-xs text-danger">{error}</p>}
        {!audioReady && (
          <p className="text-xs text-warning">
            No ElevenLabs key configured — add one in API Keys to generate audio.
          </p>
        )}
        <Button
          variant="secondary"
          onClick={generate}
          disabled={busy || !text.trim() || !audioReady}
          title={audioReady ? undefined : "No ElevenLabs key — add one in API Keys"}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Generate audio
        </Button>

        {tracks.length > 0 && (
          <div className="space-y-2 pt-1">
            {tracks.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-3 rounded-[var(--radius-button)] border border-border bg-surface p-2.5"
              >
                <Badge variant="accent" className="shrink-0 normal-case">
                  {t.kind}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{t.text}</p>
                  <AudioPlayer src={t.url} />
                </div>
                <label
                  className="flex shrink-0 items-center gap-1 text-[11px] text-muted"
                  title="Start time in the render (seconds)"
                >
                  @
                  <Input
                    type="number"
                    min={0}
                    step={0.5}
                    value={t.atSec ?? 0}
                    onChange={(e) =>
                      patchTrack(t.id, {
                        atSec: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    className="h-7 w-16 px-1.5 text-center text-xs"
                    aria-label="Start time (seconds)"
                  />
                  s
                </label>
                <label
                  className="flex shrink-0 items-center gap-1 text-[11px] text-muted"
                  title="Layer volume"
                >
                  <input
                    type="range"
                    min={0}
                    max={2}
                    step={0.1}
                    value={t.volume ?? 1}
                    onChange={(e) => patchTrack(t.id, { volume: Number(e.target.value) })}
                    className="h-1 w-16 accent-primary"
                    aria-label="Layer volume"
                  />
                  <span className="w-8 tabular-nums">{Math.round((t.volume ?? 1) * 100)}%</span>
                </label>
                <button
                  onClick={() => patchTrack(t.id, { duck: !t.duck })}
                  className={cn(
                    "shrink-0 rounded-md px-2 py-1 text-[10px] font-semibold transition-colors",
                    t.duck
                      ? "bg-primary/15 text-primary"
                      : "bg-elevated text-muted hover:text-foreground"
                  )}
                  title="Duck the music under this layer (sidechain)"
                >
                  DUCK
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => remove(t.id)}
                  aria-label="Delete audio"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AudioPlayer({ src }: { src: string }) {
  const resolved = useAssetSrc(src);
  if (!resolved) return null;
  return <audio src={resolved} controls className="mt-1 h-8 w-full max-w-sm" />;
}
