# Operations

Deployment and environment reference for whoever runs this app — not the
writer's manual (that's [`manual.md`](manual.md), in Japanese).

## Stack

- **Hosting**: Vercel
- **Database**: Neon Postgres, via the Vercel Marketplace integration
- **Images**: Vercel Blob (public access), re-encoded to webp by `sharp` before upload
- **Auth**: custom scrypt password hashing + a signed JWT session cookie — no
  third-party auth vendor. `__Host-`-prefixed cookie in production.

## Environment variables

See `.env.example` for the full list. On Vercel, `DATABASE_URL` and
`BLOB_READ_WRITE_TOKEN` are injected automatically once the integrations
below are provisioned — you only set `SESSION_SECRET` and
`NEXT_PUBLIC_SITE_URL` yourself (Project Settings → Environment Variables).

`src/lib/env.ts` validates all of these at boot (imported from the root
layout) and fails with a clear error if anything is missing or too short,
rather than surfacing as a mysterious 500 on first request.

## First-time provisioning

```bash
vercel link                                    # attach this repo to a Vercel project
vercel integration add neon                    # provisions Postgres, injects DATABASE_URL
vercel blob create-store <name> --access public --yes   # provisions Blob, injects BLOB_READ_WRITE_TOKEN
vercel env pull .env.local --yes
```

Then push the schema and create the first account:

```bash
pnpm db:push
pnpm create-user -- --email you@example.com --name "うめ" --role author --password "…"
```

`create-user` is the *only* way a login account gets created — it refuses to
run without an explicit email/name/role/password, so there is no code path
that can ship a guessable default account.

**Never run `pnpm db:seed` (or `db:reset`, which chains it) against a real
deployment.** It fills the database with a year of fake diary posts — purely
a local tool for working on layout/pagination/the calendar against something
realistic. The blog ships empty; the first real post is written through the
admin, same as any other.

## Deploying

```bash
vercel deploy            # preview
vercel deploy --prod     # production, once you're satisfied
```

Set `NEXT_PUBLIC_SITE_URL` to the real production domain before promoting —
it's used for the sitemap, RSS feed, and Open Graph URLs.

## Caching model

Public pages (`/`, `/about`, `/tags`, `/tag/[slug]`, `/p/[slug]`, `/feed.xml`)
use `export const revalidate = 300` — ISR, not `force-dynamic`. Every action
that changes what's publicly visible (`publishAction`, `unpublishAction`,
`deletePostAction`, `scheduleAction`, `addReplyAction`, comment approval,
settings) already calls `revalidatePath` for the affected paths, so changes
show up immediately in the common case; the 300s window is a bound on the
*uncommon* case — specifically a **scheduled** post becoming visible purely
because time passed, which no action call triggers.

`/admin/**` stays `force-dynamic` — always fresh, never cached.

## Database migrations

`drizzle-kit` and `tsx` don't auto-load `.env.local` (only Next.js does), so
scripts run through `dotenv-cli`:

```bash
pnpm db:push     # dotenv -e .env.local -- drizzle-kit push
```

Schema is at `src/lib/db/schema.ts`. Timestamps are epoch-ms stored as
`bigint` (a plain `integer` overflows `Date.now()`); `posts.serial` is an
ordinary column, not the Postgres `serial` type — primary keys use
`generatedByDefaultAsIdentity()` instead.

## Images

`src/lib/storage/index.ts` is the only file that talks to Vercel Blob —
`putImage()` re-encodes to webp (capped at 2000px, quality 82) and uploads
with `access: "public"`; `deleteImage()` removes it. Uploaded URLs
(`*.public.blob.vercel-storage.com`) are stored directly on the `images` row
and rendered as-is — nothing in the app proxies image bytes.

## Known operational limits

- No cron: scheduled-post visibility is computed at read time
  (`publishAt <= now`), bounded by the 300s ISR window above.
- Comments are on but approval-only — nothing submitted publicly is visible
  until an author approves it in `/admin/comments`.
