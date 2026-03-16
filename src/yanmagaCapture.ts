import { zip } from "fflate";

import { type BinbContentLike, resolveBinbDescramble, resolveBinbSourceUrl } from "./binbRuntime";

type YanmagaReader = {
  contentInfo?: {
    items?: Array<{
      SubTitle?: string;
      Title?: string;
    }>;
  };
  currentPageInfo?: {
    endPageNumber?: number;
  };
};

type SpeedBinbPageImage = {
  id: string;
  src: string;
  orgwidth: number;
  orgheight: number;
  pagespread: number;
};

type SpeedBinbPage = {
  id: string;
  src: string;
  index: number;
  image: SpeedBinbPageImage;
};

type SpeedBinbContent = {
  page: SpeedBinbPage[];
};

type SpeedBinbBinbContent = {
  fu?: BinbContentLike;
};

type SpeedBinbInstance = {
  content: SpeedBinbContent | null;
  Ii?: {
    Zt?: SpeedBinbBinbContent;
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

type ReaderProbe = {
  hasWindowReader: boolean;
  hasUnsafeWindow: boolean;
  hasUnsafeWindowReader: boolean;
  hasBody: boolean;
  readyState: DocumentReadyState;
  endPageNumber: number | null;
};

type TransferCoord = {
  xsrc: number;
  ysrc: number;
  width: number;
  height: number;
  xdest: number;
  ydest: number;
};

type DrawPlan = {
  width: number;
  height: number;
  draws: TransferCoord[];
};

declare global {
  interface Window {
    __sreaderFunc__?: YanmagaReader;
    SpeedBinb?: SpeedBinbStatic;
    unsafeWindow?: Window & {
      __sreaderFunc__?: YanmagaReader;
    };
    __yanmagaCapture__?: {
      captureRange: (options: CaptureRangeOptions) => Promise<CaptureSummary>;
    };
  }
}

const PANEL_ID = "__yanmaga_capture_panel";
const ZIP_MIME = "application/zip";
const IMAGE_MIME = "image/png";
const IMAGE_EXT = "png";

function log(...args: unknown[]): void {
  console.log("[YanmagaCapture]", ...args);
}

export function summarizeReaderProbe(probe: ReaderProbe): string {
  if (probe.endPageNumber && probe.endPageNumber > 0) {
    return `reader ok | pages=${probe.endPageNumber} | ready=${probe.readyState}`;
  }

  if (probe.hasWindowReader || probe.hasUnsafeWindowReader) {
    return `reader partial | pages=? | ready=${probe.readyState} | uw=${probe.hasUnsafeWindow ? "yes" : "no"}`;
  }

  return `reader missing | ready=${probe.readyState} | body=${probe.hasBody ? "yes" : "no"} | uw=${probe.hasUnsafeWindow ? "yes" : "no"}`;
}

export function buildArchiveBaseName(documentTitle: string): string {
  return documentTitle.split("|")[0]?.trim() || "yanmaga";
}

export function formatCaptureProgress(done: number, total: number): string {
  return `capturing ${done}/${Math.max(1, total)}`;
}

export function formatZipProgress(): string {
  return "zipping...";
}

export function buildDrawPlanFromDescramble(result: {
  width: number;
  height: number;
  transfers: Array<{ index: number; coords: TransferCoord[] }>;
}): DrawPlan {
  return {
    width: result.width,
    height: result.height,
    draws: result.transfers.flatMap((transfer) => transfer.coords),
  };
}

function getReaderProbe(): {
  reader: YanmagaReader | null;
  endPageNumber: number | null;
  status: string;
} {
  const unsafeWindowRef = window.unsafeWindow;
  const windowReader = window.__sreaderFunc__;
  const unsafeWindowReader = unsafeWindowRef?.__sreaderFunc__;
  const reader = windowReader ?? unsafeWindowReader ?? null;
  const endPageNumber = reader?.currentPageInfo?.endPageNumber ?? null;

  return {
    reader,
    endPageNumber,
    status: summarizeReaderProbe({
      hasWindowReader: Boolean(windowReader),
      hasUnsafeWindow: Boolean(unsafeWindowRef),
      hasUnsafeWindowReader: Boolean(unsafeWindowReader),
      hasBody: Boolean(document.body),
      readyState: document.readyState,
      endPageNumber,
    }),
  };
}

function sanitizeFilePart(value: string): string {
  const cleaned = Array.from(value, (char) => {
    const code = char.charCodeAt(0);
    if (code < 32 || '<>:"/\\|?*'.includes(char)) {
      return "_";
    }
    return char;
  }).join("");

  return cleaned.replace(/\s+/g, " ").trim() || "yanmaga";
}

function getReader(): YanmagaReader {
  const { reader, status } = getReaderProbe();
  if (!reader) {
    log("getReader failed", status);
    throw new Error(`__sreaderFunc__ is unavailable (${status})`);
  }
  return reader;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
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

function getSpeedBinbInstance(): SpeedBinbInstance {
  const speedBinb = window.SpeedBinb;
  if (!speedBinb?.getInstance) {
    throw new Error("SpeedBinb.getInstance is unavailable");
  }

  return speedBinb.getInstance("content");
}

function getBinbContent(): BinbContentLike {
  const content = getSpeedBinbInstance().Ii?.Zt?.fu;
  if (!content) {
    throw new Error("Binb content internals are unavailable");
  }
  return content;
}

function getSourcePage(page: number): SpeedBinbPage {
  const content = getSpeedBinbInstance().content;
  const sourcePage = content?.page?.[page - 1];
  if (!sourcePage?.image) {
    throw new Error(`Source page ${page} is unavailable`);
  }
  return sourcePage;
}

async function loadSourceImage(src: string): Promise<HTMLImageElement> {
  return await new Promise((resolve, reject) => {
    const img = new Image();
    // Firefox fails this image request with `anonymous`, but succeeds with credentials.
    img.crossOrigin = "use-credentials";
    img.referrerPolicy = "strict-origin-when-cross-origin";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load source image: ${src}`));
    img.src = src;
  });
}

async function capturePageFromSource(page: number): Promise<CaptureResult> {
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

async function capturePage(page: number): Promise<CaptureResult> {
  return await capturePageFromSource(page);
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

function getSeriesTitle(): string {
  return sanitizeFilePart(buildArchiveBaseName(document.title));
}

async function createZip(results: CaptureResult[]): Promise<{ blob: Blob; fileName: string }> {
  const files: Record<string, Uint8Array> = {};
  for (const result of results) {
    files[result.fileName] = new Uint8Array(await result.blob.arrayBuffer());
  }

  const from = results[0]?.page ?? 1;
  const to = results[results.length - 1]?.page ?? from;
  const fileName = `${getSeriesTitle()}_${String(from).padStart(4, "0")}-${String(to).padStart(4, "0")}.zip`;
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

  const reader = getReader();
  const endPage = reader.currentPageInfo?.endPageNumber ?? 1;

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
  window.__yanmagaCapture__ = { captureRange };

  const timer = window.setInterval(() => {
    const probe = getReaderProbe();
    log("init probe", probe.status);

    if (!probe.reader) {
      return;
    }
    if (!probe.endPageNumber || probe.endPageNumber <= 0) {
      return;
    }
    if (!document.body) {
      return;
    }
    window.clearInterval(timer);
    mountPanel();
    log("ready", probe.status);
  }, 250);
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  init();
}
