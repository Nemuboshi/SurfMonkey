import { zip } from "fflate";

import { bytesToBlobPart } from "./blobParts";

type ViewerPageInfo = {
  BlockHeight: number;
  BlockWidth: number;
  ContentArea?: {
    Height: number;
    Width: number;
    X: number;
    Y: number;
  };
  DummyHeight?: number;
  DummyWidth?: number;
  NS?: number;
  PS?: number;
  RS?: number;
  Rect?: {
    Height: number;
    Width: number;
    X: number;
    Y: number;
  };
  Size: {
    Height: number;
    Width: number;
  };
};

type ViewerPage = {
  e1L?: string | null;
  fileName?: string | null;
  height?: number;
  index: number;
  info?: ViewerPageInfo | null;
  url?: string | null;
  width?: number;
};

type ViewerSpread = {
  left?: ViewerPage | null;
  pageIndex?: number;
  right?: ViewerPage | null;
};

type ViewerContentEntry = {
  file: string;
  index: number;
  type?: string;
};

type ViewerAttributes = {
  F3d?: {
    content?: {
      normal_default?: {
        configuration?: {
          contents?: ViewerContentEntry[];
        };
      };
    };
    url?: string;
  };
  contentTitle?: string;
  viewerSpread?: ViewerSpread;
};

type JquerySliderLike = {
  slider: (command: "value" | "option", ...args: unknown[]) => unknown;
  trigger: (eventName: string) => void;
};

type CaptureSummary = {
  totalPages: number;
  zipName: string;
};

type CaptureOptions = {
  from: number;
  to: number;
  onProgress?: (message: string) => void;
};

type PanelRefs = {
  button: HTMLButtonElement;
  fromInput: HTMLInputElement;
  panel: HTMLDivElement;
  status: HTMLSpanElement;
  toInput: HTMLInputElement;
};

type RenderRect = {
  height: number;
  width: number;
  x: number;
  y: number;
};

type RenderedPage = {
  blob: Blob;
  extension: string;
  pageNumber: number;
};

type MovedSpread = {
  fingerprint: string;
  spread: ViewerSpread;
};

type ReaderSession = {
  cleanup: () => void;
  getCurrentScreen: () => {
    canvas?: HTMLCanvasElement;
    leftDrawnRect?: RenderRect;
    rightDrawnRect?: RenderRect;
  } | null;
  getCurrentSignature: () => string;
  getSlider: () => { max: number; min: number; slider: JquerySliderLike };
  getSpread: () => ViewerSpread | null;
  waitForRender: (
    previousFingerprint?: string | null,
    expectedSignature?: string | null,
  ) => Promise<string>;
  window: Window;
};

declare global {
  interface Window {
    NFBR?: {
      __comicBoostPublus__?: {
        captureRange: (options: CaptureOptions) => Promise<CaptureSummary>;
      };
      a6G?: {
        Initializer?: {
          B6o?: {
            renderer?: {
              currentScreen?: {
                canvas?: HTMLCanvasElement;
                leftDrawnRect?: RenderRect;
                rightDrawnRect?: RenderRect;
              };
              model?: {
                attributes?: ViewerAttributes;
              };
            };
          };
        };
      };
    };
    __comicBoostPublus__?: {
      captureRange: (options: CaptureOptions) => Promise<CaptureSummary>;
    };
    $?: (target: string | Element) => JquerySliderLike;
    jQuery?: (target: string | Element) => JquerySliderLike;
  }
}

const DEFAULT_RENDER_VIEWPORT = { width: 2048, height: 1456 };
const EXPORT_EXTENSION = "png";
const PANEL_ID = "__comic_boost_publus_panel";
const REQUEST_TIMEOUT_MS = 30000;
const UI_POLL_INTERVAL_MS = 120;
const ZIP_MIME = "application/zip";

function log(...args: unknown[]): void {
  console.log("[ComicBoostPublus]", ...args);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => globalThis.setTimeout(resolve, ms));
}

function sanitizeFilePart(value: string): string {
  const cleaned = Array.from(value, (char) => {
    const code = char.charCodeAt(0);
    if (code < 32 || '<>:"/\\|?*'.includes(char)) {
      return "_";
    }
    return char;
  }).join("");
  return cleaned.replace(/\s+/g, " ").trim() || "comic-boost";
}

function getRenderViewport(targetWindow: Window = window): { height: number; width: number } {
  const spread = getViewerAttributes(targetWindow)?.viewerSpread;
  const pages = [spread?.left, spread?.right].filter((page): page is ViewerPage =>
    Boolean(page?.width && page?.height),
  );
  if (pages.length === 0) {
    return DEFAULT_RENDER_VIEWPORT;
  }

  return {
    width: Math.max(
      DEFAULT_RENDER_VIEWPORT.width,
      pages.reduce((sum, page) => sum + (page.width ?? 0), 0),
    ),
    height: Math.max(
      DEFAULT_RENDER_VIEWPORT.height,
      pages.reduce((max, page) => Math.max(max, page.height ?? 0), 0),
    ),
  };
}

function normalizeRect(rect: RenderRect | undefined | null): RenderRect | null {
  if (!rect) {
    return null;
  }
  const width = Math.max(0, Math.round(rect.width));
  const height = Math.max(0, Math.round(rect.height));
  if (width === 0 || height === 0) {
    return null;
  }
  return {
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width,
    height,
  };
}

function getRenderFingerprint(
  currentScreen:
    | {
        canvas?: HTMLCanvasElement;
        leftDrawnRect?: RenderRect;
        rightDrawnRect?: RenderRect;
      }
    | null
    | undefined,
): string | null {
  const canvas = currentScreen?.canvas;
  if (!canvas || canvas.width <= 0 || canvas.height <= 0) {
    return null;
  }

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return null;
  }

  const rects = [
    normalizeRect(currentScreen?.leftDrawnRect),
    normalizeRect(currentScreen?.rightDrawnRect),
  ].filter((rect): rect is RenderRect => Boolean(rect));
  if (rects.length === 0) {
    return `${canvas.width}x${canvas.height}`;
  }

  const sampleOffsets = [0.2, 0.5, 0.8];
  const parts = [`${canvas.width}x${canvas.height}`];

  for (const rect of rects) {
    parts.push(`${rect.x},${rect.y},${rect.width},${rect.height}`);
    for (const offsetY of sampleOffsets) {
      for (const offsetX of sampleOffsets) {
        const x = Math.min(
          canvas.width - 1,
          Math.max(0, Math.round(rect.x + (rect.width - 1) * offsetX)),
        );
        const y = Math.min(
          canvas.height - 1,
          Math.max(0, Math.round(rect.y + (rect.height - 1) * offsetY)),
        );
        const rgba = ctx.getImageData(x, y, 1, 1).data;
        parts.push(`${rgba[0]},${rgba[1]},${rgba[2]},${rgba[3]}`);
      }
    }
  }

  return parts.join("|");
}

function blobFromCanvas(sourceCanvas: HTMLCanvasElement, rect: RenderRect): Promise<Blob> {
  const targetCanvas = document.createElement("canvas");
  targetCanvas.width = rect.width;
  targetCanvas.height = rect.height;
  const ctx = targetCanvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to create export canvas");
  }

  ctx.drawImage(
    sourceCanvas,
    rect.x,
    rect.y,
    rect.width,
    rect.height,
    0,
    0,
    rect.width,
    rect.height,
  );

  const mimeType = "image/png";
  return new Promise((resolve, reject) => {
    targetCanvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Canvas export failed"));
        return;
      }
      resolve(blob);
    }, mimeType);
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

async function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  return await new Promise((resolve, reject) => {
    let settled = false;
    const timer = globalThis.setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      reject(new Error(`${label} timeout (${REQUEST_TIMEOUT_MS}ms)`));
    }, REQUEST_TIMEOUT_MS);

    void promise
      .then((value) => {
        if (settled) {
          return;
        }
        settled = true;
        globalThis.clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        if (settled) {
          return;
        }
        settled = true;
        globalThis.clearTimeout(timer);
        reject(error);
      });
  });
}

function getViewerAttributes(targetWindow: Window = window): ViewerAttributes | null {
  return targetWindow.NFBR?.a6G?.Initializer?.B6o?.renderer?.model?.attributes ?? null;
}

function getContentEntries(targetWindow: Window = window): ViewerContentEntry[] {
  const entries =
    getViewerAttributes(targetWindow)?.F3d?.content?.normal_default?.configuration?.contents ?? [];
  return entries
    .filter((entry) => Number.isFinite(entry.index) && entry.index > 0)
    .sort((a, b) => a.index - b.index);
}

function getTotalPages(targetWindow: Window = window): number {
  const entries = getContentEntries(targetWindow);
  if (entries.length > 0) {
    return entries.length;
  }

  const counterText =
    targetWindow.document.getElementById("pageSliderCounter")?.textContent ??
    targetWindow.document.body.innerText.match(/\d+\/(\d+)/)?.[0] ??
    "";
  const totalFromCounter = counterText.match(/\/(\d+)/)?.[1];
  const totalPages = Number.parseInt(totalFromCounter ?? "", 10);
  if (Number.isFinite(totalPages) && totalPages > 0) {
    return totalPages;
  }

  throw new Error("Unable to determine total page count");
}

function getTitle(targetWindow: Window = window): string {
  const title = getViewerAttributes(targetWindow)?.contentTitle ?? targetWindow.document.title;
  return sanitizeFilePart(title || "comic-boost");
}

function getSliderApi(targetWindow: Window): {
  max: number;
  min: number;
  slider: JquerySliderLike;
} {
  const jq = targetWindow.jQuery ?? targetWindow.$;
  if (!jq) {
    throw new Error("jQuery is unavailable");
  }

  const sliderEl = targetWindow.document.getElementById("pageSliderBar");
  if (!sliderEl) {
    throw new Error("pageSliderBar is unavailable");
  }

  const slider = jq(sliderEl);
  const min = Number(slider.slider("option", "min"));
  const max = Number(slider.slider("option", "max"));
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    throw new Error("Slider bounds are unavailable");
  }

  return { slider, min, max };
}

function getSpreadSignature(spread: ViewerSpread | null | undefined): string {
  const leftIndex = spread?.left?.index ?? "x";
  const rightIndex = spread?.right?.index ?? "x";
  const leftUrl = spread?.left?.url ?? "";
  const rightUrl = spread?.right?.url ?? "";
  return `${leftIndex}|${rightIndex}|${leftUrl}|${rightUrl}`;
}

async function waitForReader(targetWindow: Window = window): Promise<void> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < REQUEST_TIMEOUT_MS) {
    const attrs = getViewerAttributes(targetWindow);
    const slider = targetWindow.document.getElementById("pageSliderBar");
    if (attrs?.contentTitle && slider) {
      return;
    }
    await delay(250);
  }
  throw new Error("Reader did not become ready");
}

async function waitForPageMetrics(
  targetWindow: Window = window,
): Promise<{ max: number; min: number; totalPages: number }> {
  await waitForReader(targetWindow);

  const startedAt = Date.now();
  while (Date.now() - startedAt < REQUEST_TIMEOUT_MS) {
    try {
      const totalPages = getTotalPages(targetWindow);
      const { min, max } = getSliderApi(targetWindow);
      if (
        Number.isFinite(totalPages) &&
        totalPages > 0 &&
        Number.isFinite(min) &&
        Number.isFinite(max)
      ) {
        return { totalPages, min, max };
      }
    } catch {}

    await delay(250);
  }

  throw new Error("Page metrics did not become ready");
}

async function createReaderSession(sourceUrl: string): Promise<ReaderSession> {
  const renderViewport = getRenderViewport();
  const iframe = document.createElement("iframe");
  iframe.src = sourceUrl;
  iframe.style.cssText = [
    "position: fixed",
    "left: -100000px",
    "top: 0",
    `width: ${renderViewport.width}px`,
    `height: ${renderViewport.height}px`,
    "opacity: 0",
    "pointer-events: none",
    "border: 0",
    "z-index: -1",
  ].join(";");

  document.body.appendChild(iframe);

  await withTimeout(
    new Promise<void>((resolve, reject) => {
      iframe.onload = () => resolve();
      iframe.onerror = () => reject(new Error("Reader iframe failed to load"));
    }),
    "reader iframe load",
  );

  const targetWindow = iframe.contentWindow;
  if (!targetWindow) {
    iframe.remove();
    throw new Error("Reader iframe window is unavailable");
  }

  await waitForReader(targetWindow);

  const getCurrentScreen = () =>
    targetWindow.NFBR?.a6G?.Initializer?.B6o?.renderer?.currentScreen ?? null;

  const waitForRender = async (
    previousFingerprint: string | null = null,
    expectedSignature: string | null = null,
  ): Promise<string> => {
    const startedAt = Date.now();
    let stableFingerprint: string | null = null;
    let stableCount = 0;
    while (Date.now() - startedAt < REQUEST_TIMEOUT_MS) {
      const currentScreen = getCurrentScreen();
      const spread = getViewerAttributes(targetWindow)?.viewerSpread;
      const leftReady = !spread?.left || Boolean(normalizeRect(currentScreen?.leftDrawnRect));
      const rightReady = !spread?.right || Boolean(normalizeRect(currentScreen?.rightDrawnRect));
      const currentSignature = getSpreadSignature(spread);
      if (
        currentScreen?.canvas &&
        leftReady &&
        rightReady &&
        (!expectedSignature || currentSignature === expectedSignature)
      ) {
        const fingerprint = getRenderFingerprint(currentScreen);
        if (fingerprint) {
          if (fingerprint === stableFingerprint) {
            stableCount += 1;
          } else {
            stableFingerprint = fingerprint;
            stableCount = 1;
          }

          if (fingerprint !== previousFingerprint && stableCount >= 2) {
            return fingerprint;
          }

          if (fingerprint === previousFingerprint && stableCount >= 6) {
            return fingerprint;
          }
        }
      } else {
        stableFingerprint = null;
        stableCount = 0;
      }
      await delay(UI_POLL_INTERVAL_MS);
    }
    throw new Error("Timed out waiting for rendered canvas");
  };

  await waitForRender();

  const currentScreen = getCurrentScreen();
  if (!currentScreen?.canvas) {
    iframe.remove();
    throw new Error("Rendered canvas is unavailable");
  }

  return {
    window: targetWindow,
    getCurrentScreen,
    getSpread: () => getViewerAttributes(targetWindow)?.viewerSpread ?? null,
    getCurrentSignature: () => getSpreadSignature(getViewerAttributes(targetWindow)?.viewerSpread),
    getSlider: () => getSliderApi(targetWindow),
    waitForRender,
    cleanup: () => iframe.remove(),
  };
}

async function moveSessionToSliderValue(
  session: ReaderSession,
  sliderValue: number,
  previousSignature: string | null,
  previousFingerprint: string | null,
): Promise<MovedSpread> {
  const { slider } = session.getSlider();
  slider.slider("value", sliderValue);
  slider.trigger("slidechange");

  const startedAt = Date.now();
  while (Date.now() - startedAt < REQUEST_TIMEOUT_MS) {
    const spread = session.getSpread();
    const currentSignature = getSpreadSignature(spread);
    const currentValue = Number(session.getSlider().slider.slider("value"));
    if (spread && currentValue === sliderValue && currentSignature !== previousSignature) {
      const fingerprint = await session.waitForRender(previousFingerprint, currentSignature);
      const settledSpread = session.getSpread();
      if (settledSpread && getSpreadSignature(settledSpread) === currentSignature) {
        return { spread: settledSpread, fingerprint };
      }
    }
    await delay(UI_POLL_INTERVAL_MS);
  }

  throw new Error(`Timed out waiting for spread ${sliderValue}`);
}

async function extractRenderedPages(
  session: ReaderSession,
  spread: ViewerSpread,
): Promise<RenderedPage[]> {
  await session.waitForRender(null, getSpreadSignature(spread));
  const currentScreen = session.getCurrentScreen();
  const canvas = currentScreen?.canvas;
  if (!canvas) {
    throw new Error("Rendered canvas is unavailable");
  }
  const renderedPages: RenderedPage[] = [];

  const rightRect = normalizeRect(currentScreen.rightDrawnRect);
  if (spread.right && rightRect) {
    renderedPages.push({
      pageNumber: spread.right.index + 1,
      extension: EXPORT_EXTENSION,
      blob: await blobFromCanvas(canvas, rightRect),
    });
  }

  const leftRect = normalizeRect(currentScreen.leftDrawnRect);
  if (spread.left && leftRect) {
    renderedPages.push({
      pageNumber: spread.left.index + 1,
      extension: EXPORT_EXTENSION,
      blob: await blobFromCanvas(canvas, leftRect),
    });
  }

  return renderedPages.sort((a, b) => a.pageNumber - b.pageNumber);
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

async function captureRange(options: CaptureOptions): Promise<CaptureSummary> {
  const { totalPages, min, max } = await waitForPageMetrics(window);
  const from = Math.max(1, Math.min(options.from, options.to, totalPages));
  const to = Math.max(1, Math.min(Math.max(options.from, options.to), totalPages));
  const files: Record<string, Uint8Array> = {};
  const seenPages = new Set<number>();
  let exportedCount = 0;

  for (let sliderValue = max; sliderValue >= min; sliderValue -= 1) {
    options.onProgress?.(`preparing batch ${max - sliderValue + 1}`);
    const session = await createReaderSession(window.location.href);

    try {
      const moved = await moveSessionToSliderValue(session, sliderValue, null, null);
      const renderedPages = await extractRenderedPages(session, moved.spread);
      for (const page of renderedPages) {
        if (page.pageNumber < from || page.pageNumber > to || seenPages.has(page.pageNumber)) {
          continue;
        }
        const fileName = `${String(page.pageNumber).padStart(4, "0")}.${page.extension}`;
        files[fileName] = new Uint8Array(await page.blob.arrayBuffer());
        seenPages.add(page.pageNumber);
        exportedCount += 1;
        options.onProgress?.(`captured ${exportedCount} of ${to - from + 1} pages`);
      }
    } finally {
      session.cleanup();
    }
  }

  if (exportedCount === 0) {
    throw new Error("No pages were captured");
  }

  const expectedCount = to - from + 1;
  if (exportedCount !== expectedCount) {
    throw new Error(`Captured ${exportedCount}/${expectedCount} pages`);
  }

  options.onProgress?.("zipping...");
  const zipBytes = await zipFilesAsync(files);
  const zipName =
    `${getTitle()}_${String(from).padStart(4, "0")}` + `-${String(to).padStart(4, "0")}.zip`;
  downloadBlob(new Blob([bytesToBlobPart(zipBytes)], { type: ZIP_MIME }), zipName);

  return { zipName, totalPages };
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

function createPanel(totalPages: number): PanelRefs {
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
    "background: #f0bf5a",
    "color: #181818",
    "font-weight: 700",
    "cursor: pointer",
  ].join(";");
  const status = document.createElement("span");
  status.textContent = `ready (1-${totalPages})`;

  panel.append(
    document.createTextNode("pages"),
    fromInput,
    document.createTextNode("~"),
    toInput,
    button,
    status,
  );

  button.onclick = async () => {
    const from = Number.parseInt(fromInput.value || "1", 10);
    const to = Number.parseInt(toInput.value || String(totalPages), 10);
    button.disabled = true;
    status.textContent = "collecting...";
    try {
      const summary = await captureRange({
        from,
        to,
        onProgress: (message) => {
          status.textContent = message;
        },
      });
      status.textContent = `saved ${summary.zipName}`;
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : String(error);
      console.error(error);
    } finally {
      button.disabled = false;
    }
  };

  return { panel, fromInput, toInput, status, button };
}

async function init(): Promise<void> {
  window.__comicBoostPublus__ = { captureRange };
  if (document.getElementById(PANEL_ID)) {
    return;
  }

  const { totalPages } = await waitForPageMetrics(window);
  const refs = createPanel(totalPages);
  document.body.appendChild(refs.panel);
  log("ready", totalPages);
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  void init().catch((error) => console.error("[ComicBoostPublus] init failed", error));
}
