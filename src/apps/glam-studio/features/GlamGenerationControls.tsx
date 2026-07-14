/**
 * Glam Studio Generation Controls
 * Prompt visibility + basic model selector for image generation.
 */

import { useState } from "react";
import { Copy, Sparkles, ChevronDown } from "lucide-react";
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

interface GlamGenerationControlsProps {
  prompt: string;
  selectedProvider?: ProviderId;
  onProviderChange: (provider: ProviderId) => void;
  generating: boolean;
  onGenerate: () => void;
}

export function GlamGenerationControls({
  prompt,
  selectedProvider,
  onProviderChange,
  generating,
  onGenerate,
}: GlamGenerationControlsProps) {
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
      {/* Prompt Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Generation Prompt
          </CardTitle>
          <CardDescription>This is the exact prompt that will be sent to the model.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="max-h-40 overflow-auto rounded-md border border-border bg-background/70 p-3 text-xs leading-5 text-foreground">
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

      {/* Model Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Image Model</CardTitle>
          <CardDescription>Choose which model generates the hero image.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Selected Model Display */}
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

          {/* Model Picker Dropdown */}
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

          {/* Generate Button */}
          <Button
            onClick={onGenerate}
            disabled={generating || !prompt.trim()}
            className="w-full"
            variant="gold"
          >
            {generating ? (
              <>
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Generating hero…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Generate Hero
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
