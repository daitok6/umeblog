"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { submitComment } from "@/lib/repo/comments";

export type CommentFormState = { ok: boolean; message: string };

export async function submitCommentAction(
  _prev: CommentFormState,
  formData: FormData,
): Promise<CommentFormState> {
  const postId = Number(formData.get("postId"));
  const authorName = String(formData.get("authorName") ?? "");
  const body = String(formData.get("body") ?? "");

  if (!Number.isFinite(postId)) {
    return { ok: false, message: "投稿が見つかりませんでした。" };
  }

  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";

  const result = await submitComment({ postId, authorName, body, ip });
  if (!result.ok) return { ok: false, message: result.error };

  revalidatePath("/");
  // Always the same message whether it was screened as spam or merely queued —
  // telling a spammer which rule caught them just teaches them the rule.
  return { ok: true, message: "ありがとうございます。確認のうえ公開されます。" };
}
