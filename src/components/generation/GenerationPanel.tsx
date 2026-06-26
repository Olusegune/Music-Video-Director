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

/** Minimal model shape shared by image + video model lists. */
export interface GenModel {
  id: string;
  label: string;
  providerKey: string;
  /** No public API (e.g. Midjourney) — generate by copying the prompt out. */
  manual?: boolean;
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
  width: number;
  height: number;
  seed?: number;
  variations: number;
  references: string[];
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
  manual: m.manual,
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

  const run = async () => {
    if (!prompt.trim() || isBusy) return;
    if (isManual) {
      void copyForManual();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { width, height } = resolveSize(aspect, sizeId);
      const model = modelList.find((m) => m.id === modelId) ?? modelList[0];
      const urls = await onGenerate({
        mode,
        prompt: prompt.trim(),
        negativePrompt: negativePrompt.trim() || undefined,
        provider: model?.providerKey ?? "custom",
        modelId,
        width,
        height,
        seed: seed.trim() ? parseInt(seed.trim(), 10) : undefined,
        variations: Math.max(1, Math.min(4, variations)),
        references: allRefs,
        ...(isVideo ? { duration, fps, motion, camera } : {}),
      });
      setResults(urls);
      // Auto-adopt the first result so single-shot generation "just works".
      if (urls[0] && onPick) {
        onPick(urls[0]);
        setPicked(urls[0]);
      }
    } catch (e) {
      setError(diagnose(activeModel?.label ?? modelId, e));
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

      <label className="block">
        <Label>Model / provider</Label>
        <select
          value={modelId}
          onChange={(e) => setModelId(e.target.value)}
          className={selectCls}
          aria-label={isVideo ? "Video model" : "Image model"}
        >
          {modelList.map((m) => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <Label>Aspect</Label>
          <select value={aspect} onChange={(e) => setAspect(e.target.value)} className={selectCls} aria-label="Aspect ratio">
            {ASPECT_RATIOS.filter((a) => a !== "custom").map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <Label>Size / quality</Label>
          <select value={sizeId} onChange={(e) => setSizeId(e.target.value)} className={selectCls} aria-label="Image size">
            {SIZE_PRESETS.filter((s) => s.id !== "custom").map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </label>
      </div>

      {isVideo && (
        <>
          <div className="grid grid-cols-2 gap-2">
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
            <label className="block">
              <Label>FPS</Label>
              <select value={fps} onChange={(e) => setFps(Number(e.target.value))} className={selectCls} aria-label="FPS">
                {[12, 24, 30, 60].map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="block">
            <Label>Camera movement</Label>
            <select value={camera} onChange={(e) => setCamera(e.target.value)} className={selectCls} aria-label="Camera movement">
              {CAMERA_MOVES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
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
        </>
      )}

      {advanced && (
        <>
          <div className="grid grid-cols-2 gap-2">
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
          </div>
          <label className="block">
            <Label>Negative prompt</Label>
            <Textarea
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              placeholder="What to avoid (where the model supports it)…"
              className="min-h-12 text-[13px]"
              aria-label="Negative prompt"
            />
          </label>
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

      <Button onClick={run} disabled={isBusy || !prompt.trim()} className="w-full">
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
            ? "Generating…"
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
                <AssetVideo src={url} className="aspect-video w-full bg-black object-cover" />
              ) : (
                <AssetImage src={url} alt={`Result ${i + 1}`} className="aspect-square w-full object-cover" />
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
