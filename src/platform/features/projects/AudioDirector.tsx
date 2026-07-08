import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Mic, Music, Waves, SlidersHorizontal, Volume2, Loader2 } from "lucide-react";
import type { PromptPack } from "@/platform/lib/types";
import { api } from "@/platform/lib/ipc";
import { Card, CardContent, CardHeader, CardTitle } from "@/platform/components/ui/card";
import { Button } from "@/platform/components/ui/button";
import { InlineInput, InlineTextarea } from "@/platform/components/ui/inline-edit";

type Update = (updater: (prev: PromptPack) => PromptPack) => void;

export function AudioDirector({
  pack,
  update,
  projectId,
}: {
  pack: PromptPack;
  update: Update;
  projectId: string;
}) {
  const a = pack.audio;
  const [voClips, setVoClips] = useState<Record<number, string>>({});
  const [renderingShot, setRenderingShot] = useState<number | null>(null);

  const renderVo = useMutation({
    mutationFn: ({ shot, text }: { shot: number; text: string }) =>
      api.generateVoiceover(projectId, shot, text),
    onMutate: ({ shot }) => setRenderingShot(shot),
    onSuccess: (url, { shot }) => setVoClips((c) => ({ ...c, [shot]: url })),
    onSettled: () => setRenderingShot(null),
  });

  const setVoiceover = (patch: Partial<PromptPack["audio"]["voiceover"]>) =>
    update((p) => ({
      ...p,
      audio: { ...p.audio, voiceover: { ...p.audio.voiceover, ...patch } },
    }));
  const setMusic = (patch: Partial<PromptPack["audio"]["music"]>) =>
    update((p) => ({
      ...p,
      audio: { ...p.audio, music: { ...p.audio.music, ...patch } },
    }));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* Voiceover */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-4 w-4 text-primary" /> Voiceover
            <span className="ml-1 text-[11px] font-normal text-muted">
              {a.voiceover.needed ? "Recommended" : "Optional"}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Field label="Casting / Voice">
            <InlineInput value={a.voiceover.voice} onChange={(v) => setVoiceover({ voice: v })} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Tone">
              <InlineInput value={a.voiceover.tone} onChange={(v) => setVoiceover({ tone: v })} />
            </Field>
            <Field label="Pacing">
              <InlineInput
                value={a.voiceover.pacing}
                onChange={(v) => setVoiceover({ pacing: v })}
              />
            </Field>
          </div>
          <Field label="Script (per shot)">
            <div className="flex flex-col gap-1.5">
              {a.voiceover.lines.map((l, idx) => (
                <div key={l.shot} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="w-10 shrink-0 text-[11px] text-muted">Shot {l.shot}</span>
                    <InlineInput
                      value={l.vo}
                      onChange={(v) =>
                        update((p) => ({
                          ...p,
                          audio: {
                            ...p.audio,
                            voiceover: {
                              ...p.audio.voiceover,
                              lines: p.audio.voiceover.lines.map((x, i) =>
                                i === idx ? { ...x, vo: v } : x
                              ),
                            },
                          },
                        }))
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      aria-label={`Render voiceover for shot ${l.shot}`}
                      title="Render voiceover (ElevenLabs)"
                      disabled={!l.vo.trim() || renderingShot === l.shot}
                      onClick={() => renderVo.mutate({ shot: l.shot, text: l.vo })}
                    >
                      {renderingShot === l.shot ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Volume2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                  {voClips[l.shot] && (
                    <audio
                      controls
                      src={voClips[l.shot]}
                      className="ml-10 h-7 w-[calc(100%-2.5rem)]"
                    />
                  )}
                </div>
              ))}
              {renderVo.isError && (
                <span className="text-[11px] text-danger">{(renderVo.error as Error).message}</span>
              )}
            </div>
          </Field>
        </CardContent>
      </Card>

      {/* Music */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-4 w-4 text-accent" /> Music Direction
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Field label="Direction">
            <InlineTextarea
              value={a.music.direction}
              rows={2}
              onChange={(v) => setMusic({ direction: v })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Genre">
              <InlineInput value={a.music.genre} onChange={(v) => setMusic({ genre: v })} />
            </Field>
            <Field label="BPM">
              <InlineInput value={a.music.bpm} onChange={(v) => setMusic({ bpm: v })} />
            </Field>
          </div>
          <Field label="Arc">
            <InlineInput value={a.music.arc} onChange={(v) => setMusic({ arc: v })} />
          </Field>
          <Field label="References">
            <InlineInput value={a.music.references} onChange={(v) => setMusic({ references: v })} />
          </Field>
        </CardContent>
      </Card>

      {/* SFX */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Waves className="h-4 w-4 text-success" /> SFX Map
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1.5">
          {a.sfx.map((c, idx) => (
            <div key={c.shot} className="flex items-center gap-2">
              <span className="w-10 shrink-0 text-[11px] text-muted">Shot {c.shot}</span>
              <InlineInput
                value={c.cue}
                onChange={(v) =>
                  update((p) => ({
                    ...p,
                    audio: {
                      ...p.audio,
                      sfx: p.audio.sfx.map((x, i) => (i === idx ? { ...x, cue: v } : x)),
                    },
                  }))
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Sound design + mix */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-primary" /> Sound Design & Mix
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Field label="Sound Design Map">
            <InlineTextarea
              value={a.soundDesign}
              rows={3}
              onChange={(v) => update((p) => ({ ...p, audio: { ...p.audio, soundDesign: v } }))}
            />
          </Field>
          <Field label="Mix Notes">
            <InlineTextarea
              value={a.mixNotes}
              rows={2}
              onChange={(v) => update((p) => ({ ...p, audio: { ...p.audio, mixNotes: v } }))}
            />
          </Field>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="px-1.5 text-[11px] uppercase tracking-wide text-muted">{label}</span>
      {children}
    </div>
  );
}
