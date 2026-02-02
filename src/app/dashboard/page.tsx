import { requireAuth } from '@/lib/auth-middleware';
import { db } from '@/index';
import { products, stocks, stockActions, creditSales } from '@/db/schema';
import { eq, desc, sum } from 'drizzle-orm';
import { ResponsiveDashboard } from '@/components/dashboard/responsive-dashboard';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const session = await requireAuth();
  if (!session) {
    redirect('/login');
  }

  // Get stats
  const [allProducts, recentStock, unpaidCredits, allUsers, stockData] = await Promise.all([
    db.query.products.findMany({
      where: eq(products.status, 'ACTIVE'),
    }),
    db.query.stockActions.findMany({
      orderBy: [desc(stockActions.doneAt)],
      limit: 10,
      with: {
        product: true,
        user: true,
      },
    }),
    db.query.creditSales.findMany({
      where: eq(creditSales.status, 'UNPAID'),
      with: {
        user: true,
      },
    }),
    session.role === 'ADMIN'
      ? db.query.users.findMany()
      : Promise.resolve([]),
    db.select({ totalStock: sum(stocks.quantity) }).from(stocks),
  ]);

  // Calculate totals
  const totalStock = Number(stockData[0]?.totalStock) || 0;
  const totalUnpaidAmount = unpaidCredits.reduce(
    (sum: number, credit: { amountOwed: string }) => sum + parseFloat(credit.amountOwed),
    0
  );
  const totalProducts = allProducts.length;
  const totalEmployees = session.role === 'ADMIN' ? allUsers.filter((u: { role: string }) => u.role === 'EMPLOYEE').length : 0;

  return (
    <ResponsiveDashboard
      session={session}
      stats={{
        totalStock,
        totalProducts,
        unpaidCredits: totalUnpaidAmount,
        totalEmployees,
      }}
      recentActivities={recentStock}
    />
  );
}
