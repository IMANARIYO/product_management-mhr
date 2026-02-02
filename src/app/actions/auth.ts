"use server";

import { eq } from "drizzle-orm";
import { cookies } from "next/headers";

import { users, activityLogs } from "@/db/schema";
import { hashPassword, verifyPassword, createSession } from "@/lib/auth";
import { getSession } from "@/lib/auth-middleware";
import { db } from "@/index";

export async function loginUser(phoneNumber: string, password: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.phoneNumber, phoneNumber))
    .limit(1);

  if (!user || user.status === "DISABLED") {
    return { success: false, error: "Invalid phone number or password" };
  }

  const valid = await verifyPassword(password, user.passwordHash);

  if (!valid) {
    return { success: false, error: "Invalid phone number or password" };
  }

  const token = await createSession(user.id, user.phoneNumber, user.role);

  (await cookies()).set("auth-token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24,
  });

  return {
    success: true,
    user: {
      id: user.id,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      role: user.role,
    },
  };
}

export async function logoutUser() {
  (await cookies()).delete("auth-token");
  return { success: true };
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  if (!user || user.status === "DISABLED") return null;

  return {
    id: user.id,
    fullName: user.fullName,
    phoneNumber: user.phoneNumber,
    role: user.role,
  };
}

export async function createUser(
  fullName: string,
  phoneNumber: string,
  password: string,
  role: "ADMIN" | "EMPLOYEE" = "EMPLOYEE"
) {
  const session = await getSession();

  if (!session) {
    return { success: false, error: "Unauthorized" };
  }

  if (session.role !== "ADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.phoneNumber, phoneNumber))
    .limit(1);

  if (existing) {
    return { success: false, error: "Phone number already exists" };
  }

  const passwordHash = await hashPassword(password);

  const [created] = await db
    .insert(users)
    .values({
      fullName,
      phoneNumber,
      passwordHash,
      role,
    })
    .returning();

  // Log activity
  await db.insert(activityLogs).values({
    userId: session.userId,
    action: "CREATE_USER",
    entityType: "USER",
    entityId: created.id,
    details: `Created user: ${fullName} (${role})`,
  });

  return {
    success: true,
    user: {
      id: created.id,
      fullName: created.fullName,
      phoneNumber: created.phoneNumber,
      role: created.role,
    },
  };
}

export async function updateUser(
  userId: string,
  fullName?: string,
  role?: "ADMIN" | "EMPLOYEE"
) {
  const session = await getSession();

  if (!session || session.role !== "ADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  const updates: Record<string, string> = {};
  if (fullName) updates.fullName = fullName;
  if (role) updates.role = role;

  if (Object.keys(updates).length === 0) {
    return { success: false, error: "No updates provided" };
  }

  const [updated] = await db
    .update(users)
    .set(updates)
    .where(eq(users.id, userId))
    .returning();

  // Log activity
  await db.insert(activityLogs).values({
    userId: session.userId,
    action: "UPDATE_USER",
    entityType: "USER",
    entityId: userId,
    details: `Updated user: ${updated.fullName}`,
  });

  return {
    success: true,
    user: {
      id: updated.id,
      fullName: updated.fullName,
      phoneNumber: updated.phoneNumber,
      role: updated.role,
    },
  };
}

export async function disableUser(userId: string) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  await db
    .update(users)
    .set({ status: "DISABLED" })
    .where(eq(users.id, userId));

  // Log activity
  await db.insert(activityLogs).values({
    userId: session.userId,
    action: "DISABLE_USER",
    entityType: "USER",
    entityId: userId,
    details: `Disabled user`,
  });

  return { success: true };
}

export async function enableUser(userId: string) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  await db.update(users).set({ status: "ACTIVE" }).where(eq(users.id, userId));

  // Log activity
  await db.insert(activityLogs).values({
    userId: session.userId,
    action: "ENABLE_USER",
    entityType: "USER",
    entityId: userId,
    details: `Enabled user`,
  });

  return { success: true };
}

export async function getAllUsers() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  const result = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      phoneNumber: users.phoneNumber,
      role: users.role,
      status: users.status,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(users.createdAt);

  return { success: true, users: result };
}
