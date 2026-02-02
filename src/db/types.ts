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
} from './schema';

export type UserRole = (typeof userRoleEnum.enumValues)[number];
export type UserStatus = (typeof userStatusEnum.enumValues)[number];
export type ProductType = (typeof productTypeEnum.enumValues)[number];
export type ProductStatus = (typeof productStatusEnum.enumValues)[number];
export type StockActionType = (typeof stockActionTypeEnum.enumValues)[number];
export type CreditStatus = (typeof creditStatusEnum.enumValues)[number];
export type StockDayStatus = (typeof stockDayStatusEnum.enumValues)[number];
export type PurchaseOrderStatus = (typeof purchaseOrderStatusEnum.enumValues)[number];

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UpdateUser = Partial<Omit<NewUser, "id" | "createdAt" | "updatedAt">>;

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type UpdateProduct = Partial<Omit<NewProduct, "id" | "createdAt" | "updatedAt" | "createdBy">>;

export type Stock = typeof stocks.$inferSelect;
export type NewStock = typeof stocks.$inferInsert;
export type UpdateStock = Partial<Omit<NewStock, "id" | "createdAt" | "updatedAt">>;

export type StockAction = typeof stockActions.$inferSelect;
export type NewStockAction = typeof stockActions.$inferInsert;
export type UpdateStockAction = Partial<Omit<NewStockAction, "id" | "createdAt" | "updatedAt">>;

export type DailyStockSnapshot = typeof dailyStockSnapshots.$inferSelect;
export type NewDailyStockSnapshot = typeof dailyStockSnapshots.$inferInsert;
export type UpdateDailyStockSnapshot = Partial<Omit<NewDailyStockSnapshot, "id" | "createdAt" | "updatedAt">>;

export type CreditSale = typeof creditSales.$inferSelect;
export type NewCreditSale = typeof creditSales.$inferInsert;
export type UpdateCreditSale = Partial<Omit<NewCreditSale, "id" | "createdAt" | "updatedAt">>;

export type CreditSaleItem = typeof creditSaleItems.$inferSelect;
export type NewCreditSaleItem = typeof creditSaleItems.$inferInsert;
export type UpdateCreditSaleItem = Partial<Omit<NewCreditSaleItem, "id" | "createdAt" | "updatedAt">>;

export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;
export type UpdateActivityLog = Partial<Omit<NewActivityLog, "id" | "createdAt" | "updatedAt">>;

export type StockDay = typeof stockDays.$inferSelect;
export type NewStockDay = typeof stockDays.$inferInsert;
export type UpdateStockDay = Partial<Omit<NewStockDay, "id" | "createdAt" | "updatedAt">>;

export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type NewPurchaseOrder = typeof purchaseOrders.$inferInsert;
export type UpdatePurchaseOrder = Partial<Omit<NewPurchaseOrder, "id" | "createdAt" | "updatedAt">>;

export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;
export type NewPurchaseOrderItem = typeof purchaseOrderItems.$inferInsert;
export type UpdatePurchaseOrderItem = Partial<Omit<NewPurchaseOrderItem, "id" | "createdAt" | "updatedAt">>;