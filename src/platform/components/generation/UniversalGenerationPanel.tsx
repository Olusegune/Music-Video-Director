/**
 * Universal Generation Panel
 * Reusable generation controls across all studios
 */

import { Sparkles, Copy, ChevronDown } from "lucide-react";
import { useState } from "react";
import { Button } from "@/platform/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/platform/components/ui/card";
import { Badge } from "@/platform/components/ui/badge";
import { cn } from "@/platform/lib/utils";
import { MODEL_REGISTRY } from "@/platform/lib/modelRegistry";
import { PROVIDERS } from "@/platform/lib/providers";
import type { ProviderId } from "@/platform/lib/types";
import { PromptComposition } from "./PromptComposition";
import { AdvancedGenerationSettings } from "./AdvancedGenerationSettings";
import { GenerationProgress } from "./GenerationProgress";
import type { GenerationState, PromptComposition as PromptCompositionType } from "./types";

interface UniversalGenerationPanelProps {
  title?: string;
  prompt: string;
  promptComposition?: PromptCompositionType;
  selectedProvider?: ProviderId;
  onProviderChange: (provider: ProviderId) => void;
  generationState: GenerationState;
  onGenerationStateChange: (updates: Partial<GenerationState>) => void;
  onGenerate: () => void;
  onCancel?: () => void;
  capabilities?: {
    supportsNegativePrompt?: boolean;
    supportsSeed?: boolean;
    supportsAspectRatio?: boolean;
    supportsResolution?: boolean;
    supportsQuality?: boolean;
  };
  showAdvanced?: boolean;
}

export function UniversalGenerationPanel({
  title = "Generation",
  prompt,
  promptComposition,
  selectedProvider,
  onProviderChange,
  generationState,
  onGenerationStateChange,
  onGenerate,
  onCancel,
  capabilities,
  showAdvanced = true,
}: UniversalGenerationPanelProps) {
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);

  // Get available image models
  const availableModels = MODEL_REGISTRY.filter(
    (m) => m.kind === "image" && m.available
  );

  // Get selected model info
  const selectedModel = selectedProvider
    ? availableModels.find((m) => m.providerKey === selectedProvider)
    : availableModels[0];

  const providerInfo = selectedProvider
    ? PROVIDERS.find((p) => p.id === selectedProvider)
    : null;

  function copyPrompt() {
    navigator.clipboard.writeText(prompt);
    setPromptCopied(true);
    setTimeout(() => setPromptCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      {/* Generation Progress */}
      {generationState.status !== "idle" && (
        <GenerationProgress state={generationState} onCancel={onCancel} />
      )}

      {/* Mode Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Sparkles className="h-4 w-4 text-primary" />
            {title}
          </CardTitle>
          <CardDescription>
            {generationState.mode === "auto"
              ? "Recommended settings will be applied"
              : "Fine-tune every parameter"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Mode Toggle */}
          <div className="flex gap-2">
            {(["auto", "manual"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() =>
                  onGenerationStateChange({ mode })
                }
                className={cn(
                  "flex-1 rounded-md border px-3 py-2 text-xs font-medium transition",
                  generationState.mode === mode
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-surface hover:bg-surface/75"
                )}
              >
                {mode === "auto" ? "Auto (Recommended)" : "Manual"}
              </button>
            ))}
          </div>

          {/* Model Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted">Model</label>
            <button
              type="button"
              onClick={() => setShowModelPicker(!showModelPicker)}
              className="flex w-full items-center justify-between rounded-md border border-border bg-surface p-3 text-left text-sm transition hover:bg-surface/75"
            >
              <div>
                <div className="font-semibold">{selectedModel?.label}</div>
                <div className="text-xs text-muted">
                  {providerInfo?.name || "Auto-selected"}
                </div>
              </div>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-muted transition",
                  showModelPicker && "rotate-180"
                )}
              />
            </button>

            {showModelPicker && (
              <div className="space-y-2 rounded-md border border-border bg-elevated/40 p-2">
                {availableModels.map((model) => (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => {
                      onProviderChange(model.providerKey as ProviderId);
                      setShowModelPicker(false);
                    }}
                    className={cn(
                      "w-full rounded-md border p-2 text-left text-xs transition",
                      model.providerKey === selectedProvider
                        ? "border-primary bg-primary/10"
                        : "border-border bg-surface hover:bg-surface/75"
                    )}
                  >
                    <div className="font-semibold">{model.label}</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {model.capabilities.slice(0, 3).map((cap) => (
                        <Badge key={cap} className="text-[9px]">
                          {cap}
                        </Badge>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Prompt Display */}
      {promptComposition && (
        <PromptComposition composition={promptComposition} />
      )}

      {!promptComposition && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Prompt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="max-h-32 overflow-auto rounded-md border border-border bg-background/70 p-3 text-xs leading-5 text-foreground">
              {prompt}
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={copyPrompt}
              className="w-full"
            >
              <Copy className="h-3.5 w-3.5" />
              {promptCopied ? "Copied!" : "Copy prompt"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Advanced Settings */}
      {showAdvanced && (
        <AdvancedGenerationSettings
          state={generationState}
          onStateChange={onGenerationStateChange}
          capabilities={capabilities}
        />
      )}

      {/* Generate Button */}
      <Button
        onClick={onGenerate}
        disabled={
          generationState.status !== "idle" ||
          !prompt.trim()
        }
        className="w-full"
        variant="gold"
      >
        {generationState.status === "generating" ? (
          <>
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Generating…
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Generate
          </>
        )}
      </Button>
    </div>
  );
}
