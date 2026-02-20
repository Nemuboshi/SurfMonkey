import { type Zippable, zipSync } from "fflate";
import { saveAs } from "file-saver";

type SReaderContentItem = {
  SubTitle: string;
};

type SReaderFunc = {
  moveTo: (pageIndex: number, animate: boolean) => void;
  contentInfo: {
    items: SReaderContentItem[];
  };
  currentPageInfo: {
    endPageNumber: number;
  };
};

declare global {
  interface Window {
    __sreaderFunc__?: SReaderFunc;
  }
}

(() => {
  const BATCH_SIZE = 50;
  const TIMEOUT = 30000;
  const OUT_MIME = "image/png";
  const OUT_EXT = "png";

  const sleepFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

  function log(...args: unknown[]): void {
    console.log("[PageStitcher]", ...args);
  }

  function err(...args: unknown[]): void {
    console.error("[PageStitcher]", ...args);
  }

  async function waitVisible(): Promise<void> {
    while (document.hidden) {
      await new Promise<void>((resolve) =>
        document.addEventListener("visibilitychange", () => resolve(), { once: true }),
      );
    }
  }

  async function waitForImgs(content: HTMLElement, label: string): Promise<HTMLImageElement[]> {
    return await new Promise<HTMLImageElement[]>((resolve, reject) => {
      const t0 = Date.now();
      const timer = window.setInterval(() => {
        const imgs = content.querySelectorAll("img");
        if (imgs.length > 0) {
          clearInterval(timer);
          resolve(
            Array.from(imgs).filter(
              (img): img is HTMLImageElement => img instanceof HTMLImageElement,
            ),
          );
        } else if (Date.now() - t0 > TIMEOUT) {
          clearInterval(timer);
          reject(new Error(`Timeout waiting imgs: ${label}`));
        }
      }, 100);
    });
  }

  async function waitForImgReady(img: HTMLImageElement, label: string): Promise<void> {
    return await new Promise<void>((resolve, reject) => {
      const t0 = Date.now();
      const timer = window.setInterval(() => {
        if (img.naturalWidth > 0) {
          clearInterval(timer);
          resolve();
        } else if (Date.now() - t0 > TIMEOUT) {
          clearInterval(timer);
          reject(new Error(`Timeout img ready: ${label}`));
        }
      }, 100);
    });
  }

  async function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("canvas.toBlob failed"));
          return;
        }
        resolve(blob);
      }, OUT_MIME);
    });
  }

  async function capturePageBlob(page: number): Promise<Blob> {
    await waitVisible();

    const sreader = window.__sreaderFunc__;
    if (!sreader) {
      throw new Error("__sreaderFunc__ not found");
    }

    sreader.moveTo(page - 1, false);

    const content = document.getElementById(`content-p${page}`);
    if (!content) {
      throw new Error(`no content ${page}`);
    }

    const imgs = await waitForImgs(content, `page ${page}`);

    const blocks: Array<{ img: HTMLImageElement; top: number }> = [];
    let pageWidth = 0;
    let pageHeight = 0;

    for (const img of imgs) {
      await waitVisible();
      await waitForImgReady(img, `page ${page}`);

      const insetStr = img.parentElement?.style?.inset;
      if (!insetStr) {
        continue;
      }

      const insetParts = insetStr.split("%").map((segment) => parseFloat(segment) / 100);
      const top = insetParts[0] ?? 0;
      const bottom = insetParts[2] ?? 0;

      if (Number.isNaN(top) || Number.isNaN(bottom) || 1 - top - bottom <= 0) {
        continue;
      }

      pageWidth = img.naturalWidth;
      const fullHeight = img.naturalHeight / (1 - top - bottom);
      pageHeight = Math.max(pageHeight, fullHeight);

      blocks.push({ img, top });
    }

    if (blocks.length === 0) {
      throw new Error(`no blocks page ${page}`);
    }

    const canvas = document.createElement("canvas");
    canvas.width = pageWidth;
    canvas.height = Math.round(pageHeight);

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) {
      throw new Error("2d context unavailable");
    }

    for (const { img, top } of blocks) {
      ctx.drawImage(img, 0, canvas.height * top);
    }

    return await canvasToBlob(canvas);
  }

  type BatchItem = {
    page: number;
    blob: Blob;
  };

  async function zipWithWorker(
    title: string,
    batch: BatchItem[],
    part: number,
    startPage: number,
  ): Promise<void> {
    const fileName =
      `${title}_${String(startPage).padStart(4, "0")}` +
      `-${String(batch[batch.length - 1].page).padStart(4, "0")}` +
      `_part${String(part).padStart(3, "0")}.zip`;
    const files: Array<{ name: string; buffer: ArrayBuffer }> = [];
    for (const item of batch) {
      const name = `${String(item.page).padStart(4, "0")}.${OUT_EXT}`;
      const buffer = await item.blob.arrayBuffer();
      files.push({ name, buffer });
    }

    return await new Promise<void>((resolve, reject) => {
      const workerCode = `
        self.importScripts("https://cdn.jsdelivr.net/npm/fflate@0.8.2/umd/index.js");

        self.onmessage = function(e) {
          const { files } = e.data;
          const out = {};

          for (const f of files) {
            out[f.name] = new Uint8Array(f.buffer);
          }

          const zipped = fflate.zipSync(out, { level: 0 });
          self.postMessage(zipped.buffer, [zipped.buffer]);
        };
      `;

      const workerBlob = new Blob([workerCode], { type: "application/javascript" });
      const worker = new Worker(URL.createObjectURL(workerBlob));

      try {
        worker.onmessage = (event: MessageEvent<ArrayBuffer>) => {
          const zipBlob = new Blob([event.data], { type: "application/zip" });
          saveAs(zipBlob, fileName);
          worker.terminate();
          resolve();
        };

        worker.onerror = (event) => {
          worker.terminate();
          reject(event.error ?? new Error("worker zip failed"));
        };

        worker.postMessage({ files });
      } catch (error) {
        worker.terminate();
        reject(error);
      }
    });
  }

  async function zipAndSaveFallback(
    title: string,
    batch: BatchItem[],
    part: number,
    startPage: number,
  ): Promise<void> {
    const fileName =
      `${title}_${String(startPage).padStart(4, "0")}` +
      `-${String(batch[batch.length - 1].page).padStart(4, "0")}` +
      `_part${String(part).padStart(3, "0")}.zip`;

    const files: Zippable = {};

    for (const item of batch) {
      const name = `${String(item.page).padStart(4, "0")}.${OUT_EXT}`;
      const buffer = await item.blob.arrayBuffer();
      files[name] = new Uint8Array(buffer);
    }

    const zipped = zipSync(files, { level: 0 });
    const zipBlob = new Blob([zipped], { type: "application/zip" });
    saveAs(zipBlob, fileName);
  }

  type UIState = {
    btn: HTMLButtonElement;
    status: HTMLSpanElement;
    inputFrom: HTMLInputElement;
    inputTo: HTMLInputElement;
  };

  async function start(ui: UIState): Promise<void> {
    const { btn, status, inputFrom, inputTo } = ui;

    const sreader = window.__sreaderFunc__;
    if (!sreader) {
      err("__sreaderFunc__ missing");
      return;
    }

    const title = sreader.contentInfo.items[0]?.SubTitle ?? "PageStitcher";
    const endAll = sreader.currentPageInfo.endPageNumber;

    let from = Number.parseInt(inputFrom.value || "1", 10);
    let to = Number.parseInt(inputTo.value || String(endAll), 10);

    if (!Number.isFinite(from) || from < 1) {
      from = 1;
    }
    if (!Number.isFinite(to) || to < 1) {
      to = endAll;
    }
    if (from > to) {
      [from, to] = [to, from];
    }
    const totalSelected = to - from + 1;

    btn.disabled = true;
    inputFrom.disabled = true;
    inputTo.disabled = true;

    try {
      let batch: BatchItem[] = [];
      let part = 1;
      let firstPageInPart = from;

      for (let page = from; page <= to; page += 1) {
        const capturedInRange = page - from + 1;
        status.textContent = `Capturing ${capturedInRange}/${totalSelected} | Batch ${part}`;

        try {
          const blob = await capturePageBlob(page);
          batch.push({ page, blob });
        } catch (error) {
          err("capture failed", page, error);
        }

        await sleepFrame();

        if (batch.length >= BATCH_SIZE) {
          status.textContent = `Zipping batch ${part}...`;
          try {
            await zipWithWorker(title, batch, part, firstPageInPart);
          } catch (error) {
            err("worker zip failed, fallback to main thread", error);
            await zipAndSaveFallback(title, batch, part, firstPageInPart);
          }
          part += 1;
          batch = [];
          firstPageInPart = page + 1;
        }
      }

      if (batch.length > 0) {
        status.textContent = `Zipping batch ${part}...`;
        try {
          await zipWithWorker(title, batch, part, firstPageInPart);
        } catch (error) {
          err("worker zip failed, fallback to main thread", error);
          await zipAndSaveFallback(title, batch, part, firstPageInPart);
        }
      }

      status.textContent = "Done";
    } finally {
      btn.disabled = false;
      inputFrom.disabled = false;
      inputTo.disabled = false;
    }
  }

  function createUI(endAll: number): HTMLDivElement {
    const wrap = document.createElement("div");
    wrap.id = "__ps_panel";
    wrap.style.cssText = `
      position: fixed;
      top: 8px;
      right: 8px;
      z-index: 2147483647;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 6px;
      background: rgba(0,0,0,0.55);
      border-radius: 6px;
      color: #fff;
      font-size: 12px;
      pointer-events: auto;
      user-select: none;
      touch-action: manipulation;
      backdrop-filter: blur(4px);
    `;

    const label = document.createElement("span");
    label.textContent = "range";
    label.style.opacity = "0.9";

    const inputFrom = document.createElement("input");
    inputFrom.type = "number";
    inputFrom.min = "1";
    inputFrom.value = "1";
    inputFrom.style.cssText = `
      width: 64px;
      padding: 2px 4px;
      border-radius: 4px;
      border: 1px solid rgba(255,255,255,0.25);
      background: rgba(255,255,255,0.12);
      color: #fff;
      outline: none;
    `;

    const tilde = document.createElement("span");
    tilde.textContent = "~";
    tilde.style.opacity = "0.9";

    const inputTo = document.createElement("input");
    inputTo.type = "number";
    inputTo.min = "1";
    inputTo.value = String(endAll);
    inputTo.style.cssText = inputFrom.style.cssText;

    const btn = document.createElement("button");
    btn.textContent = "download";
    btn.style.cssText = `
      padding: 2px 8px;
      border-radius: 4px;
      border: 1px solid rgba(255,255,255,0.25);
      background: rgba(255,255,255,0.12);
      color: #fff;
      cursor: pointer;
      transition: background 0.15s ease, transform 0.05s ease;
    `;

    btn.onmouseenter = () => {
      btn.style.background = "rgba(255,255,255,0.22)";
    };
    btn.onmouseleave = () => {
      btn.style.background = "rgba(255,255,255,0.12)";
    };
    btn.onmousedown = () => {
      btn.style.transform = "scale(0.97)";
    };
    btn.onmouseup = () => {
      btn.style.transform = "scale(1)";
    };

    const status = document.createElement("span");
    status.textContent = "Ready (PNG + worker)";
    status.style.cssText = `
      margin-left: 4px;
      opacity: 0.95;
      user-select: text;
    `;

    btn.onclick = () => {
      void start({ btn, status, inputFrom, inputTo });
    };

    wrap.append(label, inputFrom, tilde, inputTo, btn, status);
    return wrap;
  }

  function init(): void {
    const timer = window.setInterval(() => {
      const sreader = window.__sreaderFunc__;
      if (!sreader) {
        return;
      }
      if (document.getElementById("__ps_panel")) {
        return;
      }

      const endAll = sreader.currentPageInfo?.endPageNumber;
      if (!endAll) {
        return;
      }

      clearInterval(timer);

      const ui = createUI(endAll);
      document.body.appendChild(ui);

      log("ready", endAll);
    }, 500);
  }

  init();
})();
