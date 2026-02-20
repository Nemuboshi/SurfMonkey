import { promises as fs } from "node:fs";
import path from "node:path";
import { build } from "esbuild";
import fg from "fast-glob";
import { parse as parseYaml } from "yaml";

type HeaderValue = string | number | boolean | null | undefined | HeaderValue[];
type HeaderMap = Record<string, HeaderValue>;

function normalizeHeaderKey(key: string): string {
  return key.startsWith("@") ? key.slice(1) : key;
}

function toHeaderLine(key: string, value: Exclude<HeaderValue, HeaderValue[]>): string[] {
  if (value === null || value === undefined || value === false) {
    return [];
  }
  if (value === true) {
    return [`// @${key}`];
  }
  return [`// @${key} ${String(value)}`];
}

function renderHeader(header: HeaderMap): string {
  const lines: string[] = ["// ==UserScript=="];

  for (const [rawKey, rawValue] of Object.entries(header)) {
    const key = normalizeHeaderKey(rawKey).trim();
    if (!key) {
      continue;
    }

    if (Array.isArray(rawValue)) {
      for (const item of rawValue) {
        lines.push(...toHeaderLine(key, item as Exclude<HeaderValue, HeaderValue[]>));
      }
      continue;
    }

    lines.push(...toHeaderLine(key, rawValue as Exclude<HeaderValue, HeaderValue[]>));
  }

  lines.push("// ==/UserScript==");
  return lines.join("\n");
}

async function main(): Promise<void> {
  const cwd = process.cwd();
  const _srcDir = path.join(cwd, "src");
  const distDir = path.join(cwd, "dist");

  const tsFiles = await fg("src/**/*.ts", { cwd, onlyFiles: true, dot: false });
  if (tsFiles.length === 0) {
    console.log("No TypeScript entry files found in src/. Nothing to build.");
    return;
  }

  await fs.rm(distDir, { recursive: true, force: true });
  await fs.mkdir(distDir, { recursive: true });

  const errors: string[] = [];

  for (const tsRel of tsFiles) {
    try {
      const tsAbs = path.join(cwd, tsRel);
      const parsed = path.parse(tsRel);
      const yamlRel = path.join(parsed.dir, `${parsed.name}.yaml`);
      const yamlAbs = path.join(cwd, yamlRel);

      let yamlRaw: string;
      try {
        yamlRaw = await fs.readFile(yamlAbs, "utf8");
      } catch {
        throw new Error(`Missing metadata file: ${yamlRel}`);
      }

      const parsedYaml = parseYaml(yamlRaw);
      if (!parsedYaml || typeof parsedYaml !== "object" || Array.isArray(parsedYaml)) {
        throw new Error(`Invalid YAML metadata object in: ${yamlRel}`);
      }

      const header = renderHeader(parsedYaml as HeaderMap);
      const result = await build({
        entryPoints: [tsAbs],
        bundle: true,
        platform: "browser",
        format: "iife",
        target: "es2018",
        legalComments: "none",
        write: false,
      });

      const output = result.outputFiles?.[0]?.text;
      if (!output) {
        throw new Error(`No JS output generated for: ${tsRel}`);
      }

      const outRel = path.join(parsed.dir, `${parsed.name}.user.js`);
      const outAbs = path.join(distDir, outRel.replace(/^src[\\/]/, ""));
      await fs.mkdir(path.dirname(outAbs), { recursive: true });
      await fs.writeFile(outAbs, `${header}\n\n${output.trimStart()}\n`, "utf8");
      console.log(`Built: ${outRel.replace(/^src[\\/]/, "")}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${tsRel}: ${message}`);
      console.error(`Failed: ${tsRel}`);
      console.error(`  ${message}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Build failed with ${errors.length} error(s).`);
  }

  console.log(`Done. Generated ${tsFiles.length} userscript file(s) in dist/.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
