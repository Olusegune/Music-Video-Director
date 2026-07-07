import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Palette, Plus, Trash2, Check } from "lucide-react";
import { api } from "@/platform/lib/ipc";
import type { BrandKit } from "@/platform/lib/types";
import { Button } from "@/platform/components/ui/button";
import { Label } from "@/platform/components/ui/label";
import { Input } from "@/platform/components/ui/input";
import { Textarea } from "@/platform/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/platform/components/ui/card";

export function BrandKitManager() {
  const queryClient = useQueryClient();
  const { data: kits = [] } = useQuery({
    queryKey: ["brandkits"],
    queryFn: api.listBrandKits,
  });

  const create = useMutation({
    mutationFn: () =>
      api.saveBrandKit({
        id: crypto.randomUUID(),
        name: "New Brand Kit",
        colors: [],
        fonts: "",
        voice: "",
        visualRules: "",
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["brandkits"] }),
  });

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <header className="flex items-center justify-between border-b border-border px-8 py-5">
        <div>
          <h1 className="text-lg font-semibold">Brand Kits</h1>
          <p className="text-xs text-muted">
            Reusable colors, type, voice, and visual rules applied at generation.
          </p>
        </div>
        <Button onClick={() => create.mutate()} disabled={create.isPending}>
          <Plus className="h-4 w-4" /> New Brand Kit
        </Button>
      </header>

      <div className="p-8">
        {kits.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-border py-16 text-center">
            <Palette className="mb-2 h-7 w-7 text-muted" />
            <p className="text-sm text-muted">
              No brand kits yet — create one to keep projects on-brand.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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
  const [colorsText, setColorsText] = useState(kit.colors.join(", "));
  const [saved, setSaved] = useState(false);

  const save = useMutation({
    mutationFn: () =>
      api.saveBrandKit({
        ...draft,
        colors: colorsText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      }),
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-primary" />
            <Input
              aria-label="Brand kit name"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className="h-7 w-48 font-semibold"
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
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`colors-${kit.id}`}>Color palette (comma-separated)</Label>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {colorsText
                .split(",")
                .map((c) => c.trim())
                .filter(Boolean)
                .map((c, i) => (
                  <span
                    key={i}
                    className="h-5 w-5 rounded border border-border"
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
            </div>
            <Input
              id={`colors-${kit.id}`}
              value={colorsText}
              onChange={(e) => setColorsText(e.target.value)}
              placeholder="#6D5DFC, #00D9FF"
            />
          </div>
        </div>
        <Field label="Typography" id={`fonts-${kit.id}`}>
          <Input
            id={`fonts-${kit.id}`}
            value={draft.fonts}
            onChange={(e) => setDraft({ ...draft, fonts: e.target.value })}
            placeholder="Inter / JetBrains Mono"
          />
        </Field>
        <Field label="Voice" id={`voice-${kit.id}`}>
          <Input
            id={`voice-${kit.id}`}
            value={draft.voice}
            onChange={(e) => setDraft({ ...draft, voice: e.target.value })}
            placeholder="Confident, concise, technical"
          />
        </Field>
        <Field label="Visual rules" id={`rules-${kit.id}`}>
          <Textarea
            id={`rules-${kit.id}`}
            value={draft.visualRules}
            onChange={(e) => setDraft({ ...draft, visualRules: e.target.value })}
            placeholder="Dark-first, glassmorphism, generous negative space…"
          />
        </Field>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
            Save
          </Button>
          {saved && (
            <span className="flex items-center gap-1 text-xs text-success">
              <Check className="h-3.5 w-3.5" /> Saved
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
