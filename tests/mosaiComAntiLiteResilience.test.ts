import assert from "node:assert/strict";
import test from "node:test";

import { mapWithConcurrency, retryAsync, withTimeout } from "../src/MosaiComAntiLite.ts";

test("withTimeout rejects when operation exceeds timeout", async () => {
  await assert.rejects(
    () => withTimeout(new Promise<void>(() => {}), 20, "image load"),
    /image load timeout/i,
  );
});

test("retryAsync retries retriable error and eventually succeeds", async () => {
  let attempts = 0;
  const value = await retryAsync(
    async () => {
      attempts += 1;
      if (attempts < 3) {
        throw new Error("network unstable");
      }
      return "ok";
    },
    {
      delaysMs: [1, 1],
      shouldRetry: (error) => /network/i.test(String(error)),
    },
  );

  assert.equal(value, "ok");
  assert.equal(attempts, 3);
});

test("retryAsync stops immediately on non-retriable error", async () => {
  let attempts = 0;
  await assert.rejects(
    () =>
      retryAsync(
        async () => {
          attempts += 1;
          throw new Error("bad request");
        },
        {
          delaysMs: [1, 1, 1],
          shouldRetry: (error) => /network|timeout/i.test(String(error)),
        },
      ),
    /bad request/i,
  );
  assert.equal(attempts, 1);
});

test("mapWithConcurrency respects max worker count", async () => {
  const items = Array.from({ length: 8 }, (_, i) => i);
  let running = 0;
  let maxRunning = 0;

  const out = await mapWithConcurrency(items, 3, async (item) => {
    running += 1;
    maxRunning = Math.max(maxRunning, running);
    await new Promise((resolve) => setTimeout(resolve, 10));
    running -= 1;
    return item * 2;
  });

  assert.deepEqual(out, items.map((item) => item * 2));
  assert.equal(maxRunning <= 3, true);
});
