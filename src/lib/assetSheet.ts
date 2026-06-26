// Generic asset-sheet engine — the Asset Generator for environments and props
// (the same multi-panel idea as the Character Sheet, generalized). Each panel is
// a prompt = the entity's Prompt DNA + a view modifier, so every view stays the
// same place / same object. Panel srcs are cached per entity in localStorage.

import type { Environment, Prop } from "@/lib/types";

export interface SheetCell {
  key: string;
  label: string;
  modifier: string;
}

export interface SheetSection {
  key: string;
  title: string;
  columns: number;
  /** Taller cells (3:4) for objects/turnarounds; false → 16:9 for places. */
  tall: boolean;
  cells: SheetCell[];
}

// --- environments ----------------------------------------------------------

export function environmentSheetSections(_env: Environment): SheetSection[] {
  return [
    {
      key: "coverage",
      title: "Coverage",
      columns: 4,
      tall: false,
      cells: [
        { key: "establishing", label: "Establishing", modifier: "wide cinematic establishing shot of the whole location" },
        { key: "wide", label: "Wide Shot", modifier: "wide-angle shot showing the full space and depth" },
        { key: "detail", label: "Detail Shot", modifier: "close-up detail of a key area, textures and set dressing" },
        { key: "topdown", label: "Top-Down", modifier: "top-down bird's-eye layout view of the location" },
      ],
    },
    {
      key: "times",
      title: "Time & Mood",
      columns: 4,
      tall: false,
      cells: [
        { key: "day", label: "Day", modifier: "daytime, bright natural light" },
        { key: "golden", label: "Golden Hour", modifier: "golden hour, warm low-angle sun, long shadows" },
        { key: "night", label: "Night", modifier: "night, artificial light and moonlight" },
        { key: "overcast", label: "Overcast", modifier: "overcast, soft diffuse light, muted tones" },
      ],
    },
  ];
}

export const ENVIRONMENT_PROMPT_TAIL =
  "consistent location, same place across all shots, cohesive world, no people, high detail";

// --- props / vehicles / creatures -----------------------------------------

export function propSheetSections(prop: Prop): SheetSection[] {
  const sections: SheetSection[] = [
    {
      key: "ortho",
      title: "Orthographic Views",
      columns: 4,
      tall: true,
      cells: [
        { key: "front", label: "Front", modifier: "orthographic front view, neutral studio background" },
        { key: "side", label: "Side", modifier: "orthographic side view" },
        { key: "back", label: "Back", modifier: "orthographic back view" },
        { key: "top", label: "Top", modifier: "orthographic top-down view" },
      ],
    },
    {
      key: "renders",
      title: "Renders",
      columns: 3,
      tall: true,
      cells: [
        { key: "hero", label: "Hero Render", modifier: "hero beauty render, dramatic studio lighting" },
        { key: "detail", label: "Detail Render", modifier: "macro detail render of materials, markings, and wear" },
        { key: "inuse", label: "In Use", modifier: "shown in use / in scene context" },
      ],
    },
  ];

  if (prop.category === "Creature") {
    sections.push({
      key: "poses",
      title: "Poses",
      columns: 4,
      tall: true,
      cells: [
        { key: "idle", label: "Idle", modifier: "full-body idle pose, neutral stance" },
        { key: "action", label: "Action", modifier: "full-body dynamic action pose" },
        { key: "attack", label: "Aggressive", modifier: "full-body aggressive / threatening pose" },
        { key: "profile", label: "Profile", modifier: "full-body side profile silhouette" },
      ],
    });
  }
  return sections;
}

export const PROP_PROMPT_TAIL =
  "consistent design, identical object across all shots, plain neutral studio background, high detail";

// --- shared helpers --------------------------------------------------------

export function allSheetCells(sections: SheetSection[]): SheetCell[] {
  return sections.flatMap((s) => s.cells);
}

export function sheetPrompt(dna: string, modifier: string, tail: string): string {
  return `${dna}, ${modifier}, ${tail}`;
}

// --- panel cache (localStorage, namespaced by kind) ------------------------

export type SheetData = Record<string, string>;

const KEY = (kind: string, id: string) => `mf.sheet.${kind}.${id}`;

export function loadSheet(kind: string, id: string): SheetData {
  try {
    const raw = localStorage.getItem(KEY(kind, id));
    return raw ? (JSON.parse(raw) as SheetData) : {};
  } catch {
    return {};
  }
}

export function saveSheetCell(kind: string, id: string, cellKey: string, url: string) {
  const data = loadSheet(kind, id);
  data[cellKey] = url;
  localStorage.setItem(KEY(kind, id), JSON.stringify(data));
}
