// Port of the 115Exporter browser extension (github.com/acgotaku/115, GPLv3) to a
// Violentmonkey userscript: turn the 115.com file list into aria2 RPC tasks / text exports.

type Rpc = { name: string; url: string };

type Config = {
  rpcList: Rpc[];
  sha1Check: boolean;
  vip: boolean;
  small: boolean;
  interval: number;
  downloadPath: string;
  userAgent: string;
  browserUserAgent: boolean;
  referer: string;
  headers: string;
  extraCookie: string;
};

type ApiFile = { cid?: string; fid?: string; pc?: string; sha?: string };

type ListResponse = { data?: ApiFile[]; path?: { name?: string }[] };

type DownloadInfo = { name: string; link: string; size: number; sha1?: string; pickcode: string };

type ApiDownload = {
  file_name?: string;
  file_url?: string;
  file_size?: number;
  pick_code?: string;
  url?: { url?: string };
};

type GmXhrResponse = { status: number; responseText: string };

type ToastBox = HTMLElement & { timer?: ReturnType<typeof setTimeout> };

type GmXhrDetails = {
  method: string;
  url: string;
  headers?: Record<string, string>;
  data?: string;
  timeout?: number;
  credentials?: boolean;
  onload?: (response: GmXhrResponse) => void;
  onerror?: (error: unknown) => void;
  ontimeout?: () => void;
};

declare function GM_getValue<T>(key: string, defaultValue: T): T;
declare function GM_setValue<T>(key: string, value: T): void;
declare function GM_deleteValue(key: string): void;
declare const GM_xmlhttpRequest: ((details: GmXhrDetails) => void) | undefined;
declare const unsafeWindow: (Window & typeof globalThis) | undefined;

// ============================================================== 115 crypto
// Byte-for-byte port of src/js/lib/secret.js so the API keeps accepting our payloads.

const KTS = [
  240, 229, 105, 174, 191, 220, 191, 138, 26, 69, 232, 190, 125, 166, 115, 184, 222, 143, 231, 196,
  69, 218, 134, 196, 155, 100, 139, 20, 106, 180, 241, 170, 56, 1, 53, 158, 38, 105, 44, 134, 0,
  107, 79, 165, 54, 52, 98, 166, 42, 150, 104, 24, 242, 74, 253, 189, 107, 151, 143, 77, 143, 137,
  19, 183, 108, 142, 147, 237, 14, 13, 72, 62, 215, 47, 136, 216, 254, 254, 126, 134, 80, 149, 79,
  209, 235, 131, 38, 52, 219, 102, 123, 156, 126, 157, 122, 129, 50, 234, 182, 51, 222, 58, 169, 89,
  52, 102, 59, 170, 186, 129, 96, 72, 185, 213, 129, 156, 248, 108, 132, 119, 255, 84, 120, 38, 95,
  190, 232, 30, 54, 159, 52, 128, 92, 69, 44, 155, 118, 213, 27, 143, 204, 195, 184, 245,
];

const KEY_S = [0x29, 0x23, 0x21, 0x5e];
const KEY_L = [120, 6, 173, 76, 51, 134, 93, 24, 76, 1, 63, 70];

const MD5_S = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14,
  20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6,
  10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
];

const MD5_K = (() => {
  const table: number[] = [];
  for (let i = 0; i < 64; i++) {
    table.push(Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) | 0);
  }
  return table;
})();

function rotateLeft(value: number, shift: number): number {
  return (value << shift) | (value >>> (32 - shift));
}

function toLeHex(value: number): string {
  let hex = "";
  for (let i = 0; i < 4; i++) {
    hex += ((value >>> (i * 8)) & 0xff).toString(16).padStart(2, "0");
  }
  return hex;
}

export function md5Bytes(bytes: Uint8Array): string {
  const length = bytes.length;
  const total = Math.ceil((length + 9) / 64) * 64;
  const message = new Uint8Array(total);
  message.set(bytes);
  message[length] = 0x80;

  const view = new DataView(message.buffer);
  const bitLength = length * 8;
  view.setUint32(total - 8, bitLength >>> 0, true);
  view.setUint32(total - 4, Math.floor(bitLength / 4294967296), true);

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  for (let offset = 0; offset < total; offset += 64) {
    const w: number[] = [];
    for (let j = 0; j < 16; j++) {
      w.push(view.getInt32(offset + j * 4, true));
    }

    let a = a0;
    let b = b0;
    let c = c0;
    let d = d0;

    for (let j = 0; j < 64; j++) {
      let f: number;
      let g: number;
      if (j < 16) {
        f = (b & c) | (~b & d);
        g = j;
      } else if (j < 32) {
        f = (d & b) | (~d & c);
        g = (5 * j + 1) % 16;
      } else if (j < 48) {
        f = b ^ c ^ d;
        g = (3 * j + 5) % 16;
      } else {
        f = c ^ (b | ~d);
        g = (7 * j) % 16;
      }
      f = (f + a + MD5_K[j] + w[g]) | 0;
      a = d;
      d = c;
      c = b;
      b = (b + rotateLeft(f, MD5_S[j])) | 0;
    }

    a0 = (a0 + a) | 0;
    b0 = (b0 + b) | 0;
    c0 = (c0 + c) | 0;
    d0 = (d0 + d) | 0;
  }

  return toLeHex(a0) + toLeHex(b0) + toLeHex(c0) + toLeHex(d0);
}

// blueimp-md5 utf8-encodes before hashing, so hashing TextEncoder bytes matches it.
export function md5(text: string): string {
  return md5Bytes(new TextEncoder().encode(text));
}

const RSA_N = BigInt(
  "0x8686980c0f5a24c4b9d43020cd2c22703ff3f450756529058b1cf88f09b8602136477198a6e2683149659bd122c33592" +
    "fdb5ad47944ad1ea4d36c6b172aad6338c3bb6ac6227502d010993ac967d1aef00f0c8e038de2e4d3bc2ec368af2e9f10" +
    "a6f1eda4f7262f136420c07c331b871bf139f74f3010e3c4fe57df3afb71683",
);
const RSA_E = BigInt(0x10001);

// ponytail: native BigInt modPow, RSA-1024 with e=65537 is ~20 multiplications per block.
function modPow(base: bigint, exponent: bigint, modulus: bigint): bigint {
  const zero = BigInt(0);
  const one = BigInt(1);
  const two = BigInt(2);
  let result = one;
  let value = ((base % modulus) + modulus) % modulus;
  let power = exponent;
  while (power > zero) {
    if (power % two === one) {
      result = (result * value) % modulus;
    }
    value = (value * value) % modulus;
    power = power / two;
  }
  return result;
}

export function a2hex(bytes: number[]): string {
  return bytes.map((byte) => (byte & 0xff).toString(16).padStart(2, "0")).join("");
}

export function hex2a(hex: string): string {
  let text = "";
  for (let i = 0; i < hex.length; i += 2) {
    text += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
  }
  return text;
}

export function stringToBytes(text: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < text.length; i++) {
    bytes.push(text.charCodeAt(i) & 0xff);
  }
  return bytes;
}

export function bytesToString(bytes: number[]): string {
  let text = "";
  for (const byte of bytes) {
    text += String.fromCharCode(byte);
  }
  return text;
}

export function pkcs1pad2(text: string, size: number): bigint {
  if (size < text.length + 11) {
    return BigInt(0);
  }
  const block: number[] = [];
  let cursor = size;
  let index = text.length - 1;
  while (index >= 0 && cursor > 0) {
    block[--cursor] = text.charCodeAt(index--);
  }
  block[--cursor] = 0;
  while (cursor > 2) {
    block[--cursor] = 0xff;
  }
  block[--cursor] = 2;
  block[--cursor] = 0;
  return BigInt(`0x${a2hex(block)}`);
}

export function pkcs1unpad2(value: bigint): string {
  let hex = value.toString(16);
  if (hex.length % 2 !== 0) {
    hex = `0${hex}`;
  }
  const text = hex2a(hex);
  let i = 1;
  const limit = text.length;
  while (i < limit && text.charCodeAt(i) !== 0) {
    i++;
  }
  return text.slice(i + 1);
}

export function rsaEncrypt(text: string): string {
  const cipher = modPow(pkcs1pad2(text, 0x80), RSA_E, RSA_N).toString(16);
  return cipher.padStart(256, "0");
}

export function rsaDecrypt(text: string): string {
  const value = BigInt(`0x${a2hex(stringToBytes(text))}`);
  return pkcs1unpad2(modPow(value, RSA_E, RSA_N));
}

export function getKey(length: number, key: number[] | null): number[] {
  if (key) {
    const result: number[] = [];
    for (let i = 0; i < length; i++) {
      result.push(((key[i] + KTS[length * i]) & 0xff) ^ KTS[length * (length - 1 - i)]);
    }
    return result;
  }
  return length === 12 ? KEY_L.slice(0) : KEY_S.slice(0);
}

export function xor115Enc(src: number[], srclen: number, key: number[], keylen: number): number[] {
  const mod4 = srclen % 4;
  const ret: number[] = [];
  for (let i = 0; i < mod4; i++) {
    ret.push(src[i] ^ key[i % keylen]);
  }
  for (let i = mod4; i < srclen; i++) {
    ret.push(src[i] ^ key[(i - mod4) % keylen]);
  }
  return ret;
}

export function symEncode(
  src: number[],
  srclen: number,
  key1: number[] | null,
  key2: number[] | null,
): number[] {
  const ret = xor115Enc(src, srclen, getKey(4, key1), 4);
  ret.reverse();
  return xor115Enc(ret, srclen, getKey(12, key2), 12);
}

export function symDecode(
  src: number[],
  srclen: number,
  key1: number[] | null,
  key2: number[] | null,
): number[] {
  const ret = xor115Enc(src, srclen, getKey(12, key2), 12);
  ret.reverse();
  return xor115Enc(ret, srclen, getKey(4, key1), 4);
}

function asymEncode(src: number[], srclen: number): string {
  const size = 128 - 11;
  let hex = "";
  for (let i = 0; i < Math.floor((srclen + size - 1) / size); i++) {
    hex += rsaEncrypt(bytesToString(src.slice(i * size, Math.min((i + 1) * size, srclen))));
  }
  return btoa(hex2a(hex));
}

function asymDecode(src: number[], srclen: number): number[] {
  let text = "";
  for (let i = 0; i < Math.floor((srclen + 127) / 128); i++) {
    text += rsaDecrypt(bytesToString(src.slice(i * 128, Math.min((i + 1) * 128, srclen))));
  }
  return stringToBytes(text);
}

export function secretEncode(str: string, timestamp: number): { data: string; key: number[] } {
  const key = stringToBytes(md5(`!@###@#${timestamp}DFDR@#@#`));
  const src = stringToBytes(str);
  const body = symEncode(src, src.length, key, null);
  const temp = key.slice(0, 16).concat(body);
  return { data: asymEncode(temp, temp.length), key };
}

export function secretDecode(str: string, key: number[]): string {
  const packed = stringToBytes(atob(str));
  const temp = asymDecode(packed, packed.length);
  return bytesToString(symDecode(temp.slice(16), temp.length - 16, key, temp.slice(0, 16)));
}

// ============================================================== userscript
(() => {
  // The crypto above is exported for tests; skip the page wiring when imported in node.
  if (typeof document === "undefined") {
    return;
  }

  const CONFIG_KEY = "disk115.config";
  const TIMEOUT_MS = 30000;

  const DEFAULTS: Config = {
    rpcList: [{ name: "ARIA2 RPC", url: "http://localhost:6800/jsonrpc" }],
    sha1Check: false,
    vip: true,
    small: false,
    interval: 300,
    downloadPath: "",
    userAgent:
      "Mozilla/5.0 (Windows NT 5.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.63 Safari/537.36 115Browser/5.1.3",
    browserUserAgent: true,
    referer: "https://115.com/",
    headers: "",
    extraCookie: "",
  };

  let config: Config = loadConfig();
  let mode: "RPC" | "TXT" | "OPEN" = "RPC";
  let rpcURL = config.rpcList[0].url;
  let running = false;

  function loadConfig(): Config {
    const stored = { ...DEFAULTS, ...GM_getValue<Partial<Config>>(CONFIG_KEY, {}) };
    if (!stored.rpcList?.length) {
      stored.rpcList = DEFAULTS.rpcList;
    }
    return stored;
  }

  function toast(message: string, type: "inf" | "err" | "war"): void {
    const colors = { inf: "#4caf50", err: "#f44336", war: "#ff9800" };
    let box = document.getElementById("__115_ext_toast") as ToastBox | null;
    if (!box) {
      box = document.createElement("div");
      box.id = "__115_ext_toast";
      Object.assign(box.style, {
        position: "fixed",
        top: "20px",
        right: "20px",
        zIndex: "2147483647",
        padding: "10px 16px",
        borderRadius: "8px",
        fontSize: "14px",
        color: "#fff",
        transition: "opacity 0.3s ease",
        boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
        pointerEvents: "none",
      });
      document.body.appendChild(box);
    }
    box.style.background = colors[type];
    box.style.opacity = "1";
    box.textContent = message;
    clearTimeout(box.timer);
    box.timer = setTimeout(() => {
      box.style.opacity = "0";
    }, 3000);
  }

  function gmXhr(details: GmXhrDetails): Promise<GmXhrResponse> {
    return new Promise((resolve, reject) => {
      if (typeof GM_xmlhttpRequest !== "function") {
        reject(new Error("GM_xmlhttpRequest 不可用"));
        return;
      }
      GM_xmlhttpRequest({
        ...details,
        credentials: true,
        timeout: TIMEOUT_MS,
        onload: (response) => {
          if (response.status >= 200 && response.status < 300) {
            resolve(response);
          } else {
            reject(new Error(`HTTP ${response.status}`));
          }
        },
        onerror: () => reject(new Error(`请求失败: ${details.url}`)),
        ontimeout: () => reject(new Error(`请求超时: ${details.url}`)),
      });
    });
  }

  async function fetchJson<T>(url: string, body?: string): Promise<T> {
    const headers: Record<string, string> = { "Content-Type": "application/x-www-form-urlencoded" };
    const response = await gmXhr({
      method: body ? "POST" : "GET",
      url,
      headers: body ? headers : undefined,
      data: body,
    });
    return JSON.parse(response.responseText) as T;
  }

  function query(params: Record<string, string | number>): string {
    return Object.keys(params)
      .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(String(params[key]))}`)
      .join("&");
  }

  function cookieString(): string {
    // ponytail: Violentmonkey cannot read httpOnly cookies, unlike chrome.cookies.
    // Add the missing names to the 额外 Cookie setting if a download starts failing.
    return [document.cookie, config.extraCookie].filter(Boolean).join("; ");
  }

  function headerLines(): string[] {
    const userAgent = config.browserUserAgent ? navigator.userAgent : config.userAgent;
    const lines = [
      `User-Agent: ${userAgent}`,
      `Referer: ${config.referer}`,
      `Cookie: ${cookieString()}`,
    ];
    for (const line of config.headers.split(/\r?\n/)) {
      if (line) {
        lines.push(line);
      }
    }
    return lines;
  }

  type RpcTarget = { auth: string | null; url: string; options: Record<string, string> };

  function parseRpcUrl(raw: string): RpcTarget {
    const parsed = new URL(raw);
    let auth: string | null = parsed.username
      ? `${parsed.username}:${decodeURI(parsed.password)}`
      : null;
    if (auth && !auth.includes("token:")) {
      auth = `Basic ${btoa(auth)}`;
    }
    const options: Record<string, string> = {};
    for (const [key, value] of new URLSearchParams(parsed.hash.slice(1))) {
      options[key] = value.length ? value : "enabled";
    }
    return { auth, url: parsed.origin + parsed.pathname, options };
  }

  async function rpcPost(rpc: RpcTarget, method: string, params: unknown[]): Promise<unknown> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const body = { jsonrpc: "2.0", id: Date.now(), method, params };
    if (rpc.auth?.startsWith("Basic")) {
      headers.Authorization = rpc.auth;
    }
    const response = await gmXhr({
      method: "POST",
      url: rpc.url,
      headers,
      data: JSON.stringify(body),
    });
    const json = JSON.parse(response.responseText) as {
      error?: { message?: string };
      result?: unknown;
    };
    if (json.error) {
      throw new Error(json.error.message || "aria2 RPC error");
    }
    return json.result;
  }

  function rpcOptions(rpc: RpcTarget, file: DownloadInfo): Record<string, unknown> {
    const options: Record<string, unknown> = { out: file.name, header: headerLines() };
    if (config.downloadPath) {
      options.dir = config.downloadPath;
    }
    if (config.sha1Check && file.sha1) {
      options.checksum = `sha-1=${file.sha1}`;
    }
    return Object.assign(options, rpc.options);
  }

  async function pushToAria2(files: DownloadInfo[]): Promise<void> {
    const rpc = parseRpcUrl(rpcURL);
    const withToken = rpc.auth?.startsWith("token") ?? false;
    const list = config.small ? [...files].sort((a, b) => a.size - b.size) : files;
    let failed = 0;

    for (const file of list) {
      const options = rpcOptions(rpc, file);
      const params = withToken ? [rpc.auth, [file.link], options] : [[file.link], options];
      try {
        await rpcPost(rpc, "aria2.addUri", params);
      } catch (error) {
        failed++;
        console.warn("[disk115]", error);
      }
      await sleep(config.interval);
    }

    if (failed) {
      toast(`${failed}/${list.length} 个任务推送失败，检查 aria2 是否开启`, "err");
    } else {
      toast(`已推送 ${list.length} 个任务，赶紧去看看吧~`, "inf");
    }
  }

  function dataUri(text: string): string {
    return `data:text/plain;charset=utf-8,${encodeURIComponent(text)}`;
  }

  function textExport(files: DownloadInfo[]): void {
    const cmd: string[] = [];
    const aria2: string[] = [];
    const idm: string[] = [];
    const links: string[] = [];
    const headers = headerLines();

    for (const file of files) {
      const checksum = config.sha1Check && file.sha1 ? file.sha1 : "";
      let cmdLine = `aria2c -c -s10 -k1M -x16 --enable-rpc=false -o ${JSON.stringify(file.name)} `;
      cmdLine += headers.map((line) => `--header ${JSON.stringify(line)}`).join(" ");
      cmdLine += ` ${JSON.stringify(file.link)}`;
      let line = [file.link, ...headers.map((item) => ` header=${item}`), ` out=${file.name}`].join(
        "\n",
      );
      if (checksum) {
        cmdLine += ` --checksum=sha-1=${checksum}`;
        line += `\n checksum=sha-1=${checksum}`;
      }
      cmd.push(cmdLine);
      aria2.push(line);
      idm.push(["<", file.link, ...headers, ">"].join("\r\n"));
      links.push(file.link);
    }

    setValue("#aria2CmdTxt", cmd.join("\n"));
    setHref("#aria2Txt", dataUri(aria2.join("\n")));
    setHref("#idmTxt", dataUri(`${idm.join("\r\n")}\r\n`));
    setHref("#downloadLinkTxt", dataUri(links.join("\n")));
    const copy = document.querySelector<HTMLElement>("#copyDownloadLinkTxt");
    if (copy) {
      copy.dataset.link = links.join("\n");
    }
    document.querySelector("#textMenu")?.classList.add("open-o");
  }

  function setValue(selector: string, value: string): void {
    const el = document.querySelector<HTMLTextAreaElement>(selector);
    if (el) {
      el.value = value;
    }
  }

  function setHref(selector: string, href: string): void {
    const el = document.querySelector<HTMLAnchorElement>(selector);
    if (el) {
      el.href = href;
    }
  }

  async function openAll(files: DownloadInfo[]): Promise<void> {
    for (const file of files) {
      window.open(`https://115.com/?ct=play&ac=location&pickcode=${file.pickcode}`);
      await sleep(config.interval);
    }
  }

  function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, Number(ms) || 0));
  }

  async function walkFolders(
    folders: { cid: string; path: string }[],
    files: Record<string, DownloadSource>,
  ): Promise<void> {
    let done = 0;
    while (folders.length) {
      const folder = folders.pop() as { cid: string; path: string };
      done++;
      toast(`正在获取文件列表... ${done}/${done + folders.length}`, "inf");
      const params: Record<string, string | number> = {
        aid: 1,
        limit: 1000,
        show_dir: 1,
        cid: folder.cid,
      };
      // ponytail: one page per folder, same 1000 item ceiling as the extension.
      const result = await fetchJson<ListResponse>(`https://webapi.115.com/files?${query(params)}`);
      const own = result.path?.[result.path.length - 1]?.name;
      const path = `${folder.path}${own ?? ""}/`;
      for (const item of result.data ?? []) {
        if (item.sha) {
          files[String(item.pc)] = { path, sha1: item.sha };
        } else {
          folders.push({ cid: String(item.cid), path });
        }
      }
      await sleep(config.interval);
    }
  }

  type DownloadSource = { path: string; sha1?: string };

  async function resolveDownload(pickcode: string): Promise<DownloadInfo | null> {
    if (config.vip) {
      const stamp = Math.floor(Date.now() / 1000);
      const { data, key } = secretEncode(JSON.stringify({ pickcode }), stamp);
      const json = await fetchJson<{ state?: boolean; data?: string }>(
        `https://proapi.115.com/app/chrome/downurl?t=${stamp}`,
        `data=${encodeURIComponent(data)}`,
      );
      if (!json.state || !json.data) {
        return null;
      }
      const result = JSON.parse(secretDecode(json.data, key)) as Record<string, ApiDownload>;
      const file = Object.values(result).pop();
      const link = file?.url?.url;
      return link
        ? {
            name: String(file.file_name ?? pickcode),
            link,
            size: Number(file.file_size) || 0,
            pickcode,
          }
        : null;
    }

    const json = await fetchJson<ApiDownload>(
      `https://webapi.115.com/files/download?pickcode=${pickcode}`,
    );
    return json.file_url
      ? {
          name: String(json.file_name ?? pickcode),
          link: json.file_url,
          size: Number(json.file_size) || 0,
          pickcode,
        }
      : null;
  }

  type SelectedItem = { pickcode: string; folderCid: string | null; sha1?: string };

  // Two 115 UIs coexist. The classic template (served in an iframe by the old
  // shell) puts everything on the row: li[rel="item"] carries pick_code,
  // file_type ("0" = folder), cate_id and sha1, so no API round-trip at all.
  function classicSelection(): SelectedItem[] {
    const items: SelectedItem[] = [];
    document.querySelectorAll('li[rel="item"]').forEach((li) => {
      const checkbox = li.querySelector<HTMLInputElement>('input[type="checkbox"]');
      const pickcode = li.getAttribute("pick_code");
      if (!checkbox?.checked || !pickcode) {
        return;
      }
      const isFolder = li.getAttribute("file_type") === "0";
      items.push({
        pickcode,
        folderCid: isFolder ? li.getAttribute("cate_id") : null,
        sha1: li.getAttribute("sha1") || undefined,
      });
    });
    return items;
  }

  // The React shell (/storage/...) marks rows with data-file-id, which equals the
  // item's own id: fid for files, cid for folders (both verified live). Rows carry
  // no pick_code/sha1, so re-fetch the current folder and map id -> item. Note both
  // files AND folders have pc here, so fid/sha — not pc — tell them apart.
  async function reactSelection(): Promise<{ items: SelectedItem[]; missed: number }> {
    const ids = [...document.querySelectorAll<HTMLElement>(".file-list-item[data-file-id]")]
      .filter((li) => li.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked)
      .map((li) => String(li.dataset.fileId));
    if (!ids.length) {
      return { items: [], missed: 0 };
    }
    const cid = new URLSearchParams(location.search).get("cid") ?? "0";
    const result = await fetchJson<ListResponse>(
      `https://webapi.115.com/files?${query({ aid: 1, limit: 1000, show_dir: 1, cid })}`,
    );
    const byId = new Map<string, ApiFile>();
    for (const item of result.data ?? []) {
      const isFile = item.fid !== undefined || item.sha !== undefined;
      if (isFile && item.fid !== undefined) {
        byId.set(String(item.fid), item);
      } else if (!isFile && item.cid !== undefined) {
        byId.set(String(item.cid), item);
      }
    }
    const items: SelectedItem[] = [];
    for (const id of ids) {
      const api = byId.get(id);
      if (!api) {
        continue;
      }
      if (api.fid !== undefined || api.sha !== undefined) {
        items.push({ pickcode: String(api.pc ?? id), folderCid: null, sha1: api.sha });
      } else {
        items.push({ pickcode: id, folderCid: String(api.cid ?? id) });
      }
    }
    return { items, missed: ids.length - items.length };
  }

  async function collectSelection(): Promise<{ items: SelectedItem[]; missed: number }> {
    if (document.querySelector('li[rel="item"]')) {
      return { items: classicSelection(), missed: 0 };
    }
    return reactSelection();
  }

  async function buildTask(): Promise<void> {
    if (running) {
      return;
    }
    if (!listPresent()) {
      toast("没找到文件列表，刷新页面再试", "err");
      return;
    }

    running = true;
    try {
      const { items, missed } = await collectSelection();
      if (!items.length) {
        toast("请选择一下你要保存的文件哦", "war");
        return;
      }
      if (missed) {
        toast(`${missed} 个选中项没对上，可能列表刚变过，已跳过`, "war");
      }

      const folders: { cid: string; path: string }[] = [];
      const files: Record<string, DownloadSource> = {};
      for (const item of items) {
        if (item.folderCid) {
          folders.push({ cid: item.folderCid, path: "" });
        } else {
          files[item.pickcode] = { path: "", sha1: item.sha1 };
        }
      }

      await walkFolders(folders, files);
      toast("正在获取下载地址...", "inf");

      const info: DownloadInfo[] = [];
      for (const pickcode of Object.keys(files)) {
        const file = await resolveDownload(pickcode).catch((error: unknown) => {
          console.warn("[disk115]", pickcode, error);
          return null;
        });
        if (file) {
          file.name = `${files[pickcode].path}${file.name}`;
          file.sha1 = files[pickcode].sha1;
          info.push(file);
        }
        await sleep(config.interval);
      }

      if (!info.length) {
        toast("无法获取下载地址!", "err");
        return;
      }
      if (mode === "RPC") {
        await pushToAria2(info);
      } else if (mode === "TXT") {
        textExport(info);
      } else {
        await openAll(info);
      }
    } catch (error) {
      console.warn("[disk115]", error);
      toast(`出错了: ${error instanceof Error ? error.message : String(error)}`, "err");
    } finally {
      running = false;
    }
  }

  const STYLE = `
.export{cursor:pointer;font-size:14px;line-height:32px;display:inline-block;position:relative;text-align:center;vertical-align:middle;margin-left:12px;width:82px;z-index:1111}
.export.open-o .export-button{border-bottom-left-radius:0;border-bottom-right-radius:0}
.export.open-o .export-menu{display:flex}
.export-button{background:#00a8ff;border-radius:4px;color:#fff!important;display:block}
.export-menu{background:#fff;border-radius:0 0 3px 3px;box-shadow:0 2px 10px rgba(0,0,0,.3);display:none;flex-direction:column;position:absolute;top:100%;left:0;width:100%}
.export-menu-item{display:block}
.export-menu-item:hover{background:#dadada}
.modal{align-items:center;background-color:rgba(0,0,0,.5);display:none;height:100%;justify-content:center;margin:auto;position:fixed;top:0;width:100%;z-index:2147483000}
.modal.open-o{display:flex}
.modal-inner{background-color:#fafafa;border-radius:4px;margin:auto;max-height:90vh;overflow:auto;width:650px}
.modal-header{border-bottom:1px solid #dadada;display:flex;height:40px;line-height:40px}
.modal-title{flex:1;font-weight:700;padding-left:10px}
.modal-close{cursor:pointer;font-size:30px;padding:0 10px}
.modal-body{padding:0 10px}
.modal-footer{border-top:1px solid #dadada;display:flex;padding-bottom:10px}
.setting-menu-message{align-items:center;display:flex;height:20px}
.setting-menu-row{box-sizing:border-box;display:flex;min-height:40px;padding:5px 0}
.setting-menu-row:hover{background-color:#eff4f8}
.setting-menu-input{border:1px solid rgba(0,0,0,.15);border-radius:4px;height:28px;padding:0 10px!important;width:70%}
.setting-menu-input.small-o{width:30%}
.setting-menu-input.textarea-o{height:60px;padding:5px 10px!important}
.setting-menu-input:focus{border-color:#5cb3fd}
.setting-menu-input:disabled{opacity:.5}
.setting-menu-button{border:1px solid rgba(0,0,0,.15);border-radius:4px;color:#666;height:28px;line-height:28px;margin-left:10px;padding:0 10px;text-align:center}
.setting-menu-button:focus,.setting-menu-button:hover{border-color:#5cb3fd;color:#666;text-decoration:none}
.setting-menu-button.large-o{height:40px;line-height:40px;width:120px}
.setting-menu-button.blue-o{background-color:#3b8cff;color:#fff!important}
.setting-menu .version-s{margin-left:auto;margin-right:10px}
.setting-menu-checkbox{cursor:pointer}
.setting-menu-label{padding-left:10px!important;flex:none}
.setting-menu-label.orange-o{color:#e15f00}
.setting-menu-label.for-checkbox{font-size:12px;padding-left:5px}
.setting-menu-name{align-items:center;display:flex;width:20%}
.setting-menu-value{align-items:center;display:flex;flex:1;padding-left:20px!important}
.setting-menu-row>.setting-menu-value{flex-wrap:wrap;gap:6px}
.setting-menu-operate{align-items:flex-end;display:flex;margin-left:auto;padding:10px}
.text-menu-row{box-sizing:border-box;display:flex;justify-content:space-between;padding:10px 0 5px;gap:8px}
.text-menu-row:last-child{height:200px;padding-bottom:10px}
.text-menu-button{border:1px solid rgba(0,0,0,.15);border-radius:4px;color:#666;flex:1;height:38px;line-height:38px;text-align:center}
.text-menu-textarea{border:1px solid rgba(0,0,0,.15);border-radius:4px;padding:5px 10px;resize:none;width:100%}`;

  const MENU_HTML = `
    <div id="exportMenu" class="export">
      <a class="export-button">导出下载</a>
      <div id="aria2List" class="export-menu">
        <div id="rpcButtons"></div>
        <a class="export-menu-item" id="batchOpen" href="javascript:void(0);">批量打开</a>
        <a class="export-menu-item" id="aria2Text" href="javascript:void(0);">文本导出</a>
        <a class="export-menu-item" id="settingButton" href="javascript:void(0);">设置</a>
      </div>
    </div>`;

  const TEXT_HTML = `
    <div id="textMenu" class="modal text-menu">
      <div class="modal-inner">
        <div class="modal-header">
          <div class="modal-title">文本导出</div>
          <div class="modal-close">×</div>
        </div>
        <div class="modal-body">
          <div class="text-menu-row">
            <a class="text-menu-button" href="javascript:void(0);" id="aria2Txt" download="aria2c.down">存为Aria2文件</a>
            <a class="text-menu-button" href="javascript:void(0);" id="idmTxt" download="idm.ef2">存为IDM文件</a>
            <a class="text-menu-button" href="javascript:void(0);" id="downloadLinkTxt" download="link.txt">保存下载链接</a>
            <a class="text-menu-button" href="javascript:void(0);" id="copyDownloadLinkTxt">拷贝下载链接</a>
          </div>
          <div class="text-menu-row">
            <textarea class="text-menu-textarea" wrap="off" spellcheck="false" id="aria2CmdTxt"></textarea>
          </div>
        </div>
      </div>
    </div>`;

  function escapeHtml(value: string): string {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function rpcRow(name = "", url = ""): string {
    return `
      <div class="setting-menu-row rpc-s">
        <div class="setting-menu-name">
          <input class="setting-menu-input name-s" value="${escapeHtml(name)}" spellcheck="false" placeholder="名称">
        </div>
        <div class="setting-menu-value">
          <input class="setting-menu-input url-s" value="${escapeHtml(url)}" spellcheck="false" placeholder="http://token:RPC密钥@127.0.0.1:6800/jsonrpc">
        </div>
      </div>`;
  }

  function settingRows(): string {
    return config.rpcList.map((rpc) => rpcRow(rpc.name, rpc.url)).join("") || rpcRow();
  }

  function checkbox(key: string, label: string): string {
    return `
      <div class="setting-menu-row">
        <div class="setting-menu-name"><label class="setting-menu-label">${label}</label></div>
        <div class="setting-menu-value"><input type="checkbox" class="setting-menu-checkbox ${key}-s"></div>
      </div>`;
  }

  function inputRow(key: string, label: string, value: string, placeholder = ""): string {
    return `
      <div class="setting-menu-row">
        <div class="setting-menu-name"><label class="setting-menu-label">${label}</label></div>
        <div class="setting-menu-value">
          <input class="setting-menu-input ${key}-s" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}" spellcheck="false">
        </div>
      </div>`;
  }

  function settingHtml(): string {
    return `
    <div id="settingMenu" class="modal setting-menu">
      <div class="modal-inner">
        <div class="modal-header">
          <div class="modal-title">导出设置</div>
          <div class="modal-close">×</div>
        </div>
        <div class="modal-body">
          <div class="setting-menu-message">
            <label class="setting-menu-label orange-o" id="message"></label>
          </div>
          <div id="rpcRows">${settingRows()}</div>
          <div class="setting-menu-row">
            <div class="setting-menu-name"><label class="setting-menu-label">RPC 地址</label></div>
            <div class="setting-menu-value">
              <a class="setting-menu-button" id="addRPC" href="javascript:void(0);">添加RPC地址</a>
            </div>
          </div>
          ${checkbox("sha1Check", "SHA1校验")}
          ${checkbox("vip", "115会员")}
          ${checkbox("small", "小文件优先")}
      <div class="setting-menu-row">
        <div class="setting-menu-name"><label class="setting-menu-label">递归下载间隔</label></div>
        <div class="setting-menu-value">
          <input class="setting-menu-input small-o interval-s" type="number" spellcheck="false">
          <label class="setting-menu-label">(单位:毫秒)</label>
          <a class="setting-menu-button version-s" id="testAria2" href="javascript:void(0);">测试连接，成功显示版本号</a>
        </div>
      </div>
      ${inputRow("downloadPath", "下载路径", "", "只能设置为绝对路径")}
      <div class="setting-menu-row">
        <div class="setting-menu-name"><label class="setting-menu-label">User-Agent</label></div>
        <div class="setting-menu-value">
          <input class="setting-menu-input userAgent-s" spellcheck="false">
          <input type="checkbox" class="setting-menu-checkbox browser-userAgent-s">
          <label class="setting-menu-label for-checkbox">使用浏览器 UA</label>
        </div>
      </div>
      ${inputRow("referer", "Referer", "")}
      <div class="setting-menu-row">
        <div class="setting-menu-name"><label class="setting-menu-label">Headers</label></div>
        <div class="setting-menu-value">
          <textarea class="setting-menu-input textarea-o headers-s" spellcheck="false"></textarea>
        </div>
      </div>
      <!-- TODO(extra-cookie): hidden because 115 download links are currently
        self-authenticated (verified: HTTP 206 with no Cookie header at all), so
        the field is dead weight for normal use. It exists as an escape hatch for
        httpOnly cookies (acw_tc, UID, ...) that a userscript cannot read via
        document.cookie, unlike the original extension's chrome.cookies API.
        Re-show this row (remove the display:none below) if downloads start
        failing with 403; the read/write logic for .extraCookie-s is kept intact. -->
      <div class="setting-menu-row" style="display:none">
        <div class="setting-menu-name"><label class="setting-menu-label">额外 Cookie</label></div>
        <div class="setting-menu-value">
          <textarea class="setting-menu-input textarea-o extraCookie-s" spellcheck="false" placeholder="浏览器读不到 httpOnly cookie（如 acw_tc、UID），下载 403 时缺哪个填哪个，形如 acw_tc=xxx; UID=xxx"></textarea>
        </div>
      </div>
        </div>
        <div class="modal-footer">
          <div class="setting-menu-operate">
            <a class="setting-menu-button large-o blue-o" id="apply" href="javascript:void(0);">应用</a>
            <a class="setting-menu-button large-o" id="reset" href="javascript:void(0);">重置</a>
          </div>
        </div>
      </div>
    </div>`;
  }

  function field<T extends HTMLElement = HTMLElement>(selector: string): T | null {
    return document.querySelector<T>(selector);
  }

  function fillSettingForm(): void {
    const rows = field("#rpcRows");
    if (rows) {
      rows.innerHTML = settingRows();
    }
    const check = (selector: string, value: boolean) => {
      const el = field<HTMLInputElement>(selector);
      if (el) {
        el.checked = value;
      }
    };
    const text = (selector: string, value: string) => {
      const el = field<HTMLInputElement>(selector);
      if (el) {
        el.value = value;
      }
    };
    check(".sha1Check-s", config.sha1Check);
    check(".vip-s", config.vip);
    check(".small-s", config.small);
    check(".browser-userAgent-s", config.browserUserAgent);
    text(".interval-s", String(config.interval));
    text(".downloadPath-s", config.downloadPath);
    text(".userAgent-s", config.userAgent);
    text(".referer-s", config.referer);
    text(".headers-s", config.headers);
    text(".extraCookie-s", config.extraCookie);
    const agent = field<HTMLInputElement>(".userAgent-s");
    if (agent) {
      agent.disabled = config.browserUserAgent;
    }
  }

  function readSettingForm(): void {
    const rpcList: Rpc[] = [];
    document.querySelectorAll(".rpc-s").forEach((row) => {
      const name = (row.querySelector(".name-s") as HTMLInputElement).value.trim();
      const url = (row.querySelector(".url-s") as HTMLInputElement).value.trim();
      if (name && url) {
        rpcList.push({ name, url });
      }
    });
    const checked = (selector: string) => !!field<HTMLInputElement>(selector)?.checked;
    config = {
      ...config,
      rpcList: rpcList.length ? rpcList : DEFAULTS.rpcList,
      sha1Check: checked(".sha1Check-s"),
      vip: checked(".vip-s"),
      small: checked(".small-s"),
      interval: Number(field<HTMLInputElement>(".interval-s")?.value) || DEFAULTS.interval,
      downloadPath: field<HTMLInputElement>(".downloadPath-s")?.value ?? "",
      userAgent: field<HTMLInputElement>(".userAgent-s")?.value || DEFAULTS.userAgent,
      browserUserAgent: checked(".browser-userAgent-s"),
      referer: field<HTMLInputElement>(".referer-s")?.value || DEFAULTS.referer,
      headers: field<HTMLTextAreaElement>(".headers-s")?.value ?? "",
      extraCookie: field<HTMLTextAreaElement>(".extraCookie-s")?.value ?? "",
    };
    GM_setValue(CONFIG_KEY, config);
    rpcURL = config.rpcList[0].url;
  }

  function updateRpcMenu(): void {
    const box = field("#rpcButtons");
    if (!box) {
      return;
    }
    box.innerHTML = config.rpcList
      .map(
        (rpc) =>
          `<a class="export-menu-item rpc-button" href="javascript:void(0);" data-url="${escapeHtml(rpc.url)}">${escapeHtml(rpc.name)}</a>`,
      )
      .join("");
    box.querySelectorAll<HTMLElement>(".rpc-button").forEach((btn) => {
      btn.addEventListener("click", () => {
        rpcURL = String(btn.dataset.url);
        mode = "RPC";
        void buildTask();
      });
    });
  }

  // A file list exists in this document if either UI's rows are present. The
  // classic template renders li[rel="item"] inside the list iframe; the React
  // shell renders .file-list-item[data-file-id] in the top document. The script
  // also runs in the classic shell's top document, which has neither — so this
  // gate keeps us from injecting stray UI where there is nothing to export.
  function listPresent(): boolean {
    return !!document.querySelector('li[rel="item"], .file-list-item[data-file-id]');
  }

  // Slot the button into each UI's own selection toolbar so it never covers a
  // native control. Classic: #js_operate_box (before its 取消 button). New UI:
  // the "已选中 N 项" bar, which is the parent of the visible 取消 button. Both
  // toolbars only exist while something is selected, so the button appears
  // exactly when it is useful; the observer re-injects after React remounts it.
  function menuAnchor(): { container: HTMLElement; before: HTMLElement | null } | null {
    const box = field("#js_operate_box");
    if (box) {
      return { container: box, before: box.querySelector(".btn-cancel") };
    }
    const cancel = [...document.querySelectorAll("button")].find(
      (b) => (b.textContent || "").trim() === "取消" && b.getBoundingClientRect().width > 0,
    );
    const bar = cancel?.parentElement;
    if (bar && /已选中/.test(bar.textContent || "")) {
      return { container: bar, before: cancel as HTMLElement };
    }
    return null;
  }

  function injectMenu(): void {
    if (field("#exportMenu")) {
      return;
    }
    const anchor = menuAnchor();
    if (!anchor) {
      return;
    }
    if (anchor.before) {
      anchor.before.insertAdjacentHTML("beforebegin", MENU_HTML);
    } else {
      anchor.container.insertAdjacentHTML("beforeend", MENU_HTML);
    }

    const exportMenu = field<HTMLElement>("#exportMenu");
    if (!exportMenu) {
      return;
    }
    exportMenu.addEventListener("mouseenter", () => exportMenu.classList.add("open-o"));
    exportMenu.addEventListener("mouseleave", () => exportMenu.classList.remove("open-o"));
    // The site drops the selection on mousedown, which would empty the menu first.
    field("#aria2List")?.addEventListener("mousedown", (event) => event.stopPropagation());

    field("#settingButton")?.addEventListener("click", () => {
      fillSettingForm();
      field("#settingMenu")?.classList.add("open-o");
    });
    field("#aria2Text")?.addEventListener("click", () => {
      mode = "TXT";
      void buildTask();
    });
    field("#batchOpen")?.addEventListener("click", () => {
      mode = "OPEN";
      void buildTask();
    });
    updateRpcMenu();
  }

  async function testAria2(element: HTMLElement): Promise<void> {
    try {
      const rpc = parseRpcUrl(config.rpcList[0].url);
      const params: unknown[] = [];
      if (rpc.auth?.startsWith("token")) {
        params.push(rpc.auth);
      }
      const result = (await rpcPost(rpc, "aria2.getVersion", params)) as
        | { version?: string }
        | undefined;
      element.textContent = result?.version
        ? `Aria2版本为: ${result.version}`
        : "错误,请查看是否开启Aria2";
    } catch {
      element.textContent = "错误,请查看是否开启Aria2";
    }
  }

  // Style + the two modals live on <body> once; the export button itself is
  // re-injected into the toolbar as it mounts and unmounts with the selection.
  let chromeReady = false;

  function buildUi(): void {
    const style = document.createElement("style");
    style.textContent = STYLE;
    document.head.appendChild(style);
    document.body.insertAdjacentHTML("beforeend", `${TEXT_HTML}${settingHtml()}`);

    field("#textMenu .modal-close")?.addEventListener("click", () => {
      field("#textMenu")?.classList.remove("open-o");
    });
    field("#copyDownloadLinkTxt")?.addEventListener("click", () => {
      const link = field<HTMLElement>("#copyDownloadLinkTxt")?.dataset.link ?? "";
      navigator.clipboard
        .writeText(link)
        .then(() => toast("拷贝成功~", "inf"))
        .catch(() => toast("拷贝失败 QAQ", "err"));
    });

    field("#settingMenu .modal-close")?.addEventListener("click", () => {
      field("#settingMenu")?.classList.remove("open-o");
    });
    field("#addRPC")?.addEventListener("click", () => {
      field("#rpcRows")?.insertAdjacentHTML("beforeend", rpcRow());
    });
    field("#apply")?.addEventListener("click", () => {
      readSettingForm();
      updateRpcMenu();
      const message = field("#message");
      if (message) {
        message.textContent = "设置已保存";
      }
    });
    field("#reset")?.addEventListener("click", () => {
      GM_deleteValue(CONFIG_KEY);
      config = loadConfig();
      fillSettingForm();
      updateRpcMenu();
      const message = field("#message");
      if (message) {
        message.textContent = "设置已重置";
      }
    });
    field("#testAria2")?.addEventListener("click", (event) => {
      void testAria2(event.currentTarget as HTMLElement);
    });
    field(".browser-userAgent-s")?.addEventListener("change", (event) => {
      const agent = field<HTMLInputElement>(".userAgent-s");
      if (agent) {
        agent.disabled = (event.currentTarget as HTMLInputElement).checked;
      }
    });
  }

  function tick(): void {
    if (!listPresent()) {
      return;
    }
    if (!chromeReady) {
      chromeReady = true;
      buildUi();
      toast("115 aria2 脚本就绪", "inf");
    }
    injectMenu();
  }

  function boot(): void {
    tick();
    // The toolbar mounts late and remounts with the selection (new UI) or on
    // iframe load (classic), so keep watching and re-inject whenever it returns.
    const observer = new MutationObserver(() => tick());
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.body) {
    boot();
  } else {
    document.addEventListener("DOMContentLoaded", boot);
  }
})();
