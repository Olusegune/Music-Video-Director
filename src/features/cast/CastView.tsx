import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Plus,
  Trash2,
  Mic,
  MicOff,
  Link2,
  UserPlus,
  Camera,
  Pencil,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  loadCast,
  savePerformer,
  deletePerformer,
  newPerformer,
  roleColor,
  PERFORMER_ROLES,
  VOCAL_ROLES,
  DANCE_STYLES,
  type Performer,
  type PerformerRole,
} from "@/lib/cast";
import { newCharacter } from "@/lib/characterDna";
import { api } from "@/lib/ipc";
import type { Character } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CardPicker } from "@/components/ui/card-picker";
import { ROLE_META } from "@/lib/roleMeta";
import { DANCE_STYLE_META } from "@/lib/danceStyleMeta";

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

export function CastView() {
  const queryClient = useQueryClient();
  const [cast, setCast] = useState<Performer[]>(() => loadCast());
  const { data: characters = [] } = useQuery({
    queryKey: ["characters"],
    queryFn: api.listCharacters,
  });
  const refreshCharacters = () =>
    queryClient.invalidateQueries({ queryKey: ["characters"] });

  const refresh = () => setCast(loadCast());

  const add = (role?: PerformerRole) => {
    savePerformer(newPerformer(role));
    refresh();
  };

  const patch = (next: Performer) => {
    savePerformer(next);
    refresh();
  };

  const remove = (id: string) => {
    deletePerformer(id);
    refresh();
  };

  const importFromCharacter = (c: Character) => {
    const p = newPerformer("Actor");
    p.name = c.name;
    p.characterId = c.id;
    p.wardrobe = c.primaryOutfit || "";
    savePerformer(p);
    refresh();
  };

  // Characters not yet represented in the cast — offer quick-import.
  const linkedIds = new Set(cast.map((p) => p.characterId).filter(Boolean));
  const importable = characters.filter((c) => !linkedIds.has(c.id));

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="grad-primary flex h-9 w-9 items-center justify-center rounded-lg">
            <Users className="h-4.5 w-4.5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-tight">Cast</h1>
            <p className="text-xs text-muted">
              Your performers — singers, dancers, and featured artists. Link to
              Character Bible DNA for visual consistency.
            </p>
          </div>
        </div>
        <Button variant="primary" onClick={() => add()}>
          <Plus className="h-4 w-4" />
          Add performer
        </Button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        {importable.length > 0 && (
          <div className="mb-5 flex flex-wrap items-center gap-2 rounded-[var(--radius-card)] border border-border bg-surface/60 px-4 py-3">
            <span className="inline-flex items-center gap-1.5 text-xs text-muted">
              <UserPlus className="h-3.5 w-3.5" />
              From Character Bible:
            </span>
            {importable.map((c) => (
              <button
                key={c.id}
                onClick={() => importFromCharacter(c)}
                className="rounded-md bg-elevated px-2 py-1 text-xs font-medium text-foreground transition-colors hover:bg-primary/15 hover:text-primary"
              >
                + {c.name || "Unnamed"}
              </button>
            ))}
          </div>
        )}

        {cast.length === 0 ? (
          <EmptyState onAdd={add} />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {cast.map((p) => (
              <PerformerCard
                key={p.id}
                performer={p}
                characters={characters}
                onChange={patch}
                onDelete={() => remove(p.id)}
                onCharacterAdded={refreshCharacters}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: (role?: PerformerRole) => void }) {
  return (
    <div className="flex h-full items-center justify-center p-10">
      <div className="max-w-sm text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-elevated">
          <Users className="h-7 w-7 text-muted" />
        </div>
        <h2 className="text-base font-semibold">No performers yet</h2>
        <p className="mt-1 text-sm text-muted">
          Add the people in your video. The MV Director and Choreography engine
          reference them by role and dance style.
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <Button onClick={() => onAdd("Lead Singer")}>
            <Mic className="h-4 w-4" />
            Add lead singer
          </Button>
          <Button variant="secondary" onClick={() => onAdd("Dancer")}>
            <Plus className="h-4 w-4" />
            Add dancer
          </Button>
        </div>
      </div>
    </div>
  );
}

function PerformerCard({
  performer,
  characters,
  onChange,
  onDelete,
  onCharacterAdded,
}: {
  performer: Performer;
  characters: Character[];
  onChange: (next: Performer) => void;
  onDelete: () => void;
  onCharacterAdded: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const color = roleColor(performer.role);
  const linked = characters.find((c) => c.id === performer.characterId);
  // Reset the broken-portrait flag whenever the portrait itself changes
  // (new upload/generation) — the React-recommended "adjust state while
  // rendering" pattern, so this doesn't need a useEffect.
  const [portraitCheck, setPortraitCheck] = useState({ url: linked?.portraitUrl, broken: false });
  if (portraitCheck.url !== linked?.portraitUrl) {
    setPortraitCheck({ url: linked?.portraitUrl, broken: false });
  }
  const portraitBroken = portraitCheck.broken;
  const isDancerish =
    performer.role === "Dancer" ||
    performer.role === "Lead Singer" ||
    performer.role === "Featured Artist";
  const summary = performer.performanceNotes.trim() || "No performance notes yet.";

  const addPortrait = async (file: File) => {
    setUploading(true);
    try {
      const dataUrl = await readAsDataUrl(file);
      const character = {
        ...newCharacter(performer.name || "New Character"),
        portraitUrl: dataUrl,
        referenceImages: [dataUrl],
        locked: true,
      };
      await api.saveCharacter(character);
      onCharacterAdded();
      onChange({ ...performer, characterId: character.id });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <div
        className="flex items-center gap-2 px-4 py-2.5"
        style={{ backgroundColor: `${color}14`, borderBottom: `1px solid ${color}33` }}
      >
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: color }}
        />
        <Badge className="normal-case" style={{ backgroundColor: `${color}1f`, color }}>
          {performer.role}
        </Badge>
        <span
          className={cn(
            "inline-flex items-center gap-1 text-[11px]",
            performer.lipSync ? "text-foreground" : "text-muted"
          )}
        >
          {performer.lipSync ? <Mic className="h-3 w-3" /> : <MicOff className="h-3 w-3" />}
          {performer.lipSync ? "on-camera vocal" : "no vocal"}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto h-7 w-7"
          onClick={onDelete}
          aria-label="Delete performer"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <CardContent className="space-y-3 p-4">
        {/* Headline: large portrait + name + always-visible primary actions */}
        <div className="flex items-start gap-3">
          <label
            className={cn(
              "group relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl text-2xl font-semibold text-white",
              (!linked?.portraitUrl || portraitBroken) && "cursor-pointer border-2 border-dashed"
            )}
            style={{
              backgroundColor: linked?.portraitUrl && !portraitBroken ? undefined : `${color}22`,
              borderColor: linked?.portraitUrl && !portraitBroken ? undefined : `${color}55`,
              color: linked?.portraitUrl && !portraitBroken ? undefined : color,
            }}
            title={
              portraitBroken
                ? "Portrait unavailable — click to replace"
                : linked?.portraitUrl
                  ? linked.name
                  : "Add a portrait"
            }
          >
            {linked?.portraitUrl && !portraitBroken ? (
              <>
                <img
                  src={linked.portraitUrl}
                  alt={linked.name}
                  className="h-full w-full object-cover"
                  onError={() => setPortraitCheck({ url: linked.portraitUrl, broken: true })}
                />
                <span className="absolute inset-0 hidden items-center justify-center bg-black/50 group-hover:flex">
                  <Camera className="h-5 w-5 text-white" />
                </span>
              </>
            ) : uploading ? (
              <span className="text-xs">…</span>
            ) : (
              <span className="flex flex-col items-center gap-1 text-center">
                <Camera className="h-5 w-5" />
                <span className="text-[10px] font-medium">
                  {portraitBroken ? "Portrait unavailable — replace" : "Add Portrait"}
                </span>
              </span>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void addPortrait(f);
              }}
            />
          </label>

          <div className="min-w-0 flex-1 space-y-2">
            <Input
              value={performer.name}
              onChange={(e) => onChange({ ...performer, name: e.target.value })}
              placeholder="Performer name"
              className="font-medium"
              aria-label="Performer name"
            />
            <div className="flex gap-2">
              <div className="flex-1">
                <CardPicker
                  value={performer.role}
                  ariaLabel="Role"
                  options={PERFORMER_ROLES.map((r) => ({
                    key: r,
                    label: r,
                    icon: ROLE_META[r].icon,
                    tagline: ROLE_META[r].tagline,
                  }))}
                  onChange={(key) => {
                    const role = key as PerformerRole;
                    onChange({
                      ...performer,
                      role,
                      lipSync: VOCAL_ROLES.includes(role),
                    });
                  }}
                />
              </div>
              <button
                onClick={() => onChange({ ...performer, lipSync: !performer.lipSync })}
                className={cn(
                  "inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-button)] border px-2.5 text-xs font-medium transition-colors",
                  performer.lipSync
                    ? "border-primary/40 bg-primary/12 text-primary"
                    : "border-border text-muted hover:bg-elevated"
                )}
                title="Toggle on-camera vocal / lip-sync"
              >
                {performer.lipSync ? (
                  <Mic className="h-3.5 w-3.5" />
                ) : (
                  <MicOff className="h-3.5 w-3.5" />
                )}
                Lip-sync
              </button>
            </div>
            {linked && (
              <p className="text-[11px] text-muted">
                Linked to <span className="text-foreground">{linked.name}</span> —
                visual DNA{linked.locked ? " (locked)" : ""} carries into generation.
              </p>
            )}
          </div>
        </div>

        {/* Always-visible primary actions: dance style + Character DNA link */}
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 flex items-center gap-1 text-[11px] font-medium text-muted">
              <Link2 className="h-3 w-3" /> Character DNA
            </span>
            <select
              value={performer.characterId ?? ""}
              onChange={(e) =>
                onChange({
                  ...performer,
                  characterId: e.target.value || undefined,
                })
              }
              className="h-9 w-full rounded-[var(--radius-input)] border border-border bg-surface px-2 text-sm text-foreground focus-visible:border-primary focus-visible:outline-none"
              aria-label="Linked character"
            >
              <option value="">— none —</option>
              {characters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name || "Unnamed character"}
                </option>
              ))}
            </select>
          </label>

          {isDancerish && (
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-muted">
                Dance style
              </span>
              <CardPicker
                value={performer.danceStyle}
                ariaLabel="Dance style"
                placeholder="— none —"
                options={DANCE_STYLES.map((s) => ({
                  key: s,
                  label: s,
                  icon: DANCE_STYLE_META[s]?.icon,
                  tagline: DANCE_STYLE_META[s]?.tagline,
                }))}
                onChange={(key) => onChange({ ...performer, danceStyle: key })}
              />
            </label>
          )}
        </div>

        {/* Short performance summary — expand for wardrobe + full notes */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-start gap-1.5 text-left text-[11px] text-muted hover:text-foreground"
        >
          {expanded ? (
            <ChevronDown className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          ) : (
            <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          )}
          <span className="flex items-center gap-1">
            <Pencil className="h-3 w-3 shrink-0" />
            <span className={cn(!expanded && "line-clamp-1")}>{summary}</span>
          </span>
        </button>

        {expanded && (
          <div className="space-y-3 border-t border-border pt-3">
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-muted">
                Wardrobe
              </span>
              <Input
                value={performer.wardrobe}
                onChange={(e) => onChange({ ...performer, wardrobe: e.target.value })}
                placeholder="e.g. all-white minimal, statement jewelry"
                aria-label="Wardrobe"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-muted">
                Performance notes
              </span>
              <Textarea
                value={performer.performanceNotes}
                onChange={(e) =>
                  onChange({ ...performer, performanceNotes: e.target.value })
                }
                placeholder="Energy, attitude, signature moves, how they carry the camera…"
                className="min-h-16"
                aria-label="Performance notes"
              />
            </label>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
