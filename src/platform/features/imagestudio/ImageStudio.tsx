import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  Copy,
  RotateCcw,
  Trash2,
  ImageIcon,
  Check,
  AlertCircle,
  Clipboard,
} from "lucide-react";
import { api, isTauri } from "@/platform/lib/ipc";
import type { Character, Environment, Prop } from "@/platform/lib/types";
import {
  IMAGE_MODELS,
  ASPECT_RATIOS,
  SIZE_PRESETS,
  templatesFor,
  findModel,
  findSize,
  resolveSize,
  buildSheetPrompt,
  type EntityKind,
} from "@/platform/lib/imageGen";
import {
  addAsset,
  deleteAsset,
  loadAssetsFor,
  type GeneratedAsset,
} from "@/platform/lib/generatedAssets";
import { ImagePreviewModal } from "@/platform/features/imagestudio/ImagePreviewModal";
import { cn } from "@/platform/lib/utils";
import { Button } from "@/platform/components/ui/button";
import { AssetImage } from "@/platform/components/ui/asset-image";
import { Label } from "@/platform/components/ui/label";
import { Input } from "@/platform/components/ui/input";

type Entity = Character | Environment | Prop;

export function ImageStudio({
  kind,
  entity,
  entityName,
  onBack,
}: {
  kind: EntityKind;
  entity: Entity;
  entityName: string;
  onBack: () => void;
}) {
  const templates = templatesFor(kind);
  const [modelId, setModelId] = useState(IMAGE_MODELS[0].id);
  const [templateId, setTemplateId] = useState(templates[0].id);
  const [aspect, setAspect] = useState<string>(kind === "character" ? "3:4" : "16:9");
  const [sizeId, setSizeId] = useState("large");
  const [customW, setCustomW] = useState(1024);
  const [customH, setCustomH] = useState(1024);
  const [prompt, setPrompt] = useState(() => buildSheetPrompt(kind, entity, templateId, aspect));
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  const [gallery, setGallery] = useState<GeneratedAsset[]>(() => loadAssetsFor(entity.id));
  const [preview, setPreview] = useState<GeneratedAsset | null>(null);

  const { data: keyStatuses = [] } = useQuery({
    queryKey: ["providerKeys"],
    queryFn: api.getProviderKeyStatuses,
  });
  const configured = new Set<string>(
    keyStatuses.filter((s) => s.configured).map((s) => s.provider)
  );

  // Recompose the prompt when template / aspect change (unless hand-edited).
  useEffect(() => {
    setPrompt(buildSheetPrompt(kind, entity, templateId, aspect));
    setDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId, aspect, entity.id]);

  const model = findModel(modelId);
  const size = resolveSize(aspect, sizeId, customW, customH);
  const sizePreset = findSize(sizeId);
  const template = templates.find((t) => t.id === templateId) ?? templates[0];

  const modelStatus = (keyIds: string[], manual?: boolean) =>
    manual ? "manual" : keyIds.some((k) => configured.has(k)) ? "connected" : "not_configured";

  const runGenerate = async (): Promise<GeneratedAsset | null> => {
    if (model.manual) {
      try {
        await navigator.clipboard.writeText(prompt);
        setNote({
          kind: "ok",
          msg: "Prompt copied — generate it in Midjourney, then import the image.",
        });
      } catch {
        setNote({ kind: "err", msg: "Could not copy the prompt." });
      }
      return null;
    }
    setBusy(true);
    setNote(null);
    try {
      const url = await api.generateImageFromSpec({
        capability: "image",
        prompt,
        aspect,
        resolution: { width: size.width, height: size.height, label: sizePreset.label },
        references: [],
        providerPref: model.providerKey as never,
        modelHint: model.apiModel ?? model.id,
        moduleId: "musicvideo",
        projectRef: { moduleId: "musicvideo", entityId: entity.id },
      });
      const asset = addAsset({
        entityId: entity.id,
        entityKind: kind,
        entityName,
        url,
        filePath: url,
        provider: model.providerKey,
        model: model.label,
        prompt,
        aspectRatio: aspect,
        width: size.width,
        height: size.height,
        sheetType: template.label,
      });
      setGallery((g) => [asset, ...g]);
      return asset;
    } catch (e) {
      setNote({ kind: "err", msg: e instanceof Error ? e.message : "Generation failed." });
      return null;
    } finally {
      setBusy(false);
    }
  };

  const generate = async () => {
    const asset = await runGenerate();
    if (asset) setPreview(asset);
  };

  const regenerateInPreview = async () => {
    const asset = await runGenerate();
    if (asset) setPreview(asset);
  };

  const removeAsset = (id: string) => {
    deleteAsset(id);
    setGallery((g) => g.filter((a) => a.id !== id));
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-8 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold">Image Studio — {entityName}</h1>
            <p className="text-xs text-muted">
              Generate a full {template.label.toLowerCase()} as one composed board.
            </p>
          </div>
        </div>
        <Button onClick={generate} disabled={busy}>
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : model.manual ? (
            <Clipboard className="h-4 w-4" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {model.manual ? "Copy Prompt" : "Generate"}
        </Button>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[24rem_1fr]">
        {/* Controls */}
        <div className="flex flex-col gap-5 overflow-y-auto border-r border-border p-6">
          {/* Model */}
          <div className="flex flex-col gap-1.5">
            <Label>Image model</Label>
            <div className="grid grid-cols-1 gap-2">
              {IMAGE_MODELS.map((m) => {
                const status = modelStatus(m.keyIds, m.manual);
                return (
                  <button
                    key={m.id}
                    onClick={() => setModelId(m.id)}
                    className={cn(
                      "flex items-center justify-between gap-2 rounded-[var(--radius-button)] border px-3 py-2 text-left transition-colors",
                      modelId === m.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:bg-elevated/60"
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{m.label}</span>
                      <span className="block truncate text-[11px] text-muted">{m.hint}</span>
                    </span>
                    <StatusDot status={status} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Template */}
          <div className="flex flex-col gap-1.5">
            <Label>Sheet template</Label>
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="h-9 w-full rounded-[var(--radius-input)] border border-border bg-surface px-3 text-sm focus-visible:border-primary focus-visible:outline-none"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-muted">{template.desc}</p>
          </div>

          {/* Aspect ratio */}
          <div className="flex flex-col gap-1.5">
            <Label>Aspect ratio</Label>
            <div className="flex flex-wrap gap-1.5">
              {ASPECT_RATIOS.map((a) => (
                <button
                  key={a}
                  onClick={() => setAspect(a)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs transition-colors",
                    aspect === a
                      ? "border-primary bg-primary/12 text-foreground"
                      : "border-border text-muted hover:bg-elevated/60"
                  )}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* Size */}
          <div className="flex flex-col gap-1.5">
            <Label>Image size</Label>
            <select
              value={sizeId}
              onChange={(e) => setSizeId(e.target.value)}
              className="h-9 w-full rounded-[var(--radius-input)] border border-border bg-surface px-3 text-sm focus-visible:border-primary focus-visible:outline-none"
            >
              {SIZE_PRESETS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            {sizePreset.id === "custom" ? (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={customW}
                  min={256}
                  max={2048}
                  onChange={(e) => setCustomW(+e.target.value)}
                  aria-label="Custom width"
                />
                <span className="text-muted">×</span>
                <Input
                  type="number"
                  value={customH}
                  min={256}
                  max={2048}
                  onChange={(e) => setCustomH(+e.target.value)}
                  aria-label="Custom height"
                />
              </div>
            ) : (
              <p className="text-[11px] text-muted">
                Output: {size.width} × {size.height} px
              </p>
            )}
          </div>

          {/* Prompt */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label>Sheet prompt {dirty && <span className="text-warning">(edited)</span>}</Label>
              <div className="flex items-center gap-1">
                <button
                  className="flex items-center gap-1 text-[11px] text-muted hover:text-foreground"
                  onClick={() => {
                    setPrompt(buildSheetPrompt(kind, entity, templateId, aspect));
                    setDirty(false);
                  }}
                  title="Reset to template"
                >
                  <RotateCcw className="h-3 w-3" /> Reset
                </button>
                <button
                  className="flex items-center gap-1 text-[11px] text-muted hover:text-foreground"
                  onClick={() => navigator.clipboard?.writeText(prompt)}
                  title="Copy prompt"
                >
                  <Copy className="h-3 w-3" /> Copy
                </button>
              </div>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                setDirty(true);
              }}
              className="min-h-40 w-full resize-y rounded-[var(--radius-input)] border border-border bg-surface p-3 font-mono text-[12px] leading-relaxed focus-visible:border-primary focus-visible:outline-none"
            />
          </div>

          {note && (
            <p
              className={cn(
                "flex items-start gap-1.5 rounded-md border px-3 py-2 text-[11px]",
                note.kind === "ok"
                  ? "border-success/30 bg-success/10 text-success"
                  : "border-danger/30 bg-danger/10 text-danger"
              )}
            >
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {note.msg}
            </p>
          )}
        </div>

        {/* Gallery */}
        <div className="min-h-0 overflow-y-auto p-6">
          {gallery.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <ImageIcon className="mb-3 h-8 w-8 text-muted" />
              <p className="text-sm font-medium">No sheets generated yet</p>
              <p className="mt-1 max-w-xs text-xs text-muted">
                Pick a model, template, aspect ratio, and size — then Generate. Click any result for
                a full-size preview, download, and Save to Bible.
                {!isTauri && " Browser preview uses placeholder images."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {gallery.map((a) => (
                <div
                  key={a.id}
                  className="group overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface shadow-card"
                >
                  <button
                    onClick={() => setPreview(a)}
                    className="relative block aspect-[4/3] w-full overflow-hidden bg-elevated"
                  >
                    <AssetImage
                      src={a.url}
                      alt={a.sheetType}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      label="Sheet"
                    />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-xs font-medium text-white opacity-0 transition-opacity group-hover:bg-black/40 group-hover:opacity-100">
                      Open preview
                    </span>
                  </button>
                  <div className="flex items-start justify-between gap-2 p-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{a.sheetType}</div>
                      <div className="flex items-center gap-1.5 text-[11px] text-muted">
                        {a.width}×{a.height} · {a.provider}
                        {a.savedTo.length > 0 && <Check className="h-3 w-3 text-success" />}
                      </div>
                    </div>
                    <button
                      onClick={() => removeAsset(a.id)}
                      aria-label="Delete"
                      className="text-muted hover:text-danger"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {preview && (
        <ImagePreviewModal
          asset={preview}
          entity={entity}
          entityKind={kind}
          onClose={() => setPreview(null)}
          onRegenerate={regenerateInPreview}
          regenerating={busy}
        />
      )}
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const map: Record<string, { c: string; label: string }> = {
    connected: { c: "bg-success", label: "Connected" },
    not_configured: { c: "bg-muted", label: "Not configured" },
    manual: { c: "bg-warning", label: "Manual" },
    error: { c: "bg-danger", label: "Error" },
  };
  const s = map[status] ?? map.not_configured;
  return (
    <span className="flex shrink-0 items-center gap-1 text-[10px] text-muted">
      <span className={cn("h-2 w-2 rounded-full", s.c)} /> {s.label}
    </span>
  );
}
