"use client";

import { useActionState } from "react";
import { submitCommentAction, type CommentFormState } from "@/app/actions/comments";

const initial: CommentFormState = { ok: false, message: "" };

export default function CommentForm({ postId }: { postId: number }) {
  const [state, action, pending] = useActionState(submitCommentAction, initial);

  if (state.ok) {
    return (
      <p className="comment-form__note" data-testid="comment-result">
        {state.message}
      </p>
    );
  }

  return (
    <form action={action} className="comment-form">
      <input type="hidden" name="postId" value={postId} />
      <label className="label" htmlFor="authorName">
        お名前
      </label>
      <input id="authorName" name="authorName" maxLength={40} placeholder="名無し" />
      <label className="label" htmlFor="body">
        コメント
      </label>
      <textarea id="body" name="body" maxLength={2000} required />
      {state.message ? (
        <p className="comment-form__note" data-testid="comment-result">
          {state.message}
        </p>
      ) : null}
      <p className="comment-form__note">
        いただいたコメントは、確認のうえ公開されます。すぐには表示されません。
      </p>
      <button className="btn" type="submit" disabled={pending}>
        {pending ? "送信中…" : "送信する"}
      </button>
    </form>
  );
}
