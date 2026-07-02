import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Play, Trash2, Film, Users, Globe, Package } from "lucide-react";
import { api, isTauri } from "@/lib/ipc";
import {
  MOTION_TYPES,
  composeMotionPrompt,
  loadMotionTests,
  addMotionTest,
  deleteMotionTest,
  type MotionTest,
} from "@/lib/motionTest";
import { VIDEO_MODELS, findVideoModel } from "@/lib/videoGen";
import { collectRefs } from "@/lib/refs";
import {
  GenerationPanel,
  type GenerateOpts,
  type GenModel,
} from "@/components/generation/GenerationPanel";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { AssetVideo } from "@/components/ui/asset-image";

// Video models, shaped for the unified panel (drop the "auto" blank-provider id
// in favour of an explicit "Auto" that maps to first-configured = "custom").
const VIDEO_GEN_MODELS: GenModel[] = VIDEO_MODELS.map((m) => ({
  id: m.id,
  label: m.label,
  providerKey: m.providerKey || "custom",
  apiModel: m.apiModel,
  keyIds: m.keyIds,
}));

function Select({
  value,
  onChange,
  icon,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted">
        {icon}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-[var(--radius-input)] border border-border bg-surface pl-8 pr-3 text-sm text-foreground transition-colors focus-visible:border-primary focus-visible:outline-none"
      >
        {children}
      </select>
    </div>
  );
}

export function AnimationLab() {
  const { data: characters = [] } = useQuery({ queryKey: ["characters"], queryFn: api.listCharacters });
  const { data: environments = [] } = useQuery({ queryKey: ["environments"], queryFn: api.listEnvironments });
  const { data: props = [] } = useQuery({ queryKey: ["props"], queryFn: api.listProps });

  const [characterId, setCharacterId] = useState("");
  const [environmentId, setEnvironmentId] = useState("");
  const [propId, setPropId] = useState("");
  const [motionKey, setMotionKey] = useState(MOTION_TYPES[0].key);
  const [tests, setTests] = useState<MotionTest[]>(() => loadMotionTests());

  const character = characters.find((c) => c.id === characterId) ?? null;
  const environment = environments.find((e) => e.id === environmentId) ?? null;
  const prop = props.find((p) => p.id === propId) ?? null;
  const motion = MOTION_TYPES.find((m) => m.key === motionKey) ?? MOTION_TYPES[0];

  const prompt = useMemo(
    () => composeMotionPrompt(character, environment, prop, motion),
    [character, environment, prop, motion]
  );

  // References = the locked look (start frames) so the clip stays on-model.
  const refs = useMemo(
    () =>
      [character?.portraitUrl, environment?.establishingUrl, prop?.heroUrl].filter(
        (s): s is string => !!s
      ),
    [character, environment, prop]
  );

  const runGenerate = async (opts: GenerateOpts): Promise<string[]> => {
    const motionLine = `${opts.camera ?? "Static"} camera, motion strength ${opts.motion ?? 50}%, about ${opts.duration ?? 5}s at ${opts.fps ?? 24} fps.`;
    const fullPrompt = `${opts.prompt} ${motionLine}`;
    const displayRefs = opts.references.length ? opts.references : refs;

    // The reference strip only holds display srcs (asset://, blob:, http) — these
    // are UI thumbnails, not provider-ready bytes. Resolve them to base64 before
    // the API call; a raw display URL sent as "image_url" is what caused fal /
    // WaveSpeed / Kie to all reject the request as missing the image field.
    const allRefs = await collectRefs(displayRefs);

    // Workflow validation: an image-to-video-only model can't run without at
    // least one resolved reference. Fail fast with an actionable message instead
    // of letting the provider bounce back a cryptic "field required" error.
    const model = findVideoModel(opts.modelId);
    const requiresImage = (model.apiModel ?? "").includes("image-to-video");
    if (requiresImage && allRefs.length === 0) {
      throw new Error(
        displayRefs.length > 0
          ? `${model.label} needs an image reference, but none of the selected references could be loaded. Pick a character/environment/prop with a generated portrait, or choose a text-to-video model.`
          : `${model.label} needs an image reference. Select a Character, Environment, or Prop with a locked image, or add one via "Add reference", or choose a text-to-video model.`
      );
    }

    const urls: string[] = [];
    for (let i = 0; i < opts.variations; i++) {
      const url = await api.generateMvShotVideo(
        "animlab",
        crypto.randomUUID(),
        fullPrompt,
        opts.provider || undefined,
        allRefs.length ? allRefs : undefined,
        opts.apiModel
      );
      urls.push(url);
    }
    return urls;
  };

  // "Save to library" — adopt a clip into the motion-test gallery. The persist
  // (a side effect) runs once here; the state updater stays pure + idempotent so
  // React's dev double-invoke can't create duplicates.
  const saveToLibrary = (url: string) => {
    if (tests.some((t) => t.url === url)) return;
    const t = addMotionTest({
      label: `${character?.name ?? "Motion"} — ${motion.label}`,
      characterName: character?.name ?? "—",
      motionLabel: motion.label,
      prompt,
      url,
    });
    setTests((prev) => (prev.some((x) => x.url === url) ? prev : [t, ...prev]));
  };

  const remove = (id: string) => {
    deleteMotionTest(id);
    setTests((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="border-b border-border px-8 py-5">
        <h1 className="text-lg font-semibold">Animation Lab</h1>
        <p className="text-xs text-muted">
          A motion-testing workspace — pick a subject and a test, dial in the
          shot, and generate. Same controls as everywhere else.
        </p>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[24rem_1fr]">
        {/* Controls */}
        <div className="flex flex-col gap-4 overflow-y-auto border-r border-border p-6">
          <div className="flex flex-col gap-1.5">
            <Label>Character</Label>
            <Select value={characterId} onChange={setCharacterId} icon={<Users className="h-3.5 w-3.5" />}>
              <option value="">None</option>
              {characters.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Environment</Label>
            <Select value={environmentId} onChange={setEnvironmentId} icon={<Globe className="h-3.5 w-3.5" />}>
              <option value="">None</option>
              {environments.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Prop / Vehicle</Label>
            <Select value={propId} onChange={setPropId} icon={<Package className="h-3.5 w-3.5" />}>
              <option value="">None</option>
              {props.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.category})</option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Motion test</Label>
            <div className="grid grid-cols-2 gap-2">
              {MOTION_TYPES.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setMotionKey(m.key)}
                  className={cn(
                    "rounded-[var(--radius-button)] border px-3 py-2 text-left text-xs transition-colors",
                    motionKey === m.key
                      ? "border-primary bg-primary/12 text-foreground"
                      : "border-border text-muted hover:bg-elevated/60"
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {refs.length > 0 && (
            <p className="rounded-md border border-border bg-elevated/40 px-3 py-2 text-[11px] text-muted">
              {refs.length} reference {refs.length === 1 ? "frame" : "frames"} from your
              locked assets will drive the clip — same look, in motion.
            </p>
          )}
        </div>

        {/* Generation panel + gallery */}
        <div className="min-h-0 overflow-y-auto p-6">
          <div className="mb-6 max-w-md">
            <GenerationPanel
              key={`${characterId}:${environmentId}:${propId}:${motionKey}`}
              title="Generate motion test"
              mode="video"
              models={VIDEO_GEN_MODELS}
              initialPrompt={prompt}
              defaultAspect="16:9"
              references={refs}
              onGenerate={runGenerate}
              onPick={saveToLibrary}
              pickLabel="Save to library"
            />
            {!isTauri && (
              <p className="mt-2 text-center text-[11px] text-muted">
                Browser preview plays a sample clip; the desktop app uses your
                chosen video provider.
              </p>
            )}
          </div>

          <Label className="mb-2 block">Motion test library</Label>
          {tests.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-border py-12 text-center">
              <Film className="mb-3 h-8 w-8 text-muted" />
              <p className="text-sm font-medium">No motion tests yet</p>
              <p className="mt-1 max-w-xs text-xs text-muted">
                Generate a test above, then "Save to library" to keep it.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {tests.map((t) => (
                <div key={t.id} className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface shadow-card">
                  <div className="relative aspect-video w-full bg-black">
                    <AssetVideo src={t.url} className="h-full w-full object-cover" />
                  </div>
                  <div className="flex items-start justify-between gap-2 p-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{t.characterName}</div>
                      <div className="flex items-center gap-1 text-[11px] text-muted">
                        <Play className="h-3 w-3" /> {t.motionLabel}
                      </div>
                    </div>
                    <button
                      onClick={() => remove(t.id)}
                      aria-label="Delete motion test"
                      className="text-muted hover:text-danger"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
