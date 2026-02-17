"use server";

import { getSession } from "@/lib/auth-middleware";
import { activityLogs } from "@/db/schema";
import { db } from "@/index";
import { eq, and, desc, between } from "drizzle-orm";

export async function getActivityLogsAction(
  page: number = 1,
  limit: number = 20,
  userId?: string,
  startDate?: Date,
  endDate?: Date
) {
  console.log("*******************  fetching the ctaiti  logs");
  try {
    const session = await getSession();
    if (!session) {
      return { error: "Unauthorized" };
    }

    // Employees can only see their own activity
    const logUserId = session.role === "EMPLOYEE" ? session.userId : userId;

    const whereConditions: Parameters<typeof and>[0][] = [];

    if (logUserId) {
      whereConditions.push(eq(activityLogs.userId, logUserId));
    }

    if (startDate && endDate) {
      whereConditions.push(between(activityLogs.doneAt, startDate, endDate));
    }

    const offset = (page - 1) * limit;

    const allLogs = await db.query.activityLogs.findMany({
      where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
      orderBy: desc(activityLogs.doneAt),
    });

    const paginatedLogs = await db.query.activityLogs.findMany({
      where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
      orderBy: desc(activityLogs.doneAt),
      limit,
      offset,
      with: {
        user: true,
      },
    });
    console.log(" the logs am getting  ", paginatedLogs);
    return {
      success: true,
      logs: paginatedLogs,
      total: allLogs.length,
      page,
      limit,
      totalPages: Math.ceil(allLogs.length / limit),
    };
  } catch (error) {
    console.error("[v0] Get activity logs error:", error);
    return { error: "Failed to fetch activity logs" };
  }
}

export async function getAdminActivityLogsAction(
  page: number = 1,
  limit: number = 20,
  userId?: string,
  actionType?: string,
  entityType?: string,
  startDate?: Date,
  endDate?: Date
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return { error: "Unauthorized" };
    }

    const whereConditions: Parameters<typeof and>[0][] = [];

    if (userId) {
      whereConditions.push(eq(activityLogs.userId, userId));
    }

    if (actionType) {
      whereConditions.push(eq(activityLogs.action, actionType));
    }

    if (entityType) {
      whereConditions.push(eq(activityLogs.entityType, entityType));
    }

    if (startDate && endDate) {
      whereConditions.push(between(activityLogs.doneAt, startDate, endDate));
    }

    const offset = (page - 1) * limit;

    const allLogs = await db.query.activityLogs.findMany({
      where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
      orderBy: desc(activityLogs.doneAt),
    });

    const paginatedLogs = await db.query.activityLogs.findMany({
      where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
      orderBy: desc(activityLogs.doneAt),
      limit,
      offset,
      with: {
        user: true,
      },
    });

    return {
      success: true,
      logs: paginatedLogs,
      total: allLogs.length,
      page,
      limit,
      totalPages: Math.ceil(allLogs.length / limit),
    };
  } catch (error) {
    console.error(" Get admin activity logs error:", error);
    return { error: "Failed to fetch activity logs" };
  }
}
