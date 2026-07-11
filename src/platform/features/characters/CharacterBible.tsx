import { useEffect, useRef, useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Sparkles,
  Wand2,
  Lock,
  Unlock,
  Copy,
  Check,
  Trash2,
  ArrowLeft,
  Plus,
  Fingerprint,
  Eye,
  Shirt,
  Drama,
  Palette,
  LayoutGrid,
  BookOpen,
  Images,
  Shuffle,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { api, isTauri } from "@/platform/lib/ipc";
import type { Character } from "@/platform/lib/types";
import {
  composeCharacterDna,
  draftCharacterFromLine,
  identityAnchor,
  isDnaStale,
  newCharacter,
  CHARACTER_ROLES,
} from "@/platform/lib/characterDna";
import { STYLE_GROUPS, presetsByGroup } from "@/platform/lib/styles";
import type { PromptLayer } from "@/platform/lib/promptPipeline";
import { bibleEntityLayers } from "@/platform/lib/bibleLayers";
import { MoveAssetMenu } from "@/platform/features/dna/dnaKit";
import {
  GenerationPanel,
  type GenerateOpts,
} from "@/platform/components/generation/GenerationPanel";
import { ImageStudio } from "@/platform/features/imagestudio/ImageStudio";
import { AssetImage } from "@/platform/components/ui/asset-image";
import { cn } from "@/platform/lib/utils";
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

export function CharacterBible() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [cardId, setCardId] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [conjure, setConjure] = useState("");

  const { data: characters = [] } = useQuery({
    queryKey: ["characters"],
    queryFn: api.listCharacters,
  });

  const create = useMutation({
    mutationFn: (c: Character) => api.saveCharacter(c).then(() => c),
    onSuccess: (c) => {
      queryClient.invalidateQueries({ queryKey: ["characters"] });
      setSelectedId(c.id);
      setConjure("");
    },
  });

  const removeChar = useMutation({
    mutationFn: (id: string) => api.deleteCharacter(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["characters"] }),
  });

  const createFromDescription = () =>
    create.mutate(draftCharacterFromLine(conjure), {
      onSuccess: (character) => {
        queryClient.setQueryData<Character[]>(["characters"], (current = []) => [
          character,
          ...current.filter((item) => item.id !== character.id),
        ]);
        setConjure("");
        setCardId(character.id);
      },
    });

  const sheetChar = characters.find((c) => c.id === sheetId) ?? null;
  const cardChar = characters.find((c) => c.id === cardId) ?? null;
  const profileChar = characters.find((c) => c.id === profileId) ?? null;
  const selected = characters.find((c) => c.id === selectedId) ?? null;

  if (cardChar) {
    const anchor = identityAnchor(cardChar);
    const dna = cardChar.promptDna.trim() || composeCharacterDna(cardChar).promptDna;
    const portraitPrompt = `Subject: ${anchor}. ${dna}. Head-and-shoulders character portrait, expressive, neutral studio background, cinematic lighting, high detail.`;
    return (
      <div className="flex h-full flex-col overflow-y-auto p-8">
        <BibleCardStage
          key={cardChar.id}
          entityLabel="Character"
          entityName={cardChar.name}
          generateCandidate={() => api.generateCharacterPortrait(cardChar.id, portraitPrompt)}
          onChoose={(url) => {
            const next = { ...cardChar, portraitUrl: url };
            api.saveCharacter(next).then(() => {
              queryClient.setQueryData<Character[]>(["characters"], (current = []) =>
                current.map((item) => (item.id === next.id ? next : item))
              );
              setCardId(null);
              setProfileId(next.id);
            });
          }}
          onSkip={() => {
            setCardId(null);
            setSelectedId(cardChar.id);
          }}
        />
      </div>
    );
  }

  if (profileChar) {
    return (
      <div className="flex h-full flex-col overflow-y-auto p-8">
        <CharacterProfile
          key={profileChar.id}
          character={profileChar}
          onDone={(saved) => {
            if (saved) {
              queryClient.setQueryData<Character[]>(["characters"], (current = []) =>
                current.map((item) => (item.id === saved.id ? saved : item))
              );
              void api.saveCharacter(saved);
            }
            setProfileId(null);
            setSelectedId(profileChar.id);
          }}
        />
      </div>
    );
  }

  if (sheetChar) {
    return (
      <ImageStudio
        key={sheetChar.id}
        kind="character"
        entity={sheetChar}
        entityName={sheetChar.name}
        onBack={() => setSheetId(null)}
      />
    );
  }

  if (selected) {
    return (
      <CharacterSheet
        key={selected.id}
        character={selected}
        onBack={() => setSelectedId(null)}
        onOpenSheet={() => setSheetId(selected.id)}
      />
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border px-8 py-5">
        <div>
          <h1 className="text-lg font-semibold">Character Designer</h1>
          <p className="text-xs text-muted">
            Create, refine, and preserve consistent characters across every project.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Wand2 className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-accent" />
            <Input
              value={conjure}
              onChange={(e) => setConjure(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && conjure.trim()) createFromDescription();
              }}
              placeholder="Create from a description — “a grizzled bounty hunter with red hair…”"
              className="h-9 w-[26rem] max-w-[60vw] pl-8"
              aria-label="Create character from a description"
            />
          </div>
          <Button
            variant="secondary"
            disabled={!conjure.trim() || create.isPending}
            title="Create Character From Description"
            onClick={createFromDescription}
          >
            <Sparkles className="h-4 w-4" /> Create from description
          </Button>
          <Button onClick={() => create.mutate(newCharacter())} disabled={create.isPending}>
            <Plus className="h-4 w-4" /> New Character
          </Button>
        </div>
      </header>

      <div className="p-8">
        {characters.length === 0 ? (
          <BibleCreationFlow
            entityLabel="Character"
            onSpark={(value) =>
              create.mutate(draftCharacterFromLine(value), {
                onSuccess: (character) => {
                  queryClient.setQueryData<Character[]>(["characters"], (current = []) => [
                    character,
                    ...current.filter((item) => item.id !== character.id),
                  ]);
                  // The next interaction is visual: pick a portrait candidate
                  // before exposing the long DNA form.
                  setCardId(character.id);
                },
              })
            }
            onBlank={() => create.mutate(newCharacter())}
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {characters.map((c) => (
              <CastCard
                key={c.id}
                character={c}
                onClick={() => setSelectedId(c.id)}
                onDelete={() => {
                  if (confirm(`Delete "${c.name}" from Character Designer?`))
                    removeChar.mutate(c.id);
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// --- gradient avatar fallback ----------------------------------------------

/** The Profile stage bound to a Character: local edits, saved on continue. */
function CharacterProfile({
  character,
  onDone,
}: {
  character: Character;
  onDone: (saved: Character | null) => void;
}) {
  const [draft, setDraft] = useState<Character>(character);
  const { data: keyStatuses = [] } = useQuery({
    queryKey: ["providerKeys"],
    queryFn: api.getProviderKeyStatuses,
  });
  const canEnhance = textProviderIsReady(keyStatuses);
  const set = (key: string, value: string) =>
    setDraft((d) => ({ ...d, [key]: value }) as Character);

  const sections = [
    {
      title: "Identity",
      fields: [
        { key: "role", label: "Role", value: draft.role },
        { key: "occupation", label: "Occupation", value: draft.occupation },
        { key: "age", label: "Age", value: draft.age },
        { key: "gender", label: "Gender", value: draft.gender },
      ],
    },
    {
      title: "Personality",
      fields: [
        { key: "traits", label: "Traits", value: draft.traits, multiline: true },
        { key: "motivations", label: "Motivations", value: draft.motivations },
        { key: "fears", label: "Fears", value: draft.fears },
        { key: "goals", label: "Goals", value: draft.goals },
      ],
    },
  ];

  return (
    <BibleProfileStage
      entityLabel="Character"
      entityName={draft.name}
      portraitUrl={draft.portraitUrl}
      sections={sections}
      onField={set}
      onContinue={() => onDone(draft)}
      onSkip={() => onDone(null)}
      onEnhance={
        canEnhance
          ? () =>
              enhanceBibleProfile(
                `Draft a concise, cinematic character profile for ${draft.name}. Existing role: ${draft.role}. Existing occupation: ${draft.occupation}. Keep continuity with these traits: ${draft.traits}. Fill only the requested fields.`,
                '{"traits":"string","motivations":"string","fears":"string","goals":"string"}',
                "musicvideo",
                draft.id,
                ["traits", "motivations", "fears", "goals"]
              )
          : undefined
      }
      enhanceHint={
        canEnhance
          ? undefined
          : "Add a configured Gemini key in API Keys to draft personality automatically."
      }
    />
  );
}

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "?"
  );
}

/** Deterministic hue from the id so each character keeps a stable accent. */
function hueFor(id: string): number {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

function PortraitFallback({ character, className }: { character: Character; className?: string }) {
  const h = hueFor(character.id);
  return (
    <div
      className={cn("flex items-center justify-center font-semibold text-white/90", className)}
      style={{
        background: `linear-gradient(135deg, hsl(${h} 55% 42%), hsl(${(h + 40) % 360} 60% 30%))`,
      }}
      aria-hidden
    >
      {initials(character.name)}
    </div>
  );
}

function CastCard({
  character,
  onClick,
  onDelete,
}: {
  character: Character;
  onClick: () => void;
  onDelete: () => void;
}) {
  const subtitle =
    [character.role, character.occupation].filter(Boolean).join(" · ") || "Undefined role";
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick()}
      className="group relative cursor-pointer overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface text-left shadow-card transition-all hover:border-primary/40 hover:shadow-md"
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-elevated">
        <AssetImage
          src={character.portraitUrl}
          alt={character.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          fallback={<PortraitFallback character={character} className="h-full w-full text-3xl" />}
          label="Portrait"
        />
        <div className="absolute right-2 top-2">
          {character.locked ? (
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
          title="Delete character"
          aria-label="Delete character"
          className="absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-md bg-black/55 text-white/90 opacity-0 transition-opacity hover:bg-danger group-hover:opacity-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="p-3">
        <div className="truncate text-sm font-semibold">{character.name}</div>
        <div className="truncate text-xs text-muted">{subtitle}</div>
      </div>
    </div>
  );
}

// --- the DNA sheet ---------------------------------------------------------

function CharacterSheet({
  character,
  onBack,
  onOpenSheet,
}: {
  character: Character;
  onBack: () => void;
  onOpenSheet: () => void;
}) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Character>(character);
  const [savedTick, setSavedTick] = useState(false);
  const [section, setSection] = useState<
    | "overview"
    | "appearance"
    | "wardrobe"
    | "personality"
    | "background"
    | "references"
    | "dna"
    | "advanced"
  >("overview");
  const [mode, setMode] = useState<"simple" | "complete">("simple");
  const firstRun = useRef(true);

  // Debounced autosave — the sheet always persists itself.
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const t = setTimeout(async () => {
      await api.saveCharacter(draft);
      queryClient.invalidateQueries({ queryKey: ["characters"] });
      setSavedTick(true);
      setTimeout(() => setSavedTick(false), 1400);
    }, 600);
    return () => clearTimeout(t);
  }, [draft, queryClient]);

  const set = <K extends keyof Character>(key: K, value: Character[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const stale = isDnaStale(draft);

  const compose = () => {
    const { promptDna, consistencyRules } = composeCharacterDna(draft);
    setDraft((d) => ({ ...d, promptDna, consistencyRules }));
  };

  const remove = useMutation({
    mutationFn: () => api.deleteCharacter(draft.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["characters"] });
      onBack();
    },
  });

  // The portrait prompt as named contributions rather than one blob.
  const portraitLayers: PromptLayer[] = useMemo(
    () => bibleEntityLayers(draft, composeCharacterDna(draft).promptDna, "Character Bible"),
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

  const pickPortrait = (url: string) =>
    setDraft((d) => ({
      ...d,
      portraitUrl: url,
      referenceImages: d.referenceImages.includes(url)
        ? d.referenceImages
        : [url, ...d.referenceImages].slice(0, 8),
    }));

  // --- Quick Actions rail ---------------------------------------------------
  const [quickBusy, setQuickBusy] = useState<"portrait" | "outfit" | null>(null);
  const [quickError, setQuickError] = useState<string | null>(null);

  const addReferences = (urls: string[]) =>
    setDraft((d) => ({
      ...d,
      referenceImages: [...urls.filter((u) => !d.referenceImages.includes(u)), ...d.referenceImages].slice(
        0,
        8
      ),
    }));

  const generateVariations = async (kind: "portrait" | "outfit") => {
    setQuickError(null);
    setQuickBusy(kind);
    try {
      const base = draft.promptDna.trim() || composeCharacterDna(draft).promptDna;
      const anchor = identityAnchor(draft);
      const prompt =
        kind === "portrait"
          ? `Subject: ${anchor}. ${base}. Head-and-shoulders character portrait, alternate expression and angle, same identity, cinematic lighting, high detail.`
          : `Subject: ${anchor}. ${base}. Full-body character shot wearing a different outfit variation consistent with their style, same face and identity, cinematic lighting, high detail.`;
      const urls: string[] = [];
      for (let i = 0; i < 4; i++) {
        urls.push(
          await api.generateImageFromSpec({
            capability: "image",
            prompt,
            aspect: kind === "portrait" ? "4:5" : "2:3",
            batch: 1,
            moduleId: "characters",
            projectRef: { moduleId: "characters", entityId: draft.id },
          })
        );
      }
      addReferences(urls);
    } catch (e) {
      setQuickError(e instanceof Error ? e.message : String(e));
    } finally {
      setQuickBusy(null);
    }
  };

  const [copied, setCopied] = useState(false);
  const copyDna = async () => {
    try {
      await navigator.clipboard.writeText(draft.promptDna);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard blocked — ignore */
    }
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <header className="flex items-center justify-between gap-3 border-b border-border px-8 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back to cast">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Input
            value={draft.name}
            onChange={(e) => set("name", e.target.value)}
            aria-label="Character name"
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
            aria-label="Character workspace mode"
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
          <span
            className={cn(
              "flex items-center gap-1 text-xs text-success transition-opacity",
              savedTick ? "opacity-100" : "opacity-0"
            )}
          >
            <Check className="h-3.5 w-3.5" /> Saved
          </span>
          <MoveAssetMenu
            fromKind="Character"
            fromId={draft.id}
            name={draft.name}
            primaryImage={draft.portraitUrl}
            refs={draft.referenceImages}
            onCrossMoved={onBack}
          />
          <Button onClick={onOpenSheet}>
            <LayoutGrid className="h-4 w-4" /> Character Sheet
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => remove.mutate()}
            aria-label="Delete character"
            className="text-muted hover:text-danger"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div
        className={cn(
          "grid flex-1 grid-cols-1 gap-6 p-8",
          mode === "complete" ? "lg:grid-cols-[20rem_1fr_15rem]" : "lg:grid-cols-[20rem_1fr]"
        )}
      >
        {/* LEFT — portrait, lock, references */}
        <div className="flex flex-col gap-4">
          <div className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface shadow-card">
            <div className="relative aspect-[4/5] w-full bg-elevated">
              <AssetImage
                src={draft.portraitUrl}
                alt={draft.name}
                className="h-full w-full object-cover"
                fallback={<PortraitFallback character={draft} className="h-full w-full text-5xl" />}
                label="Portrait"
              />
            </div>
          </div>

          <GenerationPanel
            title="Generate portrait"
            initialPrompt=""
            contextLayers={portraitLayers}
            promptVariables={{ character: draft.name, role: draft.role }}
            historyScope={{ moduleId: "characters", entityId: draft.id }}
            defaultAspect="4:5"
            references={draft.referenceImages}
            onGenerate={runGenerate}
            onPick={pickPortrait}
            pickLabel="Use as portrait"
          />
          {!isTauri && (
            <p className="text-center text-[11px] text-muted">
              Browser preview uses a placeholder. The desktop app renders from your chosen image
              provider.
            </p>
          )}

          {/* Consistency Lock */}
          <button
            onClick={() => set("locked", !draft.locked)}
            className={cn(
              "flex items-center gap-3 rounded-[var(--radius-card)] border px-3 py-2.5 text-left transition-colors",
              draft.locked
                ? "border-success/40 bg-success/10"
                : "border-border bg-surface hover:border-primary/40"
            )}
          >
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                draft.locked ? "bg-success/20 text-success" : "bg-elevated text-muted"
              )}
            >
              {draft.locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium">
                {draft.locked ? "Consistency locked" : "Consistency unlocked"}
              </span>
              <span className="block text-[11px] text-muted">
                {draft.locked
                  ? "Canonical — reuse this DNA across every shot."
                  : "Lock to make this character canonical."}
              </span>
            </span>
          </button>
        </div>

        {/* RIGHT — Simple Mode (minimal fields) or Complete Mode (full tabbed workspace) */}
        {mode === "simple" ? (
          <div className="flex flex-col gap-4">
            <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-card">
              <h2 className="mb-3 text-sm font-semibold">Create Character — Simple Mode</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Role">
                  <Select value={draft.role} onChange={(v) => set("role", v)}>
                    <option value="">—</option>
                    {CHARACTER_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Occupation">
                  <Input
                    value={draft.occupation}
                    onChange={(e) => set("occupation", e.target.value)}
                    placeholder="bounty hunter"
                  />
                </Field>
                <Field label="Age">
                  <Input
                    value={draft.age}
                    onChange={(e) => set("age", e.target.value)}
                    placeholder="40s / Elderly"
                  />
                </Field>
                <Field label="Gender">
                  <Input
                    value={draft.gender}
                    onChange={(e) => set("gender", e.target.value)}
                    placeholder="Female"
                  />
                </Field>
                <Field label="Short description" full>
                  <Textarea
                    value={draft.traits}
                    onChange={(e) => set("traits", e.target.value)}
                    placeholder="Confident, intelligent, charismatic leader…"
                    className="min-h-16"
                  />
                </Field>
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
                  Full control — Overview, Appearance, Wardrobe, Personality, Background,
                  References, DNA &amp; Consistency, and Advanced.
                </span>
              </span>
            </button>
          </div>
        ) : (
        <div className="flex flex-col gap-6">
          <div
            role="tablist"
            aria-label="Character detail section"
            className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-elevated/40 p-1"
          >
            {(
              [
                ["overview", "Overview"],
                ["appearance", "Appearance"],
                ["wardrobe", "Wardrobe"],
                ["personality", "Personality"],
                ["background", "Background"],
                ["references", "References"],
                ["dna", "DNA & Consistency"],
                ["advanced", "Advanced"],
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

          {section === "overview" && (
            <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-card">
              <div className="mb-1 flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">{draft.name || "Untitled character"}</h2>
                {draft.role && <Badge variant="primary">{draft.role}</Badge>}
              </div>
              <p className="text-[13px] leading-relaxed text-muted">
                {[draft.occupation, draft.age, draft.gender].filter(Boolean).join(" · ") ||
                  "No description yet — fill in Identity under Advanced."}
              </p>
              {draft.traits && (
                <div className="mt-3">
                  <Label className="mb-1 block">Personality</Label>
                  <p className="text-[13px] text-foreground">{draft.traits}</p>
                </div>
              )}
              {draft.primaryOutfit && (
                <div className="mt-3">
                  <Label className="mb-1 block">Primary wardrobe</Label>
                  <p className="text-[13px] text-foreground">{draft.primaryOutfit}</p>
                </div>
              )}
              <div className="mt-3">
                <Label className="mb-1 block">Visual style</Label>
                <p className="text-[13px] text-foreground">
                  {draft.stylePreset || "No style binding"}
                </p>
              </div>
              <Button
                variant="secondary"
                className="mt-4 w-full"
                onClick={() => setSection("advanced")}
              >
                <Fingerprint className="h-4 w-4" /> Edit Character
              </Button>
            </div>
          )}

          {section === "appearance" && (
            <Section icon={<Eye className="h-4 w-4 text-primary" />} title="Appearance">
              <Field label="Face shape">
                <Input
                  value={draft.faceShape}
                  onChange={(e) => set("faceShape", e.target.value)}
                  placeholder="angular, square jaw"
                />
              </Field>
              <Field label="Skin tone">
                <Input
                  value={draft.skinTone}
                  onChange={(e) => set("skinTone", e.target.value)}
                  placeholder="warm olive"
                />
              </Field>
              <Field label="Eye shape">
                <Input
                  value={draft.eyeShape}
                  onChange={(e) => set("eyeShape", e.target.value)}
                  placeholder="almond"
                />
              </Field>
              <Field label="Eye color">
                <Input
                  value={draft.eyeColor}
                  onChange={(e) => set("eyeColor", e.target.value)}
                  placeholder="amber"
                />
              </Field>
              <Field label="Hair style">
                <Input
                  value={draft.hairStyle}
                  onChange={(e) => set("hairStyle", e.target.value)}
                  placeholder="shaved sides, long top"
                />
              </Field>
              <Field label="Hair color">
                <Input
                  value={draft.hairColor}
                  onChange={(e) => set("hairColor", e.target.value)}
                  placeholder="auburn"
                />
              </Field>
              <Field label="Body type">
                <Input
                  value={draft.bodyType}
                  onChange={(e) => set("bodyType", e.target.value)}
                  placeholder="lean, athletic"
                />
              </Field>
              <Field label="Distinguishing features">
                <Input
                  value={draft.distinguishingFeatures}
                  onChange={(e) => set("distinguishingFeatures", e.target.value)}
                  placeholder="scar over left brow"
                />
              </Field>
            </Section>
          )}

          {section === "wardrobe" && (
            <Section icon={<Shirt className="h-4 w-4 text-primary" />} title="Wardrobe">
              <Field label="Primary outfit" full>
                <Input
                  value={draft.primaryOutfit}
                  onChange={(e) => set("primaryOutfit", e.target.value)}
                  placeholder="weathered leather duster over dark fatigues"
                />
              </Field>
              <Field label="Secondary outfit" full>
                <Input
                  value={draft.secondaryOutfit}
                  onChange={(e) => set("secondaryOutfit", e.target.value)}
                  placeholder="formal wear for the gala scene"
                />
              </Field>
              <Field label="Accessories" full>
                <Input
                  value={draft.accessories}
                  onChange={(e) => set("accessories", e.target.value)}
                  placeholder="fingerless gloves, dog tags, holstered blaster"
                />
              </Field>
            </Section>
          )}

          {section === "personality" && (
            <Section icon={<Drama className="h-4 w-4 text-primary" />} title="Personality">
              <Field label="Traits" full>
                <Input
                  value={draft.traits}
                  onChange={(e) => set("traits", e.target.value)}
                  placeholder="grizzled, wary, dry-humored"
                />
              </Field>
            </Section>
          )}

          {section === "background" && (
            <Section icon={<BookOpen className="h-4 w-4 text-primary" />} title="Background">
              <Field label="Motivations" full>
                <Textarea
                  value={draft.motivations}
                  onChange={(e) => set("motivations", e.target.value)}
                  placeholder="What drives them?"
                  className="min-h-16"
                />
              </Field>
              <Field label="Fears" full>
                <Textarea
                  value={draft.fears}
                  onChange={(e) => set("fears", e.target.value)}
                  placeholder="What do they avoid?"
                  className="min-h-16"
                />
              </Field>
              <Field label="Goals" full>
                <Textarea
                  value={draft.goals}
                  onChange={(e) => set("goals", e.target.value)}
                  placeholder="What are they after?"
                  className="min-h-16"
                />
              </Field>
            </Section>
          )}

          {section === "references" && (
            <div className="flex flex-col gap-4">
              <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-card">
                <div className="mb-2 flex items-center gap-2">
                  <Images className="h-4 w-4 text-primary" />
                  <Label className="!mb-0">
                    Reference images
                    {draft.referenceImages.length > 0 && ` (${draft.referenceImages.length})`}
                  </Label>
                </div>
                {draft.referenceImages.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {draft.referenceImages.map((src, i) => (
                      <AssetImage
                        key={i}
                        src={src}
                        alt={`Reference ${i + 1}`}
                        className="aspect-square w-full rounded-md border border-border object-cover"
                        label="Reference"
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-[13px] text-muted">
                    No reference images yet. Generate a portrait, or add references from the
                    Production Library.
                  </p>
                )}
              </div>
              <button
                onClick={onOpenSheet}
                className="flex items-center gap-3 rounded-[var(--radius-card)] border border-border bg-surface p-4 text-left shadow-card transition-colors hover:border-primary/40"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <LayoutGrid className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">Open Character Sheet</span>
                  <span className="block text-[11px] text-muted">
                    Generate a full production board — turnaround, expressions, poses, wardrobe, and
                    color palette in one composed sheet.
                  </span>
                </span>
              </button>
            </div>
          )}

          {section === "dna" && (
            <div className="rounded-[var(--radius-card)] border border-primary/30 bg-primary/[0.04] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Fingerprint className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-semibold">Prompt DNA</h2>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant={stale ? "primary" : "secondary"} onClick={compose}>
                    <Sparkles className="h-4 w-4" />
                    {draft.promptDna ? "Recompose" : "Compose Prompt DNA"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={copyDna}
                    disabled={!draft.promptDna}
                    aria-label="Copy Prompt DNA"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <p className="mt-1 text-[11px] text-muted">
                Identity anchor: <span className="text-foreground">{identityAnchor(draft)}</span>
              </p>
              {stale && draft.promptDna && (
                <p className="mt-1 text-[11px] text-warning">
                  Fields changed since this was composed — recompose to refresh.
                </p>
              )}
              <Textarea
                value={draft.promptDna}
                onChange={(e) => set("promptDna", e.target.value)}
                placeholder="Fill in the fields below, then Compose — or write your own anchor prompt here."
                className="mt-2 min-h-24 font-mono text-[13px] leading-relaxed"
              />
              <Label className="mb-1 mt-3 block">Consistency rules</Label>
              <Textarea
                value={draft.consistencyRules}
                onChange={(e) => set("consistencyRules", e.target.value)}
                placeholder="Lock rules + negatives that keep this character on-model."
                className="min-h-20 font-mono text-[13px] leading-relaxed"
              />
            </div>
          )}

          {section === "advanced" && (
            <>
              <Section icon={<Users className="h-4 w-4 text-primary" />} title="Identity">
                <Field label="Role">
                  <Select value={draft.role} onChange={(v) => set("role", v)}>
                    <option value="">—</option>
                    {CHARACTER_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Occupation">
                  <Input
                    value={draft.occupation}
                    onChange={(e) => set("occupation", e.target.value)}
                    placeholder="bounty hunter"
                  />
                </Field>
                <Field label="Age">
                  <Input
                    value={draft.age}
                    onChange={(e) => set("age", e.target.value)}
                    placeholder="40s / Elderly"
                  />
                </Field>
                <Field label="Gender">
                  <Input
                    value={draft.gender}
                    onChange={(e) => set("gender", e.target.value)}
                    placeholder="Female"
                  />
                </Field>
              </Section>

              <Section icon={<Palette className="h-4 w-4 text-primary" />} title="Visual style">
                <Field label="Style preset" full>
                  <Select value={draft.stylePreset} onChange={(v) => set("stylePreset", v)}>
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
                  </Select>
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
                quickBusy === "portrait" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Images className="h-4 w-4" />
                )
              }
              label="Generate Portrait Variations"
              disabled={quickBusy !== null}
              onClick={() => generateVariations("portrait")}
            />
            <QuickActionButton
              icon={
                quickBusy === "outfit" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Shuffle className="h-4 w-4" />
                )
              }
              label="Generate Outfit Variations"
              disabled={quickBusy !== null}
              onClick={() => generateVariations("outfit")}
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
              label="Delete Character"
              danger
              onClick={() => {
                if (confirm(`Delete "${draft.name}" from Character Designer?`)) remove.mutate();
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

function QuickActionButton({
  icon,
  label,
  onClick,
  disabled,
  active,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center gap-2.5 rounded-[var(--radius-card)] border px-3 py-2.5 text-left text-sm font-medium shadow-card transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        danger
          ? "border-border bg-surface text-danger hover:border-danger/40 hover:bg-danger/10"
          : active
            ? "border-success/40 bg-success/10 text-success"
            : "border-border bg-surface text-foreground hover:border-primary/40"
      )}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
}

// --- small layout helpers --------------------------------------------------

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-card">
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function Field({
  label,
  full,
  children,
}: {
  label: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", full && "sm:col-span-2")}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Select({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 w-full rounded-[var(--radius-input)] border border-border bg-surface px-3 text-sm text-foreground transition-colors focus-visible:border-primary focus-visible:outline-none"
    >
      {children}
    </select>
  );
}
