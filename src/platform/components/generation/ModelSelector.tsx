import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { SlidersHorizontal } from "lucide-react";
import { api } from "@/platform/lib/ipc";
import type { ProviderId } from "@/platform/lib/types";
import { useAppStore } from "@/platform/store/useAppStore";
import { cn } from "@/platform/lib/utils";
import {
  loadRouterConfig,
  providerInfo,
  routeProviderChain,
  savePreferredAggregator,
  type Capability,
} from "@/platform/lib/providers";

export function ModelSelector({
  capability,
  modelHint,
  providerPref,
  onProviderChange,
  className,
}: {
  capability: Capability;
  modelHint?: string;
  providerPref?: ProviderId;
  onProviderChange?: (provider: ProviderId | undefined) => void;
  className?: string;
}) {
  const studioMode = useAppStore((state) => state.studioMode);
  const router = useMemo(() => loadRouterConfig(), []);
  const { data: keyStatuses = [] } = useQuery({
    queryKey: ["providerKeys"],
    queryFn: api.getProviderKeyStatuses,
  });
  const configured = useMemo(
    () =>
      new Set(
        keyStatuses
          .filter((status) => status.configured)
          .map((status) => status.provider as ProviderId)
      ),
    [keyStatuses]
  );
  const chain = routeProviderChain(capability, router, configured, { providerPref, modelHint });

  if (studioMode === "director") return null;

  const value = providerPref ?? chain[0] ?? "";
  return (
    <label className={cn("block", className)}>
      <span className="mb-1 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted">
        <SlidersHorizontal className="h-3 w-3" />
        {studioMode === "creator" ? "Provider / fallback" : "Generation style"}
      </span>
      <select
        value={value}
        onChange={(event) => {
          const next = event.target.value as ProviderId;
          if (modelHint && next) savePreferredAggregator(modelHint, next);
          onProviderChange?.(next || undefined);
        }}
        className="h-8 w-full rounded-[var(--radius-input)] border border-border bg-surface px-2 text-xs text-foreground focus-visible:border-primary focus-visible:outline-none"
      >
        {chain.length === 0 ? (
          <option value="">Local prompt-only</option>
        ) : (
          chain.map((provider) => (
            <option key={provider} value={provider}>
              {providerInfo(provider)?.name ?? provider}
            </option>
          ))
        )}
      </select>
      {studioMode === "creator" && chain.length > 1 ? (
        <p className="mt-1 text-[10px] text-muted">
          Fallback: {chain.map((provider) => providerInfo(provider)?.name ?? provider).join(" -> ")}
        </p>
      ) : null}
    </label>
  );
}
