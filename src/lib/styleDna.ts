// Style DNA — capture a project's full visual style as a reusable, named profile
// ("brand consistency profile"), then apply it to any other project so the look
// stays consistent across a whole campaign.

import type { PromptPack } from "@/lib/types";

export interface StyleDna {
  id: string;
  name: string;
  visualLanguage: string;
  colorPalette: string[];
  typography: string;
  materials: string;
  mood: string;
  atmosphere: string;
}

const LS = "mf.styledna";

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `dna-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  }
}

export function loadStyleDnas(): StyleDna[] {
  try {
    const raw = localStorage.getItem(LS);
    return raw ? (JSON.parse(raw) as StyleDna[]) : [];
  } catch {
    return [];
  }
}

function persist(list: StyleDna[]) {
  localStorage.setItem(LS, JSON.stringify(list));
}

export function captureStyleDna(name: string, pack: PromptPack): StyleDna {
  const s = pack.style;
  const dna: StyleDna = {
    id: newId(),
    name: name.trim() || "Untitled Style DNA",
    visualLanguage: s.visualLanguage,
    colorPalette: [...s.colorPalette],
    typography: s.typography,
    materials: s.materials,
    mood: s.mood,
    atmosphere: s.atmosphere,
  };
  persist([dna, ...loadStyleDnas()]);
  return dna;
}

export function deleteStyleDna(id: string) {
  persist(loadStyleDnas().filter((d) => d.id !== id));
}

/** Apply a saved Style DNA over a pack's style block (returns a new pack). */
export function applyStyleDna(pack: PromptPack, dna: StyleDna): PromptPack {
  return {
    ...pack,
    style: {
      visualLanguage: dna.visualLanguage,
      colorPalette: [...dna.colorPalette],
      typography: dna.typography,
      materials: dna.materials,
      mood: dna.mood,
      atmosphere: dna.atmosphere,
    },
  };
}
