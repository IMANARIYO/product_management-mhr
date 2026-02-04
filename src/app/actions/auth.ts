"use server";

import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSession } from "@/lib/auth";
import { db } from "@/index";

export async function loginUser(formData: FormData) {
  try {
    const phoneNumber = formData.get("phoneNumber") as string;
    const password = formData.get("password") as string;

    if (!phoneNumber || !password) {
      return { success: false, error: "Phone number and password are required" };
    }

    const user = await db
      .select()
      .from(users)
      .where(eq(users.phoneNumber, phoneNumber))
      .limit(1);

    if (!user.length || user[0].status === "DISABLED" || user[0].password !== password) {
      return { success: false, error: "Invalid credentials or account disabled" };
    }

    const userData = user[0];
    const token = await createSession(
      userData.id,
      userData.phoneNumber,
      userData.fullName,
      userData.firstName,
      userData.email,
      userData.role
    );

    const cookieStore = await cookies();
    cookieStore.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return { success: true };
  } catch (error) {
    console.error("Login error:", error);
    return { success: false, error: "Login failed" };
  }
}

export async function logoutUser() {
  const cookieStore = await cookies();
  cookieStore.delete("auth-token");
  redirect("/login");
}
