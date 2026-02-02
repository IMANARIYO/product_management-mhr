import { getProducts } from '@/app/actions/products';
import { StockManagement } from '@/components/stock/stock-management';

export default async function StockPage() {
  const result = await getProducts(false);

  if (!result.success) {
    return <div className="p-8">Error loading products</div>;
  }

  return (
    <div className="p-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Stock Management</h1>
        <p className="text-muted-foreground">Manual stock adjustments and corrections</p>
      </div>

      <StockManagement products={result.products || []} />
    </div>
  );
}
