// Provider catalog + router.
//
// The app is modular: every capability (text / image / video / audio) can be
// served by several vendors. The router chooses which vendor handles a task
// based on the active mode. Keys live in the OS keychain (Rust) or a
// localStorage mock (browser dev); only *status* ever reaches the UI.

import type { ProviderId } from "@/platform/lib/types";

export type Capability = "text" | "image" | "video" | "audio";

export type RouterMode = "auto" | "quality" | "speed" | "cost" | "manual" | "local";

export const ROUTER_MODES: { id: RouterMode; label: string; hint: string }[] = [
  { id: "auto", label: "Auto", hint: "Balanced pick per task from configured keys" },
  { id: "quality", label: "Quality-first", hint: "Best-looking model available" },
  { id: "speed", label: "Speed-first", hint: "Fastest model available" },
  { id: "cost", label: "Cost-aware", hint: "Cheapest capable model" },
  { id: "manual", label: "Manual", hint: "You pick the vendor per capability" },
  { id: "local", label: "Local prompt-only", hint: "No API calls — generate the pack offline" },
];

export interface ProviderInfo {
  id: ProviderId;
  name: string;
  capabilities: Capability[];
  /** relative quality / speed / cost weights, 1–5 (5 = best/fastest/cheapest). */
  quality: number;
  speed: number;
  cheap: number;
  hint: string;
  /** Wired through the Rust core today, or prompt-export / manual workflow only. */
  status: "wired" | "manual" | "planned";
  /** Rust adapter accepts product/character reference image bytes for image generation. */
  supportsImageReferences?: boolean;
}

// One entry per vendor named in the spec. `wired` = a Rust adapter exists today;
// `manual` = prompt-export / import-after-generation; `planned` = adapter pending.
export const PROVIDERS: ProviderInfo[] = [
  // Text / reasoning
  {
    id: "gemini",
    name: "Google Gemini",
    capabilities: ["text", "image"],
    quality: 5,
    speed: 4,
    cheap: 4,
    hint: "AI Studio API key · Nano Banana reference image workflow",
    status: "wired",
    supportsImageReferences: true,
  },
  {
    id: "openai",
    name: "OpenAI",
    capabilities: ["text", "image"],
    quality: 5,
    speed: 4,
    cheap: 3,
    hint: "OpenAI API key (GPT Image wired)",
    status: "wired",
    supportsImageReferences: true,
  },

  // Image
  {
    id: "fal",
    name: "fal.ai",
    capabilities: ["image", "video"],
    quality: 4,
    speed: 5,
    cheap: 4,
    hint: "fal key — FLUX, Seedance, Kling routing",
    status: "wired",
  },
  {
    id: "google_imagen",
    name: "Google Imagen",
    capabilities: ["image"],
    quality: 4,
    speed: 4,
    cheap: 4,
    hint: "Google API key",
    status: "wired",
    supportsImageReferences: true,
  },
  {
    id: "nano_banana",
    name: "Nano Banana",
    capabilities: ["image"],
    quality: 4,
    speed: 4,
    cheap: 4,
    hint: "Gemini image workflow",
    status: "planned",
    supportsImageReferences: true,
  },
  {
    id: "nano_banana_pro",
    name: "Nano Banana Pro",
    capabilities: ["image"],
    quality: 5,
    speed: 3,
    cheap: 3,
    hint: "Gemini Pro image workflow",
    status: "planned",
    supportsImageReferences: true,
  },
  {
    id: "gpt_image",
    name: "GPT Image",
    capabilities: ["image"],
    quality: 5,
    speed: 3,
    cheap: 2,
    hint: "OpenAI image models",
    status: "wired",
    supportsImageReferences: true,
  },
  {
    id: "stability",
    name: "Stability AI",
    capabilities: ["image"],
    quality: 4,
    speed: 4,
    cheap: 4,
    hint: "Stability API key (SDXL)",
    status: "wired",
  },
  {
    id: "midjourney",
    name: "Midjourney",
    capabilities: ["image"],
    quality: 5,
    speed: 3,
    cheap: 3,
    hint: "Prompt export + import after generation",
    status: "manual",
  },
  {
    id: "grok",
    name: "Grok / xAI",
    capabilities: ["image", "video"],
    quality: 4,
    speed: 4,
    cheap: 3,
    hint: "xAI API key — grok-2-image (video where available)",
    status: "wired",
  },
  {
    id: "wavespeed",
    name: "WaveSpeed AI",
    capabilities: ["image", "video"],
    quality: 4,
    speed: 5,
    cheap: 4,
    hint: "WaveSpeed key — Seedance · Kling · FLUX routing",
    status: "wired",
    supportsImageReferences: true,
  },
  {
    id: "recraft",
    name: "Recraft",
    capabilities: ["image"],
    quality: 4,
    speed: 4,
    cheap: 4,
    hint: "Recraft v3 image / vector",
    status: "planned",
  },
  {
    id: "ideogram",
    name: "Ideogram",
    capabilities: ["image"],
    quality: 4,
    speed: 4,
    cheap: 4,
    hint: "Ideogram image / typography",
    status: "planned",
  },

  // Video
  {
    id: "happyhorse",
    name: "Happy Horse",
    capabilities: ["video"],
    quality: 4,
    speed: 4,
    cheap: 4,
    hint: "Performance / dance video models",
    status: "planned",
  },
  {
    id: "minimax",
    name: "MiniMax",
    capabilities: ["video"],
    quality: 4,
    speed: 4,
    cheap: 4,
    hint: "MiniMax video",
    status: "planned",
  },
  {
    id: "kie",
    name: "kie.ai",
    capabilities: ["image", "video"],
    quality: 4,
    speed: 4,
    cheap: 4,
    hint: "kie.ai key — unified jobs API (GPT Image/Veo/Kling)",
    status: "wired",
  },
  {
    id: "google_veo",
    name: "Google Veo",
    capabilities: ["video"],
    quality: 5,
    speed: 3,
    cheap: 3,
    hint: "Google API key",
    status: "wired",
  },
  {
    id: "runway",
    name: "Runway",
    capabilities: ["video"],
    quality: 5,
    speed: 3,
    cheap: 2,
    hint: "Direct API, or via Replicate",
    status: "planned",
  },
  {
    id: "kling",
    name: "Kling",
    capabilities: ["video"],
    quality: 4,
    speed: 3,
    cheap: 3,
    hint: "via fal.ai or Replicate",
    status: "planned",
  },
  {
    id: "luma",
    name: "Luma",
    capabilities: ["video"],
    quality: 4,
    speed: 4,
    cheap: 3,
    hint: "Dream Machine, or via Replicate",
    status: "planned",
  },
  {
    id: "pika",
    name: "Pika",
    capabilities: ["video"],
    quality: 4,
    speed: 4,
    cheap: 3,
    hint: "Direct API, or via Replicate",
    status: "planned",
  },

  // Audio
  {
    id: "elevenlabs",
    name: "ElevenLabs",
    capabilities: ["audio"],
    quality: 5,
    speed: 4,
    cheap: 3,
    hint: "Voiceover (wired) · SFX",
    status: "wired",
  },
  {
    id: "suno",
    name: "Suno / Udio",
    capabilities: ["audio"],
    quality: 4,
    speed: 3,
    cheap: 3,
    hint: "Music generation where available",
    status: "manual",
  },

  // Other
  {
    id: "replicate",
    name: "Replicate",
    capabilities: ["image", "video", "audio"],
    quality: 4,
    speed: 4,
    cheap: 4,
    hint: "Replicate API token — runs Flux/Kling/Luma/Minimax",
    status: "wired",
  },
  {
    id: "local_endpoint",
    name: "Local Endpoint",
    capabilities: ["text", "image", "video"],
    quality: 3,
    speed: 3,
    cheap: 5,
    hint: "http://localhost model server (OpenAI-compatible)",
    status: "planned",
  },
];

export const CAPABILITY_LABEL: Record<Capability, string> = {
  text: "Text · Reasoning",
  image: "Image",
  video: "Video",
  audio: "Audio",
};

export function providersFor(cap: Capability): ProviderInfo[] {
  return PROVIDERS.filter((p) => p.capabilities.includes(cap));
}

export function providerInfo(id: ProviderId): ProviderInfo | undefined {
  return PROVIDERS.find((p) => p.id === id);
}

// --- Router config (persisted; non-secret) ---------------------------------

export interface RouterConfig {
  mode: RouterMode;
  /** Manual-mode per-capability overrides. */
  manual: Partial<Record<Capability, ProviderId>>;
  /** Per-model preferred adapter/aggregator, e.g. GPT Image via Kie vs OpenAI. */
  preferredAggregators?: Record<string, ProviderId>;
}

const LS_ROUTER = "mf.router";

export function loadRouterConfig(): RouterConfig {
  try {
    const raw = localStorage.getItem(LS_ROUTER);
    if (raw) {
      const parsed = JSON.parse(raw) as RouterConfig;
      return {
        mode: parsed.mode ?? "auto",
        manual: parsed.manual ?? {},
        preferredAggregators: parsed.preferredAggregators ?? {},
      };
    }
  } catch {
    /* fall through */
  }
  return { mode: "auto", manual: {}, preferredAggregators: {} };
}

export function saveRouterConfig(cfg: RouterConfig) {
  localStorage.setItem(
    LS_ROUTER,
    JSON.stringify({ ...cfg, preferredAggregators: cfg.preferredAggregators ?? {} })
  );
}

export function savePreferredAggregator(modelHint: string, provider: ProviderId): RouterConfig {
  const cfg = loadRouterConfig();
  const next: RouterConfig = {
    ...cfg,
    preferredAggregators: { ...(cfg.preferredAggregators ?? {}), [modelHint]: provider },
  };
  saveRouterConfig(next);
  return next;
}

function scoreProviderForMode(mode: RouterMode, provider: ProviderInfo): number {
  return mode === "quality"
    ? provider.quality
    : mode === "speed"
      ? provider.speed
      : mode === "cost"
        ? provider.cheap
        : provider.quality + provider.speed + provider.cheap;
}

export function routeProviderChain(
  cap: Capability,
  cfg: RouterConfig,
  configured: Set<ProviderId>,
  opts?: { providerPref?: ProviderId; modelHint?: string; includeManual?: boolean }
): ProviderId[] {
  if (cfg.mode === "local") return [];

  const candidates = providersFor(cap).filter(
    (p) => (opts?.includeManual || p.status !== "manual") && configured.has(p.id)
  );
  if (candidates.length === 0) return [];

  const weighted = [...candidates].sort(
    (a, b) => scoreProviderForMode(cfg.mode, b) - scoreProviderForMode(cfg.mode, a)
  );

  const preferred = [
    opts?.providerPref,
    opts?.modelHint ? cfg.preferredAggregators?.[opts.modelHint] : undefined,
    cfg.mode === "manual" ? cfg.manual[cap] : undefined,
  ].filter(Boolean) as ProviderId[];

  const ordered: ProviderId[] = [];
  for (const pick of preferred) {
    if (configured.has(pick) && candidates.some((candidate) => candidate.id === pick)) {
      ordered.push(pick);
    }
  }
  for (const provider of weighted) ordered.push(provider.id);
  return [...new Set(ordered)];
}

export function isRecoverableProviderFailure(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /401|403|429|quota|rate limit|5\d\d|timeout|timed out|network|unavailable|billing|credits/i.test(
    message
  );
}

export function notifyGenerationFallback(from: ProviderId, to: ProviderId): void {
  if (typeof window === "undefined") return;
  const fromName = providerInfo(from)?.name ?? from;
  const toName = providerInfo(to)?.name ?? to;
  window.dispatchEvent(
    new CustomEvent("mf-toast", {
      detail: `${fromName} could not complete the generation. Trying ${toName} instead.`,
    })
  );
}

/**
 * Choose a provider for a capability given the active mode and which providers
 * currently have a configured key. Returns null when nothing is available
 * (caller should fall back to local prompt-only output).
 */
export function routeProvider(
  cap: Capability,
  cfg: RouterConfig,
  configured: Set<ProviderId>
): ProviderId | null {
  return routeProviderChain(cap, cfg, configured)[0] ?? null;
}

/** Prefer an adapter that actually consumes image references; null means honest prompt-only/look-alike fallback. */
export function routeReferenceImageProvider(
  cfg: RouterConfig,
  configured: Set<ProviderId>
): ProviderId | null {
  if (cfg.mode === "local") return null;
  const candidates = providersFor("image").filter(
    (provider) =>
      provider.status !== "manual" &&
      provider.supportsImageReferences &&
      configured.has(provider.id)
  );
  if (!candidates.length) return null;
  if (cfg.mode === "manual") {
    const preferred = cfg.manual.image;
    if (preferred && candidates.some((provider) => provider.id === preferred)) return preferred;
  }
  const score = (provider: ProviderInfo) =>
    cfg.mode === "quality"
      ? provider.quality
      : cfg.mode === "speed"
        ? provider.speed
        : cfg.mode === "cost"
          ? provider.cheap
          : provider.quality + provider.speed + provider.cheap;
  return [...candidates].sort((left, right) => score(right) - score(left))[0].id;
}
