import { useEffect, useRef, useState } from "react";
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

export function CharacterBible() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetId, setSheetId] = useState<string | null>(null);
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

  const sheetChar = characters.find((c) => c.id === sheetId) ?? null;
  const selected = characters.find((c) => c.id === selectedId) ?? null;

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
          <h1 className="text-lg font-semibold">Character Bible</h1>
          <p className="text-xs text-muted">
            Your cast’s source of truth — define each character once, stay consistent in every shot.
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
                  create.mutate(draftCharacterFromLine(conjure));
              }}
              placeholder="Conjure from a line — “a grizzled bounty hunter with red hair…”"
              className="h-9 w-[26rem] max-w-[60vw] pl-8"
              aria-label="Conjure a character from a description"
            />
          </div>
          <Button
            variant="secondary"
            disabled={!conjure.trim() || create.isPending}
            onClick={() => create.mutate(draftCharacterFromLine(conjure))}
          >
            <Sparkles className="h-4 w-4" /> Conjure
          </Button>
          <Button onClick={() => create.mutate(newCharacter())} disabled={create.isPending}>
            <Plus className="h-4 w-4" /> New Character
          </Button>
        </div>
      </header>

      <div className="p-8">
        {characters.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-border py-20 text-center">
            <div className="grad-primary mb-3 flex h-12 w-12 items-center justify-center rounded-xl shadow-sm shadow-primary/30">
              <Users className="h-6 w-6 text-white" />
            </div>
            <p className="text-sm font-medium">Your cast starts here</p>
            <p className="mt-1 max-w-sm text-xs text-muted">
              Conjure a character from a single line, or start a blank DNA sheet. Everything you
              define becomes a reusable consistency anchor.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {characters.map((c) => (
              <CastCard
                key={c.id}
                character={c}
                onClick={() => setSelectedId(c.id)}
                onDelete={() => {
                  if (confirm(`Delete "${c.name}" from the Character Bible?`))
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

  const runGenerate = async (opts: GenerateOpts): Promise<string[]> => {
    const urls: string[] = [];
    for (let i = 0; i < opts.variations; i++) {
      const s = opts.seed !== undefined ? opts.seed + i : undefined;
      urls.push(
        await api.generateImagePro(
          opts.provider,
          opts.prompt,
          opts.width,
          opts.height,
          opts.references,
          s,
          opts.apiModel
        )
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

      <div className="grid flex-1 grid-cols-1 gap-6 p-8 lg:grid-cols-[20rem_1fr]">
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
            initialPrompt={draft.promptDna || composeCharacterDna(draft).promptDna}
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

          {draft.referenceImages.length > 0 && (
            <div>
              <Label className="mb-1.5 block">Visual references</Label>
              <div className="grid grid-cols-4 gap-2">
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
            </div>
          )}
        </div>

        {/* RIGHT — DNA fields */}
        <div className="flex flex-col gap-6">
          {/* Prompt DNA — the magic, kept up top */}
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

          <Section icon={<Drama className="h-4 w-4 text-primary" />} title="Personality">
            <Field label="Traits" full>
              <Input
                value={draft.traits}
                onChange={(e) => set("traits", e.target.value)}
                placeholder="grizzled, wary, dry-humored"
              />
            </Field>
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
        </div>
      </div>
    </div>
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
