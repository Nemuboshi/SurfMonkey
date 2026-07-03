// ==UserScript==
// @name ComicBoostPublus
// @namespace github.com/Nemuboshi/SurfMonkey
// @version 1.0.0
// @description Download Comic Boost PUBLUS reader pages as image ZIP archives.
// @match https://comic-boost.com/viewer/viewer.html*
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

  // src/shared/blobParts.ts
  function bytesToBlobPart(bytes) {
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    return copy.buffer;
  }

  // src/userscripts/ComicBoostPublus.ts
  var DEFAULT_RENDER_VIEWPORT = { width: 2048, height: 1456 };
  var EXPORT_EXTENSION = "png";
  var PANEL_ID = "__comic_boost_publus_panel";
  var REQUEST_TIMEOUT_MS = 3e4;
  var UI_POLL_INTERVAL_MS = 120;
  var ZIP_MIME = "application/zip";
  function log(...args) {
    console.log("[ComicBoostPublus]", ...args);
  }
  function delay(ms) {
    return new Promise((resolve) => globalThis.setTimeout(resolve, ms));
  }
  function sanitizeFilePart(value) {
    const cleaned = Array.from(value, (char) => {
      const code = char.charCodeAt(0);
      if (code < 32 || '<>:"/\\|?*'.includes(char)) {
        return "_";
      }
      return char;
    }).join("");
    return cleaned.replace(/\s+/g, " ").trim() || "comic-boost";
  }
  function getRenderViewport(targetWindow = window) {
    var _a2;
    const spread = (_a2 = getViewerAttributes(targetWindow)) == null ? void 0 : _a2.viewerSpread;
    const pages = [spread == null ? void 0 : spread.left, spread == null ? void 0 : spread.right].filter(
      (page) => Boolean((page == null ? void 0 : page.width) && (page == null ? void 0 : page.height))
    );
    if (pages.length === 0) {
      return DEFAULT_RENDER_VIEWPORT;
    }
    return {
      width: Math.max(
        DEFAULT_RENDER_VIEWPORT.width,
        pages.reduce((sum, page) => {
          var _a3;
          return sum + ((_a3 = page.width) != null ? _a3 : 0);
        }, 0)
      ),
      height: Math.max(
        DEFAULT_RENDER_VIEWPORT.height,
        pages.reduce((max, page) => {
          var _a3;
          return Math.max(max, (_a3 = page.height) != null ? _a3 : 0);
        }, 0)
      )
    };
  }
  function normalizeRect(rect) {
    if (!rect) {
      return null;
    }
    const width = Math.max(0, Math.round(rect.width));
    const height = Math.max(0, Math.round(rect.height));
    if (width === 0 || height === 0) {
      return null;
    }
    return {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width,
      height
    };
  }
  function getRenderFingerprint(currentScreen) {
    const canvas = currentScreen == null ? void 0 : currentScreen.canvas;
    if (!canvas || canvas.width <= 0 || canvas.height <= 0) {
      return null;
    }
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      return null;
    }
    const rects = [
      normalizeRect(currentScreen == null ? void 0 : currentScreen.leftDrawnRect),
      normalizeRect(currentScreen == null ? void 0 : currentScreen.rightDrawnRect)
    ].filter((rect) => Boolean(rect));
    if (rects.length === 0) {
      return `${canvas.width}x${canvas.height}`;
    }
    const sampleOffsets = [0.2, 0.5, 0.8];
    const parts = [`${canvas.width}x${canvas.height}`];
    for (const rect of rects) {
      parts.push(`${rect.x},${rect.y},${rect.width},${rect.height}`);
      for (const offsetY of sampleOffsets) {
        for (const offsetX of sampleOffsets) {
          const x = Math.min(
            canvas.width - 1,
            Math.max(0, Math.round(rect.x + (rect.width - 1) * offsetX))
          );
          const y = Math.min(
            canvas.height - 1,
            Math.max(0, Math.round(rect.y + (rect.height - 1) * offsetY))
          );
          const rgba = ctx.getImageData(x, y, 1, 1).data;
          parts.push(`${rgba[0]},${rgba[1]},${rgba[2]},${rgba[3]}`);
        }
      }
    }
    return parts.join("|");
  }
  function blobFromCanvas(sourceCanvas, rect) {
    const targetCanvas = document.createElement("canvas");
    targetCanvas.width = rect.width;
    targetCanvas.height = rect.height;
    const ctx = targetCanvas.getContext("2d");
    if (!ctx) {
      throw new Error("Failed to create export canvas");
    }
    ctx.drawImage(
      sourceCanvas,
      rect.x,
      rect.y,
      rect.width,
      rect.height,
      0,
      0,
      rect.width,
      rect.height
    );
    const mimeType = "image/png";
    return new Promise((resolve, reject) => {
      targetCanvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Canvas export failed"));
          return;
        }
        resolve(blob);
      }, mimeType);
    });
  }
  function downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1e3);
  }
  async function withTimeout(promise, label) {
    return await new Promise((resolve, reject) => {
      let settled = false;
      const timer = globalThis.setTimeout(() => {
        if (settled) {
          return;
        }
        settled = true;
        reject(new Error(`${label} timeout (${REQUEST_TIMEOUT_MS}ms)`));
      }, REQUEST_TIMEOUT_MS);
      void promise.then((value) => {
        if (settled) {
          return;
        }
        settled = true;
        globalThis.clearTimeout(timer);
        resolve(value);
      }).catch((error) => {
        if (settled) {
          return;
        }
        settled = true;
        globalThis.clearTimeout(timer);
        reject(error);
      });
    });
  }
  function getViewerAttributes(targetWindow = window) {
    var _a2, _b2, _c, _d, _e, _f, _g;
    return (_g = (_f = (_e = (_d = (_c = (_b2 = (_a2 = targetWindow.NFBR) == null ? void 0 : _a2.a6G) == null ? void 0 : _b2.Initializer) == null ? void 0 : _c.B6o) == null ? void 0 : _d.renderer) == null ? void 0 : _e.model) == null ? void 0 : _f.attributes) != null ? _g : null;
  }
  function getContentEntries(targetWindow = window) {
    var _a2, _b2, _c, _d, _e, _f;
    const entries = (_f = (_e = (_d = (_c = (_b2 = (_a2 = getViewerAttributes(targetWindow)) == null ? void 0 : _a2.F3d) == null ? void 0 : _b2.content) == null ? void 0 : _c.normal_default) == null ? void 0 : _d.configuration) == null ? void 0 : _e.contents) != null ? _f : [];
    return entries.filter((entry) => Number.isFinite(entry.index) && entry.index > 0).sort((a, b) => a.index - b.index);
  }
  function getTotalPages(targetWindow = window) {
    var _a2, _b2, _c, _d, _e;
    const entries = getContentEntries(targetWindow);
    if (entries.length > 0) {
      return entries.length;
    }
    const counterText = (_d = (_c = (_a2 = targetWindow.document.getElementById("pageSliderCounter")) == null ? void 0 : _a2.textContent) != null ? _c : (_b2 = targetWindow.document.body.innerText.match(/\d+\/(\d+)/)) == null ? void 0 : _b2[0]) != null ? _d : "";
    const totalFromCounter = (_e = counterText.match(/\/(\d+)/)) == null ? void 0 : _e[1];
    const totalPages = Number.parseInt(totalFromCounter != null ? totalFromCounter : "", 10);
    if (Number.isFinite(totalPages) && totalPages > 0) {
      return totalPages;
    }
    throw new Error("Unable to determine total page count");
  }
  function getTitle(targetWindow = window) {
    var _a2, _b2;
    const title = (_b2 = (_a2 = getViewerAttributes(targetWindow)) == null ? void 0 : _a2.contentTitle) != null ? _b2 : targetWindow.document.title;
    return sanitizeFilePart(title || "comic-boost");
  }
  function getSliderApi(targetWindow) {
    var _a2;
    const jq = (_a2 = targetWindow.jQuery) != null ? _a2 : targetWindow.$;
    if (!jq) {
      throw new Error("jQuery is unavailable");
    }
    const sliderEl = targetWindow.document.getElementById("pageSliderBar");
    if (!sliderEl) {
      throw new Error("pageSliderBar is unavailable");
    }
    const slider = jq(sliderEl);
    const min = Number(slider.slider("option", "min"));
    const max = Number(slider.slider("option", "max"));
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      throw new Error("Slider bounds are unavailable");
    }
    return { slider, min, max };
  }
  function getSpreadSignature(spread) {
    var _a2, _b2, _c, _d, _e, _f, _g, _h;
    const leftIndex = (_b2 = (_a2 = spread == null ? void 0 : spread.left) == null ? void 0 : _a2.index) != null ? _b2 : "x";
    const rightIndex = (_d = (_c = spread == null ? void 0 : spread.right) == null ? void 0 : _c.index) != null ? _d : "x";
    const leftUrl = (_f = (_e = spread == null ? void 0 : spread.left) == null ? void 0 : _e.url) != null ? _f : "";
    const rightUrl = (_h = (_g = spread == null ? void 0 : spread.right) == null ? void 0 : _g.url) != null ? _h : "";
    return `${leftIndex}|${rightIndex}|${leftUrl}|${rightUrl}`;
  }
  async function waitForReader(targetWindow = window) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < REQUEST_TIMEOUT_MS) {
      const attrs = getViewerAttributes(targetWindow);
      const slider = targetWindow.document.getElementById("pageSliderBar");
      if ((attrs == null ? void 0 : attrs.contentTitle) && slider) {
        return;
      }
      await delay(250);
    }
    throw new Error("Reader did not become ready");
  }
  async function waitForPageMetrics(targetWindow = window) {
    await waitForReader(targetWindow);
    const startedAt = Date.now();
    while (Date.now() - startedAt < REQUEST_TIMEOUT_MS) {
      try {
        const totalPages = getTotalPages(targetWindow);
        const { min, max } = getSliderApi(targetWindow);
        if (Number.isFinite(totalPages) && totalPages > 0 && Number.isFinite(min) && Number.isFinite(max)) {
          return { totalPages, min, max };
        }
      } catch (e) {
      }
      await delay(250);
    }
    throw new Error("Page metrics did not become ready");
  }
  async function createReaderSession(sourceUrl) {
    const renderViewport = getRenderViewport();
    const iframe = document.createElement("iframe");
    iframe.src = sourceUrl;
    iframe.style.cssText = [
      "position: fixed",
      "left: -100000px",
      "top: 0",
      `width: ${renderViewport.width}px`,
      `height: ${renderViewport.height}px`,
      "opacity: 0",
      "pointer-events: none",
      "border: 0",
      "z-index: -1"
    ].join(";");
    document.body.appendChild(iframe);
    await withTimeout(
      new Promise((resolve, reject) => {
        iframe.onload = () => resolve();
        iframe.onerror = () => reject(new Error("Reader iframe failed to load"));
      }),
      "reader iframe load"
    );
    const targetWindow = iframe.contentWindow;
    if (!targetWindow) {
      iframe.remove();
      throw new Error("Reader iframe window is unavailable");
    }
    await waitForReader(targetWindow);
    const getCurrentScreen = () => {
      var _a2, _b2, _c, _d, _e, _f;
      return (_f = (_e = (_d = (_c = (_b2 = (_a2 = targetWindow.NFBR) == null ? void 0 : _a2.a6G) == null ? void 0 : _b2.Initializer) == null ? void 0 : _c.B6o) == null ? void 0 : _d.renderer) == null ? void 0 : _e.currentScreen) != null ? _f : null;
    };
    const waitForRender = async (previousFingerprint = null, expectedSignature = null) => {
      var _a2;
      const startedAt = Date.now();
      let stableFingerprint = null;
      let stableCount = 0;
      while (Date.now() - startedAt < REQUEST_TIMEOUT_MS) {
        const currentScreen2 = getCurrentScreen();
        const spread = (_a2 = getViewerAttributes(targetWindow)) == null ? void 0 : _a2.viewerSpread;
        const leftReady = !(spread == null ? void 0 : spread.left) || Boolean(normalizeRect(currentScreen2 == null ? void 0 : currentScreen2.leftDrawnRect));
        const rightReady = !(spread == null ? void 0 : spread.right) || Boolean(normalizeRect(currentScreen2 == null ? void 0 : currentScreen2.rightDrawnRect));
        const currentSignature = getSpreadSignature(spread);
        if ((currentScreen2 == null ? void 0 : currentScreen2.canvas) && leftReady && rightReady && (!expectedSignature || currentSignature === expectedSignature)) {
          const fingerprint = getRenderFingerprint(currentScreen2);
          if (fingerprint) {
            if (fingerprint === stableFingerprint) {
              stableCount += 1;
            } else {
              stableFingerprint = fingerprint;
              stableCount = 1;
            }
            if (fingerprint !== previousFingerprint && stableCount >= 2) {
              return fingerprint;
            }
            if (fingerprint === previousFingerprint && stableCount >= 6) {
              return fingerprint;
            }
          }
        } else {
          stableFingerprint = null;
          stableCount = 0;
        }
        await delay(UI_POLL_INTERVAL_MS);
      }
      throw new Error("Timed out waiting for rendered canvas");
    };
    await waitForRender();
    const currentScreen = getCurrentScreen();
    if (!(currentScreen == null ? void 0 : currentScreen.canvas)) {
      iframe.remove();
      throw new Error("Rendered canvas is unavailable");
    }
    return {
      window: targetWindow,
      getCurrentScreen,
      getSpread: () => {
        var _a2, _b2;
        return (_b2 = (_a2 = getViewerAttributes(targetWindow)) == null ? void 0 : _a2.viewerSpread) != null ? _b2 : null;
      },
      getCurrentSignature: () => {
        var _a2;
        return getSpreadSignature((_a2 = getViewerAttributes(targetWindow)) == null ? void 0 : _a2.viewerSpread);
      },
      getSlider: () => getSliderApi(targetWindow),
      waitForRender,
      cleanup: () => iframe.remove()
    };
  }
  async function moveSessionToSliderValue(session, sliderValue, previousSignature, previousFingerprint) {
    const { slider } = session.getSlider();
    slider.slider("value", sliderValue);
    slider.trigger("slidechange");
    const startedAt = Date.now();
    while (Date.now() - startedAt < REQUEST_TIMEOUT_MS) {
      const spread = session.getSpread();
      const currentSignature = getSpreadSignature(spread);
      const currentValue = Number(session.getSlider().slider.slider("value"));
      if (spread && currentValue === sliderValue && currentSignature !== previousSignature) {
        const fingerprint = await session.waitForRender(previousFingerprint, currentSignature);
        const settledSpread = session.getSpread();
        if (settledSpread && getSpreadSignature(settledSpread) === currentSignature) {
          return { spread: settledSpread, fingerprint };
        }
      }
      await delay(UI_POLL_INTERVAL_MS);
    }
    throw new Error(`Timed out waiting for spread ${sliderValue}`);
  }
  async function extractRenderedPages(session, spread) {
    await session.waitForRender(null, getSpreadSignature(spread));
    const currentScreen = session.getCurrentScreen();
    const canvas = currentScreen == null ? void 0 : currentScreen.canvas;
    if (!canvas) {
      throw new Error("Rendered canvas is unavailable");
    }
    const renderedPages = [];
    const rightRect = normalizeRect(currentScreen.rightDrawnRect);
    if (spread.right && rightRect) {
      renderedPages.push({
        pageNumber: spread.right.index + 1,
        extension: EXPORT_EXTENSION,
        blob: await blobFromCanvas(canvas, rightRect)
      });
    }
    const leftRect = normalizeRect(currentScreen.leftDrawnRect);
    if (spread.left && leftRect) {
      renderedPages.push({
        pageNumber: spread.left.index + 1,
        extension: EXPORT_EXTENSION,
        blob: await blobFromCanvas(canvas, leftRect)
      });
    }
    return renderedPages.sort((a, b) => a.pageNumber - b.pageNumber);
  }
  async function zipFilesAsync(files) {
    return await new Promise((resolve, reject) => {
      zip(files, { level: 0 }, (error, data) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(data);
      });
    });
  }
  async function captureRange(options) {
    var _a2, _b2, _c;
    const { totalPages, min, max } = await waitForPageMetrics(window);
    const from = Math.max(1, Math.min(options.from, options.to, totalPages));
    const to = Math.max(1, Math.min(Math.max(options.from, options.to), totalPages));
    const files = {};
    const seenPages = /* @__PURE__ */ new Set();
    let exportedCount = 0;
    for (let sliderValue = max; sliderValue >= min; sliderValue -= 1) {
      (_a2 = options.onProgress) == null ? void 0 : _a2.call(options, `preparing batch ${max - sliderValue + 1}`);
      const session = await createReaderSession(window.location.href);
      try {
        const moved = await moveSessionToSliderValue(session, sliderValue, null, null);
        const renderedPages = await extractRenderedPages(session, moved.spread);
        for (const page of renderedPages) {
          if (page.pageNumber < from || page.pageNumber > to || seenPages.has(page.pageNumber)) {
            continue;
          }
          const fileName = `${String(page.pageNumber).padStart(4, "0")}.${page.extension}`;
          files[fileName] = new Uint8Array(await page.blob.arrayBuffer());
          seenPages.add(page.pageNumber);
          exportedCount += 1;
          (_b2 = options.onProgress) == null ? void 0 : _b2.call(options, `captured ${exportedCount} of ${to - from + 1} pages`);
        }
      } finally {
        session.cleanup();
      }
    }
    if (exportedCount === 0) {
      throw new Error("No pages were captured");
    }
    const expectedCount = to - from + 1;
    if (exportedCount !== expectedCount) {
      throw new Error(`Captured ${exportedCount}/${expectedCount} pages`);
    }
    (_c = options.onProgress) == null ? void 0 : _c.call(options, "zipping...");
    const zipBytes = await zipFilesAsync(files);
    const zipName = `${getTitle()}_${String(from).padStart(4, "0")}-${String(to).padStart(4, "0")}.zip`;
    downloadBlob(new Blob([bytesToBlobPart(zipBytes)], { type: ZIP_MIME }), zipName);
    return { zipName, totalPages };
  }
  function createInput(value) {
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
  function createPanel(totalPages) {
    const panel = document.createElement("div");
    panel.id = PANEL_ID;
    panel.style.cssText = [
      "position: fixed",
      "top: 12px",
      "right: 12px",
      "z-index: 2147483647",
      "display: flex",
      "align-items: center",
      "gap: 8px",
      "padding: 8px 10px",
      "border-radius: 10px",
      "background: rgba(16,18,22,0.82)",
      "backdrop-filter: blur(8px)",
      "box-shadow: 0 8px 24px rgba(0,0,0,0.28)",
      "color: #fff",
      "font: 12px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace"
    ].join(";");
    const fromInput = createInput("1");
    const toInput = createInput(String(totalPages));
    const button = document.createElement("button");
    button.textContent = "capture zip";
    button.style.cssText = [
      "padding: 6px 10px",
      "border: 0",
      "border-radius: 6px",
      "background: #f0bf5a",
      "color: #181818",
      "font-weight: 700",
      "cursor: pointer"
    ].join(";");
    const status = document.createElement("span");
    status.textContent = `ready (1-${totalPages})`;
    panel.append(
      document.createTextNode("pages"),
      fromInput,
      document.createTextNode("~"),
      toInput,
      button,
      status
    );
    button.onclick = async () => {
      const from = Number.parseInt(fromInput.value || "1", 10);
      const to = Number.parseInt(toInput.value || String(totalPages), 10);
      button.disabled = true;
      status.textContent = "collecting...";
      try {
        const summary = await captureRange({
          from,
          to,
          onProgress: (message) => {
            status.textContent = message;
          }
        });
        status.textContent = `saved ${summary.zipName}`;
      } catch (error) {
        status.textContent = error instanceof Error ? error.message : String(error);
        console.error(error);
      } finally {
        button.disabled = false;
      }
    };
    return { panel, fromInput, toInput, status, button };
  }
  async function init() {
    window.__comicBoostPublus__ = { captureRange };
    if (document.getElementById(PANEL_ID)) {
      return;
    }
    const { totalPages } = await waitForPageMetrics(window);
    const refs = createPanel(totalPages);
    document.body.appendChild(refs.panel);
    log("ready", totalPages);
  }
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    void init().catch((error) => console.error("[ComicBoostPublus] init failed", error));
  }
})();

