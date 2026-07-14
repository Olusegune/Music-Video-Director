/**
 * Universal Generation Panel — shared types for all studios
 */

import type { ProviderId } from "@/platform/lib/types";

export type GenerationMode = "auto" | "manual";

export interface GenerationState {
  mode: GenerationMode;
  selectedModel?: string;
  selectedProvider?: ProviderId;
  prompt: string;
  userPrompt?: string;
  negativePrompt?: string;
  seed?: number;
  batch?: number;
  aspectRatio?: string;
  resolution?: { width: number; height: number };
  quality?: "standard" | "hd";
  status: "idle" | "validating" | "queued" | "generating" | "completed" | "failed";
  progress?: number;
  error?: string;
  resultUrl?: string;
  resultId?: string;
}

export interface GenerationHistoryEntry {
  id: string;
  timestamp: string;
  mode: GenerationMode;
  model: string;
  provider: ProviderId;
  prompt: string;
  resultUrl?: string;
  status: "success" | "failed";
  duration?: number;
}

export interface PromptComposition {
  userPrompt: string;
  presetDirections: string[];
  studioContext: string;
  finalPrompt: string;
  negativePrompt?: string;
}

export interface GenerationPanelProps {
  prompt: string;
  selectedProvider?: ProviderId;
  onProviderChange: (provider: ProviderId) => void;
  generating: boolean;
  onGenerate: () => void;
  onPromptChange?: (prompt: string) => void;
  capabilities?: {
    supportsNegativePrompt?: boolean;
    supportsSeed?: boolean;
    supportsAspectRatio?: boolean;
    supportsResolution?: boolean;
    supportsQuality?: boolean;
  };
  showAdvanced?: boolean;
  history?: GenerationHistoryEntry[];
  onHistorySelect?: (entry: GenerationHistoryEntry) => void;
}
