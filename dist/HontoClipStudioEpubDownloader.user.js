// ==UserScript==
// @name HontoClipStudioEpubDownloader
// @namespace github.com/Nemuboshi/SurfMonkey
// @version 1.0.0
// @description Analyze honto Clip Studio Reader metadata and download OPF package resources as EPUB archives.
// @match https://mbj-bs2.pf.mobilebook.jp/viewer/viewer.html*
// @match https://mbj-bs.pf.mobilebook.jp/*/bsr4b_hybrid/index.php*
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
  var wrkr = function(fns, init2, id, cb) {
    if (!ch[id]) {
      var fnStr = "", td_1 = {}, m = fns.length - 1;
      for (var i = 0; i < m; ++i)
        fnStr = wcln(fns[i], fnStr, td_1);
      ch[id] = { c: wcln(fns[m], fnStr, td_1), e: td_1 };
    }
    var td2 = mrg({}, ch[id].e);
    return wk(ch[id].c + ";onmessage=function(e){for(var k in e.data)self[k]=e.data[k];onmessage=" + init2.toString() + "}", id, td2, cbfs(td2), cb);
  };
  var bDflt = function() {
    return [u8, u16, i32, fleb, fdeb, clim, revfl, revfd, flm, flt, fdm, fdt, rev, deo, et, hMap, wbits, wbits16, hTree, ln, lc, clen, wfblk, wblk, shft, slc, dflt, dopt, deflateSync, pbf];
  };
  var pbf = function(msg) {
    return postMessage(msg, [msg.buffer]);
  };
  var cbify = function(dat, opts, fns, init2, id, cb) {
    var w = wrkr(fns, init2, id, function(err2, dat2) {
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

  // src/blobParts.ts
  function bytesToBlobPart(bytes) {
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    return copy.buffer;
  }

  // src/HontoClipStudioEpubDownloader.ts
  var PANEL_ID = "__honto_clipstudio_epub_downloader_panel";
  var REQUEST_TIMEOUT_MS = 3e4;
  var EPUB_MEDIA_TYPE = "application/epub+zip";
  var EPUB_MIME = "application/epub+zip";
  var CLIP_STUDIO_JPEG_XOR_KEY = 201;
  var CLIP_STUDIO_JPEG_XOR_LENGTH = 64;
  function log(...args) {
    console.log("[HontoClipStudioEpubDownloader]", ...args);
  }
  function toUrlShape(input) {
    try {
      const url = new URL(input, location.href);
      return url.pathname.replace(/\/contents\/[^/]+/g, "/contents/:contentId").replace(/\/files\/[^/]+/g, "/files/:packageId").replace(/\/aa[0-9]+\//g, "/:accountOrWorkId/");
    } catch (e) {
      return input;
    }
  }
  function hasJpegHeader(bytes) {
    return bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  }
  function hasClipStudioMaskedJpegHeader(bytes) {
    return bytes.length >= 4 && (bytes[0] ^ CLIP_STUDIO_JPEG_XOR_KEY) === 255 && (bytes[1] ^ CLIP_STUDIO_JPEG_XOR_KEY) === 216 && (bytes[2] ^ CLIP_STUDIO_JPEG_XOR_KEY) === 255 && (bytes[3] ^ CLIP_STUDIO_JPEG_XOR_KEY) >= 224 && (bytes[3] ^ CLIP_STUDIO_JPEG_XOR_KEY) <= 239;
  }
  function isJpegManifestItem(item, packagePath) {
    return item.mediaType.toLowerCase() === "image/jpeg" || /\.jpe?g$/i.test(packagePath);
  }
  function decodeClipStudioImageResource(item, packagePath, bytes) {
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
  function createTimeoutSignal(timeoutMs) {
    const controller = new AbortController();
    globalThis.setTimeout(
      () => controller.abort(new Error(`Request timed out (${timeoutMs}ms)`)),
      timeoutMs
    );
    return controller.signal;
  }
  function createAuthHeaders(bearer) {
    return bearer ? {
      Authorization: `Bearer ${bearer}`
    } : {};
  }
  async function fetchText(url, bearer) {
    const response = await fetch(url, {
      credentials: "same-origin",
      headers: createAuthHeaders(bearer),
      signal: createTimeoutSignal(REQUEST_TIMEOUT_MS)
    });
    return {
      status: response.status,
      text: await response.text()
    };
  }
  async function fetchBytes(url, bearer) {
    const response = await fetch(url, {
      credentials: "same-origin",
      headers: createAuthHeaders(bearer),
      signal: createTimeoutSignal(REQUEST_TIMEOUT_MS)
    });
    return {
      bytes: new Uint8Array(await response.arrayBuffer()),
      status: response.status
    };
  }
  async function fetchJson(url, bearer) {
    const response = await fetch(url, {
      credentials: "same-origin",
      headers: createAuthHeaders(bearer),
      signal: createTimeoutSignal(REQUEST_TIMEOUT_MS)
    });
    return {
      json: await response.json(),
      status: response.status
    };
  }
  function requireSearchParam(name) {
    var _a2;
    const value = (_a2 = new URL(location.href).searchParams.get(name)) == null ? void 0 : _a2.trim();
    if (!value) {
      throw new Error(`Missing required query parameter: ${name}`);
    }
    return value;
  }
  function getOptionalSearchParam(name) {
    var _a2;
    return ((_a2 = new URL(location.href).searchParams.get(name)) == null ? void 0 : _a2.trim()) || null;
  }
  function parseXml(xml, label) {
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    if (doc.querySelector("parsererror")) {
      throw new Error(`Failed to parse ${label}`);
    }
    return doc;
  }
  function queryNumber(doc, selector) {
    var _a2, _b2;
    const value = (_b2 = (_a2 = doc.querySelector(selector)) == null ? void 0 : _a2.textContent) == null ? void 0 : _b2.trim();
    if (!value) {
      return null;
    }
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  function requireXmlNumber(doc, selector, label) {
    const value = queryNumber(doc, selector);
    if (value === null) {
      throw new Error(`${label} is missing in XML selector: ${selector}`);
    }
    return value;
  }
  function queryText(doc, selector) {
    var _a2, _b2;
    return ((_b2 = (_a2 = doc.querySelector(selector)) == null ? void 0 : _a2.textContent) == null ? void 0 : _b2.trim()) || null;
  }
  function findObservedLegacyFaceXmlUrl() {
    const resources = performance.getEntriesByType("resource").filter(
      (entry) => entry instanceof PerformanceResourceTiming
    );
    for (const entry of resources) {
      if (entry.name.includes("diazepam_hybrid.php") && entry.name.includes("file=face.xml")) {
        return entry.name;
      }
    }
    return null;
  }
  function resolveLegacyReaderEntry(readerUrl) {
    var _a2, _b2, _c, _d;
    const cgi = (_a2 = readerUrl.searchParams.get("cgi")) == null ? void 0 : _a2.trim();
    const param = (_b2 = readerUrl.searchParams.get("param")) == null ? void 0 : _b2.trim();
    if (!cgi || !param) {
      return null;
    }
    const observedFaceXmlUrl = findObservedLegacyFaceXmlUrl();
    if (observedFaceXmlUrl) {
      return {
        apiUrl: cgi,
        faceXmlUrl: observedFaceXmlUrl,
        param
      };
    }
    const faceXmlUrl = new URL(cgi, readerUrl.href);
    faceXmlUrl.searchParams.set("mode", "7");
    faceXmlUrl.searchParams.set("file", ((_c = readerUrl.searchParams.get("file")) == null ? void 0 : _c.trim()) || "face.xml");
    faceXmlUrl.searchParams.set("reqtype", "0");
    faceXmlUrl.searchParams.set("vm", ((_d = readerUrl.searchParams.get("vm")) == null ? void 0 : _d.trim()) || "1");
    faceXmlUrl.searchParams.set("param", param);
    faceXmlUrl.searchParams.set("time", String(Date.now()));
    return {
      apiUrl: cgi,
      faceXmlUrl: faceXmlUrl.toString(),
      param
    };
  }
  function buildLegacyResourceUrl(entry, mode, fileName) {
    const url = new URL(entry.faceXmlUrl);
    url.searchParams.set("mode", mode);
    url.searchParams.set("file", fileName);
    url.searchParams.set("time", String(Date.now()));
    return url.toString();
  }
  function assertOk(status, label) {
    if (status < 200 || status >= 300) {
      throw new Error(`${label} returned HTTP ${status}`);
    }
  }
  function normalizePackagePath(pathLike) {
    return pathLike.replace(/\\/g, "/").split("/").filter((part) => part && part !== ".").join("/");
  }
  function packageDir(rootfilePath) {
    const normalized = normalizePackagePath(rootfilePath);
    const slashIndex = normalized.lastIndexOf("/");
    return slashIndex >= 0 ? normalized.slice(0, slashIndex) : "";
  }
  function joinPackagePath(baseDir, href) {
    var _a2, _b2;
    if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("//")) {
      throw new Error(`External manifest resource is not package-relative: ${href}`);
    }
    const hrefWithoutFragment = (_b2 = (_a2 = href.split("#", 1)[0]) == null ? void 0 : _a2.trim()) != null ? _b2 : "";
    const parts = `${baseDir}/${hrefWithoutFragment}`.replace(/\\/g, "/").split("/");
    const normalized = [];
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
  function collectObservedRequests() {
    const resources = performance.getEntriesByType("resource").filter(
      (entry) => entry instanceof PerformanceResourceTiming
    ).filter(
      (entry) => entry.name.includes("/api/v1/contents/") || entry.name.includes("/api/v1/tokens/viewer") || entry.name.includes("diazepam_hybrid.php")
    );
    const methods = /* @__PURE__ */ new Set();
    const resourceTypes = /* @__PURE__ */ new Set();
    const sampleEndpointShapes = [];
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
      sampleEndpointShapes: sampleEndpointShapes.slice(0, 12)
    };
  }
  function parseOpf(opfText) {
    var _a2, _b2, _c;
    const doc = parseXml(opfText, "OPF");
    const manifestItems = Array.from(doc.getElementsByTagName("item"));
    const spineItems = Array.from(doc.getElementsByTagName("itemref"));
    const mediaTypeCounts = {};
    for (const item of manifestItems) {
      const mediaType = (_a2 = item.getAttribute("media-type")) != null ? _a2 : "unknown";
      mediaTypeCounts[mediaType] = ((_b2 = mediaTypeCounts[mediaType]) != null ? _b2 : 0) + 1;
    }
    const navItem = manifestItems.find(
      (item) => {
        var _a3;
        return ((_a3 = item.getAttribute("properties")) != null ? _a3 : "").includes("nav");
      }
    );
    return {
      manifestCount: manifestItems.length,
      mediaTypeCounts,
      navItemHref: (_c = navItem == null ? void 0 : navItem.getAttribute("href")) != null ? _c : null,
      rootfilePath: null,
      sampleManifest: manifestItems.slice(0, 12).map((item) => {
        var _a3, _b3, _c2;
        return {
          href: (_a3 = item.getAttribute("href")) != null ? _a3 : "",
          id: (_b3 = item.getAttribute("id")) != null ? _b3 : "",
          mediaType: (_c2 = item.getAttribute("media-type")) != null ? _c2 : "",
          properties: item.getAttribute("properties")
        };
      }),
      sampleSpine: spineItems.slice(0, 20).map((item) => {
        var _a3;
        return (_a3 = item.getAttribute("idref")) != null ? _a3 : "";
      }).filter(Boolean),
      spineCount: spineItems.length
    };
  }
  function parseOpfManifest(opfText) {
    const doc = parseXml(opfText, "OPF");
    return Array.from(doc.getElementsByTagName("item")).map((item) => {
      var _a2, _b2, _c, _d;
      return {
        href: (_b2 = (_a2 = item.getAttribute("href")) == null ? void 0 : _a2.trim()) != null ? _b2 : "",
        id: (_c = item.getAttribute("id")) != null ? _c : "",
        mediaType: (_d = item.getAttribute("media-type")) != null ? _d : "",
        properties: item.getAttribute("properties")
      };
    }).filter((item) => item.href.length > 0);
  }
  function parseOpfTitle(opfText) {
    var _a2, _b2, _c, _d;
    const doc = parseXml(opfText, "OPF");
    const title = ((_b2 = (_a2 = doc.getElementsByTagName("dc:title")[0]) == null ? void 0 : _a2.textContent) == null ? void 0 : _b2.trim()) || ((_d = (_c = Array.from(doc.getElementsByTagName("title")).find((item) => item.namespaceURI === "http://purl.org/dc/elements/1.1/")) == null ? void 0 : _c.textContent) == null ? void 0 : _d.trim()) || null;
    return title && title.length > 0 ? title : null;
  }
  async function loadPackageIndex() {
    var _a2, _b2, _c, _d, _e, _f, _g;
    const readerUrl = new URL(location.href);
    const initialToken = requireSearchParam("t");
    const contentId = requireSearchParam("c");
    const viewerTokenUrl = `${readerUrl.origin}/api/v1/tokens/viewer?content_id=${encodeURIComponent(contentId)}`;
    const viewerTokenResult = await fetchJson(viewerTokenUrl, initialToken);
    assertOk(viewerTokenResult.status, "viewer token exchange");
    const viewerToken = (_a2 = viewerTokenResult.json.token) == null ? void 0 : _a2.trim();
    if (!viewerToken) {
      throw new Error("Viewer token exchange did not return a token");
    }
    const metaUrl = `${readerUrl.origin}/api/v1/contents/${encodeURIComponent(contentId)}/meta`;
    const metaResult = await fetchJson(metaUrl, viewerToken);
    assertOk(metaResult.status, "content metadata");
    const baseUrl = (_d = (_c = (_b2 = metaResult.json.content) == null ? void 0 : _b2.baseUrl) == null ? void 0 : _c.trim()) != null ? _d : null;
    if (!baseUrl) {
      throw new Error("Content metadata did not provide a baseUrl");
    }
    const containerUrl = `${baseUrl}/META-INF/container.xml`;
    const containerResult = await fetchText(containerUrl, viewerToken);
    assertOk(containerResult.status, "container.xml");
    const containerDoc = parseXml(containerResult.text, "container.xml");
    const rootfilePath = (_g = (_f = (_e = containerDoc.querySelector("rootfile")) == null ? void 0 : _e.getAttribute("full-path")) == null ? void 0 : _f.trim()) != null ? _g : null;
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
      viewerToken
    };
  }
  async function analyzeLegacyReader(readerUrl, entry) {
    var _a2, _b2;
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
            endpointShape: "/:accountOrWorkId/diazepam_hybrid.php?mode=7&file=face.xml&reqtype=0&vm=:vm&param=:param&time=:time",
            method: "GET",
            name: "legacy face.xml",
            status: faceResult.status
          }
        ],
        viewerTokenIssued: false
      },
      legacyReader: {
        apiUrlShape: toUrlShape(entry.apiUrl),
        contentFrame: {
          height: queryNumber(faceDoc, "ContentFrame > Height"),
          width: queryNumber(faceDoc, "ContentFrame > Width")
        },
        faceXmlUrlShape: toUrlShape(entry.faceXmlUrl),
        pageCount,
        scramble: {
          height: queryNumber(faceDoc, "Scramble > Height"),
          width: queryNumber(faceDoc, "Scramble > Width")
        }
      },
      meta: {
        baseUrl: null,
        colophon: {
          setContentIdQuery: false,
          setTokenQuery: false,
          size: (_a2 = getOptionalSearchParam("colophon_size")) != null ? _a2 : void 0,
          type: void 0,
          url: (_b2 = getOptionalSearchParam("colophon")) != null ? _b2 : void 0
        },
        version: "bsr4b_hybrid"
      },
      observedRequests: collectObservedRequests(),
      opf: {
        manifestCount: 0,
        mediaTypeCounts: {},
        navItemHref: null,
        rootfilePath: null,
        sampleManifest: [],
        sampleSpine: [],
        spineCount: 0
      },
      reader: {
        host: readerUrl.host,
        title: document.title,
        urlShape: `${readerUrl.pathname}?cgi=:apiUrl&file=:file&param=:param`
      }
    };
  }
  async function loadLegacyFaceInfo(entry) {
    const faceResult = await fetchText(entry.faceXmlUrl);
    assertOk(faceResult.status, "legacy face.xml");
    const faceDoc = parseXml(faceResult.text, "legacy face.xml");
    return {
      contentHeight: requireXmlNumber(faceDoc, "ContentFrame > Height", "content height"),
      contentWidth: requireXmlNumber(faceDoc, "ContentFrame > Width", "content width"),
      pageCount: requireXmlNumber(faceDoc, "TotalPage", "page count"),
      scrambleHeight: requireXmlNumber(faceDoc, "Scramble > Height", "scramble height"),
      scrambleWidth: requireXmlNumber(faceDoc, "Scramble > Width", "scramble width")
    };
  }
  function parseLegacyScrambleVector(pageDoc) {
    const scrambleText = queryText(pageDoc, "Scramble");
    if (!scrambleText) {
      throw new Error("Page XML did not contain a Scramble vector");
    }
    const values = scrambleText.split(",").map((value) => Number.parseInt(value.trim(), 10)).filter((value) => Number.isFinite(value));
    if (values.length === 0) {
      throw new Error("Page XML Scramble vector is empty");
    }
    const vector = new Array(values.length);
    values.forEach((value, index) => {
      vector[value] = index;
    });
    return vector;
  }
  async function blobToImage(blob) {
    if ("createImageBitmap" in window) {
      try {
        return await createImageBitmap(blob);
      } catch (e) {
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
  async function canvasToPngBytes(canvas) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("canvas.toBlob returned null"));
          return;
        }
        blob.arrayBuffer().then((buffer) => resolve(new Uint8Array(buffer))).catch(reject);
      }, "image/png");
    });
  }
  async function captureLegacyPage(entry, faceInfo, page) {
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
      if (targetIndex === void 0) {
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
        tileHeight
      );
    }
    if ("close" in image && typeof image.close === "function") {
      image.close();
    }
    return {
      bytes: await canvasToPngBytes(canvas),
      fileName: `${String(page).padStart(4, "0")}.png`,
      page
    };
  }
  async function downloadLegacyImages(entry, onProgress) {
    onProgress == null ? void 0 : onProgress("loading face.xml...");
    const faceInfo = await loadLegacyFaceInfo(entry);
    const files = {};
    const failedFiles = [];
    for (let page = 1; page <= faceInfo.pageCount; page += 1) {
      onProgress == null ? void 0 : onProgress(`capturing ${page}/${faceInfo.pageCount}`);
      try {
        const capture = await captureLegacyPage(entry, faceInfo, page);
        files[capture.fileName] = capture.bytes;
      } catch (error) {
        failedFiles.push({
          path: `${String(page).padStart(4, "0")}.png`,
          reason: error instanceof Error ? error.message : String(error)
        });
      }
    }
    if (Object.keys(files).length === 0) {
      throw new Error("No legacy pages were captured");
    }
    onProgress == null ? void 0 : onProgress("zipping...");
    const zipBytes = await zipFilesAsync(files);
    const zipName = `${sanitizeFileName(getPageTitle() || "honto-legacy-images")}.zip`;
    downloadBlob(new Blob([bytesToBlobPart(zipBytes)], { type: "application/zip" }), zipName);
    return {
      failedFiles,
      fileCount: Object.keys(files).length,
      zipName
    };
  }
  async function analyzeReader() {
    var _a2, _b2, _c, _d, _e, _f, _g, _h, _i;
    const readerUrl = new URL(location.href);
    const legacyEntry = resolveLegacyReaderEntry(readerUrl);
    if (legacyEntry) {
      return analyzeLegacyReader(readerUrl, legacyEntry);
    }
    const initialToken = requireSearchParam("t");
    const contentId = requireSearchParam("c");
    const stages = [];
    const viewerTokenUrl = `${readerUrl.origin}/api/v1/tokens/viewer?content_id=${encodeURIComponent(contentId)}`;
    const viewerTokenResult = await fetchJson(viewerTokenUrl, initialToken);
    stages.push({
      endpointShape: "/api/v1/tokens/viewer?content_id=:contentId",
      method: "GET",
      name: "viewer token exchange",
      status: viewerTokenResult.status
    });
    const viewerToken = (_a2 = viewerTokenResult.json.token) == null ? void 0 : _a2.trim();
    if (!viewerToken) {
      throw new Error("Viewer token exchange did not return a token");
    }
    const metaUrl = `${readerUrl.origin}/api/v1/contents/${encodeURIComponent(contentId)}/meta`;
    const metaResult = await fetchJson(metaUrl, viewerToken);
    stages.push({
      endpointShape: "/api/v1/contents/:contentId/meta",
      method: "GET",
      name: "content metadata",
      status: metaResult.status
    });
    const baseUrl = (_d = (_c = (_b2 = metaResult.json.content) == null ? void 0 : _b2.baseUrl) == null ? void 0 : _c.trim()) != null ? _d : null;
    if (!baseUrl) {
      throw new Error("Content metadata did not provide a baseUrl");
    }
    const containerUrl = `${baseUrl}/META-INF/container.xml`;
    const containerResult = await fetchText(containerUrl, viewerToken);
    stages.push({
      endpointShape: "/api/v1/contents/:contentId/files/:packageId/META-INF/container.xml",
      method: "GET",
      name: "container.xml",
      status: containerResult.status
    });
    const containerDoc = parseXml(containerResult.text, "container.xml");
    const rootfilePath = (_g = (_f = (_e = containerDoc.querySelector("rootfile")) == null ? void 0 : _e.getAttribute("full-path")) == null ? void 0 : _f.trim()) != null ? _g : null;
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
      status: opfResult.status
    });
    const opf = parseOpf(opfResult.text);
    opf.rootfilePath = rootfilePath;
    return {
      authFlow: {
        contentId,
        stages,
        viewerTokenIssued: true
      },
      meta: {
        baseUrl: baseUrl.replace(/\/files\/[^/]+$/, "/files/:packageId"),
        colophon: (_h = metaResult.json.colophon) != null ? _h : null,
        version: (_i = metaResult.json.version) != null ? _i : null
      },
      observedRequests: collectObservedRequests(),
      opf,
      reader: {
        host: readerUrl.host,
        title: document.title,
        urlShape: `${readerUrl.pathname}?t=:initialToken&c=:contentId&p=:readerParams`
      }
    };
  }
  async function zipFilesAsync(files) {
    return new Promise((resolve, reject) => {
      zip(files, { level: 0 }, (error, data) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(data);
      });
    });
  }
  function downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 3e4);
  }
  function getPageTitle() {
    const title = document.title.trim();
    return title.length > 0 ? title : null;
  }
  function sanitizeFileName(value) {
    const sanitized = value.replace(/[\\/:*?"<>|]+/g, "_").replace(/\s+/g, " ").trim();
    return sanitized || "honto-package";
  }
  async function downloadPackage(onProgress) {
    const legacyEntry = resolveLegacyReaderEntry(new URL(location.href));
    if (legacyEntry) {
      return downloadLegacyImages(legacyEntry, onProgress);
    }
    const packageIndex = await loadPackageIndex();
    const opfDir = packageDir(packageIndex.rootfilePath);
    const files = {
      mimetype: new TextEncoder().encode(EPUB_MEDIA_TYPE),
      "META-INF/container.xml": new TextEncoder().encode(packageIndex.containerText),
      [normalizePackagePath(packageIndex.rootfilePath)]: new TextEncoder().encode(
        packageIndex.opfText
      )
    };
    const failedFiles = [];
    for (const [index, item] of packageIndex.manifestItems.entries()) {
      const packagePath = joinPackagePath(opfDir, item.href);
      if (!packagePath || files[packagePath]) {
        continue;
      }
      onProgress == null ? void 0 : onProgress(`fetching ${index + 1}/${packageIndex.manifestItems.length}: ${packagePath}`);
      try {
        const result = await fetchBytes(
          `${packageIndex.baseUrl}/${packagePath}`,
          packageIndex.viewerToken
        );
        assertOk(result.status, packagePath);
        files[packagePath] = decodeClipStudioImageResource(item, packagePath, result.bytes);
      } catch (error) {
        failedFiles.push({
          path: packagePath,
          reason: error instanceof Error ? error.message : String(error)
        });
      }
    }
    onProgress == null ? void 0 : onProgress("zipping...");
    const zipBytes = await zipFilesAsync(files);
    const zipName = `${sanitizeFileName(
      packageIndex.packageTitle || packageIndex.readerTitle || packageIndex.contentId
    )}.epub`;
    downloadBlob(new Blob([bytesToBlobPart(zipBytes)], { type: EPUB_MIME }), zipName);
    return {
      failedFiles,
      fileCount: Object.keys(files).length,
      zipName
    };
  }
  function createButton(label) {
    const button = document.createElement("button");
    button.textContent = label;
    button.style.cssText = [
      "padding: 6px 10px",
      "border: 0",
      "border-radius: 6px",
      "background: #7fd6ff",
      "color: #0d1b24",
      "font-weight: 700",
      "cursor: pointer"
    ].join(";");
    return button;
  }
  function createOutput() {
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
      "font: 12px/1.45 ui-monospace, SFMono-Regular, Consolas, monospace"
    ].join(";");
    return output;
  }
  function createPanel() {
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
      "font: 12px/1.4 system-ui, sans-serif"
    ].join(";");
    const title = document.createElement("strong");
    title.textContent = "Honto Clip Studio EPUB Downloader";
    const controls = document.createElement("div");
    controls.style.cssText = [
      "display: flex",
      "align-items: center",
      "gap: 8px",
      "flex-wrap: wrap"
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
      "Downloads the OPF manifest resources as an EPUB archive."
    ].join("\n");
    controls.append(analyzeButton, downloadButton, status);
    panel.append(title, controls, output);
    return { analyzeButton, downloadButton, output, panel, status };
  }
  function mountPanel() {
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
  function init() {
    window.__hontoClipStudioEpubDownloader__ = {
      analyze: analyzeReader,
      downloadPackage
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
})();

