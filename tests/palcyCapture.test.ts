import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeCapturePages,
  parseComicIdFromPath,
  parseComicIdFromUrl,
} from "../src/userscripts/PalcyCapture.ts";

test("parseComicIdFromPath extracts comic id from Palcy comic paths", () => {
  assert.equal(parseComicIdFromPath("/comics/2583"), "2583");
  assert.equal(parseComicIdFromPath("/comics/2583/"), "2583");
});

test("parseComicIdFromPath rejects non-comic paths", () => {
  assert.equal(parseComicIdFromPath("/comics/foo"), null);
  assert.equal(parseComicIdFromPath("/authors/1750"), null);
});

test("parseComicIdFromUrl extracts comic id from absolute and relative URLs", () => {
  assert.equal(parseComicIdFromUrl("https://palcy.jp/comics/2583"), "2583");
  assert.equal(parseComicIdFromUrl("/comics/867"), "867");
});

test("normalizeCapturePages maps Palcy API page images", () => {
  assert.deepEqual(
    normalizeCapturePages({
      comicId: "2583",
      title: "sample",
      pages: [
        {
          page: 1,
          image: {
            url: "https://palcy-contents.pximg.net/c/q90_grid32x32/pages/image_urls/1/a.jpg",
            width: 1125,
            height: 1600,
            gridSize: 32,
            decryptionKey: "key-1",
          },
        },
      ],
    }),
    [
      {
        number: 1,
        url: "https://palcy-contents.pximg.net/c/q90_grid32x32/pages/image_urls/1/a.jpg",
        width: 1125,
        height: 1600,
        gridSize: 32,
        key: "key-1",
      },
    ],
  );
});
