"use server";

import { db } from "@/index";
import {
  products,
  stocks,
  creditSales,
  creditSaleItems,
  stockActions,
  activityLogs,
} from "@/db/schema";
import { getSession } from "@/lib/auth-middleware";
import { eq, and, desc, sum } from "drizzle-orm";

interface CreditItem {
  productId: string;
  quantity: number;
}

export async function createCreditSaleAction(
  customerName: string,
  items: CreditItem[]
) {
  try {
    const session = await getSession();
    if (!session) {
      return { error: "Unauthorized" };
    }

    if (!items || items.length === 0) {
      return { error: "At least one product is required" };
    }

    // Get product details and calculate total
    let totalAmount = 0;
    const itemsWithPrices = [];

    for (const item of items) {
      const product = await db.query.products.findFirst({
        where: eq(products.id, item.productId),
      });

      if (!product) {
        return { error: `Product not found: ${item.productId}` };
      }

      // Get current stock from stocks table
      const stockResult = await db
        .select({ totalStock: sum(stocks.quantity) })
        .from(stocks)
        .where(eq(stocks.productId, item.productId));
      
      const currentStock = Number(stockResult[0]?.totalStock) || 0;
      if (currentStock < item.quantity) {
        return {
          error: `Insufficient stock for ${product.name}. Available: ${currentStock}`,
        };
      }

      const unitPrice = parseFloat(product.sellingPrice);
      const totalPrice = unitPrice * item.quantity;
      totalAmount += totalPrice;

      itemsWithPrices.push({
        ...item,
        unitPrice,
        totalPrice,
        product,
      });
    }

    // Create credit sale header
    const newCredit = await db
      .insert(creditSales)
      .values({
        customerName,
        totalAmount: totalAmount.toString(),
        amountOwed: totalAmount.toString(),
        doneBy: session.userId,
      })
      .returning();

    const creditId = newCredit[0].id;

    // Create credit sale items and update stock
    for (const item of itemsWithPrices) {
      // Insert credit sale item
      await db.insert(creditSaleItems).values({
        creditSaleId: creditId,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toString(),
        totalPrice: item.totalPrice.toString(),
      });

      // Update stock by inserting negative quantity
      await db.insert(stocks).values({
        productId: item.productId,
        quantity: -item.quantity,
        createdBy: session.userId,
      });

      // Create stock action record
      await db.insert(stockActions).values({
        productId: item.productId,
        actionType: "SOLD",
        quantity: item.quantity,
        sellingPrice: item.unitPrice.toString(),
        doneBy: session.userId,
      });
    }

    // Log activity
    await db.insert(activityLogs).values({
      userId: session.userId,
      action: "CREDIT_SALE",
      entityType: "CREDIT",
      entityId: creditId,
      details: `Credit sale to ${customerName}, Total: ${totalAmount}, Items: ${items.length}`,
    });

    return { success: true, credit: newCredit[0] };
  } catch (error) {
    console.error("[v0] Create credit sale error:", error);
    return { error: "Failed to create credit sale" };
  }
}

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
