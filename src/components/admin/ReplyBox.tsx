"use client";

import { useState, useTransition } from "react";
import { addReplyAction } from "@/app/actions/posts";
import type { ReplyWithAuthor } from "@/lib/repo/replies";

/**
 * 返事 — the reply surface.
 *
 * This is the other half of the exchange: she writes, someone answers. The
 * count of answered posts is the 往復 figure on her dashboard, and it is the
 * one number in the app that reflects a relationship rather than output.
 */
export default function ReplyBox({
  postId,
  existing,
  canReply,
}: {
  postId: number;
  existing: ReplyWithAuthor[];
  canReply: boolean;
}) {
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);

  return (
    <section className="panel">
      <div className="panel__head">
        <h2 className="panel__title">往復（{existing.length}）</h2>
      </div>

      {existing.map((r) => (
        <div key={r.id} style={{ marginBottom: "1rem" }}>
          <span className="label">
            {r.authorName} ／ {new Date(r.createdAt).toLocaleDateString("ja-JP")}
          </span>
          <p style={{ lineHeight: 1.95, marginTop: "0.3rem" }}>{r.body}</p>
        </div>
      ))}

      {canReply ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const text = body.trim();
            if (!text) return;
            start(async () => {
              await addReplyAction(postId, text);
              setBody("");
              setDone(true);
            });
          }}
          style={{ marginTop: "1.2rem" }}
        >
          <label className="label" htmlFor="reply">
            返事を書く
          </label>
          <textarea
            id="reply"
            data-testid="reply-input"
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              setDone(false);
            }}
            style={{
              width: "100%",
              minHeight: "6rem",
              border: "1px solid var(--rule)",
              background: "var(--ground)",
              padding: "0.7rem 0.85rem",
              lineHeight: 1.9,
              marginTop: "0.4rem",
              marginBottom: "0.7rem",
            }}
          />
          <button className="btn" type="submit" disabled={pending || !body.trim()}>
            {pending ? "送信中…" : "返事を送る"}
          </button>
          {done ? (
            <span className="label" style={{ marginLeft: "0.8rem" }}>
              送りました
            </span>
          ) : null}
        </form>
      ) : null}
    </section>
  );
}
