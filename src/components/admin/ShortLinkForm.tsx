"use client";

import { useActionState } from "react";
import { createShortLinkAction, type ShortLinkFormState } from "@/app/actions/shortLinks";

const initial: ShortLinkFormState = { ok: false, message: "" };

export default function ShortLinkForm() {
  const [state, action, pending] = useActionState(createShortLinkAction, initial);

  return (
    <form action={action} className="settings-form" style={{ marginBottom: "1.5rem" }}>
      <label className="label" htmlFor="sl-code">
        コード
      </label>
      <input
        id="sl-code"
        name="code"
        placeholder="ig-bio"
        maxLength={40}
        pattern="[a-z0-9-]+"
        required
      />
      <p className="label" style={{ marginTop: "-8px" }}>
        /go/コード というURLになります
      </p>

      <label className="label" htmlFor="sl-destination">
        リンク先URL
      </label>
      <input
        id="sl-destination"
        name="destination"
        type="url"
        placeholder="https://example.com/..."
        required
      />

      <label className="label" htmlFor="sl-label">
        メモ（管理用、非公開）
      </label>
      <input id="sl-label" name="label" placeholder="Instagramのプロフィール欄" maxLength={200} />

      {state.message ? (
        <p className="label" data-testid="short-link-result">
          {state.message}
        </p>
      ) : null}

      <button className="btn" type="submit" disabled={pending}>
        {pending ? "作成中…" : "作成する"}
      </button>
    </form>
  );
}
