/**
 * `YYYY.MM.DD` — the date format used across public post listings and
 * article pages. Kept in a plain module (no "use client") so it's callable
 * from both server components (like the article page) and client
 * components (like PostList) — a "use client" file only exports things the
 * *client* can call, and a server component invoking one of those directly
 * throws.
 */
export function formatDate(ms: number | null): string {
  if (ms == null) return "";
  const d = new Date(ms);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}
