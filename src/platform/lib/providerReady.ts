// Provider readiness — which capability keys are actually configured, so the MV
// flow can annotate model pickers and gate generate buttons instead of failing
// only at call time.
//
// In the browser (no Rust backend) generation runs against local placeholders
// regardless of keys, so `isReady` stays true there — the annotations still show
// the real configured state, but nothing gets disabled and the app stays usable.

import { useQuery } from "@tanstack/react-query";
import { api, isTauri } from "@/platform/lib/ipc";

export interface ProviderReadiness {
  /** Provider ids with a stored key. */
  configured: Set<string>;
  /** Whether any of these provider keys is configured (real status). */
  isConfigured: (keyIds: string[]) => boolean;
  /** Whether generation should be allowed (true in browser / while loading). */
  isReady: (keyIds: string[]) => boolean;
  loading: boolean;
}

export function useProviderReadiness(): ProviderReadiness {
  const { data } = useQuery({
    queryKey: ["providerKeyStatuses"],
    queryFn: api.getProviderKeyStatuses,
  });

  const configured = new Set<string>(
    (data ?? []).filter((s) => s.configured).map((s) => s.provider)
  );
  const loading = !data;

  const isConfigured = (keyIds: string[]) =>
    keyIds.some((id) => configured.has(id));

  // Optimistic: allow generation in the browser, and while statuses load.
  const isReady = (keyIds: string[]) =>
    !isTauri || loading || isConfigured(keyIds);

  return { configured, isConfigured, isReady, loading };
}
