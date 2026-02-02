'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProductFormModal } from './product-form-modal';
import { archiveProduct } from '@/app/actions/products';
import { toast } from 'sonner';
import { Pencil, Archive, Plus } from 'lucide-react';
import { Product } from '@/db/types';

interface ProductWithStock extends Product {
  currentStock: number;
}

interface ProductsManagerProps {
  products: ProductWithStock[];
  userRole: string;
  onRefresh: () => void;
}

export function ProductsManager({ products, userRole, onRefresh }: ProductsManagerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const handleAddProduct = () => {
    setSelectedProduct(null);
    setIsModalOpen(true);
  };

  const handleEditProduct = (product: ProductWithStock) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleArchiveProduct = async (productId: string) => {
    if (confirm('Are you sure you want to archive this product?')) {
      try {
        const result = await archiveProduct(productId);
        if (result.success) {
          toast.success('Product archived successfully');
          onRefresh();
        } else {
          toast.error(result.error || 'Failed to archive product');
        }
      } catch (error) {
        console.log(error)
        toast.error('An error occurred');
      }
    }
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      BEER: 'bg-amber-100 text-amber-800',
      SODA: 'bg-blue-100 text-blue-800',
      WINE: 'bg-purple-100 text-purple-800',
      SPIRIT: 'bg-red-100 text-red-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getStockColor = (stock: number) => {
    if (stock === 0) return 'text-red-600';
    if (stock < 10) return 'text-orange-600';
    return 'text-green-600';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Products</h2>
        {userRole === 'ADMIN' && (
          <Button onClick={handleAddProduct}>
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((product) => (
          <Card key={product.id} className="p-4">
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{product.name}</h3>
                  <p className="text-sm text-muted-foreground">{product.size}</p>
                </div>
                <Badge className={getTypeColor(product.type)}>
                  {product.type}
                </Badge>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Buying Price:</span>
                  <span>RWF {parseFloat(product.buyingPrice).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Selling Price:</span>
                  <span>RWF {parseFloat(product.sellingPrice).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Stock:</span>
                  <span className={`font-medium ${getStockColor(product.currentStock)}`}>
                    {product.currentStock} units
                  </span>
                </div>
              </div>

              {userRole === 'ADMIN' && (
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEditProduct(product)}
                    className="flex-1"
                  >
                    <Pencil className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleArchiveProduct(product.id)}
                    className="flex-1"
                  >
                    <Archive className="w-3 h-3 mr-1" />
                    Archive
                  </Button>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {products.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No products found</p>
        </Card>
      )}

      <ProductFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={selectedProduct}
        onSuccess={onRefresh}
      />
    </div>
  );
}