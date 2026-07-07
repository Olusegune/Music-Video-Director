// Stick-figure pose presets — a rough, local "what does this look like"
// preview, not motion capture. Classifies the engine's real key-pose strings
// (src/lib/choreography.ts's STYLES vocab, 8 styles x 4 poses = 32 exact
// strings) into a small set of named stick-figure rigs by keyword, the same
// approach as choreographyLayouts.ts's formation classifier.

export interface Pt {
  x: number;
  y: number;
}

export interface StickPose {
  head: Pt;
  neck: Pt;
  hip: Pt;
  elbowL: Pt;
  handL: Pt;
  elbowR: Pt;
  handR: Pt;
  kneeL: Pt;
  footL: Pt;
  kneeR: Pt;
  footR: Pt;
}

/** Standing, arms at sides — the rest pose everything else is a variant of. */
const NEUTRAL: StickPose = {
  head: { x: 30, y: 10 },
  neck: { x: 30, y: 18 },
  hip: { x: 30, y: 60 },
  elbowL: { x: 20, y: 35 },
  handL: { x: 17, y: 50 },
  elbowR: { x: 40, y: 35 },
  handR: { x: 43, y: 50 },
  kneeL: { x: 24, y: 85 },
  footL: { x: 22, y: 110 },
  kneeR: { x: 36, y: 85 },
  footR: { x: 38, y: 110 },
};

const POSES: Record<string, StickPose> = {
  neutral: NEUTRAL,
  armsCrossed: {
    ...NEUTRAL,
    elbowL: { x: 26, y: 38 },
    handL: { x: 38, y: 45 },
    elbowR: { x: 34, y: 38 },
    handR: { x: 22, y: 45 },
  },
  crouch: {
    ...NEUTRAL,
    head: { x: 30, y: 30 },
    neck: { x: 30, y: 38 },
    hip: { x: 30, y: 68 },
    elbowL: { x: 16, y: 55 },
    handL: { x: 14, y: 68 },
    elbowR: { x: 44, y: 55 },
    handR: { x: 46, y: 68 },
    kneeL: { x: 16, y: 88 },
    footL: { x: 18, y: 108 },
    kneeR: { x: 44, y: 88 },
    footR: { x: 42, y: 108 },
  },
  armRaisedOne: {
    ...NEUTRAL,
    elbowR: { x: 40, y: 20 },
    handR: { x: 44, y: 2 },
  },
  armsRaisedHigh: {
    ...NEUTRAL,
    elbowL: { x: 20, y: 15 },
    handL: { x: 16, y: 0 },
    elbowR: { x: 40, y: 15 },
    handR: { x: 44, y: 0 },
  },
  armsWide: {
    ...NEUTRAL,
    elbowL: { x: 8, y: 22 },
    handL: { x: -4, y: 22 },
    elbowR: { x: 52, y: 22 },
    handR: { x: 64, y: 22 },
  },
  leanBack: {
    ...NEUTRAL,
    head: { x: 38, y: 8 },
    neck: { x: 34, y: 18 },
    hip: { x: 26, y: 60 },
    elbowL: { x: 16, y: 32 },
    handL: { x: 12, y: 46 },
    elbowR: { x: 38, y: 34 },
    handR: { x: 42, y: 48 },
  },
  handOnHip: {
    ...NEUTRAL,
    elbowL: { x: 18, y: 42 },
    handL: { x: 26, y: 55 },
    elbowR: { x: 42, y: 18 },
    handR: { x: 48, y: 4 },
  },
  lunge: {
    ...NEUTRAL,
    head: { x: 26, y: 12 },
    neck: { x: 28, y: 20 },
    hip: { x: 32, y: 62 },
    elbowL: { x: 16, y: 30 },
    handL: { x: 10, y: 22 },
    elbowR: { x: 40, y: 40 },
    handR: { x: 46, y: 32 },
    kneeL: { x: 16, y: 82 },
    footL: { x: 10, y: 100 },
    kneeR: { x: 44, y: 90 },
    footR: { x: 52, y: 110 },
  },
  curledFloor: {
    ...NEUTRAL,
    head: { x: 30, y: 55 },
    neck: { x: 30, y: 60 },
    hip: { x: 30, y: 72 },
    elbowL: { x: 22, y: 62 },
    handL: { x: 26, y: 72 },
    elbowR: { x: 38, y: 62 },
    handR: { x: 34, y: 72 },
    kneeL: { x: 18, y: 68 },
    footL: { x: 24, y: 78 },
    kneeR: { x: 42, y: 68 },
    footR: { x: 36, y: 78 },
  },
  kneel: {
    ...NEUTRAL,
    head: { x: 30, y: 34 },
    neck: { x: 30, y: 42 },
    hip: { x: 30, y: 78 },
    elbowL: { x: 18, y: 30 },
    handL: { x: 12, y: 16 },
    elbowR: { x: 42, y: 30 },
    handR: { x: 48, y: 16 },
    kneeL: { x: 22, y: 100 },
    footL: { x: 16, y: 112 },
    kneeR: { x: 38, y: 96 },
    footR: { x: 40, y: 112 },
  },
  buckStance: {
    ...NEUTRAL,
    head: { x: 30, y: 22 },
    neck: { x: 30, y: 30 },
    hip: { x: 30, y: 65 },
    elbowL: { x: 18, y: 48 },
    handL: { x: 22, y: 40 },
    elbowR: { x: 42, y: 48 },
    handR: { x: 38, y: 40 },
    kneeL: { x: 14, y: 88 },
    footL: { x: 10, y: 108 },
    kneeR: { x: 46, y: 88 },
    footR: { x: 50, y: 108 },
  },
};

/** Keyword → preset, checked in priority order. Covers all 32 real pose
 *  strings the engine currently generates (see STYLES in choreography.ts). */
const RULES: [RegExp, keyof typeof POSES][] = [
  [/arms crossed/i, "armsCrossed"],
  [/crouch|aggressive/i, "crouch"],
  [/both arms raised|arms raised high|raised high/i, "armsRaisedHigh"],
  [/one arm raised|reach(ing)? to the light|reach up/i, "armRaisedOne"],
  [/arms wide|arms-wide|embrace|grand/i, "armsWide"],
  [/lean-back|lean back|jack lean/i, "leanBack"],
  [/hand on hip|chin up/i, "handOnHip"],
  [/lunge|reaching/i, "lunge"],
  [/curled|floor|contracted|bowed/i, "curledFloor"],
  [/kneel/i, "kneel"],
  [/buck stance|fists up|chest out|flexed/i, "buckStance"],
];

export function poseFor(text: string): StickPose {
  const rule = RULES.find(([re]) => re.test(text));
  return POSES[rule?.[1] ?? "neutral"];
}

/** Linear interpolation between two poses, t in 0..1 — the "rough motion
 *  path" between one key pose and the next. */
export function lerpPose(a: StickPose, b: StickPose, t: number): StickPose {
  const lp = (p: Pt, q: Pt): Pt => ({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t });
  return {
    head: lp(a.head, b.head),
    neck: lp(a.neck, b.neck),
    hip: lp(a.hip, b.hip),
    elbowL: lp(a.elbowL, b.elbowL),
    handL: lp(a.handL, b.handL),
    elbowR: lp(a.elbowR, b.elbowR),
    handR: lp(a.handR, b.handR),
    kneeL: lp(a.kneeL, b.kneeL),
    footL: lp(a.footL, b.footL),
    kneeR: lp(a.kneeR, b.kneeR),
    footR: lp(a.footR, b.footR),
  };
}
