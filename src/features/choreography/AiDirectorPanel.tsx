// AiDirectorPanel — "what do you want this section to feel like?" in your
// own words. Runs entirely through the local choreoDirectives heuristic (see
// src/lib/choreoDirectives.ts) — no live model call. Always shows exactly
// what changed after applying, so a local heuristic never reads as a black box.
import { useState } from "react";
import { Sparkles, Wand2 } from "lucide-react";
import type { ChoreoSection } from "@/lib/choreography";
import { applyDirective } from "@/lib/choreoDirectives";
import { Button } from "@/components/ui/button";
import { HelpHint } from "@/components/ui/help-hint";

export function AiDirectorPanel({
  section,
  onChange,
}: {
  section: ChoreoSection;
  onChange: (next: ChoreoSection) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [lastChanges, setLastChanges] = useState<string[] | null>(null);

  const apply = () => {
    if (!prompt.trim()) return;
    const result = applyDirective(section, prompt.trim());
    onChange(result.next);
    setLastChanges(result.changes);
  };

  return (
    <div className="rounded-[var(--radius-card)] border border-primary/30 bg-primary/5 p-3">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
        <Sparkles className="h-3.5 w-3.5" /> AI Director
        <HelpHint
          title="AI Director"
          body="Describe how the section should feel in plain words and it adjusts the energy, formation, and moves for you. It always shows exactly what it changed, so you're never guessing — undo by editing anything back."
          example="Type 'make this more powerful' and it bumps the energy to Peak and shifts to a bolder formation."
        />
      </div>
      <div className="flex gap-2">
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") apply();
          }}
          placeholder="e.g. “Make this more powerful”, “Add a dance break”, “Make it feel iconic”…"
          aria-label="Describe how this section should feel"
          className="h-9 flex-1 rounded-[var(--radius-input)] border border-border bg-surface px-3 text-sm text-foreground focus-visible:border-primary focus-visible:outline-none"
        />
        <Button size="sm" onClick={apply} disabled={!prompt.trim()}>
          <Wand2 className="h-3.5 w-3.5" /> Apply
        </Button>
      </div>
      {lastChanges && (
        <div className="mt-2 space-y-0.5 text-[11px] text-muted">
          {lastChanges.map((c, i) => (
            <p key={i}>• {c}</p>
          ))}
        </div>
      )}
    </div>
  );
}
