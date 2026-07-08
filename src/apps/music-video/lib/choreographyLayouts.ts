// Formation layouts — deterministic top-down stage positions for each of the
// engine's real formation strings (src/lib/choreography.ts's STYLES vocab,
// 8 styles x 4 formations = 32 exact strings). Classified by keyword into a
// small set of shape generators rather than 32 one-off tables, so a new style
// added later still gets a sensible layout instead of falling through to
// nothing. Positions are normalized 0..1 within the stage (x: left→right,
// y: back→front, so "lead downstage" means higher y).

export interface FormationSlot {
  x: number;
  y: number;
  /** The formation's featured/lead position — drawn larger, in the accent color. */
  lead: boolean;
}

type ShapeFn = (count: number) => FormationSlot[];

function clamp(n: number, min = 1): number {
  return Math.max(min, n);
}

const circle: ShapeFn = (count) => {
  const n = clamp(count);
  if (n === 1) return [{ x: 0.5, y: 0.5, lead: true }];
  return Array.from({ length: n }, (_, i) => {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    return { x: 0.5 + 0.35 * Math.cos(angle), y: 0.5 + 0.35 * Math.sin(angle), lead: i === 0 };
  });
};

const semicircle: ShapeFn = (count) => {
  const n = clamp(count);
  if (n === 1) return [{ x: 0.5, y: 0.7, lead: true }];
  return Array.from({ length: n }, (_, i) => {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const angle = Math.PI * (0.15 + 0.7 * t);
    return {
      x: 0.5 - 0.4 * Math.cos(angle),
      y: 0.75 - 0.35 * Math.sin(angle),
      lead: i === Math.floor((n - 1) / 2),
    };
  });
};

const line: ShapeFn = (count) => {
  const n = clamp(count);
  if (n === 1) return [{ x: 0.5, y: 0.55, lead: true }];
  return Array.from({ length: n }, (_, i) => ({
    x: 0.15 + (0.7 * i) / (n - 1),
    y: 0.55,
    lead: i === Math.floor((n - 1) / 2),
  }));
};

const staggeredLine: ShapeFn = (count) => {
  const n = clamp(count);
  return Array.from({ length: n }, (_, i) => ({
    x: 0.15 + (0.7 * i) / clamp(n - 1),
    y: 0.45 + (i % 2 === 0 ? 0 : 0.18),
    lead: i === 0,
  }));
};

const twoRows: ShapeFn = (count) => {
  const n = clamp(count);
  const front = Math.ceil(n / 2);
  const back = n - front;
  const slots: FormationSlot[] = [];
  for (let i = 0; i < front; i++) {
    slots.push({
      x: 0.2 + (0.6 * i) / clamp(front - 1),
      y: 0.68,
      lead: i === Math.floor((front - 1) / 2),
    });
  }
  for (let i = 0; i < back; i++) {
    slots.push({ x: 0.2 + (0.6 * i) / clamp(back - 1), y: 0.38, lead: false });
  }
  return slots;
};

/** A wedge/V with the lead at the forward apex, the rest fanning out behind. */
const vWedge: ShapeFn = (count) => {
  const n = clamp(count);
  if (n === 1) return [{ x: 0.5, y: 0.7, lead: true }];
  const slots: FormationSlot[] = [{ x: 0.5, y: 0.72, lead: true }];
  const rest = n - 1;
  for (let i = 0; i < rest; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const depth = Math.floor(i / 2) + 1;
    slots.push({ x: 0.5 + side * depth * 0.16, y: 0.72 - depth * 0.16, lead: false });
  }
  return slots;
};

/** Lead at the back apex, triangle base spread wide in front. */
const triangle: ShapeFn = (count) => {
  const n = clamp(count);
  if (n === 1) return [{ x: 0.5, y: 0.4, lead: true }];
  const slots: FormationSlot[] = [{ x: 0.5, y: 0.35, lead: true }];
  const rest = n - 1;
  for (let i = 0; i < rest; i++) {
    slots.push({ x: 0.2 + (0.6 * i) / clamp(rest - 1), y: 0.72, lead: false });
  }
  return slots;
};

const mirrorPairs: ShapeFn = (count) => {
  const n = clamp(count);
  const pairs = Math.ceil(n / 2);
  const slots: FormationSlot[] = [];
  for (let i = 0; i < n; i++) {
    const pairIndex = Math.floor(i / 2);
    const side = i % 2 === 0 ? -1 : 1;
    slots.push({
      x: 0.5 + side * (0.15 + 0.15 * pairIndex),
      y: 0.4 + (0.3 * pairIndex) / clamp(pairs - 1),
      lead: i === 0,
    });
  }
  return slots;
};

/** Deterministic organic scatter — jittered by index, not Math.random, so
 *  re-renders don't reshuffle the stage. */
const scatter: ShapeFn = (count) => {
  const n = clamp(count);
  return Array.from({ length: n }, (_, i) => {
    const seed = (i * 137.5) % 360;
    const jx = Math.sin(seed) * 0.3;
    const jy = Math.cos(seed * 1.3) * 0.22;
    return { x: 0.5 + jx, y: 0.55 + jy, lead: i === 0 };
  });
};

const soloWithPairs: ShapeFn = (count) => {
  const n = clamp(count);
  if (n === 1) return [{ x: 0.5, y: 0.72, lead: true }];
  const slots: FormationSlot[] = [{ x: 0.5, y: 0.72, lead: true }];
  const rest = n - 1;
  for (let i = 0; i < rest; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const depth = Math.floor(i / 2) + 1;
    slots.push({ x: 0.5 + side * 0.22, y: 0.72 - depth * 0.2, lead: false });
  }
  return slots;
};

const diagonal: ShapeFn = (count) => {
  const n = clamp(count);
  if (n === 1) return [{ x: 0.5, y: 0.5, lead: true }];
  return Array.from({ length: n }, (_, i) => ({
    x: 0.15 + (0.7 * i) / (n - 1),
    y: 0.75 - (0.5 * i) / (n - 1),
    lead: i === 0,
  }));
};

/** Front row (lead, small) + a larger back row — "ensemble"/"tiered" formations. */
const tiered: ShapeFn = (count) => {
  const n = clamp(count);
  if (n === 1) return [{ x: 0.5, y: 0.72, lead: true }];
  const front = Math.min(2, n - 1) || 1;
  const back = n - front;
  const slots: FormationSlot[] = [];
  for (let i = 0; i < front; i++) {
    slots.push({ x: 0.5 + (i - (front - 1) / 2) * 0.18, y: 0.72, lead: i === 0 });
  }
  for (let i = 0; i < back; i++) {
    slots.push({ x: 0.15 + (0.7 * i) / clamp(back - 1), y: 0.38, lead: false });
  }
  return slots;
};

/** Keyword → shape, checked in priority order so more specific phrases (e.g.
 *  "mirror pairs") win over generic ones. Covers all 32 real formation
 *  strings the engine currently generates (see STYLES in choreography.ts). */
const RULES: [RegExp, ShapeFn][] = [
  [/triangle/i, triangle],
  [/mirror pairs/i, mirrorPairs],
  [/tiered|ensemble|downstage/i, tiered],
  [/semicircle/i, semicircle],
  [/circle|cypher/i, circle],
  [/two rows|two lines|choir rows/i, twoRows],
  [/v-formation|wedge|behind the lead|fanned out/i, vWedge],
  [/solo with backdrop|grooving/i, soloWithPairs],
  [/scatter|asymmetry|clustered/i, scatter],
  [/diagonal/i, diagonal],
  [/staggered/i, staggeredLine],
];

export function layoutFor(formation: string, performerCount: number): FormationSlot[] {
  const rule = RULES.find(([re]) => re.test(formation));
  const shape = rule?.[1] ?? line;
  return shape(performerCount);
}
