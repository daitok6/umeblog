import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BlogBrowser from "@/components/BlogBrowser";
import { listPublished } from "@/lib/repo/posts";
import { getBySlug, listChips } from "@/lib/repo/tags";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tag = await getBySlug(slug);
  return { title: tag?.name ?? decodeURIComponent(slug) };
}

/**
 * Reuses the exact same search + chip filter UI as the home page — see
 * BlogBrowser.tsx — instead of the bare list this page used to render, so a
 * reader can search or switch tags without going back to `/`. That means it
 * needs the full published set (same as `/`), not just this tag's posts:
 * only that keeps every chip's count accurate and lets 人気 work.
 */
export default async function TagPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tag = await getBySlug(slug);
  if (!tag) notFound();

  const [raw, chips] = await Promise.all([listPublished(1000), listChips()]);
  // Same boundary as the home page (src/app/(public)/page.tsx): BlogBrowser
  // is a client component and its instant search never reads contentJson.
  const posts = raw.map((p) => ({ ...p, contentJson: "" }));

  return (
    <div className="container">
      <div className="section-title">
        <h2>{tag.name}</h2>
      </div>
      <BlogBrowser posts={posts} chips={chips} initialTag={tag.slug} />
    </div>
  );
}
