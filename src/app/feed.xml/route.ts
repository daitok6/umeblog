import { listPublished } from "@/lib/repo/posts";
import { getSettings } from "@/lib/repo/settings";
import { excerptFromBlocks } from "@/lib/blocks";

export const revalidate = 300;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const [posts, settings] = await Promise.all([listPublished(50), getSettings()]);

  const items = posts
    .map((p) => {
      const url = `${siteUrl}/p/${p.slug}`;
      const description = p.lead || excerptFromBlocks(p.contentJson);
      const pubDate = p.publishedAt ? new Date(p.publishedAt).toUTCString() : undefined;
      return `<item>
  <title>${escapeXml(p.title || "無題")}</title>
  <link>${url}</link>
  <guid isPermaLink="true">${url}</guid>
  ${pubDate ? `<pubDate>${pubDate}</pubDate>` : ""}
  ${description ? `<description>${escapeXml(description)}</description>` : ""}
</item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>${escapeXml(settings.title)}</title>
  <link>${siteUrl}</link>
  <description>${escapeXml(settings.tagline)}</description>
  <language>ja</language>
  ${items}
</channel>
</rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
