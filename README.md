# SurfMonkey Userscripts

This project builds userscripts from paired source files:

- `src/<name>.ts`: script source
- `src/<name>.yaml`: userscript metadata header

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

## Scripts

### `pageStitcher`

A page-capture helper with a lightweight in-page control panel.  
It captures visible page slices, stitches them into full PNG pages, and exports ZIP batches for download.

### `harborMateAria2`

A FancyIndex companion tool for file operations in listing pages.  
It adds row-level actions to copy direct links (with optional Basic Auth injection) and push files/directories to aria2 via JSON-RPC.

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
