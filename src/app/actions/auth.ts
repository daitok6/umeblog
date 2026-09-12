"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";
import { isLoginRateLimited, recordLoginAttempt } from "@/lib/repo/auth";

export type LoginState = { error: string };

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";

  if (await isLoginRateLimited(ip)) {
    return { error: "しばらく時間をおいてからお試しください。" };
  }

  const user = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
  // Same message either way — distinguishing them tells an attacker which
  // addresses exist.
  const failure = { error: "メールアドレスかパスワードが違います。" };
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    // Only failures count toward the limit — this guards against guessing,
    // not against a real person (or a test suite) logging in repeatedly.
    await recordLoginAttempt(ip);
    return failure;
  }

  await createSession(user.id);
  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}
