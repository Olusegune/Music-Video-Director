import { useState } from "react";
import { Clapperboard, Sparkles } from "lucide-react";
import { DIRECTOR_STYLES, type DirectorStyle } from "@/apps/music-video/lib/directorStyles";
import { cn } from "@/platform/lib/utils";

// jpg first — every shipped card image is a downscaled .jpg in
// public/director-style-art (same reasoning as public/style-art for
// Templates: full-res art would bloat the bundle/exe).
const EXTENSIONS = ["jpg", "png", "jpeg", "webp"];

// The inspiration step. Two things it has to get right:
//
//  1. Skipping is a real, equal choice — not a buried "no thanks" link. It sits
//     first, styled like any other card, because a user who already has a look
//     in mind should not have to opt out of ours.
//  2. What a style will actually do is visible before committing. The chosen
//     card expands to show the craft vocabulary that gets woven into the
//     script and prompts, so the effect is never a black box.

export function NoDirectorCard({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col overflow-hidden rounded-[var(--radius-card)] border text-left transition-colors",
        active ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/40"
      )}
    >
      <div className="flex aspect-[3/2] w-full shrink-0 items-center justify-center bg-elevated/60">
        <Clapperboard className="h-5 w-5 text-muted" />
      </div>
      <div className="flex flex-col gap-1 p-2.5">
        <span className="text-sm font-semibold leading-tight">My own look</span>
        <span className="text-[11px] leading-snug text-muted">
          Direct it exactly as planned — no outside influence.
        </span>
      </div>
    </button>
  );
}

function DirectorCard({
  style,
  active,
  onClick,
}: {
  style: DirectorStyle;
  active: boolean;
  onClick: () => void;
}) {
  // Real art at /director-style-art/<id>.<ext> first, tried in turn; only
  // once every extension 404s does the card fall back to the style's own
  // gradient palette — same "real art with zero-code-change dropin, gradient
  // is the deliberate fallback not the norm" pattern as TemplateHeroImage.
  const [extIndex, setExtIndex] = useState(0);
  const exhausted = extIndex >= EXTENSIONS.length;
  const src = exhausted ? undefined : `/director-style-art/${style.id}.${EXTENSIONS[extIndex]}`;

  return (
    <button
      type="button"
      onClick={onClick}
      title={style.signature}
      className={cn(
        "group flex flex-col overflow-hidden rounded-[var(--radius-card)] border text-left transition-colors",
        active ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/40"
      )}
    >
      <div
        className="relative flex aspect-[3/2] w-full shrink-0 items-end overflow-hidden p-2"
        style={
          exhausted
            ? {
                background: style.palette?.length
                  ? `linear-gradient(135deg, ${style.palette.join(", ")})`
                  : "var(--color-elevated)",
              }
            : undefined
        }
      >
        {!exhausted && (
          <img
            key={src}
            src={src}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setExtIndex((i) => i + 1)}
          />
        )}
        {!exhausted && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/55 to-transparent" />
        )}
        <Sparkles className="relative h-4 w-4 text-white/80" />
      </div>
      <div className="flex flex-col gap-1 p-2.5">
        <span className="text-sm font-semibold leading-tight">{style.name}</span>
        <span className="line-clamp-2 text-[11px] leading-snug text-muted">{style.signature}</span>
      </div>
    </button>
  );
}

export function DirectorStylePicker({
  value,
  onChange,
}: {
  /** null means "my own look" — an explicit choice, not an empty state. */
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const selected = DIRECTOR_STYLES.find((style) => style.id === value);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <NoDirectorCard active={value === null} onClick={() => onChange(null)} />
        {DIRECTOR_STYLES.map((style) => (
          <DirectorCard
            key={style.id}
            style={style}
            active={value === style.id}
            onClick={() => onChange(style.id)}
          />
        ))}
      </div>

      {selected && (
        <div className="rounded-lg border border-border bg-elevated/40 p-3">
          <p className="text-xs font-semibold">
            Inspired by {selected.name} — techniques woven into every shot
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {selected.techniques.map((technique) => (
              <span
                key={technique}
                className="rounded-md bg-surface px-2 py-0.5 text-[11px] text-muted"
              >
                {technique}
              </span>
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-snug text-muted">
            Your song, lyrics, and cast still drive the video — this shapes how it's shot.
          </p>
        </div>
      )}
    </div>
  );
}
