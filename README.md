# SurfMonkey Userscripts

This project builds userscripts from paired source files:

- `src/userscripts/<name>.ts`: script source
- `src/userscripts/<name>.yaml`: userscript metadata header

Build output:

- `dist/<name>.user.js`

## Install

```bash
pnpm install
```

If your PowerShell blocks `pnpm` scripts, use `pnpm.cmd` instead.

## Build

```bash
pnpm build
```

`dist/*.user.js` files are committed intentionally. After changing anything under `src/` or
`scripts/build-userscripts.ts`, run `pnpm build` and commit the matching `dist/` updates.

## Development checks

Run the same checks used by CI:

```bash
pnpm run ci
```

For narrower feedback:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

`pnpm run ci` also verifies that tracked `dist/` output is current.

## Scripts

### `pageStitcher`

A page-capture helper with a lightweight in-page control panel.  
It captures visible page slices, stitches them into full PNG pages, and exports ZIP batches for download.

### `MosaiComAnti`

A compact in-page helper focused on range-based processing.  
It performs stream-oriented page reconstruction and supports streaming mosaic packaging for selected segments.

### `HontoClipStudioEpubDownloader`

An analyzer and OPF package downloader for honto's Clip Studio Reader pages.  
It reports auth stages, endpoint shapes, observed resource types, and OPF package statistics, and can export manifest resources as an EPUB archive.

### `harborMateAria2`

A FancyIndex companion tool for file operations in listing pages.  
It adds row-level actions to copy direct links (with optional Basic Auth injection) and push files/directories to aria2 via JSON-RPC.

### `disk115Aria2`

A port of the 115Exporter browser extension (github.com/acgotaku/115, GPLv3) to a userscript for 115.com.  
It turns the checked rows of the file list into aria2 RPC tasks, and can export Aria2/IDM/direct-link text.  
Userscripts cannot read httpOnly cookies the way `chrome.cookies` can, so a missing cookie has to be pasted into the 额外 Cookie setting.

## Metadata YAML format

Use plain keys without `@`. Example:

```yaml
name: Example Script
namespace: https://example.com
version: 1.0.0
description: Example userscript
match:
  - "*://*/*"
grant:
  - none
run-at: document-end
```

Arrays (such as `match` and `grant`) are expanded into repeated header lines.

## Clean output

```bash
pnpm clean
```

Use `pnpm clean && pnpm build` when you want to regenerate tracked userscript output from
scratch.
