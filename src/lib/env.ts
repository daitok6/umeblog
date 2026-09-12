/**
 * Fails loudly at boot in production rather than on the first cookie read or
 * database call. Imported once from the root layout so a misconfigured
 * deploy shows a clear error instead of a mysterious 500 on first use.
 */
export function assertEnv(): void {
  const missing: string[] = [];

  if (!process.env.DATABASE_URL) missing.push("DATABASE_URL");
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
    missing.push("SESSION_SECRET (must be at least 32 characters)");
  }
  if (process.env.NODE_ENV === "production" && !process.env.BLOB_READ_WRITE_TOKEN) {
    missing.push("BLOB_READ_WRITE_TOKEN");
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing or invalid environment variables: ${missing.join(", ")}. See .env.example.`,
    );
  }
}
