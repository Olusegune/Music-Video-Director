import { useState, useMemo } from "react";
import { useConfirm } from "@/platform/components/ui/confirm-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Globe,
  Wand2,
  Sparkles,
  Plus,
  ArrowLeft,
  Trash2,
  Lock,
  Unlock,
  Building2,
  CloudSun,
  Palette,
  ScrollText,
  LayoutGrid,
  Images,
  RefreshCw,
  Loader2,
  Lightbulb,
  Fingerprint,
  X,
} from "lucide-react";
import { api, isTauri } from "@/platform/lib/ipc";
import { cn } from "@/platform/lib/utils";
import type { PromptLayer } from "@/platform/lib/promptPipeline";
import { bibleEntityLayers } from "@/platform/lib/bibleLayers";
import type { Environment } from "@/platform/lib/types";
import {
  composeEnvironmentDna,
  draftEnvironmentFromLine,
  isEnvDnaStale,
  newEnvironment,
} from "@/platform/lib/environmentDna";
import { STYLE_GROUPS, STYLE_PRESETS, presetsByGroup } from "@/platform/lib/styles";
import { ImageStudio } from "@/platform/features/imagestudio/ImageStudio";
import { SheetStudio } from "@/platform/features/sheets/SheetStudio";
import { environmentSheetSections, ENVIRONMENT_PROMPT_TAIL } from "@/platform/lib/assetSheet";
import { AssetImage } from "@/platform/components/ui/asset-image";
import {
  GradientFill,
  MediaPanel,
  LockToggle,
  PromptDnaBlock,
  SavedTick,
  Section,
  Field,
  DnaSelect,
  PaletteField,
  MoveAssetMenu,
  useAutosave,
  QuickActionButton,
  SmartImportButton,
  SmartImportReview,
} from "@/platform/features/dna/dnaKit";
import { extractTextFromFile } from "@/platform/lib/docParse";
import { extractWorldFields, WORLD_IMPORT_FIELDS, type ImportedFields } from "@/platform/lib/smartImport";
import { type GenerateOpts } from "@/platform/components/generation/GenerationPanel";
import { Button } from "@/platform/components/ui/button";
import { Input } from "@/platform/components/ui/input";
import { Textarea } from "@/platform/components/ui/textarea";
import { Badge } from "@/platform/components/ui/badge";
import { Label } from "@/platform/components/ui/label";
import { BibleCreationFlow } from "@/platform/features/dna/BibleCreationFlow";
import { BibleCardStage } from "@/platform/features/dna/BibleCardStage";
import { BibleProfileStage } from "@/platform/features/dna/BibleProfileStage";
import { enhanceBibleProfile, textProviderIsReady } from "@/platform/features/dna/bibleProfileAi";
import { BibleStageBadge } from "@/platform/features/dna/BibleStageBadge";

export function WorldBible() {
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [coverageId, setCoverageId] = useState<string | null>(null);
  const [cardId, setCardId] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [conjure, setConjure] = useState("");

  const { data: environments = [] } = useQuery({
    queryKey: ["environments"],
    queryFn: api.listEnvironments,
  });

  const create = useMutation({
    mutationFn: (e: Environment) => api.saveEnvironment(e).then(() => e),
    onSuccess: (e) => {
      queryClient.invalidateQueries({ queryKey: ["environments"] });
      setSelectedId(e.id);
      setConjure("");
    },
  });

  const removeEnv = useMutation({
    mutationFn: (id: string) => api.deleteEnvironment(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["environments"] }),
  });

  const cardEnv = environments.find((e) => e.id === cardId) ?? null;
  const profileEnv = environments.find((e) => e.id === profileId) ?? null;
  if (cardEnv) {
    const dna = cardEnv.promptDna.trim() || composeEnvironmentDna(cardEnv).promptDna;
    const prompt = `Establishing shot of ${cardEnv.name}. ${dna}. Cinematic wide shot, atmospheric depth, high detail, no people.`;
    return (
      <div className="flex h-full flex-col overflow-y-auto p-8">
        <BibleCardStage
          key={cardEnv.id}
          entityLabel="Location"
          entityName={cardEnv.name}
          generateCandidate={() =>
            api.generateImageFromSpec({
              capability: "image",
              prompt,
              aspect: "16:9",
              moduleId: "musicvideo",
              projectRef: { moduleId: "musicvideo", entityId: cardEnv.id },
            })
          }
          onChoose={(url) => {
            const next = { ...cardEnv, establishingUrl: url };
            api.saveEnvironment(next).then(() => {
              queryClient.setQueryData<Environment[]>(["environments"], (current = []) =>
                current.map((item) => (item.id === next.id ? next : item))
              );
              setCardId(null);
              setProfileId(next.id);
            });
          }}
          onSkip={() => {
            setCardId(null);
            setProfileId(cardEnv.id);
          }}
        />
      </div>
    );
  }

  if (profileEnv) {
    return (
      <div className="flex h-full flex-col overflow-y-auto p-8">
        <EnvironmentProfile
          key={profileEnv.id}
          environment={profileEnv}
          onDone={(saved) => {
            if (saved) {
              queryClient.setQueryData<Environment[]>(["environments"], (current = []) =>
                current.map((item) => (item.id === saved.id ? saved : item))
              );
              void api.saveEnvironment(saved);
            }
            setProfileId(null);
            setSelectedId(profileEnv.id);
          }}
        />
      </div>
    );
  }

  const sheetEnv = environments.find((e) => e.id === sheetId) ?? null;
  if (sheetEnv)
    return (
      <ImageStudio
        key={sheetEnv.id}
        kind="environment"
        entity={sheetEnv}
        entityName={sheetEnv.name}
        onBack={() => setSheetId(null)}
      />
    );

  const coverageEnv = environments.find((e) => e.id === coverageId) ?? null;
  if (coverageEnv) {
    const dna = coverageEnv.promptDna.trim() || composeEnvironmentDna(coverageEnv).promptDna;
    return (
      <SheetStudio
        key={coverageEnv.id}
        kind="environment"
        id={coverageEnv.id}
        name={coverageEnv.name}
        title={`${coverageEnv.name} — Coverage Sheet`}
        mediaSrc={coverageEnv.establishingUrl ?? ""}
        sections={environmentSheetSections(coverageEnv)}
        promptTail={ENVIRONMENT_PROMPT_TAIL}
        composeDna={() => dna}
        generate={(id, prompt) =>
          api.generateImageFromSpec({
            capability: "image",
            prompt,
            aspect: "16:9",
            moduleId: "world",
            projectRef: { moduleId: "world", entityId: id },
          })
        }
        profile={[{ label: "Description", value: coverageEnv.description ?? "" }]}
        locked={coverageEnv.locked}
        onBack={() => setCoverageId(null)}
      />
    );
  }

  const selected = environments.find((e) => e.id === selectedId) ?? null;
  if (selected)
    return (
      <EnvironmentSheet
        key={selected.id}
        environment={selected}
        onBack={() => setSelectedId(null)}
        onOpenSheet={() => setSheetId(selected.id)}
        onOpenCoverage={() => setCoverageId(selected.id)}
      />
    );

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border px-8 py-5">
        <div>
          <h1 className="text-lg font-semibold">World Designer</h1>
          <p className="text-xs text-muted">
            Design, refine, and preserve consistent locations across every project.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Wand2 className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-accent" />
            <Input
              value={conjure}
              onChange={(e) => setConjure(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && conjure.trim())
                  create.mutate(draftEnvironmentFromLine(conjure));
              }}
              placeholder="Conjure — “a neon-lit rain-soaked alley at night”"
              className="h-9 w-[24rem] max-w-[55vw] pl-8"
              aria-label="Conjure an environment from a description"
            />
          </div>
          <Button
            variant="secondary"
            disabled={!conjure.trim() || create.isPending}
            onClick={() => create.mutate(draftEnvironmentFromLine(conjure))}
          >
            <Sparkles className="h-4 w-4" /> Conjure
          </Button>
          <Button onClick={() => create.mutate(newEnvironment())} disabled={create.isPending}>
            <Plus className="h-4 w-4" /> New Location
          </Button>
        </div>
      </header>

      <div className="p-8">
        {environments.length === 0 ? (
          <BibleCreationFlow
            entityLabel="World"
            onSpark={(value) =>
              create.mutate(draftEnvironmentFromLine(value), {
                // Visual-first, like the Character Bible: pick a card before the form.
                onSuccess: (environment) => {
                  queryClient.setQueryData<Environment[]>(["environments"], (current = []) => [
                    environment,
                    ...current.filter((item) => item.id !== environment.id),
                  ]);
                  setCardId(environment.id);
                },
              })
            }
            onBlank={() => create.mutate(newEnvironment())}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {environments.map((e) => (
              <EnvCard
                key={e.id}
                env={e}
                onClick={() => setSelectedId(e.id)}
                onOpenCoverage={() => setCoverageId(e.id)}
                onDelete={async () => {
                  if (
                    await confirm({
                      title: `Delete "${e.name}" from World Designer?`,
                      confirmLabel: "Delete",
                      destructive: true,
                    })
                  )
                    removeEnv.mutate(e.id);
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EnvironmentProfile({
  environment,
  onDone,
}: {
  environment: Environment;
  onDone: (saved: Environment | null) => void;
}) {
  const [draft, setDraft] = useState<Environment>(environment);
  const { data: keyStatuses = [] } = useQuery({
    queryKey: ["providerKeys"],
    queryFn: api.getProviderKeyStatuses,
  });
  const set = (key: string, value: string) =>
    setDraft((current) => ({ ...current, [key]: value }) as Environment);
  const canEnhance = textProviderIsReady(keyStatuses);
  return (
    <BibleProfileStage
      entityLabel="Location"
      entityName={draft.name}
      portraitUrl={draft.establishingUrl}
      sections={[
        {
          title: "Place",
          fields: [
            { key: "description", label: "Description", value: draft.description, multiline: true },
            { key: "architecture", label: "Architecture", value: draft.architecture },
            { key: "materials", label: "Materials", value: draft.materials },
          ],
        },
        {
          title: "Atmosphere",
          fields: [
            { key: "timeOfDay", label: "Time of day", value: draft.timeOfDay },
            { key: "mood", label: "Mood", value: draft.mood },
            { key: "lightingStyle", label: "Lighting", value: draft.lightingStyle },
          ],
        },
      ]}
      onField={set}
      onContinue={() => onDone(draft)}
      onSkip={() => onDone(null)}
      onEnhance={
        canEnhance
          ? () =>
              enhanceBibleProfile(
                `Draft a concise cinematic location profile for ${draft.name}. Existing description: ${draft.description}. Return only useful production detail for the requested fields.`,
                '{"description":"string","architecture":"string","materials":"string","timeOfDay":"string","mood":"string","lightingStyle":"string"}',
                "musicvideo",
                draft.id,
                ["description", "architecture", "materials", "timeOfDay", "mood", "lightingStyle"]
              )
          : undefined
      }
      enhanceHint={
        canEnhance ? undefined : "Add a configured Gemini key in API Keys to draft this location."
      }
    />
  );
}

function EnvCard({
  env,
  onClick,
  onDelete,
  onOpenCoverage,
}: {
  env: Environment;
  onClick: () => void;
  onDelete: () => void;
  onOpenCoverage: () => void;
}) {
  const subtitle = [env.timeOfDay, env.mood].filter(Boolean).join(" · ") || "Undefined mood";
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick()}
      className="group relative cursor-pointer overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface text-left shadow-card transition-all hover:border-primary/40 hover:shadow-md"
    >
      <div className="relative aspect-video w-full overflow-hidden bg-elevated">
        <AssetImage
          src={env.establishingUrl}
          alt={env.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          fallback={
            <GradientFill id={env.id} label={env.name} className="h-full w-full text-2xl" />
          }
          label="Establishing shot"
        />
        <div className="absolute right-2 top-2">
          {env.locked ? (
            <Badge variant="success" className="gap-1">
              <Lock className="h-3 w-3" /> Canon
            </Badge>
          ) : (
            <Badge variant="warning">Draft</Badge>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Delete location"
          aria-label="Delete location"
          className="absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-md bg-black/55 text-white/90 opacity-0 transition-opacity hover:bg-danger group-hover:opacity-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenCoverage();
          }}
          title="Coverage Sheet"
          aria-label="Open coverage sheet"
          className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-md bg-black/55 text-white/90 opacity-0 transition-opacity hover:bg-primary group-hover:opacity-100"
        >
          <Images className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="p-3">
        <div className="truncate text-sm font-semibold">{env.name}</div>
        <div className="truncate text-xs text-muted">{subtitle}</div>
      </div>
    </div>
  );
}

function EnvironmentSheet({
  environment,
  onBack,
  onOpenSheet,
  onOpenCoverage,
}: {
  environment: Environment;
  onBack: () => void;
  onOpenSheet: () => void;
  onOpenCoverage: () => void;
}) {
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Environment>(environment);
  const [section, setSection] = useState<"overview" | "place" | "atmosphere" | "style">(
    "overview"
  );
  const [mode, setMode] = useState<"simple" | "complete">("simple");

  // --- Smart Import (PDF / DOCX) --------------------------------------------
  const [importFields, setImportFields] = useState<ImportedFields | null>(null);
  const [importAccepted, setImportAccepted] = useState<Set<string>>(new Set());
  const [importBusy, setImportBusy] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const { data: importKeyStatuses = [] } = useQuery({
    queryKey: ["providerKeys"],
    queryFn: api.getProviderKeyStatuses,
  });
  const canSmartImport = textProviderIsReady(importKeyStatuses);

  const handleImportFile = async (file: File) => {
    setImportError(null);
    setImportBusy(true);
    setImportFileName(file.name);
    try {
      const { text } = await extractTextFromFile(file);
      if (!text.trim()) throw new Error("No readable text found in that file.");
      const fields = await extractWorldFields(text, draft.id);
      if (Object.keys(fields).length === 0) {
        throw new Error("No location fields could be confidently extracted from that document.");
      }
      setImportFields(fields);
      setImportAccepted(
        new Set(
          Object.entries(fields)
            .filter(([, f]) => f?.confidence === "high")
            .map(([k]) => k)
        )
      );
    } catch (e) {
      setImportError(e instanceof Error ? e.message : String(e));
    } finally {
      setImportBusy(false);
    }
  };

  const applyImport = () => {
    if (!importFields) return;
    setDraft((d) => {
      const next = { ...d };
      for (const key of importAccepted) {
        const field = importFields[key];
        if (field) (next as Record<string, unknown>)[key] = field.value;
      }
      return next;
    });
    setImportFields(null);
    setImportFileName(null);
  };

  const discardImport = () => {
    setImportFields(null);
    setImportFileName(null);
    setImportError(null);
  };

  const savedTick = useAutosave(draft, async (d) => {
    await api.saveEnvironment(d);
    queryClient.invalidateQueries({ queryKey: ["environments"] });
  });

  const set = <K extends keyof Environment>(key: K, value: Environment[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const stale = isEnvDnaStale(draft);
  const compose = () => {
    const { promptDna, consistencyRules } = composeEnvironmentDna(draft);
    setDraft((d) => ({ ...d, promptDna, consistencyRules }));
  };

  const remove = useMutation({
    mutationFn: () => api.deleteEnvironment(draft.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["environments"] });
      onBack();
    },
  });

  // Named prompt contributions rather than one flattened blob.
  const worldLayers: PromptLayer[] = useMemo(
    () => bibleEntityLayers(draft, composeEnvironmentDna(draft).promptDna, "World Bible"),
    [draft]
  );

  const runGenerate = async (opts: GenerateOpts): Promise<string[]> => {
    const urls: string[] = [];
    for (let i = 0; i < opts.variations; i++) {
      const s = opts.seed !== undefined ? opts.seed + i : undefined;
      urls.push(
        await api.generateImageFromSpec({
          ...opts.spec,
          seed: s,
          batch: 1,
          providerPref: opts.provider as never,
          modelHint: opts.apiModel ?? opts.modelId,
          moduleId: "musicvideo",
          projectRef: { moduleId: "musicvideo", entityId: draft.id },
        })
      );
    }
    setDraft((d) => ({ ...d, promptDna: opts.prompt }));
    return urls;
  };

  const pickEstablishing = (url: string) =>
    setDraft((d) => ({
      ...d,
      establishingUrl: url,
      referenceImages: d.referenceImages.includes(url)
        ? d.referenceImages
        : [url, ...d.referenceImages].slice(0, 8),
    }));

  // --- Quick Actions rail ---------------------------------------------------
  const [quickBusy, setQuickBusy] = useState(false);
  const [quickError, setQuickError] = useState<string | null>(null);

  const generateEstablishingVariations = async () => {
    setQuickError(null);
    setQuickBusy(true);
    try {
      const base = draft.promptDna.trim() || composeEnvironmentDna(draft).promptDna;
      const prompt = `Establishing shot of ${draft.name || "the location"}. ${base}. Alternate angle and time of day, same place, cinematic wide shot, atmospheric depth, high detail, no people.`;
      const urls: string[] = [];
      for (let i = 0; i < 4; i++) {
        urls.push(
          await api.generateImageFromSpec({
            capability: "image",
            prompt,
            aspect: "16:9",
            batch: 1,
            moduleId: "world",
            projectRef: { moduleId: "world", entityId: draft.id },
          })
        );
      }
      setDraft((d) => ({
        ...d,
        referenceImages: [
          ...urls.filter((u) => !d.referenceImages.includes(u)),
          ...d.referenceImages,
        ].slice(0, 8),
      }));
    } catch (e) {
      setQuickError(e instanceof Error ? e.message : String(e));
    } finally {
      setQuickBusy(false);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <header className="flex items-center justify-between gap-3 border-b border-border px-8 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back to world">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Input
            value={draft.name}
            onChange={(e) => set("name", e.target.value)}
            aria-label="Environment name"
            className="h-9 w-72 text-base font-semibold"
          />
          {draft.locked ? (
            <Badge variant="success" className="gap-1">
              <Lock className="h-3 w-3" /> Canon
            </Badge>
          ) : (
            <Badge variant="warning">Draft</Badge>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div
            role="tablist"
            aria-label="Location workspace mode"
            className="flex items-center gap-0.5 rounded-lg border border-border bg-elevated/40 p-0.5"
          >
            {(
              [
                ["simple", "Simple Mode"],
                ["complete", "Complete Mode"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={mode === id}
                onClick={() => setMode(id)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  mode === id ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <BibleStageBadge />
          <SavedTick show={savedTick} />
          <SmartImportButton
            canImport={canSmartImport}
            busy={importBusy}
            onFile={(file) => void handleImportFile(file)}
          />
          <MoveAssetMenu
            fromKind="Environment"
            fromId={draft.id}
            name={draft.name}
            primaryImage={draft.establishingUrl}
            refs={draft.referenceImages}
            onCrossMoved={onBack}
          />
          <Button onClick={onOpenSheet}>
            <LayoutGrid className="h-4 w-4" /> Location Sheet
          </Button>
          <Button variant="secondary" onClick={onOpenCoverage}>
            <Images className="h-4 w-4" /> Coverage Sheet
            <Badge variant="accent" className="px-1.5 py-0">
              New
            </Badge>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => remove.mutate()}
            aria-label="Delete environment"
            className="text-muted hover:text-danger"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {importError && !importFields && (
        <div className="mx-8 mt-4 flex items-start justify-between gap-3 rounded-[var(--radius-card)] border border-danger/30 bg-danger/10 p-3 text-[13px] text-danger">
          <span>{importError}</span>
          <button onClick={() => setImportError(null)} aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {importFields && (
        <SmartImportReview
          fields={WORLD_IMPORT_FIELDS}
          fileName={importFileName}
          imported={importFields}
          accepted={importAccepted}
          onToggle={(key) =>
            setImportAccepted((prev) => {
              const next = new Set(prev);
              if (next.has(key)) next.delete(key);
              else next.add(key);
              return next;
            })
          }
          onEdit={(key, value) =>
            setImportFields((prev) => (prev ? { ...prev, [key]: { ...prev[key]!, value } } : prev))
          }
          onApply={applyImport}
          onDiscard={discardImport}
        />
      )}

      <div
        className={cn(
          "grid flex-1 grid-cols-1 gap-6 p-8",
          mode === "complete" ? "lg:grid-cols-[20rem_1fr_15rem]" : "lg:grid-cols-[20rem_1fr]"
        )}
      >
        <div className="flex flex-col gap-4">
          <MediaPanel
            id={draft.id}
            label={draft.name}
            src={draft.establishingUrl}
            references={draft.referenceImages}
            generating={false}
            aspect="aspect-video"
            isTauri={isTauri}
            initialPrompt=""
            contextLayers={worldLayers}
            promptVariables={{ location: draft.name }}
            historyScope={{ moduleId: "world", entityId: draft.id }}
            onGenerate={runGenerate}
            onPick={pickEstablishing}
            onRemoveReference={(src) =>
              setDraft((d) => ({
                ...d,
                referenceImages: d.referenceImages.filter((r) => r !== src),
              }))
            }
            pickLabel="Use as establishing"
            defaultAspect="16:9"
          />
          <LockToggle
            locked={draft.locked}
            onToggle={() => set("locked", !draft.locked)}
            lockedTitle="Consistency locked"
            lockedHint="Canonical — reuse this world across every shot."
            unlockedHint="Lock to make this location canonical."
          />
        </div>

        {mode === "simple" ? (
          <div className="flex flex-col gap-4">
            <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-card">
              <h2 className="mb-3 text-sm font-semibold">Create Location — Simple Mode</h2>
              <div className="grid grid-cols-1 gap-3">
                <Field label="Description" full>
                  <Textarea
                    value={draft.description}
                    onChange={(e) => set("description", e.target.value)}
                    placeholder="A rain-soaked alley behind a row of neon ramen bars…"
                    className="min-h-16"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Time of day">
                    <Input
                      value={draft.timeOfDay}
                      onChange={(e) => set("timeOfDay", e.target.value)}
                      placeholder="night"
                    />
                  </Field>
                  <Field label="Mood">
                    <Input
                      value={draft.mood}
                      onChange={(e) => set("mood", e.target.value)}
                      placeholder="gritty, lonely, cinematic"
                    />
                  </Field>
                </div>
              </div>
              <Button
                className="mt-4 w-full"
                onClick={() => {
                  compose();
                  setMode("complete");
                }}
              >
                <Sparkles className="h-4 w-4" /> Generate Full Profile
              </Button>
              <p className="mt-2 text-center text-[11px] text-muted">
                Composes Prompt DNA from the fields above, then opens Complete Mode to review.
              </p>
            </div>

            <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-card">
              <Label className="mb-2 block">Quick Preview</Label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ["Place", Building2, draft.architecture || draft.materials],
                    ["Atmosphere", CloudSun, draft.timeOfDay || draft.lightingStyle],
                    ["Color", Palette, draft.colorPalette.length > 0],
                  ] as const
                ).map(([label, Icon, filled]) => (
                  <div
                    key={label}
                    className="flex flex-col items-center gap-1 rounded-md border border-border bg-elevated/40 p-2"
                  >
                    <div className="relative aspect-square w-full overflow-hidden rounded-md bg-elevated">
                      <AssetImage
                        src={draft.establishingUrl}
                        alt={label}
                        className="h-full w-full object-cover"
                        fallback={
                          <div className="flex h-full w-full items-center justify-center text-muted">
                            <Icon className="h-4 w-4" />
                          </div>
                        }
                        label={label}
                      />
                      {!filled && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                          <Icon className="h-4 w-4 text-muted" />
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-muted">{label}</span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-muted">
                Previews reuse the current establishing shot until distinct art is generated per
                category from the Location Sheet.
              </p>
            </div>

            <div className="flex items-start gap-2.5 rounded-[var(--radius-card)] border border-border bg-surface p-3 shadow-card">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <p className="text-[11px] text-muted">
                <span className="text-foreground">Start simple.</span> Fill a few fields or import
                a document. Then refine details in Complete Mode.
              </p>
            </div>

            <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-card">
              <Label className="mb-1 block">DNA Status</Label>
              <p className="text-[13px] text-muted">
                {draft.promptDna
                  ? stale
                    ? "Fields changed since this was composed — recompose in Complete Mode."
                    : "Prompt DNA composed and up to date."
                  : "No DNA generated yet."}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setMode("complete")}
              className="flex items-center gap-3 rounded-[var(--radius-card)] border border-border bg-surface p-4 text-left shadow-card transition-colors hover:border-primary/40"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Fingerprint className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">Open Complete Mode</span>
                <span className="block text-[11px] text-muted">
                  Full control — Overview, Place & Materials, Atmosphere, and Color & Style.
                </span>
              </span>
            </button>
          </div>
        ) : (
        <div className="flex flex-col gap-6">
          <div
            role="tablist"
            aria-label="Location detail section"
            className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-elevated/40 p-1"
          >
            {(
              [
                ["overview", "Overview"],
                ["place", "Place & Materials"],
                ["atmosphere", "Atmosphere"],
                ["style", "Color & Style"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={section === id}
                onClick={() => setSection(id)}
                className={cn(
                  "shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  section === id
                    ? "bg-surface text-foreground shadow-sm"
                    : "text-muted hover:text-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <PromptDnaBlock
            anchorLabel="Establishing"
            anchor={draft.name || "location"}
            promptDna={draft.promptDna}
            consistencyRules={draft.consistencyRules}
            stale={stale}
            composeLabel="Compose Prompt DNA"
            onCompose={compose}
            onPromptDna={(v) => set("promptDna", v)}
            onRules={(v) => set("consistencyRules", v)}
          />

          {section === "overview" && (
            <Section icon={<Globe className="h-4 w-4 text-primary" />} title="Identity">
              <Field label="Description" full>
                <Textarea
                  value={draft.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="A rain-soaked alley behind a row of neon ramen bars…"
                  className="min-h-16"
                />
              </Field>
            </Section>
          )}

          {section === "place" && (
            <Section
              icon={<Building2 className="h-4 w-4 text-primary" />}
              title="Architecture & Materials"
            >
              <Field label="Architecture">
                <Input
                  value={draft.architecture}
                  onChange={(e) => set("architecture", e.target.value)}
                  placeholder="brutalist concrete, fire escapes"
                />
              </Field>
              <Field label="Materials">
                <Input
                  value={draft.materials}
                  onChange={(e) => set("materials", e.target.value)}
                  placeholder="wet asphalt, rusted steel, glass"
                />
              </Field>
              <Field label="Key props / set dressing" full>
                <Input
                  value={draft.keyProps}
                  onChange={(e) => set("keyProps", e.target.value)}
                  placeholder="neon signage, dumpsters, puddles, steam vents"
                />
              </Field>
            </Section>
          )}

          {section === "atmosphere" && (
            <Section icon={<CloudSun className="h-4 w-4 text-primary" />} title="Atmosphere">
              <Field label="Time of day">
                <Input
                  value={draft.timeOfDay}
                  onChange={(e) => set("timeOfDay", e.target.value)}
                  placeholder="night"
                />
              </Field>
              <Field label="Lighting style">
                <Input
                  value={draft.lightingStyle}
                  onChange={(e) => set("lightingStyle", e.target.value)}
                  placeholder="neon glow, high contrast, wet reflections"
                />
              </Field>
              <Field label="Mood" full>
                <Input
                  value={draft.mood}
                  onChange={(e) => set("mood", e.target.value)}
                  placeholder="gritty, lonely, cinematic"
                />
              </Field>
            </Section>
          )}

          {section === "style" && (
            <>
              <Section icon={<Palette className="h-4 w-4 text-primary" />} title="Color palette">
                <Field label="Palette (comma-separated)" full>
                  <PaletteField
                    value={draft.colorPalette}
                    onChange={(v) => set("colorPalette", v)}
                  />
                </Field>
              </Section>

              <Section
                icon={<ScrollText className="h-4 w-4 text-primary" />}
                title="World rules & style"
              >
                <Field label="Environment rules" full>
                  <Textarea
                    value={draft.environmentRules}
                    onChange={(e) => set("environmentRules", e.target.value)}
                    placeholder="What must stay consistent: signage language, layout, weather, era…"
                    className="min-h-16"
                  />
                </Field>
                <Field label="Style preset" full>
                  <DnaSelect value={draft.stylePreset} onChange={(v) => set("stylePreset", v)}>
                    <option value="">No style binding</option>
                    {STYLE_GROUPS.map((g) => (
                      <optgroup key={g.group} label={g.label}>
                        {presetsByGroup(g.group).map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </DnaSelect>
                  <p className="mt-1 text-[11px] text-muted">
                    {STYLE_PRESETS.length} looks across {STYLE_GROUPS.length} groups — Photoreal,
                    Anime, Painterly, Comic, 2D, 3D &amp; Rubberhose.
                  </p>
                </Field>
              </Section>
            </>
          )}
        </div>
        )}

        {mode === "complete" && (
          <div className="flex flex-col gap-2">
            <h2 className="mb-1 px-1 text-xs font-semibold uppercase tracking-wide text-muted">
              Quick Actions
            </h2>
            <QuickActionButton
              icon={
                quickBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Images className="h-4 w-4" />
                )
              }
              label="Generate Establishing Variations"
              disabled={quickBusy}
              onClick={generateEstablishingVariations}
            />
            <QuickActionButton
              icon={<RefreshCw className="h-4 w-4" />}
              label="Regenerate DNA"
              onClick={compose}
            />
            <QuickActionButton
              icon={draft.locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
              label={draft.locked ? "Identity Locked" : "Lock Identity"}
              active={draft.locked}
              onClick={() => set("locked", !draft.locked)}
            />
            <QuickActionButton
              icon={<Trash2 className="h-4 w-4" />}
              label="Delete Location"
              danger
              onClick={async () => {
                if (
                  await confirm({
                    title: `Delete "${draft.name}" from World Designer?`,
                    confirmLabel: "Delete",
                    destructive: true,
                  })
                )
                  remove.mutate();
              }}
            />
            {quickError && (
              <p className="mt-1 rounded-md border border-danger/30 bg-danger/10 p-2 text-[11px] text-danger">
                {quickError}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
