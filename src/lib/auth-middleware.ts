import { cookies } from "next/headers";
import { verifyJWT } from "./auth";

export interface SessionUser {
  userId: string;
  phoneNumber: string;
  fullName: string;
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
    role: role as "ADMIN" | "EMPLOYEE",
  };
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
