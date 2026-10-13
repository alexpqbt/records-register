const STORAGE_KEY = "pinnedFields";

type PinnedMap = Record<string, string>;

function readStore(): PinnedMap {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as PinnedMap;
  } catch {
    return {};
  }
}

function writeStore(map: PinnedMap) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

function keyFor(form: HTMLFormElement, field: string): string {
  return `${form.id || "form"}:${field}`;
}

function fieldEl(
  form: HTMLFormElement,
  name: string,
): HTMLInputElement | HTMLSelectElement | null {
  return form.elements.namedItem(name) as
    | HTMLInputElement
    | HTMLSelectElement
    | null;
}

function setPressed(btn: HTMLButtonElement, on: boolean) {
  btn.setAttribute("aria-pressed", String(on));
}

/**
 * Wire up every [data-pin] button inside `form`.
 * Call once, after the form's selects have been populated.
 */
export function initPins(form: HTMLFormElement) {
  const store = readStore();

  form.querySelectorAll<HTMLButtonElement>("[data-pin]").forEach((btn) => {
    const field = btn.dataset.pin;
    const el = field ? fieldEl(form, field) : null;
    if (!field || !el) return;

    const key = keyFor(form, field);

    // Apply persisted state on load
    if (key in store) {
      setPressed(btn, true);
      el.value = store[key];
    } else {
      setPressed(btn, false);
    }

    // Toggle pin on click
    btn.addEventListener("click", () => {
      const current = readStore();
      if (key in current) {
        delete current[key];
        setPressed(btn, false);
      } else {
        current[key] = el.value;
        setPressed(btn, true);
      }
      writeStore(current);
    });

    // Keep the stored value in sync while pinned
    el.addEventListener("change", () => {
      const current = readStore();
      if (key in current) {
        current[key] = el.value;
        writeStore(current);
      }
    });
  });
}

/**
 * Re-apply pinned values after a form.reset().
 */
export function restorePinned(form: HTMLFormElement) {
  const store = readStore();

  form.querySelectorAll<HTMLButtonElement>("[data-pin]").forEach((btn) => {
    const field = btn.dataset.pin;
    if (!field) return;

    const key = keyFor(form, field);
    if (!(key in store)) return;

    const el = fieldEl(form, field);
    if (el) el.value = store[key];
  });
}