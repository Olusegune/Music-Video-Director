// Section list row + per-section editor (extracted from SongStudio.tsx, Phase 2).
import { useState } from "react";
import {
  Play,
  Trash2,
  AlignLeft,
  Mic2,
  ChevronDown,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react";
import {
  formatTime,
  sectionColor,
  SECTION_KINDS,
  type SongSection,
  type SectionKind,
} from "@/apps/music-video/lib/songBrain";
import {
  detectSectionPerformer,
  SECTION_PERFORMER_ROLES,
} from "@/apps/music-video/lib/performerDetect";
import { cn } from "@/platform/lib/utils";
import { Button } from "@/platform/components/ui/button";
import { Input } from "@/platform/components/ui/input";
import { Textarea } from "@/platform/components/ui/textarea";
import { Card, CardContent } from "@/platform/components/ui/card";

export function SectionRow({
  section,
  onChange,
  onDelete,
  onSeek,
  onSelect,
  selected,
  hasLyrics,
  active,
  index,
}: {
  section: SongSection;
  onChange: (next: SongSection) => void;
  onDelete?: () => void;
  onSeek: () => void;
  onSelect: () => void;
  selected: boolean;
  hasLyrics: boolean;
  active: boolean;
  index: number;
}) {
  return (
    <div
      onClick={onSelect}
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-[var(--radius-button)] border px-2 py-1.5 transition-colors",
        selected
          ? "border-primary bg-primary/12"
          : active
            ? "border-primary/30 bg-primary/8"
            : "border-transparent hover:bg-elevated/50"
      )}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onSeek();
        }}
        className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold tabular-nums text-white"
        style={{ backgroundColor: sectionColor(section.kind) }}
        title="Jump to section"
        aria-label={`Jump to ${section.label}`}
      >
        {index + 1}
        {hasLyrics && (
          <span
            className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-success ring-2 ring-surface"
            title="Has lyrics"
          />
        )}
      </button>
      <select
        value={section.kind}
        onChange={(e) => {
          const kind = e.target.value as SectionKind;
          onChange({
            ...section,
            kind,
            // keep a custom label, otherwise track the kind
            label: SECTION_KINDS.includes(section.label as SectionKind) ? kind : section.label,
          });
        }}
        className="h-8 rounded-[var(--radius-input)] border border-border bg-surface px-2 text-xs text-foreground focus-visible:border-primary focus-visible:outline-none"
        aria-label="Section type"
      >
        {SECTION_KINDS.map((k) => (
          <option key={k} value={k}>
            {k}
          </option>
        ))}
      </select>
      <Input
        value={section.label}
        onChange={(e) => onChange({ ...section, label: e.target.value })}
        className="h-8 flex-1 text-sm"
        aria-label="Section label"
      />
      <span className="shrink-0 text-[11px] tabular-nums text-muted">
        {formatTime(section.start)}–{formatTime(section.end)}
      </span>
      {onDelete && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={onDelete}
          aria-label="Delete section"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

/** Per-section editor: lyrics for THIS section + a creative brief. */
export function SectionEditor({
  section,
  onPatch,
  onSeek,
}: {
  section: SongSection;
  onPatch: (patch: Partial<SongSection>) => void;
  onSeek: () => void;
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const color = sectionColor(section.kind);
  const Field = ({
    label,
    value,
    onChange,
    placeholder,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
  }) => (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-muted">{label}</span>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-8 text-sm"
      />
    </label>
  );

  return (
    <Card className="overflow-hidden">
      <div
        className="flex items-center gap-2 px-4 py-2.5"
        style={{ backgroundColor: `${color}14`, borderBottom: `1px solid ${color}33` }}
      >
        <span
          className="flex h-6 items-center rounded-md px-2 text-xs font-semibold text-white"
          style={{ backgroundColor: color }}
        >
          {section.label}
        </span>
        <span className="text-[11px] tabular-nums text-muted">
          {formatTime(section.start)}–{formatTime(section.end)}
        </span>
        <button
          onClick={onSeek}
          className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
        >
          <Play className="h-3 w-3" /> Jump
        </button>
      </div>
      <CardContent className="space-y-3 p-4">
        <label className="block">
          <span className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-muted">
            <AlignLeft className="h-3.5 w-3.5" /> Lyrics — {section.label}
          </span>
          <Textarea
            value={section.lyricsText ?? ""}
            onChange={(e) => onPatch({ lyricsText: e.target.value })}
            placeholder={`Lyrics for ${section.label}… (one line per row)`}
            className="min-h-28"
            aria-label={`Lyrics for ${section.label}`}
          />
        </label>

        {/* Who performs this section? — assigned, or detected with a hint. */}
        {(() => {
          const det = detectSectionPerformer(section);
          const assigned = section.performerRole;
          return (
            <label className="block">
              <span className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-muted">
                <Mic2 className="h-3.5 w-3.5" /> Who performs this section?
                {!assigned && (
                  <span
                    className={cn(
                      "ml-1 rounded px-1.5 py-0.5 text-[10px]",
                      det.confident ? "bg-primary/12 text-primary" : "bg-warning/15 text-warning"
                    )}
                  >
                    {det.confident ? `Suggested: ${det.role}` : `Unclear — ${det.why}`}
                  </span>
                )}
              </span>
              <select
                value={assigned ?? ""}
                onChange={(e) => onPatch({ performerRole: e.target.value || undefined })}
                className="h-9 w-full rounded-[var(--radius-input)] border border-border bg-surface px-2 text-sm text-foreground focus-visible:border-primary focus-visible:outline-none"
                aria-label={`Performer for ${section.label}`}
              >
                <option value="">
                  {det.confident ? `Use suggestion (${det.role})` : "— choose performer —"}
                </option>
                {SECTION_PERFORMER_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
          );
        })()}

        <button
          onClick={() => setShowAdvanced((v) => !v)}
          className="flex items-center gap-1.5 text-[11px] font-medium text-muted hover:text-foreground"
        >
          {showAdvanced ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
          <SlidersHorizontal className="h-3 w-3" />
          Advanced — mood, visual style, choreography, energy
        </button>

        {showAdvanced && (
          <>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Field
                label="Lead vocalist(s)"
                value={section.lead ?? ""}
                onChange={(v) => onPatch({ lead: v })}
                placeholder="e.g. Neo Dude"
              />
              <Field
                label="Backup / dancers"
                value={section.backup ?? ""}
                onChange={(v) => onPatch({ backup: v })}
                placeholder="e.g. 8 dancers"
              />
              <Field
                label="Mood / emotion"
                value={section.mood ?? ""}
                onChange={(v) => onPatch({ mood: v })}
                placeholder="e.g. Curious"
              />
              <Field
                label="Visual style"
                value={section.visualStyle ?? ""}
                onChange={(v) => onPatch({ visualStyle: v })}
                placeholder="e.g. neon, hazy"
              />
              <Field
                label="Camera"
                value={section.cameraNote ?? ""}
                onChange={(v) => onPatch({ cameraNote: v })}
                placeholder="e.g. slow push-in"
              />
              <Field
                label="Choreography"
                value={section.choreoNote ?? ""}
                onChange={(v) => onPatch({ choreoNote: v })}
                placeholder="e.g. full routine"
              />
            </div>
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-muted">
                Story / performance notes
              </span>
              <Textarea
                value={section.storyNote ?? ""}
                onChange={(e) => onPatch({ storyNote: e.target.value })}
                placeholder="What happens in this section…"
                className="min-h-16"
              />
            </label>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted">Energy</span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round((section.energy ?? 0.5) * 100)}
                onChange={(e) => onPatch({ energy: Number(e.target.value) / 100 })}
                className="flex-1 accent-[var(--color-primary)]"
                aria-label="Energy level"
              />
              <span className="w-8 text-right text-[11px] tabular-nums text-muted">
                {Math.round((section.energy ?? 0.5) * 100)}
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Canvas: waveform + section bands + beat grid + playhead
// ---------------------------------------------------------------------------
