// ChoreographyPreviewStrip — the whole song's key poses laid out as one
// scrubbable sequence (a "choreography storyboard"), instead of only being
// visible one section at a time. Drag to reorder poses within a section;
// click a card to jump to that section below.
import { useState } from "react";
import { Film } from "lucide-react";
import { sectionColor } from "@/lib/songBrain";
import type { ChoreoPlan } from "@/lib/choreography";
import { cn } from "@/lib/utils";
import { HelpHint } from "@/components/ui/help-hint";

interface StripItem {
  sectionId: string;
  sectionLabel: string;
  color: string;
  poseIndex: number;
  text: string;
}

export function ChoreographyPreviewStrip({
  plan,
  onReorderPoses,
  onSelectSection,
}: {
  plan: ChoreoPlan;
  onReorderPoses: (sectionId: string, poses: string[]) => void;
  onSelectSection?: (sectionId: string) => void;
}) {
  const [dragKey, setDragKey] = useState<string | null>(null);

  const items: StripItem[] = plan.sections.flatMap((s) =>
    s.keyPoses.map((text, poseIndex) => ({
      sectionId: s.sectionId,
      sectionLabel: s.label,
      color: sectionColor(s.kind),
      poseIndex,
      text,
    }))
  );

  if (items.length === 0) return null;

  const handleDrop = (target: StripItem) => {
    if (!dragKey) return;
    const sepIndex = dragKey.lastIndexOf(":");
    const dragSectionId = dragKey.slice(0, sepIndex);
    const dragIdx = Number(dragKey.slice(sepIndex + 1));
    setDragKey(null);
    // Poses only make sense reordered within their own section.
    if (dragSectionId !== target.sectionId || dragIdx === target.poseIndex) return;
    const section = plan.sections.find((s) => s.sectionId === dragSectionId);
    if (!section) return;
    const poses = [...section.keyPoses];
    const [moved] = poses.splice(dragIdx, 1);
    poses.splice(target.poseIndex, 0, moved);
    onReorderPoses(dragSectionId, poses);
  };

  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
        <Film className="h-3.5 w-3.5" /> Choreography preview
        <HelpHint
          title="Choreography preview"
          body="Your whole routine as one storyboard — every key pose across the song, left to right. Drag a card to reorder poses within its section; click one to jump to its section below."
          example="Drag the 'power pose' card ahead of the 'spin' card to make the section land on the pose first, then spin out of it."
        />
      </div>
      <p className="mb-2 text-[11px] text-muted">
        Every key pose across the song, in order — drag to reorder within a section, click a card to jump to it.
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {items.map((it) => {
          const key = `${it.sectionId}:${it.poseIndex}`;
          return (
            <button
              key={key}
              type="button"
              draggable
              onDragStart={() => setDragKey(key)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(it)}
              onClick={() => onSelectSection?.(it.sectionId)}
              title={`${it.sectionLabel}: ${it.text || `Pose ${it.poseIndex + 1}`}`}
              className={cn(
                "flex w-32 shrink-0 cursor-grab flex-col items-start gap-1 rounded-[var(--radius-card)] border border-border bg-surface p-2.5 text-left transition-opacity active:cursor-grabbing",
                dragKey === key && "opacity-40"
              )}
            >
              <span
                className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold text-white"
                style={{ backgroundColor: it.color }}
              >
                {it.sectionLabel}
              </span>
              <span className="line-clamp-2 text-xs text-foreground">
                {it.text || `Pose ${it.poseIndex + 1}`}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
