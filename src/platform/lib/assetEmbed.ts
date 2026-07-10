// Resolve a media reference to a data URL for bundling.
//
// resolveAssetSrc handles the Tauri case (local path -> data URL via the Rust
// core) but returns the path untouched in a browser, where it is loadable as a
// relative URL. Bundling needs actual bytes either way, so fall back to fetch.

import { resolveAssetSrc } from "@/platform/components/ui/asset-image";

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read media."));
    reader.readAsDataURL(blob);
  });
}

async function fetchWithTimeout(url: string, ms = 10000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Throws when the media cannot be read; the bundler records that as omitted. */
export async function resolveAssetForBundle(ref: string): Promise<string> {
  const resolved = await resolveAssetSrc(ref);
  if (!resolved) throw new Error(`Unreadable media: ${ref}`);
  if (resolved.startsWith("data:")) return resolved;
  const response = await fetchWithTimeout(resolved);
  if (!response.ok) throw new Error(`Unreadable media: ${ref}`);
  const blob = await response.blob();
  // A dev server or web host answering a missing file with its index page hands
  // back HTML at 200. Embedding that would put an error page in the bundle.
  if (/^text\/html/i.test(blob.type)) throw new Error(`Missing media: ${ref}`);
  return blobToDataUrl(blob);
}
