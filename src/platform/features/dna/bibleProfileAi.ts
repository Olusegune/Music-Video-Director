import { api } from "@/platform/lib/ipc";

export function textProviderIsReady(
  statuses: { provider: string; configured: boolean }[]
): boolean {
  // Gemini is the only native structured-text adapter today. Keep the UI honest
  // rather than presenting a generic provider choice the Rust layer cannot use.
  return statuses.some((status) => status.provider === "gemini" && status.configured);
}

export async function enhanceBibleProfile(
  prompt: string,
  schema: string,
  moduleId: string,
  entityId: string,
  allowedFields: readonly string[]
): Promise<Record<string, string>> {
  const raw = await api.generateStructuredTextFromSpec(
    {
      capability: "text",
      prompt,
      providerPref: "gemini",
      modelHint: "bible-profile-enhancement",
      moduleId,
      projectRef: { moduleId, entityId },
    },
    schema
  );
  if (!raw) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("The text provider returned an unreadable profile draft. Try again.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("The text provider returned an invalid profile draft. Try again.");
  }
  return Object.fromEntries(
    allowedFields.flatMap((field) => {
      const value = (parsed as Record<string, unknown>)[field];
      return typeof value === "string" && value.trim() ? [[field, value.trim()]] : [];
    })
  );
}
