"use server";

import { eq, sum } from "drizzle-orm";
import { getSession, requireAuth } from "@/lib/auth-middleware";
import { activityLogs, products, stocks, stockActions } from "@/db/schema";
import { db } from "@/index";
import { NewProduct, UpdateProduct } from "@/db/types";

export async function createProduct(
  data: Omit<NewProduct, "id" | "createdAt" | "updatedAt" | "createdBy" | "status">
) {
  try {
    const session = await requireAuth();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const productData: NewProduct = {
      ...data,
      createdBy: session.userId,
      status: 'ACTIVE',
    };

    const newProduct = await db
      .insert(products)
      .values(productData)
      .returning();

    await db.insert(activityLogs).values({
      userId: session.userId,
      action: "CREATE_PRODUCT",
      entityType: "PRODUCT",
      entityId: newProduct[0].id,
      details: `Created product: ${data.name}`,
    });

    return { success: true, product: newProduct[0] };
  } catch (error) {
    console.error("Create product error:", error);
    return { success: false, error: "Failed to create product" };
  }
}

export async function updateProduct(productId: string, data: UpdateProduct) {
  try {
    const session = await requireAuth();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    // Add updatedAt timestamp
    const updateData = {
      ...data,
      updatedAt: new Date(),
    };

    await db.update(products).set(updateData).where(eq(products.id, productId));

    await db.insert(activityLogs).values({
      userId: session.userId,
      action: "UPDATE_PRODUCT",
      entityType: "PRODUCT",
      entityId: productId,
      details: `Updated product: ${productId}`,
    });

    return { success: true };
  } catch (error) {
    console.error("Update product error:", error);
    return { success: false, error: "Failed to update product" };
  }
}

export async function archiveProduct(productId: string) {
  try {
    const session = await requireAuth();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    await db
      .update(products)
      .set({ 
        status: "ARCHIVED",
        updatedAt: new Date(),
      })
      .where(eq(products.id, productId));

    await db.insert(activityLogs).values({
      userId: session.userId,
      action: "ARCHIVE_PRODUCT",
      entityType: "PRODUCT",
      entityId: productId,
      details: `Archived product: ${productId}`,
    });

    return { success: true };
  } catch (error) {
    console.error("Archive product error:", error);
    return { success: false, error: "Failed to archive product" };
  }
}

export async function getProducts(includeArchived: boolean = false) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    let allProducts;
    if (includeArchived) {
      allProducts = await db.query.products.findMany({
        with: {
          stocks: true,
        },
      });
    } else {
      allProducts = await db.query.products.findMany({
        where: eq(products.status, "ACTIVE"),
        with: {
          stocks: true,
        },
      });
    }

    // Calculate current stock for each product
    const productsWithStock = allProducts.map(product => {
      const currentStock = product.stocks.reduce((total, stock) => total + stock.quantity, 0);
      return {
        ...product,
        currentStock,
      };
    });

    return { success: true, products: productsWithStock };
  } catch (error) {
    console.error("Get products error:", error);
    return { success: false, error: "Failed to fetch products" };
  }
}

export async function getProduct(productId: string) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const product = await db.query.products.findFirst({
      where: eq(products.id, productId),
      with: {
        stocks: true,
      },
    });

    if (!product) {
      return { success: false, error: "Product not found" };
    }

    // Calculate current stock
    const currentStock = product.stocks.reduce((total, stock) => total + stock.quantity, 0);
    const productWithStock = {
      ...product,
      currentStock,
    };

    return { success: true, product: productWithStock };
  } catch (error) {
    console.error("Get product error:", error);
    return { success: false, error: "Failed to fetch product" };
  }
}

export async function addStock(
  productId: string,
  quantity: number,
  buyingPrice: string,
  supplier?: string
) {
  try {
    const session = await requireAuth();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const product = await db.query.products.findFirst({
      where: eq(products.id, productId),
    });

    if (!product) {
      return { success: false, error: "Product not found" };
    }

    // Add to stocks table
    await db.insert(stocks).values({
      productId,
      quantity,
      createdBy: session.userId,
    });

    await db.insert(stockActions).values({
      productId,
      actionType: "STOCK_IN",
      quantity,
      buyingPrice,
      supplier: supplier || null,
      doneBy: session.userId,
    });

    await db.insert(activityLogs).values({
      userId: session.userId,
      action: "STOCK_IN",
      entityType: "STOCK",
      details: `Added ${quantity} units to ${product.name}`,
    });

    return { success: true };
  } catch (error) {
    console.error("Add stock error:", error);
    return { success: false, error: "Failed to add stock" };
  }
}

export async function sellProduct(productId: string, quantity: number) {
  try {
    const session = await requireAuth();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const product = await db.query.products.findFirst({
      where: eq(products.id, productId),
    });

    if (!product) {
      return { success: false, error: "Product not found" };
    }

    // Get current stock from stocks table
    const stockResult = await db
      .select({ total: sum(stocks.quantity) })
      .from(stocks)
      .where(eq(stocks.productId, productId));
    
    const currentStock = Number(stockResult[0]?.total || 0);

    if (currentStock < quantity) {
      return { success: false, error: "Insufficient stock" };
    }

    // Record the sale as negative stock
    await db.insert(stocks).values({
      productId,
      quantity: -quantity,
      createdBy: session.userId,
    });

    await db.insert(stockActions).values({
      productId,
      actionType: "SOLD",
      quantity,
      doneBy: session.userId,
    });

    await db.insert(activityLogs).values({
      userId: session.userId,
      action: "STOCK_OUT",
      entityType: "STOCK",
      details: `Sold ${quantity} units of ${product.name}`,
    });

    return { success: true };
  } catch (error) {
    console.error("Sell product error:", error);
    return { success: false, error: "Failed to sell product" };
  }
}

export async function markBroken(
  productId: string,
  quantity: number,
  reason: string
) {
  try {
    const session = await requireAuth();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const product = await db.query.products.findFirst({
      where: eq(products.id, productId),
    });

    if (!product) {
      return { success: false, error: "Product not found" };
    }

    // Get current stock from stocks table
    const stockResult = await db
      .select({ total: sum(stocks.quantity) })
      .from(stocks)
      .where(eq(stocks.productId, productId));
    
    const currentStock = Number(stockResult[0]?.total || 0);

    if (currentStock < quantity) {
      return { success: false, error: "Insufficient stock" };
    }

    // Record the breakage as negative stock
    await db.insert(stocks).values({
      productId,
      quantity: -quantity,
      createdBy: session.userId,
    });

    await db.insert(stockActions).values({
      productId,
      actionType: "BROKEN",
      quantity,
      reason,
      doneBy: session.userId,
    });

    await db.insert(activityLogs).values({
      userId: session.userId,
      action: "BROKEN",
      entityType: "STOCK",
      details: `Marked ${quantity} units of ${product.name} as broken: ${reason}`,
    });

    return { success: true };
  } catch (error) {
    console.error("Mark broken error:", error);
    return { success: false, error: "Failed to mark as broken" };
  }
}

export async function countStock(productId: string, countedQuantity: number) {
  try {
    const session = await requireAuth();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const product = await db.query.products.findFirst({
      where: eq(products.id, productId),
    });

    if (!product) {
      return { success: false, error: "Product not found" };
    }

    // Get current stock from stocks table
    const stockResult = await db
      .select({ total: sum(stocks.quantity) })
      .from(stocks)
      .where(eq(stocks.productId, productId));
    
    const systemStock = Number(stockResult[0]?.total || 0);
    const difference = countedQuantity - systemStock;

    // Add stock adjustment if there's a difference
    if (difference !== 0) {
      await db.insert(stocks).values({
        productId,
        quantity: difference,
        createdBy: session.userId,
      });
    }

    await db.insert(stockActions).values({
      productId,
      actionType: "COUNTED",
      quantity: countedQuantity,
      reason: `Stock count: system=${systemStock}, actual=${countedQuantity}, difference=${difference}`,
      doneBy: session.userId,
    });

    await db.insert(activityLogs).values({
      userId: session.userId,
      action: "COUNT",
      entityType: "STOCK",
      details: `Counted stock for ${product.name}: system=${systemStock}, actual=${countedQuantity}, difference=${difference}`,
    });

    return { success: true, difference };
  } catch (error) {
    console.error("Count stock error:", error);
    return { success: false, error: "Failed to count stock" };
  }
}
