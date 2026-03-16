import { zip } from "fflate";

import {
  type BinbContentLike,
  type BinbPageImageLike,
  resolveBinbDescramble,
  resolveBinbSourceUrl,
} from "./binbRuntime";

type ReaderInfo = {
  moveTo: (pageIndex: number, animate: boolean) => void;
  currentPageInfo?: {
    endPageNumber?: number;
  };
};

type SpeedBinbPage = {
  image: BinbPageImageLike;
};

type SpeedBinbContent = {
  page: SpeedBinbPage[];
};

type SpeedBinbReader = {
  cu?: BinbContentLike;
};

type SpeedBinbInstance = {
  content: SpeedBinbContent | null;
  Ii?: {
    Zt?: SpeedBinbReader;
  };
};

type SpeedBinbStatic = {
  getInstance: (elementId: string) => SpeedBinbInstance;
};

type CaptureResult = {
  page: number;
  fileName: string;
  blob: Blob;
};

type CaptureRangeOptions = {
  from: number;
  to: number;
  downloadZip?: boolean;
  onProgress?: (status: string) => void;
};

type CaptureSummary = {
  from: number;
  to: number;
  capturedPages: number[];
  zipName?: string;
};

declare global {
  interface Window {
    __sreaderFunc__?: ReaderInfo;
    SpeedBinb?: SpeedBinbStatic;
    __mosaiComAntiLite__?: {
      captureRange: (options: CaptureRangeOptions) => Promise<CaptureSummary>;
    };
  }
}

const PANEL_ID = "__mosaicom_anti_lite_panel";
const ZIP_MIME = "application/zip";
const IMAGE_MIME = "image/png";
const IMAGE_EXT = "png";
const WAIT_TIMEOUT_MS = 30000;

function log(...args: unknown[]): void {
  console.log("[MosaiComAntiLite]", ...args);
}

function sanitizeFilePart(value: string): string {
  const cleaned = Array.from(value, (char) => {
    const code = char.charCodeAt(0);
    if (code < 32 || '<>:"/\\|?*'.includes(char)) {
      return "_";
    }
    return char;
  }).join("");

  return cleaned.replace(/\s+/g, " ").trim() || "cmoa";
}

function getReader(): ReaderInfo {
  const reader = window.__sreaderFunc__;
  if (!reader) {
    throw new Error("__sreaderFunc__ is unavailable");
  }
  return reader;
}

function getSpeedBinbInstance(): SpeedBinbInstance {
  const speedBinb = window.SpeedBinb;
  if (!speedBinb?.getInstance) {
    throw new Error("SpeedBinb.getInstance is unavailable");
  }
  return speedBinb.getInstance("content");
}

function getBinbContent(): BinbContentLike {
  const content = getSpeedBinbInstance().Ii?.Zt?.cu;
  if (!content) {
    throw new Error("BinB content internals are unavailable");
  }
  return content;
}

function getSourcePage(page: number): SpeedBinbPage {
  const sourcePage = getSpeedBinbInstance().content?.page?.[page - 1];
  if (!sourcePage?.image) {
    throw new Error(`Source page ${page} is unavailable`);
  }
  return sourcePage;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function waitFor<T>(label: string, factory: () => T | null | undefined): Promise<T> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < WAIT_TIMEOUT_MS) {
    const value = factory();
    if (value) {
      return value;
    }
    await delay(100);
  }
  throw new Error(`Timed out waiting for ${label}`);
}

async function loadSourceImage(src: string): Promise<HTMLImageElement> {
  return await new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load source image: ${src}`));
    img.src = src;
  });
}

async function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return await new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("canvas.toBlob returned null"));
        return;
      }
      resolve(blob);
    }, IMAGE_MIME);
  });
}

async function capturePage(page: number): Promise<CaptureResult> {
  const sourcePage = getSourcePage(page);
  const binbContent = getBinbContent();
  const sourceUrl = resolveBinbSourceUrl(binbContent, sourcePage.image);
  const sourceImage = await loadSourceImage(sourceUrl);
  const descramble = resolveBinbDescramble(binbContent, sourcePage.image, {
    width: sourceImage.naturalWidth,
    height: sourceImage.naturalHeight,
  });

  if (!descramble) {
    throw new Error(`Descramble data is unavailable for page ${page}`);
  }

  const plan = buildDrawPlanFromDescramble(descramble);
  const canvas = document.createElement("canvas");
  canvas.width = plan.width;
  canvas.height = plan.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("2d context is unavailable");
  }

  for (const draw of plan.draws) {
    ctx.drawImage(
      sourceImage,
      draw.xsrc,
      draw.ysrc,
      draw.width,
      draw.height,
      draw.xdest,
      draw.ydest,
      draw.width,
      draw.height,
    );
  }

  return {
    page,
    fileName: `${String(page).padStart(4, "0")}.${IMAGE_EXT}`,
    blob: await canvasToBlob(canvas),
  };
}

async function zipFilesAsync(files: Record<string, Uint8Array>): Promise<Uint8Array> {
  return await new Promise((resolve, reject) => {
    zip(files, { level: 0 }, (error, data) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(data);
    });
  });
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function buildArchiveBaseName(documentTitle: string): string {
  return documentTitle.split("|")[0]?.trim() || "cmoa";
}

export function formatCaptureProgress(done: number, total: number): string {
  return `capturing ${done}/${Math.max(1, total)}`;
}

export function formatZipProgress(): string {
  return "zipping...";
}

function buildDrawPlanFromDescramble(result: {
  width: number;
  height: number;
  transfers: Array<{
    index: number;
    coords: Array<{
      xsrc: number;
      ysrc: number;
      width: number;
      height: number;
      xdest: number;
      ydest: number;
    }>;
  }>;
}): {
  width: number;
  height: number;
  draws: Array<{
    xsrc: number;
    ysrc: number;
    width: number;
    height: number;
    xdest: number;
    ydest: number;
  }>;
} {
  return {
    width: result.width,
    height: result.height,
    draws: result.transfers.flatMap((transfer) => transfer.coords),
  };
}

function getArchiveBaseName(): string {
  return sanitizeFilePart(buildArchiveBaseName(document.title));
}

async function createZip(results: CaptureResult[]): Promise<{ blob: Blob; fileName: string }> {
  const files: Record<string, Uint8Array> = {};
  for (const result of results) {
    files[result.fileName] = new Uint8Array(await result.blob.arrayBuffer());
  }

  const from = results[0]?.page ?? 1;
  const to = results[results.length - 1]?.page ?? from;
  const fileName = `${getArchiveBaseName()}_${String(from).padStart(4, "0")}-${String(to).padStart(4, "0")}.zip`;
  const zipped = await zipFilesAsync(files);
  return {
    blob: new Blob([zipped], { type: ZIP_MIME }),
    fileName,
  };
}

async function captureRange(options: CaptureRangeOptions): Promise<CaptureSummary> {
  const reader = getReader();
  const endPage = reader.currentPageInfo?.endPageNumber ?? 1;
  const from = Math.max(1, Math.min(options.from, options.to, endPage));
  const to = Math.max(1, Math.min(Math.max(options.from, options.to), endPage));
  const downloadZip = options.downloadZip ?? true;
  const total = to - from + 1;
  const results: CaptureResult[] = [];

  options.onProgress?.(formatCaptureProgress(0, total));
  for (let page = from; page <= to; page += 1) {
    results.push(await capturePage(page));
    options.onProgress?.(formatCaptureProgress(results.length, total));
    await delay(50);
  }

  const summary: CaptureSummary = {
    from,
    to,
    capturedPages: results.map((result) => result.page),
  };

  if (downloadZip && results.length > 0) {
    options.onProgress?.(formatZipProgress());
    const zipResult = await createZip(results);
    downloadBlob(zipResult.blob, zipResult.fileName);
    summary.zipName = zipResult.fileName;
  }

  return summary;
}

function createInput(value: string): HTMLInputElement {
  const input = document.createElement("input");
  input.type = "number";
  input.min = "1";
  input.value = value;
  input.style.cssText = [
    "width: 64px",
    "padding: 4px 6px",
    "border: 1px solid rgba(255,255,255,0.25)",
    "border-radius: 6px",
    "background: rgba(255,255,255,0.14)",
    "color: #fff",
  ].join(";");
  return input;
}

function mountPanel(): void {
  if (document.getElementById(PANEL_ID)) {
    return;
  }

  const endPage = getReader().currentPageInfo?.endPageNumber ?? 1;
  const panel = document.createElement("div");
  panel.id = PANEL_ID;
  panel.style.cssText = [
    "position: fixed",
    "top: 12px",
    "right: 12px",
    "z-index: 2147483647",
    "display: flex",
    "align-items: center",
    "gap: 8px",
    "padding: 8px 10px",
    "border-radius: 10px",
    "background: rgba(16,18,22,0.82)",
    "backdrop-filter: blur(8px)",
    "box-shadow: 0 8px 24px rgba(0,0,0,0.28)",
    "color: #fff",
    "font: 12px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace",
  ].join(";");

  const fromInput = createInput("1");
  const toInput = createInput(String(endPage));
  const button = document.createElement("button");
  button.textContent = "capture zip";
  button.style.cssText = [
    "padding: 6px 10px",
    "border: 0",
    "border-radius: 6px",
    "background: #f6b73c",
    "color: #181818",
    "font-weight: 700",
    "cursor: pointer",
  ].join(";");

  const status = document.createElement("span");
  status.textContent = `1-${endPage}`;

  button.onclick = async () => {
    const from = Number.parseInt(fromInput.value || "1", 10);
    const to = Number.parseInt(toInput.value || String(endPage), 10);

    button.disabled = true;
    status.textContent = formatCaptureProgress(0, Math.max(1, Math.abs(to - from) + 1));

    try {
      const summary = await captureRange({
        from,
        to,
        downloadZip: true,
        onProgress: (message) => {
          status.textContent = message;
        },
      });
      status.textContent = `saved ${summary.from}-${summary.to}`;
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : String(error);
      console.error(error);
    } finally {
      button.disabled = false;
    }
  };

  panel.append("pages", fromInput, document.createTextNode("~"), toInput, button, status);
  document.body.appendChild(panel);
}

function init(): void {
  window.__mosaiComAntiLite__ = { captureRange };

  const timer = window.setInterval(() => {
    const reader = window.__sreaderFunc__;
    const endPageNumber = reader?.currentPageInfo?.endPageNumber ?? null;
    log("probe", { readyState: document.readyState, endPageNumber });

    if (!reader || !endPageNumber || !document.body) {
      return;
    }

    window.clearInterval(timer);
    mountPanel();
    log("ready", endPageNumber);
  }, 250);
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  void waitFor("reader page count", () => {
    const endPageNumber = window.__sreaderFunc__?.currentPageInfo?.endPageNumber ?? null;
    return endPageNumber && endPageNumber > 0 ? endPageNumber : null;
  })
    .then(() => init())
    .catch((error) => console.error("[MosaiComAntiLite] init failed", error));
}
