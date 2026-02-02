"use server";

import { db } from "@/index";
import { stocks } from "@/db/schema";
import { eq, sum } from "drizzle-orm";

export async function getCurrentStock(productId: string): Promise<number> {
  try {
    const stockEntries = await db
      .select({
        totalStock: sum(stocks.quantity),
      })
      .from(stocks)
      .where(eq(stocks.productId, productId));

    return Number(stockEntries[0]?.totalStock || 0);
  } catch (error) {
    console.error("Get current stock error:", error);
    return 0;
  }
}

export async function getAllCurrentStocks(): Promise<Record<string, number>> {
  try {
    const stockEntries = await db
      .select({
        productId: stocks.productId,
        totalStock: sum(stocks.quantity),
      })
      .from(stocks)
      .groupBy(stocks.productId);

    const stockMap: Record<string, number> = {};
    stockEntries.forEach(entry => {
      stockMap[entry.productId] = Number(entry.totalStock || 0);
    });

    return stockMap;
  } catch (error) {
    console.error("Get all current stocks error:", error);
    return {};
  }
}