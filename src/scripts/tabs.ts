export const tabSwitcher = (tablist: HTMLElement) => {
  const tabs = Array.from(
    tablist.querySelectorAll<HTMLButtonElement>('[role="tab"]')
  );

  function activate(tab: HTMLButtonElement): void {
    tabs.forEach((t) => {
      const selected = t === tab;
      t.setAttribute('aria-selected', String(selected));
      t.tabIndex = selected ? 0 : -1;

      const panelId = t.getAttribute('aria-controls');
      if (!panelId) return;

      const panel = document.getElementById(panelId);
      if (panel) panel.hidden = !selected;
    });
    tab.focus();
  }

  // Click
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => activate(tab));
  });

  // Keyboard navigation (WAI-ARIA pattern)
  tablist.addEventListener('keydown', (e: KeyboardEvent) => {
    const active = document.activeElement;
    if (!(active instanceof HTMLButtonElement)) return;

    const current = tabs.indexOf(active);
    if (current === -1) return;

    let next: HTMLButtonElement | null = null;
    switch (e.key) {
      case 'ArrowRight':
        next = tabs[(current + 1) % tabs.length];
        break;
      case 'ArrowLeft':
        next = tabs[(current - 1 + tabs.length) % tabs.length];
        break;
      case 'Home':
        next = tabs[0];
        break;
      case 'End':
        next = tabs[tabs.length - 1];
        break;
      default:
        return;
    }
    e.preventDefault();
    activate(next);
  });
}