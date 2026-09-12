import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

/**
 * Lazy client. `neon()` throws if DATABASE_URL is unset, and Next evaluates
 * module top-level code at build time — a module-scope client would crash
 * `next build` on the very first deploy, before the env var exists.
 */
let _db: ReturnType<typeof drizzle<typeof schema>> | undefined;

function getDb() {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set. See .env.example.");
    _db = drizzle(neon(url), { schema });
  }
  return _db;
}

/**
 * `db` reads as a plain drizzle instance to every call site (`db.query...`,
 * `db.insert(...)`, etc.) but resolves the real client lazily on first
 * property access. Function properties are bound to the real instance so
 * `this` inside drizzle's own methods is never the proxy — a bare
 * `Reflect.get(getDb(), prop, receiver)` would leak the proxy as `this` and
 * break internal state. (Unlike a db passed into a third-party auth adapter
 * that introspects the object itself, nothing here does that, so this stays
 * safe where that pattern generally isn't.)
 */
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    const real = getDb();
    const value = Reflect.get(real, prop);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export { schema };
