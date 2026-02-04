"use server";

import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth-middleware";
import { db } from "@/index";

export async function createUser(formData: FormData) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "ADMIN") {
      return {
        success: false,
        toast: {
          title: "Access denied",
          description: "Only admins can create users",
          variant: "destructive",
        },
      };
    }

    const firstName = formData.get("firstName") as string;
    const fullName = formData.get("fullName") as string;
    const email = formData.get("email") as string;
    const phoneNumber = formData.get("phoneNumber") as string;
    const password = formData.get("password") as string;
    const role = formData.get("role") as "ADMIN" | "EMPLOYEE";

    if (!firstName || !fullName || !email || !phoneNumber || !password) {
      return {
        success: false,
        toast: {
          title: "Validation error",
          description: "All fields are required",
          variant: "destructive",
        },
      };
    }

    await db.insert(users).values({
      firstName,
      fullName,
      email,
      phoneNumber,
      password,
      role,
    });

    revalidatePath("/dashboard/users");
    return {
      success: true,
      toast: { title: "Success", description: "User created successfully" },
    };
  } catch (error: unknown) {
    const dbError = error as { code?: string };
    if (dbError.code === "23505") {
      return {
        success: false,
        toast: {
          title: "Error",
          description: "Email or phone number already exists",
          variant: "destructive",
        },
      };
    }
    return {
      success: false,
      toast: {
        title: "Error",
        description: "Failed to create user",
        variant: "destructive",
      },
    };
  }
}

export async function updateUser(formData: FormData) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        toast: {
          title: "Access denied",
          description: "Please log in",
          variant: "destructive",
        },
      };
    }

    const userId = formData.get("userId") as string;
    const firstName = formData.get("firstName") as string;
    const fullName = formData.get("fullName") as string;
    const email = formData.get("email") as string;
    const phoneNumber = formData.get("phoneNumber") as string;
    const role = formData.get("role") as "ADMIN" | "EMPLOYEE";
    const status = formData.get("status") as "ACTIVE" | "DISABLED";

    // Only admin can edit other users or change role/status
    if (
      currentUser.role !== "ADMIN" &&
      (currentUser.id !== userId || role || status)
    ) {
      return {
        success: false,
        toast: {
          title: "Access denied",
          description: "You can only edit your own profile",
          variant: "destructive",
        },
      };
    }

    const updateData: Record<string, unknown> = {
      firstName,
      fullName,
      email,
      phoneNumber,
      updatedAt: new Date(),
    };

    // Add password if provided
    const password = formData.get("password") as string;
    if (password) {
      updateData.password = password;
    }

    // Only admin can change role and status
    if (currentUser.role === "ADMIN") {
      if (role) updateData.role = role;
      if (status) updateData.status = status;
    }

    await db.update(users).set(updateData).where(eq(users.id, userId));

    revalidatePath("/dashboard/users");
    return {
      success: true,
      toast: { title: "Success", description: "User updated successfully" },
    };
  } catch (error: unknown) {
    const dbError = error as { code?: string };
    if (dbError.code === "23505") {
      return {
        success: false,
        toast: {
          title: "Error",
          description: "Email or phone number already exists",
          variant: "destructive",
        },
      };
    }
    return {
      success: false,
      toast: {
        title: "Error",
        description: "Failed to update user",
        variant: "destructive",
      },
    };
  }
}

export async function toggleUserStatus(userId: string) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "ADMIN") {
      return {
        success: false,
        toast: {
          title: "Access denied",
          description: "Only admins can change user status",
          variant: "destructive",
        },
      };
    }

    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user.length) {
      return {
        success: false,
        toast: {
          title: "Error",
          description: "User not found",
          variant: "destructive",
        },
      };
    }

    const newStatus = user[0].status === "ACTIVE" ? "DISABLED" : "ACTIVE";
    await db
      .update(users)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(users.id, userId));

    revalidatePath("/dashboard/users");
    return {
      success: true,
      toast: {
        title: "Success",
        description: `User ${newStatus.toLowerCase()} successfully`,
      },
    };
  } catch (error) {
    console.error("Error toggling user status:", error);
    return {
      success: false,
      toast: {
        title: "Error",
        description: "Failed to update user status",
        variant: "destructive",
      },
    };
  }
}
