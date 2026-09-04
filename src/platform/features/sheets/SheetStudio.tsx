import { useRef, useState } from "react";
import { ArrowLeft, Sparkles, Download, Loader2, ImagePlus, RefreshCw } from "lucide-react";
import { isTauri } from "@/platform/lib/ipc";
import {
  allSheetCells,
  loadSheet,
  saveSheetCell,
  sheetPrompt,
  type SheetCell,
  type SheetData,
  type SheetSection,
} from "@/platform/lib/assetSheet";
import { cn } from "@/platform/lib/utils";
import { Button } from "@/platform/components/ui/button";
import { AssetImage } from "@/platform/components/ui/asset-image";

function hueFor(id: string): number {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

export interface SheetStudioProps {
  /** Storage namespace, e.g. "environment" | "prop". */
  kind: string;
  id: string;
  name: string;
  title: string;
  /** Top media image for the profile column (establishing / hero). */
  mediaSrc: string;
  sections: SheetSection[];
  promptTail: string;
  /** Returns the freshest Prompt DNA (recomposed from current fields). */
  composeDna: () => string;
  generate: (id: string, prompt: string) => Promise<string>;
  /** Profile rows for the sidebar. */
  profile: { label: string; value: string }[];
  palette?: { hex: string; label?: string }[];
  notes?: string[];
  locked: boolean;
  onBack: () => void;
}

export function SheetStudio(props: SheetStudioProps) {
  const { kind, id, name, title, sections, promptTail, composeDna, generate } = props;
  const [sheet, setSheet] = useState<SheetData>(() => loadSheet(kind, id));
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  const cells = allSheetCells(sections);
  const generatedCount = cells.filter((c) => sheet[c.key]).length;

  const genCell = async (cell: SheetCell) => {
    setBusy(cell.key);
    try {
      const url = await generate(id, sheetPrompt(composeDna(), cell.modifier, promptTail));
      saveSheetCell(kind, id, cell.key, url);
      setSheet((s) => ({ ...s, [cell.key]: url }));
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setBusy(null);
    }
  };

  const genAll = async () => {
    setProgress({ done: 0, total: cells.length });
    setNotice(null);
    for (let i = 0; i < cells.length; i++) {
      setBusy(cells[i].key);
      try {
        const url = await generate(id, sheetPrompt(composeDna(), cells[i].modifier, promptTail));
        saveSheetCell(kind, id, cells[i].key, url);
        setSheet((s) => ({ ...s, [cells[i].key]: url }));
      } catch (e) {
        setNotice(e instanceof Error ? e.message : "Generation failed.");
        break;
      }
      setProgress({ done: i + 1, total: cells.length });
    }
    setBusy(null);
    setTimeout(() => setProgress(null), 1500);
  };

  const exportPng = async () => {
    if (!sheetRef.current) return;
    setExporting(true);
    setNotice(null);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await Promise.race([
        toPng(sheetRef.current, {
          pixelRatio: 2,
          cacheBust: true,
          skipFonts: true,
          backgroundColor: getComputedStyle(document.body).backgroundColor,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("export timed out")), 25000)
        ),
      ]);
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${name.replace(/[^a-z0-9]/gi, "-")}-${kind}-sheet.png`;
      a.click();
    } catch {
      setNotice(
        isTauri
          ? "Could not render the sheet to PNG."
          : "PNG export needs same-origin images — it works in the desktop app."
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-8 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon" onClick={props.onBack} aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold">{title}</h1>
            <p className="text-xs text-muted">
              {generatedCount}/{cells.length} panels generated
              {props.locked ? " · Canon DNA locked" : " · DNA not locked yet"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {progress && (
            <span className="flex items-center gap-1.5 text-xs text-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {progress.done}/{progress.total}
            </span>
          )}
          <Button onClick={genAll} disabled={!!busy || !!progress}>
            <Sparkles className="h-4 w-4" /> Generate Full Sheet
          </Button>
          <Button variant="secondary" onClick={exportPng} disabled={exporting}>
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Download PNG
          </Button>
        </div>
      </header>

      {notice && (
        <div className="border-b border-warning/30 bg-warning/10 px-8 py-2 text-xs text-warning">
          {notice}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6">
        <div
          ref={sheetRef}
          className="mx-auto max-w-6xl rounded-[var(--radius-card)] border border-border bg-surface p-6 shadow-card"
        >
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[16rem_1fr]">
            <aside className="flex flex-col gap-4">
              <div className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-elevated">
                <div className="aspect-video w-full">
                  {props.mediaSrc ? (
                    <AssetImage src={props.mediaSrc} alt={name} className="h-full w-full object-cover" />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center text-3xl font-semibold text-white/90"
                      style={{
                        background: `linear-gradient(135deg, hsl(${hueFor(id)} 50% 40%), hsl(${(hueFor(id) + 40) % 360} 55% 28%))`,
                      }}
                    >
                      {name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight">{name}</h2>
              </div>
              {props.profile
                .filter((p) => p.value)
                .map((p) => (
                  <div key={p.label}>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                      {p.label}
                    </span>
                    <p className="text-xs text-foreground">{p.value}</p>
                  </div>
                ))}
              {props.palette && props.palette.length > 0 && (
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                    Color Palette
                  </span>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {props.palette.map((c, i) => (
                      <span
                        key={i}
                        className="h-7 w-7 rounded-md border border-border"
                        style={{ backgroundColor: c.hex }}
                        title={c.label ? `${c.label}: ${c.hex}` : c.hex}
                      />
                    ))}
                  </div>
                </div>
              )}
              {props.notes && props.notes.length > 0 && (
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                    Notes
                  </span>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[11px] text-muted">
                    {props.notes.map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                </div>
              )}
            </aside>

            <div className="flex flex-col gap-6">
              {sections.map((section) => (
                <section key={section.key}>
                  <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
                    {section.title}
                  </h3>
                  <div
                    className="grid gap-2"
                    style={{ gridTemplateColumns: `repeat(${section.columns}, minmax(0, 1fr))` }}
                  >
                    {section.cells.map((cell) => (
                      <PanelCell
                        key={cell.key}
                        cell={cell}
                        url={sheet[cell.key]}
                        busy={busy === cell.key}
                        tall={section.tall}
                        seed={id + cell.key}
                        onGen={() => genCell(cell)}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
        <p className="mx-auto mt-3 max-w-6xl text-center text-[11px] text-muted">
          {isTauri
            ? "Each panel renders from your image provider, anchored to this asset's locked Prompt DNA."
            : "Browser preview uses placeholder images; the desktop app renders from your image provider."}
        </p>
      </div>
    </div>
  );
}

function PanelCell({
  cell,
  url,
  busy,
  tall,
  seed,
  onGen,
}: {
  cell: SheetCell;
  url?: string;
  busy: boolean;
  tall: boolean;
  seed: string;
  onGen: () => void;
}) {
  return (
    <div className="group flex flex-col gap-1">
      <div
        className={cn(
          "relative overflow-hidden rounded-md border border-border bg-elevated",
          tall ? "aspect-[3/4]" : "aspect-video"
        )}
      >
        {url ? (
          <AssetImage src={url} alt={cell.label} className="h-full w-full object-cover" />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{
              background: `linear-gradient(135deg, hsl(${hueFor(seed)} 30% 22%), hsl(${(hueFor(seed) + 30) % 360} 32% 16%))`,
            }}
          >
            <ImagePlus className="h-4 w-4 text-white/40" />
          </div>
        )}
        {busy ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <Loader2 className="h-4 w-4 animate-spin text-white" />
          </div>
        ) : (
          <button
            onClick={onGen}
            aria-label={`Generate ${cell.label}`}
            className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-opacity hover:bg-black/40 group-hover:opacity-100"
          >
            <span className="flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 text-[10px] font-medium text-white">
              {url ? <RefreshCw className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
              {url ? "Redo" : "Generate"}
            </span>
          </button>
        )}
      </div>
      <span className="text-center text-[10px] text-muted">{cell.label}</span>
    </div>
  );
}
