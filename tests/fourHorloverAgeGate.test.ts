import assert from "node:assert/strict";
import test from "node:test";

import { passAgeGate } from "../src/userscripts/FourHorloverAgeGate.ts";

test("passAgeGate fills the date and submits the detected form", () => {
  const values: Record<string, string> = {};
  let submitted = false;
  const form = {
    querySelector(selector: string) {
      return {
        set value(value: string) {
          values[selector] = value;
        },
      };
    },
    requestSubmit: () => (submitted = true),
  };
  const root = { querySelector: () => form } as unknown as ParentNode;

  assert.equal(passAgeGate(root), true);
  assert.deepEqual(values, {
    "#age-gate-d": "01",
    "#age-gate-m": "01",
    "#age-gate-y": "1990",
  });
  assert.equal(submitted, true);
});

test("passAgeGate does nothing when the plugin form is absent", () => {
  const root = { querySelector: () => null } as unknown as ParentNode;
  assert.equal(passAgeGate(root), false);
});
