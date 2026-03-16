import assert from "node:assert/strict";
import test from "node:test";

import { summarizeReaderProbe } from "../src/yanmagaCapture.ts";

test("summarizeReaderProbe reports missing reader clearly", () => {
  assert.equal(
    summarizeReaderProbe({
      hasWindowReader: false,
      hasUnsafeWindow: false,
      hasUnsafeWindowReader: false,
      hasBody: true,
      readyState: "interactive",
      endPageNumber: null,
    }),
    "reader missing | ready=interactive | body=yes | uw=no",
  );
});

test("summarizeReaderProbe reports discovered page count", () => {
  assert.equal(
    summarizeReaderProbe({
      hasWindowReader: true,
      hasUnsafeWindow: true,
      hasUnsafeWindowReader: false,
      hasBody: true,
      readyState: "complete",
      endPageNumber: 27,
    }),
    "reader ok | pages=27 | ready=complete",
  );
});

test("summarizeReaderProbe distinguishes partial reader state", () => {
  assert.equal(
    summarizeReaderProbe({
      hasWindowReader: true,
      hasUnsafeWindow: false,
      hasUnsafeWindowReader: false,
      hasBody: true,
      readyState: "complete",
      endPageNumber: null,
    }),
    "reader partial | pages=? | ready=complete | uw=no",
  );
});
