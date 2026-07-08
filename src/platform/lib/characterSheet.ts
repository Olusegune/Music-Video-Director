// Character Sheet engine — the Asset Generator (spec STEP 4 / screen #9).
//
// Turns a locked Character DNA into the full model-sheet of panels you see in a
// professional character bible: turnaround, expressions, poses, and costume
// variations. Each panel is a prompt composed from the character's Prompt DNA +
// a view modifier, so every render stays the same person. Generated panel srcs
// are cached per character in localStorage (the images themselves live on disk
// in Tauri, or are mock placeholders in the browser).

import type { Character } from "@/platform/lib/types";
import { composeCharacterDna } from "@/platform/lib/characterDna";

export interface SheetCell {
  key: string;
  label: string;
  /** Appended to the Prompt DNA to specify this view. */
  modifier: string;
}

export interface SheetSection {
  key: string;
  title: string;
  columns: number;
  cells: SheetCell[];
}

export const TURNAROUND: SheetCell[] = [
  {
    key: "front",
    label: "Front",
    modifier: "full-body front orthographic view, neutral A-pose, T-pose turnaround",
  },
  {
    key: "threeq",
    label: "3/4 Front",
    modifier: "full-body 3/4 front view, neutral standing pose",
  },
  { key: "side", label: "Side", modifier: "full-body side profile view, neutral standing pose" },
  { key: "back", label: "Back", modifier: "full-body back view, neutral standing pose" },
];

const EXPRESSION_NAMES = ["Happy", "Sad", "Angry", "Fear", "Joy", "Surprise", "Determination"];

export const EXPRESSIONS: SheetCell[] = EXPRESSION_NAMES.map((e) => ({
  key: `expr_${e.toLowerCase()}`,
  label: e,
  modifier: `head and shoulders portrait, ${e.toLowerCase()} facial expression, expressive`,
}));

const POSE_NAMES = ["Standing", "Walking", "Running", "Sitting", "Pointing"];

export const POSES: SheetCell[] = POSE_NAMES.map((p) => ({
  key: `pose_${p.toLowerCase()}`,
  label: p,
  modifier: `full-body ${p.toLowerCase()} pose, dynamic, clear silhouette`,
}));

/** Costume cells depend on what wardrobe the character actually has. */
export function costumeCells(c: Character): SheetCell[] {
  const cells: SheetCell[] = [];
  if (c.primaryOutfit.trim())
    cells.push({
      key: "costume_primary",
      label: "Primary",
      modifier: `full-body wearing ${c.primaryOutfit}`,
    });
  if (c.secondaryOutfit.trim())
    cells.push({
      key: "costume_secondary",
      label: "Secondary",
      modifier: `full-body wearing ${c.secondaryOutfit}`,
    });
  if (c.accessories.trim())
    cells.push({
      key: "costume_accessories",
      label: "Accessories",
      modifier: `detail close-ups of accessories: ${c.accessories}`,
    });
  return cells;
}

export function sheetSections(c: Character): SheetSection[] {
  const sections: SheetSection[] = [
    { key: "turnaround", title: "Turnaround", columns: 4, cells: TURNAROUND },
    { key: "expressions", title: "Expression Sheet", columns: 7, cells: EXPRESSIONS },
    { key: "poses", title: "Pose References", columns: 5, cells: POSES },
  ];
  const costumes = costumeCells(c);
  if (costumes.length)
    sections.push({ key: "costumes", title: "Costume Variations", columns: 3, cells: costumes });
  return sections;
}

/** All cells across all sections, in render order. */
export function allCells(c: Character): SheetCell[] {
  return sheetSections(c).flatMap((s) => s.cells);
}

/** Compose the generation prompt for one panel from the character's DNA. */
export function cellPrompt(c: Character, modifier: string): string {
  const dna = c.promptDna.trim() || composeCharacterDna(c).promptDna;
  return `${dna}, ${modifier}, character model sheet, plain neutral studio background, consistent identity, same face`;
}

// --- panel cache (localStorage) -------------------------------------------

/** cellKey → generated image src. */
export type SheetData = Record<string, string>;

const KEY = (characterId: string) => `mf.sheet.${characterId}`;

export function loadSheet(characterId: string): SheetData {
  try {
    const raw = localStorage.getItem(KEY(characterId));
    return raw ? (JSON.parse(raw) as SheetData) : {};
  } catch {
    return {};
  }
}

export function saveSheetCell(characterId: string, cellKey: string, url: string) {
  const data = loadSheet(characterId);
  data[cellKey] = url;
  localStorage.setItem(KEY(characterId), JSON.stringify(data));
}

export function clearSheet(characterId: string) {
  localStorage.removeItem(KEY(characterId));
}

// --- color palette ---------------------------------------------------------

const COLOR_HEX: Record<string, string> = {
  black: "#1c1c1e",
  brown: "#6b4423",
  blonde: "#d9b36b",
  red: "#a23b2c",
  auburn: "#7d3a2a",
  ginger: "#c0612f",
  grey: "#9aa1ac",
  gray: "#9aa1ac",
  white: "#f1ede6",
  silver: "#c8ccd2",
  blue: "#3b6ea5",
  green: "#3f7d56",
  hazel: "#8a6a3b",
  amber: "#c98a2b",
  // skin tones
  fair: "#f0d4bd",
  light: "#e8c4a2",
  olive: "#c8a274",
  tan: "#b88a5f",
  warm: "#caa07a",
  brown_skin: "#8a5a3c",
  dark: "#5a3a28",
  deep: "#41281c",
  ebony: "#3a241a",
};

function hexFor(token: string): string | null {
  const t = token.toLowerCase().replace(/[^a-z]/g, "");
  if (COLOR_HEX[t]) return COLOR_HEX[t];
  for (const k of Object.keys(COLOR_HEX)) if (t.includes(k)) return COLOR_HEX[k];
  return null;
}

/** A small swatch palette derived from the character's described colors. */
export function characterPalette(c: Character): { hex: string; label: string }[] {
  const fields: [string, string][] = [
    [c.skinTone, "Skin"],
    [c.hairColor, "Hair"],
    [c.eyeColor, "Eyes"],
    [c.primaryOutfit, "Wardrobe"],
  ];
  const out: { hex: string; label: string }[] = [];
  for (const [val, label] of fields) {
    if (!val) continue;
    for (const tok of val.split(/[\s,]+/)) {
      const hex = hexFor(tok);
      if (hex && !out.some((o) => o.hex === hex)) {
        out.push({ hex, label });
        break;
      }
    }
  }
  return out;
}
