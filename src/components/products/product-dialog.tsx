'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createProduct, updateProduct } from '@/app/actions/products';
import { toast } from 'sonner';
import { Product, ProductType, NewProduct, UpdateProduct } from '@/db/types';
import Image from 'next/image';

interface ProductDialogProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit' | 'view';
  onClose: () => void;
  onSuccess: () => void;
}

export function ProductDialog({ product, open, onOpenChange, mode, onClose, onSuccess }: ProductDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'BEER' as ProductType,
    size: '',
    buyingPrice: '',
    sellingPrice: '',
    image: '',
  });

  useEffect(() => {
    if (product && (mode === 'edit' || mode === 'view')) {
      setFormData({
        name: product.name,
        type: product.type,
        size: product.size,
        buyingPrice: product.buyingPrice,
        sellingPrice: product.sellingPrice,
        image: product.image || '',
      });
    } else if (mode === 'create') {
      setFormData({
        name: '',
        type: 'BEER',
        size: '',
        buyingPrice: '',
        sellingPrice: '',
        image: '',
      });
    }
  }, [product, mode, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'view') return;

    setLoading(true);
    console.log('Submitting product:', { mode, formData });

    try {
      let result;
      
      if (mode === 'create') {
        const productData: Omit<NewProduct, 'id' | 'createdAt' | 'createdBy' | 'currentStock' | 'status'> = {
          name: formData.name,
          type: formData.type,
          size: formData.size,
          buyingPrice: formData.buyingPrice,
          sellingPrice: formData.sellingPrice,
          image: formData.image || null,
        };
        result = await createProduct(productData);
      } else if (mode === 'edit' && product) {
        const updateData: UpdateProduct = {
          name: formData.name,
          type: formData.type,
          size: formData.size,
          buyingPrice: formData.buyingPrice,
          sellingPrice: formData.sellingPrice,
          image: formData.image || null,
        };
        result = await updateProduct(product.id, updateData);
      }

      console.log('Product operation result:', result);

      if (result?.success) {
        toast.success(mode === 'create' ? 'Product created successfully' : 'Product updated successfully');
        onSuccess();
        onClose();
      } else {
        toast.error(result?.error || `Failed to ${mode} product`);
      }
    } catch (error) {
      console.error('Product operation error:', error);
      toast.error(`An error occurred while ${mode === 'create' ? 'creating' : 'updating'} the product`);
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'create': return 'Create Product';
      case 'edit': return 'Edit Product';
      case 'view': return 'Product Details';
      default: return 'Product';
    }
  };

  const isReadOnly = mode === 'view';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {formData.image && (
            <div className="relative h-32 w-full rounded-lg overflow-hidden bg-gray-100">
              <Image
                src={formData.image}
                alt="Product preview"
                fill
                className="object-cover"
              />
            </div>
          )}

          <div>
            <Label htmlFor="name">Product Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              disabled={isReadOnly}
            />
          </div>

          <div>
            <Label htmlFor="type">Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value: ProductType) => setFormData({ ...formData, type: value })}
              disabled={isReadOnly}
            >
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
            <Label htmlFor="size">Size</Label>
            <Input
              id="size"
              value={formData.size}
              onChange={(e) => setFormData({ ...formData, size: e.target.value })}
              placeholder="e.g., 500ml, 1L"
              required
              disabled={isReadOnly}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="buyingPrice">Buying Price (RWF)</Label>
              <Input
                id="buyingPrice"
                type="number"
                step="0.01"
                value={formData.buyingPrice}
                onChange={(e) => setFormData({ ...formData, buyingPrice: e.target.value })}
                required
                disabled={isReadOnly}
              />
            </div>
            <div>
              <Label htmlFor="sellingPrice">Selling Price (RWF)</Label>
              <Input
                id="sellingPrice"
                type="number"
                step="0.01"
                value={formData.sellingPrice}
                onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                required
                disabled={isReadOnly}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="image">Image URL (Optional)</Label>
            <Input
              id="image"
              type="url"
              value={formData.image}
              onChange={(e) => setFormData({ ...formData, image: e.target.value })}
              placeholder="https://example.com/image.jpg"
              disabled={isReadOnly}
            />
          </div>

          <div className="flex gap-3 pt-4">
            {!isReadOnly && (
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? 'Saving...' : mode === 'create' ? 'Create Product' : 'Update Product'}
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose} className={isReadOnly ? 'flex-1' : ''}>
              {isReadOnly ? 'Close' : 'Cancel'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}