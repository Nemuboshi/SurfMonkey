import assert from "node:assert/strict";
import test from "node:test";

import {
  isCatchAllDiv,
  removeCatchAllDivs,
  shouldBlockReplace,
} from "../src/userscripts/PopcashTabGuard.ts";

test("shouldBlockReplace blocks cross-origin but allows same-origin", () => {
  const origin = "https://4horlover.com";
  assert.equal(shouldBlockReplace("https://ad.example/x", origin), true);
  assert.equal(shouldBlockReplace("https://4horlover.com/?paged=2", origin), false);
  assert.equal(shouldBlockReplace("/?paged=2", origin), false);
  assert.equal(shouldBlockReplace("not a url", origin), false);
});

function fakeDiv(css: Partial<CSSStyleDeclaration>, children = 0): Element {
  return {
    style: {
      position: "",
      width: "",
      height: "",
      zIndex: "",
      ...css,
    },
    children: { length: children },
  } as unknown as Element;
}

test("isCatchAllDiv matches full-screen fixed overlay only", () => {
  assert.equal(
    isCatchAllDiv(fakeDiv({ position: "fixed", width: "100%", height: "100%", zIndex: "300000" })),
    true,
  );
  assert.equal(
    isCatchAllDiv(fakeDiv({ position: "fixed", width: "200px", zIndex: "300000" })),
    false,
  );
  assert.equal(
    isCatchAllDiv(
      fakeDiv({ position: "fixed", width: "100%", height: "100%", zIndex: "300000" }, 1),
    ),
    false,
  );
  assert.equal(
    isCatchAllDiv(
      fakeDiv({ position: "absolute", width: "100%", height: "100%", zIndex: "300000" }),
    ),
    false,
  );
});

test("removeCatchAllDivs removes matching overlays from a root", () => {
  const overlay = {
    ...fakeDiv({ position: "fixed", width: "100%", height: "100%", zIndex: "9999999" }),
    remove: () => {},
  };
  const kept = { ...fakeDiv({ position: "static" }), remove: () => {} };
  const root = { querySelectorAll: () => [overlay, kept] } as unknown as ParentNode;
  assert.equal(removeCatchAllDivs(root), 1);
});
