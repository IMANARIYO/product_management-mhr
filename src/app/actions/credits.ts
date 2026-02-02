"use server";

import { db } from "@/index";
import { creditSales, products, stocks, stockActions, activityLogs } from "@/db/schema";
import { eq, and, desc, gte, lte, sum } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-middleware";

export async function addCredit(
  productId: string,
  quantity: number,
  customerName: string,
  customerPhone: string,
  amountOwed: string
) {
  try {
    const session = await requireAuth();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const product = await db.query.products.findFirst({
      where: eq(products.id, productId),
    });

    if (!product) {
      return { success: false, error: "Product not found" };
    }

    // Get current stock from stocks table
    const stockResult = await db
      .select({ totalStock: sum(stocks.quantity) })
      .from(stocks)
      .where(eq(stocks.productId, productId));
    
    const currentStock = Number(stockResult[0]?.totalStock) || 0;
    if (currentStock < quantity) {
      return { success: false, error: "Insufficient stock" };
    }

    // Create credit sale record
    const creditRecord = await db
      .insert(creditSales)
      .values({
        customerName,
        customerPhone,
        totalAmount: amountOwed,
        amountOwed,
        doneBy: session.userId,
      })
      .returning();

    // Update stock by inserting negative quantity
    await db.insert(stocks).values({
      productId,
      quantity: -quantity,
      createdBy: session.userId,
    });

    // Log stock action
    await db.insert(stockActions).values({
      productId,
      actionType: "SOLD",
      quantity,
      sellingPrice: amountOwed,
      doneBy: session.userId,
    });

    await db.insert(activityLogs).values({
      userId: session.userId,
      action: "CREDIT_SALE",
      entityType: "CREDIT",
      details: `Credit sale: ${quantity} units of ${product.name} to ${customerName} for ${amountOwed}`,
    });

    return { success: true, credit: creditRecord[0] };
  } catch (error) {
    console.error("[v0] Add credit error:", error);
    return { success: false, error: "Failed to add credit" };
  }
}

export async function payCredit(creditId: string) {
  try {
    const session = await requireAuth();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const credit = await db.query.creditSales.findFirst({
      where: eq(creditSales.id, creditId),
    });

    if (!credit) {
      return { success: false, error: "Credit not found" };
    }

    await db
      .update(creditSales)
      .set({ status: "PAID", paidAt: new Date() })
      .where(eq(creditSales.id, creditId));

    await db.insert(activityLogs).values({
      userId: session.userId,
      action: "CREDIT_PAID",
      entityType: "CREDIT",
      details: `Marked credit ${creditId} as paid (${credit.amountOwed})`,
    });

    return { success: true };
  } catch (error) {
    console.error("[v0] Pay credit error:", error);
    return { success: false, error: "Failed to mark credit as paid" };
  }
}

export async function getCredits(filters?: {
  status?: "UNPAID" | "PAID";
  startDate?: Date;
  endDate?: Date;
  employeeId?: string;
  limit?: number;
  offset?: number;
}) {
  try {
    const session = await requireAuth();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const conditions: Parameters<typeof and>[0][] = [];

    if (filters?.status) {
      conditions.push(eq(creditSales.status, filters.status));
    }

    if (filters?.startDate) {
      conditions.push(gte(creditSales.createdAt, filters.startDate));
    }

    if (filters?.endDate) {
      conditions.push(lte(creditSales.createdAt, filters.endDate));
    }

    if (filters?.employeeId) {
      conditions.push(eq(creditSales.doneBy, filters.employeeId));
    }

    // If employee (not admin), only show their own credits
    if (session.role === "EMPLOYEE") {
      conditions.push(eq(creditSales.doneBy, session.userId));
    }

    let allCredits;
    if (conditions.length > 0) {
      allCredits = await db.query.creditSales.findMany({
        where: and(...conditions),
        with: {
          user: true,
        },
        orderBy: [desc(creditSales.createdAt)],
      });
    } else {
      allCredits = await db.query.creditSales.findMany({
        with: {
          user: true,
        },
        orderBy: [desc(creditSales.createdAt)],
      });
    }

    return { success: true, credits: allCredits };
  } catch (error) {
    console.error("[v0] Get credits error:", error);
    return { success: false, error: "Failed to fetch credits" };
  }
}

export async function getCreditSummary(filters?: {
  startDate?: Date;
  endDate?: Date;
  employeeId?: string;
}) {
  try {
    const conditions: Parameters<typeof and>[0][] = [
      eq(creditSales.status, "UNPAID"),
    ];

    if (filters?.startDate) {
      conditions.push(gte(creditSales.createdAt, filters.startDate));
    }

    if (filters?.endDate) {
      conditions.push(lte(creditSales.createdAt, filters.endDate));
    }

    if (filters?.employeeId) {
      conditions.push(eq(creditSales.doneBy, filters.employeeId));
    }

    const unpaidCredits = await db.query.creditSales.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      with: {
        user: true,
      },
    });

    const totalUnpaid = unpaidCredits.reduce(
      (sum: number, credit: { amountOwed: string }) => {
        return sum + parseFloat(credit.amountOwed);
      },
      0
    );

    return {
      success: true,
      summary: {
        totalUnpaid,
        count: unpaidCredits.length,
        credits: unpaidCredits,
      },
    };
  } catch (error) {
    console.error("[v0] Get credit summary error:", error);
    return { success: false, error: "Failed to fetch credit summary" };
  }
}
