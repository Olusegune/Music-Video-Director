import { useMemo, useState } from "react";
import { FileText, Wand2, X } from "lucide-react";
import { parseScript, type ParsedScript } from "@/platform/lib/scriptParser";
import { loadScripts } from "@/platform/lib/scriptStore";
import {
  alignScriptToSong,
  applyScriptToSong,
  describeAlignment,
  type Alignment,
} from "@/apps/music-video/lib/scriptAlign";
import type { SongMap } from "@/apps/music-video/lib/songBrain";
import { Button } from "@/platform/components/ui/button";
import { Textarea } from "@/platform/components/ui/textarea";
import { Select } from "@/platform/components/ui/select";
import { Badge } from "@/platform/components/ui/badge";

// Folding a written script into a detected song.
//
// The mapping is shown before anything is written. A script's verse landing on
// the wrong thirty seconds of song is a quiet, expensive mistake — the shots
// and prompts downstream all inherit it — so the auto-alignment is a proposal
// the user can see and correct, not a silent transformation. Every row says
// how it was matched, and leftovers are named rather than dropped.

export function ScriptAlignPanel({
  song,
  onApply,
  onCancel,
}: {
  song: SongMap;
  onApply: (next: SongMap) => void;
  onCancel: () => void;
}) {
  const saved = useMemo(() => loadScripts(), []);
  const [text, setText] = useState("");
  const [sourceLabel, setSourceLabel] = useState<string>("");

  const parsed: ParsedScript | null = useMemo(
    () => (text.trim() ? parseScript(text) : null),
    [text]
  );

  // The auto-alignment seeds the editable mapping; the user's overrides win.
  const auto = useMemo(
    () => (parsed ? alignScriptToSong(parsed, song) : null),
    [parsed, song]
  );
  const [overrides, setOverrides] = useState<Record<string, number | null>>({});

  const alignment: Alignment | null = useMemo(() => {
    if (!auto) return null;
    const pairs = auto.pairs.map((p) =>
      p.songSectionId in overrides
        ? { ...p, scriptIndex: overrides[p.songSectionId], basis: "kind" as const }
        : p
    );
    const used = new Set(pairs.map((p) => p.scriptIndex).filter((i): i is number => i !== null));
    return {
      pairs,
      unusedScriptIndexes: (parsed?.sections ?? [])
        .map((_, i) => i)
        .filter((i) => !used.has(i)),
    };
  }, [auto, overrides, parsed]);

  const loadSaved = (id: string) => {
    const doc = saved.find((d) => d.id === id);
    if (!doc) return;
    setText(doc.content);
    setSourceLabel(doc.title);
    setOverrides({});
  };

  const apply = () => {
    if (!parsed || !alignment) return;
    onApply(applyScriptToSong(song, parsed, alignment));
  };

  const matched = alignment?.pairs.filter((p) => p.scriptIndex !== null).length ?? 0;

  return (
    <div className="space-y-4 rounded-lg border border-border bg-elevated/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold">
            <FileText className="h-4 w-4 text-accent" /> Use a script
          </p>
          <p className="mt-1 text-xs text-muted">
            Paste a script or lyric sheet — its words, action, and movement cues become each
            section's brief, and flow into every shot and prompt.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel} aria-label="Close script panel">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {saved.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-xs text-muted">From Script Studio</span>
          <Select
            value=""
            onChange={loadSaved}
            placeholder="Choose a saved script…"
            className="max-w-xs"
            aria-label="Load a saved script"
          >
            {saved.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </Select>
        </div>
      )}

      <Textarea
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          setOverrides({});
          setSourceLabel("");
        }}
        placeholder={"[Verse 1]\nHe walks out into the rain\n\n[Chorus]\nWe dance until the lights go out"}
        className="min-h-32 font-mono text-xs"
      />

      {parsed && alignment && (
        <div className="space-y-3">
          {parsed.sections.length === 0 ? (
            <p className="rounded-md border border-warning/30 bg-warning/5 p-3 text-xs text-warning">
              No [Verse] / [Chorus] markers found, so there's nothing to line up section by
              section. Add bracketed markers to the script and the mapping will appear here.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge variant={matched > 0 ? "success" : "warning"}>
                  {describeAlignment(alignment, parsed)}
                </Badge>
                {sourceLabel && <span className="text-muted">from “{sourceLabel}”</span>}
              </div>

              <div className="space-y-1.5">
                {alignment.pairs.map((pair) => (
                  <div
                    key={pair.songSectionId}
                    className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1.4fr)] items-center gap-2"
                  >
                    <span className="truncate text-xs font-medium">{pair.songLabel}</span>
                    <span className="text-[10px] uppercase tracking-wide text-muted">
                      {pair.basis === "kind" ? "matched" : pair.basis === "order" ? "in order" : "—"}
                    </span>
                    <Select
                      value={pair.scriptIndex === null ? "" : String(pair.scriptIndex)}
                      onChange={(value: string) =>
                        setOverrides((current) => ({
                          ...current,
                          [pair.songSectionId]: value === "" ? null : Number(value),
                        }))
                      }
                      placeholder="— nothing —"
                      aria-label={`Script section for ${pair.songLabel}`}
                    >
                      <option value="">— nothing —</option>
                      {parsed.sections.map((s, i) => (
                        <option key={i} value={String(i)}>
                          {s.label || s.kind} — {s.lines[0]?.slice(0, 40) ?? "(empty)"}
                        </option>
                      ))}
                    </Select>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <Button size="sm" onClick={apply} disabled={!parsed || matched === 0}>
          <Wand2 className="h-3.5 w-3.5" /> Apply to {matched} section{matched === 1 ? "" : "s"}
        </Button>
        <Button variant="secondary" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
