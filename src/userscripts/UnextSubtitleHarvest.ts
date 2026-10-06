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
  hasSubtitleTrack?: boolean;
  id?: string;
  nfreeBadge?: string;
  thumbnail?: { standard?: string };
  titleName?: string;
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

// ---- "字幕あり" (has subtitles) filter on category/browse pages ----

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

// Walk the category's pages (30 titles each), invoking onBatch per page so a
// UI can render incrementally. Stops at an empty page or the cap.
export async function scanCategory(
  categoryCode: string,
  onBatch: (titles: CategoryTitle[]) => void,
  shouldContinue: () => boolean,
): Promise<void> {
  const site = scrapeCategoryVars();
  const base: Record<string, unknown> = {
    categoryCode,
    filterSaleType: site?.filterSaleType ?? null,
    sortOrder: site?.sortOrder ?? "POPULAR",
  };
  for (let page = 1; page <= MAX_CATEGORY_PAGES; page += 1) {
    if (!shouldContinue()) {
      return;
    }
    const json = await graphql<CategoryResponse>(
      "cosmo_VideoCategory",
      { ...base, page },
      VIDEO_CATEGORY_HASH,
    );
    const titles = json.data?.webfront_searchVideo?.titles ?? [];
    onBatch(titles);
    if (titles.length === 0) {
      return;
    }
    await sleep(120 + Math.random() * 180);
  }
}

// ---- Floating "字幕あり" panel ----
// The site's own list is virtualised and re-renders on scroll, so filtering it
// in place flickers no matter how carefully we patch classes. Instead the chip
// opens our own overlay that renders the subtitle-enabled titles directly.

function ensurePanelStyles(): void {
  if (document.getElementById("sm-unext-panel-style")) {
    return;
  }
  const style = document.createElement("style");
  style.id = "sm-unext-panel-style";
  style.textContent = `
    #sm-unext-overlay{align-items:flex-start;background:rgba(10,10,14,.6);display:none;
      inset:0;justify-content:center;position:fixed;z-index:2147483000}
    #sm-unext-overlay.sm-open{display:flex}
    #sm-unext-dialog{background:#1c1c24;border:1px solid rgba(255,255,255,.14);border-radius:10px;
      box-shadow:0 12px 48px rgba(0,0,0,.6);display:flex;flex-direction:column;height:80vh;
      margin:10vh 16px;max-width:1060px;width:100%}
    #sm-unext-dialog header{align-items:center;color:#fff;display:flex;
      font:700 15px/1.4 "Hiragino Sans","Hiragino Kaku Gothic ProN",sans-serif;
      justify-content:space-between;padding:14px 18px}
    #sm-unext-dialog header .count{color:#9a9aa6;font-weight:400;margin-left:8px}
    #sm-unext-close{background:none;border:none;color:#9a9aa6;cursor:pointer;font-size:20px;line-height:1;padding:4px 8px}
    #sm-unext-close:hover{color:#fff}
    #sm-unext-grid{display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));
      min-width:0;overflow:auto;padding:0 18px 18px}
    #sm-unext-grid a{color:#e6e6ec;display:block;font:12px/1.4 "Hiragino Sans","Hiragino Kaku Gothic ProN",sans-serif;
      min-width:0;text-decoration:none}
    #sm-unext-grid img{aspect-ratio:16/9;background:#2a2a34;border-radius:6px;display:block;
      object-fit:cover;transition:transform .12s ease;width:100%}
    #sm-unext-grid a:hover img{transform:scale(1.03)}
    #sm-unext-grid .name{display:block;margin-top:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    #sm-unext-grid .badge{color:#7dd47d}
    #sm-unext-status{color:#9a9aa6;font:12px/1 "Hiragino Sans",sans-serif;padding:0 18px 12px}
  `;
  document.head.appendChild(style);
}

// The native loading="lazy" proved unreliable inside our overlay, so load
// thumbnails manually once they near the viewport.
let thumbObserver: IntersectionObserver | null = null;
function observeThumb(img: HTMLImageElement, src: string): void {
  if (!thumbObserver) {
    thumbObserver = new IntersectionObserver(
      (entries, observer) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            continue;
          }
          const el = entry.target as HTMLImageElement;
          el.src = el.dataset.smSrc ?? "";
          delete el.dataset.smSrc;
          observer.unobserve(el);
        }
      },
      { rootMargin: "400px" },
    );
  }
  img.dataset.smSrc = src;
  thumbObserver.observe(img);
}

function subtitleCard(t: CategoryTitle): HTMLAnchorElement | null {
  if (typeof t.id !== "string" || !/^SID\d+$/.test(t.id)) {
    return null;
  }
  const a = document.createElement("a");
  a.href = `/title/${t.id}`;
  a.title = t.titleName ?? t.id;
  const img = document.createElement("img");
  const thumb = t.thumbnail?.standard;
  if (thumb) {
    const base = thumb.startsWith("http") ? thumb : `https://${thumb}`;
    // Same resize params the site uses — the originals are huge PNGs.
    observeThumb(img, `${base}${base.includes("?") ? "&" : "?"}f=avif&q=M&p=W400`);
  }
  const name = document.createElement("span");
  name.className = "name";
  name.textContent = t.titleName ?? t.id;
  a.append(img, name);
  if (t.nfreeBadge) {
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = ` ${t.nfreeBadge}`;
    a.appendChild(badge);
  }
  return a;
}

function openSubtitleDialog(categoryCode: string): void {
  ensurePanelStyles();
  let overlayEl = document.getElementById("sm-unext-overlay");
  if (!overlayEl) {
    overlayEl = document.createElement("div");
    overlayEl.id = "sm-unext-overlay";
    const overlay = overlayEl;
    const dialog = document.createElement("div");
    dialog.id = "sm-unext-dialog";
    const header = document.createElement("header");
    const titleSpan = document.createElement("span");
    titleSpan.textContent = "字幕あり作品";
    const count = document.createElement("span");
    count.className = "count";
    count.id = "sm-unext-count";
    const close = document.createElement("button");
    close.id = "sm-unext-close";
    close.textContent = "✕";
    header.append(titleSpan, count, close);
    const grid = document.createElement("div");
    grid.id = "sm-unext-grid";
    const status = document.createElement("div");
    status.id = "sm-unext-status";
    status.textContent = "Loading…";
    dialog.append(header, grid, status);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    close.addEventListener("click", () => overlay.classList.remove("sm-open"));
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        overlay.classList.remove("sm-open");
      }
    });
  }
  const overlay = overlayEl;
  const grid = document.getElementById("sm-unext-grid") as HTMLElement;
  const countEl = document.getElementById("sm-unext-count") as HTMLElement;
  const statusEl = document.getElementById("sm-unext-status") as HTMLElement;
  grid.textContent = "";
  countEl.textContent = "";
  statusEl.textContent = "Loading…";
  overlay.classList.add("sm-open");

  let open = true;
  let shown = 0;
  let scanned = 0;
  void scanCategory(
    categoryCode,
    (titles) => {
      scanned += titles.length;
      for (const t of titles) {
        if (!t.hasSubtitleTrack) {
          continue;
        }
        const card = subtitleCard(t);
        if (card) {
          grid.appendChild(card);
          shown += 1;
        }
      }
      countEl.textContent = `${shown} titles`;
      statusEl.textContent = `Scanned ${scanned}…`;
    },
    () => open,
  )
    .then(() => {
      if (open) {
        statusEl.textContent = shown === 0 ? "No subtitle titles found." : "";
      }
    })
    .catch((error: unknown) => {
      statusEl.textContent = `Error: ${error instanceof Error ? error.message : String(error)}`;
    });

  // A second click on the chip while open closes everything.
  const observer = new MutationObserver(() => {
    if (!overlay.classList.contains("sm-open")) {
      open = false;
      observer.disconnect();
    }
  });
  observer.observe(overlay, { attributes: true, attributeFilter: ["class"] });
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
    tab.after(chip);

    let syncAttached = false;
    const attachSync = () => {
      if (syncAttached) {
        return;
      }
      const overlay = document.getElementById("sm-unext-overlay");
      if (!overlay) {
        return;
      }
      syncAttached = true;
      // Keep the chip highlight in sync with the overlay's open state.
      new MutationObserver(() => {
        if (!overlay.classList.contains("sm-open")) {
          chip.style.backgroundColor = "";
        }
      }).observe(overlay, { attributes: true, attributeFilter: ["class"] });
    };

    chip.addEventListener("click", () => {
      const overlay = document.getElementById("sm-unext-overlay");
      if (overlay?.classList.contains("sm-open")) {
        overlay.classList.remove("sm-open");
        chip.style.backgroundColor = "";
        return;
      }
      chip.style.backgroundColor = "rgba(255,255,255,.3)";
      openSubtitleDialog(categoryCode);
      attachSync();
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
