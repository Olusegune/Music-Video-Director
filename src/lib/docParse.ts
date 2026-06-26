// Document upload parsing — extract plain text from TXT / PDF / DOC / DOCX so it
// can feed the Concept Brief and the creative engine. Runs entirely client-side
// (works in both the browser dev build and the Tauri webview — no Rust needed).

import * as pdfjsLib from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import * as mammoth from "mammoth";

// pdf.js needs its worker; Vite bundles it and gives us a URL.
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export interface ExtractResult {
  text: string;
  /** Non-fatal note (e.g. legacy .doc parsed best-effort). */
  warning?: string;
}

export const ACCEPTED_EXTENSIONS = [
  ".txt",
  ".md",
  ".csv",
  ".fountain",
  ".pdf",
  ".doc",
  ".docx",
];
export const ACCEPT_ATTR = ACCEPTED_EXTENSIONS.join(",");

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

export async function extractTextFromFile(file: File): Promise<ExtractResult> {
  const ext = extOf(file.name);

  if (
    ext === "txt" ||
    ext === "md" ||
    ext === "csv" ||
    ext === "fountain" ||
    file.type.startsWith("text/")
  ) {
    return { text: clean(await file.text()) };
  }

  if (ext === "pdf" || file.type === "application/pdf") {
    return { text: clean(await extractPdf(file)) };
  }

  if (ext === "docx") {
    const arrayBuffer = await file.arrayBuffer();
    const { value } = await mammoth.extractRawText({ arrayBuffer });
    return { text: clean(value) };
  }

  if (ext === "doc") {
    // Legacy binary Word — strip non-printable bytes, best effort.
    const raw = await file.text();
    const stripped = clean(raw.replace(/[^\x09\x0A\x0D\x20-\x7E]+/g, " "));
    return {
      text: stripped,
      warning:
        "Legacy .doc files don't extract cleanly. For best results re-save as .docx or .pdf.",
    };
  }

  throw new Error(`Unsupported file type ".${ext}". Use TXT, PDF, DOC, or DOCX.`);
}

async function extractPdf(file: File): Promise<string> {
  const data = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const line = content.items
      // TextItem has `str`; TextMarkedContent does not.
      .map((it) =>
        typeof (it as { str?: string }).str === "string"
          ? (it as { str: string }).str
          : ""
      )
      .join(" ");
    pages.push(line);
  }
  return pages.join("\n\n");
}

function clean(s: string): string {
  return s
    .replace(/\r\n/g, "\n")
    .replace(/ /g, " ") // non-breaking space → normal space
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
