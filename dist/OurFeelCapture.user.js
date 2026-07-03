// ==UserScript==
// @name OurFeelCapture
// @namespace https://ourfeel.jp
// @version 1.0.0
// @description Download OUR FEEL episode pages as ZIP archives.
// @match https://ourfeel.jp/episode/*
// @grant none
// @run-at document-end
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

  // src/userscripts/OurFeelCapture.ts
  var import_file_saver = __toESM(require_FileSaver_min());

  // src/shared/blobParts.ts
  function bytesToBlobPart(bytes) {
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    return copy.buffer;
  }

  // src/userscripts/OurFeelCapture.ts
  var PANEL_ID = "__ourfeel_capture_panel";
  var ZIP_MIME = "application/zip";
  var FETCH_CONCURRENCY = 4;
  function log(...args) {
    console.log("[OurFeelCapture]", ...args);
  }
  function pad(value, length = 4) {
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
    return cleaned.replace(/\s+/g, " ").trim() || "ourfeel";
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
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => run()));
    return out;
  }
  function parseEpisodeJsonPayload() {
    var _a2;
    const script = document.getElementById("episode-json");
    const raw = (_a2 = script == null ? void 0 : script.getAttribute("data-value")) != null ? _a2 : script == null ? void 0 : script.textContent;
    if (!(raw == null ? void 0 : raw.trim())) {
      throw new Error("episode-json is missing");
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      throw new Error("episode-json is invalid");
    }
  }
  function getEpisode() {
    var _a2, _b2, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l;
    const product = parseEpisodeJsonPayload().readableProduct;
    if (!product) {
      throw new Error("readableProduct is missing");
    }
    const pages = (_c = (_b2 = (_a2 = product.pageStructure) == null ? void 0 : _a2.pages) == null ? void 0 : _b2.filter((page) => {
      return page.type === "main" && typeof page.src === "string" && page.src.length > 0 && typeof page.width === "number" && typeof page.height === "number";
    }).map((page) => ({
      src: page.src,
      width: page.width,
      height: page.height
    }))) != null ? _c : [];
    if (pages.length === 0) {
      throw new Error("No main pages found");
    }
    return {
      id: (_f = (_e = product.id) != null ? _e : (_d = window.location.pathname.match(/\/episode\/([^/?#]+)/)) == null ? void 0 : _d[1]) != null ? _f : "episode",
      title: (_g = product.title) != null ? _g : document.title,
      seriesTitle: (_j = (_i = (_h = product.series) == null ? void 0 : _h.title) != null ? _i : document.title.split(" / ")[0]) != null ? _j : "OUR FEEL",
      scrambleMode: (_l = (_k = product.pageStructure) == null ? void 0 : _k.choJuGiga) != null ? _l : null,
      pages
    };
  }
  function inferImageExtension(contentType) {
    var _a2;
    const normalized = (_a2 = contentType == null ? void 0 : contentType.toLowerCase()) != null ? _a2 : "";
    if (normalized.includes("png")) {
      return "png";
    }
    if (normalized.includes("webp")) {
      return "webp";
    }
    return "jpg";
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
  async function descrambleBakuPage(blob, page) {
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
            tileHeight
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
  async function downloadPage(page, pageNumber, scrambleMode) {
    const response = await fetch(page.src, {
      credentials: "omit",
      referrerPolicy: "strict-origin-when-cross-origin"
    });
    if (!response.ok) {
      throw new Error(`page ${pageNumber} failed (${response.status})`);
    }
    const blob = await response.blob();
    if (scrambleMode === "baku") {
      const pngBlob = await descrambleBakuPage(blob, page);
      return {
        name: `${pad(pageNumber)}.png`,
        bytes: new Uint8Array(await pngBlob.arrayBuffer())
      };
    }
    const extension = inferImageExtension(response.headers.get("content-type") || blob.type);
    return {
      name: `${pad(pageNumber)}.${extension}`,
      bytes: new Uint8Array(await blob.arrayBuffer())
    };
  }
  function buildArchiveName(episode, from, to) {
    const series = sanitizeFilePart(episode.seriesTitle);
    const title = sanitizeFilePart(episode.title);
    return `${series} - ${title} - p${pad(from)}-p${pad(to)}.zip`;
  }
  async function buildZipBlob(episode, from, to, onProgress) {
    const targetPages = episode.pages.slice(from - 1, to);
    let completed = 0;
    const files = await mapWithConcurrency(targetPages, FETCH_CONCURRENCY, async (page, index) => {
      const current = from + index;
      const downloaded = await downloadPage(page, current, episode.scrambleMode);
      completed += 1;
      onProgress == null ? void 0 : onProgress(`page ${completed}/${targetPages.length}`);
      return downloaded;
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
    return {
      blob: zipBlob,
      fileName: buildArchiveName(episode, from, to)
    };
  }
  async function downloadEpisodeRange(options) {
    var _a2, _b2, _c, _d, _e, _f;
    (_a2 = options.onProgress) == null ? void 0 : _a2.call(options, "loading episode");
    const episode = getEpisode();
    const pageCount = episode.pages.length;
    const from = Math.max(1, Math.min((_b2 = options.from) != null ? _b2 : 1, (_c = options.to) != null ? _c : pageCount, pageCount));
    const to = Math.max(
      from,
      Math.min(Math.max((_d = options.from) != null ? _d : 1, (_e = options.to) != null ? _e : pageCount), pageCount)
    );
    const zipResult = await buildZipBlob(episode, from, to, options.onProgress);
    (0, import_file_saver.saveAs)(zipResult.blob, zipResult.fileName);
    (_f = options.onProgress) == null ? void 0 : _f.call(options, `saved ${zipResult.fileName}`);
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
  function createPanel() {
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
      "font: 12px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace"
    ].join(";");
    const title = document.createElement("span");
    title.style.cssText = "font-weight:700;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
    title.textContent = "OUR FEEL";
    const badge = document.createElement("span");
    badge.textContent = "OurFeelCapture";
    badge.style.cssText = [
      "padding:2px 7px",
      "border-radius:999px",
      "background: rgba(106,211,165,0.18)",
      "color:#9af0c5",
      "font-size:11px",
      "font-weight:700"
    ].join(";");
    const header = document.createElement("div");
    header.style.cssText = [
      "display:flex",
      "align-items:center",
      "justify-content:space-between",
      "gap:10px"
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
  function installPanel() {
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
  function init() {
    if (!window.location.pathname.startsWith("/episode/")) {
      return;
    }
    installPanel();
  }
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    void Promise.resolve().then(init).catch((error) => log("init failed", error));
  }
})();

