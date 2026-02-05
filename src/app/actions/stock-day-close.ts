"use server";

import { stockDays, dailyStockSnapshots } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-middleware";
import { db } from "@/index";

export async function closeCurrentStockDay() {
  const user = await requireAuth();
  if (!user) throw new Error("Unauthorized");

  return await db.transaction(async (tx) => {
    // 1. Find current open or verified stock day
    const currentStockDay = await tx.query.stockDays.findFirst({
      where: eq(stockDays.status, "VERIFIED"),
    }) || await tx.query.stockDays.findFirst({
      where: eq(stockDays.status, "OPEN"),
    });

    if (!currentStockDay) {
      throw new Error("No open or verified stock day found to close");
    }

    // If stock day is OPEN, verify it first
    if (currentStockDay.status === "OPEN") {
      // Check if all products are verified
      const snapshots = await tx.query.dailyStockSnapshots.findMany({
        where: eq(dailyStockSnapshots.stockDayId, currentStockDay.id),
      });

      const unverifiedProducts = snapshots.filter((s) => s.isVerified !== 1);
      if (unverifiedProducts.length > 0) {
        throw new Error(
          `Cannot close day: ${unverifiedProducts.length} products still need verification`
        );
      }

      // Verify the stock day first
      await tx
        .update(stockDays)
        .set({
          status: "VERIFIED",
          verifiedAt: new Date(),
          verifiedBy: user.userId,
          updatedAt: new Date(),
        })
        .where(eq(stockDays.id, currentStockDay.id));
    }

    // 2. Get snapshots with product details
    const snapshots = await tx.query.dailyStockSnapshots.findMany({
      where: eq(dailyStockSnapshots.stockDayId, currentStockDay.id),
      with: {
        product: true,
      },
    });

    // 3. Calculate totals from snapshots
    let totalExpectedOpening = 0;
    let totalOpeningStock = 0;
    let totalStockIn = 0;
    let totalStockOut = 0;
    let totalClosingStock = 0;
    let totalClosingValue = 0;

    for (const snapshot of snapshots) {
      totalExpectedOpening += snapshot.expectedOpeningStock;
      totalOpeningStock += snapshot.openingStock;
      totalStockIn += snapshot.stockIn;
      totalStockOut += snapshot.stockOut;
      totalClosingStock += snapshot.closingStock;

      // Calculate closing value using selling price
      const sellingPrice = parseFloat(snapshot.product.sellingPrice);
      totalClosingValue += snapshot.closingStock * sellingPrice;
    }

    console.log(`[CLOSE_DAY] Calculated totals:`, {
      totalExpectedOpening,
      totalOpeningStock,
      totalStockIn,
      totalStockOut,
      totalClosingStock,
      totalClosingValue,
    });

    // 4. Update stock day with calculated totals and close it
    const [closedStockDay] = await tx
      .update(stockDays)
      .set({
        status: "CLOSED",
        totalExpectedOpening,
        totalOpeningStock,
        totalStockIn,
        totalStockOut,
        totalClosingStock,
        closedAt: new Date(),
        closedBy: user.userId,
        updatedAt: new Date(),
      })
      .where(eq(stockDays.id, currentStockDay.id))
      .returning();

    console.log(
      `[CLOSE_DAY] Stock day ${currentStockDay.id} closed successfully`
    );

    return {
      stockDay: closedStockDay,
      snapshots,
      totals: {
        totalExpectedOpening,
        totalOpeningStock,
        totalStockIn,
        totalStockOut,
        totalClosingStock,
        totalClosingValue,
      },
    };
  });
}
