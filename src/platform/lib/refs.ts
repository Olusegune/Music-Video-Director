// Shared helper: resolve reference-image srcs (http / data: / Tauri paths) to
// raw base64 for the provider layer. Time-boxed so a slow/unreachable ref never
// stalls generation. Used by both the MV Director and the legacy Storyboard.

import { resolveAssetSrc } from "@/platform/components/ui/asset-image";

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(blob);
  });
}

async function fetchWithTimeout(url: string, ms = 15000): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Resolve ref srcs to base64 strings (no data: prefix); failures are skipped. */
export async function collectRefs(srcs?: string[]): Promise<string[]> {
  if (!srcs?.length) return [];
  const out: string[] = [];
  for (const s of srcs) {
    try {
      const resolved = await resolveAssetSrc(s);
      let dataUrl = resolved;
      if (!resolved.startsWith("data:")) {
        const resp = await fetchWithTimeout(resolved);
        dataUrl = await blobToDataUrl(await resp.blob());
      }
      const b64 = dataUrl.split(",")[1];
      if (b64) out.push(b64);
    } catch {
      /* skip an unreadable/slow ref */
    }
  }
  return out;
}
