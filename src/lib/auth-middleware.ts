import { cookies } from "next/headers";
import { verifyJWT } from "./auth";

import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { db } from "..";

export interface SessionUser {
  userId: string;
  phoneNumber: string;
  fullName: string;
  firstName: string;
  email: string;
  role: "ADMIN" | "EMPLOYEE";
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth-token")?.value;

  if (!token) {
    return null;
  }

  const payload = await verifyJWT(token);
  if (!payload) {
    return null;
  }

  const role = payload.role;
  if (role !== "ADMIN" && role !== "EMPLOYEE") {
    return null;
  }
  return {
    userId: payload.userId as string,
    phoneNumber: payload.phoneNumber as string,
    fullName: payload.fullName as string,
    firstName: payload.firstName as string,
    email: payload.email as string,
    role: role as "ADMIN" | "EMPLOYEE",
  };
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;

  const user = await db
    .select({
      id: users.id,
      firstName: users.firstName,
      fullName: users.fullName,
      email: users.email,
      phoneNumber: users.phoneNumber,
      role: users.role,
      status: users.status,
    })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  return user[0] || null;
}

export async function requireAuth(requiredRole?: "ADMIN" | "EMPLOYEE") {
  const session = await getSession();

  if (!session) {
    return null;
  }

  if (
    requiredRole &&
    session.role !== requiredRole &&
    session.role !== "ADMIN"
  ) {
    return null;
  }

  return session;
}
