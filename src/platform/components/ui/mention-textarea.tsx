import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/platform/lib/ipc";
import { buildAssetRefs } from "@/platform/lib/assets";
import { AssetImage } from "@/platform/components/ui/asset-image";
import { cn } from "@/platform/lib/utils";

export interface MentionOption {
  label: string;
  src: string;
  kind: string;
}

/**
 * A textarea with `@asset` autocomplete. Type `@` then a name to pull up the
 * project's Characters / Environments / Props; selecting one inserts `@Name`
 * into the text AND calls `onAttach(src)` so the asset's image becomes a
 * generation reference. Self-loads the asset libraries (shared source of truth).
 */
export function MentionTextarea({
  value,
  onChange,
  onMention,
  onBlur,
  placeholder,
  className,
  ariaLabel,
  rows = 2,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  /** Called when an asset is picked: apply the new text AND attach src atomically.
   *  Omit for insert-only fields (the mention text is added, nothing attached). */
  onMention?: (value: string, src: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
  rows?: number;
  autoFocus?: boolean;
}) {
  const { data: characters = [] } = useQuery({
    queryKey: ["characters"],
    queryFn: api.listCharacters,
  });
  const { data: environments = [] } = useQuery({
    queryKey: ["environments"],
    queryFn: api.listEnvironments,
  });
  const { data: props = [] } = useQuery({ queryKey: ["props"], queryFn: api.listProps });

  // One option per named asset (hero image), deduped by label.
  const options: MentionOption[] = useMemo(() => {
    const refs = buildAssetRefs(characters, environments, props);
    const byLabel = new Map<string, MentionOption>();
    for (const r of refs) {
      if (!byLabel.has(r.label)) byLabel.set(r.label, { label: r.label, src: r.src, kind: r.kind });
    }
    return [...byLabel.values()];
  }, [characters, environments, props]);

  const ref = useRef<HTMLTextAreaElement>(null);
  const [query, setQuery] = useState<string | null>(null); // active @token, or null
  const [start, setStart] = useState(0); // index of the '@'

  const matches =
    query === null
      ? []
      : options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase())).slice(0, 6);

  const onInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    onChange(v);
    const caret = e.target.selectionStart ?? v.length;
    // Find an '@token' immediately before the caret (letters, digits, spaces).
    const before = v.slice(0, caret);
    const m = before.match(/@([\w][\w ]*)?$/);
    if (m) {
      setStart(caret - m[0].length);
      setQuery(m[1] ?? "");
    } else {
      setQuery(null);
    }
  };

  const choose = (o: MentionOption) => {
    const el = ref.current;
    const caret = el?.selectionStart ?? value.length;
    const next = `${value.slice(0, start)}@${o.label} ${value.slice(caret)}`;
    if (onMention) onMention(next, o.src);
    else onChange(next);
    setQuery(null);
    // Restore focus + caret after the inserted mention.
    requestAnimationFrame(() => {
      if (el) {
        const pos = start + o.label.length + 2;
        el.focus();
        el.setSelectionRange(pos, pos);
      }
    });
  };

  return (
    <div className="relative">
      <textarea
        ref={ref}
        value={value}
        onChange={onInput}
        onBlur={() =>
          setTimeout(() => {
            setQuery(null);
            onBlur?.();
          }, 150)
        }
        autoFocus={autoFocus}
        placeholder={placeholder}
        aria-label={ariaLabel}
        rows={rows}
        className={cn(
          "w-full resize-y rounded-[var(--radius-input)] border border-border bg-surface px-2 py-1.5 text-sm text-foreground placeholder:text-muted focus-visible:border-primary focus-visible:outline-none",
          className
        )}
      />
      {query !== null && matches.length > 0 && (
        <div className="absolute z-50 mt-1 w-64 overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface shadow-card">
          <div className="px-2.5 py-1 text-[10px] uppercase tracking-wide text-muted">
            Insert asset reference
          </div>
          {matches.map((o) => (
            <button
              key={o.label}
              // onMouseDown (not onClick) so it fires before the textarea blur.
              onMouseDown={(e) => {
                e.preventDefault();
                choose(o);
              }}
              className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-sm hover:bg-elevated"
            >
              <span className="h-7 w-7 shrink-0 overflow-hidden rounded bg-elevated">
                <AssetImage src={o.src} alt={o.label} className="h-7 w-7 object-cover" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{o.label}</span>
                <span className="block text-[10px] text-muted">{o.kind}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
