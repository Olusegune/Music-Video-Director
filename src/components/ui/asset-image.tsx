import * as React from "react";
import { api, isTauri } from "@/lib/ipc";

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

export function useAssetSrc(src?: string): string {
  const initial = !src ? "" : PASSTHROUGH.test(src) ? src : cache.get(src) ?? "";
  const [resolved, setResolved] = React.useState(initial);

  React.useEffect(() => {
    let alive = true;
    if (!src) {
      setResolved("");
      return;
    }
    if (PASSTHROUGH.test(src)) {
      setResolved(src);
      return;
    }
    const hit = cache.get(src);
    if (hit) {
      setResolved(hit);
      return;
    }
    if (!isTauri) {
      setResolved(src);
      return;
    }
    setResolved("");
    resolveAssetSrc(src).then((r) => {
      if (alive) setResolved(r);
    });
    return () => {
      alive = false;
    };
  }, [src]);

  return resolved;
}

export function AssetImage({
  src,
  alt,
  className,
  style,
  fallback = null,
}: {
  src?: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  fallback?: React.ReactNode;
}) {
  const resolved = useAssetSrc(src);
  if (!resolved) return <>{fallback}</>;
  return <img src={resolved} alt={alt} className={className} style={style} />;
}

export function AssetVideo({
  src,
  poster,
  className,
  controls = true,
}: {
  src?: string;
  poster?: string;
  className?: string;
  controls?: boolean;
}) {
  const resolved = useAssetSrc(src);
  const resolvedPoster = useAssetSrc(poster);
  if (!resolved) return null;
  return (
    <video
      src={resolved}
      poster={resolvedPoster || undefined}
      controls={controls}
      className={className}
    />
  );
}
