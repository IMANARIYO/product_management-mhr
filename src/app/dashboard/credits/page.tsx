import { requireAuth } from '@/lib/auth-middleware';
import { getProducts } from '@/app/actions/products';
import { getCredits } from '@/app/actions/credits';
import { CreditsManager } from '@/components/credits/credits-manager';

export interface Credit {
  id: string;
  quantity: number;
  customerName: string;
  amountOwed: string;
  status: string;
  createdAt: Date;
  product: Product;
  user: {
    fullName: string;
  };
}

export interface Product {
  id: string;
  name: string;
  type: string;
  size: string;
  currentStock: number;
  sellingPrice: string;
}

export default async function CreditsPage() {
  const session = await requireAuth();
  const [productsResult, creditsResult] = await Promise.all([
    getProducts(false),
    getCredits(),
  ]);

  if (!productsResult.success || !creditsResult.success) {
    return <div className="p-8">Error loading data</div>;
  }

  return (
    <div className="p-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Credit Sales</h1>
        <p className="text-muted-foreground">Track promise-to-pay sales</p>
      </div>



      <CreditsManager
        products={productsResult.products || []}
        credits={creditsResult.credits?.map(credit => ({
          ...credit,
          quantity: 1,
          product: { 
            id: '', 
            name: 'Multiple Items',
            type: 'BEER',
            size: 'N/A',
            currentStock: 0,
            sellingPrice: '0'
          },
          user: { fullName: 'Staff' }
        })) || []}
        userRole={session?.role || 'EMPLOYEE'}
      />
    </div>
  );
}
