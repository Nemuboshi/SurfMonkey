// Blocks PopCash tabunder hijack: removes the full-screen catchall click
// overlay and blocks cross-origin location.replace (which swaps this tab
// for an ad while the real page is opened in a new tab).

export function isCatchAllDiv(el: Element): boolean {
  const style = (el as HTMLElement).style;
  if (!style) return false;
  return (
    style.position === "fixed" &&
    style.width === "100%" &&
    style.height === "100%" &&
    Number(style.zIndex) >= 100000 &&
    el.children.length === 0
  );
}

export function removeCatchAllDivs(root: ParentNode): number {
  let removed = 0;
  for (const el of root.querySelectorAll("div")) {
    if (isCatchAllDiv(el)) {
      el.remove();
      removed += 1;
    }
  }
  return removed;
}

// The hijack always replaces this tab with an off-site ad URL; same-origin
// replace is left alone.
export function shouldBlockReplace(url: string, origin: string): boolean {
  try {
    return new URL(url, origin).origin !== origin;
  } catch {
    return false;
  }
}

export function guard(win: Window): void {
  const loc = win.location;
  const originalReplace = loc.replace.bind(loc);
  Object.defineProperty(loc, "replace", {
    value: (url: string) => {
      if (shouldBlockReplace(url, loc.origin)) return;
      originalReplace(url);
    },
    configurable: true,
  });

  const sweep = () => removeCatchAllDivs(win.document);
  new MutationObserver(sweep).observe(win.document.documentElement, {
    childList: true,
    subtree: true,
  });
  sweep();
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  guard(window);
}
