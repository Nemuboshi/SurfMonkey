import { Zip, ZipPassThrough } from "fflate";
import { saveAs } from "file-saver";

/**
 * Reimplementation notes (from original speedbinb.js behavior):
 * 1) Call `bibGetCntntInfo.php` with cid/k/dmytime to obtain:
 *    - `p` token, `ViewMode`, `ContentsServer`
 *    - scramble control tables: `stbl/ttbl/ctbl/ptbl`
 * 2) Call content endpoint (`sbcGetCntnt.php` or server-type variant) with cid/p/vm/dmytime.
 *    The JSON payload includes `ttx`, and `ttx` contains page image paths.
 * 3) Call image endpoint (`sbcGetImg.php` or server-type variant) for each page path.
 *    Returned image is scrambled; descramble is reconstructed from control tables and page path.
 *
 * `q` parameter behavior mirrors original:
 * - `singlequality` may omit `q` (unless force flag is enabled)
 * - otherwise low/high quality maps to q=1/q=0 for SBC path
 *
 * Symbol mapping for traceability (legacy -> current):
 * - Legacy reader wrapper/object -> `BinbReader`
 * - Legacy Type-A engine -> `TypeAEngine` (legacy members `Tt/Pt/At/Ct` kept)
 * - Legacy Type-S engine -> `TypeSEngine` (legacy members `T/j/Dt/Rt/Ft/Lt/Nt/kt` kept)
 * - Legacy identity/no-scramble branch -> `IdentityEngine`
 * - Legacy image URL builder branch -> `BinbReader.getImageUrl`
 * - Legacy descramble coordinate builder -> `BinbReader.getImageDescrambleCoords`
 * - Legacy page-path-based table selector -> `BinbReader.pickEngine`
 */
type ServerType = "sbc" | "direct" | "rest";

type ScrambleCoord = {
  xsrc: number;
  ysrc: number;
  width: number;
  height: number;
  xdest: number;
  ydest: number;
};

type DescrambleCoords = {
  width: number;
  height: number;
  transfers: Array<{ index: number; coords: ScrambleCoord[] }>;
};

type ParsedCntntInfo = {
  sbcurl: string;
  servertype: ServerType;
  viewmode: number;
  token: string;
  stbl: number[];
  ttbl: number[];
  ctbl: string[];
  ptbl: string[];
  contentDate: string;
  totalCount: number | null;
  title: string;
  extraQuery: Record<string, string>;
};

type ParsedContent = {
  ttx: string;
  imageClass: string;
};

type TtxImage = {
  id: string;
  src: string;
  orgwidth: number;
  orgheight: number;
};

type ReaderConfig = {
  useHighQualityImage: boolean;
  forceQualityParameterRequest: boolean;
};

type JsonRecord = Record<string, unknown>;

const CONFIG: ReaderConfig = {
  // Default to low quality to match common reader fallback behavior.
  useHighQualityImage: false,
  // Keep false to preserve "singlequality omits q" behavior from original code.
  forceQualityParameterRequest: false,
};

// Known extra auth/context keys seen on BinB URLs; forward them as-is.
const U_KEYS = ["u0", "u1", "u2", "u3", "u4", "u5", "u6", "u7", "u8", "u9"];
const REQUEST_TIMEOUT_MS = 30000;

declare global {
  interface Window {
    __mosaiComAntiLoaded__?: boolean;
  }
}

type GMXhrDetails = {
  method: string;
  url: string;
  responseType?: "text" | "arraybuffer";
  withCredentials?: boolean;
  anonymous?: boolean;
  timeout?: number;
  onload?: (response: GMXhrResponse) => void;
  onerror?: (error: unknown) => void;
  ontimeout?: () => void;
};

type GMXhrResponse = {
  status: number;
  responseText?: string;
  response?: ArrayBuffer | string;
};

declare const GM_xmlhttpRequest: ((details: GMXhrDetails) => void) | undefined;

function log(...args: unknown[]): void {
  console.log("[MosaiComAnti]", ...args);
}

function fail(message: string): never {
  throw new Error(message);
}

function ensureObjectRecord(value: unknown, label: string): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(label);
  }
  return value as JsonRecord;
}

function parseJsonLike(text: string): JsonRecord {
  try {
    const parsed = JSON.parse(text);
    return ensureObjectRecord(parsed, "Invalid JSON response object.");
  } catch {
    // Some endpoints may reply with JSONP wrapper: callback({...});
    const m = text.match(/^[A-Za-z0-9_-]+\(([\s\S]*)\)\s*;?\s*$/);
    if (!m) {
      fail("Invalid JSON/JSONP response.");
    }
    const parsed = JSON.parse(m[1] ?? "{}");
    return ensureObjectRecord(parsed, "Invalid JSONP payload object.");
  }
}

function toArray<T>(value: unknown, mapper: (item: unknown) => T): T[] {
  if (!Array.isArray(value)) {
    fail("Scramble table is not an array.");
  }
  return value.map(mapper);
}

function toFiniteNumberArray(value: unknown, label: string): number[] {
  const arr = toArray(value, (item) => Number(item));
  if (arr.some((n) => !Number.isFinite(n))) {
    fail(`${label} contains non-numeric values.`);
  }
  return arr;
}

function getRandomString(length: number): string {
  // Keep alnum-only to match k-generation constraints from original implementation.
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  const cryptoObj = globalThis.crypto;
  if (cryptoObj?.getRandomValues) {
    const buf = new Uint8Array(length);
    cryptoObj.getRandomValues(buf);
    for (let i = 0; i < length; i += 1) {
      out += alphabet[buf[i] % alphabet.length] ?? "A";
    }
    return out;
  }
  for (let i = 0; i < length; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)] ?? "A";
  }
  return out;
}

function buildK(cid: string): string {
  // `k` is accepted from URL if present, otherwise computed here.
  // This is the same xor-and-mix style token generation used by the old reader JS.
  const n = getRandomString(16);
  const i = cid.repeat(Math.ceil(16 / cid.length) + 1);
  const r = i.slice(0, 16);
  const e = i.slice(-16);
  // Magic alphabet includes '-' and '_' to produce URL-safe symbols.
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  let s = 0;
  let h = 0;
  let u = 0;
  let out = "";
  for (let idx = 0; idx < 16; idx += 1) {
    s ^= n.charCodeAt(idx);
    h ^= r.charCodeAt(idx);
    u ^= e.charCodeAt(idx);
    out += `${n[idx]}${alphabet[(s + h + u) & 63] ?? "A"}`;
  }
  return out;
}

function decodeJt(cid: string, k: string, payload: string): unknown {
  // Table payloads are obfuscated in printable ASCII range.
  // Constants are preserved from legacy JS to keep decoding binary-compatible.
  const seedSrc = `${cid}:${k}`;
  let e = 0;
  for (let idx = 0; idx < seedSrc.length; idx += 1) {
    e += seedSrc.charCodeAt(idx) << (idx % 16);
  }
  e &= 2147483647; // 0x7fffffff
  if (e === 0) {
    e = 305419896; // 0x12345678 fallback seed
  }
  let u = e;
  let out = "";
  for (let idx = 0; idx < payload.length; idx += 1) {
    u = (u >>> 1) ^ (1210056708 & -(u & 1)); // 1210056708 == 0x48200004
    const ch = ((((payload.charCodeAt(idx) - 32 + u) % 94) + 94) % 94) + 32;
    out += String.fromCharCode(ch);
  }
  return JSON.parse(out);
}

function pickFirst<T>(value: unknown, label: string): T {
  if (!Array.isArray(value) || value.length < 1 || !value[0] || typeof value[0] !== "object") {
    fail(`${label}: items[0] missing.`);
  }
  return value[0] as T;
}

function parsePositiveInt(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return null;
  }
  const i = Math.floor(n);
  return i > 0 ? i : null;
}

function extractTotalCount(item: JsonRecord, raw?: JsonRecord): number | null {
  // Different deployments expose different count fields; keep strict but multi-key lookup.
  const directKeys = [
    "TotalPage",
    "TotalPages",
    "PageCount",
    "TotalCount",
    "ImageCount",
    "MaxPage",
  ];
  for (const key of directKeys) {
    const got = parsePositiveInt(item[key]);
    if (got !== null) {
      return got;
    }
  }
  const nested = item.Contents ?? item.Content ?? item.Book ?? null;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    const nestedObj = nested as JsonRecord;
    for (const key of directKeys) {
      const got = parsePositiveInt(nestedObj[key]);
      if (got !== null) {
        return got;
      }
    }
  }
  if (raw) {
    const extraStrictKeys = ["Total", "Pages", "PageTotal", "TotalImageCount"];
    for (const key of extraStrictKeys) {
      const got = parsePositiveInt(raw[key]);
      if (got !== null) {
        return got;
      }
    }
  }
  return null;
}

function parseCntntInfo(
  raw: JsonRecord,
  cid: string,
  k: string,
  baseUrl: string,
  extraQuery: Record<string, string>,
): ParsedCntntInfo {
  // Strict mode: we only accept result=1; anything else is treated as a hard failure.
  const resultCode = Number(raw.result);
  if (resultCode !== 1) {
    fail(
      `bibGetCntntInfo failed: result=${String(raw.result ?? "")} eurl=${String(raw.eurl ?? "")}`,
    );
  }
  const item = pickFirst<JsonRecord>(raw.items, "bibGetCntntInfo");
  const contentsServer = String(item.ContentsServer ?? "");
  if (!contentsServer) {
    fail("ContentsServer missing.");
  }
  const sbcurl = new URL(contentsServer.replace(/\/?$/, "/"), baseUrl).toString();
  // Magic mapping from original protocol: 0=sbc, 1=direct, 2=rest.
  const serverTypeNum = Number(item.ServerType ?? 0);
  const servertype: ServerType =
    serverTypeNum === 1 ? "direct" : serverTypeNum === 2 ? "rest" : "sbc";
  const viewmode = Number(item.ViewMode);
  if (viewmode === -1 || !Number.isFinite(viewmode)) {
    fail(`Invalid ViewMode: ${String(item.ViewMode ?? "")}`);
  }
  // `p` is the content token required by sbcGetCntnt/sbcGetImg.
  const tokenRaw = item.p;
  const token = typeof tokenRaw === "string" ? tokenRaw : "null";
  const stblRaw = String(item.stbl ?? "");
  const ttblRaw = String(item.ttbl ?? "");
  const ctblRaw = String(item.ctbl ?? "");
  const ptblRaw = String(item.ptbl ?? "");
  // Descramble requires all tables; partial data is unusable.
  if (!stblRaw || !ttblRaw || !ctblRaw || !ptblRaw) {
    fail("Scramble table missing in cntntinfo result=1.");
  }
  const stbl = toFiniteNumberArray(decodeJt(cid, k, stblRaw), "stbl");
  const ttbl = toFiniteNumberArray(decodeJt(cid, k, ttblRaw), "ttbl");
  const ctbl = toArray(decodeJt(cid, k, ctblRaw), (v) => String(v));
  const ptbl = toArray(decodeJt(cid, k, ptblRaw), (v) => String(v));
  const contentDate = String(item.ContentDate ?? "");
  const totalCount = extractTotalCount(item, raw);
  const title = String(item.SubTitle ?? item.Title ?? "").trim();
  return {
    sbcurl,
    servertype,
    viewmode,
    token,
    stbl,
    ttbl,
    ctbl,
    ptbl,
    contentDate,
    totalCount,
    title,
    extraQuery,
  };
}

function parseContent(raw: JsonRecord): ParsedContent {
  const resultCode = Number(raw.result);
  if (resultCode !== 1) {
    fail(`sbcGetCntnt/content failed: result=${String(raw.result ?? "")}`);
  }
  const ttx = String(raw.ttx ?? "");
  if (!ttx) {
    fail("ttx missing.");
  }
  // `ImageClass=singlequality` affects whether `q` is included on image requests.
  const imageClass = String(raw.ImageClass ?? "");
  return { ttx, imageClass };
}

function attrsToObject(rawAttrs: string): Record<string, string> {
  const out: Record<string, string> = {};
  // Parse both quoted and unquoted attributes in ttx <t-img ...> nodes.
  const re = /([A-Za-z0-9_.:-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
  let m: RegExpExecArray | null;
  while (true) {
    m = re.exec(rawAttrs);
    if (!m) {
      break;
    }
    const key = m[1];
    const value = m[3] ?? m[4] ?? m[5] ?? "";
    out[key] = value;
  }
  return out;
}

function parseImagesFromTtx(ttx: string): TtxImage[] {
  // IMPORTANT:
  // `ttx` usually contains two rendering branches:
  // - <t-case ...> portrait branch (P000x)
  // - <t-nocase ...> landscape branch (L000x)
  // They commonly point to the same image sources. If we parse the whole document,
  // page count is doubled (e.g. 33 -> 66) and output contains duplicated P/L pages.
  // Therefore we only parse the first <t-case> block.
  const caseMatch = ttx.match(/<t-case\b[^>]*>([\s\S]*?)<\/t-case>/im);
  const parseTarget = caseMatch?.[1] ?? ttx;
  // ttx uses custom tags like <t-img ...>, but some variants use <img ...>.
  const re = /<(t-img|img)(\s+([^>]*?)|)\s*>/gim;
  const out: TtxImage[] = [];
  let m: RegExpExecArray | null;
  while (true) {
    m = re.exec(parseTarget);
    if (!m) {
      break;
    }
    const attrs = attrsToObject(m[2] ?? "");
    const src = attrs.src ?? "";
    const orgwidth = Number(attrs.orgwidth ?? "0");
    const orgheight = Number(attrs.orgheight ?? "0");
    const id = attrs.id ?? `img_${out.length + 1}`;
    if (
      !src ||
      !Number.isFinite(orgwidth) ||
      !Number.isFinite(orgheight) ||
      orgwidth <= 0 ||
      orgheight <= 0
    ) {
      continue;
    }
    out.push({ id, src, orgwidth, orgheight });
  }
  return out;
}

function resolveCntntInfoUrl(): URL {
  // Prefer in-page data-ptbinb when available (same source used by reader page),
  // fallback to relative bibGetCntntInfo.php.
  const ptbinb = document.querySelector<HTMLElement>("[data-ptbinb]");
  const dataPtbinb = ptbinb?.getAttribute("data-ptbinb");
  if (dataPtbinb) {
    const u = new URL(dataPtbinb, location.href);
    u.hash = "";
    if (!/bibGetCntntInfo/i.test(u.pathname)) {
      const p = u.pathname.replace(/\/+$/, "");
      u.pathname = `${p}/bibGetCntntInfo.php`;
    }
    return u;
  }
  return new URL("../bibGetCntntInfo.php", location.href);
}

function getCid(): string {
  const cid = new URLSearchParams(location.search).get("cid") ?? "";
  if (!cid) {
    fail("cid missing in query string.");
  }
  return cid;
}

function collectExtraQuery(sourceUrl: URL): Record<string, string> {
  const out: Record<string, string> = {};
  const locationQuery = new URLSearchParams(location.search);
  for (const [key, value] of sourceUrl.searchParams.entries()) {
    // These are explicitly rebuilt by this script; do not forward old values.
    if (key === "cid" || key === "k" || key === "dmytime") {
      continue;
    }
    out[key] = value;
  }
  for (const key of U_KEYS) {
    const value = sourceUrl.searchParams.get(key) ?? locationQuery.get(key);
    if (value !== null) {
      out[key] = value;
    }
  }
  return out;
}

function setQueryParams(url: URL, params: Record<string, string>): void {
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
}

async function gmRequest(
  url: URL,
  responseType: "text" | "blob",
  label: string,
): Promise<{ status: number; text?: string; blob?: Blob }> {
  // Use GM_xmlhttpRequest to bypass page-level fetch monkey patches and CORS limitations.
  if (typeof GM_xmlhttpRequest !== "function") {
    fail(`${label} failed: GM_xmlhttpRequest unavailable`);
  }
  const result = await new Promise<GMXhrResponse>((resolve, reject) => {
    GM_xmlhttpRequest({
      method: "GET",
      url: url.toString(),
      responseType: responseType === "blob" ? "arraybuffer" : "text",
      withCredentials: true,
      anonymous: false,
      timeout: REQUEST_TIMEOUT_MS,
      onload: (res) => resolve(res),
      onerror: (err) => reject(err),
      ontimeout: () => reject(new Error("timeout")),
    });
  });
  if (!(result.status >= 200 && result.status < 300)) {
    const preview = String(result.responseText ?? "")
      .slice(0, 240)
      .replace(/\s+/g, " ");
    fail(`${label} failed: HTTP ${result.status || 0} ${preview}`.trim());
  }
  if (responseType === "blob") {
    if (!(result.response instanceof ArrayBuffer)) {
      fail(`${label} failed: GM invalid arraybuffer`);
    }
    return { status: result.status, blob: new Blob([result.response]) };
  }
  return { status: result.status, text: result.responseText ?? String(result.response ?? "") };
}

function sortUrlQuery(url: URL): void {
  // Stable query ordering helps match stricter backends and simplifies debugging.
  const pairs = [...url.searchParams.entries()].sort(([a], [b]) => a.localeCompare(b));
  url.search = "";
  for (const [key, value] of pairs) {
    url.searchParams.append(key, value);
  }
}

function assignSortedEncodedQuery(url: URL): void {
  // Keep legacy-style encoding path for REST endpoints to avoid subtle server differences.
  url.search = [...url.searchParams.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
}

async function fetchText(url: URL, label: string): Promise<string> {
  const gm = await gmRequest(url, "text", label);
  return gm.text ?? "";
}

async function fetchBlob(url: URL, label: string): Promise<Blob> {
  const gm = await gmRequest(url, "blob", label);
  if (!gm.blob) {
    fail(`${label} failed: GM empty blob`);
  }
  return gm.blob;
}

interface ScrambleEngine {
  wt(): boolean;
  It(size: { width: number; height: number }): boolean;
  yt(size: { width: number; height: number }): { width: number; height: number };
  Ot(size: { width: number; height: number }): ScrambleCoord[] | null;
}

class IdentityEngine implements ScrambleEngine {
  wt(): boolean {
    return true;
  }
  It(_size: { width: number; height: number }): boolean {
    return false;
  }
  yt(size: { width: number; height: number }): { width: number; height: number } {
    return size;
  }
  Ot(size: { width: number; height: number }): ScrambleCoord[] {
    return [fullImageCoord(size.width, size.height)];
  }
}

function fullImageCoord(width: number, height: number): ScrambleCoord {
  return { xsrc: 0, ysrc: 0, width, height, xdest: 0, ydest: 0 };
}

class TypeAEngine implements ScrambleEngine {
  /**
   * Provenance:
   * - Ported from original speedbinb.js "Type-A" scramble branch.
   * - Internal field names keep legacy shape:
   *   - Tt/Pt: parsed source/target piece tables from original code.
   *   - At/Ct: helper methods preserved by name for traceability.
   * Modification policy:
   * - Arithmetic and branching are intentionally unchanged.
   * - Only TypeScript typing, formatting, and comments were added.
   */
  private readonly Tt: {
    ndx: number;
    ndy: number;
    piece: Array<{ x: number; y: number; w: number; h: number }>;
  } | null;
  private readonly Pt: {
    ndx: number;
    ndy: number;
    piece: Array<{ x: number; y: number; w: number; h: number }>;
  } | null;

  constructor(t: string, i: string) {
    this.Tt = null;
    this.Pt = null;
    const n = this.Ct(t);
    const r = this.Ct(i);
    if (n && r && n.ndx === r.ndx && n.ndy === r.ndy) {
      this.Tt = n;
      this.Pt = r;
    }
  }

  wt(): boolean {
    return this.Tt !== null && this.Pt !== null;
  }

  It(size: { width: number; height: number }): boolean {
    return size.width >= 64 && size.height >= 64 && size.width * size.height >= 102400;
  }

  yt(size: { width: number; height: number }): { width: number; height: number } {
    return size;
  }

  Ot(size: { width: number; height: number }): ScrambleCoord[] | null {
    if (!this.wt() || !this.Tt || !this.Pt) {
      return null;
    }
    if (!this.It(size)) {
      return [{ xsrc: 0, ysrc: 0, width: size.width, height: size.height, xdest: 0, ydest: 0 }];
    }
    const out: ScrambleCoord[] = [];
    const n = size.width - (size.width % 8);
    const r = Math.floor((n - 1) / 7) - (Math.floor((n - 1) / 7) % 8);
    const e = n - 7 * r;
    const s = size.height - (size.height % 8);
    const h = Math.floor((s - 1) / 7) - (Math.floor((s - 1) / 7) % 8);
    const u = s - 7 * h;
    for (let idx = 0; idx < this.Tt.piece.length; idx += 1) {
      const f = this.Tt.piece[idx];
      const c = this.Pt.piece[idx];
      out.push({
        xsrc: Math.floor(f.x / 2) * r + (f.x % 2) * e,
        ysrc: Math.floor(f.y / 2) * h + (f.y % 2) * u,
        width: Math.floor(f.w / 2) * r + (f.w % 2) * e,
        height: Math.floor(f.h / 2) * h + (f.h % 2) * u,
        xdest: Math.floor(c.x / 2) * r + (c.x % 2) * e,
        ydest: Math.floor(c.y / 2) * h + (c.y % 2) * u,
      });
    }
    const l = r * (this.Tt.ndx - 1) + e;
    const v = h * (this.Tt.ndy - 1) + u;
    if (l < size.width) {
      out.push({
        xsrc: l,
        ysrc: 0,
        width: size.width - l,
        height: v,
        xdest: l,
        ydest: 0,
      });
    }
    if (v < size.height) {
      out.push({
        xsrc: 0,
        ysrc: v,
        width: size.width,
        height: size.height - v,
        xdest: 0,
        ydest: v,
      });
    }
    return out;
  }

  private At(ch: string): number {
    let i = 0;
    let n = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".indexOf(ch);
    if (n < 0) {
      n = "abcdefghijklmnopqrstuvwxyz".indexOf(ch);
    } else {
      i = 1;
    }
    return i + 2 * n;
  }

  private Ct(raw: string): {
    ndx: number;
    ndy: number;
    piece: Array<{ x: number; y: number; w: number; h: number }>;
  } | null {
    if (!raw) {
      return null;
    }
    const seg = raw.split("-");
    if (seg.length !== 3) {
      return null;
    }
    const n = Number(seg[0]);
    const r = Number(seg[1]);
    const e = seg[2] ?? "";
    if (!Number.isFinite(n) || !Number.isFinite(r) || e.length !== n * r * 2) {
      return null;
    }
    // Piece classification thresholds come from legacy Type-A table layout.
    const a = (n - 1) * (r - 1) - 1;
    const f = n - 1 + a;
    const c = r - 1 + f;
    const l = 1 + c;
    const piece: Array<{ x: number; y: number; w: number; h: number }> = [];
    for (let d = 0; d < n * r; d += 1) {
      const x = this.At(e.charAt(2 * d));
      const y = this.At(e.charAt(2 * d + 1));
      let w = 1;
      let h = 1;
      if (d <= a) {
        w = 2;
        h = 2;
      } else if (d <= f) {
        w = 2;
        h = 1;
      } else if (d <= c) {
        w = 1;
        h = 2;
      } else if (d <= l) {
        w = 1;
        h = 1;
      }
      piece.push({ x, y, w, h });
    }
    return { ndx: n, ndy: r, piece };
  }
}

class TypeSEngine implements ScrambleEngine {
  /**
   * Provenance:
   * - Ported from original speedbinb.js "Type-S" scramble branch ("=<T>-<J><+|-><Dt>-<encoded>").
   * - Legacy members are preserved for mapping back to minified code:
   *   - T, j, Dt, Rt, Ft, Lt, Nt, kt
   *   - Ct/decodeChar helpers
   * Modification policy:
   * - Tile mapping and coordinate math are unchanged.
   * - Only guard readability, type annotations, and comments were added.
   */
  private readonly T: number;
  private readonly j: number;
  private readonly Dt: number;
  private readonly Rt: number[];
  private readonly Ft: number[];
  private readonly Lt: number[];
  private readonly Nt: number[];
  private readonly kt: number[] | null;

  constructor(t: string, i: string) {
    this.T = 0;
    this.j = 0;
    this.Dt = 0;
    this.Rt = [];
    this.Ft = [];
    this.Lt = [];
    this.Nt = [];
    this.kt = null;

    // Type-S table format: =<T>-<J><+|-><Dt>-<encoded> (same regex rule as legacy JS).
    const n = t.match(/^=([0-9]+)-([0-9]+)([-+])([0-9]+)-([-_0-9A-Za-z]+)$/);
    const r = i.match(/^=([0-9]+)-([0-9]+)([-+])([0-9]+)-([-_0-9A-Za-z]+)$/);
    if (
      !n ||
      !r ||
      n[1] !== r[1] ||
      n[2] !== r[2] ||
      n[4] !== r[4] ||
      n[3] !== "+" ||
      r[3] !== "-"
    ) {
      return;
    }
    this.T = Number(n[1]);
    this.j = Number(n[2]);
    this.Dt = Number(n[4]);
    // Legacy reader hard-limits grid size to 8x8 (64 tiles max).
    if (this.T > 8 || this.j > 8 || this.T * this.j > 64) {
      return;
    }
    const need = this.T + this.j + this.T * this.j;
    if (n[5].length !== need || r[5].length !== need) {
      return;
    }
    const s = this.Ct(n[5]);
    const h = this.Ct(r[5]);
    this.Rt.push(...s.n);
    this.Ft.push(...s.t);
    this.Lt.push(...h.n);
    this.Nt.push(...h.t);
    const mapped: number[] = [];
    for (let u = 0; u < this.T * this.j; u += 1) {
      mapped.push(s.p[h.p[u]]);
    }
    (this as { kt: number[] | null }).kt = mapped;
  }

  wt(): boolean {
    return this.kt !== null;
  }

  It(size: { width: number; height: number }): boolean {
    const i = 2 * this.T * this.Dt;
    const n = 2 * this.j * this.Dt;
    return (
      size.width >= 64 + i &&
      size.height >= 64 + n &&
      size.width * size.height >= (320 + i) * (320 + n)
    );
  }

  yt(size: { width: number; height: number }): { width: number; height: number } {
    if (!this.It(size)) {
      return size;
    }
    return {
      width: size.width - 2 * this.T * this.Dt,
      height: size.height - 2 * this.j * this.Dt,
    };
  }

  Ot(size: { width: number; height: number }): ScrambleCoord[] | null {
    if (!this.wt() || !this.kt) {
      return null;
    }
    if (!this.It(size)) {
      return [{ xsrc: 0, ysrc: 0, width: size.width, height: size.height, xdest: 0, ydest: 0 }];
    }
    const i = size.width - 2 * this.T * this.Dt;
    const n = size.height - 2 * this.j * this.Dt;
    const r = Math.floor((i + this.T - 1) / this.T);
    const e = i - (this.T - 1) * r;
    const s = Math.floor((n + this.j - 1) / this.j);
    const h = n - (this.j - 1) * s;
    const out: ScrambleCoord[] = [];
    for (let o = 0; o < this.T * this.j; o += 1) {
      const a = o % this.T;
      const f = Math.floor(o / this.T);
      const c = this.Dt + a * (r + 2 * this.Dt) + (this.Lt[f] < a ? e - r : 0);
      const l = this.Dt + f * (s + 2 * this.Dt) + (this.Nt[a] < f ? h - s : 0);
      const v = this.kt[o] % this.T;
      const d = Math.floor(this.kt[o] / this.T);
      const b = v * r + (this.Rt[d] < v ? e - r : 0);
      const g = d * s + (this.Ft[v] < d ? h - s : 0);
      const width = this.Lt[f] === a ? e : r;
      const height = this.Nt[a] === f ? h : s;
      if (i > 0 && n > 0) {
        out.push({
          xsrc: c,
          ysrc: l,
          width,
          height,
          xdest: b,
          ydest: g,
        });
      }
    }
    return out;
  }

  private decodeChar(ch: string): number {
    // URL-safe base64-like alphabet used in table payloads.
    const code = ch.charCodeAt(0);
    if (code >= 65 && code <= 90) {
      return code - 65;
    }
    if (code >= 97 && code <= 122) {
      return code - 97 + 26;
    }
    if (code >= 48 && code <= 57) {
      return code - 48 + 52;
    }
    if (ch === "-") {
      return 62;
    }
    if (ch === "_") {
      return 63;
    }
    return -1;
  }

  private Ct(raw: string): { t: number[]; n: number[]; p: number[] } {
    const t: number[] = [];
    const n: number[] = [];
    const p: number[] = [];
    for (let i = 0; i < this.T; i += 1) {
      t.push(this.decodeChar(raw.charAt(i)));
    }
    for (let i = 0; i < this.j; i += 1) {
      n.push(this.decodeChar(raw.charAt(this.T + i)));
    }
    for (let i = 0; i < this.T * this.j; i += 1) {
      p.push(this.decodeChar(raw.charAt(this.T + this.j + i)));
    }
    return { t, n, p };
  }
}

class BinbReader {
  private readonly cid: string;
  private readonly info: ParsedCntntInfo;
  private readonly content: ParsedContent;
  private readonly config: ReaderConfig;

  constructor(cid: string, info: ParsedCntntInfo, content: ParsedContent, config: ReaderConfig) {
    this.cid = cid;
    this.info = info;
    this.content = content;
    this.config = config;
  }

  getImageUrl(src: string): URL {
    const imageClass = this.content.imageClass;
    const isSingleQuality = imageClass === "singlequality";
    const q = this.config.useHighQualityImage ? "0" : "1";
    // ServerType 1: direct file layout, choose file suffix by quality policy.
    if (this.info.servertype === "direct") {
      const fileName = isSingleQuality
        ? "M.jpg"
        : this.config.useHighQualityImage
          ? "M_H.jpg"
          : "M_L.jpg";
      const base = new URL(`${src}/`, this.info.sbcurl);
      const u = new URL(fileName, base);
      if (this.info.contentDate) {
        u.searchParams.set("dmytime", this.info.contentDate);
      }
      return u;
    }
    // ServerType 2: REST path, optional q=1 for low quality when not singlequality/high.
    if (this.info.servertype === "rest") {
      const u = new URL(`img/${src}`, this.info.sbcurl);
      if (!(isSingleQuality || this.config.useHighQualityImage)) {
        u.searchParams.set("q", "1");
      }
      if (this.info.contentDate) {
        u.searchParams.set("dmytime", this.info.contentDate);
      }
      setQueryParams(u, this.info.extraQuery);
      assignSortedEncodedQuery(u);
      return u;
    }
    // Default ServerType 0: sbcGetImg.php API with cid/src/p/vm (+ optional q).
    const u = new URL("sbcGetImg.php", this.info.sbcurl);
    u.searchParams.set("cid", this.cid);
    u.searchParams.set("src", src);
    if (this.info.token) {
      u.searchParams.set("p", this.info.token);
    }
    // Match original behavior: singlequality may omit q unless force flag is enabled.
    if (!(isSingleQuality && !this.config.forceQualityParameterRequest)) {
      u.searchParams.set("q", q);
    }
    u.searchParams.set("vm", String(this.info.viewmode));
    if (this.info.contentDate) {
      u.searchParams.set("dmytime", this.info.contentDate);
    }
    setQueryParams(u, this.info.extraQuery);
    return u;
  }

  getImageDescrambleCoords(src: string, width: number, height: number): DescrambleCoords {
    const engine = this.pickEngine(src);
    const size = { width, height };
    if (!engine.wt()) {
      return {
        width,
        height,
        transfers: [{ index: 0, coords: [fullImageCoord(width, height)] }],
      };
    }
    const outSize = engine.yt(size);
    const coords = engine.Ot(size);
    if (!coords) {
      return {
        width,
        height,
        transfers: [{ index: 0, coords: [fullImageCoord(width, height)] }],
      };
    }
    return { width: outSize.width, height: outSize.height, transfers: [{ index: 0, coords }] };
  }

  private pickEngine(src: string): ScrambleEngine {
    // Page path hashes to [0..7] indexes for ptbl/ctbl selection in original implementation.
    // Provenance: same two-lane charCode accumulation as speedbinb.js (no behavior change).
    const idx = [0, 0];
    if (src) {
      const start = src.lastIndexOf("/") + 1;
      const len = src.length - start;
      for (let e = 0; e < len; e += 1) {
        idx[e % 2] += src.charCodeAt(start + e);
      }
      idx[0] %= 8;
      idx[1] %= 8;
    }
    const s = this.info.ptbl[idx[0]] ?? "";
    const h = this.info.ctbl[idx[1]] ?? "";
    if (h.startsWith("=") && s.startsWith("=")) {
      return new TypeSEngine(h, s);
    }
    if (/^[0-9]/.test(h) && /^[0-9]/.test(s)) {
      return new TypeAEngine(h, s);
    }
    return new IdentityEngine();
  }
}

async function blobToBitmap(blob: Blob): Promise<ImageBitmap> {
  return await createImageBitmap(blob);
}

async function drawDescrambled(bitmap: ImageBitmap, descramble: DescrambleCoords): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(descramble.width));
  canvas.height = Math.max(1, Math.floor(descramble.height));
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    fail("2D context unavailable.");
  }
  for (const transfer of descramble.transfers) {
    for (const c of transfer.coords) {
      ctx.drawImage(bitmap, c.xsrc, c.ysrc, c.width, c.height, c.xdest, c.ydest, c.width, c.height);
    }
  }
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

async function buildZipBlobStream(
  items: TtxImage[],
  from: number,
  reader: BinbReader,
  onProgress: (done: number, total: number) => void,
): Promise<Blob> {
  const chunks: Uint8Array[] = [];
  const doneZip = new Promise<Blob>((resolve, reject) => {
    const zip = new Zip((err, data, final) => {
      if (err) {
        reject(err);
        return;
      }
      chunks.push(data);
      if (final) {
        resolve(new Blob(chunks, { type: "application/zip" }));
      }
    });

    let done = 0;
    void runWithConcurrency(items, 4, async (img, index) => {
      // Concurrency=4 is a balance: enough throughput without overloading origin/CDN.
      const imageUrl = reader.getImageUrl(img.src);
      const blob = await fetchBlob(imageUrl, `Image fetch failed ${img.src}`);
      const bitmap = await blobToBitmap(blob);
      let outBlob: Blob;
      try {
        const descramble = reader.getImageDescrambleCoords(img.src, bitmap.width, bitmap.height);
        outBlob = await drawDescrambled(bitmap, descramble);
      } finally {
        // Release backing graphics memory eagerly during long range downloads.
        bitmap.close();
      }
      const buffer = await outBlob.arrayBuffer();
      const pageNo = from + index;
      const name = `${String(pageNo).padStart(4, "0")}_${sanitizeFileName(img.id || "page")}.png`;
      const entry = new ZipPassThrough(name);
      zip.add(entry);
      entry.push(new Uint8Array(buffer), true);
      done += 1;
      onProgress(done, items.length);
    })
      .then(() => zip.end())
      .catch((e) => {
        try {
          zip.terminate();
        } catch {
          // ignore
        }
        reject(e);
      });
  });
  return await doneZip;
}

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>,
): Promise<void> {
  let cursor = 0;
  const run = async (): Promise<void> => {
    while (true) {
      const idx = cursor;
      cursor += 1;
      if (idx >= items.length) {
        return;
      }
      await worker(items[idx], idx);
    }
  };
  const runners: Promise<void>[] = [];
  for (let i = 0; i < Math.max(1, concurrency); i += 1) {
    runners.push(run());
  }
  await Promise.all(runners);
}

type ReaderContext = {
  reader: BinbReader;
  images: TtxImage[];
  cid: string;
  totalCount: number;
  title: string;
};

type UIState = {
  root: HTMLDivElement;
  btn: HTMLButtonElement;
  status: HTMLSpanElement;
  inputFrom: HTMLInputElement;
  inputTo: HTMLInputElement;
};

function buildUi(endAll: number): UIState {
  const wrap = document.createElement("div");
  wrap.id = "__mca_panel";
  wrap.style.cssText = `
    position: fixed;
    top: 8px;
    right: 8px;
    z-index: 2147483647;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 6px;
    background: rgba(0,0,0,0.55);
    border-radius: 6px;
    color: #fff;
    font-size: 12px;
    pointer-events: auto;
    user-select: none;
    touch-action: manipulation;
    backdrop-filter: blur(4px);
  `;

  const label = document.createElement("span");
  label.textContent = "range";
  label.style.opacity = "0.9";

  const inputFrom = document.createElement("input");
  inputFrom.type = "number";
  inputFrom.min = "1";
  inputFrom.value = "1";
  inputFrom.style.cssText = `
    width: 64px;
    padding: 2px 4px;
    border-radius: 4px;
    border: 1px solid rgba(255,255,255,0.25);
    background: rgba(255,255,255,0.12);
    color: #fff;
    outline: none;
  `;

  const tilde = document.createElement("span");
  tilde.textContent = "~";
  tilde.style.opacity = "0.9";

  const inputTo = document.createElement("input");
  inputTo.type = "number";
  inputTo.min = "1";
  inputTo.value = String(endAll);
  inputTo.style.cssText = inputFrom.style.cssText;

  const btn = document.createElement("button");
  btn.textContent = "download";
  btn.style.cssText = `
    padding: 2px 8px;
    border-radius: 4px;
    border: 1px solid rgba(255,255,255,0.25);
    background: rgba(255,255,255,0.12);
    color: #fff;
    cursor: pointer;
    transition: background 0.15s ease, transform 0.05s ease;
  `;

  btn.onmouseenter = () => {
    btn.style.background = "rgba(255,255,255,0.22)";
  };
  btn.onmouseleave = () => {
    btn.style.background = "rgba(255,255,255,0.12)";
    btn.style.transform = "scale(1)";
  };
  btn.onmousedown = () => {
    btn.style.transform = "scale(0.97)";
  };
  btn.onmouseup = () => {
    btn.style.transform = "scale(1)";
  };

  const status = document.createElement("span");
  status.textContent = "Ready";
  status.style.cssText = `
    margin-left: 4px;
    opacity: 0.95;
    user-select: text;
    white-space: nowrap;
  `;

  const state: UIState = { root: wrap, btn, status, inputFrom, inputTo };
  btn.onclick = () => {
    void start(state);
  };

  wrap.append(label, inputFrom, tilde, inputTo, btn, status);
  return state;
}

async function buildReader(): Promise<ReaderContext> {
  const cid = getCid();
  const cntntInfoUrl = resolveCntntInfoUrl();
  const extraQuery = collectExtraQuery(cntntInfoUrl);
  // Respect inbound k when present; otherwise compute locally.
  const k = cntntInfoUrl.searchParams.get("k") ?? buildK(cid);
  cntntInfoUrl.searchParams.set("cid", cid);
  cntntInfoUrl.searchParams.set("k", k);
  cntntInfoUrl.searchParams.set("dmytime", Date.now().toString());
  setQueryParams(cntntInfoUrl, extraQuery);
  sortUrlQuery(cntntInfoUrl);
  const infoText = await fetchText(cntntInfoUrl, "bibGetCntntInfo");
  const infoRaw = parseJsonLike(infoText);
  const info = parseCntntInfo(infoRaw, cid, k, cntntInfoUrl.toString(), extraQuery);

  // Endpoint branch by server type, same as legacy speed reader.
  const contentUrl =
    info.servertype === "direct"
      ? new URL("content.js", info.sbcurl)
      : info.servertype === "rest"
        ? new URL("content", info.sbcurl)
        : new URL("sbcGetCntnt.php", info.sbcurl);

  if (info.servertype === "sbc") {
    // SBC content requires cid/p/vm and dmytime.
    contentUrl.searchParams.set("cid", cid);
    if (info.token) {
      contentUrl.searchParams.set("p", info.token);
    }
    contentUrl.searchParams.set("vm", String(info.viewmode));
    contentUrl.searchParams.set("dmytime", info.contentDate || Date.now().toString());
  } else if (info.servertype === "direct") {
    // Direct content.js still uses dmytime as cache-buster in many deployments.
    contentUrl.searchParams.set("dmytime", info.contentDate || Date.now().toString());
  } else if (info.contentDate) {
    contentUrl.searchParams.set("dmytime", info.contentDate);
  }
  setQueryParams(contentUrl, extraQuery);
  if (info.servertype === "rest") {
    assignSortedEncodedQuery(contentUrl);
  }

  const contentText = await fetchText(contentUrl, "content");
  const contentRaw = parseJsonLike(contentText);
  const content = parseContent(contentRaw);
  const images = parseImagesFromTtx(content.ttx);
  if (images.length === 0) {
    fail("No image entries found in ttx.");
  }
  const totalCount = info.totalCount && info.totalCount > 0 ? info.totalCount : images.length;
  return {
    reader: new BinbReader(cid, info, content, CONFIG),
    images,
    cid,
    totalCount,
    title: info.title,
  };
}

function sanitizeFileName(raw: string): string {
  return raw.replace(/[\\/:*?"<>|]+/g, "_");
}

function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

let cachedContextPromise: Promise<ReaderContext> | null = null;

async function getReaderContext(): Promise<ReaderContext> {
  if (!cachedContextPromise) {
    // Cache single in-flight load so preload and user click reuse the same request chain.
    cachedContextPromise = new Promise<ReaderContext>((resolve, reject) => {
      const timer = window.setTimeout(
        () => reject(new Error("Load content timeout")),
        REQUEST_TIMEOUT_MS,
      );
      buildReader()
        .then((v) => {
          window.clearTimeout(timer);
          resolve(v);
        })
        .catch((e) => {
          window.clearTimeout(timer);
          reject(e);
        });
    }).catch((e) => {
      cachedContextPromise = null;
      throw e;
    });
  }
  return await cachedContextPromise;
}

function normalizeRange(fromRaw: string, toRaw: string, max: number): { from: number; to: number } {
  // Normalize human input safely: clamp to [1,max], auto-swap when reversed.
  let from = Number.parseInt(fromRaw || "1", 10);
  let to = Number.parseInt(toRaw || String(max), 10);
  if (!Number.isFinite(from) || from < 1) {
    from = 1;
  }
  if (!Number.isFinite(to) || to < 1) {
    to = max;
  }
  if (from > to) {
    [from, to] = [to, from];
  }
  from = Math.max(1, Math.min(from, max));
  to = Math.max(1, Math.min(to, max));
  return { from, to };
}

function setUiBusy(ui: UIState, busy: boolean): void {
  ui.btn.disabled = busy;
  ui.inputFrom.disabled = busy;
  ui.inputTo.disabled = busy;
}

function isPreloadReady(): boolean {
  if (!document.body) {
    return false;
  }
  const qs = new URLSearchParams(location.search);
  if (!(qs.get("cid") ?? "")) {
    return false;
  }
  const dataPtbinb = document
    .querySelector<HTMLElement>("[data-ptbinb]")
    ?.getAttribute("data-ptbinb");
  if (dataPtbinb) {
    return true;
  }
  if (qs.get("k")) {
    return true;
  }
  if (U_KEYS.some((key) => qs.get(key) !== null)) {
    return true;
  }
  return false;
}

async function waitForPreloadReady(maxWaitMs = 5000): Promise<void> {
  if (isPreloadReady()) {
    return;
  }
  await new Promise<void>((resolve) => {
    let settled = false;
    const finish = (): void => {
      if (settled) {
        return;
      }
      settled = true;
      observer.disconnect();
      window.clearInterval(pollTimer);
      window.clearTimeout(timeoutTimer);
      resolve();
    };
    const observer = new MutationObserver(() => {
      if (isPreloadReady()) {
        finish();
      }
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-ptbinb"],
    });
    const pollTimer = window.setInterval(() => {
      if (isPreloadReady()) {
        finish();
      }
    }, 120);
    const timeoutTimer = window.setTimeout(
      () => {
        // Fallback: do not block preload forever. If readiness signals never appear,
        // we still try once and let existing lazy fallback handle failures.
        finish();
      },
      Math.max(500, maxWaitMs),
    );
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function shouldRetryPreload(message: string): boolean {
  // Retry only for transient/session-sync-like failures.
  return /HTTP 0|HTTP 403|HTTP 404|network|NetworkError|timeout/i.test(message);
}

async function preloadTotal(ui: UIState): Promise<void> {
  ui.status.textContent = "Loading total...";
  // Wait for reader bootstrapping signals before preloading total pages.
  // This reduces early-request failures that would otherwise fall into Ready (lazy).
  await waitForPreloadReady();
  const context = await getReaderContext();
  const total = Math.max(1, context.totalCount || context.images.length);
  ui.inputTo.value = String(total);
  ui.status.textContent = `Ready (${total})`;
}

async function preloadTotalWithRetry(ui: UIState): Promise<void> {
  const delays = [300, 800];
  let lastMessage = "";
  for (let attempt = 0; attempt < delays.length + 1; attempt += 1) {
    try {
      await preloadTotal(ui);
      return;
    } catch (error) {
      lastMessage = error instanceof Error ? error.message : String(error);
      if (attempt >= delays.length || !shouldRetryPreload(lastMessage)) {
        ui.status.textContent = "Ready (lazy)";
        console.error("[MosaiComAnti] preload failed", lastMessage);
        return;
      }
      await sleep(delays[attempt]);
    }
  }
}

async function runSelectedRange(ui: UIState): Promise<void> {
  const { status, inputFrom, inputTo } = ui;
  status.textContent = "Loading content...";
  const { reader, images, cid, totalCount, title } = await getReaderContext();
  const total = Math.max(1, totalCount || images.length);
  // Prefer API total if available, but never exceed parsed image entries for slicing.
  const safeMax = Math.min(total, images.length);
  const { from, to } = normalizeRange(inputFrom.value, inputTo.value, safeMax);
  inputFrom.value = String(from);
  inputTo.value = String(to);

  const selected = images.slice(from - 1, to);
  if (selected.length === 0) {
    fail("Selected range has no pages.");
  }

  log("image entries:", total, "range:", from, "~", to);
  setUiBusy(ui, true);

  status.textContent = `Downloading 0/${selected.length}`;
  const blob = await buildZipBlobStream(selected, from, reader, (done, totalItems) => {
    status.textContent = `Downloading ${done}/${totalItems}`;
  });
  const nameBase = sanitizeFileName(title || cid);
  const zipName = `${nameBase}_${String(from).padStart(4, "0")}-${String(to).padStart(4, "0")}_${formatLocalDate(new Date())}.zip`;
  saveAs(blob, zipName);
  status.textContent = "Done";
}

async function start(ui: UIState): Promise<void> {
  const { status } = ui;
  try {
    await runSelectedRange(ui);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    status.textContent = `Error: ${message}`;
    console.error("[MosaiComAnti] error", error);
  } finally {
    setUiBusy(ui, false);
  }
}

(() => {
  if (window.__mosaiComAntiLoaded__) {
    return;
  }
  window.__mosaiComAntiLoaded__ = true;
  if (window.top !== window.self) {
    return;
  }
  const mount = (): void => {
    if (document.getElementById("__mca_panel")) {
      return;
    }
    const ui = buildUi(9999);
    document.body.appendChild(ui.root);
    let preloadStarted = false;
    const startPreload = (): void => {
      if (preloadStarted) {
        return;
      }
      preloadStarted = true;
      void preloadTotalWithRetry(ui);
    };
    // Run preload after navigation is fully settled (302 chains / bfcache / late auth init).
    window.addEventListener("pageshow", startPreload, { once: true });
    window.addEventListener("load", startPreload, { once: true });
    if (document.readyState === "complete") {
      startPreload();
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount, { once: true });
  } else {
    mount();
  }
})();
