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
              "min-h-32 rounded-[var(--radius-card)] border border-border bg-surface p-4 text-left transition hover:border-primary/50 hover:bg-elevated",
              selected && "border-primary bg-primary/10"
            )}
          >
            <span className="mb-3 flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm font-semibold">
                {option.icon}
                {option.title}
              </span>
              {selected ? <Check className="size-4 text-primary" /> : null}
            </span>
            {option.description ? (
              <span className="block text-xs leading-5 text-muted">
                {option.description}
              </span>
            ) : null}
            {option.badge ? (
              <Badge className="mt-3" variant={selected ? "primary" : "default"}>
                {option.badge}
              </Badge>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
