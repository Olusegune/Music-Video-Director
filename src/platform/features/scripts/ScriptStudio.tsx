import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  Upload,
  Sparkles,
  Wand2,
  Plus,
  Users,
  MapPin,
  Package,
  Car,
  Ghost,
  Clapperboard,
  Check,
  Loader2,
  Trash2,
} from "lucide-react";
import { api } from "@/platform/lib/ipc";
import type { Character } from "@/platform/lib/types";
import {
  analyzeScript,
  extractedToCharacter,
  type ExtractedCharacter,
  type ExtractedEntity,
  type ScriptAnalysis,
} from "@/platform/lib/scriptAnalysis";
import { environmentFromLocation } from "@/platform/lib/environmentDna";
import { propFromEntity } from "@/platform/lib/propDna";
import {
  loadScripts,
  saveScript,
  deleteScript,
  newScript,
  type ScriptDoc,
} from "@/platform/lib/scriptStore";
import { extractTextFromFile, ACCEPT_ATTR } from "@/platform/lib/docParse";
import { useAppStore } from "@/platform/store/useAppStore";
import { cn } from "@/platform/lib/utils";
import { Button } from "@/platform/components/ui/button";
import { Input } from "@/platform/components/ui/input";
import { Badge } from "@/platform/components/ui/badge";
import { CreativeEmptyState } from "@/platform/components/ui/creative-empty-state";
import { ModuleHeader } from "@/platform/components/visual";
import { newPerformer, savePerformer } from "@/apps/music-video/lib/cast";

const SAMPLE = `INT. RAIN-SOAKED ALLEY - NIGHT

Neon signs bleed across the wet pavement. KIRA VANCE (40s), a grizzled
bounty hunter with a long leather coat and a scar over one eye, stalks
through the shadows, pistol drawn.

KIRA
You can't hide forever, Marek.

A figure steps from the smoke. MAREK (50s), elegant and cruel, a silver
revolver glinting at his side.

MAREK
And yet here we are, old friend.

EXT. HARBOR DOCKS - DAWN

A rusted freighter looms. Kira and her partner JONAH (20s, nervous,
quick-witted) crouch behind crates.

JONAH
That's a lot of guards for an empty ship.

KIRA
Empty ships don't need guards.`;

export function ScriptStudio() {
  const queryClient = useQueryClient();
  const openCharacters = useAppStore((s) => s.openCharacters);
  const openCast = useAppStore((s) => s.openCast);
  const studioMode = useAppStore((s) => s.studioMode);
  const setStudioMode = useAppStore((s) => s.setStudioMode);
  const activeSongId = useAppStore((s) => s.activeSongId);

  const [doc, setDoc] = useState<ScriptDoc>(() => loadScripts()[0] ?? newScript());
  const [recent, setRecent] = useState<ScriptDoc[]>(() => loadScripts());
  const [importing, setImporting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const firstRun = useRef(true);

  const { data: characters = [] } = useQuery({
    queryKey: ["characters"],
    queryFn: api.listCharacters,
  });
  const { data: environments = [] } = useQuery({
    queryKey: ["environments"],
    queryFn: api.listEnvironments,
  });
  const { data: propsList = [] } = useQuery({
    queryKey: ["props"],
    queryFn: api.listProps,
  });
  const existingNames = new Set(characters.map((c) => c.name.toLowerCase()));
  const existingEnvNames = new Set(environments.map((e) => e.name.toLowerCase()));
  const existingPropNames = new Set(propsList.map((p) => p.name.toLowerCase()));

  // Debounced autosave of the working script.
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const t = setTimeout(() => {
      const saved = saveScript(doc);
      setRecent(loadScripts());
      setDoc((d) => (d.id === saved.id ? { ...d, updatedAt: saved.updatedAt } : d));
    }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.title, doc.content, doc.analysis]);

  const importFile = async (file: File) => {
    setImporting(true);
    setNotice(null);
    try {
      const { text, warning } = await extractTextFromFile(file);
      const ext = file.name.includes(".")
        ? file.name.slice(file.name.lastIndexOf(".") + 1).toLowerCase()
        : "txt";
      setDoc((d) => ({
        ...d,
        title: file.name.replace(/\.[^.]+$/, ""),
        content: text,
        format: ext,
        analysis: null,
      }));
      if (warning) setNotice(warning);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Could not read that file.");
    } finally {
      setImporting(false);
    }
  };

  const analyze = async () => {
    if (!doc.content.trim()) return;
    setAnalyzing(true);
    // Yield a frame so the spinner paints before the (sync) parse.
    await new Promise((r) => setTimeout(r, 30));
    const analysis = analyzeScript(doc.content);
    setDoc((d) => ({ ...d, analysis }));
    setAnalyzing(false);
  };

  const addCharacter = useMutation({
    mutationFn: (ec: ExtractedCharacter) => api.saveCharacter(extractedToCharacter(ec)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["characters"] }),
  });

  const sendToCast = useMutation({
    mutationFn: async (ec: ExtractedCharacter) => {
      const character = extractedToCharacter(ec);
      await api.saveCharacter(character);
      const performer = newPerformer("Actor");
      savePerformer({
        ...performer,
        name: ec.name,
        role: "Actor",
        characterId: character.id,
        performanceNotes: ec.descriptionLine || `Imported from Script Studio: ${doc.title}`,
        lipSync: false,
      });
      return ec.name;
    },
    onSuccess: (name) => {
      queryClient.invalidateQueries({ queryKey: ["characters"] });
      setNotice(`${name} was added to Character Bible and sent to Music Video Cast.`);
      openCast();
    },
  });

  const addAll = useMutation({
    mutationFn: async (chars: ExtractedCharacter[]) => {
      const fresh = chars.filter((c) => !existingNames.has(c.name.toLowerCase()));
      const records: Character[] = fresh.map(extractedToCharacter);
      for (const r of records) await api.saveCharacter(r);
      return records.length;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["characters"] }),
  });

  /** Time-of-day for a location, looked up from its first matching scene. */
  const timeForLocation = (name: string): string =>
    a?.scenes.find((s) => s.location === name)?.timeOfDay ?? "";

  const addEnvironments = useMutation({
    mutationFn: async (items: ExtractedEntity[]) => {
      const fresh = items.filter((e) => !existingEnvNames.has(e.name.toLowerCase()));
      for (const e of fresh)
        await api.saveEnvironment(environmentFromLocation(e.name, timeForLocation(e.name)));
      return fresh.length;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["environments"] }),
  });

  const addProps = useMutation({
    mutationFn: async ({ items, category }: { items: ExtractedEntity[]; category: string }) => {
      const fresh = items.filter((p) => !existingPropNames.has(p.name.toLowerCase()));
      for (const p of fresh) await api.saveProp(propFromEntity(p.name, category, p.context));
      return fresh.length;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["props"] }),
  });

  const startNew = () => {
    const d = newScript();
    setDoc(d);
    setNotice(null);
  };

  const remove = (id: string) => {
    deleteScript(id);
    const list = loadScripts();
    setRecent(list);
    if (doc.id === id) setDoc(list[0] ?? newScript());
  };

  const a = doc.analysis;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <ModuleHeader
        module="platform"
        icon={<FileText className="h-5 w-5" />}
        title="Script Studio"
        subtitle="Feeds your Bibles — used by all studios."
        mode={studioMode}
        onModeChange={setStudioMode}
        primaryLabel="Import Script"
        primaryIcon={<Upload className="h-4 w-4" />}
        onPrimary={() => fileInput.current?.click()}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-8 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Input
            value={doc.title}
            onChange={(e) => setDoc({ ...doc, title: e.target.value })}
            aria-label="Script title"
            className="h-9 w-72 font-semibold"
          />
          <div className="hidden items-center gap-2 text-[11px] text-muted md:flex">
            <Badge variant="primary">Analyze</Badge>
            <span>→</span>
            <Badge>Bibles</Badge>
            <span>→</span>
            <Badge variant="accent">Available in every studio</Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInput}
            type="file"
            accept={ACCEPT_ATTR}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importFile(f);
              e.target.value = "";
            }}
          />
          <Button variant="secondary" onClick={startNew}>
            <Plus className="h-4 w-4" /> New
          </Button>
          <Button
            variant="secondary"
            onClick={() => fileInput.current?.click()}
            disabled={importing}
          >
            {importing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Import
          </Button>
          <Button onClick={analyze} disabled={!doc.content.trim() || analyzing}>
            {analyzing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Analyze Script
          </Button>
        </div>
      </div>

      {recent.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto border-b border-border px-8 py-2">
          <span className="shrink-0 text-[11px] uppercase tracking-wide text-muted">Recent</span>
          {recent.slice(0, 8).map((s) => (
            <button
              key={s.id}
              onClick={() => setDoc(s)}
              className={cn(
                "group flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors",
                s.id === doc.id
                  ? "border-primary bg-primary/12 text-foreground"
                  : "border-border text-muted hover:bg-elevated/60"
              )}
            >
              {s.title || "Untitled"}
              <Trash2
                className="h-3 w-3 opacity-0 transition-opacity hover:text-danger group-hover:opacity-60"
                onClick={(e) => {
                  e.stopPropagation();
                  remove(s.id);
                }}
              />
            </button>
          ))}
        </div>
      )}

      {notice && (
        <div className="border-b border-warning/30 bg-warning/10 px-8 py-2 text-xs text-warning">
          {notice}
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-2">
        {/* LEFT — script editor */}
        <div
          className={cn(
            "relative flex min-h-0 flex-col border-r border-border",
            dragOver && "ring-2 ring-inset ring-primary"
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) importFile(f);
          }}
        >
          <textarea
            value={doc.content}
            onChange={(e) => setDoc({ ...doc, content: e.target.value, analysis: doc.analysis })}
            placeholder="Paste your script here, drop a TXT / PDF / DOCX / Fountain file, or load the sample…"
            className="min-h-0 flex-1 resize-none bg-transparent p-8 font-mono text-[13px] leading-relaxed text-foreground placeholder:text-muted/60 focus:outline-none"
            spellCheck={false}
          />
          {!doc.content && (
            <div className="pointer-events-none absolute inset-x-0 bottom-8 flex justify-center">
              <Button
                variant="ghost"
                size="sm"
                className="pointer-events-auto"
                onClick={() =>
                  setDoc((d) => ({
                    ...d,
                    content: SAMPLE,
                    title: d.title === "Untitled Script" ? "Neon Bounty (sample)" : d.title,
                    analysis: null,
                  }))
                }
              >
                <Wand2 className="h-4 w-4 text-accent" /> Load sample script
              </Button>
            </div>
          )}
          {dragOver && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-primary/10 text-sm font-medium text-primary">
              Drop to import
            </div>
          )}
        </div>

        {/* RIGHT — analysis */}
        <div className="min-h-0 overflow-y-auto p-6">
          {!a ? (
            <div className="h-full">
              <CreativeEmptyState
                icon={<FileText />}
                title="Turn script text into shared production DNA"
                description="Import lyrics, a screenplay, or any scene notes. Script Studio extracts cast, locations, props, tone, and motifs into the shared Bibles that Music Video Director and every other studio can reuse."
                action="Analyze this script"
                onAction={analyze}
              />
              <div className="sr-only">
                <p className="text-sm font-medium">No analysis yet</p>
                <p className="mt-1 max-w-xs text-xs text-muted">
                  Import or paste a script, then hit{" "}
                  <span className="text-foreground">Analyze Script</span> to extract characters,
                  locations, props, scenes, and tone — all offline.
                </p>
              </div>
            </div>
          ) : (
            <Analysis
              analysis={a}
              existingNames={existingNames}
              existingEnvNames={existingEnvNames}
              existingPropNames={existingPropNames}
              onAdd={(ec) => addCharacter.mutate(ec)}
              onSendToCast={(ec) => sendToCast.mutate(ec)}
              onAddAll={() => addAll.mutate(a.characters)}
              onAddEnvironments={(items) => addEnvironments.mutate(items)}
              onAddProps={(items, category) => addProps.mutate({ items, category })}
              busy={
                addCharacter.isPending ||
                sendToCast.isPending ||
                addAll.isPending ||
                addEnvironments.isPending ||
                addProps.isPending
              }
              canSendToCast={Boolean(activeSongId)}
              onOpenBible={openCharacters}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function Analysis({
  analysis,
  existingNames,
  existingEnvNames,
  existingPropNames,
  onAdd,
  onSendToCast,
  onAddAll,
  onAddEnvironments,
  onAddProps,
  busy,
  canSendToCast,
  onOpenBible,
}: {
  analysis: ScriptAnalysis;
  existingNames: Set<string>;
  existingEnvNames: Set<string>;
  existingPropNames: Set<string>;
  onAdd: (ec: ExtractedCharacter) => void;
  onSendToCast: (ec: ExtractedCharacter) => void;
  onAddAll: () => void;
  onAddEnvironments: (items: ExtractedEntity[]) => void;
  onAddProps: (items: ExtractedEntity[], category: string) => void;
  busy: boolean;
  canSendToCast: boolean;
  onOpenBible: () => void;
}) {
  const remaining = analysis.characters.filter(
    (c) => !existingNames.has(c.name.toLowerCase())
  ).length;

  return (
    <div className="flex flex-col gap-5">
      {/* Tone + motifs */}
      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-card">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <div>
            <span className="text-[11px] uppercase tracking-wide text-muted">Emotional tone</span>
            <div className="font-medium">{analysis.emotionalTone}</div>
          </div>
          {analysis.visualMotifs.length > 0 && (
            <div className="min-w-0">
              <span className="text-[11px] uppercase tracking-wide text-muted">Visual motifs</span>
              <div className="mt-0.5 flex flex-wrap gap-1">
                {analysis.visualMotifs.map((m) => (
                  <Badge key={m} variant="accent">
                    {m}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Characters */}
      <section>
        <SectionHead
          icon={<Users className="h-4 w-4 text-primary" />}
          title="Characters"
          count={analysis.characters.length}
        >
          {remaining > 0 && (
            <Button size="sm" onClick={onAddAll} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add {remaining} to Bible
            </Button>
          )}
          {remaining === 0 && analysis.characters.length > 0 && (
            <Button size="sm" variant="ghost" onClick={onOpenBible}>
              Open Character Bible
            </Button>
          )}
        </SectionHead>
        <div className="flex flex-col gap-2">
          {analysis.characters.length === 0 && (
            <Empty>No character cues detected. Screenplay/Fountain format works best.</Empty>
          )}
          {analysis.characters.map((c, i) => {
            const inBible = existingNames.has(c.name.toLowerCase());
            return (
              <div
                key={`${c.name}-${i}`}
                className="flex items-start justify-between gap-3 rounded-[var(--radius-card)] border border-border bg-surface p-3 shadow-card"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{c.name}</span>
                    <Badge>
                      {c.mentions} {c.mentions === 1 ? "cue" : "cues"}
                    </Badge>
                    {inBible && (
                      <Badge variant="success">
                        <Check className="mr-1 h-3 w-3" /> In Bible
                      </Badge>
                    )}
                  </div>
                  {c.descriptionLine && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted">{c.descriptionLine}</p>
                  )}
                  {c.relationships.length > 0 && (
                    <p className="mt-1 text-[11px] text-muted">
                      Shares scenes with: {c.relationships.join(", ")}
                    </p>
                  )}
                </div>
                {(!inBible || canSendToCast) && (
                  <div className="flex shrink-0 flex-col gap-1.5">
                    {!inBible && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onAdd(c)}
                        disabled={busy}
                      >
                        <Plus className="h-4 w-4" /> Add
                      </Button>
                    )}
                    {canSendToCast && (
                      <Button
                        size="sm"
                        variant={inBible ? "secondary" : "ghost"}
                        onClick={() => onSendToCast(c)}
                        disabled={busy}
                        title="Add this character to the active Music Video cast"
                      >
                        <Users className="h-4 w-4" /> Send to Cast
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <EntityList
        icon={<MapPin className="h-4 w-4 text-primary" />}
        title="Locations"
        items={analysis.locations}
        existing={existingEnvNames}
        addLabel="World"
        onAddAll={() => onAddEnvironments(analysis.locations)}
        busy={busy}
      />
      <EntityList
        icon={<Package className="h-4 w-4 text-primary" />}
        title="Props"
        items={analysis.props}
        existing={existingPropNames}
        addLabel="Props"
        onAddAll={() => onAddProps(analysis.props, "Prop")}
        busy={busy}
      />
      <EntityList
        icon={<Car className="h-4 w-4 text-primary" />}
        title="Vehicles"
        items={analysis.vehicles}
        existing={existingPropNames}
        addLabel="Props"
        onAddAll={() => onAddProps(analysis.vehicles, "Vehicle")}
        busy={busy}
      />
      <EntityList
        icon={<Ghost className="h-4 w-4 text-primary" />}
        title="Creatures"
        items={analysis.creatures}
        existing={existingPropNames}
        addLabel="Props"
        onAddAll={() => onAddProps(analysis.creatures, "Creature")}
        busy={busy}
      />

      {/* Scenes */}
      <section>
        <SectionHead
          icon={<Clapperboard className="h-4 w-4 text-primary" />}
          title="Scenes"
          count={analysis.scenes.length}
        />
        <div className="flex flex-col gap-1">
          {analysis.scenes.length === 0 && <Empty>No scene headings found.</Empty>}
          {analysis.scenes.map((s, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-xs"
            >
              <Badge variant="primary">{s.setting}</Badge>
              <span className="font-medium">{s.location}</span>
              {s.timeOfDay && <span className="text-muted">· {s.timeOfDay}</span>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function SectionHead({
  icon,
  title,
  count,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        {icon} {title}
        <span className="text-xs font-normal text-muted">({count})</span>
      </h2>
      {children}
    </div>
  );
}

function EntityList({
  icon,
  title,
  items,
  existing,
  addLabel,
  onAddAll,
  busy,
}: {
  icon: React.ReactNode;
  title: string;
  items: ExtractedEntity[];
  existing: Set<string>;
  addLabel: string;
  onAddAll: () => void;
  busy: boolean;
}) {
  if (items.length === 0) return null;
  const remaining = items.filter((e) => !existing.has(e.name.toLowerCase())).length;
  return (
    <section>
      <SectionHead icon={icon} title={title} count={items.length}>
        {remaining > 0 && (
          <Button size="sm" variant="secondary" onClick={onAddAll} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add {remaining} to {addLabel}
          </Button>
        )}
      </SectionHead>
      <div className="flex flex-wrap gap-1.5">
        {items.map((e, i) => {
          const added = existing.has(e.name.toLowerCase());
          return (
            <span
              key={`${e.name}-${i}`}
              title={e.context || undefined}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs",
                added ? "border-success/40 bg-success/10 text-success" : "border-border bg-surface"
              )}
            >
              {added && <Check className="h-3 w-3" />}
              {e.name}
              <span className="text-[10px] text-muted">{e.mentions}</span>
            </span>
          );
        })}
      </div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-md border border-dashed border-border px-3 py-3 text-xs text-muted">
      {children}
    </p>
  );
}
