"use server";

import { db } from "@/index";
import { 
  stockDays, 
  dailyStockSnapshots, 
  stocks, 
  products,
  stockActions,
  activityLogs 
} from "@/db/schema";
import { requireAuth } from "@/lib/auth-middleware";
import { eq, and, desc, sum } from "drizzle-orm";

export async function getCurrentStockDay() {
  try {
    const session = await requireAuth();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stockDay = await db.query.stockDays.findFirst({
      where: eq(stockDays.businessDate, today),
      with: {
        snapshots: {
          with: {
            product: true
          }
        }
      }
    });

    return { success: true, stockDay };
  } catch (error) {
    console.error("Get current stock day error:", error);
    return { success: false, error: "Failed to get current stock day" };
  }
}

export async function openStockDay() {
  try {
    const session = await requireAuth();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if stock day already exists
    const existingStockDay = await db.query.stockDays.findFirst({
      where: eq(stockDays.businessDate, today)
    });

    if (existingStockDay) {
      return { success: false, error: "Stock day already opened for today" };
    }

    // Create new stock day
    const [stockDay] = await db.insert(stockDays).values({
      businessDate: today,
      status: "OPEN",
      openedBy: session.userId
    }).returning();

    // Get all products and calculate current stock
    const allProducts = await db.query.products.findMany({
      where: eq(products.status, "ACTIVE")
    });

    // Create snapshots for each product
    for (const product of allProducts) {
      // Calculate current stock from stocks table
      const stockEntries = await db.select({
        totalStock: sum(stocks.quantity)
      }).from(stocks)
        .where(eq(stocks.productId, product.id));

      const currentStock = Number(stockEntries[0]?.totalStock || 0);

      await db.insert(dailyStockSnapshots).values({
        stockDayId: stockDay.id,
        productId: product.id,
        openingStock: currentStock,
        stockIn: 0,
        stockOut: 0,
        closingStock: currentStock,
        isOutOfStock: currentStock === 0 ? 1 : 0
      });
    }

    // Log activity
    await db.insert(activityLogs).values({
      userId: session.userId,
      action: "STOCK_DAY_OPENED",
      entityType: "STOCK_DAY",
      entityId: stockDay.id,
      details: `Opened stock day for ${today.toDateString()}`
    });

    return { success: true, stockDay };
  } catch (error) {
    console.error("Open stock day error:", error);
    return { success: false, error: "Failed to open stock day" };
  }
}

export async function verifyStockSnapshot(stockDayId: string, productId: string, verifiedQuantity: number) {
  try {
    const session = await requireAuth();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    // Get the snapshot
    const snapshot = await db.query.dailyStockSnapshots.findFirst({
      where: and(
        eq(dailyStockSnapshots.stockDayId, stockDayId),
        eq(dailyStockSnapshots.productId, productId)
      ),
      with: {
        product: true
      }
    });

    if (!snapshot) {
      return { success: false, error: "Stock snapshot not found" };
    }

    const difference = verifiedQuantity - snapshot.openingStock;

    await db.transaction(async (tx) => {
      // Update the snapshot
      await tx.update(dailyStockSnapshots)
        .set({
          openingStock: verifiedQuantity,
          closingStock: verifiedQuantity + snapshot.stockIn - snapshot.stockOut,
          isOutOfStock: verifiedQuantity === 0 ? 1 : 0,
          updatedAt: new Date()
        })
        .where(and(
          eq(dailyStockSnapshots.stockDayId, stockDayId),
          eq(dailyStockSnapshots.productId, productId)
        ));

      // If there's a difference, record it as a stock action
      if (difference !== 0) {
        await tx.insert(stockActions).values({
          productId: productId,
          actionType: "COUNTED",
          quantity: Math.abs(difference),
          reason: `Stock verification: ${difference > 0 ? 'Found extra' : 'Missing'} ${Math.abs(difference)} units`,
          doneBy: session.userId
        });

        // Add or remove stock to match verified quantity
        await tx.insert(stocks).values({
          productId: productId,
          quantity: difference,
          createdBy: session.userId
        });
      }

      // Log activity
      await tx.insert(activityLogs).values({
        userId: session.userId,
        action: "STOCK_VERIFIED",
        entityType: "STOCK_SNAPSHOT",
        entityId: snapshot.id,
        details: `Verified ${snapshot.product.name}: ${verifiedQuantity} units (${difference >= 0 ? '+' : ''}${difference})`
      });
    });

    return { success: true };
  } catch (error) {
    console.error("Verify stock snapshot error:", error);
    return { success: false, error: "Failed to verify stock" };
  }
}

export async function verifyStockDay(stockDayId: string) {
  try {
    const session = await requireAuth();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    if (session.role !== "ADMIN") {
      return { success: false, error: "Only admins can verify stock days" };
    }

    await db.transaction(async (tx) => {
      await tx.update(stockDays)
        .set({
          status: "VERIFIED",
          verifiedAt: new Date(),
          verifiedBy: session.userId,
          updatedAt: new Date()
        })
        .where(eq(stockDays.id, stockDayId));

      await tx.insert(activityLogs).values({
        userId: session.userId,
        action: "STOCK_DAY_VERIFIED",
        entityType: "STOCK_DAY",
        entityId: stockDayId,
        details: "Stock day verified by admin"
      });
    });

    return { success: true };
  } catch (error) {
    console.error("Verify stock day error:", error);
    return { success: false, error: "Failed to verify stock day" };
  }
}

export async function addStockToSnapshot(stockDayId: string, productId: string, quantity: number, reason: string) {
  try {
    const session = await requireAuth();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    await db.transaction(async (tx) => {
      // Update snapshot
      const snapshot = await tx.query.dailyStockSnapshots.findFirst({
        where: and(
          eq(dailyStockSnapshots.stockDayId, stockDayId),
          eq(dailyStockSnapshots.productId, productId)
        )
      });

      if (!snapshot) {
        throw new Error("Snapshot not found");
      }

      await tx.update(dailyStockSnapshots)
        .set({
          stockIn: snapshot.stockIn + quantity,
          closingStock: snapshot.closingStock + quantity,
          isOutOfStock: 0,
          updatedAt: new Date()
        })
        .where(and(
          eq(dailyStockSnapshots.stockDayId, stockDayId),
          eq(dailyStockSnapshots.productId, productId)
        ));

      // Add to stocks table
      await tx.insert(stocks).values({
        productId: productId,
        quantity: quantity,
        createdBy: session.userId
      });

      // Record stock action
      await tx.insert(stockActions).values({
        productId: productId,
        actionType: "STOCK_IN",
        quantity: quantity,
        reason: reason,
        doneBy: session.userId
      });
    });

    return { success: true };
  } catch (error) {
    console.error("Add stock to snapshot error:", error);
    return { success: false, error: "Failed to add stock" };
  }
}