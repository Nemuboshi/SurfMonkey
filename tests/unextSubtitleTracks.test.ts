import assert from "node:assert/strict";
import test from "node:test";

import { pickWebvttSubtitleTracks, trackSuffix } from "../src/userscripts/UnextSubtitleHarvest.ts";

const MASTER_TWO_TRACKS = `#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=500000,RESOLUTION=640x360
video_500/video_MEZ0001301733_500_fp.m3u8

#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",LANGUAGE="ja",NAME="日本語",DEFAULT=YES,AUTOSELECT=YES,FORCED=NO,URI="https://streamc01cf.nxtv.jp/cmaf01/0001/171/uuid/text_webvtt_jaJP_sdh/text_MEZ0001301733_webvtt_jaJP_sdh_fp.m3u8"
#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",LANGUAGE="ja",NAME="日本語Guide",DEFAULT=NO,AUTOSELECT=YES,FORCED=NO,URI="https://streamc01cf.nxtv.jp/cmaf01/0001/171/uuid/text_webvtt_jaJP_guide/text_MEZ0001301733_webvtt_jaJP_guide_fp.m3u8"
#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",LANGUAGE="en",NAME="English",URI="https://streamc01cf.nxtv.jp/cmaf01/0001/171/uuid/text_ttml_enUS/text_MEZ0001301733_ttml_enUS_fp.m3u8"
`;

const MASTER_ONE_TRACK = `#EXTM3U
#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",LANGUAGE="ja",NAME="日本語",URI="https://streamc01cf.nxtv.jp/cmaf01/0001/171/uuid/text_webvtt_jaJP_sdh/text_MEZ0001301733_webvtt_jaJP_sdh_fp.m3u8"
`;

test("pickWebvttSubtitleTracks returns every webvtt track with its NAME", () => {
  const tracks = pickWebvttSubtitleTracks(MASTER_TWO_TRACKS);
  assert.equal(tracks.length, 2);
  assert.deepEqual(
    tracks.map((t) => t.name),
    ["日本語", "日本語Guide"],
  );
  assert.ok(tracks[0].vttUrl.includes("text_webvtt_jaJP_sdh"));
  assert.ok(tracks[1].vttUrl.includes("text_webvtt_jaJP_guide"));
});

test("pickWebvttSubtitleTracks skips non-webvtt (ttml) tracks and handles single track", () => {
  const tracks = pickWebvttSubtitleTracks(MASTER_ONE_TRACK);
  assert.equal(tracks.length, 1);
  assert.equal(tracks[0].name, "日本語");
});

test("pickWebvttSubtitleTracks falls back to the directory name without NAME attr", () => {
  const master = `#EXT-X-MEDIA:TYPE=SUBTITLES,URI="https://x/text_webvtt_jaJP_sdh/y.m3u8"`;
  const tracks = pickWebvttSubtitleTracks(master);
  assert.equal(tracks[0].name, "text_webvtt_jaJP_sdh");
});

test("trackSuffix shortens directory-style names and keeps human names", () => {
  assert.equal(trackSuffix("日本語Guide"), "日本語Guide");
  assert.equal(trackSuffix("text_webvtt_jaJP_sdh"), "jaJP_sdh");
});
