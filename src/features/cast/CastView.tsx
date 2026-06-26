import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Plus,
  Trash2,
  Mic,
  MicOff,
  Link2,
  UserPlus,
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
import { api } from "@/lib/ipc";
import type { Character } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export function CastView() {
  const [cast, setCast] = useState<Performer[]>(() => loadCast());
  const { data: characters = [] } = useQuery({
    queryKey: ["characters"],
    queryFn: api.listCharacters,
  });

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
}: {
  performer: Performer;
  characters: Character[];
  onChange: (next: Performer) => void;
  onDelete: () => void;
}) {
  const color = roleColor(performer.role);
  const linked = characters.find((c) => c.id === performer.characterId);
  const isDancerish =
    performer.role === "Dancer" ||
    performer.role === "Lead Singer" ||
    performer.role === "Featured Artist";

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
        {performer.lipSync ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-muted">
            <Mic className="h-3 w-3" /> on-camera vocal
          </span>
        ) : null}
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
        <div className="flex items-start gap-3">
          {linked?.portraitUrl ? (
            <img
              src={linked.portraitUrl}
              alt={linked.name}
              className="h-14 w-14 shrink-0 rounded-lg object-cover"
            />
          ) : (
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg text-lg font-semibold text-white"
              style={{ backgroundColor: color }}
            >
              {(performer.name || "?").slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1 space-y-2">
            <Input
              value={performer.name}
              onChange={(e) => onChange({ ...performer, name: e.target.value })}
              placeholder="Performer name"
              className="font-medium"
              aria-label="Performer name"
            />
            <div className="flex gap-2">
              <select
                value={performer.role}
                onChange={(e) => {
                  const role = e.target.value as PerformerRole;
                  onChange({
                    ...performer,
                    role,
                    lipSync: VOCAL_ROLES.includes(role),
                  });
                }}
                className="h-9 flex-1 rounded-[var(--radius-input)] border border-border bg-surface px-2 text-sm text-foreground focus-visible:border-primary focus-visible:outline-none"
                aria-label="Role"
              >
                {PERFORMER_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
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
          </div>
        </div>

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
              <select
                value={performer.danceStyle}
                onChange={(e) =>
                  onChange({ ...performer, danceStyle: e.target.value })
                }
                className="h-9 w-full rounded-[var(--radius-input)] border border-border bg-surface px-2 text-sm text-foreground focus-visible:border-primary focus-visible:outline-none"
                aria-label="Dance style"
              >
                <option value="">— none —</option>
                {DANCE_STYLES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

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

        {linked && (
          <p className="text-[11px] text-muted">
            Linked to <span className="text-foreground">{linked.name}</span> —
            visual DNA{linked.locked ? " (locked)" : ""} carries into generation.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
