"use client";

import { useEffect } from "react";

/**
 * Successor to ViewBeacon: still fires one best-effort "view" beacon per
 * post per browser session via sendBeacon (with a fetch/keepalive
 * fallback), from the client rather than the revalidate=300 server page, so
 * a cache regeneration never counts as a view — see recordView() in
 * src/lib/repo/posts.ts. Renders nothing and never blocks or delays the
 * page it's mounted on.
 *
 * New here: while the article is open, it tracks max scroll depth and
 * visible-tab dwell time, and reports them as a "read" event when the tab
 * is hidden or the page is torn down. Dwell only accumulates while
 * `document.visibilityState === "visible"` — a tab left open in the
 * background must never look like an hours-long read.
 *
 * Deliberately not counted: bots, ad blockers, and no-JS readers (same
 * trade as before). Deliberately not used: `beforeunload`, which is
 * unreliable on mobile Safari — the exit signal is `visibilitychange` plus
 * `pagehide` instead.
 */
export default function ReadTracker({ slug }: { slug: string }) {
  useEffect(() => {
    // No "already ran" ref guard here on purpose: React's dev-mode strict
    // double-invoke runs setup → cleanup → setup, and a guard that skips the
    // second setup would also skip re-attaching the listeners the first
    // cleanup just removed, leaving nothing wired up for the rest of the
    // page's life. sessionStorage below is what actually prevents a
    // duplicate "view" send — it's real persistent state, unlike a ref,
    // so it correctly recognizes the second setup as a repeat.
    const sessionId = getSessionId();
    const attr = getFirstTouchAttribution();
    const device = matchMedia("(max-width: 640px)").matches ? "mobile" : "desktop";
    const path = location.pathname;

    let maxScrollPct = 0;
    let visibleMs = 0;
    let visibleSince: number | null = document.visibilityState === "visible" ? Date.now() : null;

    function accrueVisible() {
      if (visibleSince != null) {
        visibleMs += Date.now() - visibleSince;
        visibleSince = null;
      }
    }

    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        visibleSince = Date.now();
      } else {
        accrueVisible();
        sendRead();
      }
    }

    function onScroll() {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - doc.clientHeight;
      const pct = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 100;
      if (pct > maxScrollPct) maxScrollPct = Math.min(100, Math.round(pct));
    }

    function sendRead() {
      // Nothing worth recording yet — skip the ping rather than write a
      // zero-signal row (e.g. a mid-navigation tab hide before any scroll).
      if (maxScrollPct === 0 && visibleMs < 1000) return;
      send({
        type: "read",
        slug,
        sessionId,
        path,
        device,
        scrollPct: maxScrollPct,
        dwellMs: Math.round(visibleMs),
        ...attr,
      });
    }

    function onPageHide() {
      accrueVisible();
      sendRead();
    }

    const viewKey = `viewed:${slug}`;
    let alreadyViewed = false;
    try {
      alreadyViewed = sessionStorage.getItem(viewKey) != null;
      if (!alreadyViewed) sessionStorage.setItem(viewKey, "1");
    } catch {
      // Private browsing / storage disabled — fall through and send once
      // per mount rather than blocking the count entirely.
    }
    if (!alreadyViewed) {
      send({ type: "view", slug, sessionId, path, device, ...attr });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [slug]);

  return null;
}

function send(payload: Record<string, unknown>) {
  const body = JSON.stringify(payload);
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
      return;
    }
  } catch {
    // fall through to fetch
  }
  fetch("/api/track", { method: "POST", body, keepalive: true }).catch(() => {});
}

function getSessionId(): string {
  const key = "analytics:sessionId";
  try {
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    const fresh =
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);
    sessionStorage.setItem(key, fresh);
    return fresh;
  } catch {
    return "";
  }
}

type Attribution = { referrerHost: string; medium: string; campaign: string };

/**
 * First-touch attribution, resolved once per browser session and reused for
 * every page viewed afterwards — so a reader who arrives from an outside
 * link and then clicks through to a second post stays attributed to that
 * outside link rather than reclassifying as internal navigation.
 */
function getFirstTouchAttribution(): Attribution {
  const key = "analytics:attr";
  try {
    const cached = sessionStorage.getItem(key);
    if (cached) return JSON.parse(cached) as Attribution;
  } catch {
    // fall through and resolve fresh below
  }

  let referrerHost = "";
  try {
    referrerHost = document.referrer ? new URL(document.referrer).hostname : "";
  } catch {
    referrerHost = "";
  }
  const params = new URLSearchParams(location.search);
  const attr: Attribution = {
    referrerHost,
    medium: params.get("utm_medium") ?? "",
    campaign: params.get("utm_campaign") ?? "",
  };

  try {
    sessionStorage.setItem(key, JSON.stringify(attr));
  } catch {
    // Private browsing — attribution simply gets re-resolved per page
    // instead of carried, which only matters for multi-page sessions.
  }
  return attr;
}
