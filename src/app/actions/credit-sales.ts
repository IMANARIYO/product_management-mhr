"use server";

import { db } from "@/index";
import {
  stockDays,
  dailyStockSnapshots,
  products,
  stocks,
  creditSales,
  creditSaleItems,
  stockActions,
  activityLogs,
} from "@/db/schema";
import { eq, sum, and } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-middleware";

interface CreditSaleItem {
  productId: string;
  quantity: number;
}

interface CreditSaleData {
  customerName: string;
  customerPhone: string;
  customerId?: string;
  items: CreditSaleItem[];
}

export async function createCreditSale(data: CreditSaleData) {
  const session = await requireAuth();
  if (!session) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    return await db.transaction(async (tx) => {
      // STEP 1: Validate Stock Day
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const stockDay = await tx.query.stockDays.findFirst({
        where: eq(stockDays.businessDate, today),
      });

      if (!stockDay) {
        throw new Error("No stock day found for today. Initialize stock day first.");
      }

      if (stockDay.status !== "VERIFIED") {
        throw new Error(`Stock day status is ${stockDay.status}. Credit sales only allowed on VERIFIED stock days.`);
      }

      // STEP 2: Validate Customer & Sale Input
      if (!data.customerName.trim()) {
        throw new Error("Customer name is required");
      }

      if (!data.customerPhone.trim()) {
        throw new Error("Customer phone is required");
      }

      if (!data.items || data.items.length === 0) {
        throw new Error("At least one product must be selected");
      }

      for (const item of data.items) {
        if (item.quantity <= 0) {
          throw new Error("Quantity must be greater than 0");
        }
      }

      // STEP 3: Validate Stock Availability & Product Status
      const productValidations = [];
      let totalAmount = 0;

      for (const item of data.items) {
        // Check product exists and is active
        const product = await tx.query.products.findFirst({
          where: eq(products.id, item.productId),
        });

        if (!product) {
          throw new Error(`Product not found: ${item.productId}`);
        }

        if (product.status !== "ACTIVE") {
          throw new Error(`Product ${product.name} is not active`);
        }

        // Check stock availability
        const stockResult = await tx
          .select({ total: sum(stocks.quantity) })
          .from(stocks)
          .where(eq(stocks.productId, item.productId));

        const currentStock = Number(stockResult[0]?.total || 0);

        if (currentStock < item.quantity) {
          throw new Error(`Insufficient stock for ${product.name}. Available: ${currentStock}, Requested: ${item.quantity}`);
        }

        // Check daily snapshot exists
        const snapshot = await tx.query.dailyStockSnapshots.findFirst({
          where: and(
            eq(dailyStockSnapshots.stockDayId, stockDay.id),
            eq(dailyStockSnapshots.productId, item.productId)
          ),
        });

        if (!snapshot) {
          throw new Error(`Daily snapshot not found for product ${product.name}. Initialize stock day properly.`);
        }

        const itemTotal = Number(product.sellingPrice) * item.quantity;
        totalAmount += itemTotal;

        productValidations.push({
          product,
          item,
          snapshot,
          currentStock,
          itemTotal,
        });
      }

      // STEP 4: Create Credit Sale Header
      const [creditSale] = await tx
        .insert(creditSales)
        .values({
          customerId: data.customerId,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          totalAmount: totalAmount.toString(),
          amountOwed: totalAmount.toString(),
          status: "UNPAID",
          doneBy: session.userId,
        })
        .returning();

      // STEP 5: Create Credit Sale Items
      const creditSaleItemsData = productValidations.map(({ product, item }) => ({
        creditSaleId: creditSale.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: product.sellingPrice,
        totalPrice: (Number(product.sellingPrice) * item.quantity).toString(),
      }));

      await tx.insert(creditSaleItems).values(creditSaleItemsData);

      // STEP 6 & 7: Update Stock & Create Stock Actions
      for (const { product, item, currentStock } of productValidations) {
        // Update stock table (reduce quantity)
        await tx.insert(stocks).values({
          productId: item.productId,
          quantity: -item.quantity,
          createdBy: session.userId,
        });

        // Create stock action audit record
        await tx.insert(stockActions).values({
          productId: item.productId,
          actionType: "SOLD",
          quantity: item.quantity,
          sellingPrice: product.sellingPrice,
          doneBy: session.userId,
        });
      }

      // STEP 8: Update Daily Snapshots
      for (const { item, snapshot } of productValidations) {
        const newStockOut = snapshot.stockOut + item.quantity;
        const newClosingStock = snapshot.closingStock - item.quantity;

        await tx
          .update(dailyStockSnapshots)
          .set({
            stockOut: newStockOut,
            closingStock: newClosingStock,
            isOutOfStock: newClosingStock <= 0 ? 1 : 0,
            updatedAt: new Date(),
          })
          .where(eq(dailyStockSnapshots.id, snapshot.id));
      }

      // STEP 9: Log Activity
      await tx.insert(activityLogs).values({
        userId: session.userId,
        action: "CREDIT_SALE_CREATED",
        entityType: "CREDIT",
        entityId: creditSale.id,
        details: `Credit sale to ${data.customerName} (${data.customerPhone}) - ${data.items.length} items, Total: $${totalAmount.toFixed(2)}`,
      });

      return {
        success: true,
        creditSale,
        message: `Credit sale created successfully. Total: $${totalAmount.toFixed(2)}`,
      };
    });
  } catch (error) {
    console.error("[CREDIT_SALE_ERROR]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create credit sale",
    };
  }
}

export async function getCreditSales(filters?: {
  status?: "UNPAID" | "PAID";
  customerId?: string;
  employeeId?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  const session = await requireAuth();
  if (!session) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const conditions: Parameters<typeof and>[0][] = [];

    if (filters?.status) {
      conditions.push(eq(creditSales.status, filters.status));
    }

    if (filters?.customerId) {
      conditions.push(eq(creditSales.customerId, filters.customerId));
    }

    if (filters?.employeeId) {
      conditions.push(eq(creditSales.doneBy, filters.employeeId));
    }

    // Employee can only see their own credit sales
    if (session.role === "EMPLOYEE") {
      conditions.push(eq(creditSales.doneBy, session.userId));
    }

    const creditSalesData = await db.query.creditSales.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      with: {
        items: {
          with: {
            product: true,
          },
        },
        user: true,
      },
      orderBy: (creditSales, { desc }) => [desc(creditSales.createdAt)],
    });

    return { success: true, creditSales: creditSalesData };
  } catch (error) {
    console.error("[GET_CREDIT_SALES_ERROR]", error);
    return { success: false, error: "Failed to fetch credit sales" };
  }
}

export async function payCreditSale(creditSaleId: string) {
  const session = await requireAuth();
  if (!session) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    return await db.transaction(async (tx) => {
      const creditSale = await tx.query.creditSales.findFirst({
        where: eq(creditSales.id, creditSaleId),
        with: {
          items: {
            with: {
              product: true,
            },
          },
        },
      });

      if (!creditSale) {
        throw new Error("Credit sale not found");
      }

      if (creditSale.status === "PAID") {
        throw new Error("Credit sale is already paid");
      }

      // Employee can only pay their own credit sales
      if (session.role === "EMPLOYEE" && creditSale.doneBy !== session.userId) {
        throw new Error("You can only mark your own credit sales as paid");
      }

      await tx
        .update(creditSales)
        .set({
          status: "PAID",
          paidAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(creditSales.id, creditSaleId));

      await tx.insert(activityLogs).values({
        userId: session.userId,
        action: "CREDIT_PAID",
        entityType: "CREDIT",
        entityId: creditSaleId,
        details: `Credit sale marked as paid - Customer: ${creditSale.customerName}, Amount: $${creditSale.totalAmount}`,
      });

      return {
        success: true,
        message: `Credit sale marked as paid: $${creditSale.totalAmount}`,
      };
    });
  } catch (error) {
    console.error("[PAY_CREDIT_SALE_ERROR]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to mark credit sale as paid",
    };
  }
}