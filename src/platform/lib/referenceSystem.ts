// Reference resolution — what a given model will actually do with your images.
//
// A GenerationSpec may carry any number of references, each with a category and
// a strength. Models disagree wildly: some ignore references entirely, some take
// exactly one, some take many, and only a few honor a per-reference strength.
// This layer resolves a spec's references against the routed model's declared
// support and reports, in plain language, anything it had to drop.
//
// The rule the platform commits to: never silently discard a user's reference.

import type { GenerationReference } from "@/platform/lib/generationSpec";
import type { ReferenceSupport } from "@/platform/lib/modelRegistry";

export interface ResolvedReferences {
  /** References actually sent to the provider, in priority order. */
  used: GenerationReference[];
  /** References the model cannot accept. Never silently dropped — reported. */
  dropped: GenerationReference[];
  support: ReferenceSupport;
  /** True when the model honors per-reference strength. */
  strengthHonored: boolean;
  /** User-facing explanation, present only when something was downgraded. */
  notice?: string;
}

const DEFAULT_STRENGTH = 0.75;

const strengthOf = (reference: GenerationReference) => reference.strength ?? DEFAULT_STRENGTH;

/**
 * Order references by how much the user leaned on them. A model that accepts
 * only one should get the reference the user weighted most, not whichever
 * happened to be added first.
 */
export function prioritize(references: GenerationReference[]): GenerationReference[] {
  return references
    .map((reference, index) => ({ reference, index }))
    .sort((a, b) => strengthOf(b.reference) - strengthOf(a.reference) || a.index - b.index)
    .map((entry) => entry.reference);
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

export function resolveReferences(
  references: GenerationReference[] | undefined,
  support: ReferenceSupport
): ResolvedReferences {
  const all = (references ?? []).filter((reference) => Boolean(reference?.url));
  const strengthHonored = support === "omni";

  if (all.length === 0) {
    return { used: [], dropped: [], support, strengthHonored };
  }

  if (support === "none") {
    return {
      used: [],
      dropped: all,
      support,
      strengthHonored: false,
      notice: `This model ignores reference images, so ${plural(all.length, "reference")} will not be used.`,
    };
  }

  const ordered = prioritize(all);

  if (support === "single" && ordered.length > 1) {
    const [first, ...rest] = ordered;
    return {
      used: [first],
      dropped: rest,
      support,
      strengthHonored: false,
      notice: `This model takes one reference. Using the strongest and ignoring ${plural(rest.length, "other")}.`,
    };
  }

  const notice =
    !strengthHonored && all.some((reference) => reference.strength !== undefined)
      ? "This model uses references as guidance; per-reference strength is ignored."
      : undefined;

  return { used: ordered, dropped: [], support, strengthHonored, notice };
}

/** A short badge for the generation UI, e.g. "Up to 1 reference". */
export function describeReferenceSupport(support: ReferenceSupport): string {
  switch (support) {
    case "none":
      return "References not supported";
    case "single":
      return "One reference";
    case "multi":
      return "Multiple references";
    case "omni":
      return "Multiple references + strength";
  }
}
