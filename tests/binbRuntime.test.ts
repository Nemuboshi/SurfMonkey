import assert from "node:assert/strict";
import test from "node:test";

import {
  type BinbPageImageLike,
  resolveBinbDescramble,
  resolveBinbSourceUrl,
} from "../src/binbRuntime.ts";

const sampleImage: BinbPageImageLike = {
  src: "images/page.jpg",
  orgwidth: 793,
  orgheight: 1200,
};

test("resolveBinbDescramble supports readers that expect a page image object", () => {
  const calls: unknown[] = [];
  const result = { width: 729, height: 1136, transfers: [] };

  const descramble = resolveBinbDescramble(
    {
      getImageUrl: (src) => `https://example.invalid/${src}`,
      getImageDescrambleCoords: (arg, width, height) => {
        calls.push({ arg, width, height });
        assert.equal(arg, sampleImage);
        return result;
      },
    },
    sampleImage,
  );

  assert.equal(descramble, result);
  assert.equal(calls.length, 1);
});

test("resolveBinbDescramble falls back to src strings for CMOA-style readers", () => {
  const calls: unknown[] = [];
  const result = { width: 729, height: 1136, transfers: [] };

  const descramble = resolveBinbDescramble(
    {
      getImageUrl: (src) => `https://example.invalid/${src}`,
      getImageDescrambleCoords: (arg, width, height) => {
        calls.push({ arg, width, height });
        if (typeof arg !== "string") {
          throw new Error("expected src");
        }
        assert.equal(arg, sampleImage.src);
        return result;
      },
    },
    sampleImage,
  );

  assert.equal(descramble, result);
  assert.equal(calls.length, 2);
});

test("resolveBinbDescramble prefers loaded source dimensions when provided", () => {
  const calls: Array<{ arg: unknown; width: number; height: number }> = [];
  const result = { width: 793, height: 1200, transfers: [] };

  const descramble = resolveBinbDescramble(
    {
      getImageUrl: (src) => `https://example.invalid/${src}`,
      getImageDescrambleCoords: (arg, width, height) => {
        calls.push({ arg, width, height });
        if (typeof arg !== "string") {
          throw new Error("expected src");
        }
        return result;
      },
    },
    sampleImage,
    { width: 857, height: 1264 },
  );

  assert.equal(descramble, result);
  assert.deepEqual(calls, [
    { arg: sampleImage, width: 857, height: 1264 },
    { arg: sampleImage.src, width: 857, height: 1264 },
  ]);
});

test("resolveBinbSourceUrl uses the page image src", () => {
  assert.equal(
    resolveBinbSourceUrl(
      {
        getImageUrl: (src) => `https://example.invalid/${src}`,
        getImageDescrambleCoords: () => null,
      },
      sampleImage,
    ),
    "https://example.invalid/images/page.jpg",
  );
});
