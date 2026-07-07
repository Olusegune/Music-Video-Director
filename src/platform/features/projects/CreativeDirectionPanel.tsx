import { Compass, Palette, CheckSquare, Lock, Plus, X } from "lucide-react";
import type { PromptPack } from "@/platform/lib/types";
import {
  LOCK_STATES,
  LOCK_STATE_LABEL,
  LOCK_STATE_HELP,
  lockInstructionFor,
  newLockItem,
  type TextLockState,
} from "@/platform/lib/textlock";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/platform/components/ui/card";
import { Button } from "@/platform/components/ui/button";
import { InlineInput, InlineTextarea } from "@/platform/components/ui/inline-edit";

type Update = (updater: (prev: PromptPack) => PromptPack) => void;

export function CreativeDirectionPanel({
  pack,
  update,
}: {
  pack: PromptPack;
  update: Update;
}) {
  const cd = pack.creativeDirection;
  const st = pack.style;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* Creative Direction */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-primary" /> Creative Direction
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Row label="Working Title">
            <InlineInput
              value={cd.workingTitle}
              onChange={(v) =>
                update((p) => ({
                  ...p,
                  creativeDirection: { ...p.creativeDirection, workingTitle: v },
                }))
              }
            />
          </Row>
          <Row label="Goal">
            <InlineTextarea
              value={cd.goal}
              rows={2}
              onChange={(v) =>
                update((p) => ({
                  ...p,
                  creativeDirection: { ...p.creativeDirection, goal: v },
                }))
              }
            />
          </Row>
          <div className="grid grid-cols-2 gap-2">
            <Row label="Audience">
              <InlineInput
                value={cd.audience}
                onChange={(v) =>
                  update((p) => ({
                    ...p,
                    creativeDirection: { ...p.creativeDirection, audience: v },
                  }))
                }
              />
            </Row>
            <Row label="Tone">
              <InlineInput
                value={cd.emotionalTone}
                onChange={(v) =>
                  update((p) => ({
                    ...p,
                    creativeDirection: {
                      ...p.creativeDirection,
                      emotionalTone: v,
                    },
                  }))
                }
              />
            </Row>
            <Row label="Duration">
              <InlineInput
                value={cd.duration}
                onChange={(v) =>
                  update((p) => ({
                    ...p,
                    creativeDirection: { ...p.creativeDirection, duration: v },
                  }))
                }
              />
            </Row>
            <Row label="Aspect Ratio">
              <InlineInput
                value={cd.aspectRatio}
                onChange={(v) =>
                  update((p) => ({
                    ...p,
                    creativeDirection: {
                      ...p.creativeDirection,
                      aspectRatio: v,
                    },
                  }))
                }
              />
            </Row>
          </div>
          <Row label="Recommended Models">
            <InlineInput
              value={cd.recommendedModels.join(", ")}
              onChange={(v) =>
                update((p) => ({
                  ...p,
                  creativeDirection: {
                    ...p.creativeDirection,
                    recommendedModels: splitList(v),
                  },
                }))
              }
            />
          </Row>
        </CardContent>
      </Card>

      {/* Style */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-accent" /> Style
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Row label="Visual Language">
            <InlineTextarea
              value={st.visualLanguage}
              rows={2}
              onChange={(v) =>
                update((p) => ({ ...p, style: { ...p.style, visualLanguage: v } }))
              }
            />
          </Row>
          <Row label="Color Palette">
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {st.colorPalette.map((c, i) => (
                  <span
                    key={i}
                    className="h-5 w-5 rounded border border-border"
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
              <InlineInput
                value={st.colorPalette.join(", ")}
                onChange={(v) =>
                  update((p) => ({
                    ...p,
                    style: { ...p.style, colorPalette: splitList(v) },
                  }))
                }
              />
            </div>
          </Row>
          <div className="grid grid-cols-2 gap-2">
            <Row label="Typography">
              <InlineInput
                value={st.typography}
                onChange={(v) =>
                  update((p) => ({ ...p, style: { ...p.style, typography: v } }))
                }
              />
            </Row>
            <Row label="Mood">
              <InlineInput
                value={st.mood}
                onChange={(v) =>
                  update((p) => ({ ...p, style: { ...p.style, mood: v } }))
                }
              />
            </Row>
          </div>
          <Row label="Materials">
            <InlineInput
              value={st.materials}
              onChange={(v) =>
                update((p) => ({ ...p, style: { ...p.style, materials: v } }))
              }
            />
          </Row>
          <Row label="Atmosphere">
            <InlineInput
              value={st.atmosphere}
              onChange={(v) =>
                update((p) => ({ ...p, style: { ...p.style, atmosphere: v } }))
              }
            />
          </Row>
        </CardContent>
      </Card>

      {/* Text Lock system */}
      <TextLockCard pack={pack} update={update} />

      {/* QC checklist */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-success" /> QC Checklist
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {pack.qcChecklist.map((item, idx) => (
            <label
              key={idx}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-elevated"
            >
              <input
                type="checkbox"
                checked={item.checked}
                onChange={(e) =>
                  update((p) => ({
                    ...p,
                    qcChecklist: p.qcChecklist.map((q, i) =>
                      i === idx ? { ...q, checked: e.target.checked } : q
                    ),
                  }))
                }
                className="h-4 w-4 accent-[var(--color-primary)]"
              />
              <span className={item.checked ? "text-muted line-through" : ""}>
                {item.label}
              </span>
            </label>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="px-1.5 text-[11px] uppercase tracking-wide text-muted">
        {label}
      </span>
      {children}
    </div>
  );
}

function splitList(v: string): string[] {
  return v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function TextLockCard({ pack, update }: { pack: PromptPack; update: Update }) {
  const locks = pack.textLocks ?? [];
  const instruction = lockInstructionFor(locks);

  function setLocks(next: typeof locks) {
    update((p) => ({ ...p, textLocks: next }));
  }

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-warning" /> Text Lock
          <span className="ml-1 text-[11px] font-normal text-muted">
            Keep on-screen words sharp, correct, and behaving as directed
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {locks.length === 0 && (
          <p className="text-xs text-muted">
            No locked text yet. Brand names, CTAs, and numbers detected from the
            brief land here automatically — or add one below.
          </p>
        )}

        {locks.map((item, idx) => (
          <div
            key={item.id}
            className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-border p-2.5 sm:flex-row sm:items-center"
          >
            <input
              aria-label="Locked text"
              value={item.text}
              onChange={(e) =>
                setLocks(
                  locks.map((l, i) =>
                    i === idx ? { ...l, text: e.target.value } : l
                  )
                )
              }
              placeholder="On-screen text…"
              className="h-8 flex-1 rounded-[var(--radius-input)] border border-border bg-surface px-2 text-xs focus-visible:border-primary focus-visible:outline-none"
            />
            <input
              aria-label="Role"
              value={item.role ?? ""}
              onChange={(e) =>
                setLocks(
                  locks.map((l, i) =>
                    i === idx ? { ...l, role: e.target.value } : l
                  )
                )
              }
              placeholder="role (e.g. CTA)"
              className="h-8 w-36 rounded-[var(--radius-input)] border border-border bg-surface px-2 text-xs focus-visible:border-primary focus-visible:outline-none"
            />
            <select
              aria-label="Lock state"
              value={item.state}
              title={LOCK_STATE_HELP[item.state]}
              onChange={(e) =>
                setLocks(
                  locks.map((l, i) =>
                    i === idx
                      ? { ...l, state: e.target.value as TextLockState }
                      : l
                  )
                )
              }
              className="h-8 w-48 rounded-[var(--radius-input)] border border-border bg-surface px-2 text-xs focus-visible:border-primary focus-visible:outline-none"
            >
              {LOCK_STATES.map((s) => (
                <option key={s} value={s}>
                  {LOCK_STATE_LABEL[s]}
                </option>
              ))}
            </select>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Remove"
              onClick={() => setLocks(locks.filter((_, i) => i !== idx))}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}

        <div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setLocks([...locks, newLockItem("", "locked")])}
          >
            <Plus className="h-4 w-4" /> Add text
          </Button>
        </div>

        {instruction && (
          <div className="rounded-[var(--radius-card)] border border-warning/30 bg-warning/5 p-3">
            <span className="text-[11px] uppercase tracking-wide text-warning">
              Injected into every image & video prompt
            </span>
            <p className="mt-1 text-xs text-muted">{instruction}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
