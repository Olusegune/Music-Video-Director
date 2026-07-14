/**
 * Advanced Generation Settings
 * Seed, negative prompt, aspect ratio, quality, etc.
 */

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/platform/lib/utils";
import { Button } from "@/platform/components/ui/button";
import type { GenerationState } from "./types";

interface AdvancedGenerationSettingsProps {
  state: GenerationState;
  onStateChange: (updates: Partial<GenerationState>) => void;
  capabilities?: {
    supportsNegativePrompt?: boolean;
    supportsSeed?: boolean;
    supportsAspectRatio?: boolean;
    supportsResolution?: boolean;
    supportsQuality?: boolean;
  };
}

const ASPECT_RATIOS = [
  { value: "1:1", label: "1:1 (Square)" },
  { value: "16:9", label: "16:9 (Wide)" },
  { value: "9:16", label: "9:16 (Portrait)" },
  { value: "3:2", label: "3:2 (Standard)" },
  { value: "4:3", label: "4:3 (Classic)" },
];

export function AdvancedGenerationSettings({
  state,
  onStateChange,
  capabilities = {},
}: AdvancedGenerationSettingsProps) {
  const [expanded, setExpanded] = useState(false);

  const canUseNegative = capabilities.supportsNegativePrompt ?? true;
  const canUseSeed = capabilities.supportsSeed ?? true;
  const canUseAspect = capabilities.supportsAspectRatio ?? true;
  const canUseQuality = capabilities.supportsQuality ?? true;

  return (
    <div className="space-y-2 rounded-md border border-border bg-surface p-3">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between text-sm font-semibold text-foreground hover:text-primary"
      >
        Advanced Settings
        <ChevronDown
          className={cn("h-4 w-4 transition", expanded && "rotate-180")}
        />
      </button>

      {/* Settings Grid */}
      {expanded && (
        <div className="space-y-3 border-t border-border pt-3">
          {/* Negative Prompt */}
          {canUseNegative && (
            <div>
              <label className="text-xs font-semibold text-muted">
                Negative Prompt
              </label>
              <textarea
                value={state.negativePrompt || ""}
                onChange={(e) =>
                  onStateChange({ negativePrompt: e.target.value })
                }
                placeholder="Things to avoid in generation (optional)"
                className="mt-1 h-16 w-full rounded-md border border-border bg-background/70 p-2 text-xs text-foreground placeholder-muted/50"
              />
              <p className="mt-1 text-[10px] text-muted/70">
                Describe what you DON'T want to see in the generated image
              </p>
            </div>
          )}

          {/* Seed */}
          {canUseSeed && (
            <div className="grid gap-2">
              <label className="text-xs font-semibold text-muted">
                Seed (reproducibility)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={state.seed ?? ""}
                  onChange={(e) =>
                    onStateChange({
                      seed: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                  placeholder="Leave blank for random"
                  className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs"
                />
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    const randomSeed = Math.floor(Math.random() * 2147483647);
                    onStateChange({ seed: randomSeed });
                  }}
                >
                  Random
                </Button>
              </div>
              <p className="text-[10px] text-muted/70">
                Same seed produces consistent results with same prompt
              </p>
            </div>
          )}

          {/* Aspect Ratio */}
          {canUseAspect && (
            <div>
              <label className="text-xs font-semibold text-muted">
                Aspect Ratio
              </label>
              <div className="mt-1 grid grid-cols-2 gap-1.5">
                {ASPECT_RATIOS.map((ratio) => (
                  <button
                    key={ratio.value}
                    type="button"
                    onClick={() =>
                      onStateChange({ aspectRatio: ratio.value })
                    }
                    className={cn(
                      "rounded-md border px-2 py-1 text-xs font-medium transition",
                      state.aspectRatio === ratio.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background/50 text-muted hover:bg-background"
                    )}
                  >
                    {ratio.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quality */}
          {canUseQuality && (
            <div>
              <label className="text-xs font-semibold text-muted">
                Quality
              </label>
              <div className="mt-1 flex gap-2">
                {["standard", "hd"].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => onStateChange({ quality: q as any })}
                    className={cn(
                      "flex-1 rounded-md border px-2 py-1 text-xs font-medium transition",
                      state.quality === q
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background/50 text-muted hover:bg-background"
                    )}
                  >
                    {q === "standard" ? "Standard" : "High Definition"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Batch Count */}
          <div>
            <label className="text-xs font-semibold text-muted">
              Number of Images
            </label>
            <div className="mt-1 flex gap-2">
              {[1, 2, 4].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => onStateChange({ batch: n })}
                  className={cn(
                    "flex-1 rounded-md border px-2 py-1 text-xs font-medium transition",
                    state.batch === n
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background/50 text-muted hover:bg-background"
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
