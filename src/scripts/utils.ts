export function $<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

export function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "2-digit",
  });
}

export function toTitleCase(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatFullName(row: Record<string, any>): string {
  return `${toTitleCase(row.lastname)}, ${toTitleCase(row.firstname)} ${toTitleCase(row.middle ?? "")}`.trim();
}

export function showError(message: string) {
  alert(message); 
}