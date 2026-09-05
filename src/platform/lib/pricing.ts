// Self-tracked spend estimation — see usageTracking.ts for where this feeds
// the usage log, and Dashboard's "Spend & Credits" panel for where it's
// shown. There is no way to get one uniform, exact per-call cost from every
// provider: most bill per-image/per-second at published rates, a few meter
// by token or resolution tier, and none of that is returned in the
// generation response itself. This table is a best-effort per-model (or
// per-provider default) estimate — good enough to show a real running total
// and catch a runaway expensive model, not a substitute for the provider's
// own invoice. Prices are USD, approximate, and will drift as providers
// change theirs; update the entries below rather than trusting them forever.

import type { Capability } from "@/platform/lib/types";

// Broader than modelRegistry's PricingKind (image/video only) — this table also
// prices the audio (ElevenLabs voice) and text (Gemini) generation paths.
type PricingKind = Capability | "audio";

interface PriceEntry {
  /** Cost in USD per single generation (one image, one video clip, etc.). */
  perUnit: number;
  /** Short human note on how the estimate was derived, shown on hover. */
  basis: string;
}

// Specific model-id overrides (modelRegistry's `id`, e.g. "fal:flux-pro").
// Anything not listed here falls back to the provider+kind default below.
const MODEL_PRICES: Record<string, PriceEntry> = {
  "openai:gpt-image-1": { perUnit: 0.04, basis: "~$0.04/image, standard quality" },
  "google_imagen:imagen-4": { perUnit: 0.04, basis: "~$0.04/image" },
  "stability:sd3.5-large": { perUnit: 0.065, basis: "~6.5 credits/image at $0.01/credit" },
  "fal:flux-pro": { perUnit: 0.05, basis: "~$0.05/image" },
  "google_veo:veo-3": { perUnit: 0.75, basis: "~$0.75 per 8s clip" },
  "kie:seedance-2.0-lite": { perUnit: 0.25, basis: "~$0.25 per 5s clip (Seedance via Kie)" },
  "fal:seedance-2.0": { perUnit: 0.4, basis: "~$0.40 per 5s clip (Seedance via Fal)" },
  "replicate:kling-2.0": { perUnit: 0.5, basis: "~$0.50 per 5s clip" },
};

// Provider+kind fallback when a specific model isn't listed above.
const PROVIDER_DEFAULTS: Record<string, Partial<Record<PricingKind, PriceEntry>>> = {
  openai: { image: { perUnit: 0.04, basis: "estimate — GPT Image class pricing" } },
  google_imagen: { image: { perUnit: 0.04, basis: "estimate — Imagen class pricing" } },
  google_veo: { video: { perUnit: 0.75, basis: "estimate — Veo class pricing, ~8s clip" } },
  stability: { image: { perUnit: 0.06, basis: "estimate — Stable Diffusion class pricing" } },
  fal: {
    image: { perUnit: 0.04, basis: "estimate — Fal aggregator image models" },
    video: { perUnit: 0.35, basis: "estimate — Fal aggregator video models" },
  },
  kie: {
    image: { perUnit: 0.03, basis: "estimate — Kie aggregator image models" },
    video: { perUnit: 0.3, basis: "estimate — Kie aggregator video models" },
  },
  wavespeed: {
    image: { perUnit: 0.03, basis: "estimate — WaveSpeed aggregator" },
    video: { perUnit: 0.3, basis: "estimate — WaveSpeed aggregator" },
  },
  replicate: {
    image: { perUnit: 0.03, basis: "estimate — Replicate pay-per-second billing" },
    video: { perUnit: 0.45, basis: "estimate — Replicate pay-per-second billing" },
  },
  grok: { image: { perUnit: 0.02, basis: "estimate" } },
  recraft: { image: { perUnit: 0.04, basis: "estimate" } },
  ideogram: { image: { perUnit: 0.06, basis: "estimate" } },
  runway: { video: { perUnit: 0.5, basis: "estimate — Runway credit pricing" } },
  happyhorse: { video: { perUnit: 0.3, basis: "estimate" } },
  elevenlabs: { audio: { perUnit: 0.02, basis: "estimate — per generation, ElevenLabs has real usage tracking" } },
  gemini: { text: { perUnit: 0.002, basis: "estimate — Gemini text-class token pricing" } },
  // No public API cost, or genuinely free/local — never logged as spend.
  local: { image: { perUnit: 0, basis: "local — no cost" } },
  manual: { image: { perUnit: 0, basis: "manual (Midjourney) — billed outside the app" } },
};

/** Providers with a `checkProviderBalance` that returns something real,
 *  not just this estimate table. Kept in one place so the UI can label
 *  "estimated" vs "from account" accurately. */
export const PROVIDERS_WITH_REAL_BALANCE = new Set(["stability", "elevenlabs"]);

export function estimateCost(
  providerKey: string,
  modelId: string,
  kind: PricingKind,
  units = 1
): PriceEntry {
  const specific = MODEL_PRICES[modelId];
  if (specific) return { ...specific, perUnit: specific.perUnit * units };
  const fallback = PROVIDER_DEFAULTS[providerKey]?.[kind];
  if (fallback) return { ...fallback, perUnit: fallback.perUnit * units };
  return { perUnit: 0, basis: "no pricing data for this provider yet" };
}
