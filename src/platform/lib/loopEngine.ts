export type LoopStage = "generate" | "critique" | "score" | "improve" | "save-version" | "approve";

export interface LoopEvent {
  id: string;
  stage: LoopStage;
  target: string;
  summary: string;
  score?: number;
  createdAt: string;
}

export interface LoopRun<T> {
  id: string;
  target: string;
  value: T;
  events: LoopEvent[];
  score: number;
  approved: boolean;
}

export function createLoopRun<T>(target: string, value: T, score = 78): LoopRun<T> {
  return {
    id: crypto.randomUUID(),
    target,
    value,
    score,
    approved: false,
    events: [
      createLoopEvent("generate", target, `Generated first ${target} draft.`, score),
      createLoopEvent("critique", target, `Checked ${target} against the current creative direction.`, score),
    ],
  };
}

export function createLoopEvent(
  stage: LoopStage,
  target: string,
  summary: string,
  score?: number
): LoopEvent {
  return {
    id: crypto.randomUUID(),
    stage,
    target,
    summary,
    score,
    createdAt: new Date().toISOString(),
  };
}

export function improveLoopRun<T>(
  run: LoopRun<T>,
  value: T,
  summary = `Improved ${run.target} from critique.`
): LoopRun<T> {
  const score = Math.min(98, run.score + 7);
  return {
    ...run,
    value,
    score,
    events: [
      ...run.events,
      createLoopEvent("improve", run.target, summary, score),
      createLoopEvent("save-version", run.target, `Saved a new ${run.target} version.`, score),
    ],
  };
}

export function approveLoopRun<T>(run: LoopRun<T>): LoopRun<T> {
  return {
    ...run,
    approved: true,
    events: [...run.events, createLoopEvent("approve", run.target, `Approved ${run.target}.`, run.score)],
  };
}
