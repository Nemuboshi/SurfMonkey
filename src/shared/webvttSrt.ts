// WEBVTT -> SRT converter tuned for U-NEXT SDH subtitle tracks.
//
// U-NEXT ships one .vtt per episode where every cue carries placement hints
// (e.g. "line:84% position:50%") and ruby annotations use the WEBVTT
// class-selector form, so cue text looks like:
//
//   <c.13184103930067940435><ruby>主<rt.8237686102498545860>あるじ</rt></ruby></c>
//
// The numeric class names map to ::cue rules in the file's STYLE block.
// The SRT fallback renders ruby as "base(reading)" (halfwidth parens) and
// preserves placement
// as a libass-compatible override tag "{\anN}" (numpad alignment) line prefix.

export type VttCueSettings = {
  align?: string;
  line?: string;
  position?: string;
  region?: string;
  vertical?: string;
  size?: string;
};

export type VttCue = {
  identifier?: string;
  startMs: number;
  endMs: number;
  settings: VttCueSettings;
  text: string;
};

const TIMESTAMP_RE = /(?:\d{1,2}:)?\d{1,2}:\d{2}(?:[.,]\d{1,3})?/;

function parseTimestamp(raw: string): number {
  const cleaned = raw.trim();
  let hours = 0;
  let rest = cleaned;
  if ((cleaned.match(/:/g) ?? []).length >= 2) {
    const idx = cleaned.indexOf(":");
    hours = Number(cleaned.slice(0, idx));
    rest = cleaned.slice(idx + 1);
  }
  const [minutePart, secondPart = "0"] = rest.split(":");
  const seconds = Number(secondPart.replace(",", "."));
  return Math.round(hours * 3_600_000 + Number(minutePart) * 60_000 + seconds * 1000);
}

function parseSettings(rest: string): VttCueSettings {
  const settings: VttCueSettings = {};
  for (const token of rest.trim().split(/\s+/)) {
    const [key, ...valueParts] = token.split(":");
    if (!key || valueParts.length === 0) {
      continue;
    }
    const value = valueParts.join(":");
    if (key === "align" || key === "line" || key === "position" || key === "region") {
      settings[key] = value;
    } else if (key === "vertical" || key === "size") {
      settings[key] = value;
    }
  }
  return settings;
}

// Split a WEBVTT body into cues, dropping the header and NOTE/STYLE/REGION
// blocks. Blocks are blank-line separated; a block qualifies as a cue only if
// its first or second line contains "-->".
export function parseWebvtt(input: string): VttCue[] {
  const normalized = input.replace(/\r\n?/g, "\n");
  const cues: VttCue[] = [];
  for (const chunk of normalized.split(/\n[ \t]*\n/)) {
    const lines = chunk.split("\n");
    if (lines.length === 0 || /^(NOTE|STYLE|REGION)/.test(lines[0])) {
      continue;
    }
    let timingIndex = -1;
    let identifier: string | undefined;
    if (lines[0].includes("-->")) {
      timingIndex = 0;
    } else if (lines.length > 1 && lines[1].includes("-->")) {
      identifier = lines[0].trim();
      timingIndex = 1;
    }
    if (timingIndex === -1) {
      continue;
    }
    const [startRaw, ...endParts] = lines[timingIndex].split("-->");
    const endRest = endParts.join("-->");
    const endMatch = endRest.match(TIMESTAMP_RE);
    if (!endMatch) {
      continue;
    }
    cues.push({
      identifier,
      startMs: parseTimestamp(startRaw),
      endMs: parseTimestamp(endMatch[0]),
      settings: parseSettings(endRest.slice(endMatch[0].length)),
      text: lines
        .slice(timingIndex + 1)
        .join("\n")
        .trim(),
    });
  }
  return cues;
}

// Map WEBVTT line/position/align settings to an ASS numpad alignment digit
// (7 8 9 / 4 5 6 / 1 2 3, top-left .. bottom-right). Returns null when the cue
// carries no placement hints, leaving the line to the player's default anchor.
export function cueToAssAnchor(settings: VttCueSettings): string | null {
  const hasLine = settings.line !== undefined;
  const hasPosition = settings.position !== undefined;
  const hasAlign = settings.align !== undefined;
  if (!hasLine && !hasPosition && !hasAlign) {
    return null;
  }

  // ASS vertical rows: 0 = top (7/8/9), 1 = middle (4/5/6), 2 = bottom (1/2/3).
  let vertical = 2;
  const line = settings.line;
  if (line?.endsWith("%")) {
    const value = parseFloat(line);
    if (Number.isFinite(value)) {
      vertical = value <= 30 ? 0 : value >= 70 ? 2 : 1;
    }
  }

  let horizontal = 1;
  const position = settings.position;
  if (settings.align === "start" || settings.align === "left") {
    horizontal = 0;
  } else if (settings.align === "end" || settings.align === "right") {
    horizontal = 2;
  } else if (settings.align === "center" || settings.align === "middle") {
    horizontal = 1;
  } else if (position?.endsWith("%")) {
    const value = parseFloat(position);
    if (Number.isFinite(value)) {
      horizontal = value <= 33 ? 0 : value >= 67 ? 2 : 1;
    }
  }

  return String([7, 4, 1][vertical] + horizontal);
}

// WEBVTT ruby markup (class-selector form included) -> plain "base(reading)",
// then strip remaining inline tags and decode entities.
export function markupToSrtText(text: string): string {
  let out = text.replace(/<rp[^>]*>[\s\S]*?<\/rp>/g, "");
  out = out.replace(
    /<ruby>([\s\S]*?)<rt[^>]*>([\s\S]*?)<\/rt><\/ruby>/g,
    (_m, base: string, reading: string) => {
      const cleanBase = base.replace(/<[^>]+>/g, "").trim();
      const cleanReading = reading.replace(/<[^>]+>/g, "").trim();
      return `${cleanBase}(${cleanReading})`;
    },
  );
  out = out.replace(/<\/?(?:c(?:\.[^\s>]+)?|v(?:\.[^\s>]+)?|b|i|u|ruby|rt|rp)>/g, "");
  out = out
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_m, code: string) => String.fromCodePoint(Number(code)));
  return out.replace(/[ \t]+\n/g, "\n").trim();
}

export function formatSrtTimestamp(ms: number): string {
  const clamped = Math.max(0, Math.round(ms));
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  const hours = Math.floor(clamped / 3_600_000);
  const minutes = Math.floor((clamped % 3_600_000) / 60_000);
  const seconds = Math.floor((clamped % 60_000) / 1000);
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(clamped % 1000, 3)}`;
}

// Convert a WEBVTT body to SRT text. With keepPositioning, cues that carry
// line/position/align settings gain a "{\anN}" ASS override prefix.
export function webvttToSrt(input: string, keepPositioning = true): string {
  const cues = parseWebvtt(input);
  return `${cues
    .map((cue, i) => {
      const anchor = keepPositioning ? cueToAssAnchor(cue.settings) : null;
      const body = markupToSrtText(cue.text);
      const text = anchor ? `{\\an${anchor}}${body}` : body;
      return `${i + 1}\n${formatSrtTimestamp(cue.startMs)} --> ${formatSrtTimestamp(cue.endMs)}\n${text}`;
    })
    .join("\n\n")}\n`;
}
