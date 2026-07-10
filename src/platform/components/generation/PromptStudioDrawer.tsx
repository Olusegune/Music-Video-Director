// Prompt Studio — see the whole prompt, not just the part you typed.
//
// A drawer over any generation surface. It shows every layer that will be sent
// (system rules, Bible DNA, style presets, your text, negatives), lets Creator
// tier mute or override any of them, resolves `{variables}` from project
// context, and previews exactly what the model receives.
//
// It is not a screen. It never becomes a place you "go" — it opens over the
// work you are already doing and closes again.

import { useEffect, useState } from "react";
import { EyeOff, Eye, X, AlertTriangle, RotateCcw, Trash2, History, Split } from "lucide-react";
import { cn } from "@/platform/lib/utils";
import { Textarea } from "@/platform/components/ui/textarea";
import { AssetImage } from "@/platform/components/ui/asset-image";
import {
  composePrompt,
  setLayer,
  usedVariables,
  type PromptLayer,
  type PromptPipeline,
} from "@/platform/lib/promptPipeline";
import { describeEntry, type PromptHistoryEntry } from "@/platform/lib/promptHistory";

function timeAgo(iso: string, now = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

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
  history = [],
  onReplay,
  onDeleteHistory,
  onCompare,
}: {
  open: boolean;
  onClose: () => void;
  pipeline: PromptPipeline;
  onChange: (next: PromptPipeline) => void;
  editable: boolean;
  history?: PromptHistoryEntry[];
  onReplay?: (entry: PromptHistoryEntry) => void;
  onDeleteHistory?: (id: string) => void;
  onCompare?: (
    a: PromptHistoryEntry,
    b: PromptHistoryEntry
  ) => Promise<{ a: string[]; b: string[] }>;
}) {
  const [tab, setTab] = useState<"layers" | "history" | "compare">("layers");
  const [compareIds, setCompareIds] = useState<[string | null, string | null]>([null, null]);
  const [compareBusy, setCompareBusy] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [compareResults, setCompareResults] = useState<{ a: string[]; b: string[] } | null>(null);

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

        <div role="tablist" className="flex gap-1 border-b border-border px-5 pt-2">
          {(onCompare
            ? (["layers", "history", "compare"] as const)
            : (["layers", "history"] as const)
          ).map((id) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={cn(
                "-mb-px border-b-2 px-2 pb-2 text-[11px] font-medium capitalize transition",
                tab === id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted hover:text-foreground"
              )}
            >
              {id}
              {id === "history" && history.length ? (
                <span className="ml-1 tabular-nums opacity-70">{history.length}</span>
              ) : null}
            </button>
          ))}
        </div>

        {tab === "history" ? (
          <div className="flex-1 space-y-2 overflow-y-auto p-5">
            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                <History className="h-6 w-6 text-muted" />
                <p className="text-[11px] text-muted">
                  Generations you run here will be listed, with the exact prompt that made them.
                </p>
              </div>
            ) : (
              history.map((entry) => (
                <div
                  key={entry.id}
                  className="flex gap-2 rounded-lg border border-border bg-elevated/50 p-2"
                >
                  {entry.thumbUrl ? (
                    <AssetImage
                      src={entry.thumbUrl}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded-md border border-border object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-dashed border-border text-[9px] text-muted">
                      no img
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-[11px] leading-snug">{entry.prompt}</p>
                    <p className="mt-0.5 truncate text-[10px] text-muted">
                      {timeAgo(entry.createdAt)} · {describeEntry(entry)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    {onReplay ? (
                      <button
                        type="button"
                        aria-label="Replay this prompt"
                        title="Restore this exact prompt, layers, model and seed"
                        onClick={() => {
                          onReplay(entry);
                          setTab("layers");
                        }}
                        className="flex h-6 w-6 items-center justify-center rounded-md text-muted hover:bg-surface hover:text-primary"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                    {onDeleteHistory ? (
                      <button
                        type="button"
                        aria-label="Delete from history"
                        onClick={() => onDeleteHistory(entry.id)}
                        className="flex h-6 w-6 items-center justify-center rounded-md text-muted hover:bg-danger/10 hover:text-danger"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : tab === "compare" ? (
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            <div className="flex items-center gap-2 text-[11px] text-muted">
              <Split className="h-4 w-4 text-primary" />
              Pick two saved prompts and run them side by side through the current generation route.
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {[0, 1].map((slot) => (
                <label
                  key={slot}
                  className="space-y-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted"
                >
                  Variant {slot === 0 ? "A" : "B"}
                  <select
                    value={compareIds[slot] ?? ""}
                    onChange={(event) => {
                      const next: [string | null, string | null] = [...compareIds] as [
                        string | null,
                        string | null,
                      ];
                      next[slot] = event.target.value || null;
                      setCompareIds(next);
                      setCompareResults(null);
                    }}
                    className="h-8 w-full rounded-md border border-border bg-surface px-2 text-xs font-normal normal-case text-foreground"
                  >
                    <option value="">Choose a history entry</option>
                    {history.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.title || entry.prompt.slice(0, 48)}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <button
              type="button"
              disabled={
                !compareIds[0] || !compareIds[1] || compareIds[0] === compareIds[1] || compareBusy
              }
              onClick={async () => {
                const a = history.find((entry) => entry.id === compareIds[0]);
                const b = history.find((entry) => entry.id === compareIds[1]);
                if (!a || !b || !onCompare) return;
                setCompareBusy(true);
                setCompareError(null);
                try {
                  setCompareResults(await onCompare(a, b));
                } catch (error) {
                  setCompareError(error instanceof Error ? error.message : String(error));
                } finally {
                  setCompareBusy(false);
                }
              }}
              className="flex h-9 w-full items-center justify-center gap-2 rounded-md bg-primary px-3 text-xs font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Split className="h-3.5 w-3.5" />
              {compareBusy ? "Running A/B compare…" : "Run A/B compare"}
            </button>
            {compareError ? (
              <p className="whitespace-pre-wrap rounded-md border border-danger/40 bg-danger/10 p-2 text-[11px] text-danger">
                {compareError}
              </p>
            ) : null}
            {compareResults ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {(["a", "b"] as const).map((key) => (
                  <div key={key} className="space-y-1.5">
                    <h3 className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                      Variant {key.toUpperCase()}
                    </h3>
                    {compareResults[key][0] ? (
                      <AssetImage
                        src={compareResults[key][0]}
                        alt={`A/B variant ${key.toUpperCase()}`}
                        className="aspect-square w-full rounded-lg border border-border object-cover"
                      />
                    ) : (
                      <div className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted">
                        No result
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
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
        )}
      </aside>
    </div>
  );
}
