import assert from "node:assert/strict";
import test from "node:test";

import {
  decodeXor,
  inferFileExtension,
  parseChapterIdFromApiUrl,
  parseChapterIdFromChapterRoute,
  parseChapterIdFromPath,
  parseChapterIdFromUrl,
} from "../src/userscripts/MangaParkLite.ts";

test("parseChapterIdFromPath extracts chapter id from reader path", () => {
  assert.equal(parseChapterIdFromPath("/title/104555/795806"), "795806");
  assert.equal(parseChapterIdFromPath("/title/999/12345/"), "12345");
});

test("parseChapterIdFromPath returns null on non-reader path", () => {
  assert.equal(parseChapterIdFromPath("/title/104555"), null);
  assert.equal(parseChapterIdFromPath("/foo/bar"), null);
});

test("parseChapterIdFromUrl extracts chapter id from absolute and relative URL", () => {
  assert.equal(parseChapterIdFromUrl("https://manga-park.com/title/104555/795806"), "795806");
  assert.equal(parseChapterIdFromUrl("/title/104555/795806"), "795806");
});

test("parseChapterIdFromApiUrl extracts chapter id from API endpoint", () => {
  assert.equal(parseChapterIdFromApiUrl("https://manga-park.com/api/chapter/795809"), "795809");
  assert.equal(
    parseChapterIdFromApiUrl("https://manga-park.com/api/chapter/795830?foo=bar"),
    "795830",
  );
  assert.equal(parseChapterIdFromApiUrl("https://manga-park.com/api/title/104555"), null);
});

test("parseChapterIdFromChapterRoute extracts chapter id from route", () => {
  assert.equal(parseChapterIdFromChapterRoute("/chapter/795809"), "795809");
  assert.equal(
    parseChapterIdFromChapterRoute("https://manga-park.com/chapter/795830?x=1"),
    "795830",
  );
  assert.equal(parseChapterIdFromChapterRoute("/title/104555/795806"), null);
});

test("decodeXor decodes payload with repeating key bytes", () => {
  const plain = Uint8Array.from([10, 20, 30, 40, 50, 60]);
  const key = Uint8Array.from([7, 9, 11]);
  const encoded = plain.map((value, idx) => value ^ key[idx % key.length]);
  const decoded = decodeXor(encoded, key);
  assert.deepEqual(Array.from(decoded), Array.from(plain));
});

test("inferFileExtension falls back to jpg for unknown paths", () => {
  assert.equal(inferFileExtension("https://manga-park.com/a/b/c.jpg.enc"), "jpg");
  assert.equal(inferFileExtension("https://manga-park.com/a/b/c.webp.enc"), "webp");
  assert.equal(inferFileExtension("https://manga-park.com/a/b/c.enc"), "jpg");
});
