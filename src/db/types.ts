import {
  users,
  products,
  stocks,
  stockActions,
  dailyStockSnapshots,
  creditSales,
  creditSaleItems,
  activityLogs,
  stockDays,
  purchaseOrders,
  purchaseOrderItems,
  userRoleEnum,
  userStatusEnum,
  productTypeEnum,
  productStatusEnum,
  stockActionTypeEnum,
  creditStatusEnum,
  stockDayStatusEnum,
  purchaseOrderStatusEnum,
} from "./schema";

// Enum Values Arrays (Single Source of Truth)
export const userRoleValues = [...userRoleEnum.enumValues] as const;
export const userStatusValues = [...userStatusEnum.enumValues] as const;
export const productTypeValues = [...productTypeEnum.enumValues] as const;
export const productStatusValues = [...productStatusEnum.enumValues] as const;
export const stockActionTypeValues = [...stockActionTypeEnum.enumValues] as const;
export const creditStatusValues = [...creditStatusEnum.enumValues] as const;
export const stockDayStatusValues = [...stockDayStatusEnum.enumValues] as const;
export const purchaseOrderStatusValues = [...purchaseOrderStatusEnum.enumValues] as const;

// Enum Types
export type UserRole = typeof userRoleValues[number];
export type UserStatus = typeof userStatusValues[number];
export type ProductType = typeof productTypeValues[number];
export type ProductStatus = typeof productStatusValues[number];
export type StockActionType = typeof stockActionTypeValues[number];
export type CreditStatus = typeof creditStatusValues[number];
export type StockDayStatus = typeof stockDayStatusValues[number];
export type PurchaseOrderStatus = typeof purchaseOrderStatusValues[number];

// Size units for products (optimized for bar/drink products)
export const sizeUnits = [
  // Liquid volumes (most common for bars)
  'ml', 'cl', 'L', 'oz', 'fl oz',
  // Weight (for snacks, garnishes)
  'g', 'kg', 'lb',
  // Count/packaging
  'pcs', 'pack', 'bottle', 'can', 'box', 'case',
  // Bar-specific
  'shot', 'jigger', 'pint', 'quart', 'gallon'
] as const;

export type SizeUnit = typeof sizeUnits[number];



// Table Types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UpdateUser = Partial<
  Omit<NewUser, "id" | "createdAt" | "updatedAt">
>;

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type UpdateProduct = Partial<
  Omit<NewProduct, "id" | "createdAt" | "updatedAt" | "createdBy">
>;

export type Stock = typeof stocks.$inferSelect;
export type NewStock = typeof stocks.$inferInsert;
export type UpdateStock = Partial<
  Omit<NewStock, "id" | "createdAt" | "updatedAt">
>;

export type StockAction = typeof stockActions.$inferSelect;
export type NewStockAction = typeof stockActions.$inferInsert;
export type UpdateStockAction = Partial<
  Omit<NewStockAction, "id" | "createdAt" | "updatedAt">
>;

export type DailyStockSnapshot = typeof dailyStockSnapshots.$inferSelect;
export type NewDailyStockSnapshot = typeof dailyStockSnapshots.$inferInsert;
export type UpdateDailyStockSnapshot = Partial<
  Omit<NewDailyStockSnapshot, "id" | "createdAt" | "updatedAt">
>;

export type CreditSale = typeof creditSales.$inferSelect;
export type NewCreditSale = typeof creditSales.$inferInsert;
export type UpdateCreditSale = Partial<
  Omit<NewCreditSale, "id" | "createdAt" | "updatedAt">
>;

export type CreditSaleItem = typeof creditSaleItems.$inferSelect;
export type NewCreditSaleItem = typeof creditSaleItems.$inferInsert;
export type UpdateCreditSaleItem = Partial<
  Omit<NewCreditSaleItem, "id" | "createdAt" | "updatedAt">
>;

export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;
export type UpdateActivityLog = Partial<
  Omit<NewActivityLog, "id" | "createdAt" | "updatedAt">
>;

export type StockDay = typeof stockDays.$inferSelect;
export type NewStockDay = typeof stockDays.$inferInsert;
export type UpdateStockDay = Partial<
  Omit<NewStockDay, "id" | "createdAt" | "updatedAt">
>;

export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type NewPurchaseOrder = typeof purchaseOrders.$inferInsert;
export type UpdatePurchaseOrder = Partial<
  Omit<NewPurchaseOrder, "id" | "createdAt" | "updatedAt">
>;

export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;
export type NewPurchaseOrderItem = typeof purchaseOrderItems.$inferInsert;
export type UpdatePurchaseOrderItem = Partial<
  Omit<NewPurchaseOrderItem, "id" | "createdAt" | "updatedAt">
>;

// Extended Types with Relations
export type ProductWithStock = Product & {
  currentStock: number;
};

export type ProductWithCreator = Product & {
  creator: User;
};

export type StockActionWithDetails = StockAction & {
  product: Product;
  user: User;
};

export type CreditSaleWithItems = CreditSale & {
  items: (CreditSaleItem & {
    product: Product;
  })[];
  user: User;
};

export type PurchaseOrderWithItems = PurchaseOrder & {
  items: (PurchaseOrderItem & {
    product: Product;
  })[];
  creator: User;
};

export type StockDayWithSnapshots = StockDay & {
  snapshots: (DailyStockSnapshot & {
    product: Product;
  })[];
};

// Utility Types
export type EntityType =
  | "USER"
  | "PRODUCT"
  | "STOCK"
  | "CREDIT"
  | "PURCHASE_ORDER"
  | "STOCK_DAY";

export type ActionType =
  | "CREATE_USER"
  | "UPDATE_USER"
  | "DELETE_USER"
  | "CREATE_PRODUCT"
  | "UPDATE_PRODUCT"
  | "DELETE_PRODUCT"
  | "STOCK_IN"
  | "STOCK_OUT"
  | "STOCK_COUNT"
  | "CREATE_CREDIT"
  | "UPDATE_CREDIT"
  | "PAY_CREDIT"
  | "CREATE_PURCHASE_ORDER"
  | "UPDATE_PURCHASE_ORDER"
  | "SUBMIT_PURCHASE_ORDER"
  | "APPROVE_PURCHASE_ORDER"
  | "STOCK_DAY_OPENED"
  | "STOCK_DAY_VERIFIED"
  | "STOCK_DAY_CLOSED";
