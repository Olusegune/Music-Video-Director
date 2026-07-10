// Prompt pipeline — the prompt as a stack of contributions, not a blob.
//
// Today a host composes identity + DNA + style + consistency rules into one
// string and hands it to the panel, where it becomes an opaque paragraph the
// user can only edit as prose. They cannot see which part came from the
// Character Bible, which came from the style preset, or what the model is being
// told beyond what they typed.
//
// A pipeline keeps those contributions separate and named. You can mute a layer,
// override one, and see exactly what will be sent. `{variables}` are resolved
// from project context, and anything unresolved is reported rather than shipped
// to the model as a literal "{product}".

export type PromptLayerKind = "system" | "dna" | "style" | "template" | "user" | "negative";

export interface PromptLayer {
  id: string;
  kind: PromptLayerKind;
  /** Shown in the drawer, e.g. "Character DNA". */
  label: string;
  text: string;
  /** Where it came from, e.g. "Character Bible · Neo Dude". */
  source?: string;
  /** Creator tier may edit this layer in place. */
  editable?: boolean;
  /** Muted layers are kept, greyed, and excluded from the composed prompt. */
  muted?: boolean;
}

export interface PromptPipeline {
  layers: PromptLayer[];
  /** Values for `{name}` placeholders, e.g. { product: "Aurora No. 5" }. */
  variables?: Record<string, string>;
}

export interface ComposedPrompt {
  prompt: string;
  negativePrompt?: string;
  /** `{names}` with no value. The caller should refuse to generate on these. */
  missingVariables: string[];
}

const VARIABLE = /\{([a-z0-9_.-]+)\}/gi;

/** Substitute `{name}` from `variables`; report the ones with no value. */
export function resolveVariables(
  text: string,
  variables: Record<string, string> = {}
): { text: string; missing: string[] } {
  const missing = new Set<string>();
  const resolved = text.replace(VARIABLE, (match, name: string) => {
    const value = variables[name];
    if (value === undefined || value === "") {
      missing.add(name);
      return match;
    }
    return value;
  });
  return { text: resolved, missing: [...missing] };
}

/** Every `{name}` referenced anywhere in the pipeline, in first-seen order. */
export function usedVariables(pipeline: PromptPipeline): string[] {
  const names: string[] = [];
  for (const layer of pipeline.layers) {
    for (const match of layer.text.matchAll(VARIABLE)) {
      if (!names.includes(match[1])) names.push(match[1]);
    }
  }
  return names;
}

/**
 * Join fragments into one prompt: trimmed and de-duplicated. Multiple fragments
 * are sentence-punctuated so they don't run together; a lone fragment passes
 * through verbatim, so a host that supplies one plain prompt gets back exactly
 * what it wrote.
 */
function join(parts: string[]): string {
  const seen = new Set<string>();
  const kept: string[] = [];
  for (const raw of parts) {
    const text = raw.trim().replace(/\s+/g, " ");
    if (!text) continue;
    const key = text.toLowerCase().replace(/[.\s]+$/, "");
    if (seen.has(key)) continue; // a layer repeating another adds nothing
    seen.add(key);
    kept.push(text);
  }
  if (kept.length <= 1) return kept[0] ?? "";
  return kept.map((text) => (/[.!?]$/.test(text) ? text : `${text}.`)).join(" ");
}

/**
 * Flatten the pipeline into what actually gets sent. Muted layers are skipped;
 * negative layers become the negative prompt; unresolved variables are reported
 * and left as-is so the caller can block on them.
 */
export function composePrompt(pipeline: PromptPipeline): ComposedPrompt {
  const missing = new Set<string>();
  const positive: string[] = [];
  const negative: string[] = [];

  for (const layer of pipeline.layers) {
    if (layer.muted) continue;
    const { text, missing: layerMissing } = resolveVariables(layer.text, pipeline.variables);
    layerMissing.forEach((name) => missing.add(name));
    if (!text.trim()) continue;
    (layer.kind === "negative" ? negative : positive).push(text);
  }

  return {
    prompt: join(positive),
    negativePrompt: negative.length ? join(negative) : undefined,
    missingVariables: [...missing],
  };
}

/** A pipeline for hosts that still hand us one flat prompt string. */
export function singleLayerPipeline(
  prompt: string,
  negativePrompt?: string,
  variables?: Record<string, string>
): PromptPipeline {
  const layers: PromptLayer[] = [
    { id: "user", kind: "user", label: "Your prompt", text: prompt, editable: true },
  ];
  if (negativePrompt) {
    layers.push({
      id: "negative",
      kind: "negative",
      label: "Negative prompt",
      text: negativePrompt,
      editable: true,
    });
  }
  return { layers, variables };
}

export function setLayer(
  pipeline: PromptPipeline,
  id: string,
  patch: Partial<PromptLayer>
): PromptPipeline {
  return {
    ...pipeline,
    layers: pipeline.layers.map((layer) => (layer.id === id ? { ...layer, ...patch } : layer)),
  };
}
