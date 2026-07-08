import { Upload } from "lucide-react";
import { Badge } from "@/platform/components/ui/badge";

interface MediaIntakeStepProps {
  title?: string;
  hint?: string;
  acceptedTypes?: string;
  files?: string[];
  onFiles?: (files: File[]) => void;
}

export function MediaIntakeStep({
  title = "Add media",
  hint = "Drop in reference files, brand material, audio, or images for this project.",
  acceptedTypes,
  files = [],
  onFiles,
}: MediaIntakeStepProps) {
  return (
    <div className="rounded-[var(--radius-card)] border border-dashed border-border bg-elevated/40 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="mt-1 max-w-xl text-sm text-muted">{hint}</p>
        </div>
        <label>
          <input
            type="file"
            accept={acceptedTypes}
            multiple
            className="sr-only"
            onChange={(event) => {
              const picked = Array.from(event.target.files ?? []);
              if (picked.length) onFiles?.(picked);
            }}
          />
          <span className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-button)] border border-border bg-elevated px-4 text-sm font-medium text-foreground transition hover:border-primary/40 hover:bg-elevated/70 [&_svg]:size-4">
            <Upload /> Select files
          </span>
        </label>
      </div>
      {files.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {files.map((file) => (
            <Badge key={file}>{file}</Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}
