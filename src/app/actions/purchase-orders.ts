"use server";

import { db } from "@/index";
import { 
  purchaseOrders, 
  purchaseOrderItems, 
  stocks, 
  stockActions, 
  activityLogs 
} from "@/db/schema";
import { requireAuth } from "@/lib/auth-middleware";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getPurchaseOrders(status?: string) {
  try {
    const session = await requireAuth();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const whereCondition = status ? eq(purchaseOrders.status, status as any) : undefined;
    
    const orders = await db.query.purchaseOrders.findMany({
      where: whereCondition,
      with: {
        items: {
          with: {
            product: true
          }
        },
        creator: true
      },
      orderBy: [desc(purchaseOrders.createdAt)]
    });

    return { success: true, orders };
  } catch (error) {
    console.error("Get purchase orders error:", error);
    return { success: false, error: "Failed to fetch purchase orders" };
  }
}

export async function createPurchaseOrder(data: {
  items: Array<{ productId: string; quantity: number; unitCost: string }>;
  notes?: string;
}) {
  try {
    const session = await requireAuth();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const orderNumber = `PO-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

    const [order] = await db.insert(purchaseOrders).values({
      orderNumber,
      status: "DRAFT",
      createdBy: session.userId,
      notes: data.notes
    }).returning();

    for (const item of data.items) {
      const totalCost = item.quantity * parseFloat(item.unitCost);
      await db.insert(purchaseOrderItems).values({
        purchaseOrderId: order.id,
        productId: item.productId,
        desiredQuantity: item.quantity,
        unitCost: item.unitCost,
        totalCost: totalCost.toString()
      });
    }

    await db.insert(activityLogs).values({
      userId: session.userId,
      action: "PURCHASE_ORDER_CREATED",
      entityType: "PURCHASE_ORDER",
      entityId: order.id,
      details: `Created purchase order #${orderNumber}`
    });

    revalidatePath('/dashboard/purchase-orders');
    return { success: true, order };
  } catch (error) {
    console.error("Create purchase order error:", error);
    return { success: false, error: "Failed to create purchase order" };
  }
}

export async function submitPurchaseOrder(orderId: string) {
  try {
    const session = await requireAuth();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const order = await db.query.purchaseOrders.findFirst({
      where: eq(purchaseOrders.id, orderId),
      with: { items: true }
    });

    if (!order) {
      return { success: false, error: "Purchase order not found" };
    }

    if (order.status !== "DRAFT") {
      return { success: false, error: "Can only submit draft orders" };
    }

    if (order.items.length === 0) {
      return { success: false, error: "Cannot submit empty purchase order" };
    }

    await db.update(purchaseOrders)
      .set({
        status: "SUBMITTED",
        submittedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(purchaseOrders.id, orderId));

    await db.insert(activityLogs).values({
      userId: session.userId,
      action: "PURCHASE_ORDER_SUBMITTED",
      entityType: "PURCHASE_ORDER",
      entityId: orderId,
      details: `Submitted purchase order #${order.orderNumber} for approval`
    });

    revalidatePath('/dashboard/purchase-orders');
    return { success: true };
  } catch (error) {
    console.error("Submit purchase order error:", error);
    return { success: false, error: "Failed to submit purchase order" };
  }
}

export async function confirmPurchaseOrder(orderId: string, confirmedItems: Array<{ itemId: string; confirmedQuantity: number }>) {
  try {
    const session = await requireAuth();
    if (!session || session.role !== "ADMIN") {
      return { success: false, error: "Only admins can confirm purchase orders" };
    }

    const order = await db.query.purchaseOrders.findFirst({
      where: eq(purchaseOrders.id, orderId)
    });

    if (!order) {
      return { success: false, error: "Purchase order not found" };
    }

    if (order.status !== "SUBMITTED") {
      return { success: false, error: "Only submitted orders can be confirmed" };
    }

    await db.transaction(async (tx) => {
      for (const item of confirmedItems) {
        await tx.update(purchaseOrderItems)
          .set({ confirmedQuantity: item.confirmedQuantity })
          .where(eq(purchaseOrderItems.id, item.itemId));
      }

      await tx.update(purchaseOrders)
        .set({
          status: "CONFIRMED",
          confirmedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(purchaseOrders.id, orderId));

      await tx.insert(activityLogs).values({
        userId: session.userId,
        action: "PURCHASE_ORDER_CONFIRMED",
        entityType: "PURCHASE_ORDER",
        entityId: orderId,
        details: `Confirmed purchase order #${order.orderNumber}`
      });
    });

    revalidatePath('/dashboard/purchase-orders');
    return { success: true };
  } catch (error) {
    console.error("Confirm purchase order error:", error);
    return { success: false, error: "Failed to confirm purchase order" };
  }
}

export async function executeAtMarket(orderId: string, actualItems: Array<{ itemId: string; actualFoundQuantity: number; notes?: string }>) {
  try {
    const session = await requireAuth();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const order = await db.query.purchaseOrders.findFirst({
      where: eq(purchaseOrders.id, orderId)
    });

    if (!order) {
      return { success: false, error: "Purchase order not found" };
    }

    if (order.status !== "CONFIRMED") {
      return { success: false, error: "Only confirmed orders can be executed" };
    }

    await db.transaction(async (tx) => {
      for (const item of actualItems) {
        await tx.update(purchaseOrderItems)
          .set({ 
            actualFoundQuantity: item.actualFoundQuantity,
            notes: item.notes
          })
          .where(eq(purchaseOrderItems.id, item.itemId));
      }

      await tx.update(purchaseOrders)
        .set({
          status: "EXECUTED_AT_MARKET",
          executedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(purchaseOrders.id, orderId));

      await tx.insert(activityLogs).values({
        userId: session.userId,
        action: "PURCHASE_ORDER_EXECUTED",
        entityType: "PURCHASE_ORDER",
        entityId: orderId,
        details: `Executed purchase order #${order.orderNumber} at market`
      });
    });

    revalidatePath('/dashboard/purchase-orders');
    return { success: true };
  } catch (error) {
    console.error("Execute at market error:", error);
    return { success: false, error: "Failed to execute at market" };
  }
}

export async function enterStock(orderId: string) {
  try {
    const session = await requireAuth();
    if (!session || session.role !== "ADMIN") {
      return { success: false, error: "Only admins can enter stock" };
    }

    const order = await db.query.purchaseOrders.findFirst({
      where: eq(purchaseOrders.id, orderId),
      with: {
        items: {
          with: { product: true }
        }
      }
    });

    if (!order) {
      return { success: false, error: "Purchase order not found" };
    }

    if (order.status !== "EXECUTED_AT_MARKET") {
      return { success: false, error: "Only executed orders can have stock entered" };
    }

    if (order.stockEnteredAt) {
      return { success: false, error: "Stock already entered for this order" };
    }

    await db.transaction(async (tx) => {
      for (const item of order.items) {
        if (item.actualFoundQuantity && item.actualFoundQuantity > 0) {
          await tx.insert(stocks).values({
            productId: item.productId,
            quantity: item.actualFoundQuantity,
            createdBy: session.userId
          });

          await tx.insert(stockActions).values({
            productId: item.productId,
            actionType: "STOCK_IN",
            quantity: item.actualFoundQuantity,
            buyingPrice: item.unitCost,
            supplier: `Purchase Order #${order.orderNumber}`,
            reason: `Stock entry from purchase order`,
            doneBy: session.userId
          });
        }
      }

      await tx.update(purchaseOrders)
        .set({
          status: "STOCK_ENTERED",
          stockEnteredAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(purchaseOrders.id, orderId));

      await tx.insert(activityLogs).values({
        userId: session.userId,
        action: "PURCHASE_ORDER_STOCK_ENTERED",
        entityType: "PURCHASE_ORDER",
        entityId: orderId,
        details: `Entered stock for purchase order #${order.orderNumber}`
      });
    });

    revalidatePath('/dashboard/purchase-orders');
    return { success: true };
  } catch (error) {
    console.error("Enter stock error:", error);
    return { success: false, error: "Failed to enter stock" };
  }
}

export async function rejectForStock(orderId: string, reason: string) {
  try {
    const session = await requireAuth();
    if (!session || session.role !== "ADMIN") {
      return { success: false, error: "Only admins can reject stock entry" };
    }

    const order = await db.query.purchaseOrders.findFirst({
      where: eq(purchaseOrders.id, orderId)
    });

    if (!order) {
      return { success: false, error: "Purchase order not found" };
    }

    if (order.status !== "EXECUTED_AT_MARKET") {
      return { success: false, error: "Only executed orders can be rejected for stock" };
    }

    await db.update(purchaseOrders)
      .set({
        status: "REJECTED_FOR_STOCK",
        notes: reason,
        updatedAt: new Date()
      })
      .where(eq(purchaseOrders.id, orderId));

    await db.insert(activityLogs).values({
      userId: session.userId,
      action: "PURCHASE_ORDER_REJECTED_FOR_STOCK",
      entityType: "PURCHASE_ORDER",
      entityId: orderId,
      details: `Rejected stock entry for purchase order #${order.orderNumber}: ${reason}`
    });

    revalidatePath('/dashboard/purchase-orders');
    return { success: true };
  } catch (error) {
    console.error("Reject for stock error:", error);
    return { success: false, error: "Failed to reject for stock" };
  }
}

export async function cancelPurchaseOrder(orderId: string) {
  try {
    const session = await requireAuth();
    if (!session || session.role !== "ADMIN") {
      return { success: false, error: "Only admins can cancel purchase orders" };
    }

    const order = await db.query.purchaseOrders.findFirst({
      where: eq(purchaseOrders.id, orderId)
    });

    if (!order) {
      return { success: false, error: "Purchase order not found" };
    }

    if (order.status === "STOCK_ENTERED") {
      return { success: false, error: "Cannot cancel orders with stock already entered" };
    }

    await db.update(purchaseOrders)
      .set({
        status: "CANCELLED",
        updatedAt: new Date()
      })
      .where(eq(purchaseOrders.id, orderId));

    await db.insert(activityLogs).values({
      userId: session.userId,
      action: "PURCHASE_ORDER_CANCELLED",
      entityType: "PURCHASE_ORDER",
      entityId: orderId,
      details: `Cancelled purchase order #${order.orderNumber}`
    });

    revalidatePath('/dashboard/purchase-orders');
    return { success: true };
  } catch (error) {
    console.error("Cancel purchase order error:", error);
    return { success: false, error: "Failed to cancel purchase order" };
  }
}