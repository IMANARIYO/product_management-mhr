import {
  pgTable,
  text,
  varchar,
  integer,
  decimal,
  timestamp,
  uuid,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
export const purchaseOrderStatusEnum = pgEnum("purchase_order_status", [
  "DRAFT", // still editing
  "SUBMITTED", // sent for approval / supplier
  "APPROVED",
  "RECEIVED", // stock will be added
  "CANCELLED",
]);

// Enums
export const userRoleEnum = pgEnum("user_role", ["ADMIN", "EMPLOYEE"]);

export const userStatusEnum = pgEnum("user_status", ["ACTIVE", "DISABLED"]);
export const productTypeEnum = pgEnum("product_type", [
  "BEER",
  "SODA",
  "WINE",
  "SPIRIT",
  "LIQUOR",
]);

export const stockDayStatusEnum = pgEnum("stock_day_status", [
  "OPEN",
  "VERIFIED",
  "CLOSED",
]);

export const stockDays = pgTable("stock_days", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessDate: timestamp("business_date", {
    withTimezone: false,
    mode: "date",
  })
    .notNull()
    .unique(),
  status: stockDayStatusEnum("status").notNull().default("OPEN"),
  openedAt: timestamp("opened_at", { withTimezone: true }).defaultNow().notNull(),
  openedBy: uuid("opened_by").notNull(),

  // Verification
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  verifiedBy: uuid("verified_by"),

  // Closing
  closedAt: timestamp("closed_at", { withTimezone: true }),
  closedBy: uuid("closed_by"),

  // Daily totals
  totalExpectedOpening: integer("total_expected_opening").default(0).notNull(), // sum of expectedOpeningStock
  totalOpeningStock: integer("total_opening_stock").default(0).notNull(), // sum of openingStock
  totalStockIn: integer("total_stock_in").default(0).notNull(), // sum of stockIn
  totalStockOut: integer("total_stock_out").default(0).notNull(), // sum of stockOut
  totalClosingStock: integer("total_closing_stock").default(0).notNull(), // sum of closingStock

  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const productStatusEnum = pgEnum("product_status", [
  "ACTIVE",
  "ARCHIVED",
]);
export const stockActionTypeEnum = pgEnum("stock_action_type", [
  "STOCK_IN",
  "SOLD",
  "BROKEN",
  "COUNTED",
]);
export const creditStatusEnum = pgEnum("credit_status", ["UNPAID", "PAID"]);

// Users table
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  phoneNumber: varchar("phone_number", { length: 20 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull().default("EMPLOYEE"),
  status: userStatusEnum("status").notNull().default("ACTIVE"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Products table
export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  type: productTypeEnum("type").notNull(),
  size: varchar("size", { length: 50 }).notNull(),
  image: text("image"),
  buyingPrice: decimal("buying_price", { precision: 10, scale: 2 }).notNull(),
  sellingPrice: decimal("selling_price", { precision: 10, scale: 2 }).notNull(),
  status: productStatusEnum("status").notNull().default("ACTIVE"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
});
export const stocks = pgTable("stocks", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id),
  quantity: integer("quantity").notNull(),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Stock Actions table (Audit Trail for all stock movements)
export const stockActions = pgTable("stock_actions", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id),
  actionType: stockActionTypeEnum("action_type").notNull(),
  quantity: integer("quantity").notNull(),
  buyingPrice: decimal("buying_price", { precision: 10, scale: 2 }),
  sellingPrice: decimal("selling_price", { precision: 10, scale: 2 }),
  supplier: varchar("supplier", { length: 255 }),
  reason: text("reason"),
  doneBy: uuid("done_by")
    .notNull()
    .references(() => users.id),
  doneAt: timestamp("done_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const dailyStockSnapshots = pgTable(
  "daily_stock_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    stockDayId: uuid("stock_day_id")
      .notNull()
      .references(() => stockDays.id),

    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),

    // System value (auto-copied at day opening)
    expectedOpeningStock: integer("expected_opening_stock").notNull(),
    // Physical count (filled during verification)
    openingStock: integer("opening_stock").notNull(),
    // Difference between actual and expected
    variance: integer("variance"),

    // Daily movements (optional but useful)
    stockIn: integer("stock_in").notNull().default(0),
    stockOut: integer("stock_out").notNull().default(0),

    closingStock: integer("closing_stock").notNull(),
    isOutOfStock: integer("is_out_of_stock").notNull().default(0),

    // Verification tracking
    isVerified: integer("is_verified").notNull().default(0),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    verifiedBy: uuid("verified_by").references(() => users.id),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    uniqueDayProduct: {
      columns: [table.stockDayId, table.productId],
      unique: true,
    },
  })
);

// Credit Sales table (Header)
export const creditSales = pgTable("credit_sales", {
  id: uuid("id").defaultRandom().primaryKey(),

  // Customer info
  customerId: uuid("customer_id"), // optional if you have a customers table
  customerName: varchar("customer_name", { length: 255 }).notNull(),
  customerPhone: varchar("customer_phone", { length: 20 }).notNull(),

  // Financial info
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  amountOwed: decimal("amount_owed", { precision: 10, scale: 2 }).notNull(),
  status: creditStatusEnum("status").notNull().default("UNPAID"),

  // Employee handling the credit
  doneBy: uuid("done_by").notNull(),

  // Payment info
  paidAt: timestamp("paid_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Credit Sale Items table (Details)
export const creditSaleItems = pgTable("credit_sale_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  creditSaleId: uuid("credit_sale_id").notNull(),
  productId: uuid("product_id").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Activity Tracking (Audit Trail)
export const activityLogs = pgTable("activity_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  action: varchar("action", { length: 255 }).notNull(),
  entityType: varchar("entity_type", { length: 50 }).notNull(), // 'USER', 'PRODUCT', 'STOCK', 'CREDIT'
  entityId: uuid("entity_id"),
  details: text("details"),
  doneAt: timestamp("done_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  createdProducts: many(products),
  createdStockActions: many(stockActions),
  createdCredits: many(creditSales),
  activityLogs: many(activityLogs),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  creator: one(users, {
    fields: [products.createdBy],
    references: [users.id],
  }),
  stocks: many(stocks),
  stockActions: many(stockActions),
  creditSaleItems: many(creditSaleItems),
}));

export const stocksRelations = relations(stocks, ({ one }) => ({
  product: one(products, {
    fields: [stocks.productId],
    references: [products.id],
  }),
  createdBy: one(users, {
    fields: [stocks.createdBy],
    references: [users.id],
  }),
}));

export const stockActionsRelations = relations(stockActions, ({ one }) => ({
  product: one(products, {
    fields: [stockActions.productId],
    references: [products.id],
  }),
  user: one(users, {
    fields: [stockActions.doneBy],
    references: [users.id],
  }),
}));

export const creditSalesRelations = relations(creditSales, ({ one, many }) => ({
  user: one(users, {
    fields: [creditSales.doneBy],
    references: [users.id],
  }),
  items: many(creditSaleItems),
}));

export const creditSaleItemsRelations = relations(
  creditSaleItems,
  ({ one }) => ({
    creditSale: one(creditSales, {
      fields: [creditSaleItems.creditSaleId],
      references: [creditSales.id],
    }),
    product: one(products, {
      fields: [creditSaleItems.productId],
      references: [products.id],
    }),
  })
);

export const stockDaysRelations = relations(stockDays, ({ many, one }) => ({
  snapshots: many(dailyStockSnapshots),
  opener: one(users, {
    fields: [stockDays.openedBy],
    references: [users.id],
  }),
  verifier: one(users, {
    fields: [stockDays.verifiedBy],
    references: [users.id],
  }),
  closer: one(users, {
    fields: [stockDays.closedBy],
    references: [users.id],
  }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}));

export const dailyStockSnapshotsRelations = relations(
  dailyStockSnapshots,
  ({ one }) => ({
    stockDay: one(stockDays, {
      fields: [dailyStockSnapshots.stockDayId],
      references: [stockDays.id],
    }),
    product: one(products, {
      fields: [dailyStockSnapshots.productId],
      references: [products.id],
    }),
  })
);
export const purchaseOrders = pgTable("purchase_orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderNumber: varchar("order_number", { length: 50 }).notNull().unique(),
  totalAmount: decimal("total_amount", {
    precision: 12,
    scale: 2,
  })
    .notNull()
    .default("0"),
  status: purchaseOrderStatusEnum("status").notNull().default("DRAFT"),
  createdBy: uuid("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  notes: text("notes"),
});

export const purchaseOrderItems = pgTable(
  "purchase_order_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    purchaseOrderId: uuid("purchase_order_id").notNull(),
    productId: uuid("product_id").notNull(),
    quantity: integer("quantity").notNull(),
    unitCost: decimal("unit_cost", {
      precision: 10,
      scale: 2,
    }).notNull(),
    totalCost: decimal("total_cost", {
      precision: 12,
      scale: 2,
    }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    uniqueProductPerOrder: {
      columns: [table.purchaseOrderId, table.productId],
      unique: true,
    },
  })
);

export const purchaseOrdersRelations = relations(
  purchaseOrders,
  ({ many, one }) => ({
    items: many(purchaseOrderItems),
    creator: one(users, {
      fields: [purchaseOrders.createdBy],
      references: [users.id],
    }),
  })
);

export const purchaseOrderItemsRelations = relations(
  purchaseOrderItems,
  ({ one }) => ({
    order: one(purchaseOrders, {
      fields: [purchaseOrderItems.purchaseOrderId],
      references: [purchaseOrders.id],
    }),
    product: one(products, {
      fields: [purchaseOrderItems.productId],
      references: [products.id],
    }),
  })
);
