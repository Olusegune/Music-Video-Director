// Choreo directives — the AI Director Panel's natural-language editor,
// implemented as a local keyword→parameter heuristic (the same pattern as
// every other "smart" engine in this app: Song Brain, Director Brain, Story
// Mode, the lyrics parser). No live model call, no API key required — a
// prompt like "make this more powerful" maps to a curated, visible diff on
// the section (energy/intensity/formation/performance), applied through the
// exact same onChange channel every manual control already uses.
//
// Unmatched or ambiguous prompts (e.g. "make it feel like a festival
// headline set") fall back to a generic energy+formation lift rather than
// silently doing nothing — the diff always says what actually changed, so
// there's never a mystery about what the "AI" did.
import { defaultPerformance, type ChoreoSection, type PerformanceBrief } from "@/apps/music-video/lib/choreography";

export interface DirectiveResult {
  next: ChoreoSection;
  /** Human-readable list of what changed, shown to the user before/after applying. */
  changes: string[];
}

function bumpEnergy(s: ChoreoSection, target: number, intensity: string): { section: ChoreoSection; changes: string[] } {
  const changes: string[] = [];
  if (Math.abs(s.energy - target) > 0.01) changes.push(`Energy: ${Math.round(s.energy * 100)}% → ${Math.round(target * 100)}%`);
  if (s.intensity !== intensity) changes.push(`Intensity: "${s.intensity}" → "${intensity}"`);
  return { section: { ...s, energy: target, intensity }, changes };
}

function setFormation(s: ChoreoSection, formation: string): { section: ChoreoSection; changes: string[] } {
  if (s.formation === formation) return { section: s, changes: [] };
  return { section: { ...s, formation }, changes: [`Formation: "${s.formation}" → "${formation}"`] };
}

function setPerformance(s: ChoreoSection, patch: Partial<PerformanceBrief>): { section: ChoreoSection; changes: string[] } {
  const perf = s.performance ?? defaultPerformance(s.kind, s.energy);
  const next: PerformanceBrief = { ...perf, ...patch };
  const changed = (Object.keys(patch) as (keyof PerformanceBrief)[]).some((k) => perf[k] !== next[k]);
  if (!changed) return { section: s, changes: [] };
  const fields = Object.keys(patch).join(", ");
  return { section: { ...s, performance: next }, changes: [`Performance brief updated (${fields})`] };
}

function addDanceBreak(s: ChoreoSection): { section: ChoreoSection; changes: string[] } {
  const bar = {
    bar: (s.eightCounts[s.eightCounts.length - 1]?.bar ?? 0) + 2,
    startSec: s.end - 2,
    phraseA: "Full-out dance break — everyone in unison",
    phraseB: "Hard hit → freeze on the last count",
  };
  return {
    section: { ...s, eightCounts: [...s.eightCounts, bar] },
    changes: [`Added a dance-break bar at ${bar.bar}`],
  };
}

interface Rule {
  test: RegExp;
  apply: (s: ChoreoSection) => { section: ChoreoSection; changes: string[] };
}

const RULES: Rule[] = [
  {
    test: /signature|special move|iconic move/i,
    apply: (s) => {
      const a = bumpEnergy(s, Math.max(s.energy, 0.9), "Peak — signature moment");
      const b = addDanceBreak(a.section);
      return { section: b.section, changes: [...a.changes, ...b.changes] };
    },
  },
  {
    test: /dance break|breakdown|let.*dance|drop it/i,
    apply: (s) => {
      const a = bumpEnergy(s, Math.max(s.energy, 0.9), "Peak — full-out dance break");
      const b = addDanceBreak(a.section);
      return { section: b.section, changes: [...a.changes, ...b.changes] };
    },
  },
  {
    test: /sensual|sexy|intimate|sultry/i,
    apply: (s) => {
      const a = bumpEnergy(s, Math.min(s.energy, 0.5), "Sultry — slow and deliberate");
      const b = setFormation(a.section, "organic asymmetry");
      const c = setPerformance(b.section, { emotion: "Sultry, magnetic", intent: "Draw the eye in" });
      return { section: c.section, changes: [...a.changes, ...b.changes, ...c.changes] };
    },
  },
  {
    test: /soft|gentle|calm|quiet|tone.*down|dial.*back/i,
    apply: (s) => bumpEnergy(s, Math.min(s.energy, 0.35), "Soft — gentle and grounded"),
  },
  {
    test: /crowd|everyone|whole group|ensemble/i,
    apply: (s) => setFormation(s, "loose social circle"),
  },
  {
    test: /story|narrative|meaning|emotional/i,
    apply: (s) => {
      const a = bumpEnergy(s, Math.min(s.energy, 0.4), "Grounded — narrative focus");
      const b = setFormation(a.section, "organic asymmetry");
      const c = setPerformance(b.section, { intent: "Carry the story forward", subtext: "This is the turning point" });
      return { section: c.section, changes: [...a.changes, ...b.changes, ...c.changes] };
    },
  },
  {
    test: /powerful|stronger|bigger|more energy|pump.*up|hype/i,
    apply: (s) => bumpEnergy(s, Math.max(s.energy, 0.95), "High — powerful and commanding"),
  },
  {
    test: /iconic|memorable|unforgettable|legendary|headline/i,
    apply: (s) => {
      const a = bumpEnergy(s, Math.max(s.energy, 0.9), "Peak — iconic moment");
      const b = setFormation(a.section, "tiered staging");
      return { section: b.section, changes: [...a.changes, ...b.changes] };
    },
  },
];

/** Fallback for anything unmatched — a visible, honest "best guess" nudge
 *  rather than silently doing nothing. */
function fallback(s: ChoreoSection): { section: ChoreoSection; changes: string[] } {
  const a = bumpEnergy(s, Math.max(s.energy, 0.85), "High — elevated moment");
  const b = setFormation(a.section, "tiered staging");
  return {
    section: b.section,
    changes: [
      "Didn't recognize a specific instruction — nudged energy and formation up as a best guess.",
      ...a.changes,
      ...b.changes,
    ],
  };
}

export function applyDirective(section: ChoreoSection, prompt: string): DirectiveResult {
  const rule = RULES.find((r) => r.test.test(prompt));
  const result = rule ? rule.apply(section) : fallback(section);
  return {
    next: result.section,
    changes: result.changes.length > 0 ? result.changes : ["No change — already matches that direction."],
  };
}
