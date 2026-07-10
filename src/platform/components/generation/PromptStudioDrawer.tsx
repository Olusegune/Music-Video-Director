// Prompt Studio — see the whole prompt, not just the part you typed.
//
// A drawer over any generation surface. It shows every layer that will be sent
// (system rules, Bible DNA, style presets, your text, negatives), lets Creator
// tier mute or override any of them, resolves `{variables}` from project
// context, and previews exactly what the model receives.
//
// It is not a screen. It never becomes a place you "go" — it opens over the
// work you are already doing and closes again.

import { useEffect } from "react";
import { EyeOff, Eye, X, AlertTriangle } from "lucide-react";
import { cn } from "@/platform/lib/utils";
import { Textarea } from "@/platform/components/ui/textarea";
import {
  composePrompt,
  setLayer,
  usedVariables,
  type PromptLayer,
  type PromptPipeline,
} from "@/platform/lib/promptPipeline";

const KIND_LABEL: Record<PromptLayer["kind"], string> = {
  system: "System",
  dna: "DNA",
  style: "Style",
  template: "Template",
  user: "You",
  negative: "Negative",
};

const KIND_TONE: Record<PromptLayer["kind"], string> = {
  system: "border-border text-muted",
  dna: "border-primary/40 text-primary",
  style: "border-accent/40 text-accent",
  template: "border-border text-muted",
  user: "border-success/40 text-success",
  negative: "border-danger/40 text-danger",
};

export function PromptStudioDrawer({
  open,
  onClose,
  pipeline,
  onChange,
  /** Creator may mute and override layers; Studio sees a read-only summary. */
  editable,
}: {
  open: boolean;
  onClose: () => void;
  pipeline: PromptPipeline;
  onChange: (next: PromptPipeline) => void;
  editable: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const composed = composePrompt(pipeline);
  const variables = usedVariables(pipeline);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-label="Prompt Studio">
      <button
        type="button"
        aria-label="Close Prompt Studio"
        className="flex-1 bg-black/50"
        onClick={onClose}
      />
      <aside className="flex h-full w-[min(30rem,100vw)] flex-col border-l border-border bg-surface shadow-2xl">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold">Prompt Studio</h2>
            <p className="text-[11px] text-muted">
              {editable
                ? "Mute or override any layer. This is exactly what the model receives."
                : "Everything that will be sent to the model."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-elevated hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {composed.missingVariables.length > 0 ? (
            <div className="flex gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-[11px] text-warning">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <p>
                No value for{" "}
                <span className="font-semibold">
                  {composed.missingVariables.map((name) => `{${name}}`).join(", ")}
                </span>
                . The model would receive the placeholder text as written.
              </p>
            </div>
          ) : null}

          {/* Layers */}
          <section className="space-y-2">
            <h3 className="text-[10px] font-semibold uppercase tracking-wide text-muted">
              Prompt layers
            </h3>
            {pipeline.layers.map((layer) => (
              <div
                key={layer.id}
                className={cn(
                  "rounded-lg border p-2.5 transition",
                  layer.muted
                    ? "border-border/60 bg-elevated/30 opacity-60"
                    : "border-border bg-elevated/50"
                )}
              >
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={cn(
                        "shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
                        KIND_TONE[layer.kind]
                      )}
                    >
                      {KIND_LABEL[layer.kind]}
                    </span>
                    <span className="truncate text-[11px] font-medium">{layer.label}</span>
                  </div>
                  {editable ? (
                    <button
                      type="button"
                      aria-label={layer.muted ? `Unmute ${layer.label}` : `Mute ${layer.label}`}
                      title={layer.muted ? "Include this layer" : "Exclude this layer"}
                      onClick={() =>
                        onChange(setLayer(pipeline, layer.id, { muted: !layer.muted }))
                      }
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted hover:bg-surface hover:text-foreground"
                    >
                      {layer.muted ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </button>
                  ) : null}
                </div>

                {layer.source ? (
                  <p className="mb-1.5 truncate text-[10px] text-muted">{layer.source}</p>
                ) : null}

                {editable && layer.editable ? (
                  <Textarea
                    value={layer.text}
                    aria-label={`${layer.label} text`}
                    onChange={(event) =>
                      onChange(setLayer(pipeline, layer.id, { text: event.target.value }))
                    }
                    className="min-h-14 text-[12px]"
                  />
                ) : (
                  <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-muted">
                    {layer.text || <span className="italic">empty</span>}
                  </p>
                )}
              </div>
            ))}
          </section>

          {/* Variables */}
          {variables.length > 0 ? (
            <section className="space-y-1.5">
              <h3 className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                Variables
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {variables.map((name) => {
                  const value = pipeline.variables?.[name];
                  const resolved = Boolean(value);
                  return (
                    <span
                      key={name}
                      className={cn(
                        "rounded-md border px-2 py-1 text-[10px]",
                        resolved
                          ? "border-border bg-elevated text-foreground"
                          : "border-warning/40 bg-warning/10 text-warning"
                      )}
                      title={resolved ? value : "No value in this project"}
                    >
                      <span className="font-mono">{`{${name}}`}</span>
                      {resolved ? <span className="ml-1 text-muted">→ {value}</span> : null}
                    </span>
                  );
                })}
              </div>
            </section>
          ) : null}

          {/* Resolved output */}
          <section className="space-y-1.5">
            <h3 className="text-[10px] font-semibold uppercase tracking-wide text-muted">
              What the model receives
            </h3>
            <p className="whitespace-pre-wrap rounded-lg border border-border bg-background p-3 text-[11px] leading-relaxed">
              {composed.prompt || (
                <span className="italic text-muted">Nothing — every layer is muted.</span>
              )}
            </p>
            {composed.negativePrompt ? (
              <p className="whitespace-pre-wrap rounded-lg border border-danger/30 bg-danger/5 p-3 text-[11px] leading-relaxed text-danger">
                Negative: {composed.negativePrompt}
              </p>
            ) : null}
          </section>
        </div>
      </aside>
    </div>
  );
}
