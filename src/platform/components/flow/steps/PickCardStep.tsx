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
  imageUrl?: string;
  imageAlt?: string;
  visual?: ReactNode;
}

interface PickCardStepProps {
  options: PickCardOption[];
  value?: string;
  onChange: (id: string) => void;
  columns?: 2 | 3 | 4;
}

export function PickCardStep({ options, value, onChange, columns = 3 }: PickCardStepProps) {
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
            <span className="creative-preview relative flex h-24 items-center justify-between border-b border-border px-4">
              {option.imageUrl ? (
                <img
                  src={option.imageUrl}
                  alt={option.imageAlt ?? ""}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : option.visual ? (
                <span className="absolute inset-0">{option.visual}</span>
              ) : null}
              <span className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-black/25 text-[var(--module-accent)] backdrop-blur">
                {option.icon ?? (
                  <span className="text-sm font-bold">
                    {option.title.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </span>
              {option.badge ? (
                <Badge className="relative" variant={selected ? "primary" : "default"}>
                  {option.badge}
                </Badge>
              ) : null}
            </span>
            <span className="flex items-start justify-between gap-3 p-4">
              <span className="flex items-center gap-2 text-sm font-semibold">{option.title}</span>
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
