// GuidedSectionPrompt — Guided mode's "what should this section feel like?"
// chip picker. Each chip applies a curated, honest parameter nudge (energy,
// formation, performance brief) via the section's own onChange — the same
// mutation channel every manual control already uses. No hidden engine call,
// no live LLM: fixed choices, visible effect. "Signature Move" reuses the
// existing motion-test generator directly instead of a fake preset.
import { Sparkles, Music, BookOpen, Users, Wand2, HeartHandshake } from "lucide-react";
import type { ChoreoSection } from "@/lib/choreography";
import { defaultPerformance } from "@/lib/choreography";

interface Treatment {
  key: string;
  label: string;
  icon: React.ReactNode;
  apply: (section: ChoreoSection) => ChoreoSection;
}

const TREATMENTS: Treatment[] = [
  {
    key: "performance",
    label: "Performance Moment",
    icon: <Sparkles className="h-3.5 w-3.5" />,
    apply: (s) => ({
      ...s,
      energy: Math.max(s.energy, 0.85),
      intensity: "High — full performance energy",
      performance: { ...(s.performance ?? defaultPerformance(s.kind, s.energy)), intent: "Command the room" },
    }),
  },
  {
    key: "dance-break",
    label: "Dance Break",
    icon: <Music className="h-3.5 w-3.5" />,
    apply: (s) => ({
      ...s,
      energy: Math.max(s.energy, 0.9),
      intensity: "Peak — full-out dance break",
      eightCounts: [
        ...s.eightCounts,
        {
          bar: (s.eightCounts[s.eightCounts.length - 1]?.bar ?? 0) + 2,
          startSec: s.end - 2,
          phraseA: "Full-out dance break — everyone in unison",
          phraseB: "Hard hit → freeze on the last count",
        },
      ],
    }),
  },
  {
    key: "story",
    label: "Story Moment",
    icon: <BookOpen className="h-3.5 w-3.5" />,
    apply: (s) => ({
      ...s,
      energy: Math.min(s.energy, 0.45),
      intensity: "Grounded — narrative focus",
      formation: "organic asymmetry",
      performance: {
        ...(s.performance ?? defaultPerformance(s.kind, s.energy)),
        intent: "Carry the story forward",
        subtext: "This is the turning point",
      },
    }),
  },
  {
    key: "crowd",
    label: "Crowd Moment",
    icon: <Users className="h-3.5 w-3.5" />,
    apply: (s) => ({
      ...s,
      energy: Math.max(s.energy, 0.75),
      intensity: "High — communal energy",
      formation: "loose social circle",
    }),
  },
  {
    key: "emotional",
    label: "Emotional Moment",
    icon: <HeartHandshake className="h-3.5 w-3.5" />,
    apply: (s) => ({
      ...s,
      energy: Math.min(s.energy, 0.4),
      intensity: "Soft — intimate",
      performance: {
        ...(s.performance ?? defaultPerformance(s.kind, s.energy)),
        emotion: "Vulnerable, open",
        intent: "Let the feeling show",
      },
    }),
  },
];

export function GuidedSectionPrompt({
  section,
  onChange,
  onSignatureMove,
}: {
  section: ChoreoSection;
  onChange: (next: ChoreoSection) => void;
  /** "Signature Move" opens the real motion-test generator instead of a preset diff. */
  onSignatureMove: () => void;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-elevated/30 p-3">
      <p className="mb-2 text-[11px] font-medium text-muted">
        What should this section feel like?
      </p>
      <div className="flex flex-wrap gap-1.5">
        {TREATMENTS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.apply(section))}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            {t.icon} {t.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onSignatureMove()}
          className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
        >
          <Wand2 className="h-3.5 w-3.5" /> Signature Move
        </button>
      </div>
    </div>
  );
}
