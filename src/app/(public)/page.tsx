import BlogBrowser from "@/components/BlogBrowser";
import HeroParallax from "@/components/HeroParallax";
import { listPublished } from "@/lib/repo/posts";

export const revalidate = 300;

export default async function HomePage() {
  // A blog this size fits comfortably in one request; past a few hundred
  // posts this should move to server-side filtering with URL params instead.
  const raw = await listPublished(1000);

  // BlogBrowser is a client component, so every field here is serialized to
  // the browser. `contentJson` is the raw BlockNote body — multiple KB per
  // post — and BlogBrowser's instant search never reads it (see its module
  // comment), so it's stripped at this boundary rather than shipped and
  // ignored. Full body search stays server-side at `/search`.
  const posts = raw.map((p) => ({ ...p, contentJson: "" }));

  return (
    <>
      <section className="blog-hero">
        <HeroParallax src="/hero-illustration.jpg" alt="" />
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
      <div className="container">
        <BlogBrowser posts={posts} />
      </div>
    </>
  );
}
