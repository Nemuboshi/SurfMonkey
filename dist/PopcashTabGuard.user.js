// ==UserScript==
// @name PopCash Tab Guard
// @namespace github.com/Nemuboshi/SurfMonkey
// @version 1.0.0
// @description Blocks PopCash tabunder from hijacking the current tab.
// @match https://4horlover.com/*
// @match https://www.4horlover.com/*
// @grant none
// @run-at document-start
// ==/UserScript==

"use strict";
(() => {
  // src/userscripts/PopcashTabGuard.ts
  function isCatchAllDiv(el) {
    const style = el.style;
    if (!style) return false;
    return style.position === "fixed" && style.width === "100%" && style.height === "100%" && Number(style.zIndex) >= 1e5 && el.children.length === 0;
  }
  function removeCatchAllDivs(root) {
    let removed = 0;
    for (const el of root.querySelectorAll("div")) {
      if (isCatchAllDiv(el)) {
        el.remove();
        removed += 1;
      }
    }
    return removed;
  }
  function shouldBlockReplace(url, origin) {
    try {
      return new URL(url, origin).origin !== origin;
    } catch (e) {
      return false;
    }
  }
  function guard(win) {
    const loc = win.location;
    const originalReplace = loc.replace.bind(loc);
    Object.defineProperty(loc, "replace", {
      value: (url) => {
        if (shouldBlockReplace(url, loc.origin)) return;
        originalReplace(url);
      },
      configurable: true
    });
    const sweep = () => removeCatchAllDivs(win.document);
    new MutationObserver(sweep).observe(win.document.documentElement, {
      childList: true,
      subtree: true
    });
    sweep();
  }
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    guard(window);
  }
})();

