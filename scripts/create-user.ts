/**
 * Creates one admin account. Deliberately separate from `db:seed` — seeding
 * content and creating real login credentials are different acts, and this
 * script refuses to run without an explicit, non-default password so no
 * shipped code path can ever produce a guessable account.
 *
 * Usage:
 *   pnpm create-user -- --email you@example.com --name "うめ" --role author --password "…"
 *
 * Or via env vars (handy for CI/non-interactive provisioning):
 *   USER_EMAIL=... USER_NAME=... USER_ROLE=author USER_PASSWORD=... pnpm create-user
 */
import { eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import * as schema from "../src/lib/db/schema";
import { hashPassword } from "../src/lib/auth/password";

function arg(name: string): string | undefined {
  const flag = `--${name}`;
  const i = process.argv.indexOf(flag);
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1];
  return process.env[`USER_${name.toUpperCase()}`];
}

async function main() {
  const email = arg("email")?.trim().toLowerCase();
  const name = arg("name")?.trim();
  const role = arg("role")?.trim();
  const password = arg("password");

  const missing = [
    !email && "--email",
    !name && "--name",
    !password && "--password",
    !role && "--role",
  ].filter(Boolean);

  if (missing.length > 0) {
    console.error(`Missing required argument(s): ${missing.join(", ")}`);
    console.error(
      'Usage: pnpm create-user -- --email you@example.com --name "うめ" --role author --password "…"',
    );
    process.exit(1);
  }

  if (role !== "author" && role !== "reader") {
    console.error('--role must be "author" or "reader"');
    process.exit(1);
  }

  if (!password || password.length < 8) {
    console.error("--password must be at least 8 characters.");
    process.exit(1);
  }

  const existing = await db.query.users.findFirst({ where: eq(schema.users.email, email!) });
  if (existing) {
    console.error(`A user with email ${email} already exists (id ${existing.id}).`);
    process.exit(1);
  }

  const [row] = await db
    .insert(schema.users)
    .values({
      email: email!,
      name: name!,
      role,
      passwordHash: await hashPassword(password),
      createdAt: Date.now(),
    })
    .returning();

  console.log(`Created ${role} "${row.name}" <${row.email}> (id ${row.id}).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
