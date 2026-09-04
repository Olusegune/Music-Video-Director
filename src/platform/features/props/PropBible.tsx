import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Package,
  Plus,
  Sparkles,
  ArrowLeft,
  Trash2,
  Lock,
  Unlock,
  Boxes,
  Ruler,
  Palette,
  BookOpen,
  Car,
  Ghost,
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
import type { Prop } from "@/platform/lib/types";
import {
  composePropDna,
  draftPropFromLine,
  isPropDnaStale,
  newProp,
  PROP_CATEGORIES,
} from "@/platform/lib/propDna";
import { STYLE_GROUPS, presetsByGroup } from "@/platform/lib/styles";
import { ImageStudio } from "@/platform/features/imagestudio/ImageStudio";
import { SheetStudio } from "@/platform/features/sheets/SheetStudio";
import { propSheetSections, PROP_PROMPT_TAIL } from "@/platform/lib/assetSheet";
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
import { type GenerateOpts } from "@/platform/components/generation/GenerationPanel";
import { isChoreographyCategory } from "@/platform/lib/assets";
import { Button } from "@/platform/components/ui/button";
import { Input } from "@/platform/components/ui/input";
import { Textarea } from "@/platform/components/ui/textarea";
import { Label } from "@/platform/components/ui/label";
import { Badge } from "@/platform/components/ui/badge";
import { BibleCreationFlow } from "@/platform/features/dna/BibleCreationFlow";
import { BibleCardStage } from "@/platform/features/dna/BibleCardStage";
import { BibleProfileStage } from "@/platform/features/dna/BibleProfileStage";
import { enhanceBibleProfile, textProviderIsReady } from "@/platform/features/dna/bibleProfileAi";
import { BibleStageBadge } from "@/platform/features/dna/BibleStageBadge";
import { extractTextFromFile } from "@/platform/lib/docParse";
import { extractPropFields, PROP_IMPORT_FIELDS, type ImportedFields } from "@/platform/lib/smartImport";

function categoryIcon(cat: string) {
  if (cat === "Vehicle") return <Car className="h-3 w-3" />;
  if (cat === "Creature") return <Ghost className="h-3 w-3" />;
  return <Package className="h-3 w-3" />;
}

function PropProfile({ prop, onDone }: { prop: Prop; onDone: (saved: Prop | null) => void }) {
  const [draft, setDraft] = useState<Prop>(prop);
  const { data: keyStatuses = [] } = useQuery({
    queryKey: ["providerKeys"],
    queryFn: api.getProviderKeyStatuses,
  });
  const set = (key: string, value: string) =>
    setDraft((current) => ({ ...current, [key]: value }) as Prop);
  const canEnhance = textProviderIsReady(keyStatuses);
  return (
    <BibleProfileStage
      entityLabel="Prop"
      entityName={draft.name}
      portraitUrl={draft.heroUrl}
      sections={[
        {
          title: "Object",
          fields: [
            { key: "category", label: "Category", value: draft.category },
            { key: "condition", label: "Condition", value: draft.condition },
            { key: "materials", label: "Materials", value: draft.materials },
          ],
        },
        {
          title: "Story use",
          fields: [
            { key: "usage", label: "Usage", value: draft.usage, multiline: true },
            {
              key: "storySignificance",
              label: "Story significance",
              value: draft.storySignificance,
              multiline: true,
            },
            { key: "dimensions", label: "Dimensions", value: draft.dimensions },
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
                `Draft a concise production profile for the ${draft.category.toLowerCase()} ${draft.name}. Existing materials: ${draft.materials}. Existing condition: ${draft.condition}. Return only requested production fields.`,
                '{"condition":"string","materials":"string","usage":"string","storySignificance":"string","dimensions":"string"}',
                "musicvideo",
                draft.id,
                ["condition", "materials", "usage", "storySignificance", "dimensions"]
              )
          : undefined
      }
      enhanceHint={
        canEnhance
          ? undefined
          : "Add a configured Gemini key in API Keys to draft this prop profile."
      }
    />
  );
}

export function PropBible() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [coverageId, setCoverageId] = useState<string | null>(null);
  const [cardId, setCardId] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("All");

  const { data: allProps = [] } = useQuery({
    queryKey: ["props"],
    queryFn: api.listProps,
  });
  // Choreography output (pose sheets, formations) is stored in the Prop bible
  // for convenience but is NOT a prop — it belongs to Choreography and must
  // never surface on the Props & Vehicles page. Filtered out here at the source.
  const props = useMemo(
    () => allProps.filter((p) => !isChoreographyCategory(p.category)),
    [allProps]
  );

  const create = useMutation({
    mutationFn: (category: string) => {
      const p = newProp(
        "New " + (category === "All" ? "Prop" : category),
        category === "All" ? "Prop" : category
      );
      return api.saveProp(p).then(() => p);
    },
    onSuccess: (p) => {
      queryClient.invalidateQueries({ queryKey: ["props"] });
      setSelectedId(p.id);
    },
  });
  const createFromSpark = (value: string) => {
    const p = draftPropFromLine(value);
    void api.saveProp(p).then(() => {
      queryClient.setQueryData<Prop[]>(["props"], (current = []) => [
        p,
        ...current.filter((item) => item.id !== p.id),
      ]);
      // Visual-first, like the Character Bible: pick a card before the form.
      setCardId(p.id);
    });
  };

  const removeProp = useMutation({
    mutationFn: (id: string) => api.deleteProp(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["props"] }),
  });

  const cardProp = props.find((p) => p.id === cardId) ?? null;
  const profileProp = props.find((p) => p.id === profileId) ?? null;
  if (cardProp) {
    const dna = cardProp.promptDna.trim() || composePropDna(cardProp).promptDna;
    const prompt = `${cardProp.category}: ${cardProp.name}. ${dna}. Hero product render, three-quarter view, neutral studio background, high detail.`;
    return (
      <div className="flex h-full flex-col overflow-y-auto p-8">
        <BibleCardStage
          key={cardProp.id}
          entityLabel="Prop"
          entityName={cardProp.name}
          generateCandidate={() =>
            api.generateImageFromSpec({
              capability: "image",
              prompt,
              aspect: "1:1",
              moduleId: "musicvideo",
              projectRef: { moduleId: "musicvideo", entityId: cardProp.id },
            })
          }
          onChoose={(url) => {
            const next = { ...cardProp, heroUrl: url };
            api.saveProp(next).then(() => {
              queryClient.setQueryData<Prop[]>(["props"], (current = []) =>
                current.map((item) => (item.id === next.id ? next : item))
              );
              setCardId(null);
              setProfileId(next.id);
            });
          }}
          onSkip={() => {
            setCardId(null);
            setProfileId(cardProp.id);
          }}
        />
      </div>
    );
  }

  if (profileProp) {
    return (
      <div className="flex h-full flex-col overflow-y-auto p-8">
        <PropProfile
          key={profileProp.id}
          prop={profileProp}
          onDone={(saved) => {
            if (saved) {
              queryClient.setQueryData<Prop[]>(["props"], (current = []) =>
                current.map((item) => (item.id === saved.id ? saved : item))
              );
              void api.saveProp(saved);
            }
            setProfileId(null);
            setSelectedId(profileProp.id);
          }}
        />
      </div>
    );
  }

  const sheetProp = props.find((p) => p.id === sheetId) ?? null;
  if (sheetProp)
    return (
      <ImageStudio
        key={sheetProp.id}
        kind="prop"
        entity={sheetProp}
        entityName={sheetProp.name}
        onBack={() => setSheetId(null)}
      />
    );

  const coverageProp = props.find((p) => p.id === coverageId) ?? null;
  if (coverageProp) {
    const dna = coverageProp.promptDna.trim() || composePropDna(coverageProp).promptDna;
    return (
      <SheetStudio
        key={coverageProp.id}
        kind="prop"
        id={coverageProp.id}
        name={coverageProp.name}
        title={`${coverageProp.name} — Turnaround Sheet`}
        mediaSrc={coverageProp.heroUrl ?? ""}
        sections={propSheetSections(coverageProp)}
        promptTail={PROP_PROMPT_TAIL}
        composeDna={() => dna}
        generate={(id, prompt) =>
          api.generateImageFromSpec({
            capability: "image",
            prompt,
            aspect: "3:4",
            moduleId: "musicvideo",
            projectRef: { moduleId: "musicvideo", entityId: id },
          })
        }
        profile={[
          { label: "Materials", value: coverageProp.materials ?? "" },
          { label: "Condition", value: coverageProp.condition ?? "" },
        ]}
        palette={(coverageProp.colorPalette ?? []).map((hex) => ({ hex }))}
        locked={coverageProp.locked}
        onBack={() => setCoverageId(null)}
      />
    );
  }

  const selected = props.find((p) => p.id === selectedId) ?? null;
  if (selected)
    return (
      <PropSheet
        key={selected.id}
        prop={selected}
        onBack={() => setSelectedId(null)}
        onOpenSheet={() => setSheetId(selected.id)}
        onOpenCoverage={() => setCoverageId(selected.id)}
      />
    );

  const filtered = filter === "All" ? props : props.filter((p) => p.category === filter);
  const tabs = ["All", ...PROP_CATEGORIES];

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border px-8 py-5">
        <div>
          <h1 className="text-lg font-semibold">Props &amp; Vehicles</h1>
          <p className="text-xs text-muted">
            Design, refine, and preserve consistent props, vehicles, and creatures across every
            project.
          </p>
        </div>
        <Button onClick={() => create.mutate(filter)} disabled={create.isPending}>
          <Plus className="h-4 w-4" /> New {filter === "All" ? "Prop" : filter}
        </Button>
      </header>

      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-border px-8 py-2">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`shrink-0 rounded-full border px-3 py-1 text-xs transition-colors ${
              filter === t
                ? "border-primary bg-primary/12 text-foreground"
                : "border-border text-muted hover:bg-elevated/60"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="p-8">
        {filtered.length === 0 ? (
          <BibleCreationFlow
            entityLabel="Prop"
            onSpark={createFromSpark}
            onBlank={() => create.mutate("Prop")}
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filtered.map((p) => (
              <PropCard
                key={p.id}
                prop={p}
                onClick={() => setSelectedId(p.id)}
                onOpenCoverage={() => setCoverageId(p.id)}
                onDelete={() => {
                  if (confirm(`Delete "${p.name}" from Props & Vehicles?`)) removeProp.mutate(p.id);
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PropCard({
  prop,
  onClick,
  onDelete,
  onOpenCoverage,
}: {
  prop: Prop;
  onClick: () => void;
  onDelete: () => void;
  onOpenCoverage: () => void;
}) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick()}
      className="group relative cursor-pointer overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface text-left shadow-card transition-all hover:border-primary/40 hover:shadow-md"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-elevated">
        <AssetImage
          src={prop.heroUrl}
          alt={prop.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          fallback={
            <GradientFill id={prop.id} label={prop.name} className="h-full w-full text-2xl" />
          }
          label="Hero image"
        />
        <div className="absolute right-2 top-2 flex gap-1">
          <Badge variant="primary" className="gap-1">
            {categoryIcon(prop.category)} {prop.category}
          </Badge>
        </div>
        {prop.locked && (
          <div className="absolute left-2 top-2">
            <Badge variant="success" className="gap-1">
              <Lock className="h-3 w-3" /> Canon
            </Badge>
          </div>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Delete asset"
          aria-label="Delete asset"
          className="absolute bottom-2 left-2 flex h-7 w-7 items-center justify-center rounded-md bg-black/55 text-white/90 opacity-0 transition-opacity hover:bg-danger group-hover:opacity-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenCoverage();
          }}
          title="Turnaround Sheet"
          aria-label="Open turnaround sheet"
          className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-md bg-black/55 text-white/90 opacity-0 transition-opacity hover:bg-primary group-hover:opacity-100"
        >
          <Images className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="p-3">
        <div className="truncate text-sm font-semibold">{prop.name}</div>
        <div className="truncate text-xs text-muted">
          {prop.materials || prop.usage || "Undefined"}
        </div>
      </div>
    </div>
  );
}

function PropSheet({
  prop,
  onBack,
  onOpenSheet,
  onOpenCoverage,
}: {
  prop: Prop;
  onBack: () => void;
  onOpenSheet: () => void;
  onOpenCoverage: () => void;
}) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Prop>(prop);
  const [section, setSection] = useState<"overview" | "physical" | "usage" | "style">("overview");
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
      const fields = await extractPropFields(text, draft.id);
      if (Object.keys(fields).length === 0) {
        throw new Error("No prop fields could be confidently extracted from that document.");
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
    await api.saveProp(d);
    queryClient.invalidateQueries({ queryKey: ["props"] });
  });

  const set = <K extends keyof Prop>(key: K, value: Prop[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const stale = isPropDnaStale(draft);
  const compose = () => {
    const { promptDna, consistencyRules } = composePropDna(draft);
    setDraft((d) => ({ ...d, promptDna, consistencyRules }));
  };

  const remove = useMutation({
    mutationFn: () => api.deleteProp(draft.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["props"] });
      onBack();
    },
  });

  // Named prompt contributions rather than one flattened blob.
  const propLayers: PromptLayer[] = useMemo(
    () => bibleEntityLayers(draft, composePropDna(draft).promptDna, "Prop Bible"),
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

  const pickHero = (url: string) =>
    setDraft((d) => ({
      ...d,
      heroUrl: url,
      referenceImages: d.referenceImages.includes(url)
        ? d.referenceImages
        : [url, ...d.referenceImages].slice(0, 8),
    }));

  // --- Quick Actions rail ---------------------------------------------------
  const [quickBusy, setQuickBusy] = useState(false);
  const [quickError, setQuickError] = useState<string | null>(null);

  const generateHeroVariations = async () => {
    setQuickError(null);
    setQuickBusy(true);
    try {
      const base = draft.promptDna.trim() || composePropDna(draft).promptDna;
      const prompt = `${draft.category}: ${draft.name}. ${base}. Alternate angle, same object, hero product render, neutral studio background, high detail.`;
      const urls: string[] = [];
      for (let i = 0; i < 4; i++) {
        urls.push(
          await api.generateImageFromSpec({
            capability: "image",
            prompt,
            aspect: "1:1",
            batch: 1,
            moduleId: "props",
            projectRef: { moduleId: "props", entityId: draft.id },
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
          <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back to props">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Input
            value={draft.name}
            onChange={(e) => set("name", e.target.value)}
            aria-label="Prop name"
            className="h-9 w-64 text-base font-semibold"
          />
          <Badge variant="primary" className="gap-1">
            {categoryIcon(draft.category)} {draft.category}
          </Badge>
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
            aria-label="Prop workspace mode"
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
            fromKind="Prop"
            fromId={draft.id}
            name={draft.name}
            primaryImage={draft.heroUrl}
            refs={draft.referenceImages}
            onPropCategory={(c) => set("category", c)}
            onCrossMoved={onBack}
          />
          <Button onClick={onOpenSheet}>
            <LayoutGrid className="h-4 w-4" /> Prop Sheet
          </Button>
          <Button variant="secondary" onClick={onOpenCoverage}>
            <Images className="h-4 w-4" /> Turnaround Sheet
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => remove.mutate()}
            aria-label="Delete prop"
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
          fields={PROP_IMPORT_FIELDS}
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
            src={draft.heroUrl}
            references={draft.referenceImages}
            generating={false}
            aspect="aspect-square"
            isTauri={isTauri}
            initialPrompt=""
            contextLayers={propLayers}
            promptVariables={{ prop: draft.name }}
            historyScope={{ moduleId: "props", entityId: draft.id }}
            onGenerate={runGenerate}
            onPick={pickHero}
            pickLabel="Use as hero"
            defaultAspect="1:1"
          />
          <LockToggle
            locked={draft.locked}
            onToggle={() => set("locked", !draft.locked)}
            lockedTitle="Consistency locked"
            lockedHint="Canonical — reuse this design across every shot."
            unlockedHint="Lock to make this design canonical."
          />
        </div>

        {mode === "simple" ? (
          <div className="flex flex-col gap-4">
            <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-card">
              <h2 className="mb-3 text-sm font-semibold">Create Prop — Simple Mode</h2>
              <div className="grid grid-cols-1 gap-3">
                <Field label="Category">
                  <DnaSelect value={draft.category} onChange={(v) => set("category", v)}>
                    {PROP_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </DnaSelect>
                </Field>
                <Field label="How it's used" full>
                  <Textarea
                    value={draft.usage}
                    onChange={(e) => set("usage", e.target.value)}
                    placeholder="Carried by the hero; drawn in the duel scene…"
                    className="min-h-16"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Materials">
                    <Input
                      value={draft.materials}
                      onChange={(e) => set("materials", e.target.value)}
                      placeholder="weathered brass, oak grip"
                    />
                  </Field>
                  <Field label="Condition">
                    <Input
                      value={draft.condition}
                      onChange={(e) => set("condition", e.target.value)}
                      placeholder="battle-worn, scratched"
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
                    ["Physical", Ruler, draft.materials || draft.dimensions],
                    ["Usage", Boxes, draft.usage],
                    ["Color", Palette, draft.colorPalette.length > 0],
                  ] as const
                ).map(([label, Icon, filled]) => (
                  <div
                    key={label}
                    className="flex flex-col items-center gap-1 rounded-md border border-border bg-elevated/40 p-2"
                  >
                    <div className="relative aspect-square w-full overflow-hidden rounded-md bg-elevated">
                      <AssetImage
                        src={draft.heroUrl}
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
                Previews reuse the current hero image until distinct art is generated per category
                from the Prop Sheet.
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
                  Full control — Overview, Physical, Usage, and Color & Style.
                </span>
              </span>
            </button>
          </div>
        ) : (
        <div className="flex flex-col gap-6">
          <div
            role="tablist"
            aria-label="Prop detail section"
            className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-elevated/40 p-1"
          >
            {(
              [
                ["overview", "Overview"],
                ["physical", "Physical"],
                ["usage", "Usage"],
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
            anchorLabel="Subject"
            anchor={[draft.condition, draft.name].filter(Boolean).join(" ") || draft.name}
            promptDna={draft.promptDna}
            consistencyRules={draft.consistencyRules}
            stale={stale}
            composeLabel="Compose Prompt DNA"
            onCompose={compose}
            onPromptDna={(v) => set("promptDna", v)}
            onRules={(v) => set("consistencyRules", v)}
          />

          {section === "overview" && (
            <Section icon={<Package className="h-4 w-4 text-primary" />} title="Identity">
              <Field label="Category">
                <DnaSelect value={draft.category} onChange={(v) => set("category", v)}>
                  {PROP_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </DnaSelect>
              </Field>
              <Field label="Story significance">
                <Input
                  value={draft.storySignificance}
                  onChange={(e) => set("storySignificance", e.target.value)}
                  placeholder="heirloom; the MacGuffin"
                />
              </Field>
            </Section>
          )}

          {section === "physical" && (
            <Section icon={<Ruler className="h-4 w-4 text-primary" />} title="Physical">
              <Field label="Materials">
                <Input
                  value={draft.materials}
                  onChange={(e) => set("materials", e.target.value)}
                  placeholder="weathered brass, oak grip"
                />
              </Field>
              <Field label="Condition">
                <Input
                  value={draft.condition}
                  onChange={(e) => set("condition", e.target.value)}
                  placeholder="battle-worn, scratched"
                />
              </Field>
              <Field label="Dimensions / scale" full>
                <Input
                  value={draft.dimensions}
                  onChange={(e) => set("dimensions", e.target.value)}
                  placeholder="hand-sized; 30cm long"
                />
              </Field>
            </Section>
          )}

          {section === "usage" && (
            <Section icon={<Boxes className="h-4 w-4 text-primary" />} title="Usage">
              <Field label="How it's used" full>
                <Textarea
                  value={draft.usage}
                  onChange={(e) => set("usage", e.target.value)}
                  placeholder="Carried by the hero; drawn in the duel scene…"
                  className="min-h-16"
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

              <Section icon={<BookOpen className="h-4 w-4 text-primary" />} title="Style">
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
              label="Generate Hero Variations"
              disabled={quickBusy}
              onClick={generateHeroVariations}
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
              label="Delete Prop"
              danger
              onClick={() => {
                if (confirm(`Delete "${draft.name}" from Props & Vehicles?`)) remove.mutate();
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
