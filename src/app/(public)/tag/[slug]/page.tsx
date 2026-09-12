import type { Metadata } from "next";
import PostList from "@/components/PostList";
import { listByTag } from "@/lib/repo/posts";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return { title: decodeURIComponent(slug) };
}

export default async function TagPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const decoded = decodeURIComponent(slug);
  const posts = await listByTag(slug);

  return (
    <div className="container">
      <div className="section-title">
        <h2>{decoded}</h2>
        <span className="kana-sub">{posts.length} 本</span>
      </div>
      <PostList posts={posts} />
    </div>
  );
}
