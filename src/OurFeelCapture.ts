import { Zip, ZipPassThrough } from "fflate";
import { saveAs } from "file-saver";

type RawPageEntry = {
  type?: string;
  src?: string;
  width?: number;
  height?: number;
};

type EpisodeJsonPayload = {
  readableProduct?: {
    id?: string;
    title?: string;
    series?: {
      title?: string;
    };
    pageStructure?: {
      choJuGiga?: string;
      pages?: RawPageEntry[];
    };
  };
};

type EpisodePage = {
  src: string;
  width: number;
  height: number;
};

type Episode = {
  id: string;
  title: string;
  seriesTitle: string;
  scrambleMode: string | null;
  pages: EpisodePage[];
};

type DownloadOptions = {
  from?: number;
  to?: number;
  onProgress?: (status: string) => void;
};

type PanelRefs = {
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

const PANEL_ID = "__ourfeel_capture_panel";
const ZIP_MIME = "application/zip";
const FETCH_CONCURRENCY = 4;

function log(...args: unknown[]): void {
  console.log("[OurFeelCapture]", ...args);
}

function pad(value: number, length = 4): string {
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

  return cleaned.replace(/\s+/g, " ").trim() || "ourfeel";
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

function parseEpisodeJsonPayload(): EpisodeJsonPayload {
  const script = document.getElementById("episode-json");
  const raw = script?.getAttribute("data-value") ?? script?.textContent;
  if (!raw?.trim()) {
    throw new Error("episode-json is missing");
  }

  try {
    return JSON.parse(raw) as EpisodeJsonPayload;
  } catch {
    throw new Error("episode-json is invalid");
  }
}

function getEpisode(): Episode {
  const product = parseEpisodeJsonPayload().readableProduct;
  if (!product) {
    throw new Error("readableProduct is missing");
  }

  const pages =
    product.pageStructure?.pages
      ?.filter((page): page is EpisodePage => {
        return (
          page.type === "main" &&
          typeof page.src === "string" &&
          page.src.length > 0 &&
          typeof page.width === "number" &&
          typeof page.height === "number"
        );
      })
      .map((page) => ({
        src: page.src,
        width: page.width,
        height: page.height,
      })) ?? [];

  if (pages.length === 0) {
    throw new Error("No main pages found");
  }

  return {
    id: product.id ?? window.location.pathname.match(/\/episode\/([^/?#]+)/)?.[1] ?? "episode",
    title: product.title ?? document.title,
    seriesTitle: product.series?.title ?? document.title.split(" / ")[0] ?? "OUR FEEL",
    scrambleMode: product.pageStructure?.choJuGiga ?? null,
    pages,
  };
}

function inferImageExtension(contentType: string | null): string {
  const normalized = contentType?.toLowerCase() ?? "";
  if (normalized.includes("png")) {
    return "png";
  }
  if (normalized.includes("webp")) {
    return "webp";
  }
  return "jpg";
}

function toBlobPart(bytes: Uint8Array): BlobPart {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
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

async function descrambleBakuPage(blob: Blob, page: EpisodePage): Promise<Blob> {
  const bitmap = await blobToBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = page.width;
  canvas.height = page.height;

  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("2D context unavailable");
  }

  try {
    const columns = 4;
    const rows = 4;
    const tileWidth = Math.floor(page.width / columns);
    const tileHeight = Math.floor(page.height / rows);
    if (tileWidth <= 0 || tileHeight <= 0) {
      throw new Error("invalid baku tile size");
    }

    context.drawImage(bitmap, 0, 0, page.width, page.height);
    for (let sourceRow = 0; sourceRow < rows; sourceRow += 1) {
      for (let sourceColumn = 0; sourceColumn < columns; sourceColumn += 1) {
        context.drawImage(
          bitmap,
          sourceColumn * tileWidth,
          sourceRow * tileHeight,
          tileWidth,
          tileHeight,
          sourceRow * tileWidth,
          sourceColumn * tileHeight,
          tileWidth,
          tileHeight,
        );
      }
    }

    return await canvasToPngBlob(canvas);
  } finally {
    bitmap.close();
    canvas.width = 1;
    canvas.height = 1;
  }
}

async function downloadPage(
  page: EpisodePage,
  pageNumber: number,
  scrambleMode: string | null,
): Promise<DownloadedPage> {
  const response = await fetch(page.src, {
    credentials: "omit",
    referrerPolicy: "strict-origin-when-cross-origin",
  });

  if (!response.ok) {
    throw new Error(`page ${pageNumber} failed (${response.status})`);
  }

  const blob = await response.blob();
  if (scrambleMode === "baku") {
    const pngBlob = await descrambleBakuPage(blob, page);
    return {
      name: `${pad(pageNumber)}.png`,
      bytes: new Uint8Array(await pngBlob.arrayBuffer()),
    };
  }

  const extension = inferImageExtension(response.headers.get("content-type") || blob.type);
  return {
    name: `${pad(pageNumber)}.${extension}`,
    bytes: new Uint8Array(await blob.arrayBuffer()),
  };
}

function buildArchiveName(episode: Episode, from: number, to: number): string {
  const series = sanitizeFilePart(episode.seriesTitle);
  const title = sanitizeFilePart(episode.title);
  return `${series} - ${title} - p${pad(from)}-p${pad(to)}.zip`;
}

async function buildZipBlob(
  episode: Episode,
  from: number,
  to: number,
  onProgress?: (status: string) => void,
): Promise<{ blob: Blob; fileName: string }> {
  const targetPages = episode.pages.slice(from - 1, to);
  let completed = 0;
  const files = await mapWithConcurrency(targetPages, FETCH_CONCURRENCY, async (page, index) => {
    const current = from + index;
    const downloaded = await downloadPage(page, current, episode.scrambleMode);
    completed += 1;
    onProgress?.(`page ${completed}/${targetPages.length}`);
    return downloaded;
  });

  onProgress?.("zipping");
  const chunks: BlobPart[] = [];
  const zipBlob = await new Promise<Blob>((resolve, reject) => {
    const zip = new Zip((error, data, final) => {
      if (error) {
        reject(error);
        return;
      }
      chunks.push(toBlobPart(data));
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

  return {
    blob: zipBlob,
    fileName: buildArchiveName(episode, from, to),
  };
}

async function downloadEpisodeRange(options: DownloadOptions): Promise<void> {
  options.onProgress?.("loading episode");
  const episode = getEpisode();
  const pageCount = episode.pages.length;
  const from = Math.max(1, Math.min(options.from ?? 1, options.to ?? pageCount, pageCount));
  const to = Math.max(
    from,
    Math.min(Math.max(options.from ?? 1, options.to ?? pageCount), pageCount),
  );
  const zipResult = await buildZipBlob(episode, from, to, options.onProgress);
  saveAs(zipResult.blob, zipResult.fileName);
  options.onProgress?.(`saved ${zipResult.fileName}`);
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

function createPanel(): PanelRefs {
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
    "border-radius: 8px",
    "background: rgba(12,14,18,0.86)",
    "backdrop-filter: blur(10px)",
    "box-shadow: 0 12px 36px rgba(0,0,0,0.34)",
    "color: #fff",
    "font: 12px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace",
  ].join(";");

  const title = document.createElement("span");
  title.style.cssText =
    "font-weight:700;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
  title.textContent = "OUR FEEL";

  const badge = document.createElement("span");
  badge.textContent = "OurFeelCapture";
  badge.style.cssText = [
    "padding:2px 7px",
    "border-radius:999px",
    "background: rgba(106,211,165,0.18)",
    "color:#9af0c5",
    "font-size:11px",
    "font-weight:700",
  ].join(";");

  const header = document.createElement("div");
  header.style.cssText = [
    "display:flex",
    "align-items:center",
    "justify-content:space-between",
    "gap:10px",
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

function installPanel(): void {
  if (document.getElementById(PANEL_ID) || !document.body) {
    return;
  }

  const panel = createPanel();
  document.body.appendChild(panel.panel);

  try {
    const episode = getEpisode();
    panel.title.textContent = episode.title;
    panel.fromInput.value = "1";
    panel.toInput.value = String(episode.pages.length);
    panel.status.textContent = `ready 1/${episode.pages.length}`;
  } catch (error) {
    panel.status.textContent = error instanceof Error ? error.message : String(error);
  }

  panel.button.onclick = async () => {
    const from = Number.parseInt(panel.fromInput.value || "1", 10);
    const to = Number.parseInt(panel.toInput.value || panel.fromInput.value || "1", 10);
    panel.button.disabled = true;
    try {
      await downloadEpisodeRange({
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

function init(): void {
  if (!window.location.pathname.startsWith("/episode/")) {
    return;
  }
  installPanel();
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  void Promise.resolve()
    .then(init)
    .catch((error) => log("init failed", error));
}
