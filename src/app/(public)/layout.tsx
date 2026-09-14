import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import ResponsiveName from "@/components/ResponsiveName";
import RevealScope from "@/components/RevealScope";
import { getSettings, bannerNames, siteNames } from "@/lib/repo/settings";
import { listChips } from "@/lib/repo/tags";
import "./public.css";

export const metadata: Metadata = {
  alternates: {
    types: { "application/rss+xml": "/feed.xml" },
  },
};

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [settings, chips] = await Promise.all([getSettings(), listChips()]);
  const banner = bannerNames(settings);
  const site = siteNames(settings);
  // Footer nav mirrors the same author-curated chip list the blog page's
  // filter row reads from (listChips, /admin/tags) — one place decides
  // what's "current" on this blog. A brand-new blog with nothing curated
  // yet falls back to Blog/About so the nav is never empty.
  const footerTags = chips.slice(0, 5);

  return (
    <div className="public-shell">
      <SiteHeader wide={banner.wide} narrow={banner.narrow} />
      <main>{children}</main>
      <footer className="site-footer">
        <RevealScope root=".site-footer" />
        <div className="container site-footer__inner">
          <div className="site-footer__brand" data-reveal>
            <span className="site-footer__logo">
              <ResponsiveName wide={site.wide} narrow={site.narrow} />
            </span>
            {settings.tagline ? <p className="site-footer__tagline">{settings.tagline}</p> : null}
          </div>
          <nav className="site-footer__nav" data-reveal data-reveal-delay="0.08">
            {footerTags.length > 0 ? (
              footerTags.map((t) => (
                <Link key={t.slug} href={`/tag/${t.slug}`}>
                  {t.name}
                </Link>
              ))
            ) : (
              <>
                <Link href="/">Blog</Link>
                <Link href="/about">About</Link>
              </>
            )}
          </nav>
          <div className="site-footer__meta" data-reveal data-reveal-delay="0.16">
            <span className="site-footer__copyright">
              © {new Date().getFullYear()} <ResponsiveName wide={site.wide} narrow={site.narrow} />
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
