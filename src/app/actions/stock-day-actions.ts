"use server";

import { stockDays, dailyStockSnapshots } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-middleware";
import { db } from "@/index";

export async function getStockDayStatus() {
  const user = await requireAuth();
  if (!user) throw new Error("Unauthorized");

  const openStockDay = await db.query.stockDays.findFirst({
    where: eq(stockDays.status, "OPEN"),
  });

  const verifiedStockDay = await db.query.stockDays.findFirst({
    where: eq(stockDays.status, "VERIFIED"),
  });

  return {
    hasOpen: !!openStockDay,
    hasVerified: !!verifiedStockDay,
    openStockDay,
    verifiedStockDay,
  };
}

export async function forceCloseStockDay(stockDayId: string) {
  const user = await requireAuth();
  if (!user) throw new Error("Unauthorized");

  return await db.transaction(async (tx) => {
    const stockDay = await tx.query.stockDays.findFirst({
      where: eq(stockDays.id, stockDayId),
    });

    if (!stockDay) {
      throw new Error("Stock day not found");
    }

    // If OPEN, verify first
    if (stockDay.status === "OPEN") {
      await tx
        .update(stockDays)
        .set({
          status: "VERIFIED",
          verifiedAt: new Date(),
          verifiedBy: user.userId,
          updatedAt: new Date(),
        })
        .where(eq(stockDays.id, stockDayId));
    }

    // Get snapshots for calculations
    const snapshots = await tx.query.dailyStockSnapshots.findMany({
      where: eq(dailyStockSnapshots.stockDayId, stockDayId),
      with: { product: true },
    });

    // Calculate totals
    let totalExpectedOpening = 0;
    let totalOpeningStock = 0;
    let totalStockIn = 0;
    let totalStockOut = 0;
    let totalClosingStock = 0;

    for (const snapshot of snapshots) {
      totalExpectedOpening += snapshot.expectedOpeningStock;
      totalOpeningStock += snapshot.openingStock;
      totalStockIn += snapshot.stockIn;
      totalStockOut += snapshot.stockOut;
      totalClosingStock += snapshot.closingStock;
    }

    // Close the stock day
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
      .where(eq(stockDays.id, stockDayId))
      .returning();

    return { stockDay: closedStockDay, snapshots };
  });
}
