// Visual template/style picker card — used by Magic Mode's "Style" step and
// the Templates page. Image-first: a real photo/render at
// `/style-art/<template.id>.{jpg,png}` is tried automatically; if it 404s (no
// art supplied yet), a premium gradient treatment in the template's own accent
// color renders instead — so dropping in real art later needs zero code
// changes, just a file at the right path. The fallback is designed to read as
// a finished, intentional visual, not an empty/upload state.

import { useState } from "react";
import {
  Palette,
  Sparkles,
  Music,
  Clapperboard,
  Drama,
  type LucideIcon,
} from "lucide-react";
import type { MvTemplate } from "@/platform/lib/templates";
import { cn } from "@/platform/lib/utils";

const CATEGORY_ICON: Record<string, LucideIcon> = {
  Genre: Music,
  Style: Sparkles,
  Format: Clapperboard,
};

function categoryIcon(category?: string) {
  return CATEGORY_ICON[category ?? ""] ?? Drama;
}

// jpg first — every shipped card image is a downscaled .jpg in public/style-art
// (full-res art would bloat the bundle/exe by ~130MB), so the first request
// hits and there's no 404 noise; the other extensions remain as fallbacks for
// any art dropped in later in a different format.
const EXTENSIONS = ["jpg", "png", "jpeg", "webp"];

/**
 * The canonical hero image for a template/style: full-bleed real art at
 * `/style-art/<id>.<ext>` (bundled under public/, so it resolves the same in
 * dev and packaged Windows builds), falling back to an accent-colored gradient
 * with a category icon only if the file is genuinely missing. Shared by the
 * Style step picker and the Templates page so there is exactly one "what does
 * this card's image look like" answer in the app.
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
  const Icon = categoryIcon(template.category);

  return (
    <div
      className={cn("group relative aspect-[3/2] w-full shrink-0 overflow-hidden", className)}
      style={
        exhausted
          ? {
              backgroundImage: `radial-gradient(130% 110% at 20% -10%, ${template.accent}55, transparent 60%), linear-gradient(160deg, ${template.accent}38, #0a0b10 88%)`,
            }
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
        <div className="flex h-full w-full items-center justify-center">
          <Icon
            className="h-10 w-10 transition-transform duration-300 group-hover:scale-110"
            style={{ color: template.accent, opacity: 0.55 }}
            strokeWidth={1.25}
          />
        </div>
      )}
      {/* Subtle top scrim so the category/icon badges stay legible over bright
          artwork — only where the badges sit, never darkening the whole image. */}
      {!exhausted && (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-black/45 to-transparent" />
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
