// Card stage — the second beat of the visual Bible flow.
//
// After the Spark, before any form: generate a few portrait candidates and let
// the user choose the one that feels right. Choosing sets the entity's visual
// anchor and moves on to the details. This is the "start with a face" promise
// made concrete — the long DNA sheet only appears once there's a face to hang
// it on.

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/platform/components/ui/button";
import { AssetImage } from "@/platform/components/ui/asset-image";
import { cn } from "@/platform/lib/utils";

type Slot =
  { status: "loading" } | { status: "ready"; url: string } | { status: "error"; message: string };

export function BibleCardStage({
  entityLabel,
  entityName,
  count = 4,
  generateCandidate,
  onChoose,
  onSkip,
  onBack,
}: {
  entityLabel: string;
  entityName: string;
  count?: number;
  /** Produce one candidate image url. Called `count` times, concurrently. */
  generateCandidate: () => Promise<string>;
  /** The chosen candidate becomes the entity's visual anchor. */
  onChoose: (url: string) => void;
  /** Skip straight to the details form. */
  onSkip: () => void;
  onBack?: () => void;
}) {
  const [slots, setSlots] = useState<Slot[]>(() =>
    Array.from({ length: count }, () => ({ status: "loading" as const }))
  );
  const [chosen, setChosen] = useState<string | null>(null);
  // A run id guards against a slow generation from a previous round writing into
  // the current one after the user hit Regenerate.
  const runId = useRef(0);

  const fill = useCallback(() => {
    const run = (runId.current += 1);
    setChosen(null);
    setSlots(Array.from({ length: count }, () => ({ status: "loading" as const })));
    for (let i = 0; i < count; i += 1) {
      generateCandidate()
        .then((url) => {
          if (runId.current !== run) return;
          setSlots((prev) => {
            const next = [...prev];
            next[i] = url ? { status: "ready", url } : { status: "error", message: "No image" };
            return next;
          });
        })
        .catch((error: unknown) => {
          if (runId.current !== run) return;
          setSlots((prev) => {
            const next = [...prev];
            next[i] = {
              status: "error",
              message: error instanceof Error ? error.message : "Generation failed",
            };
            return next;
          });
        });
    }
  }, [count, generateCandidate]);

  useEffect(() => {
    fill();
    // Generate once on entry; Regenerate re-runs explicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const anyLoading = slots.some((slot) => slot.status === "loading");
  const anyReady = slots.some((slot) => slot.status === "ready");

  return (
    <section className="mx-auto max-w-4xl rounded-2xl border border-border bg-surface/80 p-5 shadow-card">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
            Visual Bible workflow
          </p>
          <h2 className="mt-1 text-lg font-semibold">
            Choose a face for {entityName || `your ${entityLabel.toLowerCase()}`}.
          </h2>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted">
            Pick the candidate that feels right. It becomes the visual anchor — you can refine the
            full sheet afterwards.
          </p>
        </div>
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-[10px] text-primary">
          Stage 2 of 5 · Card
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {slots.map((slot, index) => {
          const isChosen = slot.status === "ready" && slot.url === chosen;
          return (
            <button
              key={index}
              type="button"
              disabled={slot.status !== "ready"}
              onClick={() => slot.status === "ready" && setChosen(slot.url)}
              aria-label={`Candidate ${index + 1}`}
              aria-pressed={isChosen}
              className={cn(
                "group relative aspect-[4/5] overflow-hidden rounded-xl border transition",
                isChosen
                  ? "border-primary ring-2 ring-primary/50"
                  : "border-border hover:border-primary/40",
                slot.status !== "ready" && "cursor-default"
              )}
            >
              {slot.status === "ready" ? (
                <>
                  <AssetImage
                    src={slot.url}
                    alt={`Candidate ${index + 1}`}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                  />
                  {isChosen ? (
                    <span className="absolute right-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground shadow">
                      Chosen
                    </span>
                  ) : null}
                </>
              ) : slot.status === "loading" ? (
                <span className="creative-grid absolute inset-0 flex items-center justify-center text-muted">
                  <Sparkles className="h-5 w-5 animate-pulse" />
                </span>
              ) : (
                <span className="absolute inset-0 flex items-center justify-center p-3 text-center text-[10px] leading-snug text-muted">
                  {slot.message}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Button disabled={!chosen} onClick={() => chosen && onChoose(chosen)}>
          <ArrowRight className="h-4 w-4" /> Use this face
        </Button>
        <Button variant="secondary" onClick={fill} disabled={anyLoading}>
          <RefreshCw className={cn("h-4 w-4", anyLoading && "animate-spin")} /> Regenerate
        </Button>
        <Button variant="ghost" onClick={onSkip}>
          Skip to details
        </Button>
        {onBack ? (
          <Button variant="ghost" className="ml-auto" onClick={onBack}>
            Back
          </Button>
        ) : null}
        {!anyReady && !anyLoading ? (
          <p className="w-full text-[11px] text-warning">
            No candidates yet — add an image provider key, or skip to the details form.
          </p>
        ) : null}
      </div>
    </section>
  );
}
