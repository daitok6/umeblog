# うめ — Umeblog

A Japanese personal blog with a built-in admin, a block editor, comment
moderation, and a motivation system designed around one specific problem.
Runs on Vercel, Neon Postgres, and Vercel Blob.

Design follows [mud.co.jp](https://mud.co.jp) — monochrome, a 1px hairline
frame, and a generative motif whose density grows with the archive.

## Running it locally

```bash
pnpm install
vercel link                                   # once, to attach this repo to a Vercel project
vercel env pull .env.local --yes               # pulls DATABASE_URL / BLOB_READ_WRITE_TOKEN
pnpm db:push                                    # create the schema in Neon
pnpm create-user -- --email you@example.com --name "うめ" --role author --password "…"
pnpm create-user -- --email friend@example.com --name "だいと" --role reader --password "…"
pnpm dev
```

Then <http://localhost:3000>, admin at <http://localhost:3000/login>, using the
account(s) you just created with `pnpm create-user`. The blog starts empty —
there is no fake seeded content in the setup flow; write the first real post
whenever you're ready.

Full deployment steps (provisioning Neon/Blob, environment variables, first
deploy) are in [`docs/OPERATIONS.md`](docs/OPERATIONS.md). A Japanese guide
for the person actually writing the blog is at
[`docs/manual.md`](docs/manual.md).

`scripts/seed.ts` (`pnpm db:seed`, and `pnpm db:reset` which chains it after
`db:push`) generates a year of fake diary content — a local design/layout
tool for working on pagination, the calendar, etc. against something
realistic. Neither is part of setup, and neither should ever run against a
real deployment; they never touch accounts either way.

## Tests

```bash
pnpm test
```

40 tests. Three groups matter more than the rest:

- **`tests/ime.spec.ts`** — gates the build. Japanese input composes, and the
  Enter key confirms a conversion before it ever means "new line". Anything
  that reacts to that Enter destroys the text being typed.
- **`tests/rules.spec.ts`** — asserts the motivation rules, including that no
  current-streak counter, flame icon or countdown exists anywhere.
- **`tests/typography.spec.ts`** — pins the Japanese typography (line-height
  ≥ 1.8, loosened tracking, ~35 characters per line, never italic).

`pnpm test` provisions two fixture accounts on the connected database first
(`pretest` → `scripts/seed-test-users.ts`) — local/CI convenience only, never
part of a deploy.

## The two rules this app is built around

**No number may reset to zero.** The writer previously stopped blogging by
missing a few days and never coming back. A counter that zeroes turns a missed
day into a reason to quit, so every figure shown either only increases
(`総本数`, `今月`, `往復`) or is labelled as a past record that cannot be lost
(`最高記録`). Blank days on the calendar are drawn pale — never red, never an X.

**Being read is the engine.** The strongest motivator for a writer is a
response, not a score. `replies` is the answer-table: she writes, a trusted
reader answers, and the count of answered posts is the `往復` figure. The most
recent reply gets the best position on her dashboard.

## Layout

```
src/lib/db/        Drizzle schema (Postgres) + lazy client
src/lib/repo/      ALL database access. Nothing outside this directory queries.
src/lib/storage/   Image storage adapter — Vercel Blob
src/lib/auth/      scrypt password hashing + signed-cookie sessions
src/lib/ime.ts     The composition guard
src/lib/moderation.ts   Link → word list → rate limit, in that order
src/lib/sekki.ts   The 72 micro-seasons
src/lib/blocks.ts  Plain-text excerpt from a stored BlockNote document
src/app/(public)/  Reader-facing — Blog / Tags / About, sitemap.xml, robots.txt, feed.xml
src/app/admin/     Writer-facing, Japanese UI
scripts/create-user.ts   The only way a login account is ever created
scripts/seed.ts          Content only — never touches accounts
```

## Production stack

| Concern | Choice |
|---|---|
| Hosting | Vercel |
| Database | Neon Postgres (`vercel integration add neon`) |
| Images | Vercel Blob, re-encoded to webp via `sharp` before upload |
| Auth | Custom scrypt + signed JWT cookie session — no third-party vendor |
| Caching | Public pages are ISR (`revalidate = 300`) with `revalidatePath` on every publish/unpublish/delete/reply/comment-approval; `/admin/**` stays fully dynamic |

Details, env vars, and the first-deploy checklist are in
[`docs/OPERATIONS.md`](docs/OPERATIONS.md).

## Known limits

- The motif is Canvas 2D; the reference uses a WebGL2 shader. Deliberate — at
  this line count the difference is not worth the complexity.
- IME handling covers *our* handlers. Defects inside BlockNote/ProseMirror
  themselves can be worked around but not fixed from here; the tests would
  catch a regression, not prevent one upstream.
- Comments are on but should stay approval-only until there are readers.
