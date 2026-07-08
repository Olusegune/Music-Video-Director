import { toPng } from "html-to-image";
export { buildZip, downloadBlob } from "@/platform/lib/archive";

export interface GlamFormatPreset {
  id: string;
  title: string;
  width: number;
  height: number;
}

export interface GlamRenderInput {
  heroUrl?: string;
  headline: string;
  brandName: string;
  productName: string;
  palette: string[];
  layout?: GlamFormatLayout;
}

export type GlamCopyPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";
export type GlamCropPosition = "left" | "center" | "right";

export interface GlamFormatLayout {
  copyPosition: GlamCopyPosition;
  cropPosition: GlamCropPosition;
}

export const DEFAULT_GLAM_LAYOUT: GlamFormatLayout = {
  copyPosition: "bottom-right",
  cropPosition: "center",
};

export const GLAM_FORMATS: GlamFormatPreset[] = [
  { id: "ig-square", title: "IG Square", width: 1080, height: 1080 },
  { id: "ig-portrait", title: "IG Portrait", width: 1080, height: 1350 },
  { id: "story", title: "Story", width: 1080, height: 1920 },
  { id: "hero", title: "Hero Banner", width: 1920, height: 1080 },
];

function safeText(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character] ?? character
  );
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const encoded = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const binary = atob(encoded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export async function renderGlamFormat(
  format: GlamFormatPreset,
  input: GlamRenderInput
): Promise<Uint8Array> {
  const node = document.createElement("div");
  const horizontal = format.width > format.height;
  const layout = input.layout ?? DEFAULT_GLAM_LAYOUT;
  const copyTop = layout.copyPosition.startsWith("top");
  const copyRight = layout.copyPosition.endsWith("right");
  const padding = Math.round(Math.min(format.width, format.height) * 0.075);
  const headlineSize = Math.round(
    Math.min(format.width, format.height) * (horizontal ? 0.07 : 0.09)
  );
  const background = `linear-gradient(135deg, ${input.palette[0] ?? "#050509"}, ${input.palette[1] ?? "#1f2937"} 48%, ${input.palette[2] ?? "#d4af37"})`;
  node.style.cssText = `position:fixed;left:-10000px;top:0;width:${format.width}px;height:${format.height}px;overflow:hidden;background:${background};font-family:Inter,Arial,sans-serif;color:white;`;
  node.innerHTML = `
    ${input.heroUrl ? `<img src="${safeText(input.heroUrl)}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:${layout.cropPosition} center" />` : ""}
    <div style="position:absolute;inset:0;background:linear-gradient(${copyTop ? "180deg" : "0deg"},rgba(0,0,0,.72),rgba(0,0,0,.04) 55%,rgba(0,0,0,.12))"></div>
    <div style="position:absolute;left:${padding}px;right:${padding}px;${copyTop ? `top:${padding}px` : `bottom:${padding}px`};text-align:${copyRight ? "right" : "left"}">
      <div style="font-size:${headlineSize}px;font-weight:850;line-height:1.02;letter-spacing:-.035em;text-shadow:0 3px 18px rgba(0,0,0,.45)">${safeText(input.headline)}</div>
      <div style="margin-top:${Math.round(headlineSize * 0.35)}px;font-size:${Math.round(headlineSize * 0.28)}px;font-weight:750;letter-spacing:.18em;text-transform:uppercase;opacity:.86">${safeText(input.brandName)}</div>
      <div style="margin-top:${Math.round(headlineSize * 0.18)}px;font-size:${Math.round(headlineSize * 0.23)}px;opacity:.68">${safeText(input.productName)}</div>
    </div>`;
  document.body.appendChild(node);
  try {
    const dataUrl = await toPng(node, {
      width: format.width,
      height: format.height,
      pixelRatio: 1,
      cacheBust: true,
    });
    return dataUrlToBytes(dataUrl);
  } finally {
    node.remove();
  }
}
