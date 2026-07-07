// Unified generation panel — the ONE control surface used everywhere the app
// generates images (Bibles, Image Studio, asset boards…). Consolidates what
// used to be scattered, inconsistent controls into a single component:
// prompt + negative prompt, model/provider, aspect, size/quality, seed,
// variations, reference images, a multi-result preview, and per-result
// Download / Use-this / Regenerate actions.
//
// It is self-contained: own settings + results + busy/error state. The host
// only supplies how to run a generation (`onGenerate`) and what "use this"
// means (`onPick`); everything else is handled here so every surface behaves
// identically.

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Sparkles,
  Loader2,
  Download,
  Check,
  RefreshCw,
  SlidersHorizontal,
  ImagePlus,
  Copy,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/ipc";
import type { ProviderId } from "@/lib/types";
import { getMeta } from "@/lib/providerMeta";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AssetImage, AssetVideo } from "@/components/ui/asset-image";
import { AssetPicker } from "@/features/assets/AssetPicker";
import {
  ASPECT_RATIOS,
  SIZE_PRESETS,
  resolveSize,
  IMAGE_MODELS,
} from "@/lib/imageGen";
import { controlsForProviderKey } from "@/lib/modelRegistry";

/** Readiness of a model given which of its keyIds are configured/tested. */
type Readiness = "ready" | "configured" | "invalid" | "no-key" | "manual";

const READY_META: Record<Readiness, { label: string; dot: string; text: string }> = {
  ready: { label: "Ready", dot: "bg-success", text: "text-success" },
  configured: { label: "Configured", dot: "bg-accent", text: "text-accent" },
  invalid: { label: "Key invalid", dot: "bg-danger", text: "text-danger" },
  "no-key": { label: "No key", dot: "bg-muted", text: "text-muted" },
  manual: { label: "Copy-prompt", dot: "bg-primary", text: "text-primary" },
};

/** A model is "ready" if any of its keyIds is configured; its status reflects
 *  the best outcome among those keys' last Test Connection results. */
function modelReadiness(model: GenModel, configured: Set<string>): Readiness {
  if (model.manual) return "manual";
  const ids = model.keyIds?.length ? model.keyIds : [model.providerKey];
  const matched = ids.filter((id) => configured.has(id));
  if (matched.length === 0) return "no-key";
  const statuses = matched.map((id) => getMeta(id as ProviderId).lastStatus);
  if (statuses.some((s) => s === "connected")) return "ready";
  if (statuses.every((s) => s === "invalid")) return "invalid";
  return "configured"; // key present, not yet tested (or mixed) — optimistic
}

/** Minimal model shape shared by image + video model lists. */
export interface GenModel {
  id: string;
  label: string;
  providerKey: string;
  /** The provider's model slug, routed to aggregator adapters (Kie/WaveSpeed). */
  apiModel?: string;
  /** No public API (e.g. Midjourney) — generate by copying the prompt out. */
  manual?: boolean;
  /** Provider ids whose key (any) makes this model ready. Falls back to providerKey. */
  keyIds?: string[];
}

export type GenMode = "image" | "video";

export const CAMERA_MOVES = [
  "Static",
  "Slow push-in",
  "Slow pull-out",
  "Pan left",
  "Pan right",
  "Tilt up",
  "Crane up",
  "Orbit",
  "Tracking",
  "Handheld",
] as const;

export interface GenerateOpts {
  mode: GenMode;
  prompt: string;
  negativePrompt?: string;
  provider: string;
  modelId: string;
  /** Provider model slug for aggregators (Kie/WaveSpeed); undefined = adapter default. */
  apiModel?: string;
  width: number;
  height: number;
  seed?: number;
  variations: number;
  references: string[];
  referenceStrength?: number; // 0..100, where supported
  // video-only
  duration?: number;
  fps?: number;
  motion?: number; // 0..100
  camera?: string;
}

/** Turn a raw provider error into an actionable "Model · reason · fix" message. */
function diagnose(modelLabel: string, e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e ?? "Generation failed");
  const low = raw.toLowerCase();
  let reason = raw;
  let action = "Open API Keys → Test Connection, or switch the model above.";
  if (/401|403|unauthor|invalid.*key|api key|rejected/.test(low)) {
    reason = "The provider rejected the API key.";
    action = "Add or fix the key in API Keys, then run Test Connection.";
  } else if (/needs (a|an) (image|reference|start frame)/.test(low)) {
    reason = "This model needs a reference image, but none was provided (or none could be resolved).";
    action =
      'Select a Character/Environment/Prop with a locked image, add one via "Add reference," or turn on Auto-fallback above so a model that doesn\'t need one can pick up automatically.';
  } else if (/429|quota|rate limit|exceeded|insufficient|billing/.test(low)) {
    reason = "Rate-limited or out of quota/credits.";
    action = "Wait and retry, or switch to another provider above.";
  } else if (/404|not found|model.*(unavailable|not found)|unsupported/.test(low)) {
    reason = "That model/endpoint isn't available for this key.";
    action = "Switch the model above (e.g. Fal.ai or OpenAI).";
  } else if (/verif|organization must be verified/.test(low)) {
    reason = "This model needs a verified provider account.";
    action = "Verify your org, or switch model (DALL·E 3 / Fal.ai need no verification).";
  } else if (/no .*key set|add .* key|configure/.test(low)) {
    reason = "No key configured for this provider.";
    action = "Add the key in API Keys, or pick a provider you've configured.";
  } else if (/timed out|timeout|could not reach|network|offline/.test(low)) {
    reason = "Couldn't reach the provider.";
    action = "Check your connection and retry.";
  }
  return `${modelLabel} — ${reason}\nFix: ${action}\n\n(${raw})`;
}

// Image pickers include every provider — including manual (Midjourney).
const GEN_MODELS: GenModel[] = IMAGE_MODELS.map((m) => ({
  id: m.id,
  label: m.label,
  providerKey: m.providerKey,
  apiModel: m.apiModel,
  manual: m.manual,
  keyIds: m.keyIds,
}));

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted">
      {children}
    </span>
  );
}

const selectCls =
  "h-8 w-full rounded-[var(--radius-input)] border border-border bg-surface px-2 text-xs text-foreground focus-visible:border-primary focus-visible:outline-none";

export function GenerationPanel({
  title = "Generate",
  mode = "image",
  initialPrompt = "",
  defaultAspect = "1:1",
  defaultSizeId = "medium",
  models,
  references = [],
  onAddReferences,
  onRemoveReference,
  onGenerate,
  onPick,
  pickLabel = "Use this",
  busy: externalBusy,
  compact = false,
}: {
  title?: string;
  mode?: GenMode;
  initialPrompt?: string;
  defaultAspect?: string;
  defaultSizeId?: string;
  models?: GenModel[];
  /** Reference images the host is tracking (shown as a strip). */
  references?: string[];
  /** Open the host's picker to add references (optional). */
  onAddReferences?: () => void;
  onRemoveReference?: (src: string) => void;
  /** Run a generation; returns the result media URLs. */
  onGenerate: (opts: GenerateOpts) => Promise<string[]>;
  /** "Use this" — e.g. set as the entity's hero image. */
  onPick?: (url: string) => void;
  pickLabel?: string;
  busy?: boolean;
  /** Casting-card / Magic Mode surface: default view is just prompt + preview +
   *  generate — model/aspect/quality controls fold under "Advanced" too,
   *  instead of always showing. Same power, one tap away. */
  compact?: boolean;
}) {
  const modelList = models ?? GEN_MODELS;
  const isVideo = mode === "video";
  const [prompt, setPrompt] = useState(initialPrompt);
  const [negativePrompt, setNegativePrompt] = useState("");
  const [modelId, setModelId] = useState(modelList[0]?.id ?? "custom");
  const [aspect, setAspect] = useState(defaultAspect);
  const [sizeId, setSizeId] = useState(defaultSizeId);
  const [seed, setSeed] = useState("");
  const [variations, setVariations] = useState(1);
  const [refStrength, setRefStrength] = useState(60);
  // video-only controls
  const [duration, setDuration] = useState(5);
  const [fps, setFps] = useState(24);
  const [motion, setMotion] = useState(50);
  const [camera, setCamera] = useState<string>("Slow push-in");
  const [advanced, setAdvanced] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoFallback, setAutoFallback] = useState(true);
  const [attemptNote, setAttemptNote] = useState<string | null>(null);
  const [usedModel, setUsedModel] = useState<GenModel | null>(null);
  // References added from the Production Library (any saved asset).
  const [libRefs, setLibRefs] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const allRefs = useMemo(
    () => [...references, ...libRefs].filter((v, i, a) => v && a.indexOf(v) === i),
    [references, libRefs]
  );

  const isBusy = busy || externalBusy;
  const activeModel = modelList.find((m) => m.id === modelId) ?? modelList[0];
  const isManual = !!activeModel?.manual;

  // Provider health — same key-status data the API Key Dashboard uses, so a
  // model that's unconfigured or failed its last Test Connection is visible
  // right where the user picks it, not just after Generate fails.
  const { data: keyStatuses = [] } = useQuery({
    queryKey: ["providerKeys"],
    queryFn: api.getProviderKeyStatuses,
  });
  const configuredProviders = useMemo(
    () => new Set(keyStatuses.filter((s) => s.configured).map((s) => s.provider as string)),
    [keyStatuses]
  );
  const readinessFor = (m: GenModel) => modelReadiness(m, configuredProviders);
  const activeReadiness = activeModel ? readinessFor(activeModel) : "no-key";
  // Capability-driven UI: only show controls the selected model actually supports.
  const caps = useMemo(
    () => new Set(controlsForProviderKey(activeModel?.providerKey ?? "custom", isVideo ? "video" : "image")),
    [activeModel?.providerKey, isVideo]
  );
  const can = (c: string) => caps.has(c as never);

  // Manual providers (Midjourney) have no API — copy the prompt for the user.
  const copyForManual = async () => {
    try {
      await navigator.clipboard.writeText(prompt.trim());
      window.dispatchEvent(
        new CustomEvent("mf-toast", {
          detail: `Prompt copied — paste it into ${activeModel?.label ?? "the tool"}, then import the image.`,
        })
      );
    } catch {
      setError("Couldn't access the clipboard — select the prompt text and copy it manually.");
    }
  };

  /** Up to 3 ready/configured alternates for the current model, best-first —
   *  the "Fallback 1/2/3" chain. Manual (copy-prompt) and unusable (no key /
   *  invalid key) models are never auto-tried. */
  const fallbackChainFor = (primary: GenModel): GenModel[] => {
    const rank = (m: GenModel) => (readinessFor(m) === "ready" ? 0 : 1); // "configured" ties after "ready"
    const alternates = modelList
      .filter((m) => m.id !== primary.id && !m.manual)
      .filter((m) => {
        const r = readinessFor(m);
        return r === "ready" || r === "configured";
      })
      .sort((a, b) => rank(a) - rank(b));
    return [primary, ...alternates.slice(0, 3)];
  };

  const run = async () => {
    if (!prompt.trim() || isBusy) return;
    if (isManual) {
      void copyForManual();
      return;
    }
    setBusy(true);
    setError(null);
    setAttemptNote(null);
    setUsedModel(null);
    try {
      const { width, height } = resolveSize(aspect, sizeId);
      const primary = modelList.find((m) => m.id === modelId) ?? modelList[0];
      const chain = autoFallback ? fallbackChainFor(primary) : [primary];

      const failures: { label: string; reason: string }[] = [];
      for (let i = 0; i < chain.length; i++) {
        const model = chain[i];
        if (i > 0) setAttemptNote(`${chain[i - 1].label} failed — trying ${model.label}…`);
        try {
          const urls = await onGenerate({
            mode,
            prompt: prompt.trim(),
            negativePrompt: negativePrompt.trim() || undefined,
            provider: model.providerKey ?? "custom",
            modelId: model.id,
            apiModel: model.apiModel,
            width,
            height,
            seed: seed.trim() ? parseInt(seed.trim(), 10) : undefined,
            variations: Math.max(1, Math.min(4, variations)),
            references: allRefs,
            ...(caps.has("referenceStrength") ? { referenceStrength: refStrength } : {}),
            ...(isVideo ? { duration, fps, motion, camera } : {}),
          });
          setResults(urls);
          setUsedModel(i > 0 ? model : null);
          setAttemptNote(null);
          // Auto-adopt the first result so single-shot generation "just works".
          if (urls[0] && onPick) {
            onPick(urls[0]);
            setPicked(urls[0]);
          }
          return;
        } catch (e) {
          failures.push({ label: model.label, reason: e instanceof Error ? e.message : String(e) });
        }
      }
      // Every model in the chain failed — show what was tried, not just the last error.
      setAttemptNote(null);
      if (failures.length === 1) {
        setError(diagnose(failures[0].label, new Error(failures[0].reason)));
      } else {
        const tried = failures.map((f) => `• ${f.label}: ${f.reason}`).join("\n");
        setError(
          `All ${failures.length} providers failed (${failures.map((f) => f.label).join(" → ")}).\n${tried}\n\nFix: Add/verify a key for one of these in API Keys, or switch to a different model above.`
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const pick = (url: string) => {
    onPick?.(url);
    setPicked(url);
  };

  const download = (url: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = `generation-${Date.now()}.png`;
    a.click();
  };

  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-border bg-surface p-3 shadow-card">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">{title}</h3>
        <button
          onClick={() => setAdvanced((v) => !v)}
          className={cn(
            "ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
            advanced ? "bg-primary/12 text-primary" : "text-muted hover:bg-elevated"
          )}
          title="Advanced controls"
        >
          <SlidersHorizontal className="h-3 w-3" />
          {advanced ? "Simple" : "Advanced"}
        </button>
      </div>

      <label className="block">
        <Label>Prompt</Label>
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe what to generate…"
          className="min-h-16 text-[13px]"
          aria-label="Prompt"
        />
      </label>

      {(!compact || advanced) && (
        <label className="block">
          <Label>Model / provider</Label>
          <select
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            className={selectCls}
            aria-label={isVideo ? "Video model" : "Image model"}
          >
            {modelList.map((m) => {
              const r = readinessFor(m);
              const marker = r === "ready" || r === "configured" ? "●" : r === "invalid" ? "✕" : r === "manual" ? "✎" : "○";
              return (
                <option key={m.id} value={m.id}>
                  {marker} {m.label}
                </option>
              );
            })}
          </select>
          <p className="mt-1 flex items-center gap-1.5 text-[10px]">
            <span className={cn("h-1.5 w-1.5 rounded-full", READY_META[activeReadiness].dot)} />
            <span className={READY_META[activeReadiness].text}>
              {READY_META[activeReadiness].label}
            </span>
            {(activeReadiness === "no-key" || activeReadiness === "invalid") && (
              <span className="text-muted">{" "}— add/fix the key in API Keys</span>
            )}
          </p>
          {!isManual && caps.size > 0 && (
            <p className="mt-1 text-[10px] text-muted">
              Supports: {[...caps].join(" · ")}
            </p>
          )}
          {!isManual && activeModel && (
            <label className="mt-1.5 flex items-center gap-1.5 text-[10px] text-muted">
              <input
                type="checkbox"
                checked={autoFallback}
                onChange={(e) => setAutoFallback(e.target.checked)}
                className="accent-[var(--color-primary)]"
              />
              {(() => {
                const n = fallbackChainFor(activeModel).length - 1;
                return n > 0
                  ? `Auto-fallback to ${n} other ready model${n === 1 ? "" : "s"} if this one fails`
                  : "Auto-fallback (no other ready models configured yet)";
              })()}
            </label>
          )}
        </label>
      )}

      {(!compact || advanced) && (can("aspect") || can("resolution")) && (
        <div className="grid grid-cols-2 gap-2">
          {can("aspect") && (
            <label className="block">
              <Label>Aspect</Label>
              <select value={aspect} onChange={(e) => setAspect(e.target.value)} className={selectCls} aria-label="Aspect ratio">
                {ASPECT_RATIOS.filter((a) => a !== "custom").map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </label>
          )}
          {can("resolution") && (
            <label className="block">
              <Label>Size / quality</Label>
              <select value={sizeId} onChange={(e) => setSizeId(e.target.value)} className={selectCls} aria-label="Image size">
                {SIZE_PRESETS.filter((s) => s.id !== "custom").map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}

      {isVideo && (
        <>
          {(can("duration") || can("fps")) && (
            <div className="grid grid-cols-2 gap-2">
              {can("duration") && (
                <label className="block">
                  <Label>Duration (sec)</Label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={duration}
                    onChange={(e) => setDuration(Math.max(1, Math.min(20, Number(e.target.value) || 5)))}
                    className={selectCls}
                    aria-label="Duration"
                  />
                </label>
              )}
              {can("fps") && (
                <label className="block">
                  <Label>FPS</Label>
                  <select value={fps} onChange={(e) => setFps(Number(e.target.value))} className={selectCls} aria-label="FPS">
                    {[12, 24, 30, 60].map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          )}
          {can("camera") && (
            <label className="block">
              <Label>Camera movement</Label>
              <select value={camera} onChange={(e) => setCamera(e.target.value)} className={selectCls} aria-label="Camera movement">
                {CAMERA_MOVES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
          )}
          {can("motion") && (
            <label className="block">
              <Label>Motion strength ({motion})</Label>
              <input
                type="range"
                min={0}
                max={100}
                value={motion}
                onChange={(e) => setMotion(Number(e.target.value))}
                className="mt-1 w-full accent-[var(--color-primary)]"
                aria-label="Motion strength"
              />
            </label>
          )}
        </>
      )}

      {advanced && (can("seed") || can("variations") || can("negativePrompt") || can("referenceStrength")) && (
        <>
          {(can("seed") || can("variations")) && (
            <div className="grid grid-cols-2 gap-2">
              {can("seed") && (
                <label className="block">
                  <Label>Seed (consistency)</Label>
                  <input
                    value={seed}
                    onChange={(e) => setSeed(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="random"
                    inputMode="numeric"
                    className={selectCls}
                    aria-label="Seed"
                  />
                </label>
              )}
              {can("variations") && (
                <label className="block">
                  <Label>Variations ({variations})</Label>
                  <input
                    type="range"
                    min={1}
                    max={4}
                    value={variations}
                    onChange={(e) => setVariations(Number(e.target.value))}
                    className="mt-2 w-full accent-[var(--color-primary)]"
                    aria-label="Variations"
                  />
                </label>
              )}
            </div>
          )}
          {can("referenceStrength") && (
            <label className="block">
              <Label>Reference strength ({refStrength}%)</Label>
              <input
                type="range"
                min={0}
                max={100}
                value={refStrength}
                onChange={(e) => setRefStrength(Number(e.target.value))}
                className="mt-1 w-full accent-[var(--color-primary)]"
                aria-label="Reference strength"
              />
            </label>
          )}
          {can("negativePrompt") && (
            <label className="block">
              <Label>Negative prompt</Label>
              <Textarea
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                placeholder="What to avoid…"
                className="min-h-12 text-[13px]"
                aria-label="Negative prompt"
              />
            </label>
          )}
        </>
      )}

      {/* Reference images — host-tracked + any asset pulled from the library */}
      <div>
        <Label>Reference images</Label>
        <div className="flex flex-wrap gap-2">
          {allRefs.map((src, i) => {
            const isLib = libRefs.includes(src) && !references.includes(src);
            return (
              <div key={i} className="group relative">
                <AssetImage
                  src={src}
                  alt={`Reference ${i + 1}`}
                  className="h-12 w-12 rounded-md border border-border object-cover"
                />
                {(isLib || onRemoveReference) && (
                  <button
                    onClick={() =>
                      isLib ? setLibRefs((r) => r.filter((x) => x !== src)) : onRemoveReference?.(src)
                    }
                    className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-danger text-white group-hover:flex"
                    aria-label="Remove reference"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                )}
              </div>
            );
          })}
          <button
            onClick={() => (onAddReferences ? onAddReferences() : setPickerOpen(true))}
            className="flex h-12 w-12 items-center justify-center rounded-md border border-dashed border-border text-muted hover:border-primary/50 hover:text-foreground"
            aria-label="Add reference from library"
            title="Add a reference from the Production Library"
          >
            <ImagePlus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {pickerOpen && (
        <AssetPicker
          onClose={() => setPickerOpen(false)}
          onAdd={(srcs) => {
            setLibRefs((r) => [...r, ...srcs].filter((v, i, a) => a.indexOf(v) === i));
            setPickerOpen(false);
          }}
        />
      )}

      <Button
        variant="gold"
        onClick={run}
        disabled={isBusy || !prompt.trim()}
        className="w-full"
      >
        {isManual ? (
          <Copy className="h-4 w-4" />
        ) : isBusy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : results.length > 0 ? (
          <RefreshCw className="h-4 w-4" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        {isManual
          ? "Copy prompt for Midjourney"
          : isBusy
            ? attemptNote ?? "Generating…"
            : results.length > 0
              ? "Regenerate"
              : "Generate"}
      </Button>
      {isManual && (
        <p className="mt-1 text-center text-[11px] text-muted">
          Midjourney has no public API — copy the prompt, generate in Midjourney, then import
          the image with “Add reference” or Upload.
        </p>
      )}

      {error && (
        <div className="rounded-md border border-danger/40 bg-danger/10 px-2.5 py-2 text-[11px] text-danger">
          <p className="whitespace-pre-line">{error}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <button onClick={run} className="rounded bg-danger/15 px-2 py-0.5 font-medium hover:bg-danger/25">
              Retry
            </button>
            <button
              onClick={() => {
                const i = modelList.findIndex((m) => m.id === modelId);
                const nextNonManual = [...modelList.slice(i + 1), ...modelList.slice(0, i)].find((m) => !m.manual);
                if (nextNonManual) {
                  setModelId(nextNonManual.id);
                  setError(null);
                }
              }}
              className="rounded bg-danger/15 px-2 py-0.5 font-medium hover:bg-danger/25"
            >
              Switch provider
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {usedModel && results.length > 0 && (
        <p className="flex items-center gap-1.5 rounded-md bg-accent/10 px-2 py-1.5 text-[11px] text-accent">
          <RefreshCw className="h-3 w-3 shrink-0" />
          Generated with {usedModel.label} after the primary model failed — nothing was lost
          (prompt, references, and settings carried over).
        </p>
      )}
      {results.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {results.map((url, i) => (
            <div
              key={i}
              className={cn(
                "group relative overflow-hidden rounded-md border",
                picked === url ? "border-primary ring-1 ring-primary" : "border-border"
              )}
            >
              {isVideo ? (
                <AssetVideo src={url} className="aspect-video w-full bg-black object-cover" label="Result" />
              ) : (
                <AssetImage src={url} alt={`Result ${i + 1}`} className="aspect-square w-full object-cover" label="Result" />
              )}
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-black/55 px-1.5 py-1 opacity-0 transition-opacity group-hover:opacity-100">
                {onPick && (
                  <button
                    onClick={() => pick(url)}
                    className="inline-flex items-center gap-1 text-[10px] font-medium text-white hover:text-primary"
                  >
                    {picked === url ? <Check className="h-3 w-3" /> : null}
                    {pickLabel}
                  </button>
                )}
                <button
                  onClick={() => download(url)}
                  className="inline-flex items-center gap-1 text-[10px] font-medium text-white hover:text-primary"
                  aria-label="Download"
                >
                  <Download className="h-3 w-3" /> Save
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
