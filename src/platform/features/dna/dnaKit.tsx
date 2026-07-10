// Shared building blocks for the DNA bibles (World, Props — and reusable by the
// Character Bible pattern). Keeps the entity screens DRY: identical autosave,
// lock toggle, media panel, Prompt DNA editor, and field/section layout.

import { useEffect, useRef, useState } from "react";
import {
  Fingerprint,
  Sparkles,
  Copy,
  Check,
  Lock,
  Unlock,
  Loader2,
  FolderInput,
} from "lucide-react";
import { cn } from "@/platform/lib/utils";
import type { PromptLayer } from "@/platform/lib/promptPipeline";
import {
  GenerationPanel,
  type GenerateOpts,
} from "@/platform/components/generation/GenerationPanel";
import {
  UPLOAD_CATEGORIES,
  categoryBible,
  moveAssetAcrossBibles,
  type AssetKind,
} from "@/platform/lib/assets";
import { Button } from "@/platform/components/ui/button";
import { Textarea } from "@/platform/components/ui/textarea";
import { Label } from "@/platform/components/ui/label";
import { AssetImage } from "@/platform/components/ui/asset-image";

/** Deterministic hue from an id so each entity keeps a stable accent. */
export function hueFor(id: string): number {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

export function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "?"
  );
}

export function GradientFill({
  id,
  label,
  className,
}: {
  id: string;
  label: string;
  className?: string;
}) {
  const h = hueFor(id);
  return (
    <div
      className={cn("flex items-center justify-center font-semibold text-white/90", className)}
      style={{
        background: `linear-gradient(135deg, hsl(${h} 50% 40%), hsl(${(h + 40) % 360} 55% 28%))`,
      }}
      aria-hidden
    >
      {initials(label)}
    </div>
  );
}

/** Debounced autosave keyed on the (immutable) draft reference. */
export function useAutosave<T>(draft: T, save: (d: T) => void | Promise<void>) {
  const saveRef = useRef(save);
  saveRef.current = save;
  const [saved, setSaved] = useState(false);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(async () => {
      await saveRef.current(draft);
      setSaved(true);
      setTimeout(() => setSaved(false), 1400);
    }, 600);
    return () => clearTimeout(t);
  }, [draft]);
  return saved;
}

export function SavedTick({ show }: { show: boolean }) {
  return (
    <span
      className={cn(
        "flex items-center gap-1 text-xs text-success transition-opacity",
        show ? "opacity-100" : "opacity-0"
      )}
    >
      <Check className="h-3.5 w-3.5" /> Saved
    </span>
  );
}

export function LockToggle({
  locked,
  onToggle,
  lockedTitle,
  lockedHint,
  unlockedHint,
}: {
  locked: boolean;
  onToggle: () => void;
  lockedTitle: string;
  lockedHint: string;
  unlockedHint: string;
}) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "flex items-center gap-3 rounded-[var(--radius-card)] border px-3 py-2.5 text-left transition-colors",
        locked
          ? "border-success/40 bg-success/10"
          : "border-border bg-surface hover:border-primary/40"
      )}
    >
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          locked ? "bg-success/20 text-success" : "bg-elevated text-muted"
        )}
      >
        {locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium">
          {locked ? lockedTitle : "Consistency unlocked"}
        </span>
        <span className="block text-[11px] text-muted">{locked ? lockedHint : unlockedHint}</span>
      </span>
    </button>
  );
}

/** Left media panel: image (or gradient) + generate button + reference strip. */
/**
 * "Move to…" control — re-files an asset into another category/Bible. Picking a
 * Prop sub-type (Wardrobe/Vehicle/…) while already in the Prop Bible just
 * changes its category; picking a different Bible re-creates it there and
 * deletes the original (carrying name + primary image + references).
 */
export function MoveAssetMenu({
  fromKind,
  fromId,
  name,
  primaryImage,
  refs,
  onPropCategory,
  onCrossMoved,
}: {
  fromKind: AssetKind;
  fromId: string;
  name: string;
  primaryImage: string;
  refs: string[];
  /** Called when staying in the Prop Bible but changing sub-type. */
  onPropCategory?: (categoryId: string) => void;
  /** Called after a cross-Bible move completes (navigate away). */
  onCrossMoved: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const handle = async (target: string) => {
    if (!target) return;
    const targetBible = categoryBible(target);
    if (targetBible === fromKind) {
      if (fromKind === "Prop") onPropCategory?.(target);
      return; // Character/Environment have no sub-types — nothing to do
    }
    if (!confirm(`Move "${name}" to "${target}"? It moves to the ${targetBible} Bible.`)) return;
    setBusy(true);
    try {
      await moveAssetAcrossBibles(fromKind, fromId, target, name, primaryImage, refs);
      onCrossMoved();
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="inline-flex items-center gap-1.5">
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted" />
      ) : (
        <FolderInput className="h-4 w-4 text-muted" />
      )}
      <select
        value=""
        onChange={(e) => handle(e.target.value)}
        disabled={busy}
        aria-label="Move asset to category"
        title="Move to another category / Bible"
        className="h-9 rounded-[var(--radius-input)] border border-border bg-surface px-2 text-xs text-foreground focus-visible:border-primary focus-visible:outline-none"
      >
        <option value="" disabled>
          Move to…
        </option>
        {UPLOAD_CATEGORIES.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function MediaPanel({
  id,
  label,
  src,
  references,
  generating,
  aspect,
  isTauri,
  initialPrompt,
  contextLayers,
  promptVariables,
  historyScope,
  onGenerate,
  onPick,
  pickLabel,
  onAddReferences,
  onRemoveReference,
  defaultAspect = "16:9",
}: {
  id: string;
  label: string;
  src: string;
  references: string[];
  generating: boolean;
  aspect: string;
  isTauri: boolean;
  /** Composed DNA prompt seeded into the unified panel. */
  initialPrompt: string;
  /** Named prompt contributions (DNA, consistency, style) for the Prompt Studio. */
  contextLayers?: PromptLayer[];
  promptVariables?: Record<string, string>;
  historyScope?: { moduleId?: string; entityId?: string };
  /** Run a generation (unified panel handles model/size/seed/variations). */
  onGenerate: (opts: GenerateOpts) => Promise<string[]>;
  /** Adopt a result as the entity's hero image. */
  onPick: (url: string) => void;
  pickLabel?: string;
  onAddReferences?: () => void;
  onRemoveReference?: (src: string) => void;
  defaultAspect?: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface shadow-card">
        <div className={cn("relative w-full bg-elevated", aspect)}>
          <AssetImage
            src={src}
            alt={label}
            className="h-full w-full object-cover"
            fallback={<GradientFill id={id} label={label} className="h-full w-full text-4xl" />}
            label={label}
          />
          {generating && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            </div>
          )}
        </div>
      </div>

      <GenerationPanel
        title="Generate image"
        initialPrompt={initialPrompt}
        contextLayers={contextLayers}
        promptVariables={promptVariables}
        historyScope={historyScope}
        defaultAspect={defaultAspect}
        references={references}
        onAddReferences={onAddReferences}
        onRemoveReference={onRemoveReference}
        onGenerate={onGenerate}
        onPick={onPick}
        pickLabel={pickLabel ?? "Use as hero"}
      />

      {!isTauri && (
        <p className="text-center text-[11px] text-muted">
          Browser preview uses a placeholder. The desktop app renders from your chosen image
          provider.
        </p>
      )}
    </div>
  );
}

/** The Prompt DNA + Consistency Rules editor — identical across entities. */
export function PromptDnaBlock({
  anchorLabel,
  anchor,
  promptDna,
  consistencyRules,
  stale,
  composeLabel,
  onCompose,
  onPromptDna,
  onRules,
}: {
  anchorLabel: string;
  anchor: string;
  promptDna: string;
  consistencyRules: string;
  stale: boolean;
  composeLabel: string;
  onCompose: () => void;
  onPromptDna: (v: string) => void;
  onRules: (v: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(promptDna);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="rounded-[var(--radius-card)] border border-primary/30 bg-primary/[0.04] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Fingerprint className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Prompt DNA</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant={stale ? "primary" : "secondary"} onClick={onCompose}>
            <Sparkles className="h-4 w-4" />
            {promptDna ? "Recompose" : composeLabel}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={copy}
            disabled={!promptDna}
            aria-label="Copy Prompt DNA"
          >
            {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      <p className="mt-1 text-[11px] text-muted">
        {anchorLabel}: <span className="text-foreground">{anchor}</span>
      </p>
      {stale && promptDna && (
        <p className="mt-1 text-[11px] text-warning">
          Fields changed since this was composed — recompose to refresh.
        </p>
      )}
      <Textarea
        value={promptDna}
        onChange={(e) => onPromptDna(e.target.value)}
        placeholder="Fill in the fields below, then Compose — or write your own anchor prompt here."
        className="mt-2 min-h-24 font-mono text-[13px] leading-relaxed"
      />
      <Label className="mb-1 mt-3 block">Consistency rules</Label>
      <Textarea
        value={consistencyRules}
        onChange={(e) => onRules(e.target.value)}
        placeholder="Lock rules + negatives that keep this on-model."
        className="min-h-20 font-mono text-[13px] leading-relaxed"
      />
    </div>
  );
}

export function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-card">
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
    </div>
  );
}

export function Field({
  label,
  full,
  children,
}: {
  label: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", full && "sm:col-span-2")}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export function DnaSelect({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 w-full rounded-[var(--radius-input)] border border-border bg-surface px-3 text-sm text-foreground transition-colors focus-visible:border-primary focus-visible:outline-none"
    >
      {children}
    </select>
  );
}

/** Comma-separated color palette editor with live swatches. */
export function PaletteField({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [text, setText] = useState(value.join(", "));
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        {text
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean)
          .slice(0, 8)
          .map((c, i) => (
            <span
              key={i}
              className="h-5 w-5 rounded border border-border"
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}
      </div>
      <input
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onChange(
            e.target.value
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          );
        }}
        placeholder="#0B1B2B, #D4AF37, #00D9FF"
        className="flex h-9 w-full rounded-[var(--radius-input)] border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted focus-visible:border-primary focus-visible:outline-none"
      />
    </div>
  );
}
