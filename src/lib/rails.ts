/**
 * The vocabulary for home-page rails — shared between the server (resolving
 * which posts fill each rail) and the client (the admin editor UI).
 *
 * Rails are configured by the author in /admin/settings and stored as JSON
 * in `site_settings.rails_json`. That column can hold anything (a hand-
 * edited row, a stale shape from a future version rolled back) so nothing
 * here ever throws — a malformed or empty value simply falls back to
 * DEFAULT_RAILS. A malformed settings row must never take down the home
 * page.
 */

export type RailKind = "recent" | "viewed" | "discussed" | "tag";

export type RailConfig = {
  kind: RailKind;
  /** Only meaningful for kind: "tag" — the tag slug to pull posts from. */
  tag?: string;
  /** Overrides the built-in heading when set. */
  label?: string;
};

export const RAIL_KIND_LABELS: Record<RailKind, string> = {
  recent: "最近の記事",
  viewed: "よく読まれている",
  discussed: "よく話された",
  tag: "タグ別",
};

const MAX_RAILS = 8;

export const DEFAULT_RAILS: RailConfig[] = [
  { kind: "recent" },
  { kind: "discussed" },
];

function isRailKind(v: unknown): v is RailKind {
  return v === "recent" || v === "viewed" || v === "discussed" || v === "tag";
}

function sanitizeOne(v: unknown): RailConfig | null {
  if (typeof v !== "object" || v === null) return null;
  const obj = v as Record<string, unknown>;
  if (!isRailKind(obj.kind)) return null;
  if (obj.kind === "tag" && typeof obj.tag !== "string") return null;

  const rail: RailConfig = { kind: obj.kind };
  if (obj.kind === "tag") rail.tag = (obj.tag as string).slice(0, 100);
  if (typeof obj.label === "string" && obj.label.trim()) rail.label = obj.label.slice(0, 40);
  return rail;
}

/** Never throws. Falls back to DEFAULT_RAILS for anything malformed or empty. */
export function parseRails(json: string): RailConfig[] {
  if (!json.trim()) return DEFAULT_RAILS;
  try {
    const parsed: unknown = JSON.parse(json);
    if (!Array.isArray(parsed)) return DEFAULT_RAILS;
    const rails = parsed.map(sanitizeOne).filter((r): r is RailConfig => r !== null);
    return rails.length > 0 ? rails.slice(0, MAX_RAILS) : DEFAULT_RAILS;
  } catch {
    return DEFAULT_RAILS;
  }
}

export function serializeRails(rails: RailConfig[]): string {
  return JSON.stringify(rails.slice(0, MAX_RAILS));
}

/** The heading to render for a rail — its own label, or the kind's default. */
export function railTitle(rail: RailConfig): string {
  if (rail.label) return rail.label;
  if (rail.kind === "tag" && rail.tag) return rail.tag;
  return RAIL_KIND_LABELS[rail.kind];
}
