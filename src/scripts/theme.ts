import { icon } from "./icons";

let html: HTMLElement | null = null;
let themeSwitcher: HTMLButtonElement | null = null;

export function initTheme(root: HTMLElement, button: HTMLButtonElement) {
    html = root;
    themeSwitcher = button;
}

export function applyTheme(theme: "light" | "dark") {
    if (!html || !themeSwitcher) throw new Error("Containers not initialized.")

    html.dataset.theme = theme;
    localStorage.setItem("theme", theme);
    themeSwitcher.innerHTML = theme === "light" ? icon("light") : icon("dark");
}

export function toggleTheme() {
    if (!html) throw new Error("Containers not initialized.")

    const next = html.dataset.theme === "light" ? "dark" : "light";
    applyTheme(next);
}