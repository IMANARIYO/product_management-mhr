"use server";

import { db } from "@/index";
import { creditSales, activityLogs } from "@/db/schema";
import { getSession } from "@/lib/auth-middleware";
import { eq, and, desc } from "drizzle-orm";

export async function makePartialPaymentAction(
  creditId: string,
  paymentAmount: string
) {
  try {
    const session = await getSession();
    if (!session) {
      return { error: "Unauthorized" };
    }

    const [credit] = await db
      .select()
      .from(creditSales)
      .where(eq(creditSales.id, creditId))
      .limit(1);

    if (!credit) {
      return { error: "Credit sale not found" };
    }

    const currentAmount = parseFloat(credit.amountOwed);
    const payment = parseFloat(paymentAmount);
    const newAmount = currentAmount - payment;

    if (payment <= 0) {
      return { error: "Payment amount must be greater than 0" };
    }

    if (payment > currentAmount) {
      return { error: "Payment amount cannot exceed debt amount" };
    }

    // Update credit with new amount
    const updatedCredit = await db
      .update(creditSales)
      .set({
        amountOwed: newAmount.toString(),
        status: newAmount <= 0 ? "PAID" : "UNPAID",
        paidAt: newAmount <= 0 ? new Date() : null,
      })
      .where(eq(creditSales.id, creditId))
      .returning();

    // Log activity
    await db.insert(activityLogs).values({
      userId: session.userId,
      action: newAmount <= 0 ? "CREDIT_PAID" : "CREDIT_PARTIAL_PAYMENT",
      entityType: "CREDIT",
      entityId: creditId,
      details: `Payment of ${paymentAmount} from ${credit.customerName}. Remaining: ${newAmount}`,
    });

    return {
      success: true,
      credit: updatedCredit[0],
      remainingAmount: newAmount,
      fullyPaid: newAmount <= 0,
    };
  } catch (error) {
    console.error("[v0] Partial payment error:", error);
    return { error: "Failed to process payment" };
  }
}

export async function markCreditAsPaidAction(creditId: string) {
  try {
    const session = await getSession();
    if (!session) {
      return { error: "Unauthorized" };
    }

    const [credit] = await db
      .select()
      .from(creditSales)
      .where(eq(creditSales.id, creditId))
      .limit(1);

    if (!credit) {
      return { error: "Credit sale not found" };
    }

    const updatedCredit = await db
      .update(creditSales)
      .set({
        status: "PAID",
        paidAt: new Date(),
      })
      .where(eq(creditSales.id, creditId))
      .returning();

    // Log activity
    await db.insert(activityLogs).values({
      userId: session.userId,
      action: "CREDIT_PAID",
      entityType: "CREDIT",
      entityId: creditId,
      details: `Credit paid: ${credit.amountOwed} from ${credit.customerName}`,
    });

    return { success: true, credit: updatedCredit[0] };
  } catch (error) {
    console.error("[v0] Mark credit as paid error:", error);
    return { error: "Failed to mark credit as paid" };
  }
}

export async function getCreditsAction(
  status: "UNPAID" | "PAID" | "ALL" = "UNPAID",
  page: number = 1,
  limit: number = 20,
  employeeId?: string
) {
  try {
    const session = await getSession();
    if (!session) {
      return { error: "Unauthorized" };
    }

    // Employees can only see their own credits
    const userId = session.role === "EMPLOYEE" ? session.userId : employeeId;

    const whereConditions: Parameters<typeof and>[0][] = [];

    if (status !== "ALL") {
      whereConditions.push(eq(creditSales.status, status));
    }

    if (userId) {
      whereConditions.push(eq(creditSales.doneBy, userId));
    }

    const offset = (page - 1) * limit;

    const allCredits = await db
      .select()
      .from(creditSales)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(creditSales.createdAt));

    const paginatedCredits = await db
      .select()
      .from(creditSales)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(creditSales.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      success: true,
      credits: paginatedCredits,
      total: allCredits.length,
      page,
      limit,
      totalPages: Math.ceil(allCredits.length / limit),
    };
  } catch (error) {
    console.error("[v0] Get credits error:", error);
    return { error: "Failed to fetch credits" };
  }
}
