// AI Model Registry — a registry-driven, capability-aware catalog view.
// Renders entirely from MODEL_REGISTRY (no hardcoded model logic), proving the
// Provider → Family → Variant → Workflow → Capability foundation.

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Boxes,
  Search,
  Image as ImageIcon,
  Video,
  CheckCircle2,
  Clock,
  Copy,
  Layers,
  Star,
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  Loader2,
  KeyRound,
} from "lucide-react";
import {
  listProviders,
  MODEL_REGISTRY,
  type MediaKind,
  type Workflow,
} from "@/platform/lib/modelRegistry";
import { api } from "@/platform/lib/ipc";
import { getMeta, recordTest } from "@/platform/lib/providerMeta";
import { loadRouterConfig, saveRouterConfig } from "@/platform/lib/providers";
import { useAppStore } from "@/platform/store/useAppStore";
import type { ProviderId } from "@/platform/lib/types";
import { Input } from "@/platform/components/ui/input";
import { Badge } from "@/platform/components/ui/badge";
import { Button } from "@/platform/components/ui/button";
import { cn } from "@/platform/lib/utils";
import { Select } from "@/platform/components/ui/select";

const LS_FAVORITES = "mf.modelFavorites";

function loadFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_FAVORITES);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveFavorites(favorites: Set<string>) {
  try {
    localStorage.setItem(LS_FAVORITES, JSON.stringify([...favorites]));
  } catch {
    /* best-effort */
  }
}

export function ModelRegistryView() {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"all" | MediaKind>("all");
  const [workflow, setWorkflow] = useState<"all" | Workflow>("all");
  const [availOnly, setAvailOnly] = useState(false);
  const [configuredOnly, setConfiguredOnly] = useState(false);
  const [testedOnly, setTestedOnly] = useState(false);
  const [favOnly, setFavOnly] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(() => loadFavorites());
  const [testing, setTesting] = useState<string | null>(null);
  const [metaVersion, setMetaVersion] = useState(0);
  const openApiKeys = useAppStore((s) => s.openApiKeys);

  const { data: keyStatuses = [] } = useQuery({
    queryKey: ["providerKeys"],
    queryFn: api.getProviderKeyStatuses,
  });
  const configuredProviders = useMemo(
    () => new Set(keyStatuses.filter((s) => s.configured).map((s) => s.provider)),
    [keyStatuses]
  );

  const providers = useMemo(() => listProviders(), []);
  const workflows = useMemo(
    () => [...new Set(MODEL_REGISTRY.flatMap((m) => m.workflows))].sort(),
    []
  );
  const stats = useMemo(() => {
    const total = MODEL_REGISTRY.length;
    const avail = MODEL_REGISTRY.filter((m) => m.available).length;
    return { total, avail, providers: providers.length };
  }, [providers]);

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveFavorites(next);
      return next;
    });
  };

  const runTest = async (providerKey: string) => {
    setTesting(providerKey);
    try {
      const result = await api.testProviderConnection(providerKey as ProviderId);
      recordTest(providerKey as ProviderId, result.status);
      setMetaVersion((v) => v + 1);
    } catch {
      recordTest(providerKey as ProviderId, "invalid");
      setMetaVersion((v) => v + 1);
    } finally {
      setTesting(null);
    }
  };

  const setAsDefault = (providerKey: string, modelKind: MediaKind) => {
    const cfg = loadRouterConfig();
    cfg.mode = "manual";
    cfg.manual = { ...cfg.manual, [modelKind]: providerKey as ProviderId };
    saveRouterConfig(cfg);
    setMetaVersion((v) => v + 1);
  };

  const q = query.trim().toLowerCase();
  const filtered = providers
    .map((p) => ({
      ...p,
      variants: p.variants.filter((m) => {
        if (kind !== "all" && m.kind !== kind) return false;
        if (workflow !== "all" && !m.workflows.includes(workflow)) return false;
        if (availOnly && !m.available) return false;
        if (favOnly && !favorites.has(m.id)) return false;
        const configured = configuredProviders.has(m.providerKey as ProviderId);
        if (configuredOnly && !configured) return false;
        const tested = getMeta(m.providerKey as ProviderId).lastStatus === "connected";
        if (testedOnly && !tested) return false;
        if (!q) return true;
        return `${m.label} ${m.family} ${m.variant} ${m.capabilities.join(" ")} ${m.workflows.join(" ")}`
          .toLowerCase()
          .includes(q);
      }),
    }))
    .filter((p) => p.variants.length > 0);

  const activeDefault = loadRouterConfig();

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="border-b border-border px-8 py-5">
        <h1 className="flex items-center gap-2 text-lg font-semibold">
          <Boxes className="h-5 w-5 text-primary" /> AI Model Registry
        </h1>
        <p className="text-xs text-muted">
          Provider → family → variant → workflow → capability. {stats.providers} providers ·{" "}
          {stats.avail}/{stats.total} models wired today. New models are added as data, never
          hardcoded. "Tested" reflects a real Test Connection result, not just a configured key.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2 border-b border-border px-8 py-3">
        <div className="relative w-56">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search models, families, capabilities…"
            className="pl-8"
            aria-label="Search models"
          />
        </div>
        {(["all", "image", "video"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors",
              kind === k
                ? "bg-primary/12 text-primary"
                : "text-muted hover:bg-elevated hover:text-foreground"
            )}
          >
            {k === "image" && <ImageIcon className="h-3.5 w-3.5" />}
            {k === "video" && <Video className="h-3.5 w-3.5" />}
            {k === "all" ? "All" : k === "image" ? "Image" : "Video"}
          </button>
        ))}
        <Select
          value={workflow}
          onChange={(value: string) => setWorkflow(value as "all" | Workflow)}
          aria-label="Filter by workflow"
          className="h-7 rounded-md border border-border bg-surface px-2 text-xs text-foreground focus-visible:border-primary focus-visible:outline-none"
        >
          <option value="all">All workflows</option>
          {workflows.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </Select>
        <label className="ml-1 flex items-center gap-1.5 text-xs text-muted">
          <input
            type="checkbox"
            checked={availOnly}
            onChange={(e) => setAvailOnly(e.target.checked)}
            className="accent-[var(--color-primary)]"
          />
          Wired only
        </label>
        <label className="flex items-center gap-1.5 text-xs text-muted">
          <input
            type="checkbox"
            checked={configuredOnly}
            onChange={(e) => setConfiguredOnly(e.target.checked)}
            className="accent-[var(--color-primary)]"
          />
          Configured only
        </label>
        <label className="flex items-center gap-1.5 text-xs text-muted">
          <input
            type="checkbox"
            checked={testedOnly}
            onChange={(e) => setTestedOnly(e.target.checked)}
            className="accent-[var(--color-primary)]"
          />
          Tested only
        </label>
        <label className="flex items-center gap-1.5 text-xs text-muted">
          <input
            type="checkbox"
            checked={favOnly}
            onChange={(e) => setFavOnly(e.target.checked)}
            className="accent-[var(--color-primary)]"
          />
          Favorites
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
              {p.variants.map((m) => {
                const configured = configuredProviders.has(m.providerKey as ProviderId);
                const meta = getMeta(m.providerKey as ProviderId);
                const isTested = meta.lastStatus === "connected";
                const failedTest = meta.lastStatus === "invalid";
                const isFav = favorites.has(m.id);
                const isDefault = activeDefault.manual[m.kind] === (m.providerKey as ProviderId);
                return (
                  <div
                    key={m.id}
                    className={cn(
                      "flex flex-col gap-2 rounded-[var(--radius-card)] border bg-surface p-3 shadow-card",
                      isDefault ? "border-primary/50 ring-1 ring-primary/30" : "border-border"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-sm font-medium">
                          {m.kind === "image" ? (
                            <ImageIcon className="h-3.5 w-3.5 text-muted" />
                          ) : (
                            <Video className="h-3.5 w-3.5 text-muted" />
                          )}
                          <span className="truncate">
                            {m.family} {m.variant}
                          </span>
                        </div>
                        <div className="text-[10px] text-muted">{m.id}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleFavorite(m.id)}
                          aria-label={isFav ? "Remove favorite" : "Add favorite"}
                          aria-pressed={isFav}
                          className={cn(
                            "flex h-6 w-6 items-center justify-center rounded-md transition-colors",
                            isFav
                              ? "text-warning"
                              : "text-muted hover:bg-elevated hover:text-foreground"
                          )}
                        >
                          <Star className={cn("h-3.5 w-3.5", isFav && "fill-current")} />
                        </button>
                        {m.manual ? (
                          <Badge className="gap-1">
                            <Copy className="h-3 w-3" /> Manual
                          </Badge>
                        ) : m.available ? (
                          <Badge variant="success" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Wired
                          </Badge>
                        ) : (
                          <Badge variant="warning" className="gap-1">
                            <Clock className="h-3 w-3" /> Planned
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge
                        variant={configured ? "success" : "default"}
                        className="gap-1 text-[9px]"
                        title={configured ? "API key configured" : "No key configured"}
                      >
                        <KeyRound className="h-2.5 w-2.5" />
                        {configured ? "Configured" : "Not configured"}
                      </Badge>
                      <Badge
                        variant={isTested ? "success" : failedTest ? "danger" : "default"}
                        className="gap-1 text-[9px]"
                        title={
                          isTested
                            ? "Test Connection succeeded"
                            : failedTest
                              ? "Test Connection failed"
                              : "Not tested yet"
                        }
                      >
                        {isTested ? (
                          <ShieldCheck className="h-2.5 w-2.5" />
                        ) : failedTest ? (
                          <ShieldAlert className="h-2.5 w-2.5" />
                        ) : (
                          <ShieldQuestion className="h-2.5 w-2.5" />
                        )}
                        {isTested ? "Tested" : failedTest ? "Test failed" : "Untested"}
                      </Badge>
                      {isDefault && <Badge className="text-[9px]">Default</Badge>}
                    </div>

                    {m.capabilities.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {m.capabilities.map((c) => (
                          <span
                            key={c}
                            className="rounded bg-elevated px-1.5 py-0.5 text-[9px] text-muted"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    )}
                    {m.workflows.length > 0 && (
                      <div className="text-[10px] text-muted">
                        {m.workflows.length} workflow{m.workflows.length === 1 ? "" : "s"} ·{" "}
                        {m.controls.length} controls
                      </div>
                    )}

                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <Button size="sm" variant="secondary" onClick={openApiKeys}>
                        Configure
                      </Button>
                      {!m.manual && (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={!configured || testing === m.providerKey}
                          onClick={() => runTest(m.providerKey)}
                          title={!configured ? "Add a key first" : "Run a real connection test"}
                        >
                          {testing === m.providerKey ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : null}
                          Test
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant={isDefault ? "primary" : "ghost"}
                        disabled={!configured}
                        onClick={() => setAsDefault(m.providerKey, m.kind)}
                        title={
                          !configured ? "Add a key first" : "Route this capability here by default"
                        }
                      >
                        {isDefault ? "Default ✓" : "Set as Default"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
        {filtered.length === 0 && (
          <p className="py-10 text-center text-sm text-muted">No models match.</p>
        )}
      </div>
      {/* metaVersion forces a re-render after Test/Set-as-default writes to
          non-reactive localStorage-backed helpers (getMeta/loadRouterConfig). */}
      <span className="sr-only" aria-hidden>
        {metaVersion}
      </span>
    </div>
  );
}
