import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/platform/components/ui/button";
import { Badge } from "@/platform/components/ui/badge";

interface GenerateStepProps {
  title: string;
  description?: string;
  status?: "idle" | "running" | "complete";
  score?: number;
  versions?: string[];
  onGenerate: () => void;
}

export function GenerateStep({
  title,
  description,
  status = "idle",
  score,
  versions = [],
  onGenerate,
}: GenerateStepProps) {
  const running = status === "running";
  return (
    <div className="space-y-4">
      <div className="rounded-[var(--radius-card)] border border-border bg-elevated/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">{title}</h3>
            {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
          </div>
          <Button onClick={onGenerate} disabled={running}>
            {running ? <Loader2 className="animate-spin" /> : <Sparkles />}
            {running ? "Generating" : "Generate"}
          </Button>
        </div>
        {typeof score === "number" ? (
          <Badge className="mt-4" variant={score >= 80 ? "success" : "warning"}>
            Score {score}
          </Badge>
        ) : null}
      </div>
      {versions.length ? (
        <div className="grid gap-2">
          {versions.map((version) => (
            <div
              key={version}
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm"
            >
              {version}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
