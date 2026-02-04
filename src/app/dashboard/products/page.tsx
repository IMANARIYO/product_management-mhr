/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useState, useEffect } from 'react';
import { getCurrentUserAction } from '@/app/actions/profile';
import { getProducts } from '@/app/actions/products';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { ProductsList } from '@/components/products/products-list';
import { ProductDialog } from '@/components/products/product-dialog';
import { Product, User, UserRole } from '@/db/types';
import { toast } from 'sonner';

interface ProductWithStock extends Product {
  currentStock: number;
}

interface CurrentUser {
  id: string;
  fullName: string;
  phoneNumber: string;
  role: UserRole;
}

export default function DashboardProductsPage() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const fetchProducts = async () => {
    try {
      console.log('Fetching products...');
      const result = await getProducts(false);
      console.log('Products result:', result);

      if (result.success && result.products) {
        // Add mock stock data for now
        const productsWithStock = result.products.map(product => ({
          ...product,
          currentStock: 0 // Default to 0 stock
        }));

        setProducts(productsWithStock);
        toast.success(`Loaded ${productsWithStock.length} products`);
      } else {
        toast.error(result.error || 'Failed to load products');
      }
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('An error occurred while loading products');
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Get current user first
        const userResult = await getCurrentUserAction();
        if (!userResult.success || !userResult.user) {
          toast.error('Please log in to access this page');
          return;
        }
        
        console.log('Current user:', userResult.user);
        setUser(userResult.user as CurrentUser);

        // Then fetch products
        await fetchProducts();
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Failed to load page data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading products...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Please log in to access this page</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-muted-foreground mt-2">
            Manage your bar product catalog • Logged in as {user.fullName} ({user.role})
          </p>
        </div>
        {user.role === 'ADMIN' && (
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        )}
      </div>

      <ProductsList
        products={products}
        userRole={user.role}
        onProductsChange={fetchProducts}
      />

      <ProductDialog
        product={null}
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        mode="create"
        onClose={() => setCreateDialogOpen(false)}
        onSuccess={fetchProducts}
      />
    </div>
  );
}