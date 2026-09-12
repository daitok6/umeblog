/**
 * Local/CI test fixtures only — NOT part of any production or deploy flow.
 *
 * Creates the two accounts `tests/helpers.ts` logs in as, if they don't
 * already exist. Real account creation always goes through
 * `pnpm create-user`, which refuses to run without an explicit password;
 * this script exists purely so `pnpm test` has something to log into.
 *
 * Deliberately DIFFERENT emails from any real demo/author account: `db:push`
 * and this test DB may be the very same Neon database a real deploy uses
 * (the default Marketplace setup has no per-environment branch), so a test
 * fixture must never be able to collide with — or shadow the password of —
 * a real login.
 */
import { eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import * as schema from "../src/lib/db/schema";
import { hashPassword } from "../src/lib/auth/password";

const FIXTURES = [
  {
    email: "playwright-author@umeblog.test",
    password: "ume-test-1234",
    name: "テスト著者",
    role: "author" as const,
  },
  {
    email: "playwright-reader@umeblog.test",
    password: "daito-test-1234",
    name: "テスト読者",
    role: "reader" as const,
  },
];

async function main() {
  for (const f of FIXTURES) {
    const existing = await db.query.users.findFirst({ where: eq(schema.users.email, f.email) });
    if (existing) continue;
    await db.insert(schema.users).values({
      email: f.email,
      name: f.name,
      role: f.role,
      passwordHash: await hashPassword(f.password),
      createdAt: Date.now(),
    });
    console.log(`test fixture: created ${f.role} ${f.email}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
