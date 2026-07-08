import { useRef, useState } from "react";
import {
  Lock,
  Unlock,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  Plus,
  ImagePlus,
  Images,
  Video,
  Upload,
  Loader2,
} from "lucide-react";
import type { PromptPack, ShotBreakdown } from "@/platform/lib/types";
import { emptyShot, buildImagePrompt, buildVideoPrompt } from "@/platform/lib/pack";
import { api, isTauri } from "@/platform/lib/ipc";
import { collectRefs } from "@/platform/lib/refs";
import { errorMessage } from "@/platform/lib/utils";
import { Card, CardContent } from "@/platform/components/ui/card";
import { Button } from "@/platform/components/ui/button";
import { Badge } from "@/platform/components/ui/badge";
import { InlineInput, InlineTextarea } from "@/platform/components/ui/inline-edit";
import { AssetImage } from "@/platform/components/ui/asset-image";
import { AssetPicker } from "@/platform/features/assets/AssetPicker";
import { Users } from "lucide-react";

type Update = (updater: (prev: PromptPack) => PromptPack) => void;

/** Prefix a composed prompt with the project's visual-style DNA, if any. */
function withStyle(styleFragment: string, prompt: string): string {
  return [styleFragment, prompt].filter(Boolean).join(". ");
}

function renumber(shots: ShotBreakdown[]): ShotBreakdown[] {
  return shots.map((s, i) => ({ ...s, number: i + 1 }));
}

export function StoryboardEditor({
  pack,
  update,
  projectId,
  styleFragment = "",
}: {
  pack: PromptPack;
  update: Update;
  projectId: string;
  styleFragment?: string;
}) {
  const [busy, setBusy] = useState<Record<number, boolean>>({});
  const [busyVideo, setBusyVideo] = useState<Record<number, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [assetPickerIdx, setAssetPickerIdx] = useState<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const uploadIdx = useRef<number | null>(null);

  const setShots = (fn: (s: ShotBreakdown[]) => ShotBreakdown[]) =>
    update((p) => ({ ...p, shots: renumber(fn(p.shots)) }));

  const editShot = (idx: number, patch: Partial<ShotBreakdown>) =>
    setShots((shots) => shots.map((s, i) => (i === idx ? { ...s, ...patch } : s)));

  async function generateFrame(idx: number) {
    const shot = pack.shots[idx];
    setError(null);
    setBusy((b) => ({ ...b, [idx]: true }));
    try {
      const refs = await collectRefs(shot.refImages);
      const src = await api.generateShotImage(
        projectId,
        shot.number,
        withStyle(styleFragment, buildImagePrompt(pack, shot)),
        refs
      );
      editShot(idx, { imageUrl: src });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy((b) => ({ ...b, [idx]: false }));
    }
  }

  async function generateAll() {
    for (let i = 0; i < pack.shots.length; i++) {
      if (!pack.shots[i].locked) await generateFrame(i);
    }
  }

  async function generateVideo(idx: number) {
    const shot = pack.shots[idx];
    setError(null);
    setBusyVideo((b) => ({ ...b, [idx]: true }));
    try {
      const src = await api.generateShotVideo(
        projectId,
        shot.number,
        withStyle(styleFragment, buildVideoPrompt(pack, shot))
      );
      editShot(idx, { videoUrl: src });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusyVideo((b) => ({ ...b, [idx]: false }));
    }
  }

  function pickUpload(idx: number) {
    uploadIdx.current = idx;
    fileInput.current?.click();
  }

  async function onUploadFile(file: File) {
    const idx = uploadIdx.current;
    if (idx == null) return;
    const shot = pack.shots[idx];
    setError(null);
    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      if (isTauri) {
        const base64 = dataUrl.split(",")[1] ?? "";
        const ext = file.name.split(".").pop() || "png";
        const src = await api.importShotImage(projectId, shot.number, base64, ext);
        editShot(idx, { imageUrl: src });
      } else {
        // Browser: data URL displays directly.
        editShot(idx, { imageUrl: dataUrl });
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      uploadIdx.current = null;
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  const anyBusy = Object.values(busy).some(Boolean);

  const move = (idx: number, dir: -1 | 1) =>
    setShots((shots) => {
      const next = [...shots];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return shots;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });

  const duplicate = (idx: number) =>
    setShots((shots) => [
      ...shots.slice(0, idx + 1),
      { ...shots[idx], name: `${shots[idx].name} (copy)` },
      ...shots.slice(idx + 1),
    ]);

  const remove = (idx: number) => setShots((shots) => shots.filter((_, i) => i !== idx));

  const addShot = () => setShots((shots) => [...shots, emptyShot(shots.length + 1)]);

  return (
    <div>
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUploadFile(f);
        }}
      />
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted">Storyboard · {pack.shots.length} shots</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="accent"
            size="sm"
            onClick={generateAll}
            disabled={anyBusy || pack.shots.length === 0}
          >
            {anyBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Images className="h-4 w-4" />
            )}
            Generate Frames
          </Button>
          <Button variant="secondary" size="sm" onClick={addShot}>
            <Plus className="h-4 w-4" /> Add Shot
          </Button>
        </div>
      </div>

      {error && (
        <p className="mb-3 rounded-[var(--radius-card)] border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {pack.shots.map((shot, idx) => (
          <Card key={idx} className={shot.locked ? "border-primary/40 opacity-90" : ""}>
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <Badge variant="primary">Shot {shot.number}</Badge>
              <div className="flex items-center gap-0.5">
                <IconBtn
                  title={shot.locked ? "Unlock" : "Lock"}
                  onClick={() => editShot(idx, { locked: !shot.locked })}
                >
                  {shot.locked ? (
                    <Lock className="h-4 w-4 text-primary" />
                  ) : (
                    <Unlock className="h-4 w-4" />
                  )}
                </IconBtn>
                <IconBtn title="Move up" onClick={() => move(idx, -1)}>
                  <ArrowUp className="h-4 w-4" />
                </IconBtn>
                <IconBtn title="Move down" onClick={() => move(idx, 1)}>
                  <ArrowDown className="h-4 w-4" />
                </IconBtn>
                <IconBtn title="Duplicate" onClick={() => duplicate(idx)}>
                  <Copy className="h-4 w-4" />
                </IconBtn>
                <IconBtn title="Delete" onClick={() => remove(idx)} className="hover:text-danger">
                  <Trash2 className="h-4 w-4" />
                </IconBtn>
              </div>
            </div>

            {/* Storyboard frame / video */}
            <div className="group/thumb relative aspect-video overflow-hidden bg-elevated">
              {shot.videoUrl ? (
                <video
                  src={shot.videoUrl}
                  poster={shot.imageUrl || undefined}
                  controls
                  className="h-full w-full object-cover"
                />
              ) : shot.imageUrl ? (
                <img
                  src={shot.imageUrl}
                  alt={`Shot ${shot.number}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-muted">
                  Shot {shot.number}
                </div>
              )}
              <div className="absolute bottom-2 right-2 flex flex-col items-end gap-1.5">
                <button
                  onClick={() => pickUpload(idx)}
                  disabled={shot.locked}
                  title="Upload frame (lock as reference)"
                  aria-label="Upload frame"
                  className="flex items-center gap-1.5 rounded-[var(--radius-button)] bg-black/60 px-2.5 py-1.5 text-xs font-medium text-white backdrop-blur transition-opacity hover:bg-black/80 disabled:opacity-60"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Upload
                </button>
                <button
                  onClick={() => generateFrame(idx)}
                  disabled={busy[idx] || shot.locked}
                  title={shot.imageUrl ? "Regenerate frame" : "Generate frame"}
                  aria-label={shot.imageUrl ? "Regenerate frame" : "Generate frame"}
                  className="flex items-center gap-1.5 rounded-[var(--radius-button)] bg-black/60 px-2.5 py-1.5 text-xs font-medium text-white backdrop-blur transition-opacity hover:bg-black/80 disabled:opacity-60"
                >
                  {busy[idx] ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ImagePlus className="h-3.5 w-3.5" />
                  )}
                  {busy[idx] ? "Generating…" : shot.imageUrl ? "Regenerate" : "Generate frame"}
                </button>
                <button
                  onClick={() => generateVideo(idx)}
                  disabled={busyVideo[idx] || shot.locked}
                  title={shot.videoUrl ? "Regenerate video" : "Generate video"}
                  aria-label={shot.videoUrl ? "Regenerate video" : "Generate video"}
                  className="flex items-center gap-1.5 rounded-[var(--radius-button)] bg-primary/80 px-2.5 py-1.5 text-xs font-medium text-white backdrop-blur transition-opacity hover:bg-primary disabled:opacity-60"
                >
                  {busyVideo[idx] ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Video className="h-3.5 w-3.5" />
                  )}
                  {busyVideo[idx] ? "Rendering…" : shot.videoUrl ? "Regen video" : "Generate video"}
                </button>
                <button
                  onClick={() => setAssetPickerIdx(idx)}
                  disabled={shot.locked}
                  title="Attach characters / sets / props as references"
                  aria-label="Attach assets"
                  className="flex items-center gap-1.5 rounded-[var(--radius-button)] bg-black/60 px-2.5 py-1.5 text-xs font-medium text-white backdrop-blur transition-opacity hover:bg-black/80 disabled:opacity-60"
                >
                  <Users className="h-3.5 w-3.5" />
                  Assets{shot.refImages?.length ? ` (${shot.refImages.length})` : ""}
                </button>
              </div>
            </div>

            <CardContent className="flex flex-col gap-2 pt-3">
              {(shot.refImages?.length ?? 0) > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] uppercase tracking-wide text-muted">Refs</span>
                  {shot.refImages!.map((src, ri) => (
                    <span key={ri} className="relative h-9 w-9">
                      <AssetImage
                        src={src}
                        alt={`ref ${ri + 1}`}
                        className="h-9 w-9 rounded border border-border object-cover"
                      />
                      <button
                        onClick={() =>
                          editShot(idx, {
                            refImages: shot.refImages!.filter((_, j) => j !== ri),
                          })
                        }
                        className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-white"
                        title="Remove reference"
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <fieldset disabled={shot.locked} className="flex flex-col gap-2 disabled:opacity-70">
                <div className="flex items-center gap-2">
                  <InlineInput
                    value={shot.name}
                    onChange={(v) => editShot(idx, { name: v })}
                    placeholder="Shot name"
                    className="font-medium"
                  />
                  <InlineInput
                    value={shot.duration}
                    onChange={(v) => editShot(idx, { duration: v })}
                    placeholder="3s"
                    className="w-16 text-right text-muted"
                  />
                </div>
                <InlineInput
                  value={shot.purpose}
                  onChange={(v) => editShot(idx, { purpose: v })}
                  placeholder="Purpose"
                  className="text-xs text-muted"
                />
                <InlineTextarea
                  value={shot.visualDescription}
                  onChange={(v) => editShot(idx, { visualDescription: v })}
                  placeholder="Visual description…"
                  rows={2}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Labeled label="Camera">
                    <InlineInput
                      value={shot.cameraMovement}
                      onChange={(v) => editShot(idx, { cameraMovement: v })}
                      placeholder="Movement"
                    />
                  </Labeled>
                  <Labeled label="Transition">
                    <InlineInput
                      value={shot.transition}
                      onChange={(v) => editShot(idx, { transition: v })}
                      placeholder="Transition"
                    />
                  </Labeled>
                </div>
                <Labeled label="Audio">
                  <InlineInput
                    value={shot.audio}
                    onChange={(v) => editShot(idx, { audio: v })}
                    placeholder="Audio direction"
                  />
                </Labeled>
              </fieldset>
            </CardContent>
          </Card>
        ))}
      </div>

      {assetPickerIdx !== null && (
        <AssetPicker
          onAdd={(srcs) => {
            const i = assetPickerIdx;
            editShot(i, {
              refImages: Array.from(new Set([...(pack.shots[i]?.refImages ?? []), ...srcs])),
            });
          }}
          onClose={() => setAssetPickerIdx(null)}
        />
      )}
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  title,
  className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  className?: string;
}) {
  return (
    <button
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`rounded-md p-1.5 text-muted transition-colors hover:bg-elevated hover:text-foreground ${className ?? ""}`}
    >
      {children}
    </button>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="px-1.5 text-[10px] uppercase tracking-wide text-muted">{label}</span>
      {children}
    </div>
  );
}
