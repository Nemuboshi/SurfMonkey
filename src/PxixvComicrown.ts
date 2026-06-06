import { Zip, ZipPassThrough } from "fflate";
import { saveAs } from "file-saver";

import { bytesToBlobPart, bytesToImageDataArray } from "./blobParts";

type ReadingPage = {
  url: string;
  width: number;
  height: number;
  gridsize: number;
  key?: string;
};

type ReadingEpisode = {
  id: number;
  title: string;
  numbering_title?: string;
  work_title: string;
  viewer_path: string;
  pages: ReadingPage[];
};

type ReadV4Response = {
  data?: {
    reading_episode?: ReadingEpisode;
  };
};

type ViewerBootstrap = {
  salt: string;
  episodeId: string;
};

type DownloadOptions = {
  viewerPath: string;
  from?: number;
  to?: number;
  onProgress?: (status: string) => void;
};

type ViewerPanelRefs = {
  panel: HTMLDivElement;
  title: HTMLSpanElement;
  fromInput: HTMLInputElement;
  toInput: HTMLInputElement;
  button: HTMLButtonElement;
  status: HTMLSpanElement;
};

type DownloadedPage = {
  name: string;
  bytes: Uint8Array;
};

declare global {
  interface Window {
    __NEXT_DATA__?: {
      props?: {
        pageProps?: {
          salt?: string;
          id?: string | number;
        };
      };
    };
  }
}

const PANEL_ID = "__pxixv_comicrown_panel";
const ZIP_MIME = "application/zip";
const FETCH_CONCURRENCY = 4;
const DESCRAMBLE_SECRET = "4wXCKprMMoxnyJ3PocJFs4CYbfnbazNe";

function log(...args: unknown[]): void {
  console.log("[PxixvComicrown]", ...args);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => globalThis.setTimeout(resolve, ms));
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

  return cleaned.replace(/\s+/g, " ").trim() || "pixiv-comic";
}

function formatClientTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const offsetHours = String(Math.floor(Math.abs(offsetMinutes) / 60)).padStart(2, "0");
  const offsetRemainder = String(Math.abs(offsetMinutes) % 60).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${sign}${offsetHours}:${offsetRemainder}`;
}

async function buildClientHeaders(salt: string): Promise<{ time: string; hash: string }> {
  const time = formatClientTime(new Date());
  const bytes = new TextEncoder().encode(`${time}${salt}`);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  const hash = Array.from(digest, (value) => value.toString(16).padStart(2, "0")).join("");
  return { time, hash };
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

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => {
      return run();
    }),
  );

  return out;
}

function parseEpisodeIdFromViewerPath(pathLike: string): string | null {
  try {
    const parsed = new URL(pathLike, window.location.origin);
    return parsed.pathname.match(/^\/viewer\/stories\/(\d+)/)?.[1] ?? null;
  } catch {
    return null;
  }
}

function buildArchiveName(
  workTitle: string,
  episodeTitle: string,
  from: number,
  to: number,
): string {
  const work = sanitizeFilePart(workTitle);
  const episode = sanitizeFilePart(episodeTitle);
  return `${work} - ${episode} - p${pad(from)}-p${pad(to)}.zip`;
}

function createNumberInput(value: string): HTMLInputElement {
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

function createButton(label: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.style.cssText = [
    "padding: 6px 10px",
    "border: 0",
    "border-radius: 6px",
    "background: #6ad3a5",
    "color: #111",
    "font-weight: 700",
    "cursor: pointer",
  ].join(";");
  return button;
}

function createViewerPanel(): ViewerPanelRefs {
  const panel = document.createElement("div");
  panel.id = PANEL_ID;
  panel.style.cssText = [
    "position: fixed",
    "right: 16px",
    "bottom: 16px",
    "z-index: 2147483647",
    "display: flex",
    "flex-direction: column",
    "align-items: stretch",
    "gap: 10px",
    "min-width: 220px",
    "padding: 12px",
    "border: 1px solid rgba(255,255,255,0.14)",
    "border-radius: 14px",
    "background: rgba(12,14,18,0.86)",
    "backdrop-filter: blur(10px)",
    "box-shadow: 0 12px 36px rgba(0,0,0,0.34)",
    "color: #fff",
    "font: 12px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace",
  ].join(";");

  const title = document.createElement("span");
  title.style.fontWeight = "700";
  title.textContent = "pixiv";

  const header = document.createElement("div");
  header.style.cssText = [
    "display:flex",
    "align-items:center",
    "justify-content:space-between",
    "gap:10px",
  ].join(";");

  const badge = document.createElement("span");
  badge.textContent = "PxixvComicrown";
  badge.style.cssText = [
    "padding:2px 7px",
    "border-radius:999px",
    "background: rgba(106,211,165,0.18)",
    "color:#9af0c5",
    "font-size:11px",
    "font-weight:700",
  ].join(";");

  header.append(title, badge);

  const fromInput = createNumberInput("1");
  const toInput = createNumberInput("1");
  const rangeRow = document.createElement("div");
  rangeRow.style.cssText = ["display:flex", "align-items:center", "gap:8px"].join(";");

  const rangeLabel = document.createElement("span");
  rangeLabel.textContent = "pages";
  rangeLabel.style.cssText = "opacity:0.78;min-width:40px;";

  const separator = document.createElement("span");
  separator.textContent = "~";
  separator.style.cssText = "opacity:0.66;";

  rangeRow.append(rangeLabel, fromInput, separator, toInput);

  const button = createButton("capture zip");
  button.style.width = "100%";

  const status = document.createElement("span");
  status.textContent = "ready";
  status.style.cssText = [
    "display:block",
    "min-height:14px",
    "color: rgba(255,255,255,0.76)",
    "white-space: nowrap",
    "overflow: hidden",
    "text-overflow: ellipsis",
  ].join(";");

  panel.append(header, rangeRow, button, status);

  return { panel, title, fromInput, toInput, button, status };
}

async function fetchViewerBootstrap(viewerPath: string): Promise<ViewerBootstrap> {
  const viewerUrl = new URL(viewerPath, window.location.origin).toString();
  const response = await fetch(viewerUrl, {
    credentials: "include",
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(`viewer bootstrap failed (${response.status})`);
  }

  const html = await response.text();
  const nextDataMatch = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/,
  );
  if (!nextDataMatch?.[1]) {
    throw new Error("viewer next data is missing");
  }

  let nextData: {
    props?: {
      pageProps?: {
        salt?: string;
        id?: string | number;
      };
    };
  };
  try {
    nextData = JSON.parse(nextDataMatch[1]) as ViewerBootstrap & {
      props?: {
        pageProps?: {
          salt?: string;
          id?: string | number;
        };
      };
    };
  } catch {
    throw new Error("viewer next data is invalid");
  }

  const salt = nextData.props?.pageProps?.salt;
  const episodeId = nextData.props?.pageProps?.id;
  if (!salt || episodeId === undefined || episodeId === null) {
    throw new Error("viewer metadata is missing");
  }

  return { salt, episodeId: String(episodeId) };
}

async function fetchEpisodeMetadata(episodeId: string, salt: string): Promise<ReadingEpisode> {
  const client = await buildClientHeaders(salt);
  const response = await fetch(`/api/app/episodes/${episodeId}/read_v4`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-Client-Hash": client.hash,
      "X-Client-Time": client.time,
      "X-Requested-With": "pixivcomic",
    },
  });

  if (!response.ok) {
    throw new Error(`episode api failed (${response.status})`);
  }

  const payload = (await response.json()) as ReadV4Response;
  const episode = payload.data?.reading_episode;
  if (!episode) {
    throw new Error("episode payload is missing");
  }
  return episode;
}

function rotateLeft32(value: number, shift: number): number {
  const normalized = shift % 32;
  return (((value << normalized) >>> 0) | (value >>> (32 - normalized))) >>> 0;
}

class Xoshiro128StarStar {
  private readonly state: Uint32Array;

  constructor(seed: Uint32Array) {
    if (seed.length !== 4) {
      throw new Error(`seed.length !== 4 (seed.length: ${seed.length})`);
    }
    this.state = new Uint32Array(seed);
    if (this.state[0] === 0 && this.state[1] === 0 && this.state[2] === 0 && this.state[3] === 0) {
      this.state[0] = 1;
    }
  }

  next(): number {
    const result = (9 * rotateLeft32((5 * this.state[1]) >>> 0, 7)) >>> 0;
    const t = (this.state[1] << 9) >>> 0;
    this.state[2] = (this.state[2] ^ this.state[0]) >>> 0;
    this.state[3] = (this.state[3] ^ this.state[1]) >>> 0;
    this.state[1] = (this.state[1] ^ this.state[2]) >>> 0;
    this.state[0] = (this.state[0] ^ this.state[3]) >>> 0;
    this.state[2] = (this.state[2] ^ t) >>> 0;
    this.state[3] = rotateLeft32(this.state[3], 11);
    return result;
  }
}

async function descrambleImageData(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  blockSizeH: number,
  blockSizeV: number,
  key: string,
): Promise<Uint8ClampedArray> {
  const bytesPerElement = 4;
  if (width <= 0 || height <= 0 || blockSizeH <= 0 || blockSizeV <= 0) {
    throw new Error("invalid image geometry");
  }
  if (data.length !== width * height * bytesPerElement) {
    throw new Error("image data length is invalid");
  }

  const rows = Math.ceil(height / blockSizeV);
  const columns = Math.floor(width / blockSizeH);
  const shuffleTable = Array.from({ length: rows }, () =>
    Array.from({ length: columns }, (_, index) => index),
  );

  const seedBytes = new TextEncoder().encode(`${DESCRAMBLE_SECRET}${key}`);
  const digest = await crypto.subtle.digest("SHA-256", seedBytes);
  const random = new Xoshiro128StarStar(new Uint32Array(digest, 0, 4));
  for (let index = 0; index < 100; index += 1) {
    random.next();
  }

  for (let row = 0; row < rows; row += 1) {
    const line = shuffleTable[row];
    for (let index = columns - 1; index >= 1; index -= 1) {
      const picked = random.next() % (index + 1);
      const temp = line[index];
      line[index] = line[picked];
      line[picked] = temp;
    }
  }

  for (let row = 0; row < rows; row += 1) {
    const line = shuffleTable[row];
    const reversed = line.map((_, index) => line.indexOf(index));
    if (reversed.some((value) => value < 0)) {
      throw new Error("failed to reverse shuffle table");
    }
    shuffleTable[row] = reversed;
  }

  const out = new Uint8ClampedArray(data.length);
  for (let y = 0; y < height; y += 1) {
    const row = shuffleTable[Math.floor(y / blockSizeV)] ?? [];
    for (let block = 0; block < columns; block += 1) {
      const sourceBlock = row[block] ?? block;
      const destinationOffset = (y * width + block * blockSizeH) * bytesPerElement;
      const sourceOffset = (y * width + sourceBlock * blockSizeH) * bytesPerElement;
      const copyLength = blockSizeH * bytesPerElement;
      for (let index = 0; index < copyLength; index += 1) {
        out[destinationOffset + index] = data[sourceOffset + index];
      }
    }

    const tailStart = (y * width + columns * blockSizeH) * bytesPerElement;
    const lineEnd = (y * width + width) * bytesPerElement;
    for (let index = tailStart; index < lineEnd; index += 1) {
      out[index] = data[index];
    }
  }

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

async function downloadAndDescramblePage(
  page: ReadingPage,
  pageNumber: number,
): Promise<DownloadedPage> {
  const response = await fetch(page.url, {
    headers: page.key
      ? {
          "X-Cobalt-Thumber-Parameter-GridShuffle-Key": page.key,
        }
      : undefined,
  });

  if (!response.ok) {
    throw new Error(`page fetch failed (${response.status})`);
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
    if (page.key) {
      const imageData = context.getImageData(0, 0, page.width, page.height);
      const descrambled = await descrambleImageData(
        imageData.data,
        page.width,
        page.height,
        page.gridsize,
        page.gridsize,
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
      name: `${pad(pageNumber)}.png`,
      bytes: new Uint8Array(await pngBlob.arrayBuffer()),
    };
  } finally {
    bitmap.close();
    canvas.width = 1;
    canvas.height = 1;
  }
}

async function buildZipBlob(
  episode: ReadingEpisode,
  from: number,
  to: number,
  onProgress?: (status: string) => void,
): Promise<{ blob: Blob; fileName: string }> {
  const targetPages = episode.pages.slice(from - 1, to);
  const files = await mapWithConcurrency(targetPages, FETCH_CONCURRENCY, async (page, index) => {
    const current = from + index;
    onProgress?.(`page ${current}/${to}`);
    return await downloadAndDescramblePage(page, current);
  });

  onProgress?.("zipping");
  const chunks: BlobPart[] = [];
  const zipBlob = await new Promise<Blob>((resolve, reject) => {
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

  const episodeTitle = episode.numbering_title?.trim() || episode.title;
  return {
    blob: zipBlob,
    fileName: buildArchiveName(episode.work_title, episodeTitle, from, to),
  };
}

async function downloadEpisodeRange(options: DownloadOptions): Promise<void> {
  options.onProgress?.("loading episode");
  const bootstrap = await fetchViewerBootstrap(options.viewerPath);
  const episode = await fetchEpisodeMetadata(bootstrap.episodeId, bootstrap.salt);
  const pageCount = episode.pages.length;
  const from = Math.max(1, Math.min(options.from ?? 1, pageCount));
  const to = Math.max(from, Math.min(options.to ?? pageCount, pageCount));
  const zipResult = await buildZipBlob(episode, from, to, options.onProgress);
  saveAs(zipResult.blob, zipResult.fileName);
  options.onProgress?.(`saved ${zipResult.fileName}`);
}

function installViewerPanel(): void {
  if (document.getElementById(PANEL_ID) || !document.body) {
    return;
  }

  const panel = createViewerPanel();
  document.body.appendChild(panel.panel);

  const currentId = parseEpisodeIdFromViewerPath(window.location.pathname);
  const salt = window.__NEXT_DATA__?.props?.pageProps?.salt;

  if (currentId && salt) {
    void fetchEpisodeMetadata(currentId, salt)
      .then((episode) => {
        const pageCount = episode.pages.length;
        panel.title.textContent = episode.numbering_title?.trim() || episode.title;
        panel.fromInput.value = "1";
        panel.toInput.value = String(pageCount);
        panel.status.textContent = `ready 1/${pageCount}`;
      })
      .catch((error) => {
        panel.status.textContent = error instanceof Error ? error.message : String(error);
      });
  }

  panel.button.onclick = async () => {
    const from = Number.parseInt(panel.fromInput.value || "1", 10);
    const to = Number.parseInt(panel.toInput.value || panel.fromInput.value || "1", 10);
    panel.button.disabled = true;
    try {
      await downloadEpisodeRange({
        viewerPath: window.location.pathname,
        from,
        to,
        onProgress: (status) => {
          panel.status.textContent = status;
        },
      });
    } catch (error) {
      panel.status.textContent = error instanceof Error ? error.message : String(error);
      console.error(error);
    } finally {
      panel.button.disabled = false;
    }
  };
}

function enhanceWorksPage(): void {
  const links = document.querySelectorAll<HTMLAnchorElement>('a[href^="/viewer/stories/"]');
  for (const link of links) {
    if (link.dataset.pxixvComicrownReady === "true") {
      continue;
    }
    const viewerPath = link.getAttribute("href");
    if (!viewerPath) {
      continue;
    }

    link.dataset.pxixvComicrownReady = "true";
    const wrapper = document.createElement("div");
    wrapper.dataset.pxixvComicrownRow = "true";
    wrapper.style.cssText = "display:flex;align-items:center;gap:8px;width:100%;";
    link.parentNode?.insertBefore(wrapper, link);
    wrapper.appendChild(link);
    link.style.flex = "1 1 auto";
    link.style.minWidth = "0";

    const button = createButton("zip");
    button.style.padding = "4px 8px";
    button.style.fontSize = "12px";
    button.onclick = async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const originalText = button.textContent ?? "zip";
      button.disabled = true;
      button.textContent = "run";
      try {
        await downloadEpisodeRange({
          viewerPath,
          onProgress: (status) => {
            button.textContent = status.startsWith("saved")
              ? "done"
              : status.replace(/^(.{0,10}).*$/, "$1");
          },
        });
        button.textContent = "done";
        await delay(1500);
      } catch (error) {
        button.textContent = "fail";
        console.error(error);
        await delay(2000);
      } finally {
        button.disabled = false;
        button.textContent = originalText;
      }
    };

    wrapper.appendChild(button);
  }
}

function init(): void {
  if (window.location.pathname.startsWith("/viewer/stories/")) {
    installViewerPanel();
    return;
  }

  if (window.location.pathname.startsWith("/works/")) {
    enhanceWorksPage();
    const observer = new MutationObserver(() => enhanceWorksPage());
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  void Promise.resolve()
    .then(init)
    .catch((error) => log("init failed", error));
}
