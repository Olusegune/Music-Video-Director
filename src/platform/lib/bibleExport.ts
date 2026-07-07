// Visual Production Bible export — client-side Markdown/JSON builders used by
// the browser path (the desktop app renders MD/JSON/PDF/DOCX in Rust). Bundles
// every Character / Environment / Prop DNA into one document.

import type { Character, Environment, Prop } from "@/platform/lib/types";

function line(label: string, value: string): string {
  return value.trim() ? `- **${label}:** ${value.trim()}\n` : "";
}

function joinNonEmpty(parts: (string | undefined)[], sep = ", "): string {
  return parts.map((p) => (p ?? "").trim()).filter(Boolean).join(sep);
}

export function buildBibleMarkdown(
  characters: Character[],
  environments: Environment[],
  props: Prop[]
): string {
  let s = `# Visual Production Bible\n\n`;
  s += `${characters.length} characters · ${environments.length} environments · ${props.length} props & vehicles\n\n`;

  s += `## Characters\n\n`;
  if (characters.length === 0) s += `_No characters defined yet._\n\n`;
  for (const c of characters) {
    const role = joinNonEmpty([c.role, c.occupation], " · ");
    s += `### ${c.name}${role ? ` — ${role}` : ""}\n\n`;
    s += line("Identity", joinNonEmpty([c.age, c.gender], " "));
    s += line("Face", joinNonEmpty([c.faceShape, c.eyeShape, c.eyeColor, c.skinTone, c.distinguishingFeatures]));
    s += line("Hair", joinNonEmpty([c.hairStyle, c.hairColor]));
    s += line("Body", c.bodyType);
    s += line("Wardrobe", joinNonEmpty([c.primaryOutfit, c.accessories], "; "));
    s += line("Personality", c.traits);
    s += line("Motivations", c.motivations);
    s += line("Goals", c.goals);
    s += line("Prompt DNA", c.promptDna);
    s += line("Consistency Rules", c.consistencyRules.replace(/\n/g, " "));
    s += line("Status", c.locked ? "Canon (locked)" : "Draft");
    s += `\n`;
  }

  s += `## World / Environments\n\n`;
  if (environments.length === 0) s += `_No environments defined yet._\n\n`;
  for (const e of environments) {
    s += `### ${e.name}\n\n`;
    s += line("Description", e.description);
    s += line("Architecture", e.architecture);
    s += line("Materials", e.materials);
    s += line("Time of Day", e.timeOfDay);
    s += line("Lighting", e.lightingStyle);
    s += line("Mood", e.mood);
    s += line("Color Palette", e.colorPalette.join(", "));
    s += line("Key Props", e.keyProps);
    s += line("Prompt DNA", e.promptDna);
    s += line("Rules", e.environmentRules);
    s += line("Status", e.locked ? "Canon (locked)" : "Draft");
    s += `\n`;
  }

  s += `## Props & Vehicles\n\n`;
  if (props.length === 0) s += `_No props defined yet._\n\n`;
  for (const p of props) {
    s += `### ${p.name} — ${p.category}\n\n`;
    s += line("Materials", p.materials);
    s += line("Condition", p.condition);
    s += line("Dimensions", p.dimensions);
    s += line("Color Palette", p.colorPalette.join(", "));
    s += line("Usage", p.usage);
    s += line("Story Significance", p.storySignificance);
    s += line("Prompt DNA", p.promptDna);
    s += line("Status", p.locked ? "Canon (locked)" : "Draft");
    s += `\n`;
  }

  return s;
}

export function buildBibleJson(
  characters: Character[],
  environments: Environment[],
  props: Prop[]
): string {
  return JSON.stringify({ characters, environments, props }, null, 2);
}
