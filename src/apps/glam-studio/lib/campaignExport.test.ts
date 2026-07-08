import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_GLAM_LAYOUT,
  GLAM_FORMATS,
  renderGlamFormat,
} from "@/apps/glam-studio/lib/campaignExport";

const { toPng } = vi.hoisted(() => ({
  toPng: vi.fn(async (_node: HTMLElement) => "data:image/png;base64,AQID"),
}));

vi.mock("html-to-image", () => ({ toPng }));

describe("Glam campaign formats and export", () => {
  beforeEach(() => toPng.mockClear());

  it("ships unique positive-dimension format presets", () => {
    expect(new Set(GLAM_FORMATS.map((format) => format.id)).size).toBe(GLAM_FORMATS.length);
    expect(GLAM_FORMATS.every((format) => format.width > 0 && format.height > 0)).toBe(true);
  });

  it("keeps the safe centered crop and bottom-right copy default", () => {
    expect(DEFAULT_GLAM_LAYOUT).toEqual({
      copyPosition: "bottom-right",
      cropPosition: "center",
    });
  });

  it("escapes campaign copy and returns PNG bytes", async () => {
    const bytes = await renderGlamFormat(GLAM_FORMATS[0], {
      headline: "<script>alert(1)</script>",
      brandName: "Wheelbarrow",
      productName: "Director Studio",
      palette: ["#050509", "#d4af37"],
    });

    expect([...bytes]).toEqual([1, 2, 3]);
    expect(toPng).toHaveBeenCalledOnce();
    const renderedNode = toPng.mock.calls[0]?.[0] as HTMLElement;
    expect(renderedNode.innerHTML).toContain("&lt;script&gt;");
    expect(document.body.children).toHaveLength(0);
  });
});
