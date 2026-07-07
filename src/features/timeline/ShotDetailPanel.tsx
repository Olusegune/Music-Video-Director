// Click-a-shot detail panel (extracted from TimelineView.tsx, Phase 2).
import { Film, X, Sparkles, Users, Camera, CheckCircle2, Circle, ImageIcon } from "lucide-react";
import { formatTime } from "@/lib/songBrain";
import { type MvTreatment } from "@/lib/mvDirector";
import { type Performer } from "@/lib/cast";
import { buildShotImagePrompt } from "@/lib/mvGen";
import type { Character } from "@/lib/types";
import { AssetImage, AssetVideo } from "@/components/ui/asset-image";

export function ShotDetailPanel({
  treatment,
  sectionId,
  shotId,
  cast,
  characters,
  onClose,
}: {
  treatment: MvTreatment;
  sectionId: string;
  shotId: string;
  cast: Performer[];
  characters: Character[];
  onClose: () => void;
}) {
  const section = treatment.sections.find((s) => s.sectionId === sectionId);
  const shot = section?.shots.find((s) => s.id === shotId);
  if (!section || !shot) return null;

  const prompt = buildShotImagePrompt({
    shot,
    section,
    treatment,
    cast,
    characters,
    aspect: "16:9",
  });
  const who = (shot.choreo ?? []).map((a) => a.performer).filter(Boolean);
  const status: { label: string; icon: React.ReactNode; color: string } = shot.videoUrl
    ? { label: "Clip rendered", icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: "#16a34a" }
    : shot.imageUrl
      ? { label: "Frame only — no clip yet", icon: <Circle className="h-3.5 w-3.5 fill-current" />, color: "#d97706" }
      : { label: "Nothing generated yet", icon: <Circle className="h-3.5 w-3.5" />, color: "var(--color-muted)" };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-background/80 p-6 backdrop-blur"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-[var(--radius-modal)] border border-border bg-surface shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold">
            {section.label} · {formatTime(shot.start)}–{formatTime(shot.end)}
          </h2>
          <button onClick={onClose} aria-label="Close">
            <X className="h-4 w-4 text-muted hover:text-foreground" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="aspect-video w-full overflow-hidden rounded-lg bg-elevated">
            {shot.videoUrl ? (
              <AssetVideo src={shot.videoUrl} className="h-full w-full object-cover" controls />
            ) : shot.imageUrl ? (
              <AssetImage src={shot.imageUrl} alt="" className="h-full w-full object-cover" label="Frame" />
            ) : (
              <div className="flex h-full items-center justify-center text-muted">
                <ImageIcon className="h-6 w-6" />
              </div>
            )}
          </div>

          <DetailField icon={<Sparkles className="h-3.5 w-3.5" />} label="Story beat">
            {section.concept || shot.idea}
          </DetailField>

          <DetailField icon={<Users className="h-3.5 w-3.5" />} label="Characters">
            {who.length > 0 ? who.join(", ") : "No one assigned yet"}
          </DetailField>

          <DetailField icon={<Camera className="h-3.5 w-3.5" />} label="Camera">
            {[shot.shotType, shot.movement, shot.lighting].filter(Boolean).join(" · ") || "—"}
          </DetailField>

          <DetailField
            icon={<span style={{ color: status.color }}>{status.icon}</span>}
            label="Render status"
          >
            <span style={{ color: status.color }}>{status.label}</span>
          </DetailField>

          <DetailField icon={<Film className="h-3.5 w-3.5" />} label="Prompt">
            <p className="whitespace-pre-wrap text-xs leading-relaxed text-muted">{prompt}</p>
          </DetailField>
        </div>
      </div>
    </div>
  );
}

function DetailField({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
        {icon}
        {label}
      </div>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
}

