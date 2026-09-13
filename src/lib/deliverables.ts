import type { Ticket, TicketDeliverable } from "@/lib/db/schema";
import { SIGNAL_LABEL, type SignalLevel } from "@/lib/tickets";

/**
 * Platform deliverables — labels, ordering, small parsers, no DB dependency,
 * same shape as src/lib/tickets.ts so client components can import this
 * directly.
 *
 * Same rule as the ticket library: nothing here escalates. "今回はやらない"
 * is as ordinary an outcome as "公開済み" — neither is a failure state.
 */

export type Platform = TicketDeliverable["platform"];
export type DeliverableStatus = TicketDeliverable["status"];
export type ContentRole = TicketDeliverable["role"];
export type CrossPlatformPotential = Ticket["crossPlatformPotential"];

export const PLATFORMS: Platform[] = ["instagram", "note", "blog"];

export const PLATFORM_LABEL: Record<Platform, string> = {
  instagram: "Instagram",
  note: "note",
  blog: "ブログ",
};

/** Used where space is tight — mobile card rows, board summaries. */
export const PLATFORM_SHORT_LABEL: Record<Platform, string> = {
  instagram: "IG",
  note: "note",
  blog: "ブログ",
};

export const DELIVERABLE_STATUSES: DeliverableStatus[] = [
  "idea",
  "interested",
  "selected",
  "in_progress",
  "draft_ready",
  "published",
  "skipped",
  "archived",
];

export const DELIVERABLE_STATUS_LABEL: Record<DeliverableStatus, string> = {
  idea: "アイデア",
  interested: "気になる",
  selected: "つくりたい",
  in_progress: "制作中",
  draft_ready: "下書き完成",
  published: "公開済み",
  skipped: "今回はやらない",
  archived: "保留",
};

/**
 * Decorative only — every mark is always paired with its text label, never
 * shown alone (status must not be colour/symbol-only).
 */
export const STATUS_MARK: Record<DeliverableStatus, string> = {
  idea: "○",
  interested: "○",
  selected: "◐",
  in_progress: "◐",
  draft_ready: "◐",
  published: "●",
  skipped: "—",
  archived: "—",
};

export const CONTENT_ROLES: ContentRole[] = ["discovery", "connection", "utility", "conversion"];

export const ROLE_LABEL: Record<ContentRole, string | null> = {
  none: null,
  discovery: "発見",
  connection: "共感",
  utility: "役立つ",
  conversion: "購買・行動",
};

/** Longer, explanatory form for the deliverable form's role select. */
export const ROLE_LABEL_LONG: Record<ContentRole, string> = {
  none: "役割は決めない",
  discovery: "発見（新しい人に届く）",
  connection: "共感（読者とつながる）",
  utility: "役立つ（調べて見つかる）",
  conversion: "購買・行動（決め手になる）",
};

export const DEFAULT_ROLE: Record<Platform, ContentRole> = {
  instagram: "discovery",
  note: "connection",
  blog: "utility",
};

export const FORMAT_SUGGESTIONS: Record<Platform, string[]> = {
  instagram: ["カルーセル", "リール", "写真", "イラスト", "ストーリーズ", "短いキャプション"],
  note: ["エッセイ", "日記", "ガイド", "ふりかえり", "リスト", "有料記事"],
  blog: [
    "日記",
    "調べもの",
    "定番ガイド",
    "レビュー",
    "おすすめ",
    "旅ガイド",
    "食べものガイド",
    "比較",
  ],
};

export function isPlatform(v: unknown): v is Platform {
  return typeof v === "string" && (PLATFORMS as string[]).includes(v);
}
export function isDeliverableStatus(v: unknown): v is DeliverableStatus {
  return typeof v === "string" && (DELIVERABLE_STATUSES as string[]).includes(v);
}
export function isContentRole(v: unknown): v is ContentRole {
  return typeof v === "string" && (["none", ...CONTENT_ROLES] as string[]).includes(v);
}

export function toPlatform(v: unknown, fallback: Platform = "blog"): Platform {
  return isPlatform(v) ? v : fallback;
}
export function toDeliverableStatus(
  v: unknown,
  fallback: DeliverableStatus = "idea",
): DeliverableStatus {
  return isDeliverableStatus(v) ? v : fallback;
}
export function toContentRole(v: unknown, fallback: ContentRole = "none"): ContentRole {
  return isContentRole(v) ? v : fallback;
}

/** Instagram-specific planning fields. Every field optional. */
export type InstagramMetadata = {
  caption?: string;
  slideCount?: number;
  callToAction?: string;
  hashtags?: string[];
};

/** note-specific planning fields. */
export type NoteMetadata = {
  isPaid?: boolean;
  intro?: string;
};

/** Blog-specific planning fields — the post itself owns title/slug/body. */
export type BlogMetadata = {
  seoTitle?: string;
  metaDescription?: string;
  affiliatePotential?: string;
};

export type DeliverableMetadata = InstagramMetadata & NoteMetadata & BlogMetadata;

/**
 * Defensive JSON parse scoped to what the given platform actually uses —
 * unknown keys are dropped so a future platform/field is purely additive,
 * and bad JSON never throws (falls back to {}).
 */
export function parseMetadata(platform: Platform, raw: string): DeliverableMetadata {
  let obj: Record<string, unknown>;
  try {
    const parsed = JSON.parse(raw || "{}");
    obj = parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    obj = {};
  }

  const out: DeliverableMetadata = {};
  if (platform === "instagram") {
    if (typeof obj.caption === "string") out.caption = obj.caption.slice(0, 2200);
    if (typeof obj.slideCount === "number" && Number.isFinite(obj.slideCount)) {
      out.slideCount = Math.max(0, Math.min(20, Math.round(obj.slideCount)));
    }
    if (typeof obj.callToAction === "string") out.callToAction = obj.callToAction.slice(0, 120);
    if (Array.isArray(obj.hashtags)) {
      out.hashtags = obj.hashtags
        .filter((h): h is string => typeof h === "string")
        .map((h) => h.trim())
        .filter(Boolean)
        .slice(0, 30);
    }
  } else if (platform === "note") {
    if (typeof obj.isPaid === "boolean") out.isPaid = obj.isPaid;
    if (typeof obj.intro === "string") out.intro = obj.intro.slice(0, 400);
  } else if (platform === "blog") {
    if (typeof obj.seoTitle === "string") out.seoTitle = obj.seoTitle.slice(0, 120);
    if (typeof obj.metaDescription === "string") {
      out.metaDescription = obj.metaDescription.slice(0, 200);
    }
    if (typeof obj.affiliatePotential === "string") {
      out.affiliatePotential = obj.affiliatePotential.slice(0, 200);
    }
  }
  return out;
}

export function serializeMetadata(platform: Platform, meta: DeliverableMetadata): string {
  return JSON.stringify(parseMetadata(platform, JSON.stringify(meta)));
}

export type AggregateState =
  | "idea"
  | "selected"
  | "in_progress"
  | "partially_published"
  | "completed";

export const AGGREGATE_LABEL: Record<AggregateState, string> = {
  idea: "アイデア",
  selected: "つくりたい",
  in_progress: "制作中",
  partially_published: "一部公開",
  completed: "ひととおり完了",
};

const SETTLED: DeliverableStatus[] = ["published", "skipped", "archived"];
const ACTIVE: DeliverableStatus[] = ["in_progress", "draft_ready"];
const CHOSEN: DeliverableStatus[] = ["interested", "selected"];

/**
 * Pure aggregate over a ticket's deliverables — no DB access, so it can run
 * server- or client-side from data already in hand. `null` for an idea with
 * no deliverables yet: the caller falls back to the ticket's own stored
 * status, so every idea created before this feature renders exactly as it
 * did before.
 */
export function aggregate(deliverables: Pick<TicketDeliverable, "status">[]): AggregateState | null {
  if (deliverables.length === 0) return null;

  const statuses = deliverables.map((d) => d.status);
  const anyPublished = statuses.includes("published");
  const anyUnsettled = statuses.some((s) => !SETTLED.includes(s));

  if (anyPublished && anyUnsettled) return "partially_published";
  if (statuses.every((s) => SETTLED.includes(s))) return "completed";
  if (statuses.some((s) => ACTIVE.includes(s))) return "in_progress";
  if (statuses.every((s) => s === "idea")) return "idea";
  if (statuses.some((s) => CHOSEN.includes(s))) return "selected";
  return "idea";
}

export function crossPlatformLabel(level: CrossPlatformPotential): string | null {
  return SIGNAL_LABEL[level as SignalLevel] ?? null;
}
