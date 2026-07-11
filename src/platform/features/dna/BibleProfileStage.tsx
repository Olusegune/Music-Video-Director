// Profile stage — the third beat of the visual Bible flow.
//
// Between the Card and the full Details sheet: the fields drafted from the spark,
// shown as editable review cards rather than a wall of inputs. The user skims a
// few grouped cards, tweaks what's off, and moves on — the ReviewGate pattern,
// not a form. An optional "Enhance with AI" fills the narrative fields from a
// configured text provider; without one it's disabled, never a dead button.

import { useState } from "react";
import { ArrowRight, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/platform/components/ui/button";
import { AssetImage } from "@/platform/components/ui/asset-image";

export interface ProfileField {
  key: string;
  label: string;
  value: string;
  /** Longer prose fields render as a textarea. */
  multiline?: boolean;
}

export interface ProfileSection {
  title: string;
  fields: ProfileField[];
}

export function BibleProfileStage({
  entityLabel,
  entityName,
  portraitUrl,
  sections,
  onField,
  onContinue,
  onSkip,
  onEnhance,
  enhanceHint,
}: {
  entityLabel: string;
  entityName: string;
  portraitUrl?: string;
  sections: ProfileSection[];
  onField: (key: string, value: string) => void;
  onContinue: () => void;
  onSkip: () => void;
  /** Present + enabled only when a text provider can draft. Returns field patches. */
  onEnhance?: () => Promise<Record<string, string>>;
  /** Why enhance is unavailable, shown as a tooltip when onEnhance is absent. */
  enhanceHint?: string;
}) {
  const [enhancing, setEnhancing] = useState(false);
  const [enhanceError, setEnhanceError] = useState<string | null>(null);

  const enhance = async () => {
    if (!onEnhance || enhancing) return;
    setEnhancing(true);
    setEnhanceError(null);
    try {
      const patches = await onEnhance();
      for (const [key, value] of Object.entries(patches)) {
        if (value?.trim()) onField(key, value);
      }
    } catch (error) {
      setEnhanceError(
        error instanceof Error ? error.message : "AI enhancement could not be completed."
      );
    } finally {
      setEnhancing(false);
    }
  };

  return (
    <section className="mx-auto max-w-4xl rounded-2xl border border-border bg-surface/80 p-5 shadow-card">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {portraitUrl ? (
            <AssetImage
              src={portraitUrl}
              alt={entityName}
              className="h-14 w-14 shrink-0 rounded-xl border border-border object-cover"
            />
          ) : null}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              Visual Bible workflow
            </p>
            <h2 className="mt-1 text-lg font-semibold">
              Review {entityName || `your ${entityLabel.toLowerCase()}`}'s profile.
            </h2>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted">
              We drafted this from your spark. Adjust anything that's off — the full sheet comes
              next.
            </p>
          </div>
        </div>
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-[10px] text-primary">
          Stage 3 of 5 · Profile
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {sections.map((section) => (
          <div key={section.title} className="rounded-xl border border-border bg-background/40 p-3">
            <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted">
              {section.title}
            </h3>
            <div className="space-y-2">
              {section.fields.map((field) => (
                <label key={field.key} className="block">
                  <span className="mb-0.5 block text-[10px] text-muted">{field.label}</span>
                  {field.multiline ? (
                    <textarea
                      value={field.value}
                      onChange={(event) => onField(field.key, event.target.value)}
                      rows={2}
                      className="w-full resize-none rounded-md border border-border bg-surface px-2 py-1.5 text-[12px] focus:border-primary focus:outline-none"
                    />
                  ) : (
                    <input
                      value={field.value}
                      onChange={(event) => onField(field.key, event.target.value)}
                      className="h-8 w-full rounded-md border border-border bg-surface px-2 text-[12px] focus:border-primary focus:outline-none"
                    />
                  )}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Button onClick={onContinue}>
          <ArrowRight className="h-4 w-4" /> Continue to details
        </Button>
        {onEnhance ? (
          <Button variant="secondary" onClick={enhance} disabled={enhancing}>
            <Wand2 className={enhancing ? "h-4 w-4 animate-pulse" : "h-4 w-4"} />
            {enhancing ? "Drafting…" : "Enhance with AI"}
          </Button>
        ) : enhanceHint ? (
          <span
            className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-border px-2.5 py-1.5 text-[11px] text-muted"
            title={enhanceHint}
          >
            <Sparkles className="h-3.5 w-3.5" /> Enhance with AI
          </span>
        ) : null}
        <Button variant="ghost" onClick={onSkip}>
          Skip
        </Button>
      </div>
      {enhanceError ? (
        <p className="mt-2 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
          {enhanceError}
        </p>
      ) : null}
    </section>
  );
}
