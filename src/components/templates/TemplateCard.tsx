// Visual template/style picker card — used by Magic Mode's "Style" step and
// (later) the Templates page redesign. Image-first: a real photo/render at
// `/style-art/<template.id>.{jpg,png}` is tried automatically; if it 404s (no
// art supplied yet), a clean gradient placeholder in the template's own accent
// color renders instead — so dropping in real art later needs zero code
// changes, just a file at the right path.

import { useState } from "react";
import { Palette } from "lucide-react";
import type { MvTemplate } from "@/lib/templates";
import { cn } from "@/lib/utils";

const EXTENSIONS = ["jpg", "jpeg", "png", "webp"];

/**
 * The canonical hero image for a template/style: tries real art at
 * `/style-art/<id>.<ext>` first, falls back to an accent-colored gradient with
 * a placeholder icon. Shared by the Style step picker and the Templates page
 * so there is exactly one "what does this card's image look like" answer in
 * the app — drop in real art later with zero code changes.
 */
export function TemplateHeroImage({
  template,
  className,
  overlay,
}: {
  template: MvTemplate;
  className?: string;
  /** Extra content layered over the image (e.g. a genre icon badge). */
  overlay?: React.ReactNode;
}) {
  // Try each extension in turn; only fall back to the placeholder once all fail.
  const [extIndex, setExtIndex] = useState(0);
  const exhausted = extIndex >= EXTENSIONS.length;
  const src = exhausted ? undefined : `/style-art/${template.id}.${EXTENSIONS[extIndex]}`;

  return (
    <div
      className={cn("group relative aspect-[3/2] w-full shrink-0 overflow-hidden", className)}
      style={
        exhausted
          ? { background: `linear-gradient(145deg, ${template.accent}55, ${template.accent}15)` }
          : undefined
      }
    >
      {!exhausted && (
        <img
          key={src}
          src={src}
          alt=""
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={() => setExtIndex((i) => i + 1)}
        />
      )}
      {exhausted && (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1">
          <Palette className="h-5 w-5" style={{ color: template.accent }} />
          <span
            className="rounded-full border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-muted"
            style={{ borderColor: `${template.accent}55` }}
          >
            Add art
          </span>
        </div>
      )}
      <span className="absolute left-1.5 top-1.5 rounded-full bg-background/80 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-foreground backdrop-blur">
        {template.category}
      </span>
      {overlay}
    </div>
  );
}

export function TemplateCard({
  template,
  active,
  onClick,
}: {
  template: MvTemplate;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex flex-col overflow-hidden rounded-[var(--radius-card)] border text-left transition-colors",
        active ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/40"
      )}
    >
      <TemplateHeroImage template={template} />

      <div className="flex flex-col gap-1 p-2.5">
        <span className="text-sm font-semibold leading-tight">{template.name}</span>
        <span className="line-clamp-2 text-[11px] leading-snug text-muted">
          {template.tagline}
        </span>
        {template.palette.length > 0 && (
          <div className="mt-0.5 flex items-center gap-1">
            {template.palette.slice(0, 5).map((c, i) => (
              <span
                key={i}
                className="h-2.5 w-2.5 rounded-full border border-border/50"
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        )}
      </div>
    </button>
  );
}

export function NoStyleCard({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col overflow-hidden rounded-[var(--radius-card)] border text-left transition-colors",
        active ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/40"
      )}
    >
      <div className="flex aspect-[3/2] w-full shrink-0 items-center justify-center bg-elevated/60">
        <Palette className="h-5 w-5 text-muted" />
      </div>
      <div className="flex flex-col gap-1 p-2.5">
        <span className="text-sm font-semibold leading-tight">No style</span>
        <span className="text-[11px] leading-snug text-muted">Neutral cinematic</span>
      </div>
    </button>
  );
}
