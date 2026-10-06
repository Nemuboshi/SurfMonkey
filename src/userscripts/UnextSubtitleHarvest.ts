import { zip } from "fflate";

import { parseWebvtt, webvttToSrt } from "../shared/webvttSrt.ts";

type Episode = {
  ed: string;
  index: number;
  name: string;
  number: string;
};

type SubtitleEntry = {
  ed: string;
  label: string;
  srt: string;
  vtt: string;
};

type TitleResponse = {
  errors?: { message?: string }[];
  data?: {
    webfront_title_stage?: { titleName?: string };
    webfront_title_titleEpisodes?: {
      episodes?: { displayNo?: string; episodeName?: string; id?: string }[];
    };
  };
};

type PlaylistResponse = {
  errors?: { message?: string }[];
  data?: {
    webfront_playlistUrl?: {
      playToken?: string;
      urlInfo?: {
        movieProfile?: { playlistUrl?: string; type?: string }[];
      }[];
    };
  };
};

type CategoryTitle = {
  hasSubtitle?: boolean;
  hasSubtitleTrack?: boolean;
  id?: string;
};

type CategoryResponse = {
  errors?: { message?: string }[];
  data?: {
    webfront_searchVideo?: { titles?: CategoryTitle[] };
  };
};

// Apollo persisted-query fingerprints (stable per operation, found on the wire).
const GET_TITLE_HASH = "34793f6c4562e912ea232e6552abc5ea638c7254119188c68fa3b5789851c0a4";
const GET_PLAYLIST_URL_HASH = "a2309e22a6819ff747cf9a389dd78db35fa3c386fac1d53461061ba20fa44e34";
const VIDEO_CATEGORY_HASH = "95f198fd95eaefd8b5928aa87ba660514eb3d804a3fdd0333d2b486a44dc9630";
const GRAPHQL_ORIGIN = "https://cc.unext.jp/";

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// The page's own GraphQL calls carry zxuid/zxemp tracking params. Mirror the
// latest observed pair so our replayed requests look identical to the site's.
export function scrapeZxParams(): { zxemp?: string; zxuid?: string } {
  if (typeof performance === "undefined") {
    return {};
  }
  let zxuid: string | undefined;
  let zxemp: string | undefined;
  for (const entry of performance.getEntriesByType("resource")) {
    const match = entry.name.match(/[?&]zxuid=([0-9a-f]+)&zxemp=(\d+)/);
    if (match) {
      zxuid = match[1];
      zxemp = match[2];
    }
  }
  return zxuid ? { zxemp, zxuid } : {};
}

export function buildGraphqlUrl(operation: string, variables: unknown, hash: string): string {
  const u = new URL(GRAPHQL_ORIGIN);
  u.searchParams.set("operationName", operation);
  u.searchParams.set("variables", JSON.stringify(variables));
  u.searchParams.set(
    "extensions",
    JSON.stringify({ persistedQuery: { sha256Hash: hash, version: 1 } }),
  );
  const zx = scrapeZxParams();
  if (zx.zxuid) {
    u.searchParams.set("zxuid", zx.zxuid);
  }
  if (zx.zxemp) {
    u.searchParams.set("zxemp", zx.zxemp);
  }
  return u.href;
}

async function graphql<T extends { errors?: { message?: string }[] }>(
  operation: string,
  variables: unknown,
  hash: string,
): Promise<T> {
  const response = await fetch(buildGraphqlUrl(operation, variables, hash), {
    credentials: "include",
    headers: {
      "apollographql-client-name": "cosmo",
      "apollographql-client-version": "v129.1-prod-4f59553",
      // Apollo's CSRF guard rejects a "simple" GET unless it carries a
      // non-simple content-type OR an operation-name/preflight marker. Send
      // both: some userscript sandboxes strip the content-type from GETs, and
      // then x-apollo-operation-name alone still satisfies the guard.
      "content-type": "application/json",
      "x-apollo-operation-name": operation,
    },
    method: "GET",
  });
  if (!response.ok) {
    throw new Error(`${operation} -> HTTP ${response.status}`);
  }
  const json = (await response.json()) as T;
  if (json.errors?.length) {
    throw new Error(`${operation}: ${json.errors[0]?.message ?? "GraphQL error"}`);
  }
  return json;
}

export async function fetchTitle(
  sid: string,
  seedEd: string,
): Promise<{ episodes: Episode[]; title: string }> {
  const json = await graphql<TitleResponse>(
    "cosmo_getTitle",
    { episodeCode: seedEd, episodePage: 1, episodePageSize: 1000, id: sid },
    GET_TITLE_HASH,
  );
  const data = json.data;
  const title: string = data?.webfront_title_stage?.titleName ?? sid;
  const rawEpisodes = data?.webfront_title_titleEpisodes?.episodes ?? [];
  const episodes: Episode[] = rawEpisodes
    .filter(
      (ep): ep is { displayNo?: string; episodeName?: string; id: string } =>
        typeof ep?.id === "string" && /^ED\d+$/.test(ep.id),
    )
    .map((ep, i) => ({
      ed: ep.id,
      index: i,
      name: typeof ep.episodeName === "string" ? ep.episodeName : ep.id,
      number: typeof ep.displayNo === "string" ? ep.displayNo : String(i + 1),
    }));
  return { episodes, title };
}

// From an episode, resolve the anonymous WEBVTT subtitle URL the site itself
// advertises: getPlaylistUrl -> playToken -> master playlist -> SUBTITLES URI.
export async function resolveSubtitleVttUrl(ed: string): Promise<string> {
  const json = await graphql<PlaylistResponse>(
    "cosmo_getPlaylistUrl",
    { bitrateHigh: null, bitrateLow: 192, code: ed, playMode: "caption", validationOnly: false },
    GET_PLAYLIST_URL_HASH,
  );
  const playlist = json.data?.webfront_playlistUrl;
  const token = playlist?.playToken;
  const profile = (playlist?.urlInfo?.[0]?.movieProfile ?? []).find(
    (p) => p.type === "HLS_CMAF" && p.playlistUrl,
  );
  if (!token || !profile?.playlistUrl) {
    throw new Error(`no HLS_CMAF playlist/token for ${ed}`);
  }
  const masterResponse = await fetch(`${profile.playlistUrl}&play_token=${token}`);
  if (!masterResponse.ok) {
    throw new Error(`master -> HTTP ${masterResponse.status} for ${ed}`);
  }
  const master = await masterResponse.text();
  const vttUrl = pickWebvttSubtitleUri(master);
  if (!vttUrl) {
    throw new Error(`no webvtt subtitle track for ${ed}`);
  }
  // nxtv tracks are served anonymously; browser-default credentials work here.
  const variant = await (await fetch(vttUrl)).text();
  return resolveFirstSegmentUrl(variant, vttUrl);
}

// Pick the SUBTITLES EXT-X-MEDIA URI that points at a text_webvtt track.
export function pickWebvttSubtitleUri(master: string): string | null {
  const lines = master.split(/\r?\n/).filter((l) => l.includes("TYPE=SUBTITLES"));
  for (const line of lines) {
    const uri = line.match(/URI="([^"]+)"/)?.[1];
    if (uri?.includes("text_webvtt")) {
      return uri;
    }
  }
  return null;
}

// A subtitle variant playlist holds a single segment; resolve it against the
// playlist URL (works for both relative and absolute segment lines).
export function resolveFirstSegmentUrl(variant: string, baseUrl: string): string {
  for (const line of variant.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      return new URL(trimmed, baseUrl).href;
    }
  }
  throw new Error(`variant playlist for ${baseUrl} had no segment`);
}

export function sanitizeComponent(name: string, maxLen = 80): string {
  const cleaned = name
    .replace(/[\\/:*?"<>]|\p{Cc}/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "")
    .replace(/\.+$/, "");
  const clipped = cleaned.length > maxLen ? cleaned.slice(0, maxLen).trim() : cleaned;
  return clipped || "untitled";
}

export function episodeFileName(ep: Episode): string {
  const num = sanitizeComponent(ep.number, 24);
  const name = sanitizeComponent(ep.name, 60);
  const digits = num.match(/\d+/);
  const prefix = digits ? `EP${digits[0].padStart(2, "0")}` : sanitizeComponent(num, 10);
  return `${prefix} ${name}`.trim();
}

export function extractSeriesId(
  url = typeof location !== "undefined" ? location.href : "",
): string | null {
  const patterns = [/\/play\/(SID\d+)/, /\/title\/(SID\d+)/, /[?&]td=(SID\d+)/];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) {
      return m[1];
    }
  }
  return null;
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`GET ${url} -> HTTP ${response.status}`);
  }
  return response.text();
}

export async function collectSubtitles(
  sid: string,
  onProgress: (message: string) => void,
): Promise<{ entries: SubtitleEntry[]; title: string }> {
  const seed = await fetchSeedEpisode(sid);
  if (!seed) {
    throw new Error(
      `could not find an episode code for ${sid} on this page — open an episode (play page) and retry`,
    );
  }
  const { episodes, title } = await fetchTitle(sid, seed);
  onProgress(`${title}: ${episodes.length} episodes`);

  const entries: SubtitleEntry[] = [];
  for (const ep of episodes) {
    try {
      const vttUrl = await resolveSubtitleVttUrl(ep.ed);
      const vtt = await fetchText(vttUrl);
      const srt = webvttToSrt(vtt, true);
      entries.push({ ed: ep.ed, label: episodeFileName(ep), srt, vtt });
      onProgress(`done ${ep.number} ${ep.name} (${cueCount(vtt)} cues)`);
    } catch (error) {
      onProgress(`skip ${ep.number} ${ep.name}: ${error instanceof Error ? error.message : error}`);
    }
    // Pace like a human browsing episodes.
    await sleep(250 + Math.random() * 500);
  }
  return { entries, title };
}

function cueCount(vtt: string): number {
  return parseWebvtt(vtt).length;
}

// getTitle needs an episodeCode that belongs to the series (a placeholder is
// rejected with GET_EPISODE_ERROR on non-play pages). Prefer the current
// player's ED, then scrape one from the page's own episode links.
export function findSeedEpisode(sid: string, doc: Document = document): string | null {
  const patterns: RegExp[] = [new RegExp(`/play/${sid}/(ED\\d+)`), /episodeCode["':=\s{,]+(ED\d+)/];
  const candidates = [...doc.querySelectorAll("a[href]")].map((a) => (a as HTMLAnchorElement).href);
  if (typeof performance !== "undefined") {
    for (const entry of performance.getEntriesByType("resource")) {
      candidates.push(entry.name);
    }
  }
  candidates.push(location.href);
  for (const re of patterns) {
    for (const c of candidates) {
      let decoded = c;
      try {
        decoded = decodeURIComponent(c);
      } catch {
        // keep raw
      }
      const m = decoded.match(re);
      if (m) {
        return m[1];
      }
    }
  }
  return null;
}

async function fetchSeedEpisode(sid: string): Promise<string | null> {
  return findSeedEpisode(sid);
}

export function buildZip(entries: SubtitleEntry[], title: string): Promise<Uint8Array> {
  const safeTitle = sanitizeComponent(title, 100);
  const files: Record<string, Uint8Array> = {};
  const encoder = new TextEncoder();
  for (const entry of entries) {
    files[`webvtt/${safeTitle} - ${entry.label}.vtt`] = encoder.encode(entry.vtt);
    files[`srt/${safeTitle} - ${entry.label}.srt`] = encoder.encode(entry.srt);
  }
  return new Promise((resolve, reject) => {
    zip(files, { level: 6 }, (error, data) => {
      if (error) {
        reject(error);
      } else {
        resolve(data);
      }
    });
  });
}

export function downloadBlob(bytes: Uint8Array, fileName: string): void {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const blob = new Blob([copy.buffer], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

// ---- UI ----

function ensureStyles(): void {
  if (document.getElementById("sm-unext-sub-style")) {
    return;
  }
  const style = document.createElement("style");
  style.id = "sm-unext-sub-style";
  style.textContent = `
    #sm-unext-sub-btn{background:#3c3c4a;border:1px solid rgba(255,255,255,.25);border-radius:4px;
      bottom:96px;color:#fff;cursor:pointer;font:600 13px/1 system-ui,sans-serif;padding:10px 14px;
      position:fixed;right:24px;z-index:2147483001;box-shadow:0 2px 8px rgba(0,0,0,.35)}
    #sm-unext-sub-btn:hover{background:#50505f}
    #sm-unext-sub-btn:disabled{color:#c9c9d2;cursor:default;opacity:.85}
    #sm-unext-sub-panel{background:rgba(34,34,44,.97);border:1px solid rgba(255,255,255,.15);
      border-radius:8px;bottom:150px;color:#d6d6dc;display:none;
      font:12px/1.5 ui-monospace,monospace;max-height:40vh;overflow:auto;padding:12px;
      position:fixed;right:24px;width:380px;z-index:2147483000;box-shadow:0 4px 18px rgba(0,0,0,.5)}
    #sm-unext-sub-panel .row{white-space:pre-wrap;word-break:break-word}
    #sm-unext-sub-panel .head{color:#fff;font-weight:700;margin-bottom:6px}
    #sm-unext-sub-chip{cursor:pointer}
    #sm-unext-sub-chip.sm-busy{opacity:.6}
    .sm-unext-hidden{display:none!important}
    .sm-unext-contents{display:contents!important}
    .sm-unext-span{grid-column:1/-1}
  `;
  document.head.appendChild(style);
}

function mountHarvestButton(sid: string): void {
  const button = document.createElement("button");
  button.id = "sm-unext-sub-btn";
  button.textContent = "Download all episode subtitles";
  document.body.appendChild(button);

  const panel = document.createElement("div");
  panel.id = "sm-unext-sub-panel";
  document.body.appendChild(panel);

  const log = (message: string) => {
    panel.style.display = "block";
    const row = document.createElement("div");
    row.className = "row";
    row.textContent = message;
    panel.appendChild(row);
    panel.scrollTop = panel.scrollHeight;
  };

  button.addEventListener("click", async () => {
    button.disabled = true;
    button.textContent = "Working…";
    panel.innerHTML = '<div class="head">U-NEXT subtitle export</div>';
    try {
      const { entries, title } = await collectSubtitles(sid, log);
      if (entries.length === 0) {
        log("No subtitles collected.");
        return;
      }
      log("Packaging ZIP…");
      const bytes = await buildZip(entries, title);
      downloadBlob(bytes, `${sanitizeComponent(title, 100)} [subtitles].zip`);
      log(`Saved ${entries.length} episodes (webvtt/ + srt/).`);
    } catch (error) {
      log(`ERROR: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      button.disabled = false;
      button.textContent = "Download all episode subtitles";
    }
  });
}

// ---- has subtitles filter on category/browse pages ----

const SID_IN_HREF = /(?:\/(?:title|play)\/)(SID\d+)/;

export function extractCategoryCode(
  url = typeof location !== "undefined" ? location.href : "",
): string | null {
  const segments = new URL(url).pathname.split("/");
  for (let i = segments.length - 1; i >= 0; i -= 1) {
    if (/^MNU\d+$/.test(segments[i])) {
      return segments[i];
    }
  }
  return null;
}

// Reuse the variables from the site's own latest cosmo_VideoCategory request
// (same category, sort order, sale tab) so our paged scan matches what the
// page is actually showing.
export function scrapeCategoryVars(): Record<string, unknown> | null {
  if (typeof performance === "undefined") {
    return null;
  }
  let vars: Record<string, unknown> | null = null;
  for (const entry of performance.getEntriesByType("resource")) {
    if (!entry.name.includes("cosmo_VideoCategory")) {
      continue;
    }
    try {
      const u = new URL(entry.name);
      const raw = u.searchParams.get("variables");
      if (raw) {
        vars = JSON.parse(raw) as Record<string, unknown>;
      }
    } catch {
      // malformed URL — skip
    }
  }
  return vars;
}

const MAX_CATEGORY_PAGES = 300;

// Highest cosmo_VideoCategory page the site itself has requested so far —
// it paginates as the user scrolls, so this tracks scroll depth. We only
// fetch flags for pages actually needed instead of pre-scanning the whole
// category (which can be 200+ pages).
export function observedCategoryPages(): number {
  if (typeof performance === "undefined") {
    return 1;
  }
  let max = 1;
  for (const entry of performance.getEntriesByType("resource")) {
    if (!entry.name.includes("cosmo_VideoCategory")) {
      continue;
    }
    try {
      const raw = new URL(entry.name).searchParams.get("variables");
      const page = raw ? Number((JSON.parse(raw) as { page?: unknown }).page) : NaN;
      if (Number.isFinite(page) && page > max) {
        max = page;
      }
    } catch {
      // malformed URL — skip
    }
  }
  return max;
}

class FlagStore {
  readonly flags = new Map<string, boolean>();
  fetchedPages = 0;
  scanning = false;
  varsKey = "";

  constructor(readonly categoryCode: string) {}

  // The flags are only valid for the sort order / sale tab the pages were
  // fetched with; reset when the site's own request vars change.
  currentVarsKey(): string {
    const site = scrapeCategoryVars();
    return `${String(site?.sortOrder ?? "POPULAR")}|${String(site?.filterSaleType ?? "")}`;
  }

  async ensurePages(): Promise<void> {
    const key = this.currentVarsKey();
    if (key !== this.varsKey) {
      this.varsKey = key;
      this.flags.clear();
      this.fetchedPages = 0;
    }
    const want = Math.min(observedCategoryPages(), MAX_CATEGORY_PAGES);
    if (this.scanning || this.fetchedPages >= want) {
      return;
    }
    this.scanning = true;
    try {
      const [sortOrder, filterSaleTypeRaw] = key.split("|");
      const base: Record<string, unknown> = {
        categoryCode: this.categoryCode,
        filterSaleType: filterSaleTypeRaw === "" ? null : filterSaleTypeRaw,
        sortOrder,
      };
      for (let page = this.fetchedPages + 1; page <= want; page += 1) {
        const json = await graphql<CategoryResponse>(
          "cosmo_VideoCategory",
          { ...base, page },
          VIDEO_CATEGORY_HASH,
        );
        const titles = json.data?.webfront_searchVideo?.titles ?? [];
        for (const t of titles) {
          if (typeof t.id === "string") {
            this.flags.set(t.id, Boolean(t.hasSubtitleTrack));
          }
        }
        this.fetchedPages = page;
        if (titles.length === 0) {
          break;
        }
        await sleep(100 + Math.random() * 150);
      }
    } finally {
      this.scanning = false;
    }
  }
}

// The category list is built as one grid container per row of 4 cards, so
// hiding cards in place leaves ragged rows. Flattening the row containers
// (and their single-child wrappers) with display:contents makes every cell
// participate in one shared grid on the outer container instead: hidden cells
// collapse, rows fill up, and spacing stays uniform.
function normalizeGrid(rowGrid: HTMLElement): void {
  if (rowGrid.dataset.smGrid) {
    return;
  }
  const wrapper = rowGrid.parentElement;
  const outer = wrapper?.parentElement;
  if (!wrapper || !outer) {
    return;
  }
  rowGrid.dataset.smGrid = "1";
  const cs = getComputedStyle(rowGrid);
  const template = cs.gridTemplateColumns;
  const gap = cs.gap;
  rowGrid.classList.add("sm-unext-contents");
  wrapper.classList.add("sm-unext-contents");
  if (!outer.dataset.smGridHost) {
    outer.dataset.smGridHost = "1";
    outer.style.display = "grid";
    outer.style.gridTemplateColumns = template;
    outer.style.gap = gap;
  }
  for (const child of outer.children) {
    const el = child as HTMLElement;
    // Anything that is not a card cell (sentinels, headers) spans full width.
    if (!el.dataset.smGrid && el !== rowGrid && !el.classList.contains("sm-unext-span")) {
      el.classList.add("sm-unext-span");
    }
  }
}

function cardCell(card: HTMLAnchorElement): HTMLElement {
  const parent = card.parentElement;
  return parent && parent.children.length === 1 ? parent : card;
}

function setCellHidden(cell: HTMLElement, hide: boolean): void {
  if (cell.classList.contains("sm-unext-hidden") !== hide) {
    cell.classList.toggle("sm-unext-hidden", hide);
  }
}

// Hide cards whose flag is false; unknown SIDs (page not fetched yet) stay
// visible until the incremental scan covers them.
function passCards(store: FlagStore, active: boolean): void {
  for (const card of document.querySelectorAll<HTMLAnchorElement>(
    'a[href*="/title/SID"], a[href*="/play/SID"]',
  )) {
    const sid = card.href.match(SID_IN_HREF)?.[1];
    if (!sid) {
      continue;
    }
    const cell = cardCell(card);
    const parent = cell.parentElement;
    if (parent && getComputedStyle(parent).display === "grid" && !parent.dataset.smGridHost) {
      normalizeGrid(parent);
    }
    setCellHidden(cell, active && store.flags.get(sid) === false);
  }
}

function mountSubtitleFilter(): void {
  let mounted = false;
  let attempts = 0;
  const findTab = () =>
    [...document.querySelectorAll('button[data-testid="capsule-tab-btn"]')].find(
      (b) => b.textContent.trim() === "見放題",
    );

  const attach = () => {
    if (mounted) {
      return true;
    }
    const tab = findTab();
    if (!tab?.parentElement) {
      return false;
    }
    mounted = true;
    const categoryCode = extractCategoryCode();
    if (!categoryCode) {
      return true;
    }

    // Clone a real capsule tab so font/size/radius/hover match exactly.
    const chip = tab.cloneNode(false) as HTMLButtonElement;
    chip.id = "sm-unext-sub-chip";
    chip.textContent = "字幕あり";
    chip.removeAttribute("data-testid");
    chip.style.backgroundColor = "transparent";
    tab.after(chip);

    const store = new FlagStore(categoryCode);
    let active = false;
    let loopRunning = false;

    const paintChip = () => {
      chip.style.backgroundColor = active ? "rgba(255,255,255,.3)" : "transparent";
      chip.classList.toggle("sm-busy", store.scanning);
    };

    // Keep pace with scrolling: fetch only the pages the site itself has
    // requested so far, a few at a time, and re-apply after each batch.
    const pump = async () => {
      if (loopRunning) {
        return;
      }
      loopRunning = true;
      try {
        while (active && store.fetchedPages < observedCategoryPages()) {
          await store.ensurePages();
          passCards(store, true);
        }
      } catch {
        // transient API hiccup — the next scroll mutation retries via pump
      } finally {
        loopRunning = false;
        paintChip();
      }
    };

    // Virtualised list: nodes are recycled as the user scrolls. A debounced
    // diff pass (no-op when nothing changed) keeps state correct cheaply.
    let debounce: ReturnType<typeof setTimeout> | null = null;
    const schedulePass = () => {
      if (!active || debounce) {
        return;
      }
      debounce = setTimeout(() => {
        debounce = null;
        passCards(store, true);
        void pump();
      }, 250);
    };
    new MutationObserver(schedulePass).observe(document.body, { childList: true, subtree: true });

    chip.addEventListener("click", async () => {
      active = !active;
      paintChip();
      if (active) {
        try {
          await store.ensurePages();
        } catch {
          // transient API hiccup — pump() retries on the next scroll
        }
        passCards(store, true);
        void pump();
      } else {
        for (const el of document.querySelectorAll(".sm-unext-hidden")) {
          el.classList.remove("sm-unext-hidden");
        }
      }
    });
    return true;
  };

  // The tabs are rendered by React after data loads; poll until they appear.
  const timer = setInterval(() => {
    attempts += 1;
    if (attach() || attempts > 60) {
      clearInterval(timer);
    }
  }, 500);
  attach();
}

export function mount(): void {
  ensureStyles();
  const sid = extractSeriesId();
  if (sid) {
    mountHarvestButton(sid);
  }
  if (/\/browse\//.test(location.pathname)) {
    mountSubtitleFilter();
  }
}

if (typeof document !== "undefined") {
  const boot = () => mount();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
}
