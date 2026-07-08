import { createVersionedStorage } from "@/platform/lib/storage";

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

const loopRunStorage = createVersionedStorage<LoopRun<unknown>[]>({
  namespace: "platform",
  key: "loop-runs",
  version: 1,
  fallback: () => [],
  legacyKeys: ["mf.loopRuns"],
  migrate: (data) => (Array.isArray(data) ? (data as LoopRun<unknown>[]) : []),
});

export function listLoopRuns<T = unknown>(): LoopRun<T>[] {
  return loopRunStorage.read() as LoopRun<T>[];
}

export function saveLoopRun<T>(run: LoopRun<T>): LoopRun<T> {
  const runs = listLoopRuns<T>();
  const index = runs.findIndex((item) => item.id === run.id);
  if (index >= 0) runs[index] = run;
  else runs.unshift(run);
  loopRunStorage.write(runs as LoopRun<unknown>[]);
  return run;
}

export function createLoopRun<T>(target: string, value: T, score = 78): LoopRun<T> {
  return saveLoopRun({
    id: crypto.randomUUID(),
    target,
    value,
    score,
    approved: false,
    events: [
      createLoopEvent("generate", target, `Generated first ${target} draft.`, score),
      createLoopEvent(
        "critique",
        target,
        `Checked ${target} against the current creative direction.`,
        score
      ),
    ],
  });
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
  return saveLoopRun({
    ...run,
    value,
    score,
    events: [
      ...run.events,
      createLoopEvent("improve", run.target, summary, score),
      createLoopEvent("save-version", run.target, `Saved a new ${run.target} version.`, score),
    ],
  });
}

export function approveLoopRun<T>(run: LoopRun<T>): LoopRun<T> {
  return saveLoopRun({
    ...run,
    approved: true,
    events: [
      ...run.events,
      createLoopEvent("approve", run.target, `Approved ${run.target}.`, run.score),
    ],
  });
}
