import assert from "node:assert/strict";
import test from "node:test";

import { descrambleBakuPage } from "../src/userscripts/ComicDaysCapture.ts";

test("baku uses 8-pixel-aligned tiles and preserves edge strips", async (t) => {
  const draws: unknown[][] = [];
  let closed = false;
  const bitmap = {
    close: () => {
      closed = true;
    },
  };
  const png = new Blob(["png"], { type: "image/png" });
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ({ drawImage: (...args: unknown[]) => draws.push(args.slice(1)) }),
    toBlob: (callback: (blob: Blob) => void) => callback(png),
  };
  for (const [key, value] of Object.entries({
    createImageBitmap: async () => bitmap,
    document: { createElement: () => canvas },
  })) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, value });
    t.after(() => {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    });
  }
  assert.equal(
    await descrambleBakuPage(new Blob(), {
      src: "https://cdn-img.comic-days.com/test",
      width: 1115,
      height: 1603,
    }),
    png,
  );
  assert.equal(draws.length, 17);
  assert.deepEqual(draws[0], [0, 0, 1115, 1603]);
  for (let row = 0; row < 4; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      assert.deepEqual(draws[1 + row * 4 + column], [
        column * 272,
        row * 400,
        272,
        400,
        row * 272,
        column * 400,
        272,
        400,
      ]);
    }
  }
  assert.equal(closed, true);
  assert.equal(canvas.width, 1);
});
