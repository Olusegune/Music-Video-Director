import type { ProviderId } from "@/platform/lib/types";
import {
  isRecoverableProviderFailure,
  providerInfo,
  providersFor,
  routeProviderChain,
  type Capability,
  type RouterConfig,
} from "@/platform/lib/providers";
import {
  generationSupportForProviderKey,
  type GenerationParamSupport,
} from "@/platform/lib/modelRegistry";

export type GenerationCapability = Capability;

export type GenerationReferenceCategory =
  "character" | "style" | "product" | "scene" | "pose" | "lighting" | "color" | "asset" | "other";

export interface GenerationReference {
  url: string;
  category?: GenerationReferenceCategory;
  strength?: number;
  sourceEntity?: string;
}

export interface GenerationResolution {
  width: number;
  height: number;
  label?: string;
}

export interface ProjectRef {
  moduleId: string;
  projectId?: string;
  entityId?: string;
}

export interface GenerationSpec {
  capability: GenerationCapability;
  prompt: string;
  negativePrompt?: string;
  seed?: number;
  batch?: number;
  aspect?: string;
  resolution?: GenerationResolution;
  references?: GenerationReference[];
  modelHint?: string;
  providerPref?: ProviderId;
  moduleId: string;
  projectRef?: ProjectRef;
}

export interface GenerationCandidate {
  provider: ProviderId;
  providerName: string;
  modelHint?: string;
  support: GenerationParamSupport;
  ignoredParams: string[];
}

export function normalizeGenerationSpec(spec: GenerationSpec): GenerationSpec {
  const prompt = spec.prompt.trim();
  const batch =
    typeof spec.batch === "number" && Number.isFinite(spec.batch)
      ? Math.max(1, Math.min(8, Math.round(spec.batch)))
      : undefined;
  const references = (spec.references ?? []).filter((ref) => ref.url.trim());
  return {
    ...spec,
    prompt,
    batch,
    references,
    negativePrompt: spec.negativePrompt?.trim() || undefined,
  };
}

export function unsupportedGenerationParams(
  spec: GenerationSpec,
  support: GenerationParamSupport
): string[] {
  const unsupported: string[] = [];
  if (spec.negativePrompt && !support.negativePrompt) unsupported.push("negative prompt");
  if (typeof spec.seed === "number" && !support.seed) unsupported.push("seed");
  if ((spec.batch ?? 1) > 1 && !support.batch) unsupported.push("batch");
  if (spec.resolution && !support.resolution) unsupported.push("resolution");
  if ((spec.references?.length ?? 0) > 0 && support.references === "none") {
    unsupported.push("references");
  }
  if ((spec.references?.length ?? 0) > 1 && support.references === "single") {
    unsupported.push("multiple references");
  }
  return unsupported;
}

export function resolveGenerationCandidates(
  spec: GenerationSpec,
  cfg: RouterConfig,
  configured: Set<ProviderId>
): GenerationCandidate[] {
  const normalized = normalizeGenerationSpec(spec);
  const chain = routeProviderChain(normalized.capability, cfg, configured, {
    providerPref: normalized.providerPref,
    modelHint: normalized.modelHint,
  });
  return chain.map((provider) => {
    const info = providerInfo(provider);
    const support = generationSupportForProviderKey(
      provider,
      normalized.capability === "video" ? "video" : "image"
    );
    return {
      provider,
      providerName: info?.name ?? provider,
      modelHint: normalized.modelHint,
      support,
      ignoredParams: unsupportedGenerationParams(normalized, support),
    };
  });
}

export function candidateLabels(candidates: GenerationCandidate[]): string[] {
  return candidates.map((candidate) =>
    candidate.modelHint
      ? `${candidate.providerName} (${candidate.modelHint})`
      : candidate.providerName
  );
}

/**
 * Run a generation against an ordered provider chain, auto-advancing to the next
 * provider when one fails recoverably (auth / quota / rate-limit / 5xx / network)
 * and announcing each hop via `onFallback`. Throws the last error when the chain
 * is exhausted or the failure is not recoverable. Pure over its injected `run`,
 * so it is unit-tested without touching the network.
 */
export async function runWithProviderFallback<T>(
  providers: ProviderId[],
  run: (provider: ProviderId) => Promise<T>,
  opts: {
    onFallback?: (from: ProviderId, to: ProviderId) => void;
    isRecoverable?: (error: unknown) => boolean;
  } = {}
): Promise<T> {
  if (providers.length === 0) {
    throw new Error("No configured provider is available for this generation.");
  }
  const recoverable = opts.isRecoverable ?? isRecoverableProviderFailure;
  let lastError: unknown;
  for (let i = 0; i < providers.length; i += 1) {
    try {
      return await run(providers[i]);
    } catch (error) {
      lastError = error;
      const next = providers[i + 1];
      if (next && recoverable(error)) {
        opts.onFallback?.(providers[i], next);
        continue;
      }
      throw error;
    }
  }
  throw lastError ?? new Error("No configured provider is available for this generation.");
}

export function canUseNetworkForSpec(
  spec: GenerationSpec,
  cfg: RouterConfig,
  configured: Set<ProviderId>
): boolean {
  return resolveGenerationCandidates(spec, cfg, configured).length > 0;
}

export function localOnlySpec(spec: GenerationSpec, cfg: RouterConfig): boolean {
  return cfg.mode === "local" || providersFor(spec.capability).length === 0;
}
