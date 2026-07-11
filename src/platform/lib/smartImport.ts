// Smart Import — extract Character Bible fields from an uploaded document
// (PDF / DOCX / TXT / Markdown / screenplay excerpt) with per-field confidence,
// so the user reviews and accepts before anything is committed. Never invents
// values: the model is instructed to omit fields it can't ground in the text.
import { api } from "@/platform/lib/ipc";

export interface ImportedField {
  value: string;
  confidence: "high" | "low";
  source?: string;
}

export type ImportedFields = Partial<Record<CharacterImportKey, ImportedField>>;

export const CHARACTER_IMPORT_FIELDS = [
  ["name", "Name"],
  ["role", "Role"],
  ["occupation", "Occupation"],
  ["age", "Age"],
  ["gender", "Gender"],
  ["faceShape", "Face shape"],
  ["eyeShape", "Eye shape"],
  ["eyeColor", "Eye color"],
  ["hairStyle", "Hair style"],
  ["hairColor", "Hair color"],
  ["bodyType", "Body type"],
  ["skinTone", "Skin tone"],
  ["distinguishingFeatures", "Distinguishing features"],
  ["primaryOutfit", "Primary outfit"],
  ["secondaryOutfit", "Secondary outfit"],
  ["accessories", "Accessories"],
  ["traits", "Traits"],
  ["motivations", "Motivations"],
  ["fears", "Fears"],
  ["goals", "Goals"],
] as const;

export type CharacterImportKey = (typeof CHARACTER_IMPORT_FIELDS)[number][0];

const SCHEMA = `{${CHARACTER_IMPORT_FIELDS.map(
  ([key]) => `"${key}":{"value":"string","confidence":"high|low","source":"string"}`
).join(",")}}`;

/**
 * Extract character fields from raw document text. Returns only fields the
 * model found direct support for — it's instructed not to guess. `source` is
 * a short quoted excerpt the field was drawn from, shown to the user for review.
 */
export async function extractCharacterFields(
  documentText: string,
  entityId: string
): Promise<ImportedFields> {
  const prompt =
    "You are extracting character sheet fields from a production document " +
    "(script, character bible, novel excerpt, or design doc). Only include a " +
    "field if the text directly supports it. If a field isn't clearly present, " +
    "omit it entirely — do not invent or infer beyond what's written. For each " +
    "included field, set confidence to \"high\" only if the text states it " +
    "explicitly and unambiguously; use \"low\" if it's implied or you had to " +
    "paraphrase. Include a short verbatim `source` excerpt (under 15 words) the " +
    `value was drawn from.\n\nDOCUMENT:\n${documentText.slice(0, 12000)}`;

  const raw = await api.generateStructuredTextFromSpec(
    {
      capability: "text",
      prompt,
      providerPref: "gemini",
      modelHint: "smart-import-character",
      moduleId: "characters",
      projectRef: { moduleId: "characters", entityId },
    },
    SCHEMA
  );
  if (!raw) return {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("The text provider returned an unreadable import draft. Try again.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("The text provider returned an invalid import draft. Try again.");
  }

  const result: ImportedFields = {};
  for (const [key] of CHARACTER_IMPORT_FIELDS) {
    const entry = (parsed as Record<string, unknown>)[key];
    if (!entry || typeof entry !== "object") continue;
    const value = (entry as Record<string, unknown>).value;
    if (typeof value !== "string" || !value.trim()) continue;
    const confidence = (entry as Record<string, unknown>).confidence === "high" ? "high" : "low";
    const source = (entry as Record<string, unknown>).source;
    result[key] = {
      value: value.trim(),
      confidence,
      source: typeof source === "string" ? source.trim() : undefined,
    };
  }
  return result;
}
