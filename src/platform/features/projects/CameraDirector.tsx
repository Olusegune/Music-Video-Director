import { Camera } from "lucide-react";
import type { CameraPlan, PromptPack } from "@/platform/lib/types";
import { Field, ShotPlanCard, DirectorEmpty } from "./directorShared";

type Update = (updater: (prev: PromptPack) => PromptPack) => void;

export function CameraDirector({ pack, update }: { pack: PromptPack; update: Update }) {
  const edit = (idx: number, patch: Partial<CameraPlan>) =>
    update((p) => ({
      ...p,
      shots: p.shots.map((s, i) => (i === idx ? { ...s, camera: { ...s.camera, ...patch } } : s)),
    }));

  if (pack.shots.length === 0) {
    return <DirectorEmpty note="No shots yet — generate a pack first." />;
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Camera className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">Camera Director · {pack.shots.length} shots</h2>
      </div>

      <div className="flex flex-col gap-4">
        {pack.shots.map((shot, idx) => {
          const c = shot.camera;
          return (
            <ShotPlanCard
              key={idx}
              shot={shot}
              accent="primary"
              icon={<Camera className="h-4 w-4" />}
            >
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 lg:grid-cols-4">
                <Field
                  label="Shot Type"
                  value={c.shotType}
                  onChange={(v) => edit(idx, { shotType: v })}
                />
                <Field label="Lens" value={c.lens} onChange={(v) => edit(idx, { lens: v })} />
                <Field
                  label="Camera Height"
                  value={c.cameraHeight}
                  onChange={(v) => edit(idx, { cameraHeight: v })}
                />
                <Field
                  label="Camera Angle"
                  value={c.cameraAngle}
                  onChange={(v) => edit(idx, { cameraAngle: v })}
                />
                <Field
                  label="Movement"
                  value={c.movement}
                  onChange={(v) => edit(idx, { movement: v })}
                  className="lg:col-span-2"
                />
                <Field
                  label="Composition"
                  value={c.composition}
                  onChange={(v) => edit(idx, { composition: v })}
                  className="lg:col-span-2"
                />
                <Field
                  label="Emotional Purpose"
                  value={c.emotionalPurpose}
                  onChange={(v) => edit(idx, { emotionalPurpose: v })}
                  className="lg:col-span-2"
                />
                <Field
                  label="Editorial Purpose"
                  value={c.editorialPurpose}
                  onChange={(v) => edit(idx, { editorialPurpose: v })}
                  className="lg:col-span-2"
                />
                <Field
                  label="Visual Storytelling Notes"
                  value={c.notes}
                  onChange={(v) => edit(idx, { notes: v })}
                  textarea
                  className="col-span-2 lg:col-span-4"
                />
              </div>
            </ShotPlanCard>
          );
        })}
      </div>
    </div>
  );
}
