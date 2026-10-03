const FIELDS = {
  "#age-gate-d": "01",
  "#age-gate-m": "01",
  "#age-gate-y": "1990",
} as const;

export function passAgeGate(root: ParentNode = document): boolean {
  const form = root.querySelector<HTMLFormElement>("form.age-gate-form");
  if (!form) return false;

  for (const [selector, value] of Object.entries(FIELDS)) {
    const input = form.querySelector<HTMLInputElement>(selector);
    if (!input) return false;
    input.value = value;
  }

  form.requestSubmit();
  return true;
}

if (typeof document !== "undefined") passAgeGate();
