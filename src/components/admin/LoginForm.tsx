"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/app/actions/auth";

const initial: LoginState = { error: "" };

export default function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initial);

  return (
    <form action={action} className="login-form">
      <label className="label" htmlFor="email">
        メールアドレス
      </label>
      <input id="email" name="email" type="email" autoComplete="username" required />

      <label className="label" htmlFor="password">
        パスワード
      </label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />

      {state.error ? <p className="form-error">{state.error}</p> : null}

      <button className="btn btn--wide" type="submit" disabled={pending}>
        {pending ? "確認中…" : "ログイン"}
      </button>
    </form>
  );
}
