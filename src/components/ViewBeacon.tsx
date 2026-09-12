"use client";

import { useEffect, useRef } from "react";

/**
 * Fires one best-effort view-count request per post per browser session.
 * Renders nothing and never blocks or delays the page it's mounted on.
 *
 * Deliberately not counted here: bots, ad blockers, and no-JS readers. That
 * is an accepted trade for not making /p/[slug] dynamic — see recordView()
 * in src/lib/repo/posts.ts for why the increment can't happen server-side.
 */
export default function ViewBeacon({ slug }: { slug: string }) {
  const sent = useRef(false);

  useEffect(() => {
    // Guards against React's dev-mode double-invoke of effects, and against
    // re-firing if this ever remounts on the same page.
    if (sent.current) return;
    sent.current = true;

    const key = `viewed:${slug}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // Private browsing / storage disabled — fall through and send once
      // per mount rather than blocking the count entirely.
    }

    const body = JSON.stringify({ slug });
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon("/api/view", blob);
    } else {
      fetch("/api/view", { method: "POST", body, keepalive: true }).catch(() => {});
    }
  }, [slug]);

  return null;
}
