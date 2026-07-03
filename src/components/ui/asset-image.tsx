import * as React from "react";
import { ImageOff } from "lucide-react";
import { api, isTauri } from "@/lib/ipc";
import { cn } from "@/lib/utils";

/**
 * Generated media is stored as a local file path. The webview can't load those
 * directly (and the asset protocol is unreliable across installs), so we resolve
 * each path to a `data:` URL via the Rust core and cache it in memory. Remote
 * URLs (http/https), existing data:/blob: URLs, and empty values pass through.
 */
const cache = new Map<string, string>();
const PASSTHROUGH = /^(https?:|data:|blob:)/i;

export async function resolveAssetSrc(src?: string): Promise<string> {
  if (!src) return "";
  if (PASSTHROUGH.test(src)) return src;
  const hit = cache.get(src);
  if (hit) return hit;
  if (!isTauri) return src;
  try {
    const data = await api.assetDataUrl(src);
    cache.set(src, data);
    return data;
  } catch {
    return "";
  }
}

type AssetStatus = "empty" | "loading" | "ready" | "broken";

function statusFor(src: string | undefined): { resolved: string; status: AssetStatus } {
  if (!src) return { resolved: "", status: "empty" };
  if (PASSTHROUGH.test(src)) return { resolved: src, status: "ready" };
  const hit = cache.get(src);
  if (hit) return { resolved: hit, status: "ready" };
  if (!isTauri) return { resolved: src, status: "ready" };
  return { resolved: "", status: "loading" };
}

/** Tracks a path's resolution, distinguishing "no image assigned" (empty) from
 *  "an image was assigned but the file couldn't be resolved" (broken) — the
 *  latter is what drives the broken-asset placeholder below. */
function useAssetStatus(src?: string): { resolved: string; status: AssetStatus } {
  const [state, setState] = React.useState(() => statusFor(src));

  React.useEffect(() => {
    let alive = true;
    const initial = statusFor(src);
    setState(initial);
    if (initial.status !== "loading") return;
    resolveAssetSrc(src).then((r) => {
      if (!alive) return;
      setState(r ? { resolved: r, status: "ready" } : { resolved: "", status: "broken" });
    });
    return () => {
      alive = false;
    };
  }, [src]);

  return state;
}

export function useAssetSrc(src?: string): string {
  return useAssetStatus(src).resolved;
}

interface BrokenAssetActions {
  /** Short noun for the broken-state message, e.g. "Portrait", "Frame". Defaults to "Image". */
  label?: string;
  /** Re-run AI generation for whatever this image represents. */
  onRegenerate?: () => void;
  /** Open a file picker / upload flow to replace it. */
  onReplace?: () => void;
  /** Clear the reference entirely. */
  onRemove?: () => void;
}

function BrokenAssetPlaceholder({
  label = "Image",
  className,
  onRegenerate,
  onReplace,
  onRemove,
}: BrokenAssetActions & { className?: string }) {
  const hasActions = onRegenerate || onReplace || onRemove;
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-1 border border-dashed border-border bg-elevated/40 p-1.5 text-center",
        className
      )}
      title={`${label} unavailable — the file couldn't be found or failed to generate.`}
    >
      <ImageOff className="h-4 w-4 shrink-0 text-muted" />
      <span className="line-clamp-1 text-[10px] font-medium leading-tight text-muted">
        {label} unavailable
      </span>
      {hasActions && (
        <div className="flex flex-wrap items-center justify-center gap-x-1.5">
          {onRegenerate && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRegenerate();
              }}
              className="text-[10px] font-medium text-primary hover:underline"
            >
              Regenerate
            </button>
          )}
          {onReplace && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onReplace();
              }}
              className="text-[10px] font-medium text-primary hover:underline"
            >
              Replace
            </button>
          )}
          {onRemove && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="text-[10px] font-medium text-danger hover:underline"
            >
              Remove
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function AssetImage({
  src,
  alt,
  className,
  style,
  fallback = null,
  label,
  onRegenerate,
  onReplace,
  onRemove,
}: {
  src?: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  /** Shown while no image is assigned yet (empty/loading). Broken images
   *  always render the polished placeholder below, regardless of this prop —
   *  a failed asset is a distinct, actionable state, not an empty one. */
  fallback?: React.ReactNode;
} & BrokenAssetActions) {
  const { resolved, status } = useAssetStatus(src);
  // A src that resolved fine can still fail to actually decode (dead remote
  // URL, corrupt data). Track that separately, resetting whenever src changes.
  const [runtimeCheck, setRuntimeCheck] = React.useState({ src, broken: false });
  if (runtimeCheck.src !== src) setRuntimeCheck({ src, broken: false });

  if (status === "empty" || status === "loading") return <>{fallback}</>;
  if (status === "broken" || runtimeCheck.broken) {
    return (
      <BrokenAssetPlaceholder
        label={label}
        className={className}
        onRegenerate={onRegenerate}
        onReplace={onReplace}
        onRemove={onRemove}
      />
    );
  }
  return (
    <img
      src={resolved}
      alt={alt}
      className={className}
      style={style}
      onError={() => setRuntimeCheck({ src, broken: true })}
    />
  );
}

export function AssetVideo({
  src,
  poster,
  className,
  controls = true,
  muted,
  loop,
  autoPlay,
  label,
  onRegenerate,
  onReplace,
  onRemove,
}: {
  src?: string;
  poster?: string;
  className?: string;
  controls?: boolean;
  /** For silent auto-playing preview thumbnails (e.g. timeline scrubbers). */
  muted?: boolean;
  loop?: boolean;
  autoPlay?: boolean;
} & BrokenAssetActions) {
  const { resolved, status } = useAssetStatus(src);
  const resolvedPoster = useAssetSrc(poster);
  const [runtimeCheck, setRuntimeCheck] = React.useState({ src, broken: false });
  if (runtimeCheck.src !== src) setRuntimeCheck({ src, broken: false });

  if (status === "empty" || status === "loading") return null;
  if (status === "broken" || runtimeCheck.broken) {
    return (
      <BrokenAssetPlaceholder
        label={label ?? "Video"}
        className={className}
        onRegenerate={onRegenerate}
        onReplace={onReplace}
        onRemove={onRemove}
      />
    );
  }
  return (
    <video
      src={resolved}
      poster={resolvedPoster || undefined}
      controls={controls}
      muted={muted}
      loop={loop}
      autoPlay={autoPlay}
      playsInline
      className={className}
      onError={() => setRuntimeCheck({ src, broken: true })}
    />
  );
}
