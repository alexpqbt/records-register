export function $<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

export function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
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
  return `${toTitleCase(row.title ?? "")} ${toTitleCase(row.lastname)}, ${toTitleCase(row.firstname)} ${toTitleCase(row.middle ?? "")}`.trim();
}

export function showError(message: string) {
  alert(message); 
}

export function officialNameFrom(row: Record<string, any>): string {
  if (!row.o_lastname && !row.o_firstname) return "";
  return [row.o_title, row.o_firstname, row.o_lastname]
    .filter(Boolean)
    .join(" ");
}

export function schoolNameFrom(row: Record<string, any>): string {
  return row.s_name ?? "";
}