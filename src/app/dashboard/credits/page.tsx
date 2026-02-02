import { requireAuth } from '@/lib/auth-middleware';
import { getProducts } from '@/app/actions/products';
import { CreditSalesManager } from '@/components/credit-sales/credit-sales-manager';

export default async function CreditsPage() {
  const session = await requireAuth();
  const productsResult = await getProducts(false);

  if (!productsResult.success) {
    return <div className="p-8">Error loading products</div>;
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Credit Sales</h1>
        <p className="text-muted-foreground">Manage promise-to-pay sales with stock validation</p>
      </div>

      <CreditSalesManager
        products={productsResult.products || []}
        userRole={session?.role || 'EMPLOYEE'}
      />
    </div>
  );
}
