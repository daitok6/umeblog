import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import ResponsiveName from "@/components/ResponsiveName";
import { getSettings, bannerNames, siteNames } from "@/lib/repo/settings";
import { listWithCounts } from "@/lib/repo/tags";
import "./public.css";

export const metadata: Metadata = {
  alternates: {
    types: { "application/rss+xml": "/feed.xml" },
  },
};

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [settings, tags] = await Promise.all([getSettings(), listWithCounts()]);
  const banner = bannerNames(settings);
  const site = siteNames(settings);
  // Footer nav mirrors whichever tags are actually in use, most-used first
  // (listWithCounts is already sorted that way) — same source the blog page's
  // chips read from, so there's one place that decides what's "current" on
  // this blog. A brand-new blog with no tags yet falls back to Blog/About
  // so the nav is never empty.
  const footerTags = tags.slice(0, 5);

  return (
    <div className="public-shell">
      <SiteHeader wide={banner.wide} narrow={banner.narrow} />
      <main>{children}</main>
      <footer className="site-footer">
        <div className="container site-footer__inner">
          <div className="site-footer__brand">
            <span className="site-footer__logo">
              <ResponsiveName wide={site.wide} narrow={site.narrow} />
            </span>
            {settings.tagline ? <p className="site-footer__tagline">{settings.tagline}</p> : null}
          </div>
          <nav className="site-footer__nav">
            {footerTags.length > 0 ? (
              footerTags.map((t) => (
                <Link key={t.slug} href={`/tag/${t.slug}`}>
                  {t.name}
                </Link>
              ))
            ) : (
              <>
                <Link href="/blog">Blog</Link>
                <Link href="/about">About</Link>
              </>
            )}
          </nav>
          <div className="site-footer__meta">
            <span className="site-footer__copyright">
              © {new Date().getFullYear()} <ResponsiveName wide={site.wide} narrow={site.narrow} />
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
