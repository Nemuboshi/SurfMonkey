// ==UserScript==
// @name MosaiComAnti
// @namespace github.com/Nemuboshi/SurfMonkey
// @version 1.0.0
// @description …
// @match https://www.cmoa.jp/bib/speedreader/*
// @grant GM_xmlhttpRequest
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
  var freb = function(eb, start2) {
    var b = new u16(31);
    for (var i = 0; i < 31; ++i) {
      b[i] = start2 += 1 << eb[i - 1];
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

  // src/MosaiComAnti.ts
  var import_file_saver = __toESM(require_FileSaver_min());

  // src/blobParts.ts
  function bytesToBlobPart(bytes) {
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    return copy.buffer;
  }

  // src/MosaiComAnti.ts
  var CONFIG = {
    // Default to low quality to match common reader fallback behavior.
    useHighQualityImage: false,
    // Keep false to preserve "singlequality omits q" behavior from original code.
    forceQualityParameterRequest: false
  };
  var U_KEYS = ["u0", "u1", "u2", "u3", "u4", "u5", "u6", "u7", "u8", "u9"];
  var REQUEST_TIMEOUT_MS = 3e4;
  function log(...args) {
    console.log("[MosaiComAnti]", ...args);
  }
  function fail(message) {
    throw new Error(message);
  }
  function ensureObjectRecord(value, label) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      fail(label);
    }
    return value;
  }
  function parseJsonLike(text) {
    var _a2;
    try {
      const parsed = JSON.parse(text);
      return ensureObjectRecord(parsed, "Invalid JSON response object.");
    } catch (e) {
      const m = text.match(/^[A-Za-z0-9_-]+\(([\s\S]*)\)\s*;?\s*$/);
      if (!m) {
        fail("Invalid JSON/JSONP response.");
      }
      const parsed = JSON.parse((_a2 = m[1]) != null ? _a2 : "{}");
      return ensureObjectRecord(parsed, "Invalid JSONP payload object.");
    }
  }
  function toArray(value, mapper) {
    if (!Array.isArray(value)) {
      fail("Scramble table is not an array.");
    }
    return value.map(mapper);
  }
  function toFiniteNumberArray(value, label) {
    const arr = toArray(value, (item) => Number(item));
    if (arr.some((n) => !Number.isFinite(n))) {
      fail(`${label} contains non-numeric values.`);
    }
    return arr;
  }
  function getRandomString(length) {
    var _a2, _b2;
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let out = "";
    const cryptoObj = globalThis.crypto;
    if (cryptoObj == null ? void 0 : cryptoObj.getRandomValues) {
      const buf = new Uint8Array(length);
      cryptoObj.getRandomValues(buf);
      for (let i = 0; i < length; i += 1) {
        out += (_a2 = alphabet[buf[i] % alphabet.length]) != null ? _a2 : "A";
      }
      return out;
    }
    for (let i = 0; i < length; i += 1) {
      out += (_b2 = alphabet[Math.floor(Math.random() * alphabet.length)]) != null ? _b2 : "A";
    }
    return out;
  }
  function buildK(cid) {
    var _a2;
    const n = getRandomString(16);
    const i = cid.repeat(Math.ceil(16 / cid.length) + 1);
    const r = i.slice(0, 16);
    const e = i.slice(-16);
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    let s = 0;
    let h = 0;
    let u = 0;
    let out = "";
    for (let idx = 0; idx < 16; idx += 1) {
      s ^= n.charCodeAt(idx);
      h ^= r.charCodeAt(idx);
      u ^= e.charCodeAt(idx);
      out += `${n[idx]}${(_a2 = alphabet[s + h + u & 63]) != null ? _a2 : "A"}`;
    }
    return out;
  }
  function decodeJt(cid, k, payload) {
    const seedSrc = `${cid}:${k}`;
    let e = 0;
    for (let idx = 0; idx < seedSrc.length; idx += 1) {
      e += seedSrc.charCodeAt(idx) << idx % 16;
    }
    e &= 2147483647;
    if (e === 0) {
      e = 305419896;
    }
    let u = e;
    let out = "";
    for (let idx = 0; idx < payload.length; idx += 1) {
      u = u >>> 1 ^ 1210056708 & -(u & 1);
      const ch = ((payload.charCodeAt(idx) - 32 + u) % 94 + 94) % 94 + 32;
      out += String.fromCharCode(ch);
    }
    return JSON.parse(out);
  }
  function pickFirst(value, label) {
    if (!Array.isArray(value) || value.length < 1 || !value[0] || typeof value[0] !== "object") {
      fail(`${label}: items[0] missing.`);
    }
    return value[0];
  }
  function parsePositiveInt(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) {
      return null;
    }
    const i = Math.floor(n);
    return i > 0 ? i : null;
  }
  function extractTotalCount(item, raw) {
    var _a2, _b2, _c;
    const directKeys = [
      "TotalPage",
      "TotalPages",
      "PageCount",
      "TotalCount",
      "ImageCount",
      "MaxPage"
    ];
    for (const key of directKeys) {
      const got = parsePositiveInt(item[key]);
      if (got !== null) {
        return got;
      }
    }
    const nested = (_c = (_b2 = (_a2 = item.Contents) != null ? _a2 : item.Content) != null ? _b2 : item.Book) != null ? _c : null;
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      const nestedObj = nested;
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
  function parseCntntInfo(raw, cid, k, baseUrl, extraQuery) {
    var _a2, _b2, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l;
    const resultCode = Number(raw.result);
    if (resultCode !== 1) {
      fail(
        `bibGetCntntInfo failed: result=${String((_a2 = raw.result) != null ? _a2 : "")} eurl=${String((_b2 = raw.eurl) != null ? _b2 : "")}`
      );
    }
    const item = pickFirst(raw.items, "bibGetCntntInfo");
    const contentsServer = String((_c = item.ContentsServer) != null ? _c : "");
    if (!contentsServer) {
      fail("ContentsServer missing.");
    }
    const sbcurl = new URL(contentsServer.replace(/\/?$/, "/"), baseUrl).toString();
    const serverTypeNum = Number((_d = item.ServerType) != null ? _d : 0);
    const servertype = serverTypeNum === 1 ? "direct" : serverTypeNum === 2 ? "rest" : "sbc";
    const viewmode = Number(item.ViewMode);
    if (viewmode === -1 || !Number.isFinite(viewmode)) {
      fail(`Invalid ViewMode: ${String((_e = item.ViewMode) != null ? _e : "")}`);
    }
    const tokenRaw = item.p;
    const token = typeof tokenRaw === "string" ? tokenRaw : "null";
    const stblRaw = String((_f = item.stbl) != null ? _f : "");
    const ttblRaw = String((_g = item.ttbl) != null ? _g : "");
    const ctblRaw = String((_h = item.ctbl) != null ? _h : "");
    const ptblRaw = String((_i = item.ptbl) != null ? _i : "");
    if (!stblRaw || !ttblRaw || !ctblRaw || !ptblRaw) {
      fail("Scramble table missing in cntntinfo result=1.");
    }
    const stbl = toFiniteNumberArray(decodeJt(cid, k, stblRaw), "stbl");
    const ttbl = toFiniteNumberArray(decodeJt(cid, k, ttblRaw), "ttbl");
    const ctbl = toArray(decodeJt(cid, k, ctblRaw), (v) => String(v));
    const ptbl = toArray(decodeJt(cid, k, ptblRaw), (v) => String(v));
    const contentDate = String((_j = item.ContentDate) != null ? _j : "");
    const totalCount = extractTotalCount(item, raw);
    const title = String((_l = (_k = item.SubTitle) != null ? _k : item.Title) != null ? _l : "").trim();
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
      extraQuery
    };
  }
  function parseContent(raw) {
    var _a2, _b2, _c;
    const resultCode = Number(raw.result);
    if (resultCode !== 1) {
      fail(`sbcGetCntnt/content failed: result=${String((_a2 = raw.result) != null ? _a2 : "")}`);
    }
    const ttx = String((_b2 = raw.ttx) != null ? _b2 : "");
    if (!ttx) {
      fail("ttx missing.");
    }
    const imageClass = String((_c = raw.ImageClass) != null ? _c : "");
    return { ttx, imageClass };
  }
  function attrsToObject(rawAttrs) {
    var _a2, _b2, _c;
    const out = {};
    const re = /([A-Za-z0-9_.:-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
    let m;
    while (true) {
      m = re.exec(rawAttrs);
      if (!m) {
        break;
      }
      const key = m[1];
      const value = (_c = (_b2 = (_a2 = m[3]) != null ? _a2 : m[4]) != null ? _b2 : m[5]) != null ? _c : "";
      out[key] = value;
    }
    return out;
  }
  function parseImagesFromTtx(ttx) {
    var _a2, _b2, _c, _d, _e, _f;
    const caseMatch = ttx.match(/<t-case\b[^>]*>([\s\S]*?)<\/t-case>/im);
    const parseTarget = (_a2 = caseMatch == null ? void 0 : caseMatch[1]) != null ? _a2 : ttx;
    const re = /<(t-img|img)(\s+([^>]*?)|)\s*>/gim;
    const out = [];
    let m;
    while (true) {
      m = re.exec(parseTarget);
      if (!m) {
        break;
      }
      const attrs = attrsToObject((_b2 = m[2]) != null ? _b2 : "");
      const src = (_c = attrs.src) != null ? _c : "";
      const orgwidth = Number((_d = attrs.orgwidth) != null ? _d : "0");
      const orgheight = Number((_e = attrs.orgheight) != null ? _e : "0");
      const id = (_f = attrs.id) != null ? _f : `img_${out.length + 1}`;
      if (!src || !Number.isFinite(orgwidth) || !Number.isFinite(orgheight) || orgwidth <= 0 || orgheight <= 0) {
        continue;
      }
      out.push({ id, src, orgwidth, orgheight });
    }
    return out;
  }
  function resolveCntntInfoUrl() {
    const ptbinb = document.querySelector("[data-ptbinb]");
    const dataPtbinb = ptbinb == null ? void 0 : ptbinb.getAttribute("data-ptbinb");
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
  function getCid() {
    var _a2;
    const cid = (_a2 = new URLSearchParams(location.search).get("cid")) != null ? _a2 : "";
    if (!cid) {
      fail("cid missing in query string.");
    }
    return cid;
  }
  function collectExtraQuery(sourceUrl) {
    var _a2;
    const out = {};
    const locationQuery = new URLSearchParams(location.search);
    for (const [key, value] of sourceUrl.searchParams.entries()) {
      if (key === "cid" || key === "k" || key === "dmytime") {
        continue;
      }
      out[key] = value;
    }
    for (const key of U_KEYS) {
      const value = (_a2 = sourceUrl.searchParams.get(key)) != null ? _a2 : locationQuery.get(key);
      if (value !== null) {
        out[key] = value;
      }
    }
    return out;
  }
  function setQueryParams(url, params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }
  async function gmRequest(url, responseType, label) {
    var _a2, _b2, _c;
    if (typeof GM_xmlhttpRequest !== "function") {
      fail(`${label} failed: GM_xmlhttpRequest unavailable`);
    }
    const result = await new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: "GET",
        url: url.toString(),
        responseType: responseType === "blob" ? "arraybuffer" : "text",
        withCredentials: true,
        anonymous: false,
        timeout: REQUEST_TIMEOUT_MS,
        onload: (res) => resolve(res),
        onerror: (err2) => reject(err2),
        ontimeout: () => reject(new Error("timeout"))
      });
    });
    if (!(result.status >= 200 && result.status < 300)) {
      const preview = String((_a2 = result.responseText) != null ? _a2 : "").slice(0, 240).replace(/\s+/g, " ");
      fail(`${label} failed: HTTP ${result.status || 0} ${preview}`.trim());
    }
    if (responseType === "blob") {
      if (!(result.response instanceof ArrayBuffer)) {
        fail(`${label} failed: GM invalid arraybuffer`);
      }
      return { status: result.status, blob: new Blob([result.response]) };
    }
    return { status: result.status, text: (_c = result.responseText) != null ? _c : String((_b2 = result.response) != null ? _b2 : "") };
  }
  function sortUrlQuery(url) {
    const pairs = [...url.searchParams.entries()].sort(([a], [b]) => a.localeCompare(b));
    url.search = "";
    for (const [key, value] of pairs) {
      url.searchParams.append(key, value);
    }
  }
  function assignSortedEncodedQuery(url) {
    url.search = [...url.searchParams.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join("&");
  }
  async function fetchText(url, label) {
    var _a2;
    const gm = await gmRequest(url, "text", label);
    return (_a2 = gm.text) != null ? _a2 : "";
  }
  async function fetchBlob(url, label) {
    const gm = await gmRequest(url, "blob", label);
    if (!gm.blob) {
      fail(`${label} failed: GM empty blob`);
    }
    return gm.blob;
  }
  var IdentityEngine = class {
    wt() {
      return true;
    }
    It(_size) {
      return false;
    }
    yt(size) {
      return size;
    }
    Ot(size) {
      return [fullImageCoord(size.width, size.height)];
    }
  };
  function fullImageCoord(width, height) {
    return { xsrc: 0, ysrc: 0, width, height, xdest: 0, ydest: 0 };
  }
  var TypeAEngine = class {
    constructor(t, i) {
      this.Tt = null;
      this.Pt = null;
      const n = this.Ct(t);
      const r = this.Ct(i);
      if (n && r && n.ndx === r.ndx && n.ndy === r.ndy) {
        this.Tt = n;
        this.Pt = r;
      }
    }
    wt() {
      return this.Tt !== null && this.Pt !== null;
    }
    It(size) {
      return size.width >= 64 && size.height >= 64 && size.width * size.height >= 102400;
    }
    yt(size) {
      return size;
    }
    Ot(size) {
      if (!this.wt() || !this.Tt || !this.Pt) {
        return null;
      }
      if (!this.It(size)) {
        return [{ xsrc: 0, ysrc: 0, width: size.width, height: size.height, xdest: 0, ydest: 0 }];
      }
      const out = [];
      const n = size.width - size.width % 8;
      const r = Math.floor((n - 1) / 7) - Math.floor((n - 1) / 7) % 8;
      const e = n - 7 * r;
      const s = size.height - size.height % 8;
      const h = Math.floor((s - 1) / 7) - Math.floor((s - 1) / 7) % 8;
      const u = s - 7 * h;
      for (let idx = 0; idx < this.Tt.piece.length; idx += 1) {
        const f = this.Tt.piece[idx];
        const c = this.Pt.piece[idx];
        out.push({
          xsrc: Math.floor(f.x / 2) * r + f.x % 2 * e,
          ysrc: Math.floor(f.y / 2) * h + f.y % 2 * u,
          width: Math.floor(f.w / 2) * r + f.w % 2 * e,
          height: Math.floor(f.h / 2) * h + f.h % 2 * u,
          xdest: Math.floor(c.x / 2) * r + c.x % 2 * e,
          ydest: Math.floor(c.y / 2) * h + c.y % 2 * u
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
          ydest: 0
        });
      }
      if (v < size.height) {
        out.push({
          xsrc: 0,
          ysrc: v,
          width: size.width,
          height: size.height - v,
          xdest: 0,
          ydest: v
        });
      }
      return out;
    }
    At(ch) {
      let i = 0;
      let n = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".indexOf(ch);
      if (n < 0) {
        n = "abcdefghijklmnopqrstuvwxyz".indexOf(ch);
      } else {
        i = 1;
      }
      return i + 2 * n;
    }
    Ct(raw) {
      var _a2;
      if (!raw) {
        return null;
      }
      const seg = raw.split("-");
      if (seg.length !== 3) {
        return null;
      }
      const n = Number(seg[0]);
      const r = Number(seg[1]);
      const e = (_a2 = seg[2]) != null ? _a2 : "";
      if (!Number.isFinite(n) || !Number.isFinite(r) || e.length !== n * r * 2) {
        return null;
      }
      const a = (n - 1) * (r - 1) - 1;
      const f = n - 1 + a;
      const c = r - 1 + f;
      const l = 1 + c;
      const piece = [];
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
  };
  var TypeSEngine = class {
    constructor(t, i) {
      this.T = 0;
      this.j = 0;
      this.Dt = 0;
      this.Rt = [];
      this.Ft = [];
      this.Lt = [];
      this.Nt = [];
      this.kt = null;
      const n = t.match(/^=([0-9]+)-([0-9]+)([-+])([0-9]+)-([-_0-9A-Za-z]+)$/);
      const r = i.match(/^=([0-9]+)-([0-9]+)([-+])([0-9]+)-([-_0-9A-Za-z]+)$/);
      if (!n || !r || n[1] !== r[1] || n[2] !== r[2] || n[4] !== r[4] || n[3] !== "+" || r[3] !== "-") {
        return;
      }
      this.T = Number(n[1]);
      this.j = Number(n[2]);
      this.Dt = Number(n[4]);
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
      const mapped = [];
      for (let u = 0; u < this.T * this.j; u += 1) {
        mapped.push(s.p[h.p[u]]);
      }
      this.kt = mapped;
    }
    wt() {
      return this.kt !== null;
    }
    It(size) {
      const i = 2 * this.T * this.Dt;
      const n = 2 * this.j * this.Dt;
      return size.width >= 64 + i && size.height >= 64 + n && size.width * size.height >= (320 + i) * (320 + n);
    }
    yt(size) {
      if (!this.It(size)) {
        return size;
      }
      return {
        width: size.width - 2 * this.T * this.Dt,
        height: size.height - 2 * this.j * this.Dt
      };
    }
    Ot(size) {
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
      const out = [];
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
            ydest: g
          });
        }
      }
      return out;
    }
    decodeChar(ch) {
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
    Ct(raw) {
      const t = [];
      const n = [];
      const p = [];
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
  };
  var BinbReader = class {
    constructor(cid, info, content, config) {
      this.cid = cid;
      this.info = info;
      this.content = content;
      this.config = config;
    }
    getImageUrl(src) {
      const imageClass = this.content.imageClass;
      const isSingleQuality = imageClass === "singlequality";
      const q = this.config.useHighQualityImage ? "0" : "1";
      if (this.info.servertype === "direct") {
        const fileName = isSingleQuality ? "M.jpg" : this.config.useHighQualityImage ? "M_H.jpg" : "M_L.jpg";
        const base = new URL(`${src}/`, this.info.sbcurl);
        const u2 = new URL(fileName, base);
        if (this.info.contentDate) {
          u2.searchParams.set("dmytime", this.info.contentDate);
        }
        return u2;
      }
      if (this.info.servertype === "rest") {
        const u2 = new URL(`img/${src}`, this.info.sbcurl);
        if (!(isSingleQuality || this.config.useHighQualityImage)) {
          u2.searchParams.set("q", "1");
        }
        if (this.info.contentDate) {
          u2.searchParams.set("dmytime", this.info.contentDate);
        }
        setQueryParams(u2, this.info.extraQuery);
        assignSortedEncodedQuery(u2);
        return u2;
      }
      const u = new URL("sbcGetImg.php", this.info.sbcurl);
      u.searchParams.set("cid", this.cid);
      u.searchParams.set("src", src);
      if (this.info.token) {
        u.searchParams.set("p", this.info.token);
      }
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
    getImageDescrambleCoords(src, width, height) {
      const engine = this.pickEngine(src);
      const size = { width, height };
      if (!engine.wt()) {
        return {
          width,
          height,
          transfers: [{ index: 0, coords: [fullImageCoord(width, height)] }]
        };
      }
      const outSize = engine.yt(size);
      const coords = engine.Ot(size);
      if (!coords) {
        return {
          width,
          height,
          transfers: [{ index: 0, coords: [fullImageCoord(width, height)] }]
        };
      }
      return { width: outSize.width, height: outSize.height, transfers: [{ index: 0, coords }] };
    }
    pickEngine(src) {
      var _a2, _b2;
      const idx = [0, 0];
      if (src) {
        const start2 = src.lastIndexOf("/") + 1;
        const len = src.length - start2;
        for (let e = 0; e < len; e += 1) {
          idx[e % 2] += src.charCodeAt(start2 + e);
        }
        idx[0] %= 8;
        idx[1] %= 8;
      }
      const s = (_a2 = this.info.ptbl[idx[0]]) != null ? _a2 : "";
      const h = (_b2 = this.info.ctbl[idx[1]]) != null ? _b2 : "";
      if (h.startsWith("=") && s.startsWith("=")) {
        return new TypeSEngine(h, s);
      }
      if (/^[0-9]/.test(h) && /^[0-9]/.test(s)) {
        return new TypeAEngine(h, s);
      }
      return new IdentityEngine();
    }
  };
  async function blobToBitmap(blob) {
    return await createImageBitmap(blob);
  }
  async function drawDescrambled(bitmap, descramble) {
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
  async function buildZipBlobStream(items, from, reader, onProgress) {
    const chunks = [];
    const doneZip = new Promise((resolve, reject) => {
      const zip = new Zip((err2, data, final) => {
        if (err2) {
          reject(err2);
          return;
        }
        chunks.push(bytesToBlobPart(data));
        if (final) {
          resolve(new Blob(chunks, { type: "application/zip" }));
        }
      });
      let done = 0;
      void runWithConcurrency(items, 4, async (img, index) => {
        const imageUrl = reader.getImageUrl(img.src);
        const blob = await fetchBlob(imageUrl, `Image fetch failed ${img.src}`);
        const bitmap = await blobToBitmap(blob);
        let outBlob;
        try {
          const descramble = reader.getImageDescrambleCoords(img.src, bitmap.width, bitmap.height);
          outBlob = await drawDescrambled(bitmap, descramble);
        } finally {
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
      }).then(() => zip.end()).catch((e) => {
        try {
          zip.terminate();
        } catch (e2) {
        }
        reject(e);
      });
    });
    return await doneZip;
  }
  async function runWithConcurrency(items, concurrency, worker) {
    let cursor = 0;
    const run = async () => {
      while (true) {
        const idx = cursor;
        cursor += 1;
        if (idx >= items.length) {
          return;
        }
        await worker(items[idx], idx);
      }
    };
    const runners = [];
    for (let i = 0; i < Math.max(1, concurrency); i += 1) {
      runners.push(run());
    }
    await Promise.all(runners);
  }
  function buildUi(endAll) {
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
    const state = { root: wrap, btn, status, inputFrom, inputTo };
    btn.onclick = () => {
      void start(state);
    };
    wrap.append(label, inputFrom, tilde, inputTo, btn, status);
    return state;
  }
  async function buildReader() {
    var _a2;
    const cid = getCid();
    const cntntInfoUrl = resolveCntntInfoUrl();
    const extraQuery = collectExtraQuery(cntntInfoUrl);
    const k = (_a2 = cntntInfoUrl.searchParams.get("k")) != null ? _a2 : buildK(cid);
    cntntInfoUrl.searchParams.set("cid", cid);
    cntntInfoUrl.searchParams.set("k", k);
    cntntInfoUrl.searchParams.set("dmytime", Date.now().toString());
    setQueryParams(cntntInfoUrl, extraQuery);
    sortUrlQuery(cntntInfoUrl);
    const infoText = await fetchText(cntntInfoUrl, "bibGetCntntInfo");
    const infoRaw = parseJsonLike(infoText);
    const info = parseCntntInfo(infoRaw, cid, k, cntntInfoUrl.toString(), extraQuery);
    const contentUrl = info.servertype === "direct" ? new URL("content.js", info.sbcurl) : info.servertype === "rest" ? new URL("content", info.sbcurl) : new URL("sbcGetCntnt.php", info.sbcurl);
    if (info.servertype === "sbc") {
      contentUrl.searchParams.set("cid", cid);
      if (info.token) {
        contentUrl.searchParams.set("p", info.token);
      }
      contentUrl.searchParams.set("vm", String(info.viewmode));
      contentUrl.searchParams.set("dmytime", info.contentDate || Date.now().toString());
    } else if (info.servertype === "direct") {
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
      title: info.title
    };
  }
  function sanitizeFileName(raw) {
    return raw.replace(/[\\/:*?"<>|]+/g, "_");
  }
  function formatLocalDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  var cachedContextPromise = null;
  async function getReaderContext() {
    if (!cachedContextPromise) {
      cachedContextPromise = new Promise((resolve, reject) => {
        const timer = window.setTimeout(
          () => reject(new Error("Load content timeout")),
          REQUEST_TIMEOUT_MS
        );
        buildReader().then((v) => {
          window.clearTimeout(timer);
          resolve(v);
        }).catch((e) => {
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
  function normalizeRange(fromRaw, toRaw, max) {
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
  function setUiBusy(ui, busy) {
    ui.btn.disabled = busy;
    ui.inputFrom.disabled = busy;
    ui.inputTo.disabled = busy;
  }
  function isPreloadReady() {
    var _a2, _b2;
    if (!document.body) {
      return false;
    }
    const qs = new URLSearchParams(location.search);
    if (!((_a2 = qs.get("cid")) != null ? _a2 : "")) {
      return false;
    }
    const dataPtbinb = (_b2 = document.querySelector("[data-ptbinb]")) == null ? void 0 : _b2.getAttribute("data-ptbinb");
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
  async function waitForPreloadReady(maxWaitMs = 5e3) {
    if (isPreloadReady()) {
      return;
    }
    await new Promise((resolve) => {
      let settled = false;
      const finish = () => {
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
        attributeFilter: ["data-ptbinb"]
      });
      const pollTimer = window.setInterval(() => {
        if (isPreloadReady()) {
          finish();
        }
      }, 120);
      const timeoutTimer = window.setTimeout(
        () => {
          finish();
        },
        Math.max(500, maxWaitMs)
      );
    });
  }
  function sleep(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }
  function shouldRetryPreload(message) {
    return /HTTP 0|HTTP 403|HTTP 404|network|NetworkError|timeout/i.test(message);
  }
  async function preloadTotal(ui) {
    ui.status.textContent = "Loading total...";
    await waitForPreloadReady();
    const context = await getReaderContext();
    const total = Math.max(1, context.totalCount || context.images.length);
    ui.inputTo.value = String(total);
    ui.status.textContent = `Ready (${total})`;
  }
  async function preloadTotalWithRetry(ui) {
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
  async function runSelectedRange(ui) {
    const { status, inputFrom, inputTo } = ui;
    status.textContent = "Loading content...";
    const { reader, images, cid, totalCount, title } = await getReaderContext();
    const total = Math.max(1, totalCount || images.length);
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
    const zipName = `${nameBase}_${String(from).padStart(4, "0")}-${String(to).padStart(4, "0")}_${formatLocalDate(/* @__PURE__ */ new Date())}.zip`;
    (0, import_file_saver.saveAs)(blob, zipName);
    status.textContent = "Done";
  }
  async function start(ui) {
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
    const mount = () => {
      if (document.getElementById("__mca_panel")) {
        return;
      }
      const ui = buildUi(9999);
      document.body.appendChild(ui.root);
      let preloadStarted = false;
      const startPreload = () => {
        if (preloadStarted) {
          return;
        }
        preloadStarted = true;
        void preloadTotalWithRetry(ui);
      };
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
})();

