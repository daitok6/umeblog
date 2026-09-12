import { redirect } from "next/navigation";
import { requireAuthor } from "@/lib/auth/session";
import { createDraft } from "@/lib/repo/posts";

export const dynamic = "force-dynamic";

/** Creating a post is a navigation, not a form — one tap from the dashboard. */
export default async function NewPostPage({
  searchParams,
}: {
  searchParams: Promise<{ tiny?: string; hint?: string }>;
}) {
  const user = await requireAuthor();
  const sp = await searchParams;
  const id = await createDraft(user.id, sp.tiny === "1");
  const hint = sp.hint ? `?hint=${encodeURIComponent(sp.hint)}` : "";
  redirect(`/admin/posts/${id}${hint}`);
}
