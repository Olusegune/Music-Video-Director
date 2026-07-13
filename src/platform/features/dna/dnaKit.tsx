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
  FileUp,
  X,
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
import { Input } from "@/platform/components/ui/input";
import { Textarea } from "@/platform/components/ui/textarea";
import { Label } from "@/platform/components/ui/label";
import { Badge } from "@/platform/components/ui/badge";
import { AssetImage } from "@/platform/components/ui/asset-image";
import { InspectorGroup } from "@/platform/components/ui/inspector-group";
import type { FieldSpec, ImportedFields } from "@/platform/lib/smartImport";
import { ACCEPT_ATTR } from "@/platform/lib/docParse";

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
    <InspectorGroup icon={icon} title={title} collapsible={false} className="border-t-0 pt-0">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
    </InspectorGroup>
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

/** A single button in a Quick Actions rail (Complete Mode only). */
export function QuickActionButton({
  icon,
  label,
  onClick,
  disabled,
  active,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center gap-2.5 rounded-[var(--radius-card)] border px-3 py-2.5 text-left text-sm font-medium shadow-card transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        danger
          ? "border-border bg-surface text-danger hover:border-danger/40 hover:bg-danger/10"
          : active
            ? "border-success/40 bg-success/10 text-success"
            : "border-border bg-surface text-foreground hover:border-primary/40"
      )}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
}

/** Smart Import confidence-review panel — shared across Character/World/Prop. */
export function SmartImportReview({
  fields,
  fileName,
  imported,
  accepted,
  onToggle,
  onEdit,
  onApply,
  onDiscard,
}: {
  fields: readonly FieldSpec[];
  fileName: string | null;
  imported: ImportedFields;
  accepted: Set<string>;
  onToggle: (key: string) => void;
  onEdit: (key: string, value: string) => void;
  onApply: () => void;
  onDiscard: () => void;
}) {
  const entries = fields.filter(([key]) => imported[key]);
  const highCount = entries.filter(([key]) => imported[key]?.confidence === "high").length;
  return (
    <div className="mx-8 mt-4 rounded-[var(--radius-card)] border border-primary/30 bg-primary/[0.04] p-4">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileUp className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">
            Smart Import review{fileName ? ` — ${fileName}` : ""}
          </h2>
        </div>
        <button onClick={onDiscard} aria-label="Discard import" className="text-muted hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
      <p className="mb-3 text-[11px] text-muted">
        {entries.length} field{entries.length === 1 ? "" : "s"} found ({highCount} high
        confidence). Nothing is applied until you accept below — uncheck anything that looks
        wrong, or edit the value directly.
      </p>
      <div className="flex flex-col gap-2">
        {entries.map(([key, label]) => {
          const field = imported[key]!;
          return (
            <div
              key={key}
              className="flex items-start gap-3 rounded-md border border-border bg-surface p-2.5"
            >
              <input
                type="checkbox"
                checked={accepted.has(key)}
                onChange={() => onToggle(key)}
                className="mt-1 h-4 w-4 shrink-0"
                aria-label={`Accept ${label}`}
              />
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <Label className="!mb-0">{label}</Label>
                  <Badge variant={field.confidence === "high" ? "success" : "warning"}>
                    {field.confidence === "high" ? "High confidence" : "Needs review"}
                  </Badge>
                </div>
                <Input
                  value={field.value}
                  onChange={(e) => onEdit(key, e.target.value)}
                  className="h-8 text-[13px]"
                />
                {field.source && (
                  <p className="mt-1 truncate text-[11px] italic text-muted">“{field.source}”</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Button variant="secondary" onClick={onDiscard}>
          Discard
        </Button>
        <Button onClick={onApply} disabled={accepted.size === 0}>
          <Check className="h-4 w-4" /> Apply {accepted.size} field{accepted.size === 1 ? "" : "s"}
        </Button>
      </div>
    </div>
  );
}

/** Hidden-file-input button that triggers Smart Import extraction. */
export function SmartImportButton({
  canImport,
  busy,
  onFile,
}: {
  canImport: boolean;
  busy: boolean;
  onFile: (file: File) => void;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-button)] border px-3 py-1.5 text-xs font-medium transition-colors",
        !canImport || busy
          ? "cursor-not-allowed border-border text-muted opacity-60"
          : "border-primary/30 text-primary hover:bg-primary/10"
      )}
      title={
        canImport
          ? "Extract fields from a PDF or DOCX — you review before anything is applied."
          : "Add a configured Gemini key in API Keys to use Smart Import."
      }
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileUp className="h-3.5 w-3.5" />}
      AI Import (PDF / DOCX)
      <input
        type="file"
        accept={ACCEPT_ATTR}
        className="hidden"
        disabled={!canImport || busy}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) onFile(file);
        }}
      />
    </label>
  );
}
