import { createHash } from "node:crypto";

/**
 * Comment screening, in the order the research recommended.
 *
 * Link detection runs FIRST: it catches the large majority of abusive and
 * spam submissions with almost no false positives, so it is the highest
 * value rule per unit of effort. Word filtering is second, and is a
 * self-authored Japanese list — off-the-shelf profanity lists are English
 * and catch essentially nothing here. Rate limiting is last.
 *
 * Nothing here deletes anything. Everything lands `pending` and is invisible
 * publicly until a human approves it; these rules only decide what gets
 * flagged for attention.
 */

export type ScreenResult = {
  /** Always 'pending' or 'spam'. Approval is a human act. */
  status: "pending" | "spam";
  reason: string;
};

/** Matches bare domains and full URLs, including the common obfuscations. */
const LINK_RE =
  /(https?:\/\/|www\.|[a-z0-9-]+\s*(\.|\[\.\]|\(dot\)|＠)\s*(com|net|org|jp|io|co|ru|cn|xyz|top|info)\b)/i;

/** Zero-width and bidi characters, a standard filter-evasion trick. */
const INVISIBLE_RE = /[​-‍⁠﻿‪-‮]/;

export function containsLink(body: string): boolean {
  return LINK_RE.test(body);
}

export function containsBlockedWord(body: string, blocked: string[]): string | null {
  const haystack = body.normalize("NFKC").toLowerCase();
  for (const w of blocked) {
    const needle = w.normalize("NFKC").toLowerCase().trim();
    if (needle && haystack.includes(needle)) return w;
  }
  return null;
}

export function screenComment(body: string, blocked: string[]): ScreenResult {
  if (containsLink(body)) {
    return { status: "spam", reason: "リンクを含むため自動で保留しました" };
  }
  if (INVISIBLE_RE.test(body)) {
    return { status: "spam", reason: "不可視文字を含むため自動で保留しました" };
  }
  const hit = containsBlockedWord(body, blocked);
  if (hit) {
    return { status: "spam", reason: `NGワード「${hit}」を含みます` };
  }
  if (body.trim().length < 2) {
    return { status: "spam", reason: "本文が短すぎます" };
  }
  return { status: "pending", reason: "" };
}

/** IPs are never stored raw — only a salted hash, used for rate limiting. */
export function hashIp(ip: string): string {
  const salt = process.env.SESSION_SECRET ?? "umeblog";
  return createHash("sha256").update(salt + "|" + ip).digest("hex").slice(0, 32);
}

export const RATE_LIMIT = { max: 3, windowMs: 10 * 60 * 1000 };

export function isRateLimited(recentCount: number): boolean {
  return recentCount >= RATE_LIMIT.max;
}
