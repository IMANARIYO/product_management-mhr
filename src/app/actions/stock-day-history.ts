"use server";

import { stockDays, dailyStockSnapshots } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-middleware";
import { db } from "@/index";

export async function getAllStockDays() {
  const user = await requireAuth();
  if (!user) throw new Error("Unauthorized");

  const allStockDays = await db.query.stockDays.findMany({
    orderBy: desc(stockDays.businessDate),
    with: {
      opener: {
        columns: { fullName: true, phoneNumber: true }
      },
      verifier: {
        columns: { fullName: true, phoneNumber: true }
      },
      closer: {
        columns: { fullName: true, phoneNumber: true }
      }
    }
  });

  return { success: true, stockDays: allStockDays };
}

export async function getStockDayDetails(stockDayId: string) {
  const user = await requireAuth();
  if (!user) throw new Error("Unauthorized");

  const stockDay = await db.query.stockDays.findFirst({
    where: eq(stockDays.id, stockDayId),
    with: {
      opener: {
        columns: { fullName: true, phoneNumber: true }
      },
      verifier: {
        columns: { fullName: true, phoneNumber: true }
      },
      closer: {
        columns: { fullName: true, phoneNumber: true }
      }
    }
  });

  if (!stockDay) {
    throw new Error("Stock day not found");
  }

  const snapshots = await db.query.dailyStockSnapshots.findMany({
    where: eq(dailyStockSnapshots.stockDayId, stockDayId),
    with: {
      product: true
    },
    orderBy: desc(dailyStockSnapshots.createdAt)
  });

  return { 
    success: true, 
    stockDay, 
    snapshots 
  };
}