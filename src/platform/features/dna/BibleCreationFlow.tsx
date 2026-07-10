import { Camera, Check, FileText, Layers3, Sparkles, UserRound } from "lucide-react";
import { useState } from "react";
import { Button } from "@/platform/components/ui/button";
import { Input } from "@/platform/components/ui/input";

const STAGES = [
  ["Spark", "name or one-line idea", Sparkles],
  ["Card", "choose the visual anchor", Camera],
  ["Profile", "review the AI draft", FileText],
  ["Details", "open the full DNA sheet", Layers3],
  ["Creator", "inspect the prompt and seed", UserRound],
] as const;

export function BibleCreationFlow({
  entityLabel,
  onSpark,
  onBlank,
}: {
  entityLabel: string;
  onSpark: (value: string) => void;
  onBlank: () => void;
}) {
  const [spark, setSpark] = useState("");
  return (
    <section className="mx-auto max-w-4xl rounded-2xl border border-border bg-surface/80 p-5 shadow-card">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
            Visual Bible workflow
          </p>
          <h2 className="mt-1 text-lg font-semibold">Start with a face, not a form.</h2>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted">
            Give the {entityLabel.toLowerCase()} a spark. Director Studio will turn it into a visual
            card first, then reveal the details only when you need them.
          </p>
        </div>
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-[10px] text-primary">
          Stage 1 of 5 · Spark
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-5">
        {STAGES.map(([label, detail, Icon], index) => (
          <div
            key={label}
            className={`rounded-xl border p-3 ${index === 0 ? "border-primary/50 bg-primary/10" : "border-border bg-background/40"}`}
          >
            <div className="flex items-center gap-2">
              {index === 0 ? (
                <Icon className="h-4 w-4 text-primary" />
              ) : (
                <Check className="h-3.5 w-3.5 text-muted" />
              )}
              <span className="text-xs font-semibold">{label}</span>
            </div>
            <p className="mt-1 text-[10px] leading-snug text-muted">{detail}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <Input
          value={spark}
          onChange={(event) => setSpark(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && spark.trim()) onSpark(spark.trim());
          }}
          placeholder={`e.g. a luminous ${entityLabel.toLowerCase()} with a scarlet coat…`}
          className="h-10 min-w-[16rem] flex-1"
          aria-label={`Spark a ${entityLabel.toLowerCase()}`}
        />
        <Button disabled={!spark.trim()} onClick={() => onSpark(spark.trim())}>
          <Sparkles className="h-4 w-4" /> Create visual card
        </Button>
        <Button variant="secondary" onClick={onBlank}>
          Open details
        </Button>
      </div>
    </section>
  );
}
