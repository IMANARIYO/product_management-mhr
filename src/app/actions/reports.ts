"use server";

import { eq, and, desc, gte, lte } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-middleware";
import { activityLogs, stockActions } from "@/db/schema";
import { db } from "@/index";

export async function getActivityReport(filters?: {
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  actionType?: string;
  limit?: number;
  offset?: number;
}) {
  try {
    const session = await requireAuth();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const conditions: Parameters<typeof and>[0][] = [];

    if (filters?.startDate) {
      conditions.push(gte(activityLogs.doneAt, filters.startDate));
    }

    if (filters?.endDate) {
      conditions.push(lte(activityLogs.doneAt, filters.endDate));
    }

    if (filters?.userId) {
      conditions.push(eq(activityLogs.userId, filters.userId));
    }

    if (filters?.actionType) {
      conditions.push(eq(activityLogs.action, filters.actionType));
    }

    // Employee can only see their own activity
    if (session.role === "EMPLOYEE") {
      conditions.push(eq(activityLogs.userId, session.userId));
    }

    let logs;
    if (conditions.length > 0) {
      logs = await db.query.activityLogs.findMany({
        where: and(...conditions),
        with: {
          user: true,
        },
        orderBy: [desc(activityLogs.doneAt)],
        limit: filters?.limit || 100,
        offset: filters?.offset || 0,
      });
    } else {
      logs = await db.query.activityLogs.findMany({
        with: {
          user: true,
        },
        orderBy: [desc(activityLogs.doneAt)],
        limit: filters?.limit || 100,
        offset: filters?.offset || 0,
      });
    }

    return { success: true, logs };
  } catch (error) {
    console.error("[v0] Get activity report error:", error);
    return { success: false, error: "Failed to fetch activity report" };
  }
}

export async function getStockReport(filters?: {
  startDate?: Date;
  endDate?: Date;
  productId?: string;
  actionType?: "STOCK_IN" | "SOLD" | "BROKEN" | "COUNTED";
  employeeId?: string;
}) {
  try {
    const session = await requireAuth();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const conditions: Parameters<typeof and>[0][] = [];

    if (filters?.startDate) {
      conditions.push(gte(stockActions.doneAt, filters.startDate));
    }

    if (filters?.endDate) {
      conditions.push(lte(stockActions.doneAt, filters.endDate));
    }

    if (filters?.productId) {
      conditions.push(eq(stockActions.productId, filters.productId));
    }

    if (filters?.actionType) {
      conditions.push(eq(stockActions.actionType, filters.actionType));
    }

    if (filters?.employeeId) {
      conditions.push(eq(stockActions.doneBy, filters.employeeId));
    }

    // Employee can only see their own stock actions
    if (session.role === "EMPLOYEE") {
      conditions.push(eq(stockActions.doneBy, session.userId));
    }

    let report;
    if (conditions.length > 0) {
      report = await db.query.stockActions.findMany({
        where: and(...conditions),
        with: {
          product: true,
          user: true,
        },
        orderBy: [desc(stockActions.doneAt)],
      });
    } else {
      report = await db.query.stockActions.findMany({
        with: {
          product: true,
          user: true,
        },
        orderBy: [desc(stockActions.doneAt)],
      });
    }

    return { success: true, report };
  } catch (error) {
    console.error("[v0] Get stock report error:", error);
    return { success: false, error: "Failed to fetch stock report" };
  }
}

export async function getSalesReport(filters?: {
  startDate?: Date;
  endDate?: Date;
  employeeId?: string;
}) {
  try {
    const session = await requireAuth();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const conditions: Parameters<typeof and>[0][] = [
      eq(stockActions.actionType, "SOLD"),
    ];

    if (filters?.startDate) {
      conditions.push(gte(stockActions.doneAt, filters.startDate));
    }

    if (filters?.endDate) {
      conditions.push(lte(stockActions.doneAt, filters.endDate));
    }

    if (filters?.employeeId) {
      conditions.push(eq(stockActions.doneBy, filters.employeeId));
    }

    // Employee can only see their own sales
    if (session.role === "EMPLOYEE") {
      conditions.push(eq(stockActions.doneBy, session.userId));
    }

    const sales = await db.query.stockActions.findMany({
      where: and(...conditions),
      with: {
        product: true,
        user: true,
      },
      orderBy: [desc(stockActions.doneAt)],
    });

    let totalRevenue = 0;
    sales.forEach((sale) => {
      if (sale.sellingPrice) {
        totalRevenue += parseFloat(sale.sellingPrice) * sale.quantity;
      }
    });
    console.log("the sales report", sales);

    return { success: true, report: sales, totalRevenue };
  } catch (error) {
    console.error("[v0] Get sales report error:", error);
    return { success: false, error: "Failed to fetch sales report" };
  }
}

export async function getLossReport(filters?: {
  startDate?: Date;
  endDate?: Date;
  employeeId?: string;
}) {
  try {
    const session = await requireAuth();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const conditions: Parameters<typeof and>[0][] = [
      eq(stockActions.actionType, "BROKEN"),
    ];

    if (filters?.startDate) {
      conditions.push(gte(stockActions.doneAt, filters.startDate));
    }

    if (filters?.endDate) {
      conditions.push(lte(stockActions.doneAt, filters.endDate));
    }

    if (filters?.employeeId) {
      conditions.push(eq(stockActions.doneBy, filters.employeeId));
    }

    // Employee can only see their own losses
    if (session.role === "EMPLOYEE") {
      conditions.push(eq(stockActions.doneBy, session.userId));
    }

    const losses = await db.query.stockActions.findMany({
      where: and(...conditions),
      with: {
        product: true,
        user: true,
      },
      orderBy: [desc(stockActions.doneAt)],
    });

    return { success: true, report: losses };
  } catch (error) {
    console.error("[v0] Get loss report error:", error);
    return { success: false, error: "Failed to fetch loss report" };
  }
}

export async function getStockCountReport(filters?: {
  startDate?: Date;
  endDate?: Date;
  productId?: string;
  employeeId?: string;
}) {
  try {
    const session = await requireAuth();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const conditions: Parameters<typeof and>[0][] = [
      eq(stockActions.actionType, "COUNTED"),
    ];

    if (filters?.startDate) {
      conditions.push(gte(stockActions.doneAt, filters.startDate));
    }

    if (filters?.endDate) {
      conditions.push(lte(stockActions.doneAt, filters.endDate));
    }

    if (filters?.productId) {
      conditions.push(eq(stockActions.productId, filters.productId));
    }

    if (filters?.employeeId) {
      conditions.push(eq(stockActions.doneBy, filters.employeeId));
    }

    // Employee can only see their own counts
    if (session.role === "EMPLOYEE") {
      conditions.push(eq(stockActions.doneBy, session.userId));
    }

    const counts = await db.query.stockActions.findMany({
      where: and(...conditions),
      with: {
        product: true,
        user: true,
      },
      orderBy: [desc(stockActions.doneAt)],
    });

    return { success: true, report: counts };
  } catch (error) {
    console.error("[v0] Get stock count report error:", error);
    return { success: false, error: "Failed to fetch stock count report" };
  }
}
