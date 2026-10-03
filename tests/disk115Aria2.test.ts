import assert from "node:assert/strict";
import test from "node:test";

import {
  a2hex,
  getKey,
  md5,
  rsaEncrypt,
  secretEncode,
  stringToBytes,
  symDecode,
  symEncode,
  xor115Enc,
} from "../src/userscripts/disk115Aria2.ts";

// Every expectation below was captured from the original extension implementation
// (github.com/acgotaku/115 src/js/lib/secret.js, big-integer + blueimp-md5), so a
// failure here means 115's API would start rejecting our payloads.

const KEY = stringToBytes(md5("!@###@#1700000000DFDR@#@#"));

test("md5 matches blueimp-md5", () => {
  const inputs = [
    "",
    "a",
    "abc",
    "message digest",
    "1234567890".repeat(16),
    "!@###@#1700000000DFDR@#@#",
  ];
  assert.deepEqual(
    inputs.map((input) => md5(input)),
    [
      "d41d8cd98f00b204e9800998ecf8427e",
      "0cc175b9c0f1b6a831c399e269772661",
      "900150983cd24fb0d6963f7d28e17f72",
      "f96b697d7cb7938d525a2f31aaf161d0",
      "268c7919189d85e276d74b8c60b2f84f",
      "3414710ca6d810add66664fcf90b0254",
    ],
  );
});

test("a2hex pads single digit bytes", () => {
  assert.equal(a2hex([0, 1, 15, 254, 255]), "00010ffeff");
});

test("BigInt modPow matches big-integer modPow", () => {
  assert.equal(
    rsaEncrypt("The quick brown fox jumps over the lazy dog"),
    "5333c79f423ed373b3b68949a3208ac6e9120f93f44d4fea24accbe62098f24f3c1366699d4bdaadbb791e8717f6032e" +
      "94da9fb0565006b716c3e6c8f44b8f36dd63560b0f071f5e521edf9e714fe851ae8e54945182f94d85cf205503a5d11" +
      "13738c27c043bbcdd730a7e76fba54c6522f510aeb7ff795f613602b37d217771",
  );
});

test("key derivation matches original getkey", () => {
  assert.deepEqual(getKey(4, KEY), [94, 233, 244, 65]);
  assert.deepEqual(getKey(12, null), [120, 6, 173, 76, 51, 134, 93, 24, 76, 1, 63, 70]);
  assert.deepEqual(
    getKey(12, KEY.slice(0, 16)),
    [127, 78, 118, 104, 138, 23, 136, 100, 181, 107, 30, 100],
  );
});

test("xor115Enc keeps the mod4 split", () => {
  assert.deepEqual(
    xor115Enc([1, 2, 3, 4, 5, 6, 7], 7, getKey(4, KEY), 4),
    [95, 235, 247, 90, 236, 242, 70],
  );
});

test("symEncode and symDecode match original byte streams", () => {
  const payload = stringToBytes("the quick brown fox 115!!");
  const encoded = symEncode(payload, payload.length, KEY, null);
  assert.deepEqual(
    encoded,
    [
      24, 173, 218, 194, 60, 231, 23, 108, 63, 152, 134, 22, 104, 254, 141, 211, 102, 164, 6, 118,
      40, 152, 141, 9, 108,
    ],
  );
  // The 12 byte key comes from the payload prefix on decode, which is why this is not
  // the inverse of symEncode.
  assert.deepEqual(
    symDecode(encoded, encoded.length, KEY, KEY.slice(0, 16)),
    [
      86, 73, 15, 217, 13, 160, 248, 218, 79, 251, 42, 117, 77, 86, 4, 217, 26, 186, 233, 153, 21,
      234, 125, 38, 38,
    ],
  );
});

test("secretEncode matches original request bodies", () => {
  const cases: Array<[string, number, string]> = [
    [
      "",
      1700000000,
      "YVrTNxG7qhmxiw91xnF1EGSSLYgKiHG9lQwGVzScACyMv6eWVcR5nxu8+tbjix5wTxI0Ze8fs9JWcx+/bVsFtVXCL2YZIJHN7jbAWLOEa7Vk9Js/0Ax3yc7yDZHHsVG/s/z/YKjic+EhYWceFq1bTNOL0h5njHHdcNxV7P4DkaM=",
    ],
    [
      "x",
      1700000001,
      "Bkc53vv0qRWmz3i5+Q3rcGNUKHT/oTspRuvwjg3MO3VcwOQnvb/COYMHVuqBZ2HUljwWPZwm2ESdnpYJuyzM9R7983+n6LdIT+z5PVIf8gPDD8+r1RYw8oUcwRXFbeNxOAg6Bny2zck2/DVFPdL30v81doE+T85o5osVMrkwMaI=",
    ],
    [
      JSON.stringify({ pickcode: "abcdefghij0123456789" }),
      1700000002,
      "XWbaB8WIR41g7kEmZzpbX8mJ3Wlmm2++Ibg8aqieMzfG3RIfwSr8maQ4osXGxv7lqL4TGQS6JydYwKjOM+6D3VQd4rlfmWUtGfNKWOVjIHfs6VAcpffZYFagCPkYzVddXKv/Ga+fjfsnodHtvkkILxvTUiY4E0MNbzkUwfJXhJg=",
    ],
    [
      JSON.stringify({ pickcode: "y".repeat(200) }),
      1700000003,
      "EjHxgF5WUU3Z+1dyawnK7uoiPH4yRVoqGff5spgqAySo8U8HtoC9FoIZJvsi9K+byHV6r8o43v2xKjNa0qX0EFlBYEtjPyhbMgEasBnLsWWmlv7ghp/7sKh5oc0LaUxXhx1epOJgeiHgm/PRTu88h/okqeapEdUdWCBsrFW5F8Vq5uRsTZzwAzQ7W0cIlfHTxoFfTzuNSb6mt3/AGheLDwjCncxF73FAvOFmx6tHoK6npHyP8Itat5AJEwSfAjsjEgIzG/SXQ2ReQ31By0vkII03eVURcjQtasitxt77PGU/GEwyPpX1Kd7LatIS0jSDr6/Om69YOSz/o/V9Iz815g==",
    ],
  ];

  for (const [input, timestamp, expected] of cases) {
    assert.equal(secretEncode(input, timestamp).data, expected, `timestamp ${timestamp}`);
  }
});
