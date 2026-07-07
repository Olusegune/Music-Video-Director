import { useRef, useState } from "react";
import {
  ArrowLeft,
  Sparkles,
  Download,
  Loader2,
  ImagePlus,
  RefreshCw,
} from "lucide-react";
import { api, isTauri } from "@/platform/lib/ipc";
import type { Character } from "@/platform/lib/types";
import {
  sheetSections,
  allCells,
  cellPrompt,
  loadSheet,
  saveSheetCell,
  characterPalette,
  type SheetCell,
  type SheetData,
  type SheetSection,
} from "@/platform/lib/characterSheet";
import { findPreset } from "@/platform/lib/styles";
import { cn } from "@/platform/lib/utils";
import { Button } from "@/platform/components/ui/button";

function hueFor(id: string): number {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

export function CharacterSheetView({
  character,
  onBack,
}: {
  character: Character;
  onBack: () => void;
}) {
  const [sheet, setSheet] = useState<SheetData>(() => loadSheet(character.id));
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  const sections = sheetSections(character);
  const palette = characterPalette(character);
  const preset = findPreset(character.stylePreset);

  const genCell = async (cell: SheetCell) => {
    setBusy(cell.key);
    try {
      const url = await api.generateCharacterPortrait(
        character.id,
        cellPrompt(character, cell.modifier)
      );
      saveSheetCell(character.id, cell.key, url);
      setSheet((s) => ({ ...s, [cell.key]: url }));
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setBusy(null);
    }
  };

  const genAll = async () => {
    const cells = allCells(character);
    setProgress({ done: 0, total: cells.length });
    setNotice(null);
    for (let i = 0; i < cells.length; i++) {
      setBusy(cells[i].key);
      try {
        const url = await api.generateCharacterPortrait(
          character.id,
          cellPrompt(character, cells[i].modifier)
        );
        saveSheetCell(character.id, cells[i].key, url);
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
      // Guard against the renderer hanging on slow/blocked image fetches.
      const dataUrl = await Promise.race([
        toPng(sheetRef.current, {
          pixelRatio: 2,
          cacheBust: true,
          // Skip inlining cross-origin @font-face (Google Fonts) — it throws a
          // SecurityError; text still rasterizes with the already-loaded fonts.
          skipFonts: true,
          backgroundColor: getComputedStyle(document.body).backgroundColor,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("export timed out")), 25000)
        ),
      ]);
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${character.name.replace(/[^a-z0-9]/gi, "-")}-character-sheet.png`;
      a.click();
    } catch {
      setNotice(
        isTauri
          ? "Could not render the sheet to PNG."
          : "PNG export needs same-origin images — it works in the desktop app. (Browser placeholders are cross-origin.)"
      );
    } finally {
      setExporting(false);
    }
  };

  const generatedCount = allCells(character).filter((c) => sheet[c.key]).length;
  const total = allCells(character).length;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-8 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold">
              {character.name} — Character Sheet
            </h1>
            <p className="text-xs text-muted">
              {generatedCount}/{total} panels generated
              {character.locked ? " · Canon DNA locked" : " · DNA not locked yet"}
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
        {/* The exportable sheet */}
        <div
          ref={sheetRef}
          className="mx-auto max-w-6xl rounded-[var(--radius-card)] border border-border bg-surface p-6 shadow-card"
        >
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[16rem_1fr]">
            {/* Profile column */}
            <aside className="flex flex-col gap-4">
              <div className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-elevated">
                <div className="aspect-[4/5] w-full">
                  {character.portraitUrl ? (
                    <img
                      src={character.portraitUrl}
                      alt={character.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center text-4xl font-semibold text-white/90"
                      style={{
                        background: `linear-gradient(135deg, hsl(${hueFor(character.id)} 55% 42%), hsl(${(hueFor(character.id) + 40) % 360} 60% 30%))`,
                      }}
                    >
                      {character.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold tracking-tight">{character.name}</h2>
                <p className="text-xs uppercase tracking-wide text-primary">
                  {[character.role, character.occupation].filter(Boolean).join(" · ") ||
                    "Character"}
                </p>
              </div>

              <ProfileRow label="Identity" value={[character.age, character.gender].filter(Boolean).join(", ")} />
              <ProfileRow label="Personality" value={character.traits} />
              <ProfileRow label="Motivations" value={character.motivations} />
              <ProfileRow label="Goals" value={character.goals} />
              <ProfileRow label="Fears" value={character.fears} />

              {palette.length > 0 && (
                <div>
                  <SideHead>Color Palette</SideHead>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {palette.map((p, i) => (
                      <div key={i} className="flex flex-col items-center gap-1">
                        <span
                          className="h-7 w-7 rounded-md border border-border"
                          style={{ backgroundColor: p.hex }}
                          title={`${p.label}: ${p.hex}`}
                        />
                        <span className="text-[9px] text-muted">{p.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <SideHead>Style Notes</SideHead>
                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[11px] text-muted">
                  {preset && <li>{preset.label} style</li>}
                  <li>Consistent identity across all panels</li>
                  {character.distinguishingFeatures && (
                    <li>Always: {character.distinguishingFeatures}</li>
                  )}
                  {character.primaryOutfit && <li>Primary: {character.primaryOutfit}</li>}
                </ul>
              </div>
            </aside>

            {/* Panels */}
            <div className="flex flex-col gap-6">
              {sections.map((section) => (
                <SectionBlock
                  key={section.key}
                  section={section}
                  sheet={sheet}
                  busy={busy}
                  onGen={genCell}
                  characterId={character.id}
                />
              ))}
            </div>
          </div>
        </div>

        {/* helper note */}
        <p className="mx-auto mt-3 max-w-6xl text-center text-[11px] text-muted">
          {isTauri
            ? "Panels render from your configured image provider using each panel's prompt — all anchored to this character's locked Prompt DNA."
            : "Browser preview uses placeholder images. In the desktop app each panel renders from your image provider, anchored to the character's Prompt DNA."}
        </p>
      </div>
    </div>
  );
}

function SectionBlock({
  section,
  sheet,
  busy,
  onGen,
  characterId,
}: {
  section: SheetSection;
  sheet: SheetData;
  busy: string | null;
  onGen: (cell: SheetCell) => void;
  characterId: string;
}) {
  const tall = section.key !== "expressions";
  return (
    <section>
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
            tall={tall}
            onGen={() => onGen(cell)}
            characterId={characterId}
          />
        ))}
      </div>
    </section>
  );
}

function PanelCell({
  cell,
  url,
  busy,
  tall,
  onGen,
  characterId,
}: {
  cell: SheetCell;
  url?: string;
  busy: boolean;
  tall: boolean;
  onGen: () => void;
  characterId: string;
}) {
  return (
    <div className="group flex flex-col gap-1">
      <div
        className={cn(
          "relative overflow-hidden rounded-md border border-border bg-elevated",
          tall ? "aspect-[3/4]" : "aspect-square"
        )}
      >
        {url ? (
          <img src={url} alt={cell.label} className="h-full w-full object-cover" />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{
              background: `linear-gradient(135deg, hsl(${hueFor(characterId + cell.key)} 30% 22%), hsl(${(hueFor(characterId + cell.key) + 30) % 360} 32% 16%))`,
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

function ProfileRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div>
      <SideHead>{label}</SideHead>
      <p className="text-xs text-foreground">{value}</p>
    </div>
  );
}

function SideHead({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">
      {children}
    </span>
  );
}
