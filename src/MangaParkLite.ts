import { zip } from "fflate";

type ChapterImage = {
  path: string;
  key?: string;
};

type ChapterPage = {
  images?: ChapterImage[];
};

type ChapterApiResponse = {
  data?: {
    chapter?: ChapterPage[];
  };
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

type CaptureResult = {
  page: number;
  fileName: string;
  blob: Blob;
};

type ChapterSessionState =
  | { mode: "idle" }
  | { mode: "active"; chapterId: string; chapterTitle: string | null; activatedAt: number };

type ChapterIntent = {
  chapterId: string;
  chapterTitle: string | null;
  at: number;
};

type PanelRefs = {
  panel: HTMLDivElement;
  fromInput: HTMLInputElement;
  toInput: HTMLInputElement;
  status: HTMLSpanElement;
  chapterLabel: HTMLSpanElement;
  button: HTMLButtonElement;
  chapterId: string;
};

declare global {
  interface Window {
    __mangaParkLite__?: {
      captureRange: (options: CaptureRangeOptions) => Promise<CaptureSummary>;
    };
  }
}

const PANEL_ID = "__manga_park_lite_panel";
const ZIP_MIME = "application/zip";
const REQUEST_TIMEOUT_MS = 30000;
const RETRY_DELAYS_MS = [300, 800];
const CAPTURE_CONCURRENCY = 4;
const INTENT_WINDOW_MS = 15000;

let chapterSession: ChapterSessionState = { mode: "idle" };
let chapterIntent: ChapterIntent | null = null;
let panelRefs: PanelRefs | null = null;
const chapterPagesCache = new Map<string, ChapterPage[]>();
let nativeFetchRef: typeof fetch | null = null;
const activatingChapterIds = new Set<string>();
const chapterTitleHints = new Map<string, string>();

function log(...args: unknown[]): void {
  console.log("[MangaParkLite]", ...args);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => globalThis.setTimeout(resolve, ms));
}

export function parseChapterIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/title\/\d+\/(\d+)\/?$/);
  return match?.[1] ?? null;
}

export function parseChapterIdFromApiUrl(urlLike: string): string | null {
  const match = urlLike.match(/\/api\/chapter\/(\d+)(?:[/?#]|$)/);
  return match?.[1] ?? null;
}

export function parseChapterIdFromChapterRoute(urlLike: string): string | null {
  const match = urlLike.match(/\/chapter\/(\d+)(?:[/?#]|$)/);
  return match?.[1] ?? null;
}

export function parseChapterIdFromUrl(urlLike: string): string | null {
  try {
    const base =
      typeof window !== "undefined" && window.location?.origin
        ? window.location.origin
        : "https://manga-park.com";
    const parsed = new URL(urlLike, base);
    return parseChapterIdFromPath(parsed.pathname);
  } catch {
    return null;
  }
}

export function decodeXor(encoded: Uint8Array, key: Uint8Array): Uint8Array {
  if (key.length === 0) {
    return encoded.slice();
  }
  const out = new Uint8Array(encoded.length);
  for (let i = 0; i < encoded.length; i += 1) {
    out[i] = encoded[i] ^ key[i % key.length];
  }
  return out;
}

export function inferFileExtension(pathLike: string): string {
  const withoutQuery = pathLike.split("?")[0] ?? pathLike;
  const baseName = withoutQuery.split("/").pop() ?? "";
  const stripped = baseName.endsWith(".enc") ? baseName.slice(0, -4) : baseName;
  const lastDot = stripped.lastIndexOf(".");
  const ext = lastDot >= 0 ? stripped.slice(lastDot + 1).toLowerCase() : "";
  if (!ext || !/^[a-z0-9]+$/.test(ext)) {
    return "jpg";
  }
  return ext;
}

function extensionToMime(ext: string): string {
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    default:
      return "application/octet-stream";
  }
}

function decodeBase64ToBytes(encoded: string): Uint8Array {
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function sanitizeFilePart(value: string): string {
  const cleaned = Array.from(value, (char) => {
    const code = char.charCodeAt(0);
    if (code < 32 || '<>:"/\\|?*'.includes(char)) {
      return "_";
    }
    return char;
  }).join("");
  return cleaned.replace(/\s+/g, " ").trim() || "manga-park";
}

function getArchiveBaseName(documentTitle: string): string {
  const split = documentTitle.split("|")[0]?.trim();
  return sanitizeFilePart(split || "manga-park");
}

function getChapterTitleFromElement(element: Element): string | null {
  const text = element.querySelector("p")?.textContent?.trim() ?? "";
  return text ? sanitizeFilePart(text) : null;
}

function resolveChapterTitle(chapterId: string): string | null {
  const hinted = chapterTitleHints.get(chapterId);
  if (hinted) {
    return hinted;
  }
  const element = document.querySelector(`li[data-chapter-id="${chapterId}"]`);
  if (!element) {
    return null;
  }
  const fromDom = getChapterTitleFromElement(element);
  if (fromDom) {
    chapterTitleHints.set(chapterId, fromDom);
  }
  return fromDom;
}

function getDirectChapterFromPath(): string | null {
  return parseChapterIdFromPath(window.location.pathname);
}

function recordChapterIntent(chapterId: string, chapterTitle: string | null): void {
  chapterIntent = { chapterId, chapterTitle, at: Date.now() };
  if (chapterTitle) {
    chapterTitleHints.set(chapterId, chapterTitle);
  }
}

function hasFreshIntentFor(chapterId: string): boolean {
  if (!chapterIntent || chapterIntent.chapterId !== chapterId) {
    return false;
  }
  return Date.now() - chapterIntent.at <= INTENT_WINDOW_MS;
}

function shouldActivateFromNetwork(chapterId: string): boolean {
  if (chapterSession.mode === "active" && chapterSession.chapterId === chapterId) {
    return true;
  }
  const direct = getDirectChapterFromPath();
  if (direct === chapterId) {
    return true;
  }
  return hasFreshIntentFor(chapterId);
}

function setIdle(reason: string): void {
  chapterSession = { mode: "idle" };
  if (panelRefs) {
    panelRefs.panel.remove();
    panelRefs = null;
  }
  log("idle", reason);
}

async function setActiveChapter(chapterId: string, reason: string): Promise<void> {
  if (activatingChapterIds.has(chapterId)) {
    return;
  }
  activatingChapterIds.add(chapterId);
  try {
  const now = Date.now();
  const chapterTitle = hasFreshIntentFor(chapterId)
    ? chapterIntent?.chapterTitle ?? resolveChapterTitle(chapterId)
    : resolveChapterTitle(chapterId);
  chapterSession = { mode: "active", chapterId, chapterTitle, activatedAt: now };
  await ensurePanelForChapter(chapterId);
  log("active", { chapterId, reason });
  } finally {
    activatingChapterIds.delete(chapterId);
  }
}

function getActiveChapter(): { chapterId: string; chapterTitle: string | null } {
  if (chapterSession.mode !== "active") {
    throw new Error("No active chapter. Open a chapter reader first.");
  }
  return { chapterId: chapterSession.chapterId, chapterTitle: chapterSession.chapterTitle };
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

async function retryAsync<T>(
  operation: () => Promise<T>,
  shouldRetry: (error: unknown) => boolean,
): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= RETRY_DELAYS_MS.length || !shouldRetry(error)) {
        throw error;
      }
      log("retry", { attempt: attempt + 1, error });
      await delay(RETRY_DELAYS_MS[attempt]);
    }
  }
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
      const idx = cursor;
      cursor += 1;
      if (idx >= items.length) {
        return;
      }
      out[idx] = await worker(items[idx], idx);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => run()));
  return out;
}

async function fetchChapterPages(chapterId: string): Promise<ChapterPage[]> {
  const url = `${window.location.origin}/api/chapter/${chapterId}`;
  const fetchImpl = nativeFetchRef ?? fetch;
  const response = await withTimeout(fetchImpl(url, { credentials: "same-origin" }), "chapter api");
  if (!response.ok) {
    throw new Error(`Chapter API failed: ${response.status}`);
  }
  const payload = (await response.json()) as ChapterApiResponse;
  const pages = payload.data?.chapter;
  if (!pages || !Array.isArray(pages) || pages.length === 0) {
    throw new Error("No chapter pages in API response");
  }
  return pages;
}

async function loadChapterPages(chapterId: string): Promise<ChapterPage[]> {
  const cached = chapterPagesCache.get(chapterId);
  if (cached && cached.length > 0) {
    return cached;
  }
  const pages = await fetchChapterPages(chapterId);
  chapterPagesCache.set(chapterId, pages);
  return pages;
}

function getPageImage(page: ChapterPage, pageNumber: number): ChapterImage {
  const image = page.images?.[0];
  if (!image?.path) {
    throw new Error(`Page ${pageNumber} image is unavailable`);
  }
  return image;
}

async function capturePage(pageNumber: number, page: ChapterPage): Promise<CaptureResult> {
  const image = getPageImage(page, pageNumber);
  const fileExt = inferFileExtension(image.path);
  const fileName = `${String(pageNumber).padStart(4, "0")}.${fileExt}`;
  const fetchImpl = nativeFetchRef ?? fetch;
  const response = await withTimeout(
    fetchImpl(image.path, { credentials: "same-origin" }),
    "image fetch",
  );
  if (!response.ok) {
    throw new Error(`Image request failed for page ${pageNumber}: ${response.status}`);
  }
  const encodedBytes = new Uint8Array(await response.arrayBuffer());
  const keyBytes = image.key ? decodeBase64ToBytes(image.key) : new Uint8Array();
  const decodedBytes = decodeXor(encodedBytes, keyBytes);
  const blob = new Blob([decodedBytes], { type: extensionToMime(fileExt) });
  return { page: pageNumber, fileName, blob };
}

function shouldRetryCapture(error: unknown): boolean {
  const text = String(error);
  return /timeout|network|fetch|failed|status/i.test(text);
}

async function capturePageWithRetry(pageNumber: number, page: ChapterPage): Promise<CaptureResult> {
  return await retryAsync(() => capturePage(pageNumber, page), shouldRetryCapture);
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

function formatCaptureProgress(done: number, total: number): string {
  return `capturing ${done}/${Math.max(1, total)}`;
}

async function createZip(
  results: CaptureResult[],
  chapterTitle: string | null,
): Promise<{ blob: Blob; fileName: string }> {
  const files: Record<string, Uint8Array> = {};
  for (const result of results) {
    files[result.fileName] = new Uint8Array(await result.blob.arrayBuffer());
  }
  const from = results[0]?.page ?? 1;
  const to = results[results.length - 1]?.page ?? from;
  const prefix = chapterTitle
    ? `${getArchiveBaseName(document.title)}_${chapterTitle}`
    : getArchiveBaseName(document.title);
  const fileName = `${prefix}_${String(from).padStart(4, "0")}-${String(to).padStart(4, "0")}.zip`;
  const zipped = await zipFilesAsync(files);
  return {
    blob: new Blob([zipped], { type: ZIP_MIME }),
    fileName,
  };
}

async function captureRange(options: CaptureRangeOptions): Promise<CaptureSummary> {
  const active = getActiveChapter();
  const chapterId = active.chapterId;
  const pages = await loadChapterPages(chapterId);
  const endPage = pages.length;
  const from = Math.max(1, Math.min(options.from, options.to, endPage));
  const to = Math.max(1, Math.min(Math.max(options.from, options.to), endPage));
  const total = to - from + 1;
  const pageIndexes = Array.from({ length: total }, (_unused, idx) => from + idx);
  const downloadZip = options.downloadZip ?? true;
  let completed = 0;

  options.onProgress?.(formatCaptureProgress(0, total));
  const results = await mapWithConcurrency(pageIndexes, CAPTURE_CONCURRENCY, async (pageNumber) => {
    const result = await capturePageWithRetry(pageNumber, pages[pageNumber - 1]);
    completed += 1;
    options.onProgress?.(formatCaptureProgress(completed, total));
    return result;
  });
  results.sort((a, b) => a.page - b.page);

  const summary: CaptureSummary = {
    from,
    to,
    capturedPages: results.map((result) => result.page),
  };

  if (downloadZip && results.length > 0) {
    options.onProgress?.("zipping...");
    const zipResult = await createZip(results, active.chapterTitle);
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

function createPanelShell(): PanelRefs {
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

  const chapterLabel = document.createElement("span");
  chapterLabel.style.fontWeight = "700";
  const fromInput = createInput("1");
  const toInput = createInput("1");
  const button = document.createElement("button");
  button.textContent = "capture zip";
  button.style.cssText = [
    "padding: 6px 10px",
    "border: 0",
    "border-radius: 6px",
    "background: #6ad3a5",
    "color: #111",
    "font-weight: 700",
    "cursor: pointer",
  ].join(";");
  const status = document.createElement("span");
  status.textContent = "ready";

  panel.append(
    chapterLabel,
    document.createTextNode("pages"),
    fromInput,
    document.createTextNode("~"),
    toInput,
    button,
    status,
  );

  const refs: PanelRefs = {
    panel,
    chapterLabel,
    fromInput,
    toInput,
    button,
    status,
    chapterId: "",
  };

  button.onclick = async () => {
    const chapterIdAtStart = getActiveChapter().chapterId;
    const from = Number.parseInt(refs.fromInput.value || "1", 10);
    const to = Number.parseInt(refs.toInput.value || "1", 10);
    refs.button.disabled = true;
    refs.status.textContent = `chapter ${chapterIdAtStart}: ${formatCaptureProgress(0, Math.max(1, Math.abs(to - from) + 1))}`;
    try {
      const summary = await captureRange({
        from,
        to,
        downloadZip: true,
        onProgress: (message) => {
          refs.status.textContent = `chapter ${chapterIdAtStart}: ${message}`;
        },
      });
      refs.status.textContent = `chapter ${chapterIdAtStart}: saved ${summary.from}-${summary.to}`;
    } catch (error) {
      refs.status.textContent = error instanceof Error ? error.message : String(error);
      console.error(error);
    } finally {
      refs.button.disabled = false;
    }
  };

  return refs;
}

async function ensurePanelForChapter(chapterId: string): Promise<void> {
  if (!document.body) {
    return;
  }
  const pages = await loadChapterPages(chapterId);
  const endPage = pages.length;

  if (!panelRefs) {
    panelRefs = createPanelShell();
    document.body.appendChild(panelRefs.panel);
  }

  panelRefs.chapterId = chapterId;
  const title = resolveChapterTitle(chapterId);
  panelRefs.chapterLabel.textContent = title ? `ch ${chapterId} ${title}` : `ch ${chapterId}`;
  panelRefs.fromInput.value = "1";
  panelRefs.toInput.value = String(endPage);
  panelRefs.status.textContent = `chapter ${chapterId} ready (1-${endPage})`;
}

function installChapterIntentListener(): void {
  document.addEventListener(
    "click",
    (event) => {
      const target = event.target as Element | null;
      if (!target) {
        return;
      }
      if (target.closest(".close-viewer")) {
        setIdle("viewer closed");
        return;
      }
      const chapterElement = target.closest("li[data-chapter-id]");
      if (!chapterElement) {
        return;
      }
      const chapterId = chapterElement.getAttribute("data-chapter-id");
      const dataUrl = chapterElement.getAttribute("data-url");
      const chapterFromDataUrl = parseChapterIdFromChapterRoute(dataUrl ?? "");
      const effective = chapterId ?? chapterFromDataUrl;
      if (!effective) {
        return;
      }
      const chapterTitle = getChapterTitleFromElement(chapterElement);
      recordChapterIntent(effective, chapterTitle);
      log("intent", effective);
    },
    true,
  );
}

function onChapterApiResponse(urlLike: string, status: number, source: "fetch" | "xhr"): void {
  if (status < 200 || status >= 400) {
    return;
  }
  const chapterId = parseChapterIdFromApiUrl(urlLike);
  if (!chapterId) {
    return;
  }
  if (!shouldActivateFromNetwork(chapterId)) {
    return;
  }
  void setActiveChapter(chapterId, `${source} response`);
}

function installNetworkObservers(): void {
  const originalFetch = window.fetch.bind(window);
  nativeFetchRef = originalFetch;
  window.fetch = (async (...args: Parameters<typeof fetch>) => {
    const response = await originalFetch(...args);
    const urlLike = typeof args[0] === "string" ? args[0] : args[0]?.url ?? "";
    onChapterApiResponse(urlLike, response.status, "fetch");
    return response;
  }) as typeof fetch;

  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function openProxy(
    this: XMLHttpRequest & { __mangaParkLiteUrl?: string },
    method: string,
    url: string | URL,
    async?: boolean,
    username?: string | null,
    password?: string | null,
  ): void {
    this.__mangaParkLiteUrl = String(url);
    originalOpen.call(this, method, url, async ?? true, username, password);
  };

  XMLHttpRequest.prototype.send = function sendProxy(this: XMLHttpRequest & { __mangaParkLiteUrl?: string }, body?: Document | XMLHttpRequestBodyInit | null): void {
    this.addEventListener("load", () => {
      onChapterApiResponse(this.__mangaParkLiteUrl ?? this.responseURL ?? "", this.status, "xhr");
    });
    originalSend.call(this, body);
  };
}

async function init(): Promise<void> {
  window.__mangaParkLite__ = { captureRange };
  installChapterIntentListener();
  installNetworkObservers();

  const directChapter = getDirectChapterFromPath();
  if (directChapter) {
    await setActiveChapter(directChapter, "direct url");
  }
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  void init().catch((error) => console.error("[MangaParkLite] init failed", error));
}
