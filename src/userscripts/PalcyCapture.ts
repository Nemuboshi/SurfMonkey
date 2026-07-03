import { Zip, ZipPassThrough } from "fflate";
import { saveAs } from "file-saver";

import { bytesToBlobPart, bytesToImageDataArray } from "../shared/blobParts";
import { descrambleCobaltGridImageData } from "../shared/cobaltGrid";

type PalcyImage = {
  url: string;
  width: number;
  height: number;
  gridSize?: number;
  decryptionKey?: string;
};

type PalcyPage = {
  page: number;
  image: PalcyImage;
};

type PalcyComic = {
  comicId: string;
  title: string;
  pages: PalcyPage[];
};

type CaptureOptions = {
  comicId?: string;
  from?: number;
  to?: number;
  onProgress?: (status: string) => void;
};

type CaptureSummary = {
  fileName: string;
  from: number;
  to: number;
  pageCount: number;
};

type CapturePage = {
  number: number;
  url: string;
  width: number;
  height: number;
  gridSize?: number;
  key?: string;
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

declare global {
  interface Window {
    __palcyCapture__?: {
      captureRange: (options?: CaptureOptions) => Promise<CaptureSummary>;
    };
  }
}

const PANEL_ID = "__palcy_capture_panel";
const ZIP_MIME = "application/zip";
const FETCH_CONCURRENCY = 4;

let comicCache: PalcyComic | null = null;

function log(...args: unknown[]): void {
  console.log("[PalcyCapture]", ...args);
}

function pad(value: number, length = 3): string {
  return String(value).padStart(length, "0");
}

function sanitizeFilePart(value: string): string {
  const cleaned = Array.from(value, (char) => {
    const code = char.charCodeAt(0);
    if (code < 32 || '<>:"/\\|?*'.includes(char)) {
      return "_";
    }
    return char;
  }).join("");

  return cleaned.replace(/\s+/g, " ").trim() || "palcy";
}

export function parseComicIdFromPath(pathname: string): string | null {
  return pathname.match(/^\/comics\/(\d+)(?:\/)?$/)?.[1] ?? null;
}

export function parseComicIdFromUrl(urlLike: string): string | null {
  try {
    const base =
      typeof window !== "undefined" && window.location?.origin
        ? window.location.origin
        : "https://palcy.jp";
    const parsed = new URL(urlLike, base);
    return parseComicIdFromPath(parsed.pathname);
  } catch {
    return null;
  }
}

export function normalizeCapturePages(comic: PalcyComic): CapturePage[] {
  return comic.pages.map((page) => {
    if (!page.image?.url) {
      throw new Error(`Page ${page.page} image is unavailable`);
    }
    return {
      number: page.page,
      url: page.image.url,
      width: page.image.width,
      height: page.image.height,
      gridSize: page.image.gridSize,
      key: page.image.decryptionKey,
    };
  });
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) {
    return [];
  }

  const out = new Array<R>(items.length);
  const limit = Math.max(1, Math.floor(concurrency));
  let cursor = 0;

  const run = async (): Promise<void> => {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) {
        return;
      }
      out[index] = await worker(items[index], index);
    }
  };

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => run()));
  return out;
}

async function blobToBitmap(blob: Blob): Promise<ImageBitmap> {
  return await createImageBitmap(blob);
}

async function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("canvas.toBlob failed"));
        return;
      }
      resolve(blob);
    }, "image/png");
  });
}

function buildArchiveName(comic: PalcyComic, from: number, to: number): string {
  return `${sanitizeFilePart(comic.title)} - p${pad(from)}-p${pad(to)}.zip`;
}

async function fetchComic(comicId: string): Promise<PalcyComic> {
  if (comicCache?.comicId === comicId) {
    return comicCache;
  }

  const response = await fetch(`/api/v2/comics/${comicId}.json`, {
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    throw new Error(`comic api failed (${response.status})`);
  }

  const comic = (await response.json()) as PalcyComic;
  if (!comic.comicId || !comic.title || !Array.isArray(comic.pages)) {
    throw new Error("comic payload is invalid");
  }
  if (comic.pages.length === 0) {
    throw new Error("comic has no preview pages");
  }

  comicCache = comic;
  return comic;
}

async function downloadPage(page: CapturePage): Promise<DownloadedPage> {
  const response = await fetch(page.url, {
    headers: page.key
      ? {
          "X-Cobalt-Thumber-Parameter-GridShuffle-Key": page.key,
        }
      : undefined,
  });
  if (!response.ok) {
    throw new Error(`page ${page.number} fetch failed (${response.status})`);
  }

  const blob = await response.blob();
  const bitmap = await blobToBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = page.width;
  canvas.height = page.height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    bitmap.close();
    throw new Error("2D context unavailable");
  }

  try {
    context.drawImage(bitmap, 0, 0);
    if (page.key && page.gridSize) {
      const imageData = context.getImageData(0, 0, page.width, page.height);
      const descrambled = await descrambleCobaltGridImageData(
        imageData.data,
        page.width,
        page.height,
        page.gridSize,
        page.gridSize,
        page.key,
      );
      context.putImageData(
        new ImageData(bytesToImageDataArray(descrambled), page.width, page.height),
        0,
        0,
      );
    }

    const pngBlob = await canvasToPngBlob(canvas);
    return {
      name: `${pad(page.number)}.png`,
      bytes: new Uint8Array(await pngBlob.arrayBuffer()),
    };
  } finally {
    bitmap.close();
    canvas.width = 1;
    canvas.height = 1;
  }
}

async function zipPages(files: DownloadedPage[]): Promise<Blob> {
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
        // ignore termination errors
      }
      reject(error);
    }
  });
}

async function captureRange(options: CaptureOptions = {}): Promise<CaptureSummary> {
  const comicId = options.comicId ?? parseComicIdFromPath(window.location.pathname);
  if (!comicId) {
    throw new Error("Palcy comic id is unavailable");
  }

  options.onProgress?.("loading comic");
  const comic = await fetchComic(comicId);
  const pages = normalizeCapturePages(comic);
  const pageCount = pages.length;
  const from = Math.max(1, Math.min(options.from ?? 1, options.to ?? pageCount, pageCount));
  const to = Math.max(
    from,
    Math.min(Math.max(options.from ?? pageCount, options.to ?? pageCount), pageCount),
  );
  const targetPages = pages.slice(from - 1, to);
  let completed = 0;

  const files = await mapWithConcurrency(targetPages, FETCH_CONCURRENCY, async (page) => {
    const downloaded = await downloadPage(page);
    completed += 1;
    options.onProgress?.(`page ${completed}/${targetPages.length}`);
    return downloaded;
  });

  options.onProgress?.("zipping");
  const blob = await zipPages(files);
  const fileName = buildArchiveName(comic, from, to);
  saveAs(blob, fileName);
  options.onProgress?.(`saved ${fileName}`);
  return { fileName, from, to, pageCount };
}

function createNumberInput(value: string): HTMLInputElement {
  const input = document.createElement("input");
  input.type = "number";
  input.min = "1";
  input.value = value;
  input.style.cssText = [
    "width:64px",
    "padding:4px 6px",
    "border:1px solid rgba(255,255,255,0.25)",
    "border-radius:6px",
    "background:rgba(255,255,255,0.14)",
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
    "border:1px solid rgba(255,255,255,0.14)",
    "border-radius:12px",
    "background:rgba(12,14,18,0.86)",
    "backdrop-filter:blur(10px)",
    "box-shadow:0 12px 36px rgba(0,0,0,0.34)",
    "color:#fff",
    "font:12px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace",
  ].join(";");

  const title = document.createElement("span");
  title.textContent = "Palcy";
  title.style.cssText =
    "font-weight:700;max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";

  const rangeRow = document.createElement("div");
  rangeRow.style.cssText = "display:flex;align-items:center;gap:8px;";
  const fromInput = createNumberInput("1");
  const toInput = createNumberInput("1");
  rangeRow.append("pages", fromInput, "~", toInput);

  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "capture zip";
  button.style.cssText = [
    "padding:6px 10px",
    "border:0",
    "border-radius:6px",
    "background:#6ad3a5",
    "color:#111",
    "font-weight:700",
    "cursor:pointer",
  ].join(";");

  const status = document.createElement("span");
  status.textContent = "loading";
  status.style.cssText = [
    "display:block",
    "min-height:14px",
    "color:rgba(255,255,255,0.76)",
    "white-space:nowrap",
    "overflow:hidden",
    "text-overflow:ellipsis",
  ].join(";");

  panel.append(title, rangeRow, button, status);
  return { panel, title, fromInput, toInput, button, status };
}

async function installPanel(): Promise<void> {
  if (document.getElementById(PANEL_ID) || !document.body) {
    return;
  }

  const comicId = parseComicIdFromPath(window.location.pathname);
  if (!comicId) {
    return;
  }

  const refs = createPanel();
  document.body.appendChild(refs.panel);

  try {
    const comic = await fetchComic(comicId);
    const pageCount = comic.pages.length;
    refs.title.textContent = comic.title;
    refs.fromInput.value = "1";
    refs.toInput.value = String(pageCount);
    refs.status.textContent = `ready 1/${pageCount}`;
  } catch (error) {
    refs.status.textContent = error instanceof Error ? error.message : String(error);
  }

  refs.button.onclick = async () => {
    const from = Number.parseInt(refs.fromInput.value || "1", 10);
    const to = Number.parseInt(refs.toInput.value || refs.fromInput.value || "1", 10);
    refs.button.disabled = true;
    try {
      await captureRange({
        comicId,
        from,
        to,
        onProgress: (status) => {
          refs.status.textContent = status;
        },
      });
    } catch (error) {
      refs.status.textContent = error instanceof Error ? error.message : String(error);
      console.error(error);
    } finally {
      refs.button.disabled = false;
    }
  };
}

function init(): void {
  window.__palcyCapture__ = { captureRange };
  if (parseComicIdFromPath(window.location.pathname)) {
    void installPanel();
  }
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  void Promise.resolve()
    .then(init)
    .catch((error) => log("init failed", error));
}
