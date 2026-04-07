"use server";

import { getCurrentUser } from "@/lib/auth-middleware";
import { db } from "@/index";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getCurrentUserAction() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }
    return { success: true, user };
  } catch (error) {
    console.error("Get user error:", error);
    return { success: false, error: "Failed to get user data" };
  }
}

export async function updatePassword(
  currentPassword: string,
  newPassword: string
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Get user from database
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser) {
      return { success: false, error: "User not found" };
    }

    // Verify current password (plain text comparison)
    if (dbUser.password !== currentPassword) {
      return { success: false, error: "Current password is incorrect" };
    }

    // Update password
    await db
      .update(users)
      .set({ password: newPassword, updatedAt: new Date() })
      .where(eq(users.id, user.id));

    return { success: true, message: "Password updated successfully" };
  } catch (error) {
    console.error("Update password error:", error);
    return { success: false, error: "Failed to update password" };
  }
}
