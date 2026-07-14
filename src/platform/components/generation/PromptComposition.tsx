/**
 * Prompt Composition Display
 * Shows breakdown of user prompt, presets, and studio context
 */

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/platform/lib/utils";
import { Badge } from "@/platform/components/ui/badge";
import type { PromptComposition } from "./types";

interface PromptCompositionProps {
  composition: PromptComposition;
  editable?: boolean;
  onUserPromptChange?: (prompt: string) => void;
}

export function PromptComposition({
  composition,
  editable = false,
  onUserPromptChange,
}: PromptCompositionProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="space-y-2 rounded-md border border-border bg-elevated/40 p-3 text-xs">
      {/* Collapsed View - Final Prompt */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="inline-flex items-center gap-1 font-semibold text-foreground hover:text-primary"
          >
            <ChevronDown
              className={cn("h-3.5 w-3.5 transition", expanded && "rotate-180")}
            />
            Prompt breakdown
          </button>
        </div>

        {/* Final Prompt Display */}
        <div className="max-h-32 overflow-auto rounded bg-background/50 p-2 leading-5 text-muted">
          {composition.finalPrompt}
        </div>
      </div>

      {/* Expanded View - Composition Details */}
      {expanded && (
        <div className="border-t border-border pt-2">
          {/* User Prompt */}
          {composition.userPrompt && (
            <div className="mb-2">
              <div className="mb-1 flex items-center gap-1.5">
                <Badge variant="default" className="text-[9px]">
                  Your prompt
                </Badge>
              </div>
              {editable && onUserPromptChange ? (
                <textarea
                  value={composition.userPrompt}
                  onChange={(e) => onUserPromptChange(e.target.value)}
                  className="h-16 w-full rounded bg-background/70 p-1.5 text-[11px] leading-4 text-foreground"
                />
              ) : (
                <div className="rounded bg-background/50 p-1.5 text-[11px] leading-4 text-muted">
                  {composition.userPrompt}
                </div>
              )}
            </div>
          )}

          {/* Preset Directions */}
          {composition.presetDirections.length > 0 && (
            <div className="mb-2">
              <div className="mb-1 flex items-center gap-1.5">
                <Badge variant="default" className="text-[9px]">
                  Presets
                </Badge>
                <span className="text-[10px] text-muted">
                  ({composition.presetDirections.length})
                </span>
              </div>
              <div className="space-y-1 rounded bg-background/50 p-1.5">
                {composition.presetDirections.map((direction, idx) => (
                  <div key={idx} className="text-[11px] leading-4 text-muted">
                    • {direction}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Studio Context */}
          {composition.studioContext && (
            <div>
              <div className="mb-1 flex items-center gap-1.5">
                <Badge variant="default" className="text-[9px]">
                  Studio context
                </Badge>
              </div>
              <div className="rounded bg-background/50 p-1.5 text-[11px] leading-4 text-muted">
                {composition.studioContext}
              </div>
            </div>
          )}

          {/* Negative Prompt */}
          {composition.negativePrompt && (
            <div className="border-t border-border/50 pt-2">
              <div className="mb-1 flex items-center gap-1.5">
                <Badge variant="default" className="text-[9px]">
                  Negative prompt
                </Badge>
              </div>
              <div className="rounded bg-background/50 p-1.5 text-[11px] leading-4 text-muted/75">
                {composition.negativePrompt}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
