/**
 * Pure classification helpers for the analytics pipeline. No I/O, no env
 * vars — kept separate from src/app/api/track/route.ts so the buckets
 * themselves can be unit-tested without a request.
 */

export type Source = "search" | "social" | "ai" | "newsletter" | "direct" | "internal" | "other";

const SEARCH_HOSTS = ["google.", "bing.com", "duckduckgo.com", "search.yahoo.", "yahoo.co.jp"];

const SOCIAL_HOSTS = [
  "x.com",
  "twitter.com",
  "t.co",
  "note.com",
  "hatena.ne.jp",
  "b.hatena.ne.jp",
  "line.me",
  "facebook.com",
  "instagram.com",
  "reddit.com",
  "lin.ee",
];

/**
 * AI-assistant referrers. Called out as their own bucket rather than folded
 * into "other" because they're a fast-growing, genuinely actionable source
 * that no free analytics dashboard breaks out on its own.
 */
const AI_HOSTS = [
  "chatgpt.com",
  "chat.openai.com",
  "perplexity.ai",
  "claude.ai",
  "gemini.google.com",
  "copilot.microsoft.com",
  "www.bing.com/chat",
];

function hostMatches(host: string, list: string[]): boolean {
  return list.some((h) => host === h || host.endsWith("." + h) || host.includes(h));
}

/**
 * First-touch source classification. An explicit `utm_medium` always wins
 * over host inference — a reader who followed a tagged newsletter link is
 * "newsletter" even if their mail client's webview reports an odd referrer.
 *
 * `ownHost`, when given, is the blog's own hostname (from the request's Host
 * header) — a referrer matching it means the session started from a raw
 * internal navigation (e.g. "open link in new tab" on another one of our
 * pages) rather than genuine outside traffic.
 */
export function classifySource(referrerHost: string, utmMedium: string, ownHost = ""): Source {
  const medium = utmMedium.trim().toLowerCase();
  if (medium === "email" || medium === "newsletter") return "newsletter";
  if (medium === "social") return "social";
  if (medium === "search" || medium === "cpc") return "search";
  if (medium === "ai") return "ai";

  const host = referrerHost.trim().toLowerCase();
  if (!host) return "direct";
  if (ownHost && host === ownHost.trim().toLowerCase()) return "internal";
  if (hostMatches(host, AI_HOSTS)) return "ai";
  if (hostMatches(host, SEARCH_HOSTS)) return "search";
  if (hostMatches(host, SOCIAL_HOSTS)) return "social";
  return "other";
}

/**
 * Crawler / bot detection by user-agent token. Bots are dropped at ingest
 * (never written to `events`) rather than filtered at read time, so every
 * query against the table can trust every row is a real visit.
 */
const BOT_RE =
  /bot|crawl|spider|slurp|headless|preview|curl|wget|lighthouse|python-requests|axios|go-http-client|GPTBot|ClaudeBot|PerplexityBot|Bytespider|facebookexternalhit/i;

export function isBot(userAgent: string): boolean {
  if (!userAgent) return true; // no UA at all is never a real browser
  return BOT_RE.test(userAgent);
}
