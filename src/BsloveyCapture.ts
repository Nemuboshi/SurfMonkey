import { Zip, ZipPassThrough } from "fflate";
import { saveAs } from "file-saver";

import { bytesToBlobPart } from "./blobParts";

type ViewerPage = {
  src: string;
  slideNumber: number;
};

type ViewerEntry = {
  title: string;
  id: string;
  pages: ViewerPage[];
};

type DownloadedPage = {
  name: string;
  bytes: Uint8Array;
};

type PanelRefs = {
  panel: HTMLDivElement;
  title: HTMLSpanElement;
  fromInput: HTMLInputElement;
  toInput: HTMLInputElement;
  button: HTMLButtonElement;
  status: HTMLSpanElement;
};

const PANEL_ID = "__bslovey_capture_panel";
const ZIP_MIME = "application/zip";
const FETCH_CONCURRENCY = 4;

function log(...args: unknown[]): void {
  console.log("[BsloveyCapture]", ...args);
}

function pad(value: number, length = 4): string {
  return String(value).padStart(length, "0");
}

function sanitizeFilePart(value: string): string {
  const cleaned = Array.from(value, (char) => {
    const code = char.charCodeAt(0);
    return code < 32 || '<>:"/\\|?*'.includes(char) ? "_" : char;
  }).join("");

  return cleaned.replace(/\s+/g, " ").trim() || "bslovey";
}

function isViewerImage(src: string): boolean {
  try {
    const url = new URL(src, window.location.href);
    return (
      (url.hostname === "bslovey.com" || url.hostname === "www.bslovey.com") &&
      url.pathname.startsWith("/archives/") &&
      /\.(?:avif|gif|jpe?g|png|webp)$/i.test(url.pathname)
    );
  } catch {
    return false;
  }
}

function getEntryTitle(): string {
  const heading = document.querySelector<HTMLElement>("h1")?.textContent?.trim();
  const pageTitle = document.title.split("|")[0]?.trim();
  return heading || pageTitle || "B's-LOVEY";
}

function getViewerEntry(): ViewerEntry {
  const seen = new Set<string>();
  const pages: ViewerPage[] = [];

  for (const [index, slide] of Array.from(
    document.querySelectorAll<HTMLElement>(".swiper-slide"),
  ).entries()) {
    const image = slide.querySelector<HTMLImageElement>("img");
    const rawSrc = image?.currentSrc || image?.getAttribute("src") || image?.dataset.src || "";
    if (!rawSrc || !isViewerImage(rawSrc)) {
      continue;
    }

    const src = new URL(rawSrc, window.location.href).href;
    if (seen.has(src)) {
      continue;
    }

    seen.add(src);
    pages.push({ src, slideNumber: index + 1 });
  }

  if (pages.length === 0) {
    throw new Error("No viewer pages found");
  }

  // The B's-LOVEY swiper stores manga pages in left-to-right DOM order,
  // while the reader presents them in Japanese right-to-left reading order.
  pages.reverse();

  return {
    title: getEntryTitle(),
    id: window.location.pathname.match(/entry-([^/.]+)/)?.[1] ?? "entry",
    pages,
  };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const output = new Array<R>(items.length);
  let cursor = 0;

  const run = async (): Promise<void> => {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) {
        return;
      }
      output[index] = await worker(items[index], index);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(Math.max(1, Math.floor(concurrency)), items.length) }, run),
  );
  return output;
}

function getSourceExtension(src: string): string {
  const extension = new URL(src).pathname.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
  return extension === "jpeg" ? "jpg" : extension || "jpg";
}

function getOriginalImageAccept(extension: string): string {
  if (extension === "png") return "image/png";
  if (extension === "gif") return "image/gif";
  if (extension === "avif") return "image/avif";
  if (extension === "webp") return "image/webp";
  return "image/jpeg";
}

function detectImageExtension(bytes: Uint8Array): string | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "png";
  }
  if (String.fromCharCode(...bytes.slice(0, 4)) === "GIF8") return "gif";
  if (
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return "webp";
  }
  if (String.fromCharCode(...bytes.slice(4, 12)) === "ftypavif") return "avif";
  return null;
}

function buildOriginalImageUrl(src: string, pageNumber: number): string {
  const url = new URL(src);
  // The CDN may reuse the WebP variant already cached for the <img>. A unique
  // query forces a fresh content-negotiated request for the source file.
  url.searchParams.set("__bslovey_original", `${Date.now()}-${pageNumber}`);
  return url.href;
}

async function downloadPage(page: ViewerPage, pageNumber: number): Promise<DownloadedPage> {
  const sourceExtension = getSourceExtension(page.src);
  const response = await fetch(buildOriginalImageUrl(page.src, pageNumber), {
    credentials: "same-origin",
    headers: { Accept: getOriginalImageAccept(sourceExtension) },
    cache: "no-store",
    referrerPolicy: "strict-origin-when-cross-origin",
  });
  if (!response.ok) {
    throw new Error(`page ${pageNumber} failed (${response.status})`);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  const actualExtension = detectImageExtension(bytes);
  if (!actualExtension) {
    throw new Error(`page ${pageNumber} returned an unknown image format`);
  }
  if (sourceExtension === "jpg" && actualExtension !== "jpg") {
    throw new Error(`page ${pageNumber} returned ${actualExtension}, expected original JPEG`);
  }

  return {
    name: `${pad(pageNumber)}.${actualExtension}`,
    bytes,
  };
}

async function createZip(files: DownloadedPage[]): Promise<Blob> {
  const chunks: BlobPart[] = [];
  return await new Promise<Blob>((resolve, reject) => {
    const zip = new Zip((error, data, final) => {
      if (error) {
        reject(error);
        return;
      }
      chunks.push(bytesToBlobPart(data));
      if (final) {
        resolve(new Blob(chunks, { type: ZIP_MIME }));
      }
    });

    try {
      for (const file of files) {
        const entry = new ZipPassThrough(file.name);
        zip.add(entry);
        entry.push(file.bytes, true);
      }
      zip.end();
    } catch (error) {
      try {
        zip.terminate();
      } catch {
        // Ignore termination errors while reporting the original error.
      }
      reject(error);
    }
  });
}

async function downloadRange(
  entry: ViewerEntry,
  from: number,
  to: number,
  onProgress: (status: string) => void,
): Promise<string> {
  const start = Math.max(1, Math.min(from, to, entry.pages.length));
  const end = Math.max(start, Math.min(Math.max(from, to), entry.pages.length));
  const targets = entry.pages.slice(start - 1, end);
  let completed = 0;

  const files = await mapWithConcurrency(targets, FETCH_CONCURRENCY, async (page, index) => {
    const file = await downloadPage(page, start + index);
    completed += 1;
    onProgress(`page ${completed}/${targets.length}`);
    return file;
  });

  onProgress("zipping");
  const blob = await createZip(files);
  const fileName = `${sanitizeFilePart(entry.title)} - ${entry.id} - p${pad(start)}-p${pad(end)}.zip`;
  saveAs(blob, fileName);
  return fileName;
}

function createNumberInput(value: string): HTMLInputElement {
  const input = document.createElement("input");
  input.type = "number";
  input.min = "1";
  input.value = value;
  input.style.cssText = [
    "width:64px",
    "padding:4px 6px",
    "border:1px solid rgba(255,255,255,.25)",
    "border-radius:6px",
    "background:rgba(255,255,255,.14)",
    "color:#fff",
  ].join(";");
  return input;
}

function createPanel(): PanelRefs {
  const panel = document.createElement("div");
  panel.id = PANEL_ID;
  panel.style.cssText = [
    "position:fixed",
    "right:16px",
    "bottom:16px",
    "z-index:2147483647",
    "display:flex",
    "flex-direction:column",
    "gap:10px",
    "min-width:230px",
    "padding:12px",
    "border:1px solid rgba(255,255,255,.14)",
    "border-radius:8px",
    "background:rgba(12,14,18,.88)",
    "backdrop-filter:blur(10px)",
    "box-shadow:0 12px 36px rgba(0,0,0,.34)",
    "color:#fff",
    "font:12px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace",
  ].join(";");

  const title = document.createElement("span");
  title.style.cssText =
    "max-width:230px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:700";

  const badge = document.createElement("span");
  badge.textContent = "BsloveyCapture";
  badge.style.cssText =
    "padding:2px 7px;border-radius:999px;background:rgba(234,134,159,.2);color:#ffb5c7;font-size:11px;font-weight:700";

  const header = document.createElement("div");
  header.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:10px";
  header.append(title, badge);

  const fromInput = createNumberInput("1");
  const toInput = createNumberInput("1");
  const row = document.createElement("div");
  row.style.cssText = "display:flex;align-items:center;gap:8px";
  row.append("pages", fromInput, document.createTextNode("~"), toInput);

  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "capture zip";
  button.style.cssText =
    "width:100%;padding:7px 10px;border:0;border-radius:6px;background:#ee8fa7;color:#171717;font-weight:700;cursor:pointer";

  const status = document.createElement("span");
  status.textContent = "waiting for viewer";
  status.style.cssText =
    "display:block;min-height:14px;max-width:230px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:rgba(255,255,255,.76)";

  panel.append(header, row, button, status);
  return { panel, title, fromInput, toInput, button, status };
}

function installPanel(entry: ViewerEntry): void {
  if (!document.body || document.getElementById(PANEL_ID)) {
    return;
  }

  const refs = createPanel();
  refs.title.textContent = entry.title;
  refs.toInput.value = String(entry.pages.length);
  refs.fromInput.max = String(entry.pages.length);
  refs.toInput.max = String(entry.pages.length);
  refs.status.textContent = `ready ${entry.pages.length} pages`;

  refs.button.onclick = async () => {
    const from = Number.parseInt(refs.fromInput.value || "1", 10);
    const to = Number.parseInt(refs.toInput.value || String(entry.pages.length), 10);
    refs.button.disabled = true;
    try {
      const fileName = await downloadRange(entry, from, to, (status) => {
        refs.status.textContent = status;
      });
      refs.status.textContent = `saved ${fileName}`;
    } catch (error) {
      refs.status.textContent = error instanceof Error ? error.message : String(error);
      console.error(error);
    } finally {
      refs.button.disabled = false;
    }
  };

  document.body.appendChild(refs.panel);
}

function init(): void {
  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    try {
      const entry = getViewerEntry();
      window.clearInterval(timer);
      installPanel(entry);
      log(`ready: ${entry.pages.length} pages`);
    } catch (error) {
      if (attempts >= 80) {
        window.clearInterval(timer);
        log("viewer unavailable", error);
      }
    }
  }, 250);
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  init();
}
