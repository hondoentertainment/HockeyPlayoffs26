import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

const COOKIE_NAME = "admin_session";
const MAX_AGE_SECONDS = 60 * 60 * 12; // 12 hours

function secret(): string {
  const s = process.env.ADMIN_COOKIE_SECRET;
  if (!s || s.length < 16) {
    throw new Error(
      "ADMIN_COOKIE_SECRET env var is missing or too short (need 16+ chars)"
    );
  }
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

function makeToken(): string {
  const payload = String(Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS);
  return `${payload}.${sign(payload)}`;
}

function verifyToken(token: string | undefined): boolean {
  if (!token) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  const expected = sign(payload);
  if (
    sig.length !== expected.length ||
    !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  ) {
    return false;
  }
  const expiry = parseInt(payload, 10);
  return Number.isFinite(expiry) && expiry > Math.floor(Date.now() / 1000);
}

export async function isAdmin(): Promise<boolean> {
  const c = cookies().get(COOKIE_NAME)?.value;
  return verifyToken(c);
}

export async function loginAdmin(password: string): Promise<boolean> {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) throw new Error("ADMIN_PASSWORD env var is not set");
  if (password.length !== expected.length) return false;
  if (
    !timingSafeEqual(Buffer.from(password), Buffer.from(expected))
  ) {
    return false;
  }
  cookies().set(COOKIE_NAME, makeToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE_SECONDS,
    path: "/"
  });
  return true;
}

export async function logoutAdmin(): Promise<void> {
  cookies().delete(COOKIE_NAME);
}
