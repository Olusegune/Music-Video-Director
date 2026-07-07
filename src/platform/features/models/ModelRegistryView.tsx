// AI Model Registry — a registry-driven, capability-aware catalog view.
// Renders entirely from MODEL_REGISTRY (no hardcoded model logic), proving the
// Provider → Family → Variant → Workflow → Capability foundation.

import { useMemo, useState } from "react";
import { Boxes, Search, Image as ImageIcon, Video, CheckCircle2, Clock, Copy, Layers } from "lucide-react";
import { listProviders, MODEL_REGISTRY, type MediaKind } from "@/platform/lib/modelRegistry";
import { Input } from "@/platform/components/ui/input";
import { Badge } from "@/platform/components/ui/badge";
import { cn } from "@/platform/lib/utils";

export function ModelRegistryView() {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"all" | MediaKind>("all");
  const [availOnly, setAvailOnly] = useState(false);

  const providers = useMemo(() => listProviders(), []);
  const stats = useMemo(() => {
    const total = MODEL_REGISTRY.length;
    const avail = MODEL_REGISTRY.filter((m) => m.available).length;
    return { total, avail, providers: providers.length };
  }, [providers]);

  const q = query.trim().toLowerCase();
  const filtered = providers
    .map((p) => ({
      ...p,
      variants: p.variants.filter((m) => {
        if (kind !== "all" && m.kind !== kind) return false;
        if (availOnly && !m.available) return false;
        if (!q) return true;
        return `${m.label} ${m.family} ${m.variant} ${m.capabilities.join(" ")} ${m.workflows.join(" ")}`.toLowerCase().includes(q);
      }),
    }))
    .filter((p) => p.variants.length > 0);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="border-b border-border px-8 py-5">
        <h1 className="flex items-center gap-2 text-lg font-semibold">
          <Boxes className="h-5 w-5 text-primary" /> AI Model Registry
        </h1>
        <p className="text-xs text-muted">
          Provider → family → variant → workflow → capability. {stats.providers} providers ·{" "}
          {stats.avail}/{stats.total} models wired today. New models are added as data, never hardcoded.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2 border-b border-border px-8 py-3">
        <div className="relative w-64">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search models, families, capabilities…" className="pl-8" aria-label="Search models" />
        </div>
        {(["all", "image", "video"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors",
              kind === k ? "bg-primary/12 text-primary" : "text-muted hover:bg-elevated hover:text-foreground"
            )}
          >
            {k === "image" && <ImageIcon className="h-3.5 w-3.5" />}
            {k === "video" && <Video className="h-3.5 w-3.5" />}
            {k === "all" ? "All" : k === "image" ? "Image" : "Video"}
          </button>
        ))}
        <label className="ml-1 flex items-center gap-1.5 text-xs text-muted">
          <input type="checkbox" checked={availOnly} onChange={(e) => setAvailOnly(e.target.checked)} className="accent-[var(--color-primary)]" />
          Wired only
        </label>
      </div>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-8">
        {filtered.map((p) => (
          <section key={p.id}>
            <div className="mb-2 flex items-center gap-2">
              <h2 className="text-sm font-semibold">{p.label}</h2>
              <Badge variant={p.kind === "aggregator" ? "accent" : "primary"} className="gap-1">
                {p.kind === "aggregator" ? <Layers className="h-3 w-3" /> : null}
                {p.kind === "aggregator" ? "Aggregator" : "Direct"}
              </Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {p.variants.map((m) => (
                <div key={m.id} className="rounded-[var(--radius-card)] border border-border bg-surface p-3 shadow-card">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-sm font-medium">
                        {m.kind === "image" ? <ImageIcon className="h-3.5 w-3.5 text-muted" /> : <Video className="h-3.5 w-3.5 text-muted" />}
                        <span className="truncate">{m.family} {m.variant}</span>
                      </div>
                      <div className="text-[10px] text-muted">{m.id}</div>
                    </div>
                    {m.manual ? (
                      <Badge className="gap-1"><Copy className="h-3 w-3" /> Manual</Badge>
                    ) : m.available ? (
                      <Badge variant="success" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Wired</Badge>
                    ) : (
                      <Badge variant="warning" className="gap-1"><Clock className="h-3 w-3" /> Planned</Badge>
                    )}
                  </div>
                  {m.capabilities.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {m.capabilities.map((c) => (
                        <span key={c} className="rounded bg-elevated px-1.5 py-0.5 text-[9px] text-muted">{c}</span>
                      ))}
                    </div>
                  )}
                  {m.workflows.length > 0 && (
                    <div className="mt-1.5 text-[10px] text-muted">
                      {m.workflows.length} workflow{m.workflows.length === 1 ? "" : "s"} · {m.controls.length} controls
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
        {filtered.length === 0 && <p className="py-10 text-center text-sm text-muted">No models match.</p>}
      </div>
    </div>
  );
}
