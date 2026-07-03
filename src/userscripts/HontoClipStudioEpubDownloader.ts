import { zip } from "fflate";

import { bytesToBlobPart } from "../shared/blobParts";

type TokenResponse = {
  token?: string;
};

type MetaResponse = {
  colophon?: {
    setContentIdQuery?: boolean;
    setTokenQuery?: boolean;
    size?: string;
    type?: number;
    url?: string;
  };
  content?: {
    baseUrl?: string;
  };
  version?: string;
};

type AnalysisStage = {
  details?: string;
  endpointShape: string;
  method: string;
  name: string;
  status: number;
};

type AnalysisSummary = {
  authFlow: {
    contentId: string;
    stages: AnalysisStage[];
    viewerTokenIssued: boolean;
  };
  legacyReader?: {
    apiUrlShape: string;
    contentFrame: {
      height: number | null;
      width: number | null;
    };
    faceXmlUrlShape: string;
    pageCount: number | null;
    scramble: {
      height: number | null;
      width: number | null;
    };
  };
  meta: {
    baseUrl: string | null;
    colophon: MetaResponse["colophon"] | null;
    version: string | null;
  };
  observedRequests: {
    methods: string[];
    resourceTypes: string[];
    sampleEndpointShapes: string[];
  };
  opf: {
    manifestCount: number;
    mediaTypeCounts: Record<string, number>;
    navItemHref: string | null;
    rootfilePath: string | null;
    sampleManifest: Array<{
      href: string;
      id: string;
      mediaType: string;
      properties: string | null;
    }>;
    sampleSpine: string[];
    spineCount: number;
  };
  reader: {
    host: string;
    title: string;
    urlShape: string;
  };
};

type PanelRefs = {
  analyzeButton: HTMLButtonElement;
  downloadButton: HTMLButtonElement;
  output: HTMLTextAreaElement;
  panel: HTMLDivElement;
  status: HTMLSpanElement;
};

type OpfManifestItem = {
  href: string;
  id: string;
  mediaType: string;
  properties: string | null;
};

type PackageIndex = {
  baseUrl: string;
  containerText: string;
  contentId: string;
  manifestItems: OpfManifestItem[];
  meta: MetaResponse;
  opfText: string;
  packageTitle: string | null;
  readerTitle: string;
  rootfilePath: string;
  viewerToken: string;
};

type PackageDownloadSummary = {
  failedFiles: Array<{ path: string; reason: string }>;
  fileCount: number;
  zipName: string;
};

type LegacyReaderEntry = {
  apiUrl: string;
  faceXmlUrl: string;
  param: string;
};

type LegacyFaceInfo = {
  contentHeight: number;
  contentWidth: number;
  pageCount: number;
  scrambleHeight: number;
  scrambleWidth: number;
};

type LegacyPageCapture = {
  bytes: Uint8Array;
  fileName: string;
  page: number;
};

declare global {
  interface Window {
    __hontoClipStudioEpubDownloader__?: {
      analyze: () => Promise<AnalysisSummary>;
      downloadPackage: () => Promise<PackageDownloadSummary>;
    };
  }
}

const PANEL_ID = "__honto_clipstudio_epub_downloader_panel";
const REQUEST_TIMEOUT_MS = 30000;
const EPUB_MEDIA_TYPE = "application/epub+zip";
const EPUB_MIME = "application/epub+zip";
const CLIP_STUDIO_JPEG_XOR_KEY = 0xc9;
const CLIP_STUDIO_JPEG_XOR_LENGTH = 64;

function log(...args: unknown[]): void {
  console.log("[HontoClipStudioEpubDownloader]", ...args);
}

function toUrlShape(input: string): string {
  try {
    const url = new URL(input, location.href);
    return url.pathname
      .replace(/\/contents\/[^/]+/g, "/contents/:contentId")
      .replace(/\/files\/[^/]+/g, "/files/:packageId")
      .replace(/\/aa[0-9]+\//g, "/:accountOrWorkId/");
  } catch {
    return input;
  }
}

function hasJpegHeader(bytes: Uint8Array): boolean {
  return bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

function hasClipStudioMaskedJpegHeader(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 4 &&
    (bytes[0] ^ CLIP_STUDIO_JPEG_XOR_KEY) === 0xff &&
    (bytes[1] ^ CLIP_STUDIO_JPEG_XOR_KEY) === 0xd8 &&
    (bytes[2] ^ CLIP_STUDIO_JPEG_XOR_KEY) === 0xff &&
    (bytes[3] ^ CLIP_STUDIO_JPEG_XOR_KEY) >= 0xe0 &&
    (bytes[3] ^ CLIP_STUDIO_JPEG_XOR_KEY) <= 0xef
  );
}

function isJpegManifestItem(item: OpfManifestItem, packagePath: string): boolean {
  return item.mediaType.toLowerCase() === "image/jpeg" || /\.jpe?g$/i.test(packagePath);
}

function decodeClipStudioImageResource(
  item: OpfManifestItem,
  packagePath: string,
  bytes: Uint8Array,
): Uint8Array {
  if (!isJpegManifestItem(item, packagePath) || hasJpegHeader(bytes)) {
    return bytes;
  }
  if (!hasClipStudioMaskedJpegHeader(bytes)) {
    return bytes;
  }

  const decoded = bytes.slice();
  for (let index = 0; index < Math.min(CLIP_STUDIO_JPEG_XOR_LENGTH, decoded.length); index += 1) {
    decoded[index] ^= CLIP_STUDIO_JPEG_XOR_KEY;
  }
  return decoded;
}

function createTimeoutSignal(timeoutMs: number): AbortSignal {
  const controller = new AbortController();
  globalThis.setTimeout(
    () => controller.abort(new Error(`Request timed out (${timeoutMs}ms)`)),
    timeoutMs,
  );
  return controller.signal;
}

function createAuthHeaders(bearer?: string): HeadersInit {
  return bearer
    ? {
        Authorization: `Bearer ${bearer}`,
      }
    : {};
}

async function fetchText(url: string, bearer?: string): Promise<{ status: number; text: string }> {
  const response = await fetch(url, {
    credentials: "same-origin",
    headers: createAuthHeaders(bearer),
    signal: createTimeoutSignal(REQUEST_TIMEOUT_MS),
  });
  return {
    status: response.status,
    text: await response.text(),
  };
}

async function fetchBytes(
  url: string,
  bearer?: string,
): Promise<{ bytes: Uint8Array; status: number }> {
  const response = await fetch(url, {
    credentials: "same-origin",
    headers: createAuthHeaders(bearer),
    signal: createTimeoutSignal(REQUEST_TIMEOUT_MS),
  });
  return {
    bytes: new Uint8Array(await response.arrayBuffer()),
    status: response.status,
  };
}

async function fetchJson<T>(url: string, bearer: string): Promise<{ json: T; status: number }> {
  const response = await fetch(url, {
    credentials: "same-origin",
    headers: createAuthHeaders(bearer),
    signal: createTimeoutSignal(REQUEST_TIMEOUT_MS),
  });
  return {
    json: (await response.json()) as T,
    status: response.status,
  };
}

function requireSearchParam(name: string): string {
  const value = new URL(location.href).searchParams.get(name)?.trim();
  if (!value) {
    throw new Error(`Missing required query parameter: ${name}`);
  }
  return value;
}

function getOptionalSearchParam(name: string): string | null {
  return new URL(location.href).searchParams.get(name)?.trim() || null;
}

function parseXml(xml: string, label: string): XMLDocument {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.querySelector("parsererror")) {
    throw new Error(`Failed to parse ${label}`);
  }
  return doc;
}

function queryNumber(doc: XMLDocument, selector: string): number | null {
  const value = doc.querySelector(selector)?.textContent?.trim();
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function requireXmlNumber(doc: XMLDocument, selector: string, label: string): number {
  const value = queryNumber(doc, selector);
  if (value === null) {
    throw new Error(`${label} is missing in XML selector: ${selector}`);
  }
  return value;
}

function queryText(doc: XMLDocument, selector: string): string | null {
  return doc.querySelector(selector)?.textContent?.trim() || null;
}

function findObservedLegacyFaceXmlUrl(): string | null {
  const resources = performance
    .getEntriesByType("resource")
    .filter(
      (entry): entry is PerformanceResourceTiming => entry instanceof PerformanceResourceTiming,
    );

  for (const entry of resources) {
    if (entry.name.includes("diazepam_hybrid.php") && entry.name.includes("file=face.xml")) {
      return entry.name;
    }
  }

  return null;
}

function resolveLegacyReaderEntry(readerUrl: URL): LegacyReaderEntry | null {
  const cgi = readerUrl.searchParams.get("cgi")?.trim();
  const param = readerUrl.searchParams.get("param")?.trim();
  if (!cgi || !param) {
    return null;
  }

  const observedFaceXmlUrl = findObservedLegacyFaceXmlUrl();
  if (observedFaceXmlUrl) {
    return {
      apiUrl: cgi,
      faceXmlUrl: observedFaceXmlUrl,
      param,
    };
  }

  const faceXmlUrl = new URL(cgi, readerUrl.href);
  faceXmlUrl.searchParams.set("mode", "7");
  faceXmlUrl.searchParams.set("file", readerUrl.searchParams.get("file")?.trim() || "face.xml");
  faceXmlUrl.searchParams.set("reqtype", "0");
  faceXmlUrl.searchParams.set("vm", readerUrl.searchParams.get("vm")?.trim() || "1");
  faceXmlUrl.searchParams.set("param", param);
  faceXmlUrl.searchParams.set("time", String(Date.now()));

  return {
    apiUrl: cgi,
    faceXmlUrl: faceXmlUrl.toString(),
    param,
  };
}

function buildLegacyResourceUrl(entry: LegacyReaderEntry, mode: string, fileName: string): string {
  const url = new URL(entry.faceXmlUrl);
  url.searchParams.set("mode", mode);
  url.searchParams.set("file", fileName);
  url.searchParams.set("time", String(Date.now()));
  return url.toString();
}

function assertOk(status: number, label: string): void {
  if (status < 200 || status >= 300) {
    throw new Error(`${label} returned HTTP ${status}`);
  }
}

function normalizePackagePath(pathLike: string): string {
  return pathLike
    .replace(/\\/g, "/")
    .split("/")
    .filter((part) => part && part !== ".")
    .join("/");
}

function packageDir(rootfilePath: string): string {
  const normalized = normalizePackagePath(rootfilePath);
  const slashIndex = normalized.lastIndexOf("/");
  return slashIndex >= 0 ? normalized.slice(0, slashIndex) : "";
}

function joinPackagePath(baseDir: string, href: string): string {
  if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("//")) {
    throw new Error(`External manifest resource is not package-relative: ${href}`);
  }

  const hrefWithoutFragment = href.split("#", 1)[0]?.trim() ?? "";
  const parts = `${baseDir}/${hrefWithoutFragment}`.replace(/\\/g, "/").split("/");
  const normalized: string[] = [];

  for (const part of parts) {
    if (!part || part === ".") {
      continue;
    }
    if (part === "..") {
      normalized.pop();
      continue;
    }
    normalized.push(part);
  }

  return normalized.join("/");
}

function collectObservedRequests(): AnalysisSummary["observedRequests"] {
  const resources = performance
    .getEntriesByType("resource")
    .filter(
      (entry): entry is PerformanceResourceTiming => entry instanceof PerformanceResourceTiming,
    )
    .filter(
      (entry) =>
        entry.name.includes("/api/v1/contents/") ||
        entry.name.includes("/api/v1/tokens/viewer") ||
        entry.name.includes("diazepam_hybrid.php"),
    );

  const methods = new Set<string>();
  const resourceTypes = new Set<string>();
  const sampleEndpointShapes: string[] = [];

  for (const entry of resources) {
    methods.add(entry.initiatorType || "unknown");

    const url = new URL(entry.name);
    const path = url.pathname;
    if (path.endsWith(".xml")) {
      resourceTypes.add("xml");
    } else if (path.endsWith(".opf")) {
      resourceTypes.add("opf");
    } else if (path.endsWith(".xhtml")) {
      resourceTypes.add("xhtml");
    } else if (path.endsWith(".json")) {
      resourceTypes.add("json");
    } else if (/\.(jpg|jpeg|png|webp)$/i.test(path)) {
      resourceTypes.add("image");
    } else if (path.endsWith(".css")) {
      resourceTypes.add("css");
    } else {
      resourceTypes.add("other");
    }

    const shape = toUrlShape(entry.name);
    if (!sampleEndpointShapes.includes(shape)) {
      sampleEndpointShapes.push(shape);
    }
  }

  return {
    methods: Array.from(methods).sort(),
    resourceTypes: Array.from(resourceTypes).sort(),
    sampleEndpointShapes: sampleEndpointShapes.slice(0, 12),
  };
}

function parseOpf(opfText: string): AnalysisSummary["opf"] {
  const doc = parseXml(opfText, "OPF");
  const manifestItems = Array.from(doc.getElementsByTagName("item"));
  const spineItems = Array.from(doc.getElementsByTagName("itemref"));
  const mediaTypeCounts: Record<string, number> = {};

  for (const item of manifestItems) {
    const mediaType = item.getAttribute("media-type") ?? "unknown";
    mediaTypeCounts[mediaType] = (mediaTypeCounts[mediaType] ?? 0) + 1;
  }

  const navItem = manifestItems.find((item) =>
    (item.getAttribute("properties") ?? "").includes("nav"),
  );

  return {
    manifestCount: manifestItems.length,
    mediaTypeCounts,
    navItemHref: navItem?.getAttribute("href") ?? null,
    rootfilePath: null,
    sampleManifest: manifestItems.slice(0, 12).map((item) => ({
      href: item.getAttribute("href") ?? "",
      id: item.getAttribute("id") ?? "",
      mediaType: item.getAttribute("media-type") ?? "",
      properties: item.getAttribute("properties"),
    })),
    sampleSpine: spineItems
      .slice(0, 20)
      .map((item) => item.getAttribute("idref") ?? "")
      .filter(Boolean),
    spineCount: spineItems.length,
  };
}

function parseOpfManifest(opfText: string): OpfManifestItem[] {
  const doc = parseXml(opfText, "OPF");
  return Array.from(doc.getElementsByTagName("item"))
    .map((item) => ({
      href: item.getAttribute("href")?.trim() ?? "",
      id: item.getAttribute("id") ?? "",
      mediaType: item.getAttribute("media-type") ?? "",
      properties: item.getAttribute("properties"),
    }))
    .filter((item) => item.href.length > 0);
}

function parseOpfTitle(opfText: string): string | null {
  const doc = parseXml(opfText, "OPF");
  const title =
    doc.getElementsByTagName("dc:title")[0]?.textContent?.trim() ||
    Array.from(doc.getElementsByTagName("title"))
      .find((item) => item.namespaceURI === "http://purl.org/dc/elements/1.1/")
      ?.textContent?.trim() ||
    null;
  return title && title.length > 0 ? title : null;
}

async function loadPackageIndex(): Promise<PackageIndex> {
  const readerUrl = new URL(location.href);
  const initialToken = requireSearchParam("t");
  const contentId = requireSearchParam("c");

  const viewerTokenUrl = `${readerUrl.origin}/api/v1/tokens/viewer?content_id=${encodeURIComponent(contentId)}`;
  const viewerTokenResult = await fetchJson<TokenResponse>(viewerTokenUrl, initialToken);
  assertOk(viewerTokenResult.status, "viewer token exchange");

  const viewerToken = viewerTokenResult.json.token?.trim();
  if (!viewerToken) {
    throw new Error("Viewer token exchange did not return a token");
  }

  const metaUrl = `${readerUrl.origin}/api/v1/contents/${encodeURIComponent(contentId)}/meta`;
  const metaResult = await fetchJson<MetaResponse>(metaUrl, viewerToken);
  assertOk(metaResult.status, "content metadata");

  const baseUrl = metaResult.json.content?.baseUrl?.trim() ?? null;
  if (!baseUrl) {
    throw new Error("Content metadata did not provide a baseUrl");
  }

  const containerUrl = `${baseUrl}/META-INF/container.xml`;
  const containerResult = await fetchText(containerUrl, viewerToken);
  assertOk(containerResult.status, "container.xml");

  const containerDoc = parseXml(containerResult.text, "container.xml");
  const rootfilePath =
    containerDoc.querySelector("rootfile")?.getAttribute("full-path")?.trim() ?? null;
  if (!rootfilePath) {
    throw new Error("container.xml did not contain a rootfile path");
  }

  const opfUrl = `${baseUrl}/${rootfilePath}`;
  const opfResult = await fetchText(opfUrl, viewerToken);
  assertOk(opfResult.status, "opf package document");

  return {
    baseUrl,
    containerText: containerResult.text,
    contentId,
    manifestItems: parseOpfManifest(opfResult.text),
    meta: metaResult.json,
    opfText: opfResult.text,
    packageTitle: parseOpfTitle(opfResult.text),
    readerTitle: document.title,
    rootfilePath,
    viewerToken,
  };
}

async function analyzeLegacyReader(
  readerUrl: URL,
  entry: LegacyReaderEntry,
): Promise<AnalysisSummary> {
  const faceResult = await fetchText(entry.faceXmlUrl);
  assertOk(faceResult.status, "legacy face.xml");

  const faceDoc = parseXml(faceResult.text, "legacy face.xml");
  const pageCount = queryNumber(faceDoc, "TotalPage");

  return {
    authFlow: {
      contentId: entry.param.slice(0, 16),
      stages: [
        {
          details: "bsr4b_hybrid/diazepam_hybrid legacy reader",
          endpointShape:
            "/:accountOrWorkId/diazepam_hybrid.php?mode=7&file=face.xml&reqtype=0&vm=:vm&param=:param&time=:time",
          method: "GET",
          name: "legacy face.xml",
          status: faceResult.status,
        },
      ],
      viewerTokenIssued: false,
    },
    legacyReader: {
      apiUrlShape: toUrlShape(entry.apiUrl),
      contentFrame: {
        height: queryNumber(faceDoc, "ContentFrame > Height"),
        width: queryNumber(faceDoc, "ContentFrame > Width"),
      },
      faceXmlUrlShape: toUrlShape(entry.faceXmlUrl),
      pageCount,
      scramble: {
        height: queryNumber(faceDoc, "Scramble > Height"),
        width: queryNumber(faceDoc, "Scramble > Width"),
      },
    },
    meta: {
      baseUrl: null,
      colophon: {
        setContentIdQuery: false,
        setTokenQuery: false,
        size: getOptionalSearchParam("colophon_size") ?? undefined,
        type: undefined,
        url: getOptionalSearchParam("colophon") ?? undefined,
      },
      version: "bsr4b_hybrid",
    },
    observedRequests: collectObservedRequests(),
    opf: {
      manifestCount: 0,
      mediaTypeCounts: {},
      navItemHref: null,
      rootfilePath: null,
      sampleManifest: [],
      sampleSpine: [],
      spineCount: 0,
    },
    reader: {
      host: readerUrl.host,
      title: document.title,
      urlShape: `${readerUrl.pathname}?cgi=:apiUrl&file=:file&param=:param`,
    },
  };
}

async function loadLegacyFaceInfo(entry: LegacyReaderEntry): Promise<LegacyFaceInfo> {
  const faceResult = await fetchText(entry.faceXmlUrl);
  assertOk(faceResult.status, "legacy face.xml");
  const faceDoc = parseXml(faceResult.text, "legacy face.xml");

  return {
    contentHeight: requireXmlNumber(faceDoc, "ContentFrame > Height", "content height"),
    contentWidth: requireXmlNumber(faceDoc, "ContentFrame > Width", "content width"),
    pageCount: requireXmlNumber(faceDoc, "TotalPage", "page count"),
    scrambleHeight: requireXmlNumber(faceDoc, "Scramble > Height", "scramble height"),
    scrambleWidth: requireXmlNumber(faceDoc, "Scramble > Width", "scramble width"),
  };
}

function parseLegacyScrambleVector(pageDoc: XMLDocument): number[] {
  const scrambleText = queryText(pageDoc, "Scramble");
  if (!scrambleText) {
    throw new Error("Page XML did not contain a Scramble vector");
  }

  const values = scrambleText
    .split(",")
    .map((value) => Number.parseInt(value.trim(), 10))
    .filter((value) => Number.isFinite(value));
  if (values.length === 0) {
    throw new Error("Page XML Scramble vector is empty");
  }

  const vector = new Array<number>(values.length);
  values.forEach((value, index) => {
    vector[value] = index;
  });
  return vector;
}

async function blobToImage(blob: Blob): Promise<CanvasImageSource> {
  if ("createImageBitmap" in window) {
    try {
      return await createImageBitmap(blob);
    } catch {
      // Fall back to HTMLImageElement for image formats createImageBitmap rejects.
    }
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to decode legacy page image"));
    };
    image.src = url;
  });
}

async function canvasToPngBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("canvas.toBlob returned null"));
        return;
      }
      blob
        .arrayBuffer()
        .then((buffer) => resolve(new Uint8Array(buffer)))
        .catch(reject);
    }, "image/png");
  });
}

async function captureLegacyPage(
  entry: LegacyReaderEntry,
  faceInfo: LegacyFaceInfo,
  page: number,
): Promise<LegacyPageCapture> {
  const pageBaseName = String(page - 1).padStart(4, "0");
  const xmlUrl = buildLegacyResourceUrl(entry, "8", `${pageBaseName}.xml`);
  const binUrl = buildLegacyResourceUrl(entry, "1", `${pageBaseName}_0000.bin`);

  const [xmlResult, binResult] = await Promise.all([fetchText(xmlUrl), fetchBytes(binUrl)]);
  assertOk(xmlResult.status, `legacy page XML ${page}`);
  assertOk(binResult.status, `legacy page image ${page}`);

  const pageDoc = parseXml(xmlResult.text, `legacy page XML ${page}`);
  const vector = parseLegacyScrambleVector(pageDoc);
  const width = requireXmlNumber(pageDoc, "StepRect > Width", `page ${page} width`);
  const height = requireXmlNumber(pageDoc, "StepRect > Height", `page ${page} height`);

  const canvas = document.createElement("canvas");
  canvas.width = width || faceInfo.contentWidth;
  canvas.height = height || faceInfo.contentHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not create canvas 2D context");
  }

  const image = await blobToImage(new Blob([bytesToBlobPart(binResult.bytes)]));
  ctx.drawImage(image, 0, 0);

  const columns = faceInfo.scrambleWidth;
  const rows = faceInfo.scrambleHeight;
  const tileWidth = Math.trunc(canvas.width / (columns * 8)) * 8;
  const tileHeight = Math.trunc(canvas.height / (rows * 8)) * 8;
  if (tileWidth <= 0 || tileHeight <= 0) {
    throw new Error(`Invalid legacy tile size for page ${page}`);
  }

  for (const [sourceIndex, targetIndex] of vector.entries()) {
    if (targetIndex === undefined) {
      continue;
    }

    const sourceX = tileWidth * (sourceIndex % columns);
    const sourceY = tileHeight * Math.trunc(sourceIndex / columns);
    const targetX = tileWidth * (targetIndex % columns);
    const targetY = tileHeight * Math.trunc(targetIndex / columns);

    ctx.drawImage(
      image,
      sourceX,
      sourceY,
      tileWidth,
      tileHeight,
      targetX,
      targetY,
      tileWidth,
      tileHeight,
    );
  }

  if ("close" in image && typeof image.close === "function") {
    image.close();
  }

  return {
    bytes: await canvasToPngBytes(canvas),
    fileName: `${String(page).padStart(4, "0")}.png`,
    page,
  };
}

async function downloadLegacyImages(
  entry: LegacyReaderEntry,
  onProgress?: (message: string) => void,
): Promise<PackageDownloadSummary> {
  onProgress?.("loading face.xml...");
  const faceInfo = await loadLegacyFaceInfo(entry);
  const files: Record<string, Uint8Array> = {};
  const failedFiles: PackageDownloadSummary["failedFiles"] = [];

  for (let page = 1; page <= faceInfo.pageCount; page += 1) {
    onProgress?.(`capturing ${page}/${faceInfo.pageCount}`);
    try {
      const capture = await captureLegacyPage(entry, faceInfo, page);
      files[capture.fileName] = capture.bytes;
    } catch (error) {
      failedFiles.push({
        path: `${String(page).padStart(4, "0")}.png`,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (Object.keys(files).length === 0) {
    throw new Error("No legacy pages were captured");
  }

  onProgress?.("zipping...");
  const zipBytes = await zipFilesAsync(files);
  const zipName = `${sanitizeFileName(getPageTitle() || "honto-legacy-images")}.zip`;
  downloadBlob(new Blob([bytesToBlobPart(zipBytes)], { type: "application/zip" }), zipName);

  return {
    failedFiles,
    fileCount: Object.keys(files).length,
    zipName,
  };
}

async function analyzeReader(): Promise<AnalysisSummary> {
  const readerUrl = new URL(location.href);
  const legacyEntry = resolveLegacyReaderEntry(readerUrl);
  if (legacyEntry) {
    return analyzeLegacyReader(readerUrl, legacyEntry);
  }

  const initialToken = requireSearchParam("t");
  const contentId = requireSearchParam("c");
  const stages: AnalysisStage[] = [];

  const viewerTokenUrl = `${readerUrl.origin}/api/v1/tokens/viewer?content_id=${encodeURIComponent(contentId)}`;
  const viewerTokenResult = await fetchJson<TokenResponse>(viewerTokenUrl, initialToken);
  stages.push({
    endpointShape: "/api/v1/tokens/viewer?content_id=:contentId",
    method: "GET",
    name: "viewer token exchange",
    status: viewerTokenResult.status,
  });

  const viewerToken = viewerTokenResult.json.token?.trim();
  if (!viewerToken) {
    throw new Error("Viewer token exchange did not return a token");
  }

  const metaUrl = `${readerUrl.origin}/api/v1/contents/${encodeURIComponent(contentId)}/meta`;
  const metaResult = await fetchJson<MetaResponse>(metaUrl, viewerToken);
  stages.push({
    endpointShape: "/api/v1/contents/:contentId/meta",
    method: "GET",
    name: "content metadata",
    status: metaResult.status,
  });

  const baseUrl = metaResult.json.content?.baseUrl?.trim() ?? null;
  if (!baseUrl) {
    throw new Error("Content metadata did not provide a baseUrl");
  }

  const containerUrl = `${baseUrl}/META-INF/container.xml`;
  const containerResult = await fetchText(containerUrl, viewerToken);
  stages.push({
    endpointShape: "/api/v1/contents/:contentId/files/:packageId/META-INF/container.xml",
    method: "GET",
    name: "container.xml",
    status: containerResult.status,
  });

  const containerDoc = parseXml(containerResult.text, "container.xml");
  const rootfilePath =
    containerDoc.querySelector("rootfile")?.getAttribute("full-path")?.trim() ?? null;
  if (!rootfilePath) {
    throw new Error("container.xml did not contain a rootfile path");
  }

  const opfUrl = `${baseUrl}/${rootfilePath}`;
  const opfResult = await fetchText(opfUrl, viewerToken);
  stages.push({
    details: rootfilePath,
    endpointShape: "/api/v1/contents/:contentId/files/:packageId/:rootfilePath",
    method: "GET",
    name: "opf package document",
    status: opfResult.status,
  });

  const opf = parseOpf(opfResult.text);
  opf.rootfilePath = rootfilePath;

  return {
    authFlow: {
      contentId,
      stages,
      viewerTokenIssued: true,
    },
    meta: {
      baseUrl: baseUrl.replace(/\/files\/[^/]+$/, "/files/:packageId"),
      colophon: metaResult.json.colophon ?? null,
      version: metaResult.json.version ?? null,
    },
    observedRequests: collectObservedRequests(),
    opf,
    reader: {
      host: readerUrl.host,
      title: document.title,
      urlShape: `${readerUrl.pathname}?t=:initialToken&c=:contentId&p=:readerParams`,
    },
  };
}

async function zipFilesAsync(files: Record<string, Uint8Array>): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    // EPUB requires the first `mimetype` entry to be stored without compression.
    // Using level 0 for the whole archive keeps this invariant simple and valid.
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
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
}

function getPageTitle(): string | null {
  const title = document.title.trim();
  return title.length > 0 ? title : null;
}

function sanitizeFileName(value: string): string {
  const sanitized = value
    .replace(/[\\/:*?"<>|]+/g, "_")
    .replace(/\s+/g, " ")
    .trim();
  return sanitized || "honto-package";
}

async function downloadPackage(
  onProgress?: (message: string) => void,
): Promise<PackageDownloadSummary> {
  const legacyEntry = resolveLegacyReaderEntry(new URL(location.href));
  if (legacyEntry) {
    return downloadLegacyImages(legacyEntry, onProgress);
  }

  const packageIndex = await loadPackageIndex();
  const opfDir = packageDir(packageIndex.rootfilePath);
  const files: Record<string, Uint8Array> = {
    mimetype: new TextEncoder().encode(EPUB_MEDIA_TYPE),
    "META-INF/container.xml": new TextEncoder().encode(packageIndex.containerText),
    [normalizePackagePath(packageIndex.rootfilePath)]: new TextEncoder().encode(
      packageIndex.opfText,
    ),
  };
  const failedFiles: PackageDownloadSummary["failedFiles"] = [];

  for (const [index, item] of packageIndex.manifestItems.entries()) {
    const packagePath = joinPackagePath(opfDir, item.href);
    if (!packagePath || files[packagePath]) {
      continue;
    }

    onProgress?.(`fetching ${index + 1}/${packageIndex.manifestItems.length}: ${packagePath}`);
    try {
      const result = await fetchBytes(
        `${packageIndex.baseUrl}/${packagePath}`,
        packageIndex.viewerToken,
      );
      assertOk(result.status, packagePath);
      files[packagePath] = decodeClipStudioImageResource(item, packagePath, result.bytes);
    } catch (error) {
      failedFiles.push({
        path: packagePath,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  onProgress?.("zipping...");
  const zipBytes = await zipFilesAsync(files);
  const zipName = `${sanitizeFileName(
    packageIndex.packageTitle || packageIndex.readerTitle || packageIndex.contentId,
  )}.epub`;
  downloadBlob(new Blob([bytesToBlobPart(zipBytes)], { type: EPUB_MIME }), zipName);

  return {
    failedFiles,
    fileCount: Object.keys(files).length,
    zipName,
  };
}

function createButton(label: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.textContent = label;
  button.style.cssText = [
    "padding: 6px 10px",
    "border: 0",
    "border-radius: 6px",
    "background: #7fd6ff",
    "color: #0d1b24",
    "font-weight: 700",
    "cursor: pointer",
  ].join(";");
  return button;
}

function createOutput(): HTMLTextAreaElement {
  const output = document.createElement("textarea");
  output.readOnly = true;
  output.wrap = "off";
  output.spellcheck = false;
  output.style.cssText = [
    "width: 100%",
    "min-height: 220px",
    "resize: vertical",
    "padding: 8px",
    "border: 1px solid rgba(255,255,255,0.18)",
    "border-radius: 8px",
    "background: rgba(6,10,14,0.82)",
    "color: #d7e4ef",
    "font: 12px/1.45 ui-monospace, SFMono-Regular, Consolas, monospace",
  ].join(";");
  return output;
}

function createPanel(): PanelRefs {
  const panel = document.createElement("div");
  panel.id = PANEL_ID;
  panel.style.cssText = [
    "position: fixed",
    "top: 12px",
    "right: 12px",
    "z-index: 2147483647",
    "display: flex",
    "flex-direction: column",
    "gap: 8px",
    "width: min(620px, calc(100vw - 24px))",
    "padding: 10px",
    "border-radius: 10px",
    "background: rgba(16,18,22,0.88)",
    "backdrop-filter: blur(8px)",
    "box-shadow: 0 8px 24px rgba(0,0,0,0.35)",
    "color: #fff",
    "font: 12px/1.4 system-ui, sans-serif",
  ].join(";");

  const title = document.createElement("strong");
  title.textContent = "Honto Clip Studio EPUB Downloader";

  const controls = document.createElement("div");
  controls.style.cssText = [
    "display: flex",
    "align-items: center",
    "gap: 8px",
    "flex-wrap: wrap",
  ].join(";");

  const analyzeButton = createButton("analyze");
  const downloadButton = createButton("download epub");
  const status = document.createElement("span");
  status.textContent = "ready";
  status.style.opacity = "0.85";

  const output = createOutput();
  output.value = [
    "Reader probe and OPF package downloader.",
    "Collects auth stage info, endpoint shapes, resource types, and OPF stats.",
    "Downloads the OPF manifest resources as an EPUB archive.",
  ].join("\n");

  controls.append(analyzeButton, downloadButton, status);
  panel.append(title, controls, output);
  return { analyzeButton, downloadButton, output, panel, status };
}

function mountPanel(): void {
  if (document.getElementById(PANEL_ID) || !document.body) {
    return;
  }

  const refs = createPanel();
  refs.analyzeButton.onclick = async () => {
    refs.analyzeButton.disabled = true;
    refs.status.textContent = "analyzing...";

    try {
      const report = await analyzeReader();
      refs.output.value = JSON.stringify(report, null, 2);
      refs.status.textContent = "analysis complete";
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      refs.output.value = message;
      refs.status.textContent = "analysis failed";
      console.error(error);
    } finally {
      refs.analyzeButton.disabled = false;
    }
  };

  refs.downloadButton.onclick = async () => {
    refs.downloadButton.disabled = true;
    refs.status.textContent = "preparing package...";

    try {
      const summary = await downloadPackage((message) => {
        refs.status.textContent = message;
      });
      refs.output.value = JSON.stringify(summary, null, 2);
      refs.status.textContent = `saved ${summary.zipName}`;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      refs.output.value = message;
      refs.status.textContent = "download failed";
      console.error(error);
    } finally {
      refs.downloadButton.disabled = false;
    }
  };

  document.body.appendChild(refs.panel);
}

function init(): void {
  window.__hontoClipStudioEpubDownloader__ = {
    analyze: analyzeReader,
    downloadPackage,
  };

  if (document.body) {
    mountPanel();
    return;
  }

  const timer = window.setInterval(() => {
    if (!document.body) {
      return;
    }
    window.clearInterval(timer);
    mountPanel();
  }, 120);

  log("initialized");
}

init();
