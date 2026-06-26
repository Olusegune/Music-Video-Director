import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  KeyRound,
  ShieldCheck,
  Plug,
  Check,
  X,
  Save,
  Trash2,
  Loader2,
  Power,
  AlertTriangle,
  ImageIcon,
  Video,
  Mic2,
} from "lucide-react";
import { api, isTauri } from "@/lib/ipc";
import type { ConnectionStatus, ProviderId } from "@/lib/types";
import {
  PROVIDERS,
  CAPABILITY_LABEL,
  type Capability,
  type ProviderInfo,
} from "@/lib/providers";
import {
  getMeta,
  recordTest,
  setMeta,
  type ProviderMeta,
  capabilitiesFor,
} from "@/lib/providerMeta";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const CAP_ORDER: Capability[] = ["text", "image", "video", "audio"];

type Display = ConnectionStatus;

const STATUS: Record<
  Display,
  { label: string; dot: string; text: string }
> = {
  connected: { label: "Connected", dot: "bg-success", text: "text-success" },
  invalid: { label: "Invalid Key", dot: "bg-danger", text: "text-danger" },
  offline: { label: "Offline", dot: "bg-warning", text: "text-warning" },
  untested: { label: "Configured", dot: "bg-accent", text: "text-accent" },
  not_configured: { label: "Not Configured", dot: "bg-muted", text: "text-muted" },
};

function displayStatus(configured: boolean, meta: ProviderMeta): Display {
  if (!configured) return "not_configured";
  return meta.lastStatus ?? "untested";
}

function relativeTime(iso?: string): string {
  if (!iso) return "never tested";
  const then = new Date(iso).getTime();
  const secs = Math.round((Date.now() - then) / 1000);
  if (secs < 60) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString();
}

export function ApiKeyDashboard() {
  const queryClient = useQueryClient();
  const { data: statuses = [] } = useQuery({
    queryKey: ["providerKeys"],
    queryFn: api.getProviderKeyStatuses,
  });

  // A bump forces cards to re-read provider meta (localStorage) after writes.
  const [tick, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);

  const configured = useMemo(
    () => new Set(statuses.filter((s) => s.configured).map((s) => s.provider)),
    [statuses]
  );

  const invalidateKeys = () =>
    queryClient.invalidateQueries({ queryKey: ["providerKeys"] });

  const connectedCount = PROVIDERS.filter(
    (p) => configured.has(p.id) && getMeta(p.id).lastStatus === "connected"
  ).length;

  // `tick` is read so the header counts recompute after a card reports a change.
  void tick;

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border px-8 py-5">
        <div>
          <h1 className="text-lg font-semibold">API Keys</h1>
          <p className="text-xs text-muted">
            Connect your providers. Keys are encrypted in the OS vault and never
            leave the Rust core.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-success" />
            {connectedCount} connected
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-accent" />
            {configured.size} with keys
          </span>
          <span>· {PROVIDERS.length} providers</span>
        </div>
      </header>

      <div className="space-y-6 p-8">
        <div className="flex items-start gap-2 rounded-[var(--radius-card)] border border-border bg-elevated/40 p-3 text-xs text-muted">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
          <span>
            {isTauri
              ? "Keys are stored in the Windows Credential Manager. They are never logged, never sent to the frontend, and only ever transmitted to that provider’s own API."
              : "Browser preview stores mock keys in localStorage and can’t run live connection tests. The packaged desktop app uses the OS keychain and tests keys for real."}
          </span>
        </div>

        <MvReadiness configured={configured} />

        {CAP_ORDER.map((cap) => {
          const group = PROVIDERS.filter((p) => p.capabilities[0] === cap);
          if (group.length === 0) return null;
          return (
            <section key={cap}>
              <h2 className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
                <Plug className="h-3.5 w-3.5" /> {CAPABILITY_LABEL[cap]}
              </h2>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
                {group.map((p) => (
                  <ProviderCard
                    key={p.id}
                    provider={p}
                    configured={configured.has(p.id)}
                    onKeysChanged={() => {
                      invalidateKeys();
                      refresh();
                    }}
                    onMetaChanged={refresh}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

/** Music-video pipeline readiness — which capabilities the MV flow can run. */
function MvReadiness({ configured }: { configured: Set<string> }) {
  const needs: {
    cap: Capability;
    label: string;
    desc: string;
    icon: React.ReactNode;
  }[] = [
    { cap: "image", label: "Frames", desc: "Still frame per shot", icon: <ImageIcon className="h-4 w-4" /> },
    { cap: "video", label: "Clips", desc: "Per-shot video", icon: <Video className="h-4 w-4" /> },
    { cap: "audio", label: "Voice", desc: "Spoken layers", icon: <Mic2 className="h-4 w-4" /> },
  ];

  const status = needs.map((n) => {
    const providers = PROVIDERS.filter(
      (p) => p.capabilities.includes(n.cap) && p.status === "wired"
    );
    const ready = providers.filter((p) => configured.has(p.id));
    return { ...n, ready, count: ready.length };
  });

  const readyCount = status.filter((s) => s.count > 0).length;

  return (
    <section>
      <h2 className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
        <KeyRound className="h-3.5 w-3.5" /> Music-video readiness
        <span className="font-normal normal-case text-muted">
          — {readyCount}/3 capabilities ready
        </span>
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {status.map((s) => (
          <div
            key={s.cap}
            className={cn(
              "flex items-center gap-3 rounded-[var(--radius-card)] border p-3",
              s.count > 0
                ? "border-success/40 bg-success/5"
                : "border-warning/40 bg-warning/5"
            )}
          >
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                s.count > 0 ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
              )}
            >
              {s.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-sm font-semibold">
                {s.label}
                {s.count > 0 ? (
                  <Check className="h-3.5 w-3.5 text-success" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                )}
              </div>
              <p className="truncate text-[11px] text-muted">
                {s.count > 0
                  ? `${s.ready.map((p) => p.name).join(", ")}`
                  : `${s.desc} — add a key below`}
              </p>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-muted">
        {readyCount === 3
          ? "All set — the MV Director can generate frames, clips, and voice. Final render also needs FFmpeg installed."
          : "Add at least one key per capability to unlock generation in the MV Director. Planning (Song Brain, Director, Choreography, Timeline) works with no keys."}
      </p>
    </section>
  );
}

function ProviderCard({
  provider,
  configured,
  onKeysChanged,
  onMetaChanged,
}: {
  provider: ProviderInfo;
  configured: boolean;
  onKeysChanged: () => void;
  onMetaChanged: () => void;
}) {
  const [meta, setMetaState] = useState<ProviderMeta>(() => getMeta(provider.id));
  const [value, setValue] = useState("");
  // Configured providers show a masked key until the user chooses to edit;
  // unconfigured ones fall through to the input via the render condition below.
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState<null | "save" | "clear" | "test">(null);
  const [testMsg, setTestMsg] = useState<string | null>(null);

  const status = displayStatus(configured, meta);
  const s = STATUS[status];
  const enabled = meta.enabled;

  const save = async () => {
    const key = value.replace(/\s/g, "");
    if (!key) return;
    setBusy("save");
    try {
      await api.setProviderKey(provider.id as ProviderId, key);
      setValue("");
      setEditing(false);
      onKeysChanged();
    } finally {
      setBusy(null);
    }
  };

  const clear = async () => {
    setBusy("clear");
    try {
      await api.clearProviderKey(provider.id as ProviderId);
      setMeta(provider.id, { lastStatus: undefined });
      setMetaState(getMeta(provider.id));
      setTestMsg(null);
      setEditing(false);
      onKeysChanged();
    } finally {
      setBusy(null);
    }
  };

  const test = async () => {
    setBusy("test");
    setTestMsg(null);
    try {
      const result = await api.testProviderConnection(provider.id as ProviderId);
      recordTest(provider.id, result.status);
      setMetaState(getMeta(provider.id));
      setTestMsg(result.message);
      onMetaChanged();
    } finally {
      setBusy(null);
    }
  };

  const toggleEnabled = () => {
    setMeta(provider.id, { enabled: !enabled });
    setMetaState(getMeta(provider.id));
    onMetaChanged();
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-[var(--radius-card)] border bg-surface p-4 shadow-card transition-opacity",
        enabled ? "border-border" : "border-border/60 opacity-55"
      )}
    >
      {/* Header: name + status */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold">{provider.name}</span>
            {provider.status === "manual" && (
              <Badge variant="primary">Manual</Badge>
            )}
            {provider.status === "planned" && <Badge>Planned</Badge>}
          </div>
          <p className="truncate text-[11px] text-muted">{provider.hint}</p>
          {capabilitiesFor(provider.id).length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {capabilitiesFor(provider.id).map((c) => (
                <span
                  key={c}
                  className="rounded bg-elevated px-1.5 py-0.5 text-[9px] font-medium text-muted"
                >
                  {c}
                </span>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={toggleEnabled}
          title={enabled ? "Disable provider" : "Enable provider"}
          aria-label={enabled ? "Disable provider" : "Enable provider"}
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition-colors",
            enabled
              ? "border-success/40 bg-success/10 text-success"
              : "border-border text-muted hover:text-foreground"
          )}
        >
          <Power className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Status row */}
      <div className="flex items-center justify-between">
        <span className={cn("flex items-center gap-1.5 text-xs font-medium", s.text)}>
          <span className={cn("h-2 w-2 rounded-full", s.dot)} />
          {s.label}
        </span>
        <span className="text-[11px] text-muted">
          {status === "connected" && meta.lastConnectedAt
            ? `Tested ${relativeTime(meta.lastConnectedAt)}`
            : configured
              ? `Last test: ${relativeTime(meta.lastCheckedAt)}`
              : "—"}
        </span>
      </div>

      {/* Key control */}
      {configured && !editing ? (
        <div className="flex items-center gap-2">
          <Input
            type="password"
            value="••••••••••••"
            readOnly
            aria-label={`${provider.name} key (saved)`}
            className="flex-1 text-muted"
          />
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            Edit
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Label className="sr-only">{provider.name} key</Label>
          <Input
            type="password"
            placeholder={provider.hint}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            className="flex-1"
          />
          <Button
            size="sm"
            onClick={save}
            disabled={value.trim().length === 0 || busy === "save"}
          >
            {busy === "save" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save
          </Button>
          {configured && (
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={test}
          disabled={!configured || busy === "test"}
        >
          {busy === "test" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plug className="h-4 w-4" />
          )}
          Test Connection
        </Button>
        {configured && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clear}
            disabled={busy === "clear"}
            className="text-muted hover:text-danger"
            aria-label="Delete key"
          >
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        )}
      </div>

      {/* Test message */}
      {testMsg && (
        <p
          className={cn(
            "flex items-start gap-1.5 rounded-md px-2 py-1.5 text-[11px]",
            status === "connected"
              ? "bg-success/10 text-success"
              : status === "invalid"
                ? "bg-danger/10 text-danger"
                : "bg-elevated text-muted"
          )}
        >
          {status === "connected" ? (
            <Check className="mt-px h-3.5 w-3.5 shrink-0" />
          ) : status === "invalid" ? (
            <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
          ) : (
            <KeyRound className="mt-px h-3.5 w-3.5 shrink-0" />
          )}
          {testMsg}
        </p>
      )}
    </div>
  );
}
