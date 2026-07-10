// ReferenceTray — the one place you manage reference images.
//
// Beyond thumbnails, it answers the question the old strip could not: *which of
// these will the model actually use, and how much?* Every reference carries a
// category and a strength; the tray resolves them against the selected model's
// support and visibly marks the ones that will be ignored. Nothing is dropped
// behind the user's back.

import { X } from "lucide-react";
import { cn } from "@/platform/lib/utils";
import { AssetImage } from "@/platform/components/ui/asset-image";
import type {
  GenerationReference,
  GenerationReferenceCategory,
} from "@/platform/lib/generationSpec";
import type { ReferenceSupport } from "@/platform/lib/modelRegistry";
import { resolveReferences } from "@/platform/lib/referenceSystem";

export const REFERENCE_CATEGORIES: GenerationReferenceCategory[] = [
  "character",
  "style",
  "product",
  "scene",
  "pose",
  "lighting",
  "color",
  "asset",
  "other",
];

const DEFAULT_STRENGTH = 0.75;

export function ReferenceTray({
  references,
  support,
  onChange,
  onRemove,
  /** Creator tier: expose per-reference category + strength. */
  showControls = true,
  className,
}: {
  references: GenerationReference[];
  support: ReferenceSupport;
  onChange: (url: string, patch: Partial<GenerationReference>) => void;
  onRemove?: (url: string) => void;
  showControls?: boolean;
  className?: string;
}) {
  if (references.length === 0) return null;

  const resolved = resolveReferences(references, support);
  const usedUrls = new Set(resolved.used.map((reference) => reference.url));
  const strengthHonored = resolved.strengthHonored;

  return (
    <div className={cn("space-y-2", className)}>
      {references.map((reference, index) => {
        const ignored = !usedUrls.has(reference.url);
        return (
          <div
            key={reference.url}
            className={cn(
              "flex items-center gap-2 rounded-lg border p-1.5 transition",
              ignored
                ? "border-border/60 bg-elevated/30 opacity-60"
                : "border-border bg-elevated/60"
            )}
          >
            <div className="relative shrink-0">
              <AssetImage
                src={reference.url}
                alt={`Reference ${index + 1}`}
                className={cn(
                  "h-12 w-12 rounded-md border border-border object-cover",
                  ignored && "grayscale"
                )}
              />
              {ignored ? (
                <span className="absolute inset-x-0 bottom-0 rounded-b-md bg-black/70 text-center text-[8px] font-semibold uppercase tracking-wide text-white/90">
                  Ignored
                </span>
              ) : null}
            </div>

            {showControls ? (
              <div className="min-w-0 flex-1 space-y-1">
                <select
                  aria-label={`Reference ${index + 1} category`}
                  value={reference.category ?? "asset"}
                  onChange={(event) =>
                    onChange(reference.url, {
                      category: event.target.value as GenerationReferenceCategory,
                    })
                  }
                  className="h-6 w-full rounded border border-border bg-surface px-1 text-[10px] capitalize text-foreground focus-visible:border-primary focus-visible:outline-none"
                >
                  {REFERENCE_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-1.5">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    disabled={!strengthHonored}
                    aria-label={`Reference ${index + 1} strength`}
                    value={Math.round((reference.strength ?? DEFAULT_STRENGTH) * 100)}
                    onChange={(event) =>
                      onChange(reference.url, { strength: Number(event.target.value) / 100 })
                    }
                    className="h-1 flex-1 accent-[var(--color-primary)] disabled:opacity-40"
                    title={
                      strengthHonored
                        ? "How strongly this reference guides the result"
                        : "This model does not honor per-reference strength"
                    }
                  />
                  <span className="w-7 text-right text-[10px] tabular-nums text-muted">
                    {Math.round((reference.strength ?? DEFAULT_STRENGTH) * 100)}
                  </span>
                </div>
              </div>
            ) : (
              <span className="min-w-0 flex-1 truncate text-[11px] capitalize text-muted">
                {reference.category ?? "asset"}
              </span>
            )}

            {onRemove ? (
              <button
                type="button"
                onClick={() => onRemove(reference.url)}
                aria-label={`Remove reference ${index + 1}`}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted transition hover:bg-danger/10 hover:text-danger"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
