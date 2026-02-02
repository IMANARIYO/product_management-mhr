import { cookies } from "next/headers";
import { verifyJWT } from "./auth";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

export interface SessionUser {
  userId: string;
  phoneNumber: string;
  role: "ADMIN" | "EMPLOYEE";
}

// Generate or retrieve persistent temp user ID
function getTempUserId(): string {
  const tempUserFile = path.join(process.cwd(), ".temp-user-id");

  try {
    if (fs.existsSync(tempUserFile)) {
      return fs.readFileSync(tempUserFile, "utf8").trim();
    }
  } catch (error) {
    console.log("Could not read temp user file, generating new ID", error);
  }

  const newUserId = randomUUID();
  try {
    fs.writeFileSync(tempUserFile, newUserId);
  } catch (error) {
    console.log("Could not save temp user ID, using session-only ID", error);
  }

  return newUserId;
}

const TEMP_USER_ID = getTempUserId();

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
