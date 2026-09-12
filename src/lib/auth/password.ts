import { randomBytes, scrypt as _scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(_scrypt) as (
  password: string,
  salt: string,
  keylen: number,
) => Promise<Buffer>;

const KEYLEN = 64;

/** scrypt via node:crypto — no native dependency, and strong enough for two accounts. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const key = await scrypt(password, salt, KEYLEN);
  return `${salt}:${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, keyHex] = stored.split(":");
  if (!salt || !keyHex) return false;
  const key = await scrypt(password, salt, KEYLEN);
  const expected = Buffer.from(keyHex, "hex");
  if (expected.length !== key.length) return false;
  return timingSafeEqual(key, expected);
}
