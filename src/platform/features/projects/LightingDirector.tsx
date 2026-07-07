import { Lightbulb } from "lucide-react";
import type { LightingPlan, PromptPack } from "@/platform/lib/types";
import { Field, ShotPlanCard, DirectorEmpty } from "./directorShared";

type Update = (updater: (prev: PromptPack) => PromptPack) => void;

export function LightingDirector({
  pack,
  update,
}: {
  pack: PromptPack;
  update: Update;
}) {
  const edit = (idx: number, patch: Partial<LightingPlan>) =>
    update((p) => ({
      ...p,
      shots: p.shots.map((s, i) =>
        i === idx ? { ...s, lighting: { ...s.lighting, ...patch } } : s
      ),
    }));

  if (pack.shots.length === 0) {
    return <DirectorEmpty note="No shots yet — generate a pack first." />;
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-accent" />
        <h2 className="text-sm font-semibold">
          Lighting Director · {pack.shots.length} shots
        </h2>
      </div>

      <div className="flex flex-col gap-4">
        {pack.shots.map((shot, idx) => {
          const l = shot.lighting;
          return (
            <ShotPlanCard
              key={idx}
              shot={shot}
              accent="accent"
              icon={<Lightbulb className="h-4 w-4" />}
            >
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 lg:grid-cols-4">
                <Field label="Scene Intent" value={l.sceneIntent} onChange={(v) => edit(idx, { sceneIntent: v })} className="lg:col-span-2" />
                <Field label="Visual Strategy" value={l.visualStrategy} onChange={(v) => edit(idx, { visualStrategy: v })} className="lg:col-span-2" />
                <Field label="Key Light" value={l.keyLight} onChange={(v) => edit(idx, { keyLight: v })} />
                <Field label="Fill Light" value={l.fillLight} onChange={(v) => edit(idx, { fillLight: v })} />
                <Field label="Rim Light" value={l.rimLight} onChange={(v) => edit(idx, { rimLight: v })} />
                <Field label="Color Temperature" value={l.colorTemperature} onChange={(v) => edit(idx, { colorTemperature: v })} />
                <Field label="Contrast Ratio" value={l.contrastRatio} onChange={(v) => edit(idx, { contrastRatio: v })} />
                <Field label="Depth Separation" value={l.depthSeparation} onChange={(v) => edit(idx, { depthSeparation: v })} />
                <Field label="Atmospheric Elements" value={l.atmosphere} onChange={(v) => edit(idx, { atmosphere: v })} className="lg:col-span-2" />
                <Field label="Lighting Continuity Rules" value={l.continuityRules} onChange={(v) => edit(idx, { continuityRules: v })} textarea className="col-span-2 lg:col-span-4" />
              </div>
            </ShotPlanCard>
          );
        })}
      </div>
    </div>
  );
}
