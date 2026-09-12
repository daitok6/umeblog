import { pgTable, text, integer, bigint, boolean, primaryKey, index } from "drizzle-orm/pg-core";

/**
 * Postgres (Neon) schema. Timestamps are epoch-millisecond integers stored as
 * `bigint` — a plain `integer` column tops out at ~2.1e9 and `Date.now()` is
 * already past that, so this must be bigint from the start, not int4.
 *
 * `posts.serial` is an ordinary business column (the public "No. 047"), not
 * the Postgres `serial` pseudo-type — the primary keys below use
 * `generatedByDefaultAsIdentity()` instead so the two never collide.
 */

export const users = pgTable("users", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  /** 'author' writes posts. 'reader' is a trusted reader who may reply. */
  role: text("role", { enum: ["author", "reader"] }).notNull().default("reader"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const images = pgTable("images", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  /** Blob pathname — used to delete the object from the store. */
  filename: text("filename").notNull(),
  /** Public Vercel Blob URL. Served directly; nothing proxies it. */
  url: text("url").notNull().default(""),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  mime: text("mime").notNull(),
  size: integer("size").notNull(),
  alt: text("alt").notNull().default(""),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const posts = pgTable(
  "posts",
  {
    id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
    /** Display number. Assigned on FIRST publish only, never reused. Null while unpublished. */
    serial: integer("serial"),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull().default(""),
    /** One-line standfirst. The research found this is what turns a diary entry into a readable post. */
    lead: text("lead").notNull().default(""),
    /** BlockNote document, JSON-encoded. */
    contentJson: text("content_json").notNull().default("[]"),
    coverImageId: integer("cover_image_id").references(() => images.id),
    status: text("status", {
      enum: ["draft", "in_review", "scheduled", "published"],
    })
      .notNull()
      .default("draft"),
    /** For scheduled posts. Public queries filter on this, so no cron is needed. */
    publishAt: bigint("publish_at", { mode: "number" }),
    publishedAt: bigint("published_at", { mode: "number" }),
    /** The photo + one line format. First-class, not a lesser post. */
    isTiny: boolean("is_tiny").notNull().default(false),
    /**
     * The one stored counter in this codebase — everything in stats.ts is
     * deliberately DERIVED rather than stored, but a view leaves no other
     * trace anywhere in the database, so there is nothing to derive it from.
     * Incremented via `recordView()`, never read back into stats.ts; it
     * exists only to order the "よく読まれている" rail on the home page.
     */
    views: integer("views").notNull().default(0),
    authorId: integer("author_id")
      .notNull()
      .references(() => users.id),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  },
  (t) => [
    index("posts_status_idx").on(t.status),
    index("posts_published_idx").on(t.publishedAt),
    index("posts_views_idx").on(t.views),
  ],
);

export const tags = pgTable("tags", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
});

export const postTags = pgTable(
  "post_tags",
  {
    postId: integer("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
    tagId: integer("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.postId, t.tagId] })],
);

/** A trusted reader's written reply. This is the motivation engine. */
export const replies = pgTable(
  "replies",
  {
    id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
    postId: integer("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
    userId: integer("user_id").notNull().references(() => users.id),
    body: text("body").notNull(),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (t) => [index("replies_post_idx").on(t.postId)],
);

/** Public comments. Always land pending; invisible until approved. */
export const comments = pgTable(
  "comments",
  {
    id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
    postId: integer("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
    authorName: text("author_name").notNull(),
    body: text("body").notNull(),
    status: text("status", { enum: ["pending", "approved", "rejected", "spam"] })
      .notNull()
      .default("pending"),
    ipHash: text("ip_hash").notNull().default(""),
    flaggedReason: text("flagged_reason").notNull().default(""),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (t) => [index("comments_status_idx").on(t.status)],
);

export const blockedWords = pgTable("blocked_words", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  word: text("word").notNull().unique(),
});

/** Failed and successful login attempts, for DB-backed rate limiting (serverless has no shared memory). */
export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
    ipHash: text("ip_hash").notNull(),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (t) => [index("login_attempts_ip_idx").on(t.ipHash, t.createdAt)],
);

export const siteSettings = pgTable("site_settings", {
  id: integer("id").primaryKey(),
  title: text("title").notNull().default("うめ"),
  /** Header wordmark. Empty means "use `title`", so an untouched blog looks unchanged. */
  bannerTitle: text("banner_title").notNull().default(""),
  /**
   * Narrow-viewport override for `title`. Empty means "use `title`" — same
   * inherit-when-empty convention as bannerTitle. Visible UI only: metadata,
   * OG tags and the RSS feed always use `title`, since they render without a
   * viewport to key off.
   */
  titleMobile: text("title_mobile").notNull().default(""),
  /** Narrow-viewport override for `bannerTitle`. Empty means "use the resolved banner title". */
  bannerTitleMobile: text("banner_title_mobile").notNull().default(""),
  tagline: text("tagline").notNull().default(""),
  aboutMd: text("about_md").notNull().default(""),
  /**
   * JSON-encoded RailConfig[] (see src/lib/rails.ts) — which rails the home
   * page shows, and in what order. Empty means "use DEFAULT_RAILS", the same
   * empty-means-inherit convention as bannerTitle above.
   */
  railsJson: text("rails_json").notNull().default(""),
});

export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
export type User = typeof users.$inferSelect;
export type Tag = typeof tags.$inferSelect;
export type Reply = typeof replies.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type ImageRow = typeof images.$inferSelect;
export type SiteSettings = typeof siteSettings.$inferSelect;
