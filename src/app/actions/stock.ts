"use server";

import { products, stocks, stockActions, activityLogs } from "@/db/schema";
import { db } from "@/index";
import { getSession } from "@/lib/auth-middleware";
import { eq, and, desc, between, sum } from "drizzle-orm";

export async function addStockAction(
  productId: string,
  quantity: number,
  supplier?: string
) {
  try {
    const session = await getSession();
    if (!session) {
      return { error: "Unauthorized" };
    }

    const product = await db.query.products.findFirst({
      where: eq(products.id, productId),
    });

    if (!product) {
      return { error: "Product not found" };
    }

    // Add to stocks table
    await db.insert(stocks).values({
      productId,
      quantity,
      createdBy: session.userId,
    });

    // Create stock action record
    const newAction = await db
      .insert(stockActions)
      .values({
        productId,
        actionType: "STOCK_IN",
        quantity,
        supplier,
        doneBy: session.userId,
      })
      .returning();

    // Log activity
    await db.insert(activityLogs).values({
      userId: session.userId,
      action: "STOCK_IN",
      entityType: "STOCK",
      entityId: productId,
      details: `Added ${quantity} units from ${supplier || "unknown supplier"}`,
    });

    return { success: true, action: newAction[0] };
  } catch (error) {
    console.error("Add stock error:", error);
    return { error: "Failed to add stock" };
  }
}

export async function sellProductAction(
  productId: string,
  quantity: number
) {
  try {
    const session = await getSession();
    if (!session) {
      return { error: "Unauthorized" };
    }

    const product = await db.query.products.findFirst({
      where: eq(products.id, productId),
    });

    if (!product) {
      return { error: "Product not found" };
    }

    // Get current stock from stocks table
    const stockResult = await db
      .select({ total: sum(stocks.quantity) })
      .from(stocks)
      .where(eq(stocks.productId, productId));
    
    const currentStock = Number(stockResult[0]?.total || 0);

    if (currentStock < quantity) {
      return { error: `Insufficient stock. Available: ${currentStock}` };
    }

    // Record the sale as negative stock
    await db.insert(stocks).values({
      productId,
      quantity: -quantity,
      createdBy: session.userId,
    });

    // Create stock action record
    const newAction = await db
      .insert(stockActions)
      .values({
        productId,
        actionType: "SOLD",
        quantity,
        sellingPrice: product.sellingPrice,
        doneBy: session.userId,
      })
      .returning();

    // Log activity
    await db.insert(activityLogs).values({
      userId: session.userId,
      action: "SOLD",
      entityType: "STOCK",
      entityId: productId,
      details: `Sold ${quantity} units at ${product.sellingPrice} per unit`,
    });

    return { success: true, action: newAction[0] };
  } catch (error) {
    console.error("Sell product error:", error);
    return { error: "Failed to sell product" };
  }
}

export async function recordBrokenAction(
  productId: string,
  quantity: number,
  reason: string
) {
  try {
    const session = await getSession();
    if (!session) {
      return { error: "Unauthorized" };
    }

    const product = await db.query.products.findFirst({
      where: eq(products.id, productId),
    });

    if (!product) {
      return { error: "Product not found" };
    }

    // Get current stock from stocks table
    const stockResult = await db
      .select({ total: sum(stocks.quantity) })
      .from(stocks)
      .where(eq(stocks.productId, productId));
    
    const currentStock = Number(stockResult[0]?.total || 0);

    if (currentStock < quantity) {
      return { error: `Insufficient stock. Available: ${currentStock}` };
    }

    // Record the breakage as negative stock
    await db.insert(stocks).values({
      productId,
      quantity: -quantity,
      createdBy: session.userId,
    });

    // Create stock action record
    const newAction = await db
      .insert(stockActions)
      .values({
        productId,
        actionType: "BROKEN",
        quantity,
        reason,
        doneBy: session.userId,
      })
      .returning();

    // Log activity
    await db.insert(activityLogs).values({
      userId: session.userId,
      action: "BROKEN",
      entityType: "STOCK",
      entityId: productId,
      details: `Recorded ${quantity} broken units. Reason: ${reason}`,
    });

    return { success: true, action: newAction[0] };
  } catch (error) {
    console.error("Record broken error:", error);
    return { error: "Failed to record broken stock" };
  }
}

export async function countStockAction(
  productId: string,
  countedQuantity: number
) {
  try {
    const session = await getSession();
    if (!session) {
      return { error: "Unauthorized" };
    }

    const product = await db.query.products.findFirst({
      where: eq(products.id, productId),
    });

    if (!product) {
      return { error: "Product not found" };
    }

    // Get current stock from stocks table
    const stockResult = await db
      .select({ total: sum(stocks.quantity) })
      .from(stocks)
      .where(eq(stocks.productId, productId));
    
    const systemQuantity = Number(stockResult[0]?.total || 0);
    const difference = countedQuantity - systemQuantity;

    // Add stock adjustment if there's a difference
    if (difference !== 0) {
      await db.insert(stocks).values({
        productId,
        quantity: difference,
        createdBy: session.userId,
      });
    }

    // Create stock action record
    const newAction = await db
      .insert(stockActions)
      .values({
        productId,
        actionType: "COUNTED",
        quantity: countedQuantity,
        reason: `System: ${systemQuantity}, Counted: ${countedQuantity}, Difference: ${difference}`,
        doneBy: session.userId,
      })
      .returning();

    // Log activity
    await db.insert(activityLogs).values({
      userId: session.userId,
      action: "COUNTED",
      entityType: "STOCK",
      entityId: productId,
      details: `Stock count: System=${systemQuantity}, Counted=${countedQuantity}, Difference=${difference}`,
    });

    return { success: true, action: newAction[0], difference };
  } catch (error) {
    console.error("Count stock error:", error);
    return { error: "Failed to count stock" };
  }
}

export async function getStockActionsAction(
  productId?: string,
  actionType?: "STOCK_IN" | "SOLD" | "BROKEN" | "COUNTED",
  page: number = 1,
  limit: number = 20,
  startDate?: Date,
  endDate?: Date
) {
  try {
    const session = await getSession();
    if (!session) {
      return { error: "Unauthorized" };
    }

    const whereConditions: Parameters<typeof and>[0][] = [];

    if (productId) {
      whereConditions.push(eq(stockActions.productId, productId));
    }

    if (actionType) {
      whereConditions.push(eq(stockActions.actionType, actionType));
    }

    if (startDate && endDate) {
      whereConditions.push(between(stockActions.doneAt, startDate, endDate));
    }

    const offset = (page - 1) * limit;

    const allActions = await db.query.stockActions.findMany({
      where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
      orderBy: desc(stockActions.doneAt),
    });

    const paginatedActions = await db.query.stockActions.findMany({
      where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
      orderBy: desc(stockActions.doneAt),
      limit,
      offset,
      with: {
        product: true,
        user: true,
      },
    });

    return {
      success: true,
      actions: paginatedActions,
      total: allActions.length,
      page,
      limit,
      totalPages: Math.ceil(allActions.length / limit),
    };
  } catch (error) {
    console.error("[v0] Get stock actions error:", error);
    return { error: "Failed to fetch stock actions" };
  }
}
export async function manualStockAdjustment({
  productId,
  actionType,
  quantity,
  reason,
}: {
  productId: string;
  actionType: 'STOCK_IN' | 'SOLD' | 'BROKEN' | 'COUNTED';
  quantity: number;
  reason: string;
}) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    // Input validation
    if (quantity <= 0) {
      return { success: false, error: "Quantity must be greater than 0" };
    }
    if (!reason.trim()) {
      return { success: false, error: "Reason is required" };
    }
    if (!['STOCK_IN', 'SOLD', 'BROKEN', 'COUNTED'].includes(actionType)) {
      return { success: false, error: "Invalid action type" };
    }

    // Role-based validation
    if (session.role === 'EMPLOYEE' && (actionType === 'SOLD' || actionType === 'BROKEN')) {
      return { success: false, error: "Employees cannot perform SOLD or BROKEN actions" };
    }

    // Start transaction
    return await db.transaction(async (tx) => {
      // Get product
      const product = await tx.query.products.findFirst({
        where: eq(products.id, productId),
      });

      if (!product) {
        throw new Error("Product not found");
      }

      // Get current stock from stocks table
      const stockResult = await tx
        .select({ total: sum(stocks.quantity) })
        .from(stocks)
        .where(eq(stocks.productId, productId));
      
      const currentStock = Number(stockResult[0]?.total || 0);

      // Calculate delta
      let delta = 0;
      if (actionType === 'STOCK_IN') delta = quantity;
      if (actionType === 'SOLD') delta = -quantity;
      if (actionType === 'BROKEN') delta = -quantity;
      if (actionType === 'COUNTED') delta = quantity - currentStock;

      // Stock removal validation
      if ((actionType === 'SOLD' || actionType === 'BROKEN') && currentStock < quantity) {
        throw new Error(`Insufficient stock. Available: ${currentStock}`);
      }
      if (actionType === 'COUNTED' && quantity < 0) {
        throw new Error("Counted quantity cannot be negative");
      }

      // Update stocks table
      if (delta !== 0) {
        await tx.insert(stocks).values({
          productId,
          quantity: delta,
          createdBy: session.userId,
        });
      }

      // Insert stock action (audit log)
      await tx.insert(stockActions).values({
        productId,
        actionType,
        quantity: actionType === 'COUNTED' ? quantity : Math.abs(delta),
        reason,
        doneBy: session.userId,
      });

      // Insert activity log
      await tx.insert(activityLogs).values({
        userId: session.userId,
        action: "MANUAL_STOCK_ADJUSTMENT",
        entityType: "PRODUCT",
        entityId: productId,
        details: `${actionType} ${actionType === 'COUNTED' ? quantity : Math.abs(delta)} units – ${reason}`,
      });

      const newStock = currentStock + delta;
      return { success: true, newStock };
    });
  } catch (error) {
    console.error("Manual stock adjustment error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to adjust stock" };
  }
}