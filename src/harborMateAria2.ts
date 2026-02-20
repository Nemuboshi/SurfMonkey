type Config = {
  username: string;
  password: string;
  includeAuthInUrl: boolean;
  aria2RpcUrl: string;
  aria2Secret: string;
  downloadBaseDir: string;
  mirrorCurrentPath: boolean;
  maxRecursiveFiles: number;
  rpcConcurrency: number;
};

type ListingEntry = {
  href: string;
  isDir: boolean;
};

type CollectedFile = {
  url: string;
  relDir: string;
  out: string;
};

type Aria2ErrorResponse = {
  error?: {
    message?: string;
  };
  result?: unknown;
};

declare function GM_getValue<T>(key: string, defaultValue: T): T;
declare function GM_setValue<T>(key: string, value: T): void;
declare function GM_setClipboard(data: string, type?: string): void;

(() => {
  const DEFAULTS: Config = {
    username: "",
    password: "",
    includeAuthInUrl: true,
    aria2RpcUrl: "http://127.0.0.1:6800/jsonrpc",
    aria2Secret: "",
    downloadBaseDir: "/downloads",
    mirrorCurrentPath: true,
    maxRecursiveFiles: 5000,
    rpcConcurrency: 8,
  };

  const KEYS = Object.keys(DEFAULTS) as Array<keyof Config>;

  function isLightTheme(): boolean {
    return document.body.classList.contains("theme-light");
  }

  function isTargetFancyIndexPage(): boolean {
    const listTable = document.querySelector("#list");
    const footer = document.querySelector("footer");
    const footerText = (footer?.textContent || "").replace(/\s+/g, " ").trim();

    if (!listTable) {
      return false;
    }

    return (
      footerText.includes("Theme available on") &&
      footerText.includes("Naereen") &&
      footerText.includes("MIT License")
    );
  }

  function themeColors() {
    const light = isLightTheme();
    return {
      panelBg: light ? "#ffffff" : "rgba(20,20,20,.92)",
      panelText: light ? "#111" : "#fff",
      border: light ? "#ccc" : "rgba(255,255,255,.15)",
      inputBg: light ? "#f7f7f7" : "rgba(255,255,255,.06)",
      btnBg: light ? "#f3f3f3" : "rgba(255,255,255,.08)",
      btnHover: light ? "#e6e6e6" : "rgba(255,255,255,.14)",
      btnText: light ? "#111" : "#fff",
      toastBg: light ? "#222" : "#2b2b2b",
    };
  }

  function applyButtonTheme(btn: HTMLButtonElement): void {
    const c = themeColors();
    btn.style.border = `1px solid ${c.border}`;
    btn.style.background = c.btnBg;
    btn.style.color = c.btnText;
  }

  function refreshThemeStyles(): void {
    const c = themeColors();

    const settingBtn = document.getElementById("__tm_settings_btn__");
    if (settingBtn) {
      settingBtn.style.background = c.panelBg;
      settingBtn.style.color = c.panelText;
      settingBtn.style.border = `1px solid ${c.border}`;
    }

    const panel = document.getElementById("__tm_settings_panel__");
    if (panel) {
      panel.style.background = c.panelBg;
      panel.style.color = c.panelText;
      panel.style.border = `1px solid ${c.border}`;
    }

    for (const input of document.querySelectorAll<HTMLInputElement>(".__tm_input__")) {
      input.style.border = `1px solid ${c.border}`;
      input.style.background = c.inputBg;
      input.style.color = c.panelText;
    }

    for (const hr of document.querySelectorAll<HTMLElement>(".__tm_hr__")) {
      hr.style.background = isLightTheme() ? "#e6e6e6" : "rgba(255,255,255,.12)";
    }

    for (const checkbox of document.querySelectorAll<HTMLInputElement>(".__tm_checkbox__")) {
      checkbox.style.accentColor = isLightTheme() ? "#444" : "#ddd";
    }

    for (const btn of document.querySelectorAll<HTMLButtonElement>(".__tm_btn__")) {
      applyButtonTheme(btn);
    }
  }

  function loadConfig(): Config {
    const cfg = { ...DEFAULTS };
    for (const key of KEYS) {
      cfg[key] = GM_getValue(key, DEFAULTS[key]);
    }
    return cfg;
  }

  function saveConfig(cfg: Config): void {
    for (const key of KEYS) {
      GM_setValue(key, cfg[key]);
    }
  }

  let config = loadConfig();

  function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function toast(msg: string, isError = false): void {
    const colors = themeColors();
    let box = document.getElementById("__tm_toast_box__");

    if (!box) {
      box = document.createElement("div");
      box.id = "__tm_toast_box__";
      box.style.cssText = `
        position: fixed;
        right: 16px;
        bottom: 16px;
        z-index: 999999;
        display: flex;
        flex-direction: column;
        gap: 8px;
        align-items: flex-end;
        font-family: system-ui;
      `;
      document.body.appendChild(box);
    }

    const item = document.createElement("div");
    item.textContent = msg;
    item.style.cssText = `
      max-width: 460px;
      padding: 10px 12px;
      border-radius: 10px;
      color: #fff;
      background: ${isError ? "#b00020" : colors.toastBg};
      box-shadow: 0 8px 24px rgba(0,0,0,.25);
      font-size: 13px;
      line-height: 1.3;
      opacity: 0;
      transform: translateY(6px);
      transition: opacity .18s ease, transform .18s ease;
      white-space: pre-wrap;
    `;

    box.appendChild(item);

    requestAnimationFrame(() => {
      item.style.opacity = "1";
      item.style.transform = "translateY(0)";
    });

    setTimeout(
      () => {
        item.style.opacity = "0";
        item.style.transform = "translateY(6px)";
        setTimeout(() => item.remove(), 250);
      },
      isError ? 5000 : 2400,
    );
  }

  function normalizeDir(p: string): string {
    if (!p) {
      return "";
    }
    return p.replace(/\\/g, "/").replace(/\/+/g, "/").replace(/\/$/, "");
  }

  function joinDir(a: string, b: string): string {
    const left = normalizeDir(a);
    const right = normalizeDir(b);
    if (!left) {
      return right;
    }
    if (!right) {
      return left;
    }
    return normalizeDir(`${left}/${right}`);
  }

  function getCurrentPathSubdir(): string {
    const p = location.pathname || "/";
    return p.replace(/^\/+/, "").replace(/\/+$/, "");
  }

  function isParentLink(a: HTMLAnchorElement): boolean {
    const href = a.getAttribute("href") || "";
    return href === "../" || (a.textContent || "").includes("Parent directory");
  }

  function withBasicAuth(urlStr: string): string {
    if (!config.includeAuthInUrl) {
      return urlStr;
    }
    if (!config.username || !config.password) {
      return urlStr;
    }

    const u = new URL(urlStr, location.href);
    u.username = config.username;
    u.password = config.password;
    return u.toString();
  }

  async function copyToClipboard(text: string): Promise<boolean> {
    try {
      GM_setClipboard(text, "text");
      return true;
    } catch {
      // fallback
    }

    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fallback
    }

    return false;
  }

  async function aria2Call(method: string, params: unknown[]): Promise<unknown> {
    const body = {
      jsonrpc: "2.0",
      id: String(Date.now()),
      method,
      params,
    };

    const resp = await fetch(config.aria2RpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      throw new Error("aria2 RPC request failed");
    }

    const json = (await resp.json()) as Aria2ErrorResponse;
    if (json.error) {
      throw new Error(json.error.message || "aria2 RPC error");
    }
    return json.result;
  }

  async function aria2AddUri(url: string, dir: string, out: string): Promise<unknown> {
    const token = config.aria2Secret ? `token:${config.aria2Secret}` : null;
    const options: Record<string, string> = {};

    if (dir) {
      options.dir = dir;
    }
    if (out) {
      options.out = out;
    }

    const params: unknown[] = [];
    if (token) {
      params.push(token);
    }
    params.push([url]);
    params.push(options);

    return aria2Call("aria2.addUri", params);
  }

  function extractEntries(doc: Document): ListingEntry[] {
    const table = doc.querySelector("#list");
    if (!table) {
      return [];
    }

    return Array.from(table.querySelectorAll("tbody tr"))
      .map((tr) => tr.querySelector("td.link a"))
      .filter((a): a is HTMLAnchorElement => Boolean(a) && !isParentLink(a))
      .map((a) => {
        const href = a.getAttribute("href") || "";
        return { href, isDir: href.endsWith("/") };
      });
  }

  async function fetchDocument(url: string): Promise<Document> {
    const resp = await fetch(url);
    if (!resp.ok) {
      throw new Error("Directory fetch failed");
    }

    const html = await resp.text();
    return new DOMParser().parseFromString(html, "text/html");
  }

  function resolveUrl(base: string, href: string): string {
    return new URL(href, base).toString();
  }

  function safeName(href: string): string {
    return decodeURIComponent(href.split("/").filter(Boolean).pop() || "");
  }

  async function collectFilesRecursively(
    dirUrl: string,
    relPrefix: string,
  ): Promise<CollectedFile[]> {
    const doc = await fetchDocument(dirUrl);
    const entries = extractEntries(doc);

    let files: CollectedFile[] = [];

    for (const entry of entries) {
      const childUrl = resolveUrl(dirUrl, entry.href);

      if (entry.isDir) {
        const childName = safeName(entry.href);
        files = files.concat(
          await collectFilesRecursively(childUrl, joinDir(relPrefix, childName)),
        );
      } else {
        files.push({
          url: childUrl,
          relDir: relPrefix,
          out: safeName(entry.href),
        });
      }

      if (files.length > config.maxRecursiveFiles) {
        throw new Error("Too many files in recursion; aborted");
      }
    }

    return files;
  }

  async function pushFileToAria2(fileUrl: string, relDir: string, outName: string): Promise<void> {
    const authed = withBasicAuth(fileUrl);
    let finalDir = normalizeDir(config.downloadBaseDir);

    if (config.mirrorCurrentPath) {
      finalDir = joinDir(finalDir, getCurrentPathSubdir());
    }
    if (relDir) {
      finalDir = joinDir(finalDir, relDir);
    }

    await aria2AddUri(authed, finalDir, outName);
  }

  function makeBtn(text: string): HTMLButtonElement {
    const b = document.createElement("button");
    b.classList.add("__tm_btn__");
    b.type = "button";
    b.textContent = text;
    b.style.cssText = `
      cursor:pointer;
      padding:5px 10px;
      border-radius:8px;
      font-size:12px;
      margin-right:6px;
    `;
    applyButtonTheme(b);

    b.onmouseenter = () => {
      b.style.background = themeColors().btnHover;
    };
    b.onmouseleave = () => {
      b.style.background = themeColors().btnBg;
    };
    return b;
  }

  function ensureActionColumn(): void {
    const table = document.querySelector("#list");
    if (!table) {
      return;
    }

    const headRow = table.querySelector("thead tr");
    if (headRow && !headRow.querySelector("th.__tm_actions__")) {
      const th = document.createElement("th");
      th.className = "__tm_actions__";
      th.textContent = "Actions";
      th.style.width = "180px";
      th.style.textAlign = "left";
      th.style.paddingLeft = "8px";
      headRow.appendChild(th);
    }

    for (const tr of table.querySelectorAll("tbody tr")) {
      if (tr.querySelector("td.__tm_actions__")) {
        continue;
      }

      const anchor = tr.querySelector("td.link a");
      const td = document.createElement("td");
      td.className = "__tm_actions__";
      td.style.whiteSpace = "nowrap";

      if (!anchor || !(anchor instanceof HTMLAnchorElement) || isParentLink(anchor)) {
        tr.appendChild(td);
        continue;
      }

      const href = anchor.getAttribute("href") || "";
      const absUrl = new URL(href, location.href).toString();
      const isDir = href.endsWith("/");

      const btnCopy = makeBtn("Copy Link");
      btnCopy.onclick = async () => {
        const ok = await copyToClipboard(withBasicAuth(absUrl));
        toast(ok ? "Link copied" : "Copy failed", !ok);
      };

      const btnPush = makeBtn("Push aria2");
      btnPush.onclick = async () => {
        try {
          btnPush.disabled = true;
          btnPush.textContent = "Working...";

          if (!isDir) {
            await pushFileToAria2(absUrl, "", safeName(href));
            toast("File pushed to aria2");
          } else {
            toast("Recursing directory... keep this tab open");
            const files = await collectFilesRecursively(absUrl, safeName(href));
            let pushed = 0;

            for (const file of files) {
              await pushFileToAria2(file.url, file.relDir, file.out);
              pushed += 1;
              if (pushed % 50 === 0) {
                await sleep(0);
              }
            }

            toast(`Directory push complete: ${pushed} files`);
          }
        } catch (error) {
          toast(String(error instanceof Error ? error.message : error), true);
        } finally {
          btnPush.disabled = false;
          btnPush.textContent = "Push aria2";
        }
      };

      td.append(btnCopy, btnPush);
      tr.appendChild(td);
    }
  }

  function injectSettingsPanel(): void {
    if (document.getElementById("__tm_settings_btn__")) {
      return;
    }

    const c = themeColors();

    const btn = document.createElement("div");
    btn.id = "__tm_settings_btn__";
    btn.textContent = "\u2699";
    btn.title = "Script Settings";
    btn.style.cssText = `
      position:fixed;
      right:16px;
      top:16px;
      width:36px;
      height:36px;
      border-radius:10px;
      display:grid;
      place-items:center;
      cursor:pointer;
      z-index:999999;
      background:${c.panelBg};
      color:${c.panelText};
      border:1px solid ${c.border};
      box-shadow:0 8px 20px rgba(0,0,0,.25);
      user-select:none;
      font-size:18px;
    `;
    document.body.appendChild(btn);

    const panel = document.createElement("div");
    panel.id = "__tm_settings_panel__";
    panel.style.cssText = `
      position:fixed;
      right:16px;
      top:60px;
      width:420px;
      padding:12px 12px 10px;
      border-radius:14px;
      background:${c.panelBg};
      color:${c.panelText};
      border:1px solid ${c.border};
      display:none;
      z-index:999999;
      box-shadow:0 12px 28px rgba(0,0,0,.25);
      font-family:system-ui;
    `;

    const title = document.createElement("div");
    title.textContent = "Script Settings";
    title.style.cssText = "font-weight:700; font-size:13px; margin-bottom:10px;";
    panel.appendChild(title);

    const grid = document.createElement("div");
    grid.style.cssText = `
      display:grid;
      grid-template-columns: 140px 1fr;
      gap: 10px 10px;
      align-items:center;
      font-size:12px;
    `;

    const authForm = document.createElement("form");
    authForm.className = "__tm_auth_form__";
    authForm.autocomplete = "on";
    authForm.addEventListener("submit", (event) => event.preventDefault());

    function makeTextInput<K extends keyof Config>(key: K, placeholder = ""): HTMLInputElement {
      const inp = document.createElement("input");
      inp.classList.add("__tm_input__");
      inp.type = "text";
      inp.value = String(config[key] ?? "");
      inp.placeholder = placeholder;
      inp.style.cssText = `
        width: 100%;
        box-sizing: border-box;
        padding: 6px 8px;
        border-radius: 10px;
        border: 1px solid ${c.border};
        background: ${c.inputBg};
        color: ${c.panelText};
        font-size: 12px;
        outline: none;
      `;
      inp.addEventListener("input", () => {
        config = { ...config, [key]: inp.value as Config[K] };
      });
      return inp;
    }

    function makePasswordInput<K extends keyof Config>(key: K): HTMLInputElement {
      const inp = document.createElement("input");
      inp.classList.add("__tm_input__");
      inp.type = "password";
      inp.value = String(config[key] ?? "");
      inp.style.cssText = `
        width: 100%;
        box-sizing: border-box;
        padding: 6px 8px;
        border-radius: 10px;
        border: 1px solid ${c.border};
        background: ${c.inputBg};
        color: ${c.panelText};
        font-size: 12px;
        outline: none;
      `;
      inp.addEventListener("input", () => {
        config = { ...config, [key]: inp.value as Config[K] };
      });
      return inp;
    }

    function makeNumberInput<K extends keyof Config>(key: K): HTMLInputElement {
      const inp = document.createElement("input");
      inp.classList.add("__tm_input__");
      inp.type = "number";
      inp.value = String(config[key] ?? "");
      inp.style.cssText = `
        width: 100%;
        box-sizing: border-box;
        padding: 6px 8px;
        border-radius: 10px;
        border: 1px solid ${c.border};
        background: ${c.inputBg};
        color: ${c.panelText};
        font-size: 12px;
        outline: none;
      `;
      inp.addEventListener("input", () => {
        config = { ...config, [key]: Number(inp.value) as Config[K] };
      });
      return inp;
    }

    function makeCheckbox<K extends keyof Config>(key: K): HTMLLabelElement {
      const wrap = document.createElement("label");
      wrap.style.cssText = `
        display:flex;
        align-items:center;
        gap:8px;
        user-select:none;
        width: fit-content;
      `;

      const inp = document.createElement("input");
      inp.classList.add("__tm_checkbox__");
      inp.type = "checkbox";
      inp.checked = Boolean(config[key]);
      inp.style.cssText = `
        width:16px;
        height:16px;
        margin:0;
        padding:0;
        flex:0 0 auto;
        accent-color: ${isLightTheme() ? "#444" : "#ddd"};
      `;

      const text = document.createElement("span");
      text.textContent = "Enabled";
      text.style.opacity = "0.85";

      inp.addEventListener("change", () => {
        config = { ...config, [key]: inp.checked as Config[K] };
      });

      wrap.append(inp, text);
      return wrap;
    }

    function addRow(labelText: string, controlEl: HTMLElement): void {
      const lab = document.createElement("div");
      lab.textContent = labelText;
      lab.style.cssText = `
        opacity: 0.9;
        line-height: 1.2;
      `;
      grid.append(lab, controlEl);
    }

    const authUserInput = makeTextInput("username");
    authUserInput.classList.add("__tm_auth_input__", "__tm_auth_username_input__");
    authUserInput.name = "username";
    authUserInput.id = "__tm_auth_username__";
    authUserInput.autocomplete = "username";
    authUserInput.setAttribute("autocapitalize", "none");
    authUserInput.setAttribute("spellcheck", "false");

    const authUserWrap = document.createElement("div");
    authUserWrap.className = "__tm_auth_field__ __tm_auth_username_field__";
    authUserWrap.appendChild(authUserInput);
    addRow("Basic Auth Username", authUserWrap);

    const authPassInput = makePasswordInput("password");
    authPassInput.classList.add("__tm_auth_input__", "__tm_auth_password_input__");
    authPassInput.name = "current-password";
    authPassInput.id = "__tm_auth_password__";
    authPassInput.autocomplete = "current-password";

    const authPassWrap = document.createElement("div");
    authPassWrap.className = "__tm_auth_field__ __tm_auth_password_field__";
    authPassWrap.appendChild(authPassInput);
    addRow("Basic Auth Password", authPassWrap);
    addRow("Include Auth in URL", makeCheckbox("includeAuthInUrl"));

    const hr1 = document.createElement("div");
    hr1.classList.add("__tm_hr__");
    hr1.style.cssText = `
      grid-column: 1 / -1;
      height:1px;
      background:${isLightTheme() ? "#e6e6e6" : "rgba(255,255,255,.12)"};
      margin: 4px 0;
    `;
    grid.appendChild(hr1);

    addRow("aria2 RPC URL", makeTextInput("aria2RpcUrl", "http://127.0.0.1:6800/jsonrpc"));
    addRow("aria2 Secret", makeTextInput("aria2Secret"));
    addRow("Download Base Dir", makeTextInput("downloadBaseDir", "/downloads"));
    addRow("Mirror Current Path", makeCheckbox("mirrorCurrentPath"));
    addRow("Recursive File Limit", makeNumberInput("maxRecursiveFiles"));
    addRow("RPC Concurrency", makeNumberInput("rpcConcurrency"));

    authForm.appendChild(grid);
    panel.appendChild(authForm);

    const actions = document.createElement("div");
    actions.style.cssText = `
      display:flex;
      justify-content:flex-end;
      gap:8px;
      margin-top:12px;
    `;

    const bClose = makeBtn("Close");
    bClose.style.marginRight = "0";
    bClose.onclick = () => {
      panel.style.display = "none";
    };

    const bSave = makeBtn("Save");
    bSave.style.marginRight = "0";
    bSave.onclick = () => {
      saveConfig(config);
      toast("Settings saved");
      ensureActionColumn();
    };

    actions.append(bClose, bSave);
    panel.appendChild(actions);

    const tip = document.createElement("div");
    tip.textContent = "Warning: including username/password in URL may leak credentials.";
    tip.style.cssText = "margin-top:8px; font-size:11px; opacity:.72; line-height:1.35;";
    panel.appendChild(tip);

    document.body.appendChild(panel);

    btn.onclick = () => {
      panel.style.display = panel.style.display === "none" ? "block" : "none";
    };

    refreshThemeStyles();
  }

  function init(): void {
    if (!isTargetFancyIndexPage()) {
      return;
    }

    injectSettingsPanel();
    ensureActionColumn();
    refreshThemeStyles();

    const table = document.querySelector("#list");
    if (!table) {
      return;
    }

    const mo = new MutationObserver(() => ensureActionColumn());
    mo.observe(table, { childList: true, subtree: true });

    const bodyMo = new MutationObserver(() => refreshThemeStyles());
    bodyMo.observe(document.body, { attributes: true, attributeFilter: ["class"] });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
