"use client";

import { useEffect } from "react";

export default function PublicError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container" style={{ padding: "6rem 0", textAlign: "center" }}>
      <p className="label">エラー</p>
      <h1 style={{ margin: "0.8rem 0" }}>問題が発生しました</h1>
      <p style={{ color: "var(--muted)" }}>しばらくしてからもう一度お試しください。</p>
      <p style={{ marginTop: "1.5rem" }}>
        <button className="btn" type="button" onClick={() => retry()}>
          もう一度試す
        </button>
      </p>
    </div>
  );
}
