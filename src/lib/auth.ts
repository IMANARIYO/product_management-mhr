import bcryptjs from "bcryptjs";
import { jwtVerify, SignJWT } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key-change-this-in-production"
);

export async function hashPassword(password: string): Promise<string> {
  return bcryptjs.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcryptjs.compare(password, hash);
}

import type { JWTPayload } from "jose";

export async function createJWT(payload: JWTPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("24h")
    .sign(JWT_SECRET);
}

export async function verifyJWT(token: string): Promise<JWTPayload | null> {
  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    return verified.payload;
  } catch {
    return null;
  }
}

export async function createSession(
  userId: string,
  phoneNumber: string,
  fullName: string,
  firstName: string,
  email: string,
  role: string
): Promise<string> {
  return createJWT({
    userId,
    phoneNumber,
    fullName,
    firstName,
    email,
    role,
    iat: Date.now(),
  });
}
