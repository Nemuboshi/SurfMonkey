// ==UserScript==
// @name Unext Subtitle Harvest
// @namespace github.com/Nemuboshi/SurfMonkey
// @version 1.0.0
// @description Download every episode's subtitles (WEBVTT + SRT with ruby and positioning) for a U-NEXT series as one ZIP.
// @match https://video.unext.jp/*
// @grant none
// @run-at document-idle
// ==/UserScript==

"use strict";
(() => {
  // node_modules/.pnpm/fflate@0.8.2/node_modules/fflate/esm/browser.js
  var ch2 = {};
  var wk = (function(c, id, msg, transfer, cb) {
    var w = new Worker(ch2[id] || (ch2[id] = URL.createObjectURL(new Blob([
      c + ';addEventListener("error",function(e){e=e.error;postMessage({$e$:[e.message,e.code,e.stack]})})'
    ], { type: "text/javascript" }))));
    w.onmessage = function(e) {
      var d = e.data, ed = d.$e$;
      if (ed) {
        var err2 = new Error(ed[0]);
        err2["code"] = ed[1];
        err2.stack = ed[2];
        cb(err2, null);
      } else
        cb(null, d);
    };
    w.postMessage(msg, transfer);
    return w;
  });
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
  var hMap = (function(cd, mb, r) {
    var s = cd.length;
    var i = 0;
    var l = new u16(mb);
    for (; i < s; ++i) {
      if (cd[i])
        ++l[cd[i] - 1];
    }
    var le = new u16(mb);
    for (i = 1; i < mb; ++i) {
      le[i] = le[i - 1] + l[i - 1] << 1;
    }
    var co;
    if (r) {
      co = new u16(1 << mb);
      var rvb = 15 - mb;
      for (i = 0; i < s; ++i) {
        if (cd[i]) {
          var sv = i << 4 | cd[i];
          var r_1 = mb - cd[i];
          var v = le[cd[i] - 1]++ << r_1;
          for (var m = v | (1 << r_1) - 1; v <= m; ++v) {
            co[rev[v] >> rvb] = sv;
          }
        }
      }
    } else {
      co = new u16(s);
      for (i = 0; i < s; ++i) {
        if (cd[i]) {
          co[i] = rev[le[cd[i] - 1]++] >> 15 - cd[i];
        }
      }
    }
    return co;
  });
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
  var flm = /* @__PURE__ */ hMap(flt, 9, 0);
  var fdm = /* @__PURE__ */ hMap(fdt, 5, 0);
  var shft = function(p) {
    return (p + 7) / 8 | 0;
  };
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
  var wbits = function(d, p, v) {
    v <<= p & 7;
    var o = p / 8 | 0;
    d[o] |= v;
    d[o + 1] |= v >> 8;
  };
  var wbits16 = function(d, p, v) {
    v <<= p & 7;
    var o = p / 8 | 0;
    d[o] |= v;
    d[o + 1] |= v >> 8;
    d[o + 2] |= v >> 16;
  };
  var hTree = function(d, mb) {
    var t = [];
    for (var i = 0; i < d.length; ++i) {
      if (d[i])
        t.push({ s: i, f: d[i] });
    }
    var s = t.length;
    var t2 = t.slice();
    if (!s)
      return { t: et, l: 0 };
    if (s == 1) {
      var v = new u8(t[0].s + 1);
      v[t[0].s] = 1;
      return { t: v, l: 1 };
    }
    t.sort(function(a, b) {
      return a.f - b.f;
    });
    t.push({ s: -1, f: 25001 });
    var l = t[0], r = t[1], i0 = 0, i1 = 1, i2 = 2;
    t[0] = { s: -1, f: l.f + r.f, l, r };
    while (i1 != s - 1) {
      l = t[t[i0].f < t[i2].f ? i0++ : i2++];
      r = t[i0 != i1 && t[i0].f < t[i2].f ? i0++ : i2++];
      t[i1++] = { s: -1, f: l.f + r.f, l, r };
    }
    var maxSym = t2[0].s;
    for (var i = 1; i < s; ++i) {
      if (t2[i].s > maxSym)
        maxSym = t2[i].s;
    }
    var tr = new u16(maxSym + 1);
    var mbt = ln(t[i1 - 1], tr, 0);
    if (mbt > mb) {
      var i = 0, dt = 0;
      var lft = mbt - mb, cst = 1 << lft;
      t2.sort(function(a, b) {
        return tr[b.s] - tr[a.s] || a.f - b.f;
      });
      for (; i < s; ++i) {
        var i2_1 = t2[i].s;
        if (tr[i2_1] > mb) {
          dt += cst - (1 << mbt - tr[i2_1]);
          tr[i2_1] = mb;
        } else
          break;
      }
      dt >>= lft;
      while (dt > 0) {
        var i2_2 = t2[i].s;
        if (tr[i2_2] < mb)
          dt -= 1 << mb - tr[i2_2]++ - 1;
        else
          ++i;
      }
      for (; i >= 0 && dt; --i) {
        var i2_3 = t2[i].s;
        if (tr[i2_3] == mb) {
          --tr[i2_3];
          ++dt;
        }
      }
      mbt = mb;
    }
    return { t: new u8(tr), l: mbt };
  };
  var ln = function(n, l, d) {
    return n.s == -1 ? Math.max(ln(n.l, l, d + 1), ln(n.r, l, d + 1)) : l[n.s] = d;
  };
  var lc = function(c) {
    var s = c.length;
    while (s && !c[--s])
      ;
    var cl = new u16(++s);
    var cli = 0, cln = c[0], cls = 1;
    var w = function(v) {
      cl[cli++] = v;
    };
    for (var i = 1; i <= s; ++i) {
      if (c[i] == cln && i != s)
        ++cls;
      else {
        if (!cln && cls > 2) {
          for (; cls > 138; cls -= 138)
            w(32754);
          if (cls > 2) {
            w(cls > 10 ? cls - 11 << 5 | 28690 : cls - 3 << 5 | 12305);
            cls = 0;
          }
        } else if (cls > 3) {
          w(cln), --cls;
          for (; cls > 6; cls -= 6)
            w(8304);
          if (cls > 2)
            w(cls - 3 << 5 | 8208), cls = 0;
        }
        while (cls--)
          w(cln);
        cls = 1;
        cln = c[i];
      }
    }
    return { c: cl.subarray(0, cli), n: s };
  };
  var clen = function(cf, cl) {
    var l = 0;
    for (var i = 0; i < cl.length; ++i)
      l += cf[i] * cl[i];
    return l;
  };
  var wfblk = function(out, pos, dat) {
    var s = dat.length;
    var o = shft(pos + 2);
    out[o] = s & 255;
    out[o + 1] = s >> 8;
    out[o + 2] = out[o] ^ 255;
    out[o + 3] = out[o + 1] ^ 255;
    for (var i = 0; i < s; ++i)
      out[o + i + 4] = dat[i];
    return (o + 4 + s) * 8;
  };
  var wblk = function(dat, out, final, syms, lf, df, eb, li, bs, bl, p) {
    wbits(out, p++, final);
    ++lf[256];
    var _a2 = hTree(lf, 15), dlt = _a2.t, mlb = _a2.l;
    var _b2 = hTree(df, 15), ddt = _b2.t, mdb = _b2.l;
    var _c = lc(dlt), lclt = _c.c, nlc = _c.n;
    var _d = lc(ddt), lcdt = _d.c, ndc = _d.n;
    var lcfreq = new u16(19);
    for (var i = 0; i < lclt.length; ++i)
      ++lcfreq[lclt[i] & 31];
    for (var i = 0; i < lcdt.length; ++i)
      ++lcfreq[lcdt[i] & 31];
    var _e = hTree(lcfreq, 7), lct = _e.t, mlcb = _e.l;
    var nlcc = 19;
    for (; nlcc > 4 && !lct[clim[nlcc - 1]]; --nlcc)
      ;
    var flen = bl + 5 << 3;
    var ftlen = clen(lf, flt) + clen(df, fdt) + eb;
    var dtlen = clen(lf, dlt) + clen(df, ddt) + eb + 14 + 3 * nlcc + clen(lcfreq, lct) + 2 * lcfreq[16] + 3 * lcfreq[17] + 7 * lcfreq[18];
    if (bs >= 0 && flen <= ftlen && flen <= dtlen)
      return wfblk(out, p, dat.subarray(bs, bs + bl));
    var lm, ll, dm, dl;
    wbits(out, p, 1 + (dtlen < ftlen)), p += 2;
    if (dtlen < ftlen) {
      lm = hMap(dlt, mlb, 0), ll = dlt, dm = hMap(ddt, mdb, 0), dl = ddt;
      var llm = hMap(lct, mlcb, 0);
      wbits(out, p, nlc - 257);
      wbits(out, p + 5, ndc - 1);
      wbits(out, p + 10, nlcc - 4);
      p += 14;
      for (var i = 0; i < nlcc; ++i)
        wbits(out, p + 3 * i, lct[clim[i]]);
      p += 3 * nlcc;
      var lcts = [lclt, lcdt];
      for (var it = 0; it < 2; ++it) {
        var clct = lcts[it];
        for (var i = 0; i < clct.length; ++i) {
          var len = clct[i] & 31;
          wbits(out, p, llm[len]), p += lct[len];
          if (len > 15)
            wbits(out, p, clct[i] >> 5 & 127), p += clct[i] >> 12;
        }
      }
    } else {
      lm = flm, ll = flt, dm = fdm, dl = fdt;
    }
    for (var i = 0; i < li; ++i) {
      var sym = syms[i];
      if (sym > 255) {
        var len = sym >> 18 & 31;
        wbits16(out, p, lm[len + 257]), p += ll[len + 257];
        if (len > 7)
          wbits(out, p, sym >> 23 & 31), p += fleb[len];
        var dst = sym & 31;
        wbits16(out, p, dm[dst]), p += dl[dst];
        if (dst > 3)
          wbits16(out, p, sym >> 5 & 8191), p += fdeb[dst];
      } else {
        wbits16(out, p, lm[sym]), p += ll[sym];
      }
    }
    wbits16(out, p, lm[256]);
    return p + ll[256];
  };
  var deo = /* @__PURE__ */ new i32([65540, 131080, 131088, 131104, 262176, 1048704, 1048832, 2114560, 2117632]);
  var et = /* @__PURE__ */ new u8(0);
  var dflt = function(dat, lvl, plvl, pre, post, st) {
    var s = st.z || dat.length;
    var o = new u8(pre + s + 5 * (1 + Math.ceil(s / 7e3)) + post);
    var w = o.subarray(pre, o.length - post);
    var lst = st.l;
    var pos = (st.r || 0) & 7;
    if (lvl) {
      if (pos)
        w[0] = st.r >> 3;
      var opt = deo[lvl - 1];
      var n = opt >> 13, c = opt & 8191;
      var msk_1 = (1 << plvl) - 1;
      var prev = st.p || new u16(32768), head = st.h || new u16(msk_1 + 1);
      var bs1_1 = Math.ceil(plvl / 3), bs2_1 = 2 * bs1_1;
      var hsh = function(i2) {
        return (dat[i2] ^ dat[i2 + 1] << bs1_1 ^ dat[i2 + 2] << bs2_1) & msk_1;
      };
      var syms = new i32(25e3);
      var lf = new u16(288), df = new u16(32);
      var lc_1 = 0, eb = 0, i = st.i || 0, li = 0, wi = st.w || 0, bs = 0;
      for (; i + 2 < s; ++i) {
        var hv = hsh(i);
        var imod = i & 32767, pimod = head[hv];
        prev[imod] = pimod;
        head[hv] = imod;
        if (wi <= i) {
          var rem = s - i;
          if ((lc_1 > 7e3 || li > 24576) && (rem > 423 || !lst)) {
            pos = wblk(dat, w, 0, syms, lf, df, eb, li, bs, i - bs, pos);
            li = lc_1 = eb = 0, bs = i;
            for (var j = 0; j < 286; ++j)
              lf[j] = 0;
            for (var j = 0; j < 30; ++j)
              df[j] = 0;
          }
          var l = 2, d = 0, ch_1 = c, dif = imod - pimod & 32767;
          if (rem > 2 && hv == hsh(i - dif)) {
            var maxn = Math.min(n, rem) - 1;
            var maxd = Math.min(32767, i);
            var ml = Math.min(258, rem);
            while (dif <= maxd && --ch_1 && imod != pimod) {
              if (dat[i + l] == dat[i + l - dif]) {
                var nl = 0;
                for (; nl < ml && dat[i + nl] == dat[i + nl - dif]; ++nl)
                  ;
                if (nl > l) {
                  l = nl, d = dif;
                  if (nl > maxn)
                    break;
                  var mmd = Math.min(dif, nl - 2);
                  var md = 0;
                  for (var j = 0; j < mmd; ++j) {
                    var ti = i - dif + j & 32767;
                    var pti = prev[ti];
                    var cd = ti - pti & 32767;
                    if (cd > md)
                      md = cd, pimod = ti;
                  }
                }
              }
              imod = pimod, pimod = prev[imod];
              dif += imod - pimod & 32767;
            }
          }
          if (d) {
            syms[li++] = 268435456 | revfl[l] << 18 | revfd[d];
            var lin = revfl[l] & 31, din = revfd[d] & 31;
            eb += fleb[lin] + fdeb[din];
            ++lf[257 + lin];
            ++df[din];
            wi = i + l;
            ++lc_1;
          } else {
            syms[li++] = dat[i];
            ++lf[dat[i]];
          }
        }
      }
      for (i = Math.max(i, wi); i < s; ++i) {
        syms[li++] = dat[i];
        ++lf[dat[i]];
      }
      pos = wblk(dat, w, lst, syms, lf, df, eb, li, bs, i - bs, pos);
      if (!lst) {
        st.r = pos & 7 | w[pos / 8 | 0] << 3;
        pos -= 7;
        st.h = head, st.p = prev, st.i = i, st.w = wi;
      }
    } else {
      for (var i = st.w || 0; i < s + lst; i += 65535) {
        var e = i + 65535;
        if (e >= s) {
          w[pos / 8 | 0] = lst;
          e = s;
        }
        pos = wfblk(w, pos + 1, dat.subarray(i, e));
      }
      st.i = s;
    }
    return slc(o, 0, pre + shft(pos) + post);
  };
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
  var dopt = function(dat, opt, pre, post, st) {
    if (!st) {
      st = { l: 1 };
      if (opt.dictionary) {
        var dict = opt.dictionary.subarray(-32768);
        var newDat = new u8(dict.length + dat.length);
        newDat.set(dict);
        newDat.set(dat, dict.length);
        dat = newDat;
        st.w = dict.length;
      }
    }
    return dflt(dat, opt.level == null ? 6 : opt.level, opt.mem == null ? st.l ? Math.ceil(Math.max(8, Math.min(13, Math.log(dat.length))) * 1.5) : 20 : 12 + opt.mem, pre, post, st);
  };
  var mrg = function(a, b) {
    var o = {};
    for (var k in a)
      o[k] = a[k];
    for (var k in b)
      o[k] = b[k];
    return o;
  };
  var wcln = function(fn, fnStr, td2) {
    var dt = fn();
    var st = fn.toString();
    var ks = st.slice(st.indexOf("[") + 1, st.lastIndexOf("]")).replace(/\s+/g, "").split(",");
    for (var i = 0; i < dt.length; ++i) {
      var v = dt[i], k = ks[i];
      if (typeof v == "function") {
        fnStr += ";" + k + "=";
        var st_1 = v.toString();
        if (v.prototype) {
          if (st_1.indexOf("[native code]") != -1) {
            var spInd = st_1.indexOf(" ", 8) + 1;
            fnStr += st_1.slice(spInd, st_1.indexOf("(", spInd));
          } else {
            fnStr += st_1;
            for (var t in v.prototype)
              fnStr += ";" + k + ".prototype." + t + "=" + v.prototype[t].toString();
          }
        } else
          fnStr += st_1;
      } else
        td2[k] = v;
    }
    return fnStr;
  };
  var ch = [];
  var cbfs = function(v) {
    var tl = [];
    for (var k in v) {
      if (v[k].buffer) {
        tl.push((v[k] = new v[k].constructor(v[k])).buffer);
      }
    }
    return tl;
  };
  var wrkr = function(fns, init, id, cb) {
    if (!ch[id]) {
      var fnStr = "", td_1 = {}, m = fns.length - 1;
      for (var i = 0; i < m; ++i)
        fnStr = wcln(fns[i], fnStr, td_1);
      ch[id] = { c: wcln(fns[m], fnStr, td_1), e: td_1 };
    }
    var td2 = mrg({}, ch[id].e);
    return wk(ch[id].c + ";onmessage=function(e){for(var k in e.data)self[k]=e.data[k];onmessage=" + init.toString() + "}", id, td2, cbfs(td2), cb);
  };
  var bDflt = function() {
    return [u8, u16, i32, fleb, fdeb, clim, revfl, revfd, flm, flt, fdm, fdt, rev, deo, et, hMap, wbits, wbits16, hTree, ln, lc, clen, wfblk, wblk, shft, slc, dflt, dopt, deflateSync, pbf];
  };
  var pbf = function(msg) {
    return postMessage(msg, [msg.buffer]);
  };
  var cbify = function(dat, opts, fns, init, id, cb) {
    var w = wrkr(fns, init, id, function(err2, dat2) {
      w.terminate();
      cb(err2, dat2);
    });
    w.postMessage([dat, opts], opts.consume ? [dat.buffer] : []);
    return function() {
      w.terminate();
    };
  };
  var wbytes = function(d, b, v) {
    for (; v; ++b)
      d[b] = v, v >>>= 8;
  };
  function deflate(data, opts, cb) {
    if (!cb)
      cb = opts, opts = {};
    if (typeof cb != "function")
      err(7);
    return cbify(data, opts, [
      bDflt
    ], function(ev) {
      return pbf(deflateSync(ev.data[0], ev.data[1]));
    }, 0, cb);
  }
  function deflateSync(data, opts) {
    return dopt(data, opts || {}, 0, 0);
  }
  var fltn = function(d, p, t, o) {
    for (var k in d) {
      var val = d[k], n = p + k, op = o;
      if (Array.isArray(val))
        op = mrg(o, val[1]), val = val[0];
      if (val instanceof u8)
        t[n] = [val, op];
      else {
        t[n += "/"] = [new u8(0), op];
        fltn(val, n, t, o);
      }
    }
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
  function zip(data, opts, cb) {
    if (!cb)
      cb = opts, opts = {};
    if (typeof cb != "function")
      err(7);
    var r = {};
    fltn(data, "", r, opts);
    var k = Object.keys(r);
    var lft = k.length, o = 0, tot = 0;
    var slft = lft, files = new Array(lft);
    var term = [];
    var tAll = function() {
      for (var i2 = 0; i2 < term.length; ++i2)
        term[i2]();
    };
    var cbd = function(a, b) {
      mt(function() {
        cb(a, b);
      });
    };
    mt(function() {
      cbd = cb;
    });
    var cbf = function() {
      var out = new u8(tot + 22), oe = o, cdl = tot - o;
      tot = 0;
      for (var i2 = 0; i2 < slft; ++i2) {
        var f = files[i2];
        try {
          var l = f.c.length;
          wzh(out, tot, f, f.f, f.u, l);
          var badd = 30 + f.f.length + exfl(f.extra);
          var loc = tot + badd;
          out.set(f.c, loc);
          wzh(out, o, f, f.f, f.u, l, tot, f.m), o += 16 + badd + (f.m ? f.m.length : 0), tot = loc + l;
        } catch (e) {
          return cbd(e, null);
        }
      }
      wzf(out, o, files.length, cdl, oe);
      cbd(null, out);
    };
    if (!lft)
      cbf();
    var _loop_1 = function(i2) {
      var fn = k[i2];
      var _a2 = r[fn], file = _a2[0], p = _a2[1];
      var c = crc(), size = file.length;
      c.p(file);
      var f = strToU8(fn), s = f.length;
      var com = p.comment, m = com && strToU8(com), ms = m && m.length;
      var exl = exfl(p.extra);
      var compression = p.level == 0 ? 0 : 8;
      var cbl = function(e, d) {
        if (e) {
          tAll();
          cbd(e, null);
        } else {
          var l = d.length;
          files[i2] = mrg(p, {
            size,
            crc: c.d(),
            c: d,
            f,
            m,
            u: s != fn.length || m && com.length != ms,
            compression
          });
          o += 30 + s + exl + l;
          tot += 76 + 2 * (s + exl) + (ms || 0) + l;
          if (!--lft)
            cbf();
        }
      };
      if (s > 65535)
        cbl(err(11, 0, 1), null);
      if (!compression)
        cbl(null, file);
      else if (size < 16e4) {
        try {
          cbl(null, deflateSync(file, p));
        } catch (e) {
          cbl(e, null);
        }
      } else
        term.push(deflate(file, p, cbl));
    };
    for (var i = 0; i < slft; ++i) {
      _loop_1(i);
    }
    return tAll;
  }
  var mt = typeof queueMicrotask == "function" ? queueMicrotask : typeof setTimeout == "function" ? setTimeout : function(fn) {
    fn();
  };

  // src/shared/webvttSrt.ts
  var TIMESTAMP_RE = /(?:\d{1,2}:)?\d{1,2}:\d{2}(?:[.,]\d{1,3})?/;
  function parseTimestamp(raw) {
    var _a2;
    const cleaned = raw.trim();
    let hours = 0;
    let rest = cleaned;
    if (((_a2 = cleaned.match(/:/g)) != null ? _a2 : []).length >= 2) {
      const idx = cleaned.indexOf(":");
      hours = Number(cleaned.slice(0, idx));
      rest = cleaned.slice(idx + 1);
    }
    const [minutePart, secondPart = "0"] = rest.split(":");
    const seconds = Number(secondPart.replace(",", "."));
    return Math.round(hours * 36e5 + Number(minutePart) * 6e4 + seconds * 1e3);
  }
  function parseSettings(rest) {
    const settings = {};
    for (const token of rest.trim().split(/\s+/)) {
      const [key, ...valueParts] = token.split(":");
      if (!key || valueParts.length === 0) {
        continue;
      }
      const value = valueParts.join(":");
      if (key === "align" || key === "line" || key === "position" || key === "region") {
        settings[key] = value;
      } else if (key === "vertical" || key === "size") {
        settings[key] = value;
      }
    }
    return settings;
  }
  function parseWebvtt(input) {
    const normalized = input.replace(/\r\n?/g, "\n");
    const cues = [];
    for (const chunk of normalized.split(/\n[ \t]*\n/)) {
      const lines = chunk.split("\n");
      if (lines.length === 0 || /^(NOTE|STYLE|REGION)/.test(lines[0])) {
        continue;
      }
      let timingIndex = -1;
      let identifier;
      if (lines[0].includes("-->")) {
        timingIndex = 0;
      } else if (lines.length > 1 && lines[1].includes("-->")) {
        identifier = lines[0].trim();
        timingIndex = 1;
      }
      if (timingIndex === -1) {
        continue;
      }
      const [startRaw, ...endParts] = lines[timingIndex].split("-->");
      const endRest = endParts.join("-->");
      const endMatch = endRest.match(TIMESTAMP_RE);
      if (!endMatch) {
        continue;
      }
      cues.push({
        identifier,
        startMs: parseTimestamp(startRaw),
        endMs: parseTimestamp(endMatch[0]),
        settings: parseSettings(endRest.slice(endMatch[0].length)),
        text: lines.slice(timingIndex + 1).join("\n").trim()
      });
    }
    return cues;
  }
  function cueToAssAnchor(settings) {
    const hasLine = settings.line !== void 0;
    const hasPosition = settings.position !== void 0;
    const hasAlign = settings.align !== void 0;
    if (!hasLine && !hasPosition && !hasAlign) {
      return null;
    }
    let vertical = 2;
    const line = settings.line;
    if (line == null ? void 0 : line.endsWith("%")) {
      const value = parseFloat(line);
      if (Number.isFinite(value)) {
        vertical = value <= 30 ? 0 : value >= 70 ? 2 : 1;
      }
    }
    let horizontal = 1;
    const position = settings.position;
    if (settings.align === "start" || settings.align === "left") {
      horizontal = 0;
    } else if (settings.align === "end" || settings.align === "right") {
      horizontal = 2;
    } else if (settings.align === "center" || settings.align === "middle") {
      horizontal = 1;
    } else if (position == null ? void 0 : position.endsWith("%")) {
      const value = parseFloat(position);
      if (Number.isFinite(value)) {
        horizontal = value <= 33 ? 0 : value >= 67 ? 2 : 1;
      }
    }
    return String([7, 4, 1][vertical] + horizontal);
  }
  function markupToSrtText(text) {
    let out = text.replace(/<rp[^>]*>[\s\S]*?<\/rp>/g, "");
    out = out.replace(
      /<ruby>([\s\S]*?)<rt[^>]*>([\s\S]*?)<\/rt><\/ruby>/g,
      (_m, base, reading) => {
        const cleanBase = base.replace(/<[^>]+>/g, "").trim();
        const cleanReading = reading.replace(/<[^>]+>/g, "").trim();
        return `${cleanBase}(${cleanReading})`;
      }
    );
    out = out.replace(/<\/?(?:c(?:\.[^\s>]+)?|v(?:\.[^\s>]+)?|b|i|u|ruby|rt|rp)>/g, "");
    out = out.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&#(\d+);/g, (_m, code) => String.fromCodePoint(Number(code)));
    return out.replace(/[ \t]+\n/g, "\n").trim();
  }
  function formatSrtTimestamp(ms) {
    const clamped = Math.max(0, Math.round(ms));
    const pad = (n, len = 2) => String(n).padStart(len, "0");
    const hours = Math.floor(clamped / 36e5);
    const minutes = Math.floor(clamped % 36e5 / 6e4);
    const seconds = Math.floor(clamped % 6e4 / 1e3);
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(clamped % 1e3, 3)}`;
  }
  function webvttToSrt(input, keepPositioning = true) {
    const cues = parseWebvtt(input);
    return `${cues.map((cue, i) => {
      const anchor = keepPositioning ? cueToAssAnchor(cue.settings) : null;
      const body = markupToSrtText(cue.text);
      const text = anchor ? `{\\an${anchor}}${body}` : body;
      return `${i + 1}
${formatSrtTimestamp(cue.startMs)} --> ${formatSrtTimestamp(cue.endMs)}
${text}`;
    }).join("\n\n")}
`;
  }

  // src/userscripts/UnextSubtitleHarvest.ts
  var GET_TITLE_HASH = "34793f6c4562e912ea232e6552abc5ea638c7254119188c68fa3b5789851c0a4";
  var GET_PLAYLIST_URL_HASH = "a2309e22a6819ff747cf9a389dd78db35fa3c386fac1d53461061ba20fa44e34";
  var VIDEO_CATEGORY_HASH = "95f198fd95eaefd8b5928aa87ba660514eb3d804a3fdd0333d2b486a44dc9630";
  var GRAPHQL_ORIGIN = "https://cc.unext.jp/";
  var sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  function scrapeZxParams() {
    if (typeof performance === "undefined") {
      return {};
    }
    let zxuid;
    let zxemp;
    for (const entry of performance.getEntriesByType("resource")) {
      const match = entry.name.match(/[?&]zxuid=([0-9a-f]+)&zxemp=(\d+)/);
      if (match) {
        zxuid = match[1];
        zxemp = match[2];
      }
    }
    return zxuid ? { zxemp, zxuid } : {};
  }
  function buildGraphqlUrl(operation, variables, hash) {
    const u = new URL(GRAPHQL_ORIGIN);
    u.searchParams.set("operationName", operation);
    u.searchParams.set("variables", JSON.stringify(variables));
    u.searchParams.set(
      "extensions",
      JSON.stringify({ persistedQuery: { sha256Hash: hash, version: 1 } })
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
  async function graphql(operation, variables, hash) {
    var _a2, _b2, _c;
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
        "x-apollo-operation-name": operation
      },
      method: "GET"
    });
    if (!response.ok) {
      throw new Error(`${operation} -> HTTP ${response.status}`);
    }
    const json = await response.json();
    if ((_a2 = json.errors) == null ? void 0 : _a2.length) {
      throw new Error(`${operation}: ${(_c = (_b2 = json.errors[0]) == null ? void 0 : _b2.message) != null ? _c : "GraphQL error"}`);
    }
    return json;
  }
  async function fetchTitle(sid, seedEd) {
    var _a2, _b2, _c, _d;
    const json = await graphql(
      "cosmo_getTitle",
      { episodeCode: seedEd, episodePage: 1, episodePageSize: 1e3, id: sid },
      GET_TITLE_HASH
    );
    const data = json.data;
    const title = (_b2 = (_a2 = data == null ? void 0 : data.webfront_title_stage) == null ? void 0 : _a2.titleName) != null ? _b2 : sid;
    const rawEpisodes = (_d = (_c = data == null ? void 0 : data.webfront_title_titleEpisodes) == null ? void 0 : _c.episodes) != null ? _d : [];
    const episodes = rawEpisodes.filter(
      (ep) => typeof (ep == null ? void 0 : ep.id) === "string" && /^ED\d+$/.test(ep.id)
    ).map((ep, i) => ({
      ed: ep.id,
      index: i,
      name: typeof ep.episodeName === "string" ? ep.episodeName : ep.id,
      number: typeof ep.displayNo === "string" ? ep.displayNo : String(i + 1)
    }));
    return { episodes, title };
  }
  async function resolveSubtitleVttUrl(ed) {
    var _a2, _b2, _c, _d;
    const json = await graphql(
      "cosmo_getPlaylistUrl",
      { bitrateHigh: null, bitrateLow: 192, code: ed, playMode: "caption", validationOnly: false },
      GET_PLAYLIST_URL_HASH
    );
    const playlist = (_a2 = json.data) == null ? void 0 : _a2.webfront_playlistUrl;
    const token = playlist == null ? void 0 : playlist.playToken;
    const profile = ((_d = (_c = (_b2 = playlist == null ? void 0 : playlist.urlInfo) == null ? void 0 : _b2[0]) == null ? void 0 : _c.movieProfile) != null ? _d : []).find(
      (p) => p.type === "HLS_CMAF" && p.playlistUrl
    );
    if (!token || !(profile == null ? void 0 : profile.playlistUrl)) {
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
    const variant = await (await fetch(vttUrl)).text();
    return resolveFirstSegmentUrl(variant, vttUrl);
  }
  function pickWebvttSubtitleUri(master) {
    var _a2;
    const lines = master.split(/\r?\n/).filter((l) => l.includes("TYPE=SUBTITLES"));
    for (const line of lines) {
      const uri = (_a2 = line.match(/URI="([^"]+)"/)) == null ? void 0 : _a2[1];
      if (uri == null ? void 0 : uri.includes("text_webvtt")) {
        return uri;
      }
    }
    return null;
  }
  function resolveFirstSegmentUrl(variant, baseUrl) {
    for (const line of variant.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        return new URL(trimmed, baseUrl).href;
      }
    }
    throw new Error(`variant playlist for ${baseUrl} had no segment`);
  }
  function sanitizeComponent(name, maxLen = 80) {
    const cleaned = name.replace(/[\\/:*?"<>]|\p{Cc}/gu, " ").replace(/\s+/g, " ").trim().replace(/^\.+/, "").replace(/\.+$/, "");
    const clipped = cleaned.length > maxLen ? cleaned.slice(0, maxLen).trim() : cleaned;
    return clipped || "untitled";
  }
  function episodeFileName(ep) {
    const num = sanitizeComponent(ep.number, 24);
    const name = sanitizeComponent(ep.name, 60);
    const digits = num.match(/\d+/);
    const prefix = digits ? `EP${digits[0].padStart(2, "0")}` : sanitizeComponent(num, 10);
    return `${prefix} ${name}`.trim();
  }
  function extractSeriesId(url = typeof location !== "undefined" ? location.href : "") {
    const patterns = [/\/play\/(SID\d+)/, /\/title\/(SID\d+)/, /[?&]td=(SID\d+)/];
    for (const re of patterns) {
      const m = url.match(re);
      if (m) {
        return m[1];
      }
    }
    return null;
  }
  async function fetchText(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`GET ${url} -> HTTP ${response.status}`);
    }
    return response.text();
  }
  async function collectSubtitles(sid, onProgress) {
    const seed = await fetchSeedEpisode(sid);
    if (!seed) {
      throw new Error(
        `could not find an episode code for ${sid} on this page \u2014 open an episode (play page) and retry`
      );
    }
    const { episodes, title } = await fetchTitle(sid, seed);
    onProgress(`${title}: ${episodes.length} episodes`);
    const entries = [];
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
      await sleep(250 + Math.random() * 500);
    }
    return { entries, title };
  }
  function cueCount(vtt) {
    return parseWebvtt(vtt).length;
  }
  function findSeedEpisode(sid, doc = document) {
    const patterns = [new RegExp(`/play/${sid}/(ED\\d+)`), /episodeCode["':=\s{,]+(ED\d+)/];
    const candidates = [...doc.querySelectorAll("a[href]")].map((a) => a.href);
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
        } catch (e) {
        }
        const m = decoded.match(re);
        if (m) {
          return m[1];
        }
      }
    }
    return null;
  }
  async function fetchSeedEpisode(sid) {
    return findSeedEpisode(sid);
  }
  function buildZip(entries, title) {
    const safeTitle = sanitizeComponent(title, 100);
    const files = {};
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
  function downloadBlob(bytes, fileName) {
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
    setTimeout(() => URL.revokeObjectURL(url), 4e3);
  }
  function ensureStyles() {
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
  function mountHarvestButton(sid) {
    const button = document.createElement("button");
    button.id = "sm-unext-sub-btn";
    button.textContent = "Download all episode subtitles";
    document.body.appendChild(button);
    const panel = document.createElement("div");
    panel.id = "sm-unext-sub-panel";
    document.body.appendChild(panel);
    const log = (message) => {
      panel.style.display = "block";
      const row = document.createElement("div");
      row.className = "row";
      row.textContent = message;
      panel.appendChild(row);
      panel.scrollTop = panel.scrollHeight;
    };
    button.addEventListener("click", async () => {
      button.disabled = true;
      button.textContent = "Working\u2026";
      panel.innerHTML = '<div class="head">U-NEXT subtitle export</div>';
      try {
        const { entries, title } = await collectSubtitles(sid, log);
        if (entries.length === 0) {
          log("No subtitles collected.");
          return;
        }
        log("Packaging ZIP\u2026");
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
  function extractCategoryCode(url = typeof location !== "undefined" ? location.href : "") {
    const segments = new URL(url).pathname.split("/");
    for (let i = segments.length - 1; i >= 0; i -= 1) {
      if (/^MNU\d+$/.test(segments[i])) {
        return segments[i];
      }
    }
    return null;
  }
  function scrapeCategoryVars() {
    if (typeof performance === "undefined") {
      return null;
    }
    let vars = null;
    for (const entry of performance.getEntriesByType("resource")) {
      if (!entry.name.includes("cosmo_VideoCategory")) {
        continue;
      }
      try {
        const u = new URL(entry.name);
        const raw = u.searchParams.get("variables");
        if (raw) {
          vars = JSON.parse(raw);
        }
      } catch (e) {
      }
    }
    return vars;
  }
  var MAX_CATEGORY_PAGES = 300;
  async function scanCategory(categoryCode, onBatch, shouldContinue) {
    var _a2, _b2, _c, _d, _e;
    const site = scrapeCategoryVars();
    const base = {
      categoryCode,
      filterSaleType: (_a2 = site == null ? void 0 : site.filterSaleType) != null ? _a2 : null,
      sortOrder: (_b2 = site == null ? void 0 : site.sortOrder) != null ? _b2 : "POPULAR"
    };
    for (let page = 1; page <= MAX_CATEGORY_PAGES; page += 1) {
      if (!shouldContinue()) {
        return;
      }
      const json = await graphql(
        "cosmo_VideoCategory",
        { ...base, page },
        VIDEO_CATEGORY_HASH
      );
      const titles = (_e = (_d = (_c = json.data) == null ? void 0 : _c.webfront_searchVideo) == null ? void 0 : _d.titles) != null ? _e : [];
      onBatch(titles);
      if (titles.length === 0) {
        return;
      }
      await sleep(120 + Math.random() * 180);
    }
  }
  function ensurePanelStyles() {
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
  var thumbObserver = null;
  function observeThumb(img, src) {
    if (!thumbObserver) {
      thumbObserver = new IntersectionObserver(
        (entries, observer) => {
          var _a2;
          for (const entry of entries) {
            if (!entry.isIntersecting) {
              continue;
            }
            const el = entry.target;
            el.src = (_a2 = el.dataset.smSrc) != null ? _a2 : "";
            delete el.dataset.smSrc;
            observer.unobserve(el);
          }
        },
        { rootMargin: "400px" }
      );
    }
    img.dataset.smSrc = src;
    thumbObserver.observe(img);
  }
  function subtitleCard(t) {
    var _a2, _b2, _c;
    if (typeof t.id !== "string" || !/^SID\d+$/.test(t.id)) {
      return null;
    }
    const a = document.createElement("a");
    a.href = `/title/${t.id}`;
    a.title = (_a2 = t.titleName) != null ? _a2 : t.id;
    const img = document.createElement("img");
    const thumb = (_b2 = t.thumbnail) == null ? void 0 : _b2.standard;
    if (thumb) {
      const base = thumb.startsWith("http") ? thumb : `https://${thumb}`;
      observeThumb(img, `${base}${base.includes("?") ? "&" : "?"}f=avif&q=M&p=W400`);
    }
    const name = document.createElement("span");
    name.className = "name";
    name.textContent = (_c = t.titleName) != null ? _c : t.id;
    a.append(img, name);
    if (t.nfreeBadge) {
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = ` ${t.nfreeBadge}`;
      a.appendChild(badge);
    }
    return a;
  }
  function openSubtitleDialog(categoryCode) {
    ensurePanelStyles();
    let overlayEl = document.getElementById("sm-unext-overlay");
    if (!overlayEl) {
      overlayEl = document.createElement("div");
      overlayEl.id = "sm-unext-overlay";
      const overlay2 = overlayEl;
      const dialog = document.createElement("div");
      dialog.id = "sm-unext-dialog";
      const header = document.createElement("header");
      const titleSpan = document.createElement("span");
      titleSpan.textContent = "\u5B57\u5E55\u3042\u308A\u4F5C\u54C1";
      const count = document.createElement("span");
      count.className = "count";
      count.id = "sm-unext-count";
      const close = document.createElement("button");
      close.id = "sm-unext-close";
      close.textContent = "\u2715";
      header.append(titleSpan, count, close);
      const grid2 = document.createElement("div");
      grid2.id = "sm-unext-grid";
      const status = document.createElement("div");
      status.id = "sm-unext-status";
      status.textContent = "Loading\u2026";
      dialog.append(header, grid2, status);
      overlay2.appendChild(dialog);
      document.body.appendChild(overlay2);
      close.addEventListener("click", () => overlay2.classList.remove("sm-open"));
      overlay2.addEventListener("click", (event) => {
        if (event.target === overlay2) {
          overlay2.classList.remove("sm-open");
        }
      });
    }
    const overlay = overlayEl;
    const grid = document.getElementById("sm-unext-grid");
    const countEl = document.getElementById("sm-unext-count");
    const statusEl = document.getElementById("sm-unext-status");
    grid.textContent = "";
    countEl.textContent = "";
    statusEl.textContent = "Loading\u2026";
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
        statusEl.textContent = `Scanned ${scanned}\u2026`;
      },
      () => open
    ).then(() => {
      if (open) {
        statusEl.textContent = shown === 0 ? "No subtitle titles found." : "";
      }
    }).catch((error) => {
      statusEl.textContent = `Error: ${error instanceof Error ? error.message : String(error)}`;
    });
    const observer = new MutationObserver(() => {
      if (!overlay.classList.contains("sm-open")) {
        open = false;
        observer.disconnect();
      }
    });
    observer.observe(overlay, { attributes: true, attributeFilter: ["class"] });
  }
  function mountSubtitleFilter() {
    let mounted = false;
    let attempts = 0;
    const findTab = () => [...document.querySelectorAll('button[data-testid="capsule-tab-btn"]')].find(
      (b) => b.textContent.trim() === "\u898B\u653E\u984C"
    );
    const attach = () => {
      if (mounted) {
        return true;
      }
      const tab = findTab();
      if (!(tab == null ? void 0 : tab.parentElement)) {
        return false;
      }
      mounted = true;
      const categoryCode = extractCategoryCode();
      if (!categoryCode) {
        return true;
      }
      const chip = tab.cloneNode(false);
      chip.id = "sm-unext-sub-chip";
      chip.textContent = "\u5B57\u5E55\u3042\u308A";
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
        new MutationObserver(() => {
          if (!overlay.classList.contains("sm-open")) {
            chip.style.backgroundColor = "";
          }
        }).observe(overlay, { attributes: true, attributeFilter: ["class"] });
      };
      chip.addEventListener("click", () => {
        const overlay = document.getElementById("sm-unext-overlay");
        if (overlay == null ? void 0 : overlay.classList.contains("sm-open")) {
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
    const timer = setInterval(() => {
      attempts += 1;
      if (attach() || attempts > 60) {
        clearInterval(timer);
      }
    }, 500);
    attach();
  }
  function mount() {
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
})();

