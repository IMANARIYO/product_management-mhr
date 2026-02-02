"use server";

import { desc } from "drizzle-orm";
import { getSession } from "@/lib/auth-middleware";
import { users } from "@/db/schema";
import { db } from "@/index";

export async function getUsersAction(page: number = 1, limit: number = 20) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return { error: "Unauthorized" };
    }

    const offset = (page - 1) * limit;

    const allUsers = await db.query.users.findMany({
      orderBy: desc(users.createdAt),
    });

    const paginatedUsers = await db.query.users.findMany({
      orderBy: desc(users.createdAt),
      limit,
      offset,
    });

    return {
      success: true,
      users: paginatedUsers,
      total: allUsers.length,
      page,
      limit,
      totalPages: Math.ceil(allUsers.length / limit),
    };
  } catch (error) {
    console.error("[v0] Get users error:", error);
    return { error: "Failed to fetch users" };
  }
}
