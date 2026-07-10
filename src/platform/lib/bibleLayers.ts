// Prompt layers for a Bible entity (character, environment, prop).
//
// Every Bible entity contributes the same three things to a prompt: its DNA,
// its consistency rules, and its style preset. Only the DNA was ever actually
// sent. The other two ship muted, so the Prompt Studio shows they exist and can
// be folded in, without silently changing what anyone's prompts already produce.

import type { PromptLayer } from "@/platform/lib/promptPipeline";
import { findPreset } from "@/platform/lib/styles";

export interface BibleEntityLike {
  name: string;
  promptDna: string;
  consistencyRules?: string;
  stylePreset?: string;
}

export function bibleEntityLayers(
  entity: BibleEntityLike,
  /** Composed DNA to fall back on when the entity has no hand-written one. */
  composedDna: string,
  /** Where the DNA came from, e.g. "Character Bible". */
  bibleLabel: string
): PromptLayer[] {
  const layers: PromptLayer[] = [
    {
      id: "dna",
      kind: "dna",
      label: `${bibleLabel.replace(/ Bible$/, "")} DNA`,
      source: `${bibleLabel} · ${entity.name || "Untitled"}`,
      text: entity.promptDna || composedDna,
      editable: true,
    },
  ];

  if (entity.consistencyRules?.trim()) {
    layers.push({
      id: "consistency",
      kind: "system",
      label: "Consistency rules",
      source: "Keeps this entity on-model across shots",
      text: entity.consistencyRules,
      muted: true,
    });
  }

  const styleFragment = entity.stylePreset ? findPreset(entity.stylePreset)?.fragment : undefined;
  if (styleFragment) {
    layers.push({
      id: "style",
      kind: "style",
      label: "Style preset",
      source: entity.stylePreset,
      text: styleFragment,
      muted: true,
    });
  }

  return layers;
}
