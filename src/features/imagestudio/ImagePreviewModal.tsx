import { useEffect, useState } from "react";
import {
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Scan,
  Download,
  RefreshCw,
  BookMarked,
  FileText,
  Check,
  Loader2,
} from "lucide-react";
import type { Character, Environment, Prop } from "@/lib/types";
import {
  type GeneratedAsset,
  saveToBible,
  bibleTargetsFor,
  type BibleKind,
} from "@/lib/generatedAssets";
import { buildFilename } from "@/lib/imageGen";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAssetSrc, resolveAssetSrc } from "@/components/ui/asset-image";

type DownloadFormat = "png" | "jpg" | "webp";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = src;
  });
}

function triggerDownload(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.click();
}

export function ImagePreviewModal({
  asset,
  entity,
  entityKind,
  onClose,
  onRegenerate,
  regenerating,
}: {
  asset: GeneratedAsset;
  entity: Character | Environment | Prop;
  entityKind: string;
  onClose: () => void;
  onRegenerate: () => void;
  regenerating: boolean;
}) {
  const [scale, setScale] = useState(1);
  const [fit, setFit] = useState(true);
  const [showPrompt, setShowPrompt] = useState(false);
  const [savedTo, setSavedTo] = useState<BibleKind[]>(asset.savedTo);
  const [saving, setSaving] = useState<BibleKind | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const resolvedSrc = useAssetSrc(asset.url);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const targets = bibleTargetsFor(entityKind);

  const save = async (bible: BibleKind) => {
    setSaving(bible);
    setNote(null);
    try {
      await saveToBible(asset, bible, entity);
      setSavedTo((s) => (s.includes(bible) ? s : [...s, bible]));
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(null);
    }
  };

  const download = async (format: DownloadFormat) => {
    setDownloading(true);
    setNote(null);
    const filename = buildFilename(
      "wheelbarrow",
      asset.entityName,
      asset.sheetType,
      asset.provider,
      format
    );
    try {
      const resolved = await resolveAssetSrc(asset.url);
      const img = await loadImage(resolved);
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || asset.width;
      canvas.height = img.naturalHeight || asset.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no canvas");
      if (format !== "png") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(img, 0, 0);
      const mime =
        format === "png" ? "image/png" : format === "jpg" ? "image/jpeg" : "image/webp";
      const dataUrl = canvas.toDataURL(mime, 0.95);
      triggerDownload(dataUrl, filename);
    } catch {
      // Canvas failure → download the resolved data URL directly.
      try {
        const resolved = await resolveAssetSrc(asset.url);
        triggerDownload(resolved, filename.replace(/\.(jpg|webp)$/, ".png"));
      } catch {
        setNote("Download failed for this image.");
      }
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Toolbar */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-black/40 px-4 py-2.5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex min-w-0 items-center gap-2 text-white">
          <span className="truncate text-sm font-medium">{asset.entityName}</span>
          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-white/70">
            {asset.sheetType}
          </span>
          <span className="text-[11px] text-white/50">
            {asset.width}×{asset.height} · {asset.model}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Zoom */}
          <div className="flex items-center gap-0.5 rounded-md bg-white/10 p-0.5">
            <IconBtn title="Zoom out" onClick={() => { setFit(false); setScale((s) => Math.max(0.1, s - 0.25)); }}>
              <ZoomOut className="h-4 w-4" />
            </IconBtn>
            <span className="w-10 text-center text-[11px] text-white/70">
              {fit ? "Fit" : `${Math.round(scale * 100)}%`}
            </span>
            <IconBtn title="Zoom in" onClick={() => { setFit(false); setScale((s) => Math.min(5, s + 0.25)); }}>
              <ZoomIn className="h-4 w-4" />
            </IconBtn>
            <IconBtn title="Fit to screen" onClick={() => setFit(true)}>
              <Maximize2 className="h-4 w-4" />
            </IconBtn>
            <IconBtn title="Actual size" onClick={() => { setFit(false); setScale(1); }}>
              <Scan className="h-4 w-4" />
            </IconBtn>
          </div>

          <Button size="sm" variant="secondary" onClick={onRegenerate} disabled={regenerating}>
            {regenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Regenerate
          </Button>

          {/* Download menu */}
          <div className="flex items-center gap-0.5 rounded-md bg-white/10 p-0.5 text-white">
            <span className="pl-1.5 text-[11px] text-white/60">
              {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            </span>
            {(["png", "jpg", "webp"] as DownloadFormat[]).map((f) => (
              <button
                key={f}
                onClick={() => download(f)}
                disabled={downloading}
                className="rounded px-2 py-1 text-[11px] font-medium uppercase hover:bg-white/15 disabled:opacity-50"
              >
                {f}
              </button>
            ))}
          </div>

          <IconBtn title="View prompt" onClick={() => setShowPrompt((v) => !v)}>
            <FileText className="h-4 w-4" />
          </IconBtn>
          <IconBtn title="Close (Esc)" onClick={onClose}>
            <X className="h-4 w-4" />
          </IconBtn>
        </div>
      </div>

      {/* Save to Bible row */}
      <div
        className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-black/30 px-4 py-2"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-white/50">
          <BookMarked className="h-3.5 w-3.5" /> Save to
        </span>
        {targets.map((t) => {
          const done = savedTo.includes(t.id);
          return (
            <button
              key={t.id}
              onClick={() => save(t.id)}
              disabled={saving !== null}
              className={cn(
                "flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition-colors",
                done
                  ? "border-success/50 bg-success/20 text-success"
                  : "border-white/20 text-white/80 hover:bg-white/10"
              )}
            >
              {saving === t.id ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : done ? (
                <Check className="h-3 w-3" />
              ) : null}
              {t.label}
            </button>
          );
        })}
        {note && <span className="text-[11px] text-danger">{note}</span>}
      </div>

      {/* Image stage */}
      <div className="relative min-h-0 flex-1 overflow-auto" onClick={onClose}>
        <div className="flex min-h-full min-w-full items-center justify-center p-6">
          {resolvedSrc ? (
            <img
              src={resolvedSrc}
              alt={asset.entityName}
              onClick={(e) => e.stopPropagation()}
              className={cn(fit && "max-h-[80vh] max-w-[92vw] object-contain")}
              style={
                fit
                  ? undefined
                  : { width: `${(asset.width || 1024) * scale}px`, height: "auto", maxWidth: "none" }
              }
            />
          ) : (
            <Loader2 className="h-8 w-8 animate-spin text-white/60" />
          )}
        </div>
      </div>

      {showPrompt && (
        <div
          className="max-h-48 overflow-y-auto border-t border-white/10 bg-black/50 px-4 py-3"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wide text-white/50">Prompt</span>
            <button
              className="text-[11px] text-white/60 hover:text-white"
              onClick={() => navigator.clipboard?.writeText(asset.prompt)}
            >
              Copy
            </button>
          </div>
          <p className="font-mono text-[11px] leading-relaxed text-white/80">{asset.prompt}</p>
        </div>
      )}
    </div>
  );
}

function IconBtn({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      aria-label={title}
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded text-white/80 hover:bg-white/15 hover:text-white"
    >
      {children}
    </button>
  );
}
