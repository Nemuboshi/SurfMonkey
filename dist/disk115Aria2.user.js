// ==UserScript==
// @name 115 网盘 aria2 推送
// @namespace github.com/Nemuboshi/SurfMonkey
// @version 1.0.0
// @description 115 网盘文件列表推送到 aria2 RPC / 导出 Aria2·IDM·直链文本（115Exporter 扩展的用户脚本移植版）。
// @match https://115.com/*
// @match https://webapi.115.com/*
// @match https://proapi.115.com/*
// @grant GM_getValue
// @grant GM_setValue
// @grant GM_deleteValue
// @grant GM_xmlhttpRequest
// @connect *
// @run-at document-start
// ==/UserScript==

"use strict";
(() => {
  // src/userscripts/disk115Aria2.ts
  var KTS = [
    240,
    229,
    105,
    174,
    191,
    220,
    191,
    138,
    26,
    69,
    232,
    190,
    125,
    166,
    115,
    184,
    222,
    143,
    231,
    196,
    69,
    218,
    134,
    196,
    155,
    100,
    139,
    20,
    106,
    180,
    241,
    170,
    56,
    1,
    53,
    158,
    38,
    105,
    44,
    134,
    0,
    107,
    79,
    165,
    54,
    52,
    98,
    166,
    42,
    150,
    104,
    24,
    242,
    74,
    253,
    189,
    107,
    151,
    143,
    77,
    143,
    137,
    19,
    183,
    108,
    142,
    147,
    237,
    14,
    13,
    72,
    62,
    215,
    47,
    136,
    216,
    254,
    254,
    126,
    134,
    80,
    149,
    79,
    209,
    235,
    131,
    38,
    52,
    219,
    102,
    123,
    156,
    126,
    157,
    122,
    129,
    50,
    234,
    182,
    51,
    222,
    58,
    169,
    89,
    52,
    102,
    59,
    170,
    186,
    129,
    96,
    72,
    185,
    213,
    129,
    156,
    248,
    108,
    132,
    119,
    255,
    84,
    120,
    38,
    95,
    190,
    232,
    30,
    54,
    159,
    52,
    128,
    92,
    69,
    44,
    155,
    118,
    213,
    27,
    143,
    204,
    195,
    184,
    245
  ];
  var KEY_S = [41, 35, 33, 94];
  var KEY_L = [120, 6, 173, 76, 51, 134, 93, 24, 76, 1, 63, 70];
  var MD5_S = [
    7,
    12,
    17,
    22,
    7,
    12,
    17,
    22,
    7,
    12,
    17,
    22,
    7,
    12,
    17,
    22,
    5,
    9,
    14,
    20,
    5,
    9,
    14,
    20,
    5,
    9,
    14,
    20,
    5,
    9,
    14,
    20,
    4,
    11,
    16,
    23,
    4,
    11,
    16,
    23,
    4,
    11,
    16,
    23,
    4,
    11,
    16,
    23,
    6,
    10,
    15,
    21,
    6,
    10,
    15,
    21,
    6,
    10,
    15,
    21,
    6,
    10,
    15,
    21
  ];
  var MD5_K = (() => {
    const table = [];
    for (let i = 0; i < 64; i++) {
      table.push(Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) | 0);
    }
    return table;
  })();
  function rotateLeft(value, shift) {
    return value << shift | value >>> 32 - shift;
  }
  function toLeHex(value) {
    let hex = "";
    for (let i = 0; i < 4; i++) {
      hex += (value >>> i * 8 & 255).toString(16).padStart(2, "0");
    }
    return hex;
  }
  function md5Bytes(bytes) {
    const length = bytes.length;
    const total = Math.ceil((length + 9) / 64) * 64;
    const message = new Uint8Array(total);
    message.set(bytes);
    message[length] = 128;
    const view = new DataView(message.buffer);
    const bitLength = length * 8;
    view.setUint32(total - 8, bitLength >>> 0, true);
    view.setUint32(total - 4, Math.floor(bitLength / 4294967296), true);
    let a0 = 1732584193;
    let b0 = 4023233417;
    let c0 = 2562383102;
    let d0 = 271733878;
    for (let offset = 0; offset < total; offset += 64) {
      const w = [];
      for (let j = 0; j < 16; j++) {
        w.push(view.getInt32(offset + j * 4, true));
      }
      let a = a0;
      let b = b0;
      let c = c0;
      let d = d0;
      for (let j = 0; j < 64; j++) {
        let f;
        let g;
        if (j < 16) {
          f = b & c | ~b & d;
          g = j;
        } else if (j < 32) {
          f = d & b | ~d & c;
          g = (5 * j + 1) % 16;
        } else if (j < 48) {
          f = b ^ c ^ d;
          g = (3 * j + 5) % 16;
        } else {
          f = c ^ (b | ~d);
          g = 7 * j % 16;
        }
        f = f + a + MD5_K[j] + w[g] | 0;
        a = d;
        d = c;
        c = b;
        b = b + rotateLeft(f, MD5_S[j]) | 0;
      }
      a0 = a0 + a | 0;
      b0 = b0 + b | 0;
      c0 = c0 + c | 0;
      d0 = d0 + d | 0;
    }
    return toLeHex(a0) + toLeHex(b0) + toLeHex(c0) + toLeHex(d0);
  }
  function md5(text) {
    return md5Bytes(new TextEncoder().encode(text));
  }
  var RSA_N = BigInt(
    "0x8686980c0f5a24c4b9d43020cd2c22703ff3f450756529058b1cf88f09b8602136477198a6e2683149659bd122c33592fdb5ad47944ad1ea4d36c6b172aad6338c3bb6ac6227502d010993ac967d1aef00f0c8e038de2e4d3bc2ec368af2e9f10a6f1eda4f7262f136420c07c331b871bf139f74f3010e3c4fe57df3afb71683"
  );
  var RSA_E = BigInt(65537);
  function modPow(base, exponent, modulus) {
    const zero = BigInt(0);
    const one = BigInt(1);
    const two = BigInt(2);
    let result = one;
    let value = (base % modulus + modulus) % modulus;
    let power = exponent;
    while (power > zero) {
      if (power % two === one) {
        result = result * value % modulus;
      }
      value = value * value % modulus;
      power = power / two;
    }
    return result;
  }
  function a2hex(bytes) {
    return bytes.map((byte) => (byte & 255).toString(16).padStart(2, "0")).join("");
  }
  function hex2a(hex) {
    let text = "";
    for (let i = 0; i < hex.length; i += 2) {
      text += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
    }
    return text;
  }
  function stringToBytes(text) {
    const bytes = [];
    for (let i = 0; i < text.length; i++) {
      bytes.push(text.charCodeAt(i) & 255);
    }
    return bytes;
  }
  function bytesToString(bytes) {
    let text = "";
    for (const byte of bytes) {
      text += String.fromCharCode(byte);
    }
    return text;
  }
  function pkcs1pad2(text, size) {
    if (size < text.length + 11) {
      return BigInt(0);
    }
    const block = [];
    let cursor = size;
    let index = text.length - 1;
    while (index >= 0 && cursor > 0) {
      block[--cursor] = text.charCodeAt(index--);
    }
    block[--cursor] = 0;
    while (cursor > 2) {
      block[--cursor] = 255;
    }
    block[--cursor] = 2;
    block[--cursor] = 0;
    return BigInt(`0x${a2hex(block)}`);
  }
  function pkcs1unpad2(value) {
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
  function rsaEncrypt(text) {
    const cipher = modPow(pkcs1pad2(text, 128), RSA_E, RSA_N).toString(16);
    return cipher.padStart(256, "0");
  }
  function rsaDecrypt(text) {
    const value = BigInt(`0x${a2hex(stringToBytes(text))}`);
    return pkcs1unpad2(modPow(value, RSA_E, RSA_N));
  }
  function getKey(length, key) {
    if (key) {
      const result = [];
      for (let i = 0; i < length; i++) {
        result.push(key[i] + KTS[length * i] & 255 ^ KTS[length * (length - 1 - i)]);
      }
      return result;
    }
    return length === 12 ? KEY_L.slice(0) : KEY_S.slice(0);
  }
  function xor115Enc(src, srclen, key, keylen) {
    const mod4 = srclen % 4;
    const ret = [];
    for (let i = 0; i < mod4; i++) {
      ret.push(src[i] ^ key[i % keylen]);
    }
    for (let i = mod4; i < srclen; i++) {
      ret.push(src[i] ^ key[(i - mod4) % keylen]);
    }
    return ret;
  }
  function symEncode(src, srclen, key1, key2) {
    const ret = xor115Enc(src, srclen, getKey(4, key1), 4);
    ret.reverse();
    return xor115Enc(ret, srclen, getKey(12, key2), 12);
  }
  function symDecode(src, srclen, key1, key2) {
    const ret = xor115Enc(src, srclen, getKey(12, key2), 12);
    ret.reverse();
    return xor115Enc(ret, srclen, getKey(4, key1), 4);
  }
  function asymEncode(src, srclen) {
    const size = 128 - 11;
    let hex = "";
    for (let i = 0; i < Math.floor((srclen + size - 1) / size); i++) {
      hex += rsaEncrypt(bytesToString(src.slice(i * size, Math.min((i + 1) * size, srclen))));
    }
    return btoa(hex2a(hex));
  }
  function asymDecode(src, srclen) {
    let text = "";
    for (let i = 0; i < Math.floor((srclen + 127) / 128); i++) {
      text += rsaDecrypt(bytesToString(src.slice(i * 128, Math.min((i + 1) * 128, srclen))));
    }
    return stringToBytes(text);
  }
  function secretEncode(str, timestamp) {
    const key = stringToBytes(md5(`!@###@#${timestamp}DFDR@#@#`));
    const src = stringToBytes(str);
    const body = symEncode(src, src.length, key, null);
    const temp = key.slice(0, 16).concat(body);
    return { data: asymEncode(temp, temp.length), key };
  }
  function secretDecode(str, key) {
    const packed = stringToBytes(atob(str));
    const temp = asymDecode(packed, packed.length);
    return bytesToString(symDecode(temp.slice(16), temp.length - 16, key, temp.slice(0, 16)));
  }
  (() => {
    if (typeof document === "undefined") {
      return;
    }
    const CONFIG_KEY = "disk115.config";
    const TIMEOUT_MS = 3e4;
    const DEFAULTS = {
      rpcList: [{ name: "ARIA2 RPC", url: "http://localhost:6800/jsonrpc" }],
      sha1Check: false,
      vip: true,
      small: false,
      interval: 300,
      downloadPath: "",
      userAgent: "Mozilla/5.0 (Windows NT 5.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.63 Safari/537.36 115Browser/5.1.3",
      browserUserAgent: true,
      referer: "https://115.com/",
      headers: "",
      extraCookie: ""
    };
    let config = loadConfig();
    let mode = "RPC";
    let rpcURL = config.rpcList[0].url;
    let running = false;
    function loadConfig() {
      var _a;
      const stored = { ...DEFAULTS, ...GM_getValue(CONFIG_KEY, {}) };
      if (!((_a = stored.rpcList) == null ? void 0 : _a.length)) {
        stored.rpcList = DEFAULTS.rpcList;
      }
      return stored;
    }
    function toast(message, type) {
      const colors = { inf: "#4caf50", err: "#f44336", war: "#ff9800" };
      let box = document.getElementById("__115_ext_toast");
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
          pointerEvents: "none"
        });
        document.body.appendChild(box);
      }
      box.style.background = colors[type];
      box.style.opacity = "1";
      box.textContent = message;
      clearTimeout(box.timer);
      box.timer = setTimeout(() => {
        box.style.opacity = "0";
      }, 3e3);
    }
    function gmXhr(details) {
      return new Promise((resolve, reject) => {
        if (typeof GM_xmlhttpRequest !== "function") {
          reject(new Error("GM_xmlhttpRequest \u4E0D\u53EF\u7528"));
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
          onerror: () => reject(new Error(`\u8BF7\u6C42\u5931\u8D25: ${details.url}`)),
          ontimeout: () => reject(new Error(`\u8BF7\u6C42\u8D85\u65F6: ${details.url}`))
        });
      });
    }
    async function fetchJson(url, body) {
      const headers = { "Content-Type": "application/x-www-form-urlencoded" };
      const response = await gmXhr({
        method: body ? "POST" : "GET",
        url,
        headers: body ? headers : void 0,
        data: body
      });
      return JSON.parse(response.responseText);
    }
    function query(params) {
      return Object.keys(params).map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(String(params[key]))}`).join("&");
    }
    function cookieString() {
      return [document.cookie, config.extraCookie].filter(Boolean).join("; ");
    }
    function headerLines() {
      const userAgent = config.browserUserAgent ? navigator.userAgent : config.userAgent;
      const lines = [
        `User-Agent: ${userAgent}`,
        `Referer: ${config.referer}`,
        `Cookie: ${cookieString()}`
      ];
      for (const line of config.headers.split(/\r?\n/)) {
        if (line) {
          lines.push(line);
        }
      }
      return lines;
    }
    function parseRpcUrl(raw) {
      const parsed = new URL(raw);
      let auth = parsed.username ? `${parsed.username}:${decodeURI(parsed.password)}` : null;
      if (auth && !auth.includes("token:")) {
        auth = `Basic ${btoa(auth)}`;
      }
      const options = {};
      for (const [key, value] of new URLSearchParams(parsed.hash.slice(1))) {
        options[key] = value.length ? value : "enabled";
      }
      return { auth, url: parsed.origin + parsed.pathname, options };
    }
    async function rpcPost(rpc, method, params) {
      var _a;
      const headers = { "Content-Type": "application/json" };
      const body = { jsonrpc: "2.0", id: Date.now(), method, params };
      if ((_a = rpc.auth) == null ? void 0 : _a.startsWith("Basic")) {
        headers.Authorization = rpc.auth;
      }
      const response = await gmXhr({
        method: "POST",
        url: rpc.url,
        headers,
        data: JSON.stringify(body)
      });
      const json = JSON.parse(response.responseText);
      if (json.error) {
        throw new Error(json.error.message || "aria2 RPC error");
      }
      return json.result;
    }
    function rpcOptions(rpc, file) {
      const options = { out: file.name, header: headerLines() };
      if (config.downloadPath) {
        options.dir = config.downloadPath;
      }
      if (config.sha1Check && file.sha1) {
        options.checksum = `sha-1=${file.sha1}`;
      }
      return Object.assign(options, rpc.options);
    }
    async function pushToAria2(files) {
      var _a, _b;
      const rpc = parseRpcUrl(rpcURL);
      const withToken = (_b = (_a = rpc.auth) == null ? void 0 : _a.startsWith("token")) != null ? _b : false;
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
        toast(`${failed}/${list.length} \u4E2A\u4EFB\u52A1\u63A8\u9001\u5931\u8D25\uFF0C\u68C0\u67E5 aria2 \u662F\u5426\u5F00\u542F`, "err");
      } else {
        toast(`\u5DF2\u63A8\u9001 ${list.length} \u4E2A\u4EFB\u52A1\uFF0C\u8D76\u7D27\u53BB\u770B\u770B\u5427~`, "inf");
      }
    }
    function dataUri(text) {
      return `data:text/plain;charset=utf-8,${encodeURIComponent(text)}`;
    }
    function textExport(files) {
      var _a;
      const cmd = [];
      const aria2 = [];
      const idm = [];
      const links = [];
      const headers = headerLines();
      for (const file of files) {
        const checksum = config.sha1Check && file.sha1 ? file.sha1 : "";
        let cmdLine = `aria2c -c -s10 -k1M -x16 --enable-rpc=false -o ${JSON.stringify(file.name)} `;
        cmdLine += headers.map((line2) => `--header ${JSON.stringify(line2)}`).join(" ");
        cmdLine += ` ${JSON.stringify(file.link)}`;
        let line = [file.link, ...headers.map((item) => ` header=${item}`), ` out=${file.name}`].join(
          "\n"
        );
        if (checksum) {
          cmdLine += ` --checksum=sha-1=${checksum}`;
          line += `
 checksum=sha-1=${checksum}`;
        }
        cmd.push(cmdLine);
        aria2.push(line);
        idm.push(["<", file.link, ...headers, ">"].join("\r\n"));
        links.push(file.link);
      }
      setValue("#aria2CmdTxt", cmd.join("\n"));
      setHref("#aria2Txt", dataUri(aria2.join("\n")));
      setHref("#idmTxt", dataUri(`${idm.join("\r\n")}\r
`));
      setHref("#downloadLinkTxt", dataUri(links.join("\n")));
      const copy = document.querySelector("#copyDownloadLinkTxt");
      if (copy) {
        copy.dataset.link = links.join("\n");
      }
      (_a = document.querySelector("#textMenu")) == null ? void 0 : _a.classList.add("open-o");
    }
    function setValue(selector, value) {
      const el = document.querySelector(selector);
      if (el) {
        el.value = value;
      }
    }
    function setHref(selector, href) {
      const el = document.querySelector(selector);
      if (el) {
        el.href = href;
      }
    }
    async function openAll(files) {
      for (const file of files) {
        window.open(`https://115.com/?ct=play&ac=location&pickcode=${file.pickcode}`);
        await sleep(config.interval);
      }
    }
    function sleep(ms) {
      return new Promise((resolve) => setTimeout(resolve, Number(ms) || 0));
    }
    async function walkFolders(folders, files) {
      var _a, _b, _c;
      let done = 0;
      while (folders.length) {
        const folder = folders.pop();
        done++;
        toast(`\u6B63\u5728\u83B7\u53D6\u6587\u4EF6\u5217\u8868... ${done}/${done + folders.length}`, "inf");
        const params = {
          aid: 1,
          limit: 1e3,
          show_dir: 1,
          cid: folder.cid
        };
        const result = await fetchJson(`https://webapi.115.com/files?${query(params)}`);
        const own = (_b = (_a = result.path) == null ? void 0 : _a[result.path.length - 1]) == null ? void 0 : _b.name;
        const path = `${folder.path}${own != null ? own : ""}/`;
        for (const item of (_c = result.data) != null ? _c : []) {
          if (item.sha) {
            files[String(item.pc)] = { path, sha1: item.sha };
          } else {
            folders.push({ cid: String(item.cid), path });
          }
        }
        await sleep(config.interval);
      }
    }
    async function resolveDownload(pickcode) {
      var _a, _b, _c;
      if (config.vip) {
        const stamp = Math.floor(Date.now() / 1e3);
        const { data, key } = secretEncode(JSON.stringify({ pickcode }), stamp);
        const json2 = await fetchJson(
          `https://proapi.115.com/app/chrome/downurl?t=${stamp}`,
          `data=${encodeURIComponent(data)}`
        );
        if (!json2.state || !json2.data) {
          return null;
        }
        const result = JSON.parse(secretDecode(json2.data, key));
        const file = Object.values(result).pop();
        const link = (_a = file == null ? void 0 : file.url) == null ? void 0 : _a.url;
        return link ? {
          name: String((_b = file.file_name) != null ? _b : pickcode),
          link,
          size: Number(file.file_size) || 0,
          pickcode
        } : null;
      }
      const json = await fetchJson(
        `https://webapi.115.com/files/download?pickcode=${pickcode}`
      );
      return json.file_url ? {
        name: String((_c = json.file_name) != null ? _c : pickcode),
        link: json.file_url,
        size: Number(json.file_size) || 0,
        pickcode
      } : null;
    }
    function classicSelection() {
      const items = [];
      document.querySelectorAll('li[rel="item"]').forEach((li) => {
        const checkbox2 = li.querySelector('input[type="checkbox"]');
        const pickcode = li.getAttribute("pick_code");
        if (!(checkbox2 == null ? void 0 : checkbox2.checked) || !pickcode) {
          return;
        }
        const isFolder = li.getAttribute("file_type") === "0";
        items.push({
          pickcode,
          folderCid: isFolder ? li.getAttribute("cate_id") : null,
          sha1: li.getAttribute("sha1") || void 0
        });
      });
      return items;
    }
    async function reactSelection() {
      var _a, _b, _c, _d;
      const ids = [...document.querySelectorAll(".file-list-item[data-file-id]")].filter((li) => {
        var _a2;
        return (_a2 = li.querySelector('input[type="checkbox"]')) == null ? void 0 : _a2.checked;
      }).map((li) => String(li.dataset.fileId));
      if (!ids.length) {
        return { items: [], missed: 0 };
      }
      const cid = (_a = new URLSearchParams(location.search).get("cid")) != null ? _a : "0";
      const result = await fetchJson(
        `https://webapi.115.com/files?${query({ aid: 1, limit: 1e3, show_dir: 1, cid })}`
      );
      const byId = /* @__PURE__ */ new Map();
      for (const item of (_b = result.data) != null ? _b : []) {
        const isFile = item.fid !== void 0 || item.sha !== void 0;
        if (isFile && item.fid !== void 0) {
          byId.set(String(item.fid), item);
        } else if (!isFile && item.cid !== void 0) {
          byId.set(String(item.cid), item);
        }
      }
      const items = [];
      for (const id of ids) {
        const api = byId.get(id);
        if (!api) {
          continue;
        }
        if (api.fid !== void 0 || api.sha !== void 0) {
          items.push({ pickcode: String((_c = api.pc) != null ? _c : id), folderCid: null, sha1: api.sha });
        } else {
          items.push({ pickcode: id, folderCid: String((_d = api.cid) != null ? _d : id) });
        }
      }
      return { items, missed: ids.length - items.length };
    }
    async function collectSelection() {
      if (document.querySelector('li[rel="item"]')) {
        return { items: classicSelection(), missed: 0 };
      }
      return reactSelection();
    }
    async function buildTask() {
      if (running) {
        return;
      }
      if (!listPresent()) {
        toast("\u6CA1\u627E\u5230\u6587\u4EF6\u5217\u8868\uFF0C\u5237\u65B0\u9875\u9762\u518D\u8BD5", "err");
        return;
      }
      running = true;
      try {
        const { items, missed } = await collectSelection();
        if (!items.length) {
          toast("\u8BF7\u9009\u62E9\u4E00\u4E0B\u4F60\u8981\u4FDD\u5B58\u7684\u6587\u4EF6\u54E6", "war");
          return;
        }
        if (missed) {
          toast(`${missed} \u4E2A\u9009\u4E2D\u9879\u6CA1\u5BF9\u4E0A\uFF0C\u53EF\u80FD\u5217\u8868\u521A\u53D8\u8FC7\uFF0C\u5DF2\u8DF3\u8FC7`, "war");
        }
        const folders = [];
        const files = {};
        for (const item of items) {
          if (item.folderCid) {
            folders.push({ cid: item.folderCid, path: "" });
          } else {
            files[item.pickcode] = { path: "", sha1: item.sha1 };
          }
        }
        await walkFolders(folders, files);
        toast("\u6B63\u5728\u83B7\u53D6\u4E0B\u8F7D\u5730\u5740...", "inf");
        const info = [];
        for (const pickcode of Object.keys(files)) {
          const file = await resolveDownload(pickcode).catch((error) => {
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
          toast("\u65E0\u6CD5\u83B7\u53D6\u4E0B\u8F7D\u5730\u5740!", "err");
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
        toast(`\u51FA\u9519\u4E86: ${error instanceof Error ? error.message : String(error)}`, "err");
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
      <a class="export-button">\u5BFC\u51FA\u4E0B\u8F7D</a>
      <div id="aria2List" class="export-menu">
        <div id="rpcButtons"></div>
        <a class="export-menu-item" id="batchOpen" href="javascript:void(0);">\u6279\u91CF\u6253\u5F00</a>
        <a class="export-menu-item" id="aria2Text" href="javascript:void(0);">\u6587\u672C\u5BFC\u51FA</a>
        <a class="export-menu-item" id="settingButton" href="javascript:void(0);">\u8BBE\u7F6E</a>
      </div>
    </div>`;
    const TEXT_HTML = `
    <div id="textMenu" class="modal text-menu">
      <div class="modal-inner">
        <div class="modal-header">
          <div class="modal-title">\u6587\u672C\u5BFC\u51FA</div>
          <div class="modal-close">\xD7</div>
        </div>
        <div class="modal-body">
          <div class="text-menu-row">
            <a class="text-menu-button" href="javascript:void(0);" id="aria2Txt" download="aria2c.down">\u5B58\u4E3AAria2\u6587\u4EF6</a>
            <a class="text-menu-button" href="javascript:void(0);" id="idmTxt" download="idm.ef2">\u5B58\u4E3AIDM\u6587\u4EF6</a>
            <a class="text-menu-button" href="javascript:void(0);" id="downloadLinkTxt" download="link.txt">\u4FDD\u5B58\u4E0B\u8F7D\u94FE\u63A5</a>
            <a class="text-menu-button" href="javascript:void(0);" id="copyDownloadLinkTxt">\u62F7\u8D1D\u4E0B\u8F7D\u94FE\u63A5</a>
          </div>
          <div class="text-menu-row">
            <textarea class="text-menu-textarea" wrap="off" spellcheck="false" id="aria2CmdTxt"></textarea>
          </div>
        </div>
      </div>
    </div>`;
    function escapeHtml(value) {
      return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }
    function rpcRow(name = "", url = "") {
      return `
      <div class="setting-menu-row rpc-s">
        <div class="setting-menu-name">
          <input class="setting-menu-input name-s" value="${escapeHtml(name)}" spellcheck="false" placeholder="\u540D\u79F0">
        </div>
        <div class="setting-menu-value">
          <input class="setting-menu-input url-s" value="${escapeHtml(url)}" spellcheck="false" placeholder="http://token:RPC\u5BC6\u94A5@127.0.0.1:6800/jsonrpc">
        </div>
      </div>`;
    }
    function settingRows() {
      return config.rpcList.map((rpc) => rpcRow(rpc.name, rpc.url)).join("") || rpcRow();
    }
    function checkbox(key, label) {
      return `
      <div class="setting-menu-row">
        <div class="setting-menu-name"><label class="setting-menu-label">${label}</label></div>
        <div class="setting-menu-value"><input type="checkbox" class="setting-menu-checkbox ${key}-s"></div>
      </div>`;
    }
    function inputRow(key, label, value, placeholder = "") {
      return `
      <div class="setting-menu-row">
        <div class="setting-menu-name"><label class="setting-menu-label">${label}</label></div>
        <div class="setting-menu-value">
          <input class="setting-menu-input ${key}-s" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}" spellcheck="false">
        </div>
      </div>`;
    }
    function settingHtml() {
      return `
    <div id="settingMenu" class="modal setting-menu">
      <div class="modal-inner">
        <div class="modal-header">
          <div class="modal-title">\u5BFC\u51FA\u8BBE\u7F6E</div>
          <div class="modal-close">\xD7</div>
        </div>
        <div class="modal-body">
          <div class="setting-menu-message">
            <label class="setting-menu-label orange-o" id="message"></label>
          </div>
          <div id="rpcRows">${settingRows()}</div>
          <div class="setting-menu-row">
            <div class="setting-menu-name"><label class="setting-menu-label">RPC \u5730\u5740</label></div>
            <div class="setting-menu-value">
              <a class="setting-menu-button" id="addRPC" href="javascript:void(0);">\u6DFB\u52A0RPC\u5730\u5740</a>
            </div>
          </div>
          ${checkbox("sha1Check", "SHA1\u6821\u9A8C")}
          ${checkbox("vip", "115\u4F1A\u5458")}
          ${checkbox("small", "\u5C0F\u6587\u4EF6\u4F18\u5148")}
      <div class="setting-menu-row">
        <div class="setting-menu-name"><label class="setting-menu-label">\u9012\u5F52\u4E0B\u8F7D\u95F4\u9694</label></div>
        <div class="setting-menu-value">
          <input class="setting-menu-input small-o interval-s" type="number" spellcheck="false">
          <label class="setting-menu-label">(\u5355\u4F4D:\u6BEB\u79D2)</label>
          <a class="setting-menu-button version-s" id="testAria2" href="javascript:void(0);">\u6D4B\u8BD5\u8FDE\u63A5\uFF0C\u6210\u529F\u663E\u793A\u7248\u672C\u53F7</a>
        </div>
      </div>
      ${inputRow("downloadPath", "\u4E0B\u8F7D\u8DEF\u5F84", "", "\u53EA\u80FD\u8BBE\u7F6E\u4E3A\u7EDD\u5BF9\u8DEF\u5F84")}
      <div class="setting-menu-row">
        <div class="setting-menu-name"><label class="setting-menu-label">User-Agent</label></div>
        <div class="setting-menu-value">
          <input class="setting-menu-input userAgent-s" spellcheck="false">
          <input type="checkbox" class="setting-menu-checkbox browser-userAgent-s">
          <label class="setting-menu-label for-checkbox">\u4F7F\u7528\u6D4F\u89C8\u5668 UA</label>
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
        <div class="setting-menu-name"><label class="setting-menu-label">\u989D\u5916 Cookie</label></div>
        <div class="setting-menu-value">
          <textarea class="setting-menu-input textarea-o extraCookie-s" spellcheck="false" placeholder="\u6D4F\u89C8\u5668\u8BFB\u4E0D\u5230 httpOnly cookie\uFF08\u5982 acw_tc\u3001UID\uFF09\uFF0C\u4E0B\u8F7D 403 \u65F6\u7F3A\u54EA\u4E2A\u586B\u54EA\u4E2A\uFF0C\u5F62\u5982 acw_tc=xxx; UID=xxx"></textarea>
        </div>
      </div>
        </div>
        <div class="modal-footer">
          <div class="setting-menu-operate">
            <a class="setting-menu-button large-o blue-o" id="apply" href="javascript:void(0);">\u5E94\u7528</a>
            <a class="setting-menu-button large-o" id="reset" href="javascript:void(0);">\u91CD\u7F6E</a>
          </div>
        </div>
      </div>
    </div>`;
    }
    function field(selector) {
      return document.querySelector(selector);
    }
    function fillSettingForm() {
      const rows = field("#rpcRows");
      if (rows) {
        rows.innerHTML = settingRows();
      }
      const check = (selector, value) => {
        const el = field(selector);
        if (el) {
          el.checked = value;
        }
      };
      const text = (selector, value) => {
        const el = field(selector);
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
      const agent = field(".userAgent-s");
      if (agent) {
        agent.disabled = config.browserUserAgent;
      }
    }
    function readSettingForm() {
      var _a, _b, _c, _d, _e, _f, _g, _h, _i;
      const rpcList = [];
      document.querySelectorAll(".rpc-s").forEach((row) => {
        const name = row.querySelector(".name-s").value.trim();
        const url = row.querySelector(".url-s").value.trim();
        if (name && url) {
          rpcList.push({ name, url });
        }
      });
      const checked = (selector) => {
        var _a2;
        return !!((_a2 = field(selector)) == null ? void 0 : _a2.checked);
      };
      config = {
        ...config,
        rpcList: rpcList.length ? rpcList : DEFAULTS.rpcList,
        sha1Check: checked(".sha1Check-s"),
        vip: checked(".vip-s"),
        small: checked(".small-s"),
        interval: Number((_a = field(".interval-s")) == null ? void 0 : _a.value) || DEFAULTS.interval,
        downloadPath: (_c = (_b = field(".downloadPath-s")) == null ? void 0 : _b.value) != null ? _c : "",
        userAgent: ((_d = field(".userAgent-s")) == null ? void 0 : _d.value) || DEFAULTS.userAgent,
        browserUserAgent: checked(".browser-userAgent-s"),
        referer: ((_e = field(".referer-s")) == null ? void 0 : _e.value) || DEFAULTS.referer,
        headers: (_g = (_f = field(".headers-s")) == null ? void 0 : _f.value) != null ? _g : "",
        extraCookie: (_i = (_h = field(".extraCookie-s")) == null ? void 0 : _h.value) != null ? _i : ""
      };
      GM_setValue(CONFIG_KEY, config);
      rpcURL = config.rpcList[0].url;
    }
    function updateRpcMenu() {
      const box = field("#rpcButtons");
      if (!box) {
        return;
      }
      box.innerHTML = config.rpcList.map(
        (rpc) => `<a class="export-menu-item rpc-button" href="javascript:void(0);" data-url="${escapeHtml(rpc.url)}">${escapeHtml(rpc.name)}</a>`
      ).join("");
      box.querySelectorAll(".rpc-button").forEach((btn) => {
        btn.addEventListener("click", () => {
          rpcURL = String(btn.dataset.url);
          mode = "RPC";
          void buildTask();
        });
      });
    }
    function listPresent() {
      return !!document.querySelector('li[rel="item"], .file-list-item[data-file-id]');
    }
    function menuAnchor() {
      const box = field("#js_operate_box");
      if (box) {
        return { container: box, before: box.querySelector(".btn-cancel") };
      }
      const cancel = [...document.querySelectorAll("button")].find(
        (b) => (b.textContent || "").trim() === "\u53D6\u6D88" && b.getBoundingClientRect().width > 0
      );
      const bar = cancel == null ? void 0 : cancel.parentElement;
      if (bar && /已选中/.test(bar.textContent || "")) {
        return { container: bar, before: cancel };
      }
      return null;
    }
    function injectMenu() {
      var _a, _b, _c, _d;
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
      const exportMenu = field("#exportMenu");
      if (!exportMenu) {
        return;
      }
      exportMenu.addEventListener("mouseenter", () => exportMenu.classList.add("open-o"));
      exportMenu.addEventListener("mouseleave", () => exportMenu.classList.remove("open-o"));
      (_a = field("#aria2List")) == null ? void 0 : _a.addEventListener("mousedown", (event) => event.stopPropagation());
      (_b = field("#settingButton")) == null ? void 0 : _b.addEventListener("click", () => {
        var _a2;
        fillSettingForm();
        (_a2 = field("#settingMenu")) == null ? void 0 : _a2.classList.add("open-o");
      });
      (_c = field("#aria2Text")) == null ? void 0 : _c.addEventListener("click", () => {
        mode = "TXT";
        void buildTask();
      });
      (_d = field("#batchOpen")) == null ? void 0 : _d.addEventListener("click", () => {
        mode = "OPEN";
        void buildTask();
      });
      updateRpcMenu();
    }
    async function testAria2(element) {
      var _a;
      try {
        const rpc = parseRpcUrl(config.rpcList[0].url);
        const params = [];
        if ((_a = rpc.auth) == null ? void 0 : _a.startsWith("token")) {
          params.push(rpc.auth);
        }
        const result = await rpcPost(rpc, "aria2.getVersion", params);
        element.textContent = (result == null ? void 0 : result.version) ? `Aria2\u7248\u672C\u4E3A: ${result.version}` : "\u9519\u8BEF,\u8BF7\u67E5\u770B\u662F\u5426\u5F00\u542FAria2";
      } catch (e) {
        element.textContent = "\u9519\u8BEF,\u8BF7\u67E5\u770B\u662F\u5426\u5F00\u542FAria2";
      }
    }
    let chromeReady = false;
    function buildUi() {
      var _a, _b, _c, _d, _e, _f, _g, _h;
      const style = document.createElement("style");
      style.textContent = STYLE;
      document.head.appendChild(style);
      document.body.insertAdjacentHTML("beforeend", `${TEXT_HTML}${settingHtml()}`);
      (_a = field("#textMenu .modal-close")) == null ? void 0 : _a.addEventListener("click", () => {
        var _a2;
        (_a2 = field("#textMenu")) == null ? void 0 : _a2.classList.remove("open-o");
      });
      (_b = field("#copyDownloadLinkTxt")) == null ? void 0 : _b.addEventListener("click", () => {
        var _a2, _b2;
        const link = (_b2 = (_a2 = field("#copyDownloadLinkTxt")) == null ? void 0 : _a2.dataset.link) != null ? _b2 : "";
        navigator.clipboard.writeText(link).then(() => toast("\u62F7\u8D1D\u6210\u529F~", "inf")).catch(() => toast("\u62F7\u8D1D\u5931\u8D25 QAQ", "err"));
      });
      (_c = field("#settingMenu .modal-close")) == null ? void 0 : _c.addEventListener("click", () => {
        var _a2;
        (_a2 = field("#settingMenu")) == null ? void 0 : _a2.classList.remove("open-o");
      });
      (_d = field("#addRPC")) == null ? void 0 : _d.addEventListener("click", () => {
        var _a2;
        (_a2 = field("#rpcRows")) == null ? void 0 : _a2.insertAdjacentHTML("beforeend", rpcRow());
      });
      (_e = field("#apply")) == null ? void 0 : _e.addEventListener("click", () => {
        readSettingForm();
        updateRpcMenu();
        const message = field("#message");
        if (message) {
          message.textContent = "\u8BBE\u7F6E\u5DF2\u4FDD\u5B58";
        }
      });
      (_f = field("#reset")) == null ? void 0 : _f.addEventListener("click", () => {
        GM_deleteValue(CONFIG_KEY);
        config = loadConfig();
        fillSettingForm();
        updateRpcMenu();
        const message = field("#message");
        if (message) {
          message.textContent = "\u8BBE\u7F6E\u5DF2\u91CD\u7F6E";
        }
      });
      (_g = field("#testAria2")) == null ? void 0 : _g.addEventListener("click", (event) => {
        void testAria2(event.currentTarget);
      });
      (_h = field(".browser-userAgent-s")) == null ? void 0 : _h.addEventListener("change", (event) => {
        const agent = field(".userAgent-s");
        if (agent) {
          agent.disabled = event.currentTarget.checked;
        }
      });
    }
    function tick() {
      if (!listPresent()) {
        return;
      }
      if (!chromeReady) {
        chromeReady = true;
        buildUi();
        toast("115 aria2 \u811A\u672C\u5C31\u7EEA", "inf");
      }
      injectMenu();
    }
    function boot() {
      tick();
      const observer = new MutationObserver(() => tick());
      observer.observe(document.body, { childList: true, subtree: true });
    }
    if (document.body) {
      boot();
    } else {
      document.addEventListener("DOMContentLoaded", boot);
    }
  })();
})();

