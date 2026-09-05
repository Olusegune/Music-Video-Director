import { useState } from "react";
import { useConfirm } from "@/platform/components/ui/confirm-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  KeyRound,
  AlertTriangle,
  Route,
  Sparkles,
  Clapperboard,
  History,
  RotateCcw,
  Trash2,
  Info,
  Film,
} from "lucide-react";
import { api, isTauri } from "@/platform/lib/ipc";
import { getShowWelcome, setShowWelcome } from "@/platform/lib/settings";
import {
  loadSnapshots,
  restoreSnapshot,
  deleteSnapshot,
  type Snapshot,
} from "@/platform/lib/snapshots";
import { useAppStore } from "@/platform/store/useAppStore";
import type { ProviderId } from "@/platform/lib/types";
import {
  PROVIDERS,
  ROUTER_MODES,
  CAPABILITY_LABEL,
  providersFor,
  loadRouterConfig,
  saveRouterConfig,
  type Capability,
  type ProviderInfo,
  type RouterConfig,
} from "@/platform/lib/providers";
import { Button } from "@/platform/components/ui/button";
import { Input } from "@/platform/components/ui/input";
import { Label } from "@/platform/components/ui/label";
import { Badge } from "@/platform/components/ui/badge";
import { Select } from "@/platform/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/platform/components/ui/card";

const CAP_ORDER: Capability[] = ["text", "image", "video", "audio"];

export function SettingsView() {
  const queryClient = useQueryClient();
  const { data: statuses = [] } = useQuery({
    queryKey: ["providerKeys"],
    queryFn: api.getProviderKeyStatuses,
  });
  const [router, setRouter] = useState<RouterConfig>(() => loadRouterConfig());
  const [showWelcome, setShowWelcomeState] = useState(() => getShowWelcome());
  const setWelcomeOpen = useAppStore((s) => s.setWelcomeOpen);

  function toggleWelcome(next: boolean) {
    setShowWelcomeState(next);
    setShowWelcome(next);
  }

  function updateRouter(next: RouterConfig) {
    setRouter(next);
    saveRouterConfig(next);
  }

  const configured = new Set(statuses.filter((s) => s.configured).map((s) => s.provider));

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <header className="border-b border-border px-8 py-5">
        <h1 className="text-lg font-semibold">Settings</h1>
        <p className="text-xs text-muted">
          Provider keys & the model router. Calls are made from the Rust core — keys never reach the
          frontend.
        </p>
      </header>

      <div className="max-w-3xl space-y-6 p-8">
        {!isTauri && (
          <div className="flex items-start gap-2 rounded-[var(--radius-card)] border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Running in the browser (dev). Keys are stored in localStorage as a mock and generation
              uses the local engine. In the packaged Windows app, keys live in the OS keychain.
            </span>
          </div>
        )}

        {/* Startup / Welcome */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clapperboard className="h-4 w-4 text-primary" /> Startup
            </CardTitle>
            <CardDescription>
              Control the welcome screen shown when the app launches.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showWelcome}
                onChange={(e) => toggleWelcome(e.target.checked)}
                className="h-4 w-4 accent-[var(--color-primary)]"
              />
              Show the welcome screen at startup
            </label>
            <Button variant="secondary" size="sm" onClick={() => setWelcomeOpen(true)}>
              <Clapperboard className="h-4 w-4" /> Show welcome now
            </Button>
          </CardContent>
        </Card>

        <SnapshotsCard />
        <AboutCard />

        {/* Router */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Route className="h-4 w-4 text-primary" /> Provider Router
            </CardTitle>
            <CardDescription>How the app picks a model for each task.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {ROUTER_MODES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => updateRouter({ ...router, mode: m.id })}
                  className={`flex flex-col items-start gap-0.5 rounded-[var(--radius-button)] border px-3 py-2 text-left text-xs transition-colors ${
                    router.mode === m.id
                      ? "border-primary bg-primary/12 text-foreground"
                      : "border-border text-muted hover:bg-elevated/60"
                  }`}
                >
                  <span className="flex items-center gap-1 font-medium text-foreground">
                    {m.id === "local" && <Sparkles className="h-3 w-3 text-accent" />}
                    {m.label}
                  </span>
                  <span className="text-[11px] text-muted">{m.hint}</span>
                </button>
              ))}
            </div>

            {router.mode === "manual" && (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {CAP_ORDER.map((cap) => (
                  <div key={cap} className="flex flex-col gap-1">
                    <Label className="text-[11px] uppercase tracking-wide text-muted">
                      {CAPABILITY_LABEL[cap]}
                    </Label>
                    <Select
                      value={router.manual[cap] ?? ""}
                      onChange={(value: string) =>
                        updateRouter({
                          ...router,
                          manual: {
                            ...router.manual,
                            [cap]: value as ProviderId,
                          },
                        })
                      }
                      className="h-8 rounded-[var(--radius-input)] border border-border bg-surface px-2 text-xs focus-visible:border-primary focus-visible:outline-none"
                    >
                      <option value="">Auto</option>
                      {providersFor(cap).map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                ))}
              </div>
            )}

            {router.mode === "local" && (
              <p className="rounded-md bg-accent/10 px-3 py-2 text-[11px] text-accent">
                Local prompt-only mode: the full production pack is generated offline with no API
                calls. Add keys and switch modes to render images, video, and audio.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Keys grouped by capability */}
        {CAP_ORDER.map((cap) => (
          <Card key={cap}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <KeyRound className="h-4 w-4 text-primary" />
                {CAPABILITY_LABEL[cap]} providers
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              {providersFor(cap)
                // show each provider only under its first capability to avoid dupes
                .filter((p) => p.capabilities[0] === cap)
                .map((p) => (
                  <ProviderRow
                    key={p.id}
                    provider={p}
                    configured={configured.has(p.id)}
                    onChanged={() =>
                      queryClient.invalidateQueries({
                        queryKey: ["providerKeys"],
                      })
                    }
                  />
                ))}
              {providersFor(cap).filter((p) => p.capabilities[0] === cap).length === 0 && (
                <p className="text-xs text-muted">Covered by multi-capability providers above.</p>
              )}
            </CardContent>
          </Card>
        ))}

        <p className="text-[11px] text-muted">
          {PROVIDERS.length} providers in the catalog ·{" "}
          {PROVIDERS.filter((p) => p.status === "wired").length} wired today ·{" "}
          {PROVIDERS.filter((p) => p.status === "manual").length} manual / prompt-export ·{" "}
          {PROVIDERS.filter((p) => p.status === "planned").length} adapters planned.
        </p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: ProviderInfo["status"] }) {
  if (status === "wired") return <Badge variant="success">Wired</Badge>;
  if (status === "manual") return <Badge variant="primary">Manual</Badge>;
  return <Badge>Planned</Badge>;
}

function ProviderRow({
  provider,
  configured,
  onChanged,
}: {
  provider: ProviderInfo;
  configured: boolean;
  onChanged: () => void;
}) {
  const [value, setValue] = useState("");

  const save = useMutation({
    // Strip ALL whitespace — no API key contains any, and a stray space/newline
    // sneaking in on paste is a common cause of 401s.
    mutationFn: () => api.setProviderKey(provider.id, value.replace(/\s/g, "")),
    onSuccess: () => {
      setValue("");
      onChanged();
    },
  });

  const clear = useMutation({
    mutationFn: () => api.clearProviderKey(provider.id),
    onSuccess: onChanged,
  });

  return (
    <div className="flex flex-col gap-2 border-b border-border pb-5 last:border-0 last:pb-0">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{provider.name}</span>
            <StatusBadge status={provider.status} />
            {configured ? (
              <Badge variant="success">
                <Check className="mr-1 h-3 w-3" /> Key set
              </Badge>
            ) : (
              <Badge>No key</Badge>
            )}
          </div>
          <span className="text-[11px] text-muted">
            {provider.capabilities.map((c) => CAPABILITY_LABEL[c]).join(" · ")} · {provider.hint}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Label className="sr-only">{provider.name} key</Label>
          <Input
            type="password"
            placeholder={configured ? "•••••••• (saved)" : provider.hint}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
        <Button
          variant="secondary"
          size="sm"
          disabled={value.trim().length === 0 || save.isPending}
          onClick={() => save.mutate()}
        >
          Save
        </Button>
        {configured && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => clear.mutate()}
            disabled={clear.isPending}
          >
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}

/** About + version info, with an honest note on updates. */
function AboutCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-4 w-4 text-primary" /> About
        </CardTitle>
        <CardDescription>App version, build, and how updates work.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="grad-primary flex h-10 w-10 items-center justify-center rounded-xl">
            <Film className="h-5 w-5 text-white" />
          </span>
          <div>
            <div className="text-sm font-semibold">Director Studio</div>
            <div className="text-xs text-muted">
              Version {__APP_VERSION__} · {isTauri ? "Desktop (Tauri)" : "Browser preview"}
            </div>
          </div>
        </div>
        <div className="rounded-[var(--radius-card)] border border-border bg-elevated/40 p-3 text-[11px] text-muted">
          <p className="mb-1 font-medium text-foreground">Updates</p>
          <p>
            This build updates manually: download the latest installer and run it over your current
            install — your productions, bibles, and settings are preserved. Automatic updates
            require a code-signed release channel (a signing certificate and an update host), which
            isn't configured for this build.
          </p>
        </div>
        <p className="text-[11px] text-muted">
          Local-first: all planning runs on your machine; provider keys live in the OS keychain and
          never reach the frontend.
        </p>
      </CardContent>
    </Card>
  );
}

/** Session snapshots — manual restore points captured by the autosave heartbeat. */
function SnapshotsCard() {
  const confirm = useConfirm();
  const [snaps, setSnaps] = useState<Snapshot[]>(() => loadSnapshots());
  const refresh = () => setSnaps(loadSnapshots());

  const restore = async (s: Snapshot) => {
    if (
      await confirm({
        title: `Restore the snapshot from ${new Date(s.ts).toLocaleString()}?`,
        body: "This replaces your current production state.",
        confirmLabel: "Restore",
        destructive: true,
      })
    ) {
      restoreSnapshot(s.id);
      window.location.reload();
    }
  };
  const remove = (s: Snapshot) => {
    deleteSnapshot(s.id);
    refresh();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-4 w-4 text-primary" /> Session snapshots
        </CardTitle>
        <CardDescription>
          Your work autosaves continuously. These restore points are captured automatically — roll
          back to any of them if something goes wrong.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {snaps.length === 0 ? (
          <p className="text-xs text-muted">No snapshots yet — they appear here as you work.</p>
        ) : (
          snaps.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between gap-3 rounded-[var(--radius-button)] border border-border px-3 py-2"
            >
              <div className="min-w-0">
                <div className="text-sm">{new Date(s.ts).toLocaleString()}</div>
                <div className="text-[11px] text-muted">
                  {s.reason} · {Object.keys(s.data).length} items
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button variant="secondary" size="sm" onClick={() => restore(s)}>
                  <RotateCcw className="h-3.5 w-3.5" /> Restore
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => remove(s)}
                  aria-label="Delete snapshot"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
