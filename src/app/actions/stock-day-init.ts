"use server";

import { stockDays, dailyStockSnapshots, products, stocks } from "@/db/schema";
import { eq, sum } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-middleware";
import { db } from "@/index";

export async function getStockDay(businessDate: Date) {
  const user = await requireAuth();
  if (!user) throw new Error("Unauthorized");

  const dateOnly = new Date(
    businessDate.getFullYear(),
    businessDate.getMonth(),
    businessDate.getDate()
  );

  // Check if stock day exists for this date
  const existingStockDay = await db.query.stockDays.findFirst({
    where: eq(stockDays.businessDate, dateOnly),
  });

  if (existingStockDay) {
    // Get snapshots with product details
    const snapshotsWithProducts = await db.query.dailyStockSnapshots.findMany({
      where: eq(dailyStockSnapshots.stockDayId, existingStockDay.id),
      with: {
        product: true,
      },
    });

    return { stockDay: existingStockDay, snapshots: snapshotsWithProducts };
  }

  return null;
}

export async function initializeStockDay(businessDate: Date) {
  const user = await requireAuth();
  if (!user) throw new Error("Unauthorized");

  const dateOnly = new Date(
    businessDate.getFullYear(),
    businessDate.getMonth(),
    businessDate.getDate()
  );

  // First check if stock day already exists for this date
  const existingData = await getStockDay(businessDate);
  if (existingData) {
    return existingData;
  }

  // Check if any other stock day is currently OPEN
  const openStockDay = await db.query.stockDays.findFirst({
    where: eq(stockDays.status, "OPEN"),
  });

  if (openStockDay) {
    throw new Error("Cannot open new stock day. Close existing open stock day first.");
  }

  // 3. Get all active products
  const activeProducts = await db.query.products.findMany({
    where: eq(products.status, "ACTIVE"),
  });

  // 4. Get current stock quantities from stocks table
  const stockQuantities = new Map<string, number>();
  
  for (const product of activeProducts) {
    const stockResult = await db
      .select({ total: sum(stocks.quantity) })
      .from(stocks)
      .where(eq(stocks.productId, product.id));
    
    const currentStock = Number(stockResult[0]?.total || 0);
    stockQuantities.set(product.id, currentStock);
  }

  // 5. Create snapshots for all active products
  const snapshotData = activeProducts.map((product) => {
    const expectedStock = stockQuantities.get(product.id) || 0;

    return {
      stockDayId: "", // Will be set after stockDay creation
      productId: product.id,
      expectedOpeningStock: expectedStock,
      openingStock: expectedStock,
      variance: null,
      stockIn: 0,
      stockOut: 0,
      closingStock: expectedStock,
      isOutOfStock: expectedStock === 0 ? 1 : 0,
      isVerified: 0,
    };
  });

  // 6. Create stock day
  const [stockDay] = await db
    .insert(stockDays)
    .values({
      businessDate: dateOnly,
      status: "OPEN",
      openedBy: user.userId,
    })
    .returning();

  // 7. Create snapshots with correct stockDayId
  const snapshotsToInsert = snapshotData.map(snapshot => ({
    ...snapshot,
    stockDayId: stockDay.id
  }));

  await db.insert(dailyStockSnapshots).values(snapshotsToInsert);

  // 8. Get snapshots with product details
  const snapshotsWithProducts = await db.query.dailyStockSnapshots.findMany({
    where: eq(dailyStockSnapshots.stockDayId, stockDay.id),
    with: {
      product: true,
    },
  });

  return { stockDay, snapshots: snapshotsWithProducts };
}

export async function verifyProductStock(
  snapshotId: string,
  actualCount: number
) {
  const user = await requireAuth();
  if (!user) throw new Error("Unauthorized");

  const snapshot = await db.query.dailyStockSnapshots.findFirst({
    where: eq(dailyStockSnapshots.id, snapshotId),
  });

  if (!snapshot) throw new Error("Snapshot not found");

  const variance = actualCount - snapshot.expectedOpeningStock;

  const [updatedSnapshot] = await db
    .update(dailyStockSnapshots)
    .set({
      openingStock: actualCount,
      variance,
      closingStock: actualCount + snapshot.stockIn - snapshot.stockOut,
      isOutOfStock: actualCount === 0 ? 1 : 0,
      isVerified: 1,
      verifiedAt: new Date(),
      verifiedBy: user.userId,
      updatedAt: new Date(),
    })
    .where(eq(dailyStockSnapshots.id, snapshotId))
    .returning();

  return updatedSnapshot;
}

export async function canVerifyStockDay(stockDayId: string) {
  const snapshots = await db.query.dailyStockSnapshots.findMany({
    where: eq(dailyStockSnapshots.stockDayId, stockDayId),
  });

  return snapshots.every(
    (snapshot) => snapshot.isVerified === 1
  );
}

export async function verifyStockDay(stockDayId: string) {
  const user = await requireAuth();
  if (!user) throw new Error("Unauthorized");

  const canVerify = await canVerifyStockDay(stockDayId);
  if (!canVerify) throw new Error("All products must be verified first");

  const [updatedStockDay] = await db
    .update(stockDays)
    .set({
      status: "VERIFIED",
      verifiedAt: new Date(),
      verifiedBy: user.userId,
      updatedAt: new Date(),
    })
    .where(eq(stockDays.id, stockDayId))
    .returning();

  return updatedStockDay;
}

export async function closeStockDay(stockDayId: string) {
  const user = await requireAuth();
  if (!user) throw new Error("Unauthorized");

  const stockDay = await db.query.stockDays.findFirst({
    where: eq(stockDays.id, stockDayId),
  });

  if (!stockDay) throw new Error("Stock day not found");
  if (stockDay.status !== "VERIFIED")
    throw new Error("Stock day must be verified before closing");

  const [updatedStockDay] = await db
    .update(stockDays)
    .set({
      status: "CLOSED",
      closedAt: new Date(),
      closedBy: user.userId,
      updatedAt: new Date(),
    })
    .where(eq(stockDays.id, stockDayId))
    .returning();

  return updatedStockDay;
}
