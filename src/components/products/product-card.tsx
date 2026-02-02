'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit2, Trash2, Eye, Package } from 'lucide-react';
import { Product } from '@/db/types';
import Image from 'next/image';
import { useState } from 'react';

interface ProductCardProps {
  product: Product & { currentStock: number };
  userRole: string;
  onView: (product: Product) => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  loading?: boolean;
}

export function ProductCard({ product, userRole, onView, onEdit, onDelete, loading }: ProductCardProps) {
  const [imageError, setImageError] = useState(false);

  const getProductColor = (type: string) => {
    const colors: Record<string, string> = {
      BEER: 'bg-yellow-100 text-yellow-800',
      SODA: 'bg-blue-100 text-blue-800',
      WINE: 'bg-red-100 text-red-800',
      SPIRIT: 'bg-purple-100 text-purple-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-200 border-0 shadow-sm">
      {/* Always show image area */}
      <div className="relative h-96 w-full bg-linear-to-br from-gray-50 to-gray-100">
        {product.image && !imageError ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover"
            onError={() => setImageError(true)}
            priority
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Package className="w-16 h-16 text-gray-300" />
          </div>
        )}
        <div className="absolute top-3 right-3">
          <Badge className={getProductColor(product.type)} variant="secondary">
            {product.type}
          </Badge>
        </div>
      </div>

      <div className="p-4">
        <div className="mb-3">
          <h3 className="font-bold text-lg text-gray-900 mb-1">{product.name}</h3>
          <p className="text-sm text-gray-500">{product.size}</p>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex justify-between items-center py-1">
            <span className="text-xs text-gray-500 uppercase tracking-wide">Buying Price</span>
            <span className="font-semibold text-sm">RWF {parseFloat(product.buyingPrice).toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-xs text-gray-500 uppercase tracking-wide">Selling Price</span>
            <span className="font-semibold text-sm text-green-600">RWF {parseFloat(product.sellingPrice).toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-xs text-gray-500 uppercase tracking-wide">Stock</span>
            <span className={`font-semibold text-sm ${product.currentStock > 10 ? 'text-green-600' :
              product.currentStock > 0 ? 'text-yellow-600' : 'text-red-600'
              }`}>
              {product.currentStock} units
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-9"
            onClick={() => onView(product)}
          >
            <Eye className="w-3 h-3 mr-1" />
            View
          </Button>

          {userRole === 'ADMIN' && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-9"
                onClick={() => onEdit(product)}
              >
                <Edit2 className="w-3 h-3 mr-1" />
                Edit
              </Button>

              <Button
                variant="destructive"
                size="sm"
                className="h-9 px-3"
                onClick={() => onDelete(product)}
                disabled={loading}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}