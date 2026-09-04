import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Palette, Plus, Trash2, X } from "lucide-react";
import { api } from "@/platform/lib/ipc";
import { listDeliverables } from "@/platform/lib/deliverables";
import { isModuleEnabled } from "@/platform/lib/productConfig";
import type { BrandKit } from "@/platform/lib/types";
import { Button } from "@/platform/components/ui/button";
import { Label } from "@/platform/components/ui/label";
import { Input } from "@/platform/components/ui/input";
import { Textarea } from "@/platform/components/ui/textarea";
import { Badge } from "@/platform/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/platform/components/ui/card";
import { cn } from "@/platform/lib/utils";

const TONES = ["Confident", "Editorial", "Playful", "Minimal", "Technical", "Warm", "Luxury"];

export function BrandKitManager() {
  const queryClient = useQueryClient();
  const { data: kits = [] } = useQuery({ queryKey: ["brandkits"], queryFn: api.listBrandKits });
  const create = useMutation({
    mutationFn: () =>
      api.saveBrandKit({
        id: crypto.randomUUID(),
        name: "New Brand Kit",
        colors: ["#6D5DFC", "#00D9FF"],
        fonts: "Inter / JetBrains Mono",
        voice: "Confident, concise",
        visualRules: "Generous negative space and focused imagery.",
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["brandkits"] }),
  });
  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <header className="flex items-center justify-between border-b border-border px-8 py-5">
        <div>
          <h1 className="text-lg font-semibold">Brand Kits</h1>
          <p className="text-xs text-muted">
            Shared by Glam, Web, and Campaign Studios · visual identity applied at generation.
          </p>
        </div>
        <Button onClick={() => create.mutate()} disabled={create.isPending}>
          <Plus className="h-4 w-4" /> New Brand Kit
        </Button>
      </header>
      <div className="p-8">
        {kits.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
            <Palette className="mb-3 h-8 w-8 text-primary" />
            <p className="text-sm text-muted">
              Create a brand kit to keep connected productions visually coherent.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {kits.map((kit) => (
              <BrandKitCard key={kit.id} kit={kit} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BrandKitCard({ kit }: { kit: BrandKit }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<BrandKit>(kit);
  const [saved, setSaved] = useState(false);
  const deliverables = listDeliverables();
  const usage = [
    { label: "Glam", ids: ["glam-studio"], moduleId: "glam" as const },
    { label: "Web", ids: ["webstudio"], moduleId: "web" as const },
    { label: "Campaign", ids: ["campaignstudio"], moduleId: "campaign" as const },
  ]
    .filter((item) => isModuleEnabled(item.moduleId))
    .map((item) => ({
      ...item,
      count: deliverables.filter((deliverable) => item.ids.includes(deliverable.moduleId)).length,
    }));
  const save = useMutation({
    mutationFn: () => api.saveBrandKit(draft),
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
      queryClient.invalidateQueries({ queryKey: ["brandkits"] });
    },
  });
  const remove = useMutation({
    mutationFn: () => api.deleteBrandKit(kit.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["brandkits"] }),
  });
  const tones = draft.voice
    .split(",")
    .map((tone) => tone.trim())
    .filter(Boolean);
  const fonts = draft.fonts
    .split(/[\/,]/)
    .map((font) => font.trim())
    .filter(Boolean);
  const primary = draft.colors[0] ?? "#6D5DFC";
  const secondary = draft.colors[1] ?? "#00D9FF";
  const updateColor = (index: number, value: string) =>
    setDraft((current) => ({
      ...current,
      colors: current.colors.map((color, colorIndex) =>
        colorIndex === index ? value.toUpperCase() : color
      ),
    }));
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="flex flex-1 items-center gap-2">
            <Palette className="h-4 w-4 text-primary" />
            <Input
              aria-label="Brand kit name"
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              className="h-8 max-w-sm text-base font-semibold"
            />
          </CardTitle>
          <button
            aria-label="Delete brand kit"
            className="text-muted hover:text-danger"
            onClick={() => remove.mutate()}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
            Used by
          </span>
          {usage.map((item) => (
            <Badge key={item.label} variant={item.count ? "accent" : "default"}>
              {item.label} · {item.count}
            </Badge>
          ))}
          <Badge variant="default">Music Video · not connected</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-5">
          <Field label="Palette">
            <div className="grid gap-3 sm:grid-cols-2">
              {draft.colors.map((color, index) => (
                <div
                  key={`${index}-${color}`}
                  className="flex items-center gap-2 rounded-xl border border-border bg-elevated/30 p-2"
                >
                  <input
                    type="color"
                    value={/^#[0-9a-f]{6}$/i.test(color) ? color : "#6D5DFC"}
                    onChange={(event) => updateColor(index, event.target.value)}
                    className="h-10 w-12 cursor-pointer rounded-lg border-0 bg-transparent"
                    aria-label={`Color ${index + 1}`}
                  />
                  <Input
                    value={color}
                    onChange={(event) => updateColor(index, event.target.value)}
                    className="font-mono text-xs"
                  />
                  <button
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        colors: current.colors.filter((_, colorIndex) => colorIndex !== index),
                      }))
                    }
                    aria-label={`Remove ${color}`}
                  >
                    <X className="h-3.5 w-3.5 text-muted" />
                  </button>
                </div>
              ))}
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  setDraft((current) => ({ ...current, colors: [...current.colors, "#FFFFFF"] }))
                }
              >
                <Plus className="h-3.5 w-3.5" /> Add color
              </Button>
            </div>
          </Field>
          <Field label="Typography">
            <Input
              value={draft.fonts}
              onChange={(event) => setDraft({ ...draft, fonts: event.target.value })}
              placeholder="Inter / JetBrains Mono"
            />
            <div className="grid gap-2 sm:grid-cols-2">
              {fonts.map((font) => (
                <div key={font} className="rounded-xl border border-border p-3">
                  <div className="text-3xl" style={{ fontFamily: font }}>
                    Aa
                  </div>
                  <div className="mt-1 text-xs text-muted">{font}</div>
                </div>
              ))}
            </div>
          </Field>
          <Field label="Voice">
            <div className="flex flex-wrap gap-2">
              {TONES.map((tone) => {
                const active = tones.some((item) => item.toLowerCase() === tone.toLowerCase());
                return (
                  <button
                    key={tone}
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        voice: active
                          ? tones
                              .filter((item) => item.toLowerCase() !== tone.toLowerCase())
                              .join(", ")
                          : [...tones, tone].join(", "),
                      }))
                    }
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs transition-colors",
                      active
                        ? "border-primary bg-primary/12 text-primary"
                        : "border-border text-muted hover:border-primary/40"
                    )}
                  >
                    {tone}
                  </button>
                );
              })}
            </div>
            <Input
              value={draft.voice}
              onChange={(event) => setDraft({ ...draft, voice: event.target.value })}
              placeholder="Confident, concise, technical"
            />
          </Field>
          <Field label="Visual rules">
            <Textarea
              value={draft.visualRules}
              onChange={(event) => setDraft({ ...draft, visualRules: event.target.value })}
              placeholder="Lighting, composition, texture, and imagery rules…"
              rows={4}
            />
          </Field>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
              Save brand kit
            </Button>
            {saved && (
              <span className="flex items-center gap-1 text-xs text-success">
                <Check className="h-3.5 w-3.5" /> Saved
              </span>
            )}
          </div>
        </div>
        <div className="xl:sticky xl:top-4 xl:self-start">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
            Live brand card
          </div>
          <div
            className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-white/10 p-7 shadow-2xl"
            style={{
              background: `radial-gradient(circle at 85% 10%, ${secondary}88, transparent 35%), linear-gradient(145deg, ${primary}, #090b13 68%)`,
            }}
          >
            <div className="absolute right-[-12%] top-[18%] h-52 w-52 rounded-full border border-white/20 bg-white/5 backdrop-blur" />
            <div className="relative flex h-full flex-col">
              <div className="text-xs font-semibold uppercase tracking-[0.26em] text-white/65">
                {tones[0] ?? "Brand direction"}
              </div>
              <div className="mt-auto">
                <h3
                  className="max-w-xs text-4xl font-semibold leading-none text-white"
                  style={{ fontFamily: fonts[0] }}
                >
                  {draft.name}
                </h3>
                <p className="mt-4 max-w-xs text-sm leading-6 text-white/70">
                  {draft.visualRules ||
                    "Your visual rules appear here as a live creative direction preview."}
                </p>
                <div className="mt-6 flex gap-2">
                  {draft.colors.map((color) => (
                    <span
                      key={color}
                      className="h-5 w-10 rounded-full border border-white/25"
                      style={{ background: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
