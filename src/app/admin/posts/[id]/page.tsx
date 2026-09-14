import { notFound } from "next/navigation";
import Link from "next/link";
import Editor from "@/components/admin/EditorLoader";
import PostSidebar from "@/components/admin/PostSidebar";
import ReplyBox from "@/components/admin/ReplyBox";
import { getById } from "@/lib/repo/posts";
import { listForPost } from "@/lib/repo/replies";
import { getSessionUser } from "@/lib/auth/session";
import { ticketForPost } from "@/lib/repo/tickets";

export const dynamic = "force-dynamic";

export default async function EditPostPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ hint?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const postId = Number(id);
  const [post, user] = await Promise.all([getById(postId), getSessionUser()]);
  if (!post) notFound();

  const [replies, ticket] = await Promise.all([listForPost(postId), ticketForPost(postId)]);
  const isAuthor = user?.role === "author";

  // A trusted reader opens this page to answer, not to edit.
  if (!isAuthor) {
    return (
      <div>
        <div className="page-head">
          <h1>{post.title || "無題"}</h1>
          <Link className="btn-sm" href={`/p/${post.slug}`}>
            記事を見る
          </Link>
        </div>
        <ReplyBox postId={post.id} existing={replies} canReply />
      </div>
    );
  }

  return (
    <div>
      <div className="page-head">
        <h1>{post.title || "無題"}</h1>
        <span style={{ display: "flex", gap: "0.6rem" }}>
          {ticket ? (
            <Link className="btn-sm" href={`/admin/tickets/${ticket.id}`}>
              もとのアイデア
            </Link>
          ) : null}
          <Link className="btn-sm" href="/admin/posts">
            一覧へ戻る
          </Link>
        </span>
      </div>

      <div className="editor-grid">
        <Editor
          postId={post.id}
          initialTitle={post.title}
          initialLead={post.lead}
          initialContent={post.contentJson}
          initialTags={post.tags.map((t) => t.name)}
          initialKind={post.kind}
          initialHint={sp.hint}
        />
        <PostSidebar
          postId={post.id}
          status={post.status}
          slug={post.slug}
          serial={post.serial}
          publishAt={post.publishAt}
          coverUrl={post.cover?.url ?? ""}
          featured={post.featured}
        />
      </div>

      {replies.length > 0 ? (
        <div style={{ marginTop: "1.5rem" }}>
          <ReplyBox postId={post.id} existing={replies} canReply={false} />
        </div>
      ) : null}
    </div>
  );
}
