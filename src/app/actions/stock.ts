"use server";

import {
  products,
  stocks,
  stockActions,
  activityLogs,
  dailyStockSnapshots,
  stockDays,
} from "@/db/schema";
import { db } from "@/index";
import { getSession } from "@/lib/auth-middleware";
import { eq, and, desc, between, sum } from "drizzle-orm";
import { StockActionType } from "@/db/types";
import { revalidatePath } from "next/cache";

interface StockActionParams {
  productId: string;
  actionType: StockActionType;
  quantity: number;
  reason?: string;
  supplier?: string;
  sellingPrice?: string;
}

export async function handleStockAction({
  productId,
  actionType,
  quantity,
  reason,
  supplier,
  sellingPrice,
}: StockActionParams) {
  const session = await getSession();
  if (!session) {
    console.error(
      `[STOCK_ACTION_ERROR] Unauthorized access attempt for ${actionType}`
    );
    return { success: false, error: "Unauthorized" };
  }

  console.log(
    `[STOCK_ACTION_START] ${actionType} - Product: ${productId}, Quantity: ${quantity}`
  );

  try {
    return await db.transaction(async (tx) => {
      // 1. Validate product exists
      const product = await tx.query.products.findFirst({
        where: eq(products.id, productId),
      });

      if (!product) {
        console.error(
          `[STOCK_ACTION_ERROR] Product not found: ${productId} for ${actionType}`
        );
        throw new Error("Product not found");
      }

      // 2. Get current stock
      const stockResult = await tx
        .select({ total: sum(stocks.quantity) })
        .from(stocks)
        .where(eq(stocks.productId, productId));

      const currentStock = Number(stockResult[0]?.total || 0);
      console.log(
        `[STOCK_ACTION_INFO] Current stock for ${productId}: ${currentStock}`
      );

      // 3. Get or create today's stock day and snapshot
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let stockDay = await tx.query.stockDays.findFirst({
        where: eq(stockDays.businessDate, today),
      });

      if (!stockDay) {
        console.log(
          `[STOCK_ACTION_INFO] Creating new stock day for ${
            today.toISOString().split("T")[0]
          }`
        );
        const [newStockDay] = await tx
          .insert(stockDays)
          .values({
            businessDate: today,
            openedBy: session.userId,
          })
          .returning();
        stockDay = newStockDay;
      }

      let snapshot = await tx.query.dailyStockSnapshots.findFirst({
        where: and(
          eq(dailyStockSnapshots.productId, productId),
          eq(dailyStockSnapshots.stockDayId, stockDay.id)
        ),
      });

      if (!snapshot) {
        console.log(
          `[STOCK_ACTION_INFO] Creating new daily snapshot for ${productId} on ${stockDay.id}`
        );
        const [newSnapshot] = await tx
          .insert(dailyStockSnapshots)
          .values({
            stockDayId: stockDay.id,
            productId,
            expectedOpeningStock: currentStock,
            openingStock: currentStock,
            stockIn: 0,
            stockOut: 0,
            isVerified: 1,
            closingStock: currentStock,
            isOutOfStock: currentStock <= 0 ? 1 : 0,
          })
          .returning();
        snapshot = newSnapshot;
      }

      let stockChange = 0;
      let snapshotUpdates: Partial<typeof dailyStockSnapshots.$inferInsert> =
        {};

      // 4. Handle different action types
      switch (actionType) {
        case "STOCK_IN":
          console.log(`[STOCK_IN_ACTION] Adding ${quantity} units`);
          stockChange = quantity;
          snapshotUpdates = {
            stockIn: snapshot.stockIn + quantity,
            closingStock: snapshot.closingStock + quantity,
            isOutOfStock: snapshot.closingStock + quantity > 0 ? 0 : 1,
          };
          break;

        case "SOLD":
          console.log(`[SOLD_ACTION] Selling ${quantity} units`);
          if (currentStock < quantity) {
            console.error(
              `[SOLD_ERROR] Insufficient stock: ${currentStock} < ${quantity}`
            );
            throw new Error(`Insufficient stock. Available: ${currentStock}`);
          }
          stockChange = -quantity;
          snapshotUpdates = {
            stockOut: snapshot.stockOut + quantity,
            closingStock: snapshot.closingStock - quantity,
            isOutOfStock: snapshot.closingStock - quantity <= 0 ? 1 : 0,
          };
          break;

        case "BROKEN":
          console.log(`[BROKEN_ACTION] Recording ${quantity} broken units`);
          if (currentStock < quantity) {
            console.error(
              `[BROKEN_ERROR] Insufficient stock: ${currentStock} < ${quantity}`
            );
            throw new Error(`Insufficient stock. Available: ${currentStock}`);
          }
          stockChange = -quantity;
          snapshotUpdates = {
            stockOut: snapshot.stockOut + quantity,
            closingStock: snapshot.closingStock - quantity,
            isOutOfStock: snapshot.closingStock - quantity <= 0 ? 1 : 0,
          };
          break;

        case "COUNTED":
          console.log(
            `[COUNTED_ACTION] Physical count: ${quantity}, System: ${currentStock}`
          );
          const variance = quantity - currentStock;
          stockChange = variance;
          snapshotUpdates = {
            openingStock: quantity,
            variance: variance,
            closingStock: quantity + snapshot.stockIn - snapshot.stockOut,
            isOutOfStock:
              quantity + snapshot.stockIn - snapshot.stockOut <= 0 ? 1 : 0,
          };
          console.log(`[COUNTED_INFO] Variance: ${variance}`);
          break;

        default:
          console.error(
            `[STOCK_ACTION_ERROR] Invalid action type: ${actionType}`
          );
          throw new Error(`Invalid action type: ${actionType}`);
      }

      // 5. Update stock if there's a change
      if (stockChange !== 0) {
        console.log(`[STOCK_UPDATE] Applying stock change: ${stockChange}`);
        await tx.insert(stocks).values({
          productId,
          quantity: stockChange,
          createdBy: session.userId,
        });
      }

      // 6. Update daily snapshot
      console.log(
        `[SNAPSHOT_UPDATE] Updating daily snapshot:`,
        snapshotUpdates
      );
      await tx
        .update(dailyStockSnapshots)
        .set(snapshotUpdates)
        .where(eq(dailyStockSnapshots.id, snapshot.id));

      // 7. Create stock action record
      console.log(`[STOCK_ACTION_RECORD] Creating action record`);
      const [newAction] = await tx
        .insert(stockActions)
        .values({
          productId,
          actionType,
          quantity,
          supplier,
          sellingPrice,
          reason,
          doneBy: session.userId,
        })
        .returning();

      // 8. Log activity
      console.log(`[ACTIVITY_LOG] Logging activity`);
      await tx.insert(activityLogs).values({
        userId: session.userId,
        action: actionType,
        entityType: "STOCK",
        entityId: productId,
        details: `${actionType}: ${quantity} units. ${
          reason || supplier || ""
        }`,
      });

      console.log(
        `[STOCK_ACTION_SUCCESS] ${actionType} completed successfully`
      );
      
      revalidatePath('/dashboard/stock');
      
      return {
        success: true,
        action: newAction,
        stockChange,
        newStock: currentStock + stockChange,
        toast: {
          type: "success" as const,
          title: "Stock Updated",
          message: `${actionType} completed successfully. ${quantity} units processed.`
        }
      };
    });
  } catch (error) {
    console.error(
      `[STOCK_ACTION_TRANSACTION_ERROR] ${actionType} failed:`,
      error
    );
    
    const errorMessage = error instanceof Error ? error.message : "Failed to process stock action";
    
    return {
      success: false,
      error: errorMessage,
      toast: {
        type: "error" as const,
        title: "Stock Action Failed",
        message: errorMessage
      }
    };
  }
}

export async function getStockActionsAction(
  productId?: string,
  actionType?: StockActionType,
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
    console.error(
      "[GET_STOCK_ACTIONS_ERROR] Failed to fetch stock actions:",
      error
    );
    return { error: "Failed to fetch stock actions" };
  }
}
