import assert from "node:assert/strict";
import test from "node:test";

import {
  cueToAssAnchor,
  formatSrtTimestamp,
  markupToSrtText,
  parseWebvtt,
  webvttToSrt,
} from "../src/shared/webvttSrt.ts";

const SAMPLE_VTT = `WEBVTT

STYLE
::cue {
  ruby-align: center;
}

0
00:00:06.548 --> 00:00:08.091 line:84% position:50%
（プライド）乙女ゲーム

1
00:14:58.022 --> 00:14:59.481 line:84% position:50%
（ヴァル）よう<c.13184103930067940435><ruby>主<rt.8237686102498545860>あるじ</rt></ruby></c>

NOTE note between cues

2
00:23:38.416 --> 00:23:39.751 line:8% position:10% align:start
上端左寄せ
`;

test("parseWebvtt extracts cues with identifiers, settings, and skips blocks", () => {
  const cues = parseWebvtt(SAMPLE_VTT);
  assert.equal(cues.length, 3);
  assert.equal(cues[0]?.identifier, "0");
  assert.equal(cues[0]?.startMs, 6548);
  assert.equal(cues[0]?.endMs, 8091);
  assert.equal(cues[0]?.settings.line, "84%");
  assert.equal(cues[0]?.settings.position, "50%");
  assert.equal(cues[2]?.settings.align, "start");
});

test("cueToAssAnchor maps line/position percentages to numpad alignment", () => {
  assert.equal(cueToAssAnchor({ line: "84%", position: "50%" }), "2");
  assert.equal(cueToAssAnchor({ line: "8%", position: "10%" }), "7");
  assert.equal(cueToAssAnchor({ line: "50%", position: "50%" }), "5");
  assert.equal(cueToAssAnchor({ line: "84%", position: "10%" }), "1");
  assert.equal(cueToAssAnchor({ line: "84%", position: "90%" }), "3");
  assert.equal(cueToAssAnchor({ align: "right", position: "50%" }), "3");
  assert.equal(cueToAssAnchor({}), null);
});

test("markupToSrtText converts WEBVTT class-selector ruby to base(reading) with halfwidth parens", () => {
  const text = markupToSrtText(
    "（ヴァル）よう<c.13184103930067940435><ruby>主<rt.8237686102498545860>あるじ</rt></ruby></c>",
  );
  assert.equal(text, "（ヴァル）よう主(あるじ)");
});

test("markupToSrtText strips plain ruby/rp and decodes entities", () => {
  assert.equal(
    markupToSrtText("<ruby>為<rp>(</rp><rt>ため</rt><rp>)</rp></ruby>に"),
    "為(ため)に",
  );
  assert.equal(markupToSrtText("A&nbsp;B &amp; C &lt;tag&gt;"), "A B & C <tag>");
});

test("formatSrtTimestamp pads milliseconds", () => {
  assert.equal(formatSrtTimestamp(6548), "00:00:06,548");
  assert.equal(formatSrtTimestamp(3_735_007), "01:02:15,007");
});

test("webvttToSrt produces numbered blocks with ASS anchor and ruby text", () => {
  const srt = webvttToSrt(SAMPLE_VTT);
  assert.match(srt, /^1\n00:00:06,548 --> 00:00:08,091\n\{\\an2\}（プライド）乙女ゲーム\n/);
  assert.match(srt, /2\n00:14:58,022 --> 00:14:59,481\n\{\\an2\}（ヴァル）よう主\(あるじ\)/);
  assert.match(srt, /3\n00:23:38,416 --> 00:23:39,751\n\{\\an7\}上端左寄せ/);
  assert.ok(!srt.includes("STYLE"));
});

test("webvttToSrt without positioning omits anchor tags", () => {
  const srt = webvttToSrt(SAMPLE_VTT, false);
  assert.ok(!srt.includes("{\\an"));
});
