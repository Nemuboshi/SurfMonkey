// ==UserScript==
// @name 4horlover Age Gate Auto Pass
// @namespace github.com/Nemuboshi/SurfMonkey
// @version 1.0.0
// @description Automatically fills and submits the 4horlover age gate.
// @match https://4horlover.com/*
// @match https://www.4horlover.com/*
// @grant none
// @run-at document-end
// ==/UserScript==

"use strict";
(() => {
  // src/userscripts/FourHorloverAgeGate.ts
  var FIELDS = {
    "#age-gate-d": "01",
    "#age-gate-m": "01",
    "#age-gate-y": "1990"
  };
  function passAgeGate(root = document) {
    const form = root.querySelector("form.age-gate-form");
    if (!form) return false;
    for (const [selector, value] of Object.entries(FIELDS)) {
      const input = form.querySelector(selector);
      if (!input) return false;
      input.value = value;
    }
    form.requestSubmit();
    return true;
  }
  if (typeof document !== "undefined") passAgeGate();
})();

