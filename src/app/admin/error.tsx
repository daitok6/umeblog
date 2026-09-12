"use client";

import { useEffect } from "react";

export default function AdminError({
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
    <div style={{ padding: "4rem 0", textAlign: "center" }}>
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
