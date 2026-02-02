'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createProduct, updateProduct } from '@/app/actions/products';
import { toast } from 'sonner';
import { Product, ProductType, NewProduct, UpdateProduct } from '@/db/types';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: Product | null;
  onSuccess: () => void;
}

export function ProductFormModal({ isOpen, onClose, product, onSuccess }: ProductFormModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'BEER' as ProductType,
    size: '',
    buyingPrice: '',
    sellingPrice: '',
    image: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const isEditing = !!product;

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        type: product.type,
        size: product.size,
        buyingPrice: product.buyingPrice,
        sellingPrice: product.sellingPrice,
        image: product.image || '',
      });
    } else {
      setFormData({
        name: '',
        type: 'BEER',
        size: '',
        buyingPrice: '',
        sellingPrice: '',
        image: '',
      });
    }
  }, [product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let result;
      if (isEditing && product) {
        const updateData: UpdateProduct = {
          name: formData.name,
          type: formData.type,
          size: formData.size,
          buyingPrice: formData.buyingPrice,
          sellingPrice: formData.sellingPrice,
          image: formData.image || null,
        };
        result = await updateProduct(product.id, updateData);
      } else {
        const productData: Omit<NewProduct, 'id' | 'createdAt' | 'createdBy' | 'currentStock' | 'status'> = {
          name: formData.name,
          type: formData.type,
          size: formData.size,
          buyingPrice: formData.buyingPrice,
          sellingPrice: formData.sellingPrice,
          image: formData.image || null,
        };
        result = await createProduct(productData);
      }

      if (result.success) {
        toast.success(isEditing ? 'Product updated successfully' : 'Product created successfully');
        onSuccess();
        onClose();
      } else {
        toast.error(result.error || 'Operation failed');
      }
    } catch (error) {
      console.log(error)
      toast.error('An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Product' : 'Add New Product'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Product Name</label>
            <Input
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter product name"
              disabled={isLoading}
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Type</label>
            <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BEER">Beer</SelectItem>
                <SelectItem value="SODA">Soda</SelectItem>
                <SelectItem value="WINE">Wine</SelectItem>
                <SelectItem value="SPIRIT">Spirit</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Size</label>
            <Input
              value={formData.size}
              onChange={(e) => handleInputChange('size', e.target.value)}
              placeholder="e.g., 500ml, 750ml"
              disabled={isLoading}
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Buying Price (RWF)</label>
            <Input
              type="number"
              value={formData.buyingPrice}
              onChange={(e) => handleInputChange('buyingPrice', e.target.value)}
              placeholder="Enter buying price"
              disabled={isLoading}
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Selling Price (RWF)</label>
            <Input
              type="number"
              value={formData.sellingPrice}
              onChange={(e) => handleInputChange('sellingPrice', e.target.value)}
              placeholder="Enter selling price"
              disabled={isLoading}
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Image URL (Optional)</label>
            <Input
              value={formData.image}
              onChange={(e) => handleInputChange('image', e.target.value)}
              placeholder="Enter image URL"
              disabled={isLoading}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? 'Saving...' : isEditing ? 'Update Product' : 'Create Product'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}