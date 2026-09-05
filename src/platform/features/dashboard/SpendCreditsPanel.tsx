import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, ChevronDown, ChevronUp, Info } from "lucide-react";
import { api } from "@/platform/lib/ipc";
import { PROVIDERS_WITH_REAL_BALANCE } from "@/platform/lib/pricing";
import type { UsageEntry } from "@/platform/lib/types";

function startOfMonthIso(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

function fmtUsd(n: number): string {
  return n < 0.01 && n > 0
    ? "<$0.01"
    : n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

/** Dashboard's spend visibility: a self-tracked running total (every
 *  provider, estimated from pricing.ts — no provider returns exact per-call
 *  cost) plus real account balance for the couple of providers that expose
 *  one through their generation API key. Neither number is hidden from the
 *  other — they're labeled so it's clear which is which. */
export function SpendCreditsPanel() {
  const [expanded, setExpanded] = useState(false);
  const since = useMemo(startOfMonthIso, []);

  const { data: usage = [], isLoading } = useQuery({
    queryKey: ["usage", since],
    queryFn: () => api.listUsage(since),
    refetchInterval: 30_000,
  });

  const balanceProviders = Array.from(PROVIDERS_WITH_REAL_BALANCE);
  const balances = useQuery({
    queryKey: ["provider-balances"],
    queryFn: async () => {
      const results = await Promise.all(
        balanceProviders.map((p) => api.checkProviderBalance(p).catch(() => null))
      );
      return results.filter((r): r is NonNullable<typeof r> => r !== null);
    },
    staleTime: 60_000,
  });

  const totalUsd = usage.reduce((sum, e) => sum + e.costUsd, 0);
  const byProvider = useMemo(() => {
    const map = new Map<string, { costUsd: number; count: number }>();
    for (const e of usage as UsageEntry[]) {
      const cur = map.get(e.provider) ?? { costUsd: 0, count: 0 };
      cur.costUsd += e.costUsd;
      cur.count += 1;
      map.set(e.provider, cur);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].costUsd - a[1].costUsd);
  }, [usage]);

  return (
    <section className="rounded-[var(--radius-card)] border border-border bg-surface shadow-card">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left"
      >
        <div className="grad-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
          <DollarSign className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">Spend this month</h2>
            <span
              className="rounded-full border border-border bg-elevated px-2 py-0.5 text-[10px] text-muted"
              title="Estimated from a per-model pricing table — providers don't return exact per-call cost. Not an invoice."
            >
              estimated
            </span>
          </div>
          <p className="text-xs text-muted">
            {isLoading ? "Loading…" : `${fmtUsd(totalUsd)} across ${usage.length} generation${usage.length === 1 ? "" : "s"}`}
          </p>
        </div>
        {balances.data && balances.data.length > 0 && (
          <div className="hidden items-center gap-2 sm:flex">
            {balances.data.map((b) => (
              <span
                key={b.provider}
                className="rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-[11px] text-success"
                title={`${b.label} — real account balance`}
              >
                {b.label}: {b.remaining.toLocaleString()} {b.unit}
              </span>
            ))}
          </div>
        )}
        {expanded ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-muted" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-border px-5 py-4">
          {byProvider.length === 0 ? (
            <p className="text-xs text-muted">No generations logged yet this month.</p>
          ) : (
            <div className="space-y-2">
              {byProvider.map(([provider, { costUsd, count }]) => {
                const pct = totalUsd > 0 ? (costUsd / totalUsd) * 100 : 0;
                const hasRealBalance = PROVIDERS_WITH_REAL_BALANCE.has(provider);
                return (
                  <div key={provider} className="flex items-center gap-3 text-xs">
                    <span className="w-28 shrink-0 truncate font-medium capitalize">
                      {provider}
                      {hasRealBalance && (
                        <span
                          className="ml-1 text-success"
                          title="This provider also has a real balance shown above"
                        >
                          •
                        </span>
                      )}
                    </span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-elevated">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.max(2, pct)}%` }}
                      />
                    </div>
                    <span className="w-20 shrink-0 text-right text-muted">{count} gen</span>
                    <span className="w-16 shrink-0 text-right font-medium">{fmtUsd(costUsd)}</span>
                  </div>
                );
              })}
            </div>
          )}
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-border bg-elevated/50 p-3 text-[11px] leading-relaxed text-muted">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <p>
              Estimated from typical published pricing per model — not every provider returns
              exact per-call cost, so treat this as directional, not an invoice.{" "}
              {balanceProviders.length > 0 && (
                <>
                  {balances.data?.length
                    ? "Providers marked with a dot above also show a real account balance."
                    : "Add a Stability AI or ElevenLabs key to see a real account balance alongside the estimate."}
                </>
              )}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
