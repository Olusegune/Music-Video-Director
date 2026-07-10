// Prompt A/B compare — what actually changed between two takes.
//
// "Try it with and without the style layer" or "warmer wording vs. the
// original" only teaches you something if you can see precisely what differed.
// This diffs two pipelines layer by layer — added, removed, muted, and edited —
// and diffs their composed output as words, so the side-by-side view can
// highlight the delta rather than making the user spot it.
//
// Pure over its inputs; the drawer renders what it returns.

import { composePrompt, type PromptPipeline } from "@/platform/lib/promptPipeline";

export type LayerChangeKind =
  | "unchanged"
  | "added" // present in B, absent in A
  | "removed" // present in A, absent in B
  | "muted" // present in both, muted in B only
  | "unmuted" // present in both, muted in A only
  | "edited"; // text differs

export interface LayerChange {
  id: string;
  label: string;
  kind: LayerChangeKind;
  before?: string;
  after?: string;
}

export interface PromptComparison {
  layers: LayerChange[];
  /** Word-level diff of the composed positive prompt. */
  wordDiff: WordDiffPart[];
  identical: boolean;
}

export interface WordDiffPart {
  value: string;
  kind: "same" | "added" | "removed";
}

/** Compare two pipelines layer by layer, preserving A's order then B's extras. */
export function compareLayers(a: PromptPipeline, b: PromptPipeline): LayerChange[] {
  const byIdB = new Map(b.layers.map((layer) => [layer.id, layer]));
  const seen = new Set<string>();
  const changes: LayerChange[] = [];

  for (const layerA of a.layers) {
    seen.add(layerA.id);
    const layerB = byIdB.get(layerA.id);
    const base = { id: layerA.id, label: layerA.label, before: layerA.text, after: layerB?.text };
    if (!layerB) {
      changes.push({ ...base, kind: "removed", after: undefined });
    } else if (layerA.text !== layerB.text) {
      changes.push({ ...base, kind: "edited" });
    } else if (!layerA.muted && layerB.muted) {
      changes.push({ ...base, kind: "muted" });
    } else if (layerA.muted && !layerB.muted) {
      changes.push({ ...base, kind: "unmuted" });
    } else {
      changes.push({ ...base, kind: "unchanged" });
    }
  }

  for (const layerB of b.layers) {
    if (seen.has(layerB.id)) continue;
    changes.push({
      id: layerB.id,
      label: layerB.label,
      kind: "added",
      before: undefined,
      after: layerB.text,
    });
  }

  return changes;
}

/**
 * A minimal word-level diff (LCS). Enough to highlight what changed in a prompt;
 * not a general text-diff library.
 */
export function diffWords(before: string, after: string): WordDiffPart[] {
  const a = before.match(/\S+\s*/g) ?? [];
  const b = after.match(/\S+\s*/g) ?? [];
  const m = a.length;
  const n = b.length;

  // LCS length table.
  const lcs: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i -= 1) {
    for (let j = n - 1; j >= 0; j -= 1) {
      lcs[i][j] =
        a[i].trim() === b[j].trim()
          ? lcs[i + 1][j + 1] + 1
          : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const parts: WordDiffPart[] = [];
  const push = (value: string, kind: WordDiffPart["kind"]) => {
    const last = parts[parts.length - 1];
    if (last && last.kind === kind) last.value += value;
    else parts.push({ value, kind });
  };

  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (a[i].trim() === b[j].trim()) {
      push(b[j], "same");
      i += 1;
      j += 1;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      push(a[i], "removed");
      i += 1;
    } else {
      push(b[j], "added");
      j += 1;
    }
  }
  while (i < m) push(a[i++], "removed");
  while (j < n) push(b[j++], "added");

  return parts;
}

export function comparePipelines(a: PromptPipeline, b: PromptPipeline): PromptComparison {
  const layers = compareLayers(a, b);
  const composedA = composePrompt(a).prompt;
  const composedB = composePrompt(b).prompt;
  const wordDiff = diffWords(composedA, composedB);
  return {
    layers,
    wordDiff,
    identical: composedA === composedB && layers.every((change) => change.kind === "unchanged"),
  };
}

/** Start a B variant as a structural copy of A, so edits are deltas from A. */
export function forkVariant(pipeline: PromptPipeline): PromptPipeline {
  return {
    variables: pipeline.variables ? { ...pipeline.variables } : undefined,
    layers: pipeline.layers.map((layer) => ({ ...layer })),
  };
}
