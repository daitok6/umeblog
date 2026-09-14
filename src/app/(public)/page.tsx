import { getImageProps } from "next/image";
import BlogBrowser from "@/components/BlogBrowser";
import FeaturedRail from "@/components/FeaturedRail";
import HeroParallax from "@/components/HeroParallax";
import { listPublished } from "@/lib/repo/posts";
import { getSettings, heroImages } from "@/lib/repo/settings";
import { listChips } from "@/lib/repo/tags";

export const revalidate = 300;

/** Matches the single existing breakpoint in public.css (`@media (max-width: 768px)`). */
const MOBILE_MEDIA = "(max-width: 768px)";

export default async function HomePage() {
  // A blog this size fits comfortably in one request; past a few hundred
  // posts this should move to server-side filtering with URL params instead.
  const [raw, chips] = await Promise.all([listPublished(1000), listChips()]);

  const hero = heroImages(await getSettings());
  const heroCommon = {
    alt: "",
    fill: true as const,
    sizes: "100vw",
    priority: true as const,
    className: "blog-hero__img",
  };
  const { props: heroImgProps } = getImageProps({ ...heroCommon, src: hero.wide });
  // Desktop and mobile can resolve to the same URL (nothing uploaded, or the
  // mobile field is empty and inherits the desktop one) — skip the <source>
  // entirely then so there's only ever one candidate to pick from.
  const heroNarrowSrcSet =
    hero.narrow === hero.wide
      ? undefined
      : getImageProps({ ...heroCommon, src: hero.narrow }).props.srcSet;

  // BlogBrowser is a client component, so every field here is serialized to
  // the browser. `contentJson` is the raw BlockNote body — multiple KB per
  // post — and BlogBrowser's instant search never reads it (see its module
  // comment), so it's stripped at this boundary rather than shipped and
  // ignored. Full body search stays server-side at `/search`.
  const posts = raw.map((p) => ({ ...p, contentJson: "" }));

  // Author-flagged in PostSidebar's 注目 toggle. `posts` is already newest
  // first (listPublished orders by publishedAt), so no separate sort here.
  const featured = posts.filter((p) => p.featured).slice(0, 8);

  return (
    <>
      <section className={`blog-hero${featured.length > 0 ? " blog-hero--split" : ""}`}>
        <HeroParallax
          imgProps={heroImgProps}
          narrowSrcSet={heroNarrowSrcSet}
          narrowMedia={MOBILE_MEDIA}
        />
        <svg
          className="blog-hero__divider"
          viewBox="0 0 1200 90"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            className="blog-hero__divider-fill"
            d="M0,22 C45,10 70,58 120,52 C165,47 195,14 245,20 C300,26 330,68 385,62 C435,57 465,18 515,24 C565,30 595,72 650,66 C705,60 735,22 790,28 C845,34 875,70 930,64 C980,59 1005,20 1055,26 C1105,32 1135,64 1175,58 C1190,56 1198,42 1200,35 L1200,90 L0,90 Z"
          />
        </svg>
        <div className="container blog-hero__inner">
          <div className="blog-hero__copy">
            <p className="blog-hero__tagline">ちょっとレトロ、ちょっと旅、ちょっとヘン。</p>
            <h1 className="blog-hero__title">Blog</h1>
            <span className="blog-hero__kana">ブログ</span>
          </div>
        </div>
      </section>
      <FeaturedRail posts={featured} />
      <div className="container">
        <BlogBrowser posts={posts} chips={chips} />
      </div>
    </>
  );
}
