import assert from "node:assert/strict";
import test from "node:test";

import { buildArchiveBaseName, buildDrawPlanFromDescramble } from "../src/yanmagaCapture.ts";

test("buildArchiveBaseName prefers the current page title", () => {
  assert.equal(
    buildArchiveBaseName("魔力枯れのダークエルフ - 第４話 次の１００年① | ヤンマガWeb"),
    "魔力枯れのダークエルフ - 第４話 次の１００年①",
  );
});

test("buildDrawPlanFromDescramble flattens source transfer coords", () => {
  const plan = buildDrawPlanFromDescramble({
    width: 1127,
    height: 1600,
    transfers: [
      {
        index: 0,
        coords: [
          { xsrc: 10, ysrc: 20, width: 100, height: 200, xdest: 0, ydest: 0 },
          { xsrc: 110, ysrc: 220, width: 50, height: 60, xdest: 100, ydest: 200 },
        ],
      },
    ],
  });

  assert.equal(plan.width, 1127);
  assert.equal(plan.height, 1600);
  assert.deepEqual(plan.draws, [
    { xsrc: 10, ysrc: 20, width: 100, height: 200, xdest: 0, ydest: 0 },
    { xsrc: 110, ysrc: 220, width: 50, height: 60, xdest: 100, ydest: 200 },
  ]);
});
