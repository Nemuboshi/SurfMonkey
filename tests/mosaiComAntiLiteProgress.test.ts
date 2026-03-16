import assert from "node:assert/strict";
import test from "node:test";

import { formatCaptureProgress, formatZipProgress } from "../src/MosaiComAntiLite.ts";

test("formatCaptureProgress reports completed page count", () => {
  assert.equal(formatCaptureProgress(3, 12), "capturing 3/12");
});

test("formatCaptureProgress clamps to a safe minimum total", () => {
  assert.equal(formatCaptureProgress(0, 0), "capturing 0/1");
});

test("formatZipProgress reports zip phase", () => {
  assert.equal(formatZipProgress(), "zipping...");
});
