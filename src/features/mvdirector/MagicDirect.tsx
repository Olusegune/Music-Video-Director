// "Direct This Music Video" — the one-click magic flow.
//
// From an imported song it runs the whole local directing pipeline in sequence,
// with staged progress so it feels deliberate: read the song → assign
// performers → plan the shot list → choreograph the chorus → assemble the
// treatment. Everything is local (no API/keys); on completion it drops the user
// straight into the MV Director with a finished, editable treatment.

import { useEffect, useRef, useState } from "react";
import { Sparkles, Check, Loader2 } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { loadSongs } from "@/lib/songBrain";
import { directSong, saveTreatment } from "@/lib/mvDirector";
import { getTemplate } from "@/lib/templates";
import { loadCast, savePerformer, autoCastFromSong } from "@/lib/cast";
import { choreographSong, saveChoreo, getChoreo } from "@/lib/choreography";

interface Step {
  label: string;
  run: () => void;
}

export function MagicDirect() {
  const magicSongId = useAppStore((s) => s.magicSongId);
  const setMagicSongId = useAppStore((s) => s.setMagicSongId);
  const setActiveSong = useAppStore((s) => s.setActiveSong);
  const openMvDirector = useAppStore((s) => s.openMvDirector);
  const activeTemplateId = useAppStore((s) => s.activeTemplateId);

  const [stepIndex, setStepIndex] = useState(0);
  const [done, setDone] = useState(false);
  const running = useRef(false);
  const steps = useRef<Step[]>([]);

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

    const template = getTemplate(song.templateId ?? activeTemplateId);
    steps.current = [
      {
        label: "Reading the song — tempo, sections & lyrics",
        run: () => {},
      },
      {
        label: "Assigning performers to the cast",
        run: () => {
          if (loadCast().length === 0) {
            for (const p of autoCastFromSong(song)) savePerformer(p);
          }
        },
      },
      {
        label: "Planning the beat-synced shot list",
        run: () => saveTreatment(directSong(song, template)),
      },
      {
        label: "Choreographing the chorus",
        run: () => {
          if (!getChoreo(song.id)) saveChoreo(choreographSong(song));
        },
      },
      {
        label: "Assembling your treatment",
        run: () => {},
      },
    ];

    let i = 0;
    const tick = () => {
      if (i >= steps.current.length) {
        setDone(true);
        // Land in the MV Director with the finished treatment.
        setTimeout(() => {
          setActiveSong(song.id);
          openMvDirector();
          setMagicSongId(null);
          running.current = false;
          setDone(false);
          setStepIndex(0);
        }, 650);
        return;
      }
      setStepIndex(i);
      try {
        steps.current[i].run();
      } catch {
        /* step failed — keep going so the user still gets a partial treatment */
      }
      i += 1;
      setTimeout(tick, 620);
    };
    setTimeout(tick, 350);
  }, [magicSongId, activeTemplateId, openMvDirector, setActiveSong, setMagicSongId]);

  if (!magicSongId) return null;
  const all = steps.current;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-background/85 p-6 backdrop-blur">
      <div className="w-full max-w-md overflow-hidden rounded-[var(--radius-modal)] border border-border bg-surface shadow-card">
        <div className="flex items-center gap-3 border-b border-border px-6 py-4">
          <span className="grad-primary flex h-10 w-10 items-center justify-center rounded-xl shadow-sm shadow-primary/30">
            <Sparkles className="h-5 w-5 text-white" />
          </span>
          <div>
            <h2 className="text-base font-semibold leading-tight">
              Directing your music video
            </h2>
            <p className="text-xs text-muted">
              Reading the song and building a full treatment…
            </p>
          </div>
        </div>

        <div className="space-y-1.5 p-6">
          {all.map((s, i) => {
            const state =
              done || i < stepIndex ? "done" : i === stepIndex ? "active" : "todo";
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
                  className={
                    state === "todo"
                      ? "text-sm text-muted"
                      : "text-sm text-foreground"
                  }
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
        </div>
      </div>
    </div>
  );
}
