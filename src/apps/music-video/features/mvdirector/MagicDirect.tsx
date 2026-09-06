// Magic Mode's final step — the staged, one-click generation flow.
//
// From an imported song it runs the whole local directing pipeline in sequence,
// with staged progress so it feels deliberate: read the song → assign
// performers → plan the shot list → choreograph the chorus → assemble the
// treatment. Everything is local (no API/keys); on completion it lands the user
// on the Magic Output Screen — a plain-language result page — NOT the full
// Director UI. Director Mode is reached only via that screen's own button.

import { useEffect, useRef, useState } from "react";
import { Sparkles, Check, Loader2, RefreshCw, X } from "lucide-react";
import { Button } from "@/platform/components/ui/button";
import { useAppStore } from "@/platform/store/useAppStore";
import { loadSongs } from "@/apps/music-video/lib/songBrain";
import {
  directSong,
  saveTreatment,
  getTreatment,
  carryGeneratedWork,
} from "@/apps/music-video/lib/mvDirector";
import { getTemplate } from "@/platform/lib/templates";
import { loadCastForSong, savePerformer, autoCastFromSong } from "@/apps/music-video/lib/cast";
import {
  choreographSong,
  saveChoreo,
  getChoreo,
  isChoreoStale,
} from "@/apps/music-video/lib/choreography";
import { applyVideoTypeBias } from "@/apps/music-video/lib/videoTypes";

interface Step {
  label: string;
  run: () => void;
}

export function MagicDirect() {
  const magicSongId = useAppStore((s) => s.magicSongId);
  const setMagicSongId = useAppStore((s) => s.setMagicSongId);
  const setActiveSong = useAppStore((s) => s.setActiveSong);
  const openMagicOutput = useAppStore((s) => s.openMagicOutput);
  const activeTemplateId = useAppStore((s) => s.activeTemplateId);

  const [stepIndex, setStepIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [retryKey, setRetryKey] = useState(0);
  const running = useRef(false);

  useEffect(() => {
    if (!magicSongId || running.current) return;
    const song = loadSongs().find((s) => s.id === magicSongId);
    if (!song) {
      setMagicSongId(null);
      return;
    }
    running.current = true;
    setDone(false);
    setStepIndex(0);
    setError(null);

    const template = applyVideoTypeBias(
      getTemplate(song.templateId ?? activeTemplateId),
      song.videoType
    );
    const nextSteps: Step[] = [
      {
        label: "Reading the song — tempo, sections & lyrics",
        run: () => {},
      },
      {
        label: "Assigning performers to the cast",
        run: () => {
          // Scoped to this song, not the whole app's cast — otherwise Magic
          // Mode only auto-casts the very first song you ever direct, and
          // every song after that silently gets an empty cast because some
          // unrelated song already has performers.
          if (loadCastForSong(song.id).length === 0) {
            for (const p of autoCastFromSong(song, song.id)) savePerformer(p);
          }
        },
      },
      {
        label: "Planning the beat-synced shot list",
        run: () =>
          saveTreatment(
            carryGeneratedWork(getTreatment(song.id, template?.id), directSong(song, template))
              .treatment
          ),
      },
      {
        label: "Choreographing the chorus",
        run: () => {
          // Re-plan when the routine predates the current section list, not
          // only when it is missing. Re-detecting sections used to leave a
          // plan behind that still called the new choruses verses.
          const existing = getChoreo(song.id);
          if (!existing || isChoreoStale(existing, song)) saveChoreo(choreographSong(song));
        },
      },
      {
        label: "Assembling your treatment",
        run: () => {},
      },
    ];
    setSteps(nextSteps);

    let i = 0;
    const tick = () => {
      if (i >= nextSteps.length) {
        setDone(true);
        // Land on the friendly Magic Output Screen — never the full Director UI.
        setTimeout(() => {
          setActiveSong(song.id);
          openMagicOutput();
          setMagicSongId(null);
          running.current = false;
          setDone(false);
          setStepIndex(0);
        }, 650);
        return;
      }
      setStepIndex(i);
      try {
        nextSteps[i].run();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Directing could not complete.");
        running.current = false;
        return;
        /* step failed — keep going so the user still gets a partial treatment */
      }
      i += 1;
      setTimeout(tick, 620);
    };
    setTimeout(tick, 350);
  }, [magicSongId, activeTemplateId, openMagicOutput, setActiveSong, setMagicSongId, retryKey]);

  if (!magicSongId) return null;
  const all = steps;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-background/85 p-6 backdrop-blur">
      <div className="w-full max-w-md overflow-hidden rounded-[var(--radius-modal)] border border-border bg-surface shadow-card">
        <div className="flex items-center gap-3 border-b border-border px-6 py-4">
          <span className="grad-primary flex h-10 w-10 items-center justify-center rounded-xl shadow-sm shadow-primary/30">
            <Sparkles className="h-5 w-5 text-white" />
          </span>
          <div>
            <h2 className="text-base font-semibold leading-tight">Directing your music video</h2>
            <p className="text-xs text-muted">Reading the song and building a full treatment…</p>
          </div>
        </div>

        <div className="space-y-1.5 p-6">
          {all.map((s, i) => {
            const state = done || i < stepIndex ? "done" : i === stepIndex ? "active" : "todo";
            return (
              <div
                key={s.label}
                className="flex items-center gap-3 rounded-[var(--radius-button)] px-2 py-2"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                  {state === "done" ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : state === "active" ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-border" />
                  )}
                </span>
                <span
                  className={state === "todo" ? "text-sm text-muted" : "text-sm text-foreground"}
                >
                  {s.label}
                </span>
              </div>
            );
          })}

          {/* progress bar */}
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-elevated">
            <div
              className="grad-primary h-full rounded-full transition-all duration-500"
              style={{
                width: `${all.length ? ((done ? all.length : stepIndex) / all.length) * 100 : 0}%`,
              }}
            />
          </div>
          {error ? (
            <div className="mt-4 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
              <p>{error}</p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={() => setRetryKey((key) => key + 1)}>
                  <RefreshCw className="h-3.5 w-3.5" /> Retry
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setMagicSongId(null)}>
                  <X className="h-3.5 w-3.5" /> Close
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
