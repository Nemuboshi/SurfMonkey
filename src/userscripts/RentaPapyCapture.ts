import { zip } from "fflate";

import { bytesToBlobPart } from "../shared/blobParts";

type PapyImageEntry = {
  comp?: boolean;
  didx?: number[][];
  diff?: {
    hImg?: HTMLImageElement;
    wImg?: HTMLImageElement;
  };
  img?: HTMLImageElement[];
  mHeight?: number;
  mWidth?: number;
};

type PapyViewerWindow = Window & {
  arChara?: Record<string, PapyImageEntry | undefined>;
  drawCanvasImage?: (canvas: HTMLCanvasElement) => unknown;
  getImageData?: (page: number) => unknown;
  imageSplit?: number;
  max_page?: number;
  now?: number;
  page?: number;
  prd_ser?: string;
  url_base2?: string;
  view_cfg?: {
    cfg_animation?: boolean;
  };
};

type CaptureResult = {
  blob: Blob;
  fileName: string;
  page: number;
};

type CaptureOptions = {
  downloadZip?: boolean;
  from: number;
  onProgress?: (status: string) => void;
  to: number;
};

type CaptureSummary = {
  from: number;
  to: number;
  totalPages: number;
  zipName?: string;
};

type ReaderSession = {
  cleanup: () => void;
  maxPage: number;
  renderPage: (page: number) => Promise<CaptureResult>;
};

type ReaderProbe = {
  hasArChara: boolean;
  hasDrawCanvasImage: boolean;
  hasGetImageData: boolean;
  maxPage: number | null;
  readyState: DocumentReadyState | "missing";
  title: string;
  urlBase: string | null;
};

declare global {
  interface Window {
    __rentaPapyCapture__?: {
      captureRange: (options: CaptureOptions) => Promise<CaptureSummary>;
    };
  }
}

const IMAGE_EXT = "png";
const IMAGE_MIME = "image/png";
const PANEL_ID = "__renta_papy_capture_panel";
const POLL_INTERVAL_MS = 120;
const REQUEST_TIMEOUT_MS = 30000;
const ZIP_MIME = "application/zip";

function log(...args: unknown[]): void {
  console.log("[RentaPapyCapture]", ...args);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function sanitizeFilePart(value: string): string {
  const cleaned = Array.from(value, (char) => {
    const code = char.charCodeAt(0);
    if (code < 32 || '<>:"/\\|?*'.includes(char)) {
      return "_";
    }
    return char;
  }).join("");

  return cleaned.replace(/\s+/g, " ").trim() || "renta-papy";
}

function getReaderProbe(targetWindow: PapyViewerWindow = window): ReaderProbe {
  const maxPage =
    typeof targetWindow.max_page === "number" && Number.isFinite(targetWindow.max_page)
      ? targetWindow.max_page
      : null;

  return {
    hasArChara: typeof targetWindow.arChara === "object" && targetWindow.arChara !== null,
    hasDrawCanvasImage: typeof targetWindow.drawCanvasImage === "function",
    hasGetImageData: typeof targetWindow.getImageData === "function",
    maxPage,
    readyState: targetWindow.document?.readyState ?? "missing",
    title: targetWindow.document?.title ?? "",
    urlBase: typeof targetWindow.url_base2 === "string" ? targetWindow.url_base2 : null,
  };
}

function summarizeReaderProbe(probe: ReaderProbe): string {
  if (probe.hasGetImageData && probe.hasDrawCanvasImage && probe.maxPage && probe.maxPage > 0) {
    return `runtime ok | pages=${probe.maxPage} | ready=${probe.readyState}`;
  }

  return [
    "runtime partial",
    `ready=${probe.readyState}`,
    `get=${probe.hasGetImageData ? "yes" : "no"}`,
    `draw=${probe.hasDrawCanvasImage ? "yes" : "no"}`,
    `pages=${probe.maxPage ?? "?"}`,
  ].join(" | ");
}

async function waitFor<T>(
  evaluate: () => T | null | undefined | false,
  label: string,
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<T> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const result = evaluate();
    if (result) {
      return result;
    }
    await delay(POLL_INTERVAL_MS);
  }

  throw new Error(`${label} timeout (${timeoutMs}ms)`);
}

async function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return await new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("canvas.toBlob failed"));
        return;
      }
      resolve(blob);
    }, IMAGE_MIME);
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

function getArchiveBaseName(): string {
  return sanitizeFilePart(document.title);
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
    blob: new Blob([bytesToBlobPart(zipped)], { type: ZIP_MIME }),
    fileName,
  };
}

async function createReaderSession(sourceUrl: string): Promise<ReaderSession> {
  const iframe = document.createElement("iframe");
  iframe.src = sourceUrl;
  iframe.style.cssText = [
    "position: fixed",
    "left: -99999px",
    "top: 0",
    "width: 1280px",
    "height: 1600px",
    "opacity: 0",
    "pointer-events: none",
    "border: 0",
    "z-index: -1",
  ].join(";");

  const loadPromise = new Promise<void>((resolve, reject) => {
    iframe.onload = () => resolve();
    iframe.onerror = () => reject(new Error("Hidden reader iframe failed to load"));
  });

  document.body.appendChild(iframe);

  try {
    await loadPromise;
    const targetWindow = iframe.contentWindow as PapyViewerWindow | null;
    if (!targetWindow) {
      throw new Error("Hidden reader window is unavailable");
    }

    const runtimeWindow = await waitFor(() => {
      const probe = getReaderProbe(targetWindow);
      if (probe.hasGetImageData && probe.hasDrawCanvasImage && probe.maxPage && probe.maxPage > 0) {
        return targetWindow;
      }
      return null;
    }, "hidden reader runtime");

    if (runtimeWindow.view_cfg) {
      runtimeWindow.view_cfg.cfg_animation = false;
    }

    const maxPage = runtimeWindow.max_page ?? 1;

    return {
      cleanup: () => iframe.remove(),
      maxPage,
      renderPage: async (page) => {
        runtimeWindow.getImageData?.(page);

        await waitFor(() => {
          const entry = runtimeWindow.arChara?.[String(page)];
          return entry?.comp ? entry : null;
        }, `page ${page} image data`);

        const canvas = runtimeWindow.document.createElement("canvas");
        canvas.dataset.num = String(page);
        canvas.dataset.loaded = "0";
        runtimeWindow.drawCanvasImage?.(canvas);

        await waitFor(() => {
          if (canvas.width <= 1 || canvas.height <= 1) {
            return null;
          }
          return canvas;
        }, `page ${page} render`);

        return {
          blob: await canvasToBlob(canvas),
          fileName: `${String(page).padStart(4, "0")}.${IMAGE_EXT}`,
          page,
        };
      },
    };
  } catch (error) {
    iframe.remove();
    throw error;
  }
}

function getTotalPages(): number {
  const probe = getReaderProbe();
  if (!probe.maxPage || probe.maxPage <= 0) {
    throw new Error("Unable to determine page count");
  }
  return probe.maxPage;
}

async function captureRange(options: CaptureOptions): Promise<CaptureSummary> {
  const totalPages = getTotalPages();
  const from = Math.max(1, Math.min(options.from, options.to, totalPages));
  const to = Math.max(1, Math.min(Math.max(options.from, options.to), totalPages));
  const total = to - from + 1;
  const downloadZip = options.downloadZip ?? true;
  const results: CaptureResult[] = [];

  options.onProgress?.("opening hidden reader...");
  const session = await createReaderSession(window.location.href);

  try {
    for (let page = from; page <= to; page += 1) {
      options.onProgress?.(`capturing ${results.length + 1}/${total}`);
      results.push(await session.renderPage(page));
      await delay(50);
    }

    const summary: CaptureSummary = {
      from,
      to,
      totalPages,
    };

    if (downloadZip && results.length > 0) {
      options.onProgress?.("zipping...");
      const zipResult = await createZip(results);
      downloadBlob(zipResult.blob, zipResult.fileName);
      summary.zipName = zipResult.fileName;
    }

    return summary;
  } finally {
    session.cleanup();
  }
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

  const totalPages = getTotalPages();
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
  const toInput = createInput(String(totalPages));
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
  status.textContent = `1-${totalPages}`;

  button.onclick = async () => {
    const from = Number.parseInt(fromInput.value || "1", 10);
    const to = Number.parseInt(toInput.value || String(totalPages), 10);

    button.disabled = true;
    status.textContent = `capturing 0/${Math.max(1, Math.abs(to - from) + 1)}`;

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
  window.__rentaPapyCapture__ = { captureRange };

  const timer = window.setInterval(() => {
    const probe = getReaderProbe();
    log("init probe", summarizeReaderProbe(probe));

    if (!probe.hasGetImageData || !probe.hasDrawCanvasImage) {
      return;
    }
    if (!probe.maxPage || probe.maxPage <= 0) {
      return;
    }
    if (!document.body) {
      return;
    }

    window.clearInterval(timer);
    mountPanel();
    log("ready", summarizeReaderProbe(probe));
  }, 250);
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  init();
}
