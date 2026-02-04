"use server";

import { getCurrentUser } from "@/lib/auth-middleware";

export async function getCurrentUserAction() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }
    return { success: true, user };
  } catch (error) {
    return { success: false, error: "Failed to get user data" };
  }
}