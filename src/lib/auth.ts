import { cookies } from "next/headers";
import { cache } from "react";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { db } from "./db";

export const SESSION_COOKIE = "orlando_session";
const SESSION_DAYS = 30;

export async function verifyCredentials(username: string, password: string) {
  const user = await db.user.findUnique({ where: { username } });
  if (!user) {
    // hash de sacrifício pra resposta ter tempo parecido com e sem usuário
    await bcrypt.compare(password, "$2a$10$CwTycUXWue0Thq9StjUM0uJ8ZzP0Fkz1Gp5o5nWnFOSiZ0uAmM8K6");
    return null;
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  return ok ? user : null;
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.session.create({ data: { id: token, userId, expiresAt } });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export const getSession = cache(async () => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { id: token },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  return session;
});

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session.delete({ where: { id: token } }).catch(() => {});
  }
  store.delete(SESSION_COOKIE);
}
