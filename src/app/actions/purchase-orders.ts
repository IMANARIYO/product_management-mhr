"use server";

import { db } from "@/index";
import { 
  purchaseOrders, 
  purchaseOrderItems, 
  stocks, 
  stockActions, 
  dailyStockSnapshots,
  activityLogs 
} from "@/db/schema";
import { requireAuth } from "@/lib/auth-middleware";
import { eq, and, desc } from "drizzle-orm";

export async function getPurchaseOrders(status?: string) {
  try {
    const session = await requireAuth();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const whereCondition = status ? eq(purchaseOrders.status, status as 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'RECEIVED' | 'CANCELLED') : undefined;
    
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

    const orderNumber = `PO-${Date.now()}`;
    const totalAmount = data.items.reduce((sum, item) => 
      sum + (item.quantity * parseFloat(item.unitCost)), 0
    );

    const [order] = await db.insert(purchaseOrders).values({
      orderNumber,
      totalAmount: totalAmount.toString(),
      status: "DRAFT",
      createdBy: session.userId,
      notes: data.notes
    }).returning();

    // Add items
    for (const item of data.items) {
      await db.insert(purchaseOrderItems).values({
        purchaseOrderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        unitCost: item.unitCost,
        totalCost: (item.quantity * parseFloat(item.unitCost)).toString()
      });
    }

    await db.insert(activityLogs).values({
      userId: session.userId,
      action: "PURCHASE_ORDER_CREATED",
      entityType: "PURCHASE_ORDER",
      entityId: order.id,
      details: `Created purchase order #${orderNumber}`
    });

    return { success: true, order };
  } catch (error) {
    console.error("Create purchase order error:", error);
    return { success: false, error: "Failed to create purchase order" };
  }
}

export async function updatePurchaseOrder(orderId: string, data: {
  items: Array<{ productId: string; quantity: number; unitCost: string }>;
  notes?: string;
}) {
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

    if (order.status !== "DRAFT") {
      return { success: false, error: "Can only edit draft orders" };
    }

    const totalAmount = data.items.reduce((sum, item) => 
      sum + (item.quantity * parseFloat(item.unitCost)), 0
    );

    await db.transaction(async (tx) => {
      // Update order
      await tx.update(purchaseOrders)
        .set({
          totalAmount: totalAmount.toString(),
          notes: data.notes,
          updatedAt: new Date()
        })
        .where(eq(purchaseOrders.id, orderId));

      // Delete existing items
      await tx.delete(purchaseOrderItems)
        .where(eq(purchaseOrderItems.purchaseOrderId, orderId));

      // Add new items
      for (const item of data.items) {
        await tx.insert(purchaseOrderItems).values({
          purchaseOrderId: orderId,
          productId: item.productId,
          quantity: item.quantity,
          unitCost: item.unitCost,
          totalCost: (item.quantity * parseFloat(item.unitCost)).toString()
        });
      }

      await tx.insert(activityLogs).values({
        userId: session.userId,
        action: "PURCHASE_ORDER_UPDATED",
        entityType: "PURCHASE_ORDER",
        entityId: orderId,
        details: `Updated purchase order #${order.orderNumber}`
      });
    });

    return { success: true };
  } catch (error) {
    console.error("Update purchase order error:", error);
    return { success: false, error: "Failed to update purchase order" };
  }
}

export async function submitPurchaseOrder(orderId: string) {
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

    if (order.status !== "DRAFT") {
      return { success: false, error: "Can only submit draft orders" };
    }

    await db.transaction(async (tx) => {
      await tx.update(purchaseOrders)
        .set({
          status: "SUBMITTED",
          submittedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(purchaseOrders.id, orderId));

      await tx.insert(activityLogs).values({
        userId: session.userId,
        action: "PURCHASE_ORDER_SUBMITTED",
        entityType: "PURCHASE_ORDER",
        entityId: orderId,
        details: `Submitted purchase order #${order.orderNumber} for approval`
      });
    });

    return { success: true };
  } catch (error) {
    console.error("Submit purchase order error:", error);
    return { success: false, error: "Failed to submit purchase order" };
  }
}

export async function cancelPurchaseOrder(orderId: string) {
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

    if (order.status === "RECEIVED") {
      return { success: false, error: "Cannot cancel received orders" };
    }

    await db.transaction(async (tx) => {
      await tx.update(purchaseOrders)
        .set({
          status: "CANCELLED",
          updatedAt: new Date()
        })
        .where(eq(purchaseOrders.id, orderId));

      await tx.insert(activityLogs).values({
        userId: session.userId,
        action: "PURCHASE_ORDER_CANCELLED",
        entityType: "PURCHASE_ORDER",
        entityId: orderId,
        details: `Cancelled purchase order #${order.orderNumber}`
      });
    });

    return { success: true };
  } catch (error) {
    console.error("Cancel purchase order error:", error);
    return { success: false, error: "Failed to cancel purchase order" };
  }
}

export async function receivePurchaseOrder(purchaseOrderId: string) {
  try {
    const session = await requireAuth();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    if (session.role !== "ADMIN") {
      return { success: false, error: "Only admins can receive purchase orders" };
    }

    // Get purchase order with items
    const purchaseOrder = await db.query.purchaseOrders.findFirst({
      where: eq(purchaseOrders.id, purchaseOrderId),
      with: {
        items: {
          with: {
            product: true
          }
        }
      }
    });

    if (!purchaseOrder) {
      return { success: false, error: "Purchase order not found" };
    }

    if (purchaseOrder.status !== "APPROVED") {
      return { success: false, error: "Purchase order must be approved before receiving" };
    }

    // Start transaction
    await db.transaction(async (tx) => {
      // Update purchase order status
      await tx
        .update(purchaseOrders)
        .set({ 
          status: "RECEIVED",
          updatedAt: new Date()
        })
        .where(eq(purchaseOrders.id, purchaseOrderId));

      // Add stock for each item
      for (const item of purchaseOrder.items) {
        // Add to stocks table
        await tx.insert(stocks).values({
          productId: item.productId,
          quantity: item.quantity,
          createdBy: session.userId,
        });

        // Record stock action
        await tx.insert(stockActions).values({
          productId: item.productId,
          actionType: "STOCK_IN",
          quantity: item.quantity,
          buyingPrice: item.unitCost,
          supplier: "Purchase Order",
          reason: `Purchase Order #${purchaseOrder.orderNumber} received`,
          doneBy: session.userId,
        });
      }

      // Log activity
      await tx.insert(activityLogs).values({
        userId: session.userId,
        action: "PURCHASE_ORDER_RECEIVED",
        entityType: "PURCHASE_ORDER",
        entityId: purchaseOrderId,
        details: `Received purchase order #${purchaseOrder.orderNumber}`,
      });
    });

    return { success: true, message: "Purchase order received and stock added successfully" };
  } catch (error) {
    console.error("Receive purchase order error:", error);
    return { success: false, error: "Failed to receive purchase order" };
  }
}

export async function deletePurchaseOrder(purchaseOrderId: string) {
  try {
    const session = await requireAuth();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    if (session.role !== "ADMIN") {
      return { success: false, error: "Only admins can delete purchase orders" };
    }

    // Get purchase order
    const purchaseOrder = await db.query.purchaseOrders.findFirst({
      where: eq(purchaseOrders.id, purchaseOrderId)
    });

    if (!purchaseOrder) {
      return { success: false, error: "Purchase order not found" };
    }

    if (purchaseOrder.status === "RECEIVED") {
      return { success: false, error: "Cannot delete received purchase orders" };
    }

    // Delete purchase order and items
    await db.transaction(async (tx) => {
      // Delete items first
      await tx
        .delete(purchaseOrderItems)
        .where(eq(purchaseOrderItems.purchaseOrderId, purchaseOrderId));

      // Delete purchase order
      await tx
        .delete(purchaseOrders)
        .where(eq(purchaseOrders.id, purchaseOrderId));

      // Log activity
      await tx.insert(activityLogs).values({
        userId: session.userId,
        action: "PURCHASE_ORDER_DELETED",
        entityType: "PURCHASE_ORDER",
        entityId: purchaseOrderId,
        details: `Deleted purchase order #${purchaseOrder.orderNumber}`,
      });
    });

    return { success: true, message: "Purchase order deleted successfully" };
  } catch (error) {
    console.error("Delete purchase order error:", error);
    return { success: false, error: "Failed to delete purchase order" };
  }
}

export async function approvePurchaseOrder(purchaseOrderId: string) {
  try {
    const session = await requireAuth();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    if (session.role !== "ADMIN") {
      return { success: false, error: "Only admins can approve purchase orders" };
    }

    const purchaseOrder = await db.query.purchaseOrders.findFirst({
      where: eq(purchaseOrders.id, purchaseOrderId)
    });

    if (!purchaseOrder) {
      return { success: false, error: "Purchase order not found" };
    }

    if (purchaseOrder.status !== "SUBMITTED") {
      return { success: false, error: "Only submitted purchase orders can be approved" };
    }

    await db.transaction(async (tx) => {
      await tx
        .update(purchaseOrders)
        .set({ 
          status: "APPROVED",
          approvedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(purchaseOrders.id, purchaseOrderId));

      await tx.insert(activityLogs).values({
        userId: session.userId,
        action: "PURCHASE_ORDER_APPROVED",
        entityType: "PURCHASE_ORDER",
        entityId: purchaseOrderId,
        details: `Approved purchase order #${purchaseOrder.orderNumber}`,
      });
    });

    return { success: true, message: "Purchase order approved successfully" };
  } catch (error) {
    console.error("Approve purchase order error:", error);
    return { success: false, error: "Failed to approve purchase order" };
  }
}

export async function copyPurchaseOrder(orderId: string) {
  try {
    const session = await requireAuth();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const originalOrder = await db.query.purchaseOrders.findFirst({
      where: eq(purchaseOrders.id, orderId),
      with: {
        items: true
      }
    });

    if (!originalOrder) {
      return { success: false, error: "Purchase order not found" };
    }

    const orderNumber = `PO-${Date.now()}`;
    const totalAmount = parseFloat(originalOrder.totalAmount);

    const [newOrder] = await db.insert(purchaseOrders).values({
      orderNumber,
      totalAmount: totalAmount.toString(),
      status: "DRAFT",
      createdBy: session.userId,
      notes: `Copy of ${originalOrder.orderNumber}`
    }).returning();

    // Copy items
    for (const item of originalOrder.items) {
      await db.insert(purchaseOrderItems).values({
        purchaseOrderId: newOrder.id,
        productId: item.productId,
        quantity: item.quantity,
        unitCost: item.unitCost,
        totalCost: item.totalCost
      });
    }

    await db.insert(activityLogs).values({
      userId: session.userId,
      action: "PURCHASE_ORDER_COPIED",
      entityType: "PURCHASE_ORDER",
      entityId: newOrder.id,
      details: `Copied purchase order from #${originalOrder.orderNumber} to #${orderNumber}`
    });

    return { success: true, order: newOrder };
  } catch (error) {
    console.error("Copy purchase order error:", error);
    return { success: false, error: "Failed to copy purchase order" };
  }
}

export async function archivePurchaseOrder(orderId: string) {
  try {
    const session = await requireAuth();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    if (session.role !== "ADMIN") {
      return { success: false, error: "Only admins can archive purchase orders" };
    }

    const order = await db.query.purchaseOrders.findFirst({
      where: eq(purchaseOrders.id, orderId)
    });

    if (!order) {
      return { success: false, error: "Purchase order not found" };
    }

    await db.transaction(async (tx) => {
      await tx.update(purchaseOrders)
        .set({
          status: "CANCELLED",
          updatedAt: new Date()
        })
        .where(eq(purchaseOrders.id, orderId));

      await tx.insert(activityLogs).values({
        userId: session.userId,
        action: "PURCHASE_ORDER_ARCHIVED",
        entityType: "PURCHASE_ORDER",
        entityId: orderId,
        details: `Archived purchase order #${order.orderNumber}`
      });
    });

    return { success: true };
  } catch (error) {
    console.error("Archive purchase order error:", error);
    return { success: false, error: "Failed to archive purchase order" };
  }
}