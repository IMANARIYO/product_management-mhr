"use server";

import { eq, sum, and } from "drizzle-orm";
import { getSession, requireAuth } from "@/lib/auth-middleware";
import { activityLogs, products, stocks, stockActions } from "@/db/schema";
import { db } from "@/index";
import {
  NewProduct,
  UpdateProduct,
  productTypeValues,
  ProductType,
} from "@/db/types";

// Validation helpers
function validateProductData(data: {
  name: string;
  type: string;
  size: string;
  buyingPrice: string;
  sellingPrice: string;
}) {
  const errors: string[] = [];

  if (!data.name?.trim()) errors.push("Product name is required");
  if (!data.type || !productTypeValues.includes(data.type as ProductType)) {
    errors.push(`Product type must be one of: ${productTypeValues.join(", ")}`);
  }
  if (!data.size?.trim()) errors.push("Product size is required");

  const buyingPrice = parseFloat(data.buyingPrice);
  const sellingPrice = parseFloat(data.sellingPrice);

  if (isNaN(buyingPrice) || buyingPrice <= 0) {
    errors.push("Buying price must be greater than 0");
  }
  if (isNaN(sellingPrice) || sellingPrice <= buyingPrice) {
    errors.push("Selling price must be greater than buying price");
  }

  return errors;
}

async function checkDuplicateProduct(
  name: string,
  type: string,
  size: string,
  excludeId?: string
) {
  const whereClause = excludeId
    ? and(
        eq(products.name, name),
        eq(products.type, type as ProductType),
        eq(products.size, size),
        eq(products.status, "ACTIVE")
      )
    : and(
        eq(products.name, name),
        eq(products.type, type as ProductType),
        eq(products.size, size),
        eq(products.status, "ACTIVE")
      );

  const existing = await db.query.products.findFirst({ where: whereClause });
  return existing;
}

export async function createProduct(
  data: Omit<
    NewProduct,
    "id" | "createdAt" | "updatedAt" | "createdBy" | "status"
  >
) {
  try {
    const session = await requireAuth();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    // Validate input data
    const validationErrors = validateProductData(data);
    if (validationErrors.length > 0) {
      return { success: false, error: validationErrors.join(", ") };
    }

    // Check for duplicate product (name + type + size)
    const duplicate = await checkDuplicateProduct(
      data.name,
      data.type,
      data.size
    );
    if (duplicate) {
      return {
        success: false,
        error: `Product already exists: ${data.name} ${data.size} (${data.type})`,
      };
    }

    const productData: NewProduct = {
      ...data,
      createdBy: session.userId,
      status: "ACTIVE", // System controls status
    };

    const [newProduct] = await db
      .insert(products)
      .values(productData)
      .returning();

    await db.insert(activityLogs).values({
      userId: session.userId,
      action: "CREATE_PRODUCT",
      entityType: "PRODUCT",
      entityId: newProduct.id,
      details: `Created product: ${data.name} ${data.size} (${data.type})`,
    });

    return { success: true, product: newProduct };
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

    // Check if product exists
    const existingProduct = await db.query.products.findFirst({
      where: eq(products.id, productId),
    });

    if (!existingProduct) {
      return { success: false, error: "Product not found" };
    }

    // Validate updated data if provided
    if (
      data.name ||
      data.type ||
      data.size ||
      data.buyingPrice ||
      data.sellingPrice
    ) {
      const validationData = {
        name: data.name || existingProduct.name,
        type: data.type || existingProduct.type,
        size: data.size || existingProduct.size,
        buyingPrice: data.buyingPrice || existingProduct.buyingPrice,
        sellingPrice: data.sellingPrice || existingProduct.sellingPrice,
      };

      const validationErrors = validateProductData(validationData);
      if (validationErrors.length > 0) {
        return { success: false, error: validationErrors.join(", ") };
      }

      // Check for duplicate if name/type/size changed
      if (data.name || data.type || data.size) {
        const duplicate = await checkDuplicateProduct(
          validationData.name,
          validationData.type,
          validationData.size,
          productId
        );
        if (duplicate) {
          return {
            success: false,
            error: `Product already exists: ${validationData.name} ${validationData.size} (${validationData.type})`,
          };
        }
      }
    }

    // Update with system-controlled timestamp
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
      details: `Updated product: ${existingProduct.name}`,
    });

    return { success: true };
  } catch (error) {
    console.error("Update product error:", error);
    return { success: false, error: "Failed to update product" };
  }
}

export async function deactivateProduct(productId: string) {
  try {
    const session = await requireAuth();
    if (!session) {
      return { 
        success: false, 
        error: "Unauthorized",
        toast: {
          type: "error" as const,
          title: "Access Denied",
          message: "You are not authorized to perform this action"
        }
      };
    }

    // Check if product exists and is ACTIVE
    const product = await db.query.products.findFirst({
      where: eq(products.id, productId),
    });

    if (!product) {
      return { 
        success: false, 
        error: "Product not found",
        toast: {
          type: "error" as const,
          title: "Product Not Found",
          message: "The product you're trying to deactivate doesn't exist"
        }
      };
    }

    if (product.status !== "ACTIVE") {
      return { 
        success: false, 
        error: "Product is already inactive",
        toast: {
          type: "warning" as const,
          title: "Already Inactive",
          message: "This product is already deactivated"
        }
      };
    }

    // Check current stock - prevent deactivation if product has stock
    const stockResult = await db
      .select({ total: sum(stocks.quantity) })
      .from(stocks)
      .where(eq(stocks.productId, productId));

    const currentStock = Number(stockResult[0]?.total || 0);
    
    if (currentStock > 0) {
      return {
        success: false,
        error: `Cannot deactivate product with existing stock. Current stock: ${currentStock} units`,
        toast: {
          type: "error" as const,
          title: "Cannot Deactivate Product",
          message: `This product has ${currentStock} units in stock. Please sell or remove all stock before deactivating.`
        }
      };
    }

    // Soft delete - set status to ARCHIVED
    await db
      .update(products)
      .set({
        status: "ARCHIVED",
        updatedAt: new Date(),
      })
      .where(eq(products.id, productId));

    await db.insert(activityLogs).values({
      userId: session.userId,
      action: "DEACTIVATE_PRODUCT",
      entityType: "PRODUCT",
      entityId: productId,
      details: `Deactivated product: ${product.name}`,
    });

    return { 
      success: true,
      toast: {
        type: "success" as const,
        title: "Product Deactivated",
        message: `${product.name} has been successfully deactivated`
      }
    };
  } catch (error) {
    console.error("Deactivate product error:", error);
    return { 
      success: false, 
      error: "Failed to deactivate product",
      toast: {
        type: "error" as const,
        title: "Deactivation Failed",
        message: "An error occurred while deactivating the product"
      }
    };
  }
}

export async function reactivateProduct(productId: string) {
  try {
    const session = await requireAuth();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    // Check if product exists and is ARCHIVED
    const product = await db.query.products.findFirst({
      where: eq(products.id, productId),
    });

    if (!product) {
      return { success: false, error: "Product not found" };
    }

    if (product.status !== "ARCHIVED") {
      return { success: false, error: "Product is already active" };
    }

    // Check for naming conflict with active products
    const duplicate = await checkDuplicateProduct(
      product.name,
      product.type,
      product.size
    );
    if (duplicate) {
      return {
        success: false,
        error: `Cannot reactivate: Active product already exists with same name, type, and size`,
      };
    }

    // Reactivate product
    await db
      .update(products)
      .set({
        status: "ACTIVE",
        updatedAt: new Date(),
      })
      .where(eq(products.id, productId));

    await db.insert(activityLogs).values({
      userId: session.userId,
      action: "REACTIVATE_PRODUCT",
      entityType: "PRODUCT",
      entityId: productId,
      details: `Reactivated product: ${product.name}`,
    });

    return { success: true };
  } catch (error) {
    console.error("Reactivate product error:", error);
    return { success: false, error: "Failed to reactivate product" };
  }
}

export async function getProducts(includeInactive: boolean = false) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    let allProducts;
    if (includeInactive) {
      // Admin view - show all products
      allProducts = await db.query.products.findMany({
        with: {
          stocks: true,
        },
        orderBy: (products, { desc }) => [desc(products.createdAt)],
      });
    } else {
      // POS/Stock view - show ACTIVE only
      allProducts = await db.query.products.findMany({
        where: eq(products.status, "ACTIVE"),
        with: {
          stocks: true,
        },
        orderBy: (products, { desc }) => [desc(products.createdAt)],
      });
    }

    // Calculate current stock for each product
    const productsWithStock = allProducts.map((product) => {
      const currentStock = product.stocks.reduce(
        (total, stock) => total + stock.quantity,
        0
      );
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
    const currentStock = product.stocks.reduce(
      (total, stock) => total + stock.quantity,
      0
    );
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

    // Check if product exists and is ACTIVE
    const product = await db.query.products.findFirst({
      where: eq(products.id, productId),
    });

    if (!product) {
      return { success: false, error: "Product not found" };
    }

    if (product.status !== "ACTIVE") {
      return { success: false, error: "Cannot add stock to inactive product" };
    }

    if (quantity <= 0) {
      return { success: false, error: "Quantity must be greater than 0" };
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

    // Check if product exists and is ACTIVE
    const product = await db.query.products.findFirst({
      where: eq(products.id, productId),
    });

    if (!product) {
      return { success: false, error: "Product not found" };
    }

    if (product.status !== "ACTIVE") {
      return { success: false, error: "Cannot sell inactive product" };
    }

    if (quantity <= 0) {
      return { success: false, error: "Quantity must be greater than 0" };
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
      sellingPrice: product.sellingPrice,
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
