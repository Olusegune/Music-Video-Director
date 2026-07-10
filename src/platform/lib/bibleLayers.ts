// Prompt layers for a Bible entity (character, environment, prop).
//
// Every Bible entity contributes the same three things to a prompt: its DNA,
// its consistency rules, and its style preset. Only the DNA was ever actually
// sent. The other two ship muted, so the Prompt Studio shows they exist and can
// be folded in, without silently changing what anyone's prompts already produce.

import type { PromptLayer } from "@/platform/lib/promptPipeline";
import { findPreset } from "@/platform/lib/styles";
import type { SheetPromptParts } from "@/platform/lib/imageGen";

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

/**
 * A sheet prompt as layers. Unlike a Bible entity's portrait prompt, every part
 * here is already being sent, so nothing ships muted: this reveals a prompt the
 * user was always receiving, it does not change it.
 */
export function sheetPromptLayers(
  parts: SheetPromptParts,
  entityName: string,
  bibleLabel: string
): PromptLayer[] {
  const layers: PromptLayer[] = [
    {
      id: "layout",
      kind: "template",
      label: "Sheet layout",
      source: "The board this template asks for",
      text: parts.layout,
      editable: true,
    },
    {
      id: "identity",
      kind: "dna",
      label: "Identity & DNA",
      source: `${bibleLabel} · ${entityName || "Untitled"}`,
      text: parts.identity,
      editable: true,
    },
    {
      id: "consistency",
      kind: "system",
      label: "Consistency rules",
      source: "Keeps every panel on-model",
      text: parts.consistency,
    },
  ];

  if (parts.style) {
    layers.push({
      id: "style",
      kind: "style",
      label: "Style preset",
      text: parts.style,
    });
  }

  layers.push(
    { id: "board", kind: "system", label: "Board directive", text: parts.board },
    { id: "quality", kind: "system", label: "Quality bar", text: parts.quality }
  );

  if (parts.constraints) {
    layers.push({
      id: "constraints",
      kind: "system",
      label: "Constraints",
      text: parts.constraints,
    });
  }

  return layers;
}
