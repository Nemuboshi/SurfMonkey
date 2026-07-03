// ==UserScript==
// @name PxixvComicrown
// @namespace github.com/Nemuboshi/SurfMonkey
// @version 1.0.0
// @description Download full Pixiv Comic episodes from works pages or viewer pages as ZIP archives.
// @match https://comic.pixiv.net/works/*
// @match https://comic.pixiv.net/viewer/stories/*
// @grant none
// @run-at document-idle
// ==/UserScript==

"use strict";
(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // node_modules/.pnpm/file-saver@2.0.5/node_modules/file-saver/dist/FileSaver.min.js
  var require_FileSaver_min = __commonJS({
    "node_modules/.pnpm/file-saver@2.0.5/node_modules/file-saver/dist/FileSaver.min.js"(exports, module) {
      (function(a, b) {
        if ("function" == typeof define && define.amd) define([], b);
        else if ("undefined" != typeof exports) b();
        else {
          b(), a.FileSaver = { exports: {} }.exports;
        }
      })(exports, function() {
        "use strict";
        function b(a2, b2) {
          return "undefined" == typeof b2 ? b2 = { autoBom: false } : "object" != typeof b2 && (console.warn("Deprecated: Expected third argument to be a object"), b2 = { autoBom: !b2 }), b2.autoBom && /^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(a2.type) ? new Blob(["\uFEFF", a2], { type: a2.type }) : a2;
        }
        function c(a2, b2, c2) {
          var d2 = new XMLHttpRequest();
          d2.open("GET", a2), d2.responseType = "blob", d2.onload = function() {
            g(d2.response, b2, c2);
          }, d2.onerror = function() {
            console.error("could not download file");
          }, d2.send();
        }
        function d(a2) {
          var b2 = new XMLHttpRequest();
          b2.open("HEAD", a2, false);
          try {
            b2.send();
          } catch (a3) {
          }
          return 200 <= b2.status && 299 >= b2.status;
        }
        function e(a2) {
          try {
            a2.dispatchEvent(new MouseEvent("click"));
          } catch (c2) {
            var b2 = document.createEvent("MouseEvents");
            b2.initMouseEvent("click", true, true, window, 0, 0, 0, 80, 20, false, false, false, false, 0, null), a2.dispatchEvent(b2);
          }
        }
        var f = "object" == typeof window && window.window === window ? window : "object" == typeof self && self.self === self ? self : "object" == typeof global && global.global === global ? global : void 0, a = f.navigator && /Macintosh/.test(navigator.userAgent) && /AppleWebKit/.test(navigator.userAgent) && !/Safari/.test(navigator.userAgent), g = f.saveAs || ("object" != typeof window || window !== f ? function() {
        } : "download" in HTMLAnchorElement.prototype && !a ? function(b2, g2, h) {
          var i = f.URL || f.webkitURL, j = document.createElement("a");
          g2 = g2 || b2.name || "download", j.download = g2, j.rel = "noopener", "string" == typeof b2 ? (j.href = b2, j.origin === location.origin ? e(j) : d(j.href) ? c(b2, g2, h) : e(j, j.target = "_blank")) : (j.href = i.createObjectURL(b2), setTimeout(function() {
            i.revokeObjectURL(j.href);
          }, 4e4), setTimeout(function() {
            e(j);
          }, 0));
        } : "msSaveOrOpenBlob" in navigator ? function(f2, g2, h) {
          if (g2 = g2 || f2.name || "download", "string" != typeof f2) navigator.msSaveOrOpenBlob(b(f2, h), g2);
          else if (d(f2)) c(f2, g2, h);
          else {
            var i = document.createElement("a");
            i.href = f2, i.target = "_blank", setTimeout(function() {
              e(i);
            });
          }
        } : function(b2, d2, e2, g2) {
          if (g2 = g2 || open("", "_blank"), g2 && (g2.document.title = g2.document.body.innerText = "downloading..."), "string" == typeof b2) return c(b2, d2, e2);
          var h = "application/octet-stream" === b2.type, i = /constructor/i.test(f.HTMLElement) || f.safari, j = /CriOS\/[\d]+/.test(navigator.userAgent);
          if ((j || h && i || a) && "undefined" != typeof FileReader) {
            var k = new FileReader();
            k.onloadend = function() {
              var a2 = k.result;
              a2 = j ? a2 : a2.replace(/^data:[^;]*;/, "data:attachment/file;"), g2 ? g2.location.href = a2 : location = a2, g2 = null;
            }, k.readAsDataURL(b2);
          } else {
            var l = f.URL || f.webkitURL, m = l.createObjectURL(b2);
            g2 ? g2.location = m : location.href = m, g2 = null, setTimeout(function() {
              l.revokeObjectURL(m);
            }, 4e4);
          }
        });
        f.saveAs = g.saveAs = g, "undefined" != typeof module && (module.exports = g);
      });
    }
  });

  // node_modules/.pnpm/fflate@0.8.2/node_modules/fflate/esm/browser.js
  var u8 = Uint8Array;
  var u16 = Uint16Array;
  var i32 = Int32Array;
  var fleb = new u8([
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    1,
    1,
    1,
    1,
    2,
    2,
    2,
    2,
    3,
    3,
    3,
    3,
    4,
    4,
    4,
    4,
    5,
    5,
    5,
    5,
    0,
    /* unused */
    0,
    0,
    /* impossible */
    0
  ]);
  var fdeb = new u8([
    0,
    0,
    0,
    0,
    1,
    1,
    2,
    2,
    3,
    3,
    4,
    4,
    5,
    5,
    6,
    6,
    7,
    7,
    8,
    8,
    9,
    9,
    10,
    10,
    11,
    11,
    12,
    12,
    13,
    13,
    /* unused */
    0,
    0
  ]);
  var clim = new u8([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);
  var freb = function(eb, start) {
    var b = new u16(31);
    for (var i = 0; i < 31; ++i) {
      b[i] = start += 1 << eb[i - 1];
    }
    var r = new i32(b[30]);
    for (var i = 1; i < 30; ++i) {
      for (var j = b[i]; j < b[i + 1]; ++j) {
        r[j] = j - b[i] << 5 | i;
      }
    }
    return { b, r };
  };
  var _a = freb(fleb, 2);
  var fl = _a.b;
  var revfl = _a.r;
  fl[28] = 258, revfl[258] = 28;
  var _b = freb(fdeb, 0);
  var fd = _b.b;
  var revfd = _b.r;
  var rev = new u16(32768);
  for (i = 0; i < 32768; ++i) {
    x = (i & 43690) >> 1 | (i & 21845) << 1;
    x = (x & 52428) >> 2 | (x & 13107) << 2;
    x = (x & 61680) >> 4 | (x & 3855) << 4;
    rev[i] = ((x & 65280) >> 8 | (x & 255) << 8) >> 1;
  }
  var x;
  var i;
  var flt = new u8(288);
  for (i = 0; i < 144; ++i)
    flt[i] = 8;
  var i;
  for (i = 144; i < 256; ++i)
    flt[i] = 9;
  var i;
  for (i = 256; i < 280; ++i)
    flt[i] = 7;
  var i;
  for (i = 280; i < 288; ++i)
    flt[i] = 8;
  var i;
  var fdt = new u8(32);
  for (i = 0; i < 32; ++i)
    fdt[i] = 5;
  var i;
  var slc = function(v, s, e) {
    if (s == null || s < 0)
      s = 0;
    if (e == null || e > v.length)
      e = v.length;
    return new u8(v.subarray(s, e));
  };
  var ec = [
    "unexpected EOF",
    "invalid block type",
    "invalid length/literal",
    "invalid distance",
    "stream finished",
    "no stream handler",
    ,
    "no callback",
    "invalid UTF-8 data",
    "extra field too long",
    "date not in range 1980-2099",
    "filename too long",
    "stream finishing",
    "invalid zip data"
    // determined by unknown compression method
  ];
  var err = function(ind, msg, nt) {
    var e = new Error(msg || ec[ind]);
    e.code = ind;
    if (Error.captureStackTrace)
      Error.captureStackTrace(e, err);
    if (!nt)
      throw e;
    return e;
  };
  var et = /* @__PURE__ */ new u8(0);
  var crct = /* @__PURE__ */ (function() {
    var t = new Int32Array(256);
    for (var i = 0; i < 256; ++i) {
      var c = i, k = 9;
      while (--k)
        c = (c & 1 && -306674912) ^ c >>> 1;
      t[i] = c;
    }
    return t;
  })();
  var crc = function() {
    var c = -1;
    return {
      p: function(d) {
        var cr = c;
        for (var i = 0; i < d.length; ++i)
          cr = crct[cr & 255 ^ d[i]] ^ cr >>> 8;
        c = cr;
      },
      d: function() {
        return ~c;
      }
    };
  };
  var mrg = function(a, b) {
    var o = {};
    for (var k in a)
      o[k] = a[k];
    for (var k in b)
      o[k] = b[k];
    return o;
  };
  var wbytes = function(d, b, v) {
    for (; v; ++b)
      d[b] = v, v >>>= 8;
  };
  var te = typeof TextEncoder != "undefined" && /* @__PURE__ */ new TextEncoder();
  var td = typeof TextDecoder != "undefined" && /* @__PURE__ */ new TextDecoder();
  var tds = 0;
  try {
    td.decode(et, { stream: true });
    tds = 1;
  } catch (e) {
  }
  function strToU8(str, latin1) {
    if (latin1) {
      var ar_1 = new u8(str.length);
      for (var i = 0; i < str.length; ++i)
        ar_1[i] = str.charCodeAt(i);
      return ar_1;
    }
    if (te)
      return te.encode(str);
    var l = str.length;
    var ar = new u8(str.length + (str.length >> 1));
    var ai = 0;
    var w = function(v) {
      ar[ai++] = v;
    };
    for (var i = 0; i < l; ++i) {
      if (ai + 5 > ar.length) {
        var n = new u8(ai + 8 + (l - i << 1));
        n.set(ar);
        ar = n;
      }
      var c = str.charCodeAt(i);
      if (c < 128 || latin1)
        w(c);
      else if (c < 2048)
        w(192 | c >> 6), w(128 | c & 63);
      else if (c > 55295 && c < 57344)
        c = 65536 + (c & 1023 << 10) | str.charCodeAt(++i) & 1023, w(240 | c >> 18), w(128 | c >> 12 & 63), w(128 | c >> 6 & 63), w(128 | c & 63);
      else
        w(224 | c >> 12), w(128 | c >> 6 & 63), w(128 | c & 63);
    }
    return slc(ar, 0, ai);
  }
  var exfl = function(ex) {
    var le = 0;
    if (ex) {
      for (var k in ex) {
        var l = ex[k].length;
        if (l > 65535)
          err(9);
        le += l + 4;
      }
    }
    return le;
  };
  var wzh = function(d, b, f, fn, u, c, ce, co) {
    var fl2 = fn.length, ex = f.extra, col = co && co.length;
    var exl = exfl(ex);
    wbytes(d, b, ce != null ? 33639248 : 67324752), b += 4;
    if (ce != null)
      d[b++] = 20, d[b++] = f.os;
    d[b] = 20, b += 2;
    d[b++] = f.flag << 1 | (c < 0 && 8), d[b++] = u && 8;
    d[b++] = f.compression & 255, d[b++] = f.compression >> 8;
    var dt = new Date(f.mtime == null ? Date.now() : f.mtime), y = dt.getFullYear() - 1980;
    if (y < 0 || y > 119)
      err(10);
    wbytes(d, b, y << 25 | dt.getMonth() + 1 << 21 | dt.getDate() << 16 | dt.getHours() << 11 | dt.getMinutes() << 5 | dt.getSeconds() >> 1), b += 4;
    if (c != -1) {
      wbytes(d, b, f.crc);
      wbytes(d, b + 4, c < 0 ? -c - 2 : c);
      wbytes(d, b + 8, f.size);
    }
    wbytes(d, b + 12, fl2);
    wbytes(d, b + 14, exl), b += 16;
    if (ce != null) {
      wbytes(d, b, col);
      wbytes(d, b + 6, f.attrs);
      wbytes(d, b + 10, ce), b += 14;
    }
    d.set(fn, b);
    b += fl2;
    if (exl) {
      for (var k in ex) {
        var exf = ex[k], l = exf.length;
        wbytes(d, b, +k);
        wbytes(d, b + 2, l);
        d.set(exf, b + 4), b += 4 + l;
      }
    }
    if (col)
      d.set(co, b), b += col;
    return b;
  };
  var wzf = function(o, b, c, d, e) {
    wbytes(o, b, 101010256);
    wbytes(o, b + 8, c);
    wbytes(o, b + 10, c);
    wbytes(o, b + 12, d);
    wbytes(o, b + 16, e);
  };
  var ZipPassThrough = /* @__PURE__ */ (function() {
    function ZipPassThrough2(filename) {
      this.filename = filename;
      this.c = crc();
      this.size = 0;
      this.compression = 0;
    }
    ZipPassThrough2.prototype.process = function(chunk, final) {
      this.ondata(null, chunk, final);
    };
    ZipPassThrough2.prototype.push = function(chunk, final) {
      if (!this.ondata)
        err(5);
      this.c.p(chunk);
      this.size += chunk.length;
      if (final)
        this.crc = this.c.d();
      this.process(chunk, final || false);
    };
    return ZipPassThrough2;
  })();
  var Zip = /* @__PURE__ */ (function() {
    function Zip2(cb) {
      this.ondata = cb;
      this.u = [];
      this.d = 1;
    }
    Zip2.prototype.add = function(file) {
      var _this = this;
      if (!this.ondata)
        err(5);
      if (this.d & 2)
        this.ondata(err(4 + (this.d & 1) * 8, 0, 1), null, false);
      else {
        var f = strToU8(file.filename), fl_1 = f.length;
        var com = file.comment, o = com && strToU8(com);
        var u = fl_1 != file.filename.length || o && com.length != o.length;
        var hl_1 = fl_1 + exfl(file.extra) + 30;
        if (fl_1 > 65535)
          this.ondata(err(11, 0, 1), null, false);
        var header = new u8(hl_1);
        wzh(header, 0, file, f, u, -1);
        var chks_1 = [header];
        var pAll_1 = function() {
          for (var _i = 0, chks_2 = chks_1; _i < chks_2.length; _i++) {
            var chk = chks_2[_i];
            _this.ondata(null, chk, false);
          }
          chks_1 = [];
        };
        var tr_1 = this.d;
        this.d = 0;
        var ind_1 = this.u.length;
        var uf_1 = mrg(file, {
          f,
          u,
          o,
          t: function() {
            if (file.terminate)
              file.terminate();
          },
          r: function() {
            pAll_1();
            if (tr_1) {
              var nxt = _this.u[ind_1 + 1];
              if (nxt)
                nxt.r();
              else
                _this.d = 1;
            }
            tr_1 = 1;
          }
        });
        var cl_1 = 0;
        file.ondata = function(err2, dat, final) {
          if (err2) {
            _this.ondata(err2, dat, final);
            _this.terminate();
          } else {
            cl_1 += dat.length;
            chks_1.push(dat);
            if (final) {
              var dd = new u8(16);
              wbytes(dd, 0, 134695760);
              wbytes(dd, 4, file.crc);
              wbytes(dd, 8, cl_1);
              wbytes(dd, 12, file.size);
              chks_1.push(dd);
              uf_1.c = cl_1, uf_1.b = hl_1 + cl_1 + 16, uf_1.crc = file.crc, uf_1.size = file.size;
              if (tr_1)
                uf_1.r();
              tr_1 = 1;
            } else if (tr_1)
              pAll_1();
          }
        };
        this.u.push(uf_1);
      }
    };
    Zip2.prototype.end = function() {
      var _this = this;
      if (this.d & 2) {
        this.ondata(err(4 + (this.d & 1) * 8, 0, 1), null, true);
        return;
      }
      if (this.d)
        this.e();
      else
        this.u.push({
          r: function() {
            if (!(_this.d & 1))
              return;
            _this.u.splice(-1, 1);
            _this.e();
          },
          t: function() {
          }
        });
      this.d = 3;
    };
    Zip2.prototype.e = function() {
      var bt = 0, l = 0, tl = 0;
      for (var _i = 0, _a2 = this.u; _i < _a2.length; _i++) {
        var f = _a2[_i];
        tl += 46 + f.f.length + exfl(f.extra) + (f.o ? f.o.length : 0);
      }
      var out = new u8(tl + 22);
      for (var _b2 = 0, _c = this.u; _b2 < _c.length; _b2++) {
        var f = _c[_b2];
        wzh(out, bt, f, f.f, f.u, -f.c - 2, l, f.o);
        bt += 46 + f.f.length + exfl(f.extra) + (f.o ? f.o.length : 0), l += f.b;
      }
      wzf(out, bt, this.u.length, tl, l);
      this.ondata(null, out, true);
      this.d = 2;
    };
    Zip2.prototype.terminate = function() {
      for (var _i = 0, _a2 = this.u; _i < _a2.length; _i++) {
        var f = _a2[_i];
        f.t();
      }
      this.d = 2;
    };
    return Zip2;
  })();

  // src/userscripts/PxixvComicrown.ts
  var import_file_saver = __toESM(require_FileSaver_min());

  // src/shared/blobParts.ts
  function bytesToBlobPart(bytes) {
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    return copy.buffer;
  }
  function bytesToImageDataArray(bytes) {
    const copy = new Uint8ClampedArray(bytes.byteLength);
    copy.set(bytes);
    return copy;
  }

  // src/userscripts/PxixvComicrown.ts
  var PANEL_ID = "__pxixv_comicrown_panel";
  var ZIP_MIME = "application/zip";
  var FETCH_CONCURRENCY = 4;
  var DESCRAMBLE_SECRET = "4wXCKprMMoxnyJ3PocJFs4CYbfnbazNe";
  function log(...args) {
    console.log("[PxixvComicrown]", ...args);
  }
  function delay(ms) {
    return new Promise((resolve) => globalThis.setTimeout(resolve, ms));
  }
  function pad(value, length = 3) {
    return String(value).padStart(length, "0");
  }
  function sanitizeFilePart(value) {
    const cleaned = Array.from(value, (char) => {
      const code = char.charCodeAt(0);
      if (code < 32 || '<>:"/\\|?*'.includes(char)) {
        return "_";
      }
      return char;
    }).join("");
    return cleaned.replace(/\s+/g, " ").trim() || "pixiv-comic";
  }
  function formatClientTime(date) {
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
  async function buildClientHeaders(salt) {
    const time = formatClientTime(/* @__PURE__ */ new Date());
    const bytes = new TextEncoder().encode(`${time}${salt}`);
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
    const hash = Array.from(digest, (value) => value.toString(16).padStart(2, "0")).join("");
    return { time, hash };
  }
  async function mapWithConcurrency(items, concurrency, worker) {
    if (items.length === 0) {
      return [];
    }
    const out = new Array(items.length);
    const limit = Math.max(1, Math.floor(concurrency));
    let cursor = 0;
    const run = async () => {
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
      })
    );
    return out;
  }
  function parseEpisodeIdFromViewerPath(pathLike) {
    var _a2, _b2;
    try {
      const parsed = new URL(pathLike, window.location.origin);
      return (_b2 = (_a2 = parsed.pathname.match(/^\/viewer\/stories\/(\d+)/)) == null ? void 0 : _a2[1]) != null ? _b2 : null;
    } catch (e) {
      return null;
    }
  }
  function buildArchiveName(workTitle, episodeTitle, from, to) {
    const work = sanitizeFilePart(workTitle);
    const episode = sanitizeFilePart(episodeTitle);
    return `${work} - ${episode} - p${pad(from)}-p${pad(to)}.zip`;
  }
  function createNumberInput(value) {
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
      "color: #fff"
    ].join(";");
    return input;
  }
  function createButton(label) {
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
      "cursor: pointer"
    ].join(";");
    return button;
  }
  function createViewerPanel() {
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
      "font: 12px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace"
    ].join(";");
    const title = document.createElement("span");
    title.style.fontWeight = "700";
    title.textContent = "pixiv";
    const header = document.createElement("div");
    header.style.cssText = [
      "display:flex",
      "align-items:center",
      "justify-content:space-between",
      "gap:10px"
    ].join(";");
    const badge = document.createElement("span");
    badge.textContent = "PxixvComicrown";
    badge.style.cssText = [
      "padding:2px 7px",
      "border-radius:999px",
      "background: rgba(106,211,165,0.18)",
      "color:#9af0c5",
      "font-size:11px",
      "font-weight:700"
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
      "text-overflow: ellipsis"
    ].join(";");
    panel.append(header, rangeRow, button, status);
    return { panel, title, fromInput, toInput, button, status };
  }
  async function fetchViewerBootstrap(viewerPath) {
    var _a2, _b2, _c, _d;
    const viewerUrl = new URL(viewerPath, window.location.origin).toString();
    const response = await fetch(viewerUrl, {
      credentials: "include",
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      }
    });
    if (!response.ok) {
      throw new Error(`viewer bootstrap failed (${response.status})`);
    }
    const html = await response.text();
    const nextDataMatch = html.match(
      /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/
    );
    if (!(nextDataMatch == null ? void 0 : nextDataMatch[1])) {
      throw new Error("viewer next data is missing");
    }
    let nextData;
    try {
      nextData = JSON.parse(nextDataMatch[1]);
    } catch (e) {
      throw new Error("viewer next data is invalid");
    }
    const salt = (_b2 = (_a2 = nextData.props) == null ? void 0 : _a2.pageProps) == null ? void 0 : _b2.salt;
    const episodeId = (_d = (_c = nextData.props) == null ? void 0 : _c.pageProps) == null ? void 0 : _d.id;
    if (!salt || episodeId === void 0 || episodeId === null) {
      throw new Error("viewer metadata is missing");
    }
    return { salt, episodeId: String(episodeId) };
  }
  async function fetchEpisodeMetadata(episodeId, salt) {
    var _a2;
    const client = await buildClientHeaders(salt);
    const response = await fetch(`/api/app/episodes/${episodeId}/read_v4`, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-Client-Hash": client.hash,
        "X-Client-Time": client.time,
        "X-Requested-With": "pixivcomic"
      }
    });
    if (!response.ok) {
      throw new Error(`episode api failed (${response.status})`);
    }
    const payload = await response.json();
    const episode = (_a2 = payload.data) == null ? void 0 : _a2.reading_episode;
    if (!episode) {
      throw new Error("episode payload is missing");
    }
    return episode;
  }
  function rotateLeft32(value, shift) {
    const normalized = shift % 32;
    return (value << normalized >>> 0 | value >>> 32 - normalized) >>> 0;
  }
  var Xoshiro128StarStar = class {
    constructor(seed) {
      if (seed.length !== 4) {
        throw new Error(`seed.length !== 4 (seed.length: ${seed.length})`);
      }
      this.state = new Uint32Array(seed);
      if (this.state[0] === 0 && this.state[1] === 0 && this.state[2] === 0 && this.state[3] === 0) {
        this.state[0] = 1;
      }
    }
    next() {
      const result = 9 * rotateLeft32(5 * this.state[1] >>> 0, 7) >>> 0;
      const t = this.state[1] << 9 >>> 0;
      this.state[2] = (this.state[2] ^ this.state[0]) >>> 0;
      this.state[3] = (this.state[3] ^ this.state[1]) >>> 0;
      this.state[1] = (this.state[1] ^ this.state[2]) >>> 0;
      this.state[0] = (this.state[0] ^ this.state[3]) >>> 0;
      this.state[2] = (this.state[2] ^ t) >>> 0;
      this.state[3] = rotateLeft32(this.state[3], 11);
      return result;
    }
  };
  async function descrambleImageData(data, width, height, blockSizeH, blockSizeV, key) {
    var _a2, _b2;
    const bytesPerElement = 4;
    if (width <= 0 || height <= 0 || blockSizeH <= 0 || blockSizeV <= 0) {
      throw new Error("invalid image geometry");
    }
    if (data.length !== width * height * bytesPerElement) {
      throw new Error("image data length is invalid");
    }
    const rows = Math.ceil(height / blockSizeV);
    const columns = Math.floor(width / blockSizeH);
    const shuffleTable = Array.from(
      { length: rows },
      () => Array.from({ length: columns }, (_, index) => index)
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
      const row = (_a2 = shuffleTable[Math.floor(y / blockSizeV)]) != null ? _a2 : [];
      for (let block = 0; block < columns; block += 1) {
        const sourceBlock = (_b2 = row[block]) != null ? _b2 : block;
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
  async function blobToBitmap(blob) {
    return await createImageBitmap(blob);
  }
  async function canvasToPngBlob(canvas) {
    return await new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("canvas.toBlob failed"));
          return;
        }
        resolve(blob);
      }, "image/png");
    });
  }
  async function downloadAndDescramblePage(page, pageNumber) {
    const response = await fetch(page.url, {
      headers: page.key ? {
        "X-Cobalt-Thumber-Parameter-GridShuffle-Key": page.key
      } : void 0
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
          page.key
        );
        context.putImageData(
          new ImageData(bytesToImageDataArray(descrambled), page.width, page.height),
          0,
          0
        );
      }
      const pngBlob = await canvasToPngBlob(canvas);
      return {
        name: `${pad(pageNumber)}.png`,
        bytes: new Uint8Array(await pngBlob.arrayBuffer())
      };
    } finally {
      bitmap.close();
      canvas.width = 1;
      canvas.height = 1;
    }
  }
  async function buildZipBlob(episode, from, to, onProgress) {
    var _a2;
    const targetPages = episode.pages.slice(from - 1, to);
    const files = await mapWithConcurrency(targetPages, FETCH_CONCURRENCY, async (page, index) => {
      const current = from + index;
      onProgress == null ? void 0 : onProgress(`page ${current}/${to}`);
      return await downloadAndDescramblePage(page, current);
    });
    onProgress == null ? void 0 : onProgress("zipping");
    const chunks = [];
    const zipBlob = await new Promise((resolve, reject) => {
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
        } catch (e) {
        }
        reject(error);
      }
    });
    const episodeTitle = ((_a2 = episode.numbering_title) == null ? void 0 : _a2.trim()) || episode.title;
    return {
      blob: zipBlob,
      fileName: buildArchiveName(episode.work_title, episodeTitle, from, to)
    };
  }
  async function downloadEpisodeRange(options) {
    var _a2, _b2, _c, _d;
    (_a2 = options.onProgress) == null ? void 0 : _a2.call(options, "loading episode");
    const bootstrap = await fetchViewerBootstrap(options.viewerPath);
    const episode = await fetchEpisodeMetadata(bootstrap.episodeId, bootstrap.salt);
    const pageCount = episode.pages.length;
    const from = Math.max(1, Math.min((_b2 = options.from) != null ? _b2 : 1, pageCount));
    const to = Math.max(from, Math.min((_c = options.to) != null ? _c : pageCount, pageCount));
    const zipResult = await buildZipBlob(episode, from, to, options.onProgress);
    (0, import_file_saver.saveAs)(zipResult.blob, zipResult.fileName);
    (_d = options.onProgress) == null ? void 0 : _d.call(options, `saved ${zipResult.fileName}`);
  }
  function installViewerPanel() {
    var _a2, _b2, _c;
    if (document.getElementById(PANEL_ID) || !document.body) {
      return;
    }
    const panel = createViewerPanel();
    document.body.appendChild(panel.panel);
    const currentId = parseEpisodeIdFromViewerPath(window.location.pathname);
    const salt = (_c = (_b2 = (_a2 = window.__NEXT_DATA__) == null ? void 0 : _a2.props) == null ? void 0 : _b2.pageProps) == null ? void 0 : _c.salt;
    if (currentId && salt) {
      void fetchEpisodeMetadata(currentId, salt).then((episode) => {
        var _a3;
        const pageCount = episode.pages.length;
        panel.title.textContent = ((_a3 = episode.numbering_title) == null ? void 0 : _a3.trim()) || episode.title;
        panel.fromInput.value = "1";
        panel.toInput.value = String(pageCount);
        panel.status.textContent = `ready 1/${pageCount}`;
      }).catch((error) => {
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
          }
        });
      } catch (error) {
        panel.status.textContent = error instanceof Error ? error.message : String(error);
        console.error(error);
      } finally {
        panel.button.disabled = false;
      }
    };
  }
  function enhanceWorksPage() {
    var _a2;
    const links = document.querySelectorAll('a[href^="/viewer/stories/"]');
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
      (_a2 = link.parentNode) == null ? void 0 : _a2.insertBefore(wrapper, link);
      wrapper.appendChild(link);
      link.style.flex = "1 1 auto";
      link.style.minWidth = "0";
      const button = createButton("zip");
      button.style.padding = "4px 8px";
      button.style.fontSize = "12px";
      button.onclick = async (event) => {
        var _a3;
        event.preventDefault();
        event.stopPropagation();
        const originalText = (_a3 = button.textContent) != null ? _a3 : "zip";
        button.disabled = true;
        button.textContent = "run";
        try {
          await downloadEpisodeRange({
            viewerPath,
            onProgress: (status) => {
              button.textContent = status.startsWith("saved") ? "done" : status.replace(/^(.{0,10}).*$/, "$1");
            }
          });
          button.textContent = "done";
          await delay(1500);
        } catch (error) {
          button.textContent = "fail";
          console.error(error);
          await delay(2e3);
        } finally {
          button.disabled = false;
          button.textContent = originalText;
        }
      };
      wrapper.appendChild(button);
    }
  }
  function init() {
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
    void Promise.resolve().then(init).catch((error) => log("init failed", error));
  }
})();

