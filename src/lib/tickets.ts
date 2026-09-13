import type { Ticket } from "@/lib/db/schema";

/**
 * Editorial idea library — labels, ordering, and small parsers with no DB
 * dependency, so client components can import this directly (same shape as
 * src/lib/rails.ts / src/lib/sekki.ts).
 *
 * Nothing here escalates: priority reads as a warm suggestion ("いちおし" /
 * "いつか"), not a severity, and no status implies anything is overdue.
 */

export type TicketStatus = Ticket["status"];
export type TicketPillar = Ticket["pillar"];
export type TicketTopicType = Ticket["topicType"];
export type TicketPriority = Ticket["priority"];
export type SignalLevel = Ticket["seoPotential"];

export const TICKET_STATUSES: TicketStatus[] = [
  "idea",
  "interested",
  "selected",
  "in_progress",
  "draft_ready",
  "published",
  "archived",
];

/** The board's columns — archived is deliberately left off the board. */
export const BOARD_STATUSES: TicketStatus[] = [
  "idea",
  "interested",
  "selected",
  "in_progress",
  "draft_ready",
  "published",
];

/** Default list scope: hides published/archived so the active queue stays small. */
export const ACTIVE_STATUSES: TicketStatus[] = [
  "idea",
  "interested",
  "selected",
  "in_progress",
  "draft_ready",
];

export const STATUS_LABEL: Record<TicketStatus, string> = {
  idea: "アイデア",
  interested: "気になる",
  selected: "書きたい",
  in_progress: "執筆中",
  draft_ready: "下書き完成",
  published: "公開済み",
  archived: "保留",
};

export const PILLARS: TicketPillar[] = ["live", "eat_travel", "use"];

export const PILLAR_LABEL: Record<TicketPillar, string> = {
  live: "暮らす",
  eat_travel: "食べる・旅する",
  use: "使う",
};

export const TOPIC_TYPES: TicketTopicType[] = [
  "journal",
  "search",
  "recommendation",
  "social",
  "evergreen_guide",
];

export const TYPE_LABEL: Record<TicketTopicType, string> = {
  journal: "日記",
  search: "調べもの",
  recommendation: "おすすめ",
  social: "SNS向け",
  evergreen_guide: "定番ガイド",
};

export const PRIORITIES: TicketPriority[] = ["low", "normal", "high"];

/** normal renders as nothing — priority is only ever shown when it stands out. */
export const PRIORITY_LABEL: Record<TicketPriority, string | null> = {
  low: "いつか",
  normal: null,
  high: "いちおし",
};

export const SIGNAL_LEVELS: SignalLevel[] = ["none", "low", "medium", "high"];

export const SIGNAL_LABEL: Record<SignalLevel, string | null> = {
  none: null,
  low: "小",
  medium: "中",
  high: "大",
};

export function isStatus(v: unknown): v is TicketStatus {
  return typeof v === "string" && (TICKET_STATUSES as string[]).includes(v);
}
export function isPillar(v: unknown): v is TicketPillar {
  return typeof v === "string" && (PILLARS as string[]).includes(v);
}
export function isTopicType(v: unknown): v is TicketTopicType {
  return typeof v === "string" && (TOPIC_TYPES as string[]).includes(v);
}
export function isPriority(v: unknown): v is TicketPriority {
  return typeof v === "string" && (PRIORITIES as string[]).includes(v);
}
export function isSignalLevel(v: unknown): v is SignalLevel {
  return typeof v === "string" && (SIGNAL_LEVELS as string[]).includes(v);
}

/** Narrows to a known status, falling back rather than trusting client input. */
export function toStatus(v: unknown, fallback: TicketStatus = "idea"): TicketStatus {
  return isStatus(v) ? v : fallback;
}
export function toPillar(v: unknown, fallback: TicketPillar = "live"): TicketPillar {
  return isPillar(v) ? v : fallback;
}
export function toTopicType(v: unknown, fallback: TicketTopicType = "journal"): TicketTopicType {
  return isTopicType(v) ? v : fallback;
}
export function toPriority(v: unknown, fallback: TicketPriority = "normal"): TicketPriority {
  return isPriority(v) ? v : fallback;
}
export function toSignalLevel(v: unknown, fallback: SignalLevel = "none"): SignalLevel {
  return isSignalLevel(v) ? v : fallback;
}

/** One prompt per line; blank lines dropped, each trimmed and capped. */
export function parseQuestions(raw: string): string[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 8)
    .map((line) => line.slice(0, 120));
}

export function serializeQuestions(list: string[]): string {
  return list
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 8)
    .join("\n");
}
