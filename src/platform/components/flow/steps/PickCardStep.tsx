import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { Badge } from "@/platform/components/ui/badge";
import { cn } from "@/platform/lib/utils";

export interface PickCardOption {
  id: string;
  title: string;
  description?: string;
  badge?: string;
  icon?: ReactNode;
}

interface PickCardStepProps {
  options: PickCardOption[];
  value?: string;
  onChange: (id: string) => void;
  columns?: 2 | 3 | 4;
}

export function PickCardStep({
  options,
  value,
  onChange,
  columns = 3,
}: PickCardStepProps) {
  return (
    <div
      className={cn(
        "grid gap-3",
        columns === 2 && "md:grid-cols-2",
        columns === 3 && "md:grid-cols-3",
        columns === 4 && "md:grid-cols-2 xl:grid-cols-4"
      )}
    >
      {options.map((option) => {
        const selected = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={cn(
              "group min-h-40 overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface text-left transition duration-200 hover:-translate-y-0.5 hover:border-primary/50",
              selected && "border-primary bg-primary/10"
            )}
          >
            <span className="creative-preview flex h-16 items-center justify-between border-b border-border px-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-black/15 text-[var(--module-accent)]">{option.icon ?? <span className="text-sm font-bold">{option.title.slice(0, 2).toUpperCase()}</span>}</span>
              {option.badge ? <Badge variant={selected ? "primary" : "default"}>{option.badge}</Badge> : null}
            </span>
            <span className="flex items-start justify-between gap-3 p-4">
              <span className="flex items-center gap-2 text-sm font-semibold">
                {option.title}
              </span>
              {selected ? <Check className="size-4 text-primary" /> : null}
            </span>
            {option.description ? (
              <span className="-mt-2 block px-4 pb-4 text-xs leading-5 text-muted">
                {option.description}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
