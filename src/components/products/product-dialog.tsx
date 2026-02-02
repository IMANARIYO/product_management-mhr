'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createProduct, updateProduct, deactivateProduct, reactivateProduct } from '@/app/actions/products';
import { toast } from 'sonner';
import { Product, ProductType, NewProduct, UpdateProduct, productTypeValues, sizeUnits } from '@/db/types';
import Image from 'next/image';

interface ProductDialogProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit' | 'view';
  onClose: () => void;
  onSuccess: () => void;
}

export function ProductDialog({
  product,
  open,
  onOpenChange,
  mode,
  onClose,
  onSuccess,
}: ProductDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'BEER' as ProductType,
    sizeValue: '',
    sizeUnit: 'ml',
    buyingPrice: '',
    sellingPrice: '',
    image: '',
  });

  const isReadOnly = mode === 'view';

  const buying = Number(formData.buyingPrice);
  const selling = Number(formData.sellingPrice);

  const isLoss =
    !isNaN(buying) &&
    !isNaN(selling) &&
    buying > 0 &&
    selling > 0 &&
    selling < buying;

  useEffect(() => {
    if (product && (mode === 'edit' || mode === 'view')) {
      const match = product.size.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
      setFormData({
        name: product.name,
        type: product.type,
        sizeValue: match?.[1] ?? '',
        sizeUnit: match?.[2] || 'ml',
        buyingPrice: product.buyingPrice,
        sellingPrice: product.sellingPrice,
        image: product.image || '',
      });
    } else if (mode === 'create') {
      setFormData({
        name: '',
        type: 'BEER',
        sizeValue: '',
        sizeUnit: 'ml',
        buyingPrice: '',
        sellingPrice: '',
        image: '',
      });
    }
  }, [product, mode, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;

    setLoading(true);

    try {
      const payload = {
        name: formData.name,
        type: formData.type,
        size: `${formData.sizeValue}${formData.sizeUnit}`,
        buyingPrice: formData.buyingPrice,
        sellingPrice: formData.sellingPrice,
        image: formData.image || null,
      };

      const result =
        mode === 'create'
          ? await createProduct(payload as Omit<NewProduct, 'id' | 'createdAt' | 'createdBy' | 'currentStock' | 'status'>)
          : await updateProduct(product!.id, payload as UpdateProduct);

      if (result.success) {
        toast.success(mode === 'create' ? 'Product created' : 'Product updated');
        onSuccess();
        onClose();
      } else {
        toast.error(result.error || 'Operation failed');
      }
    } catch {
      toast.error('Unexpected error');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = async () => {
    if (!product) return;

    setLoading(true);
    const result =
      product.status === 'ACTIVE'
        ? await deactivateProduct(product.id)
        : await reactivateProduct(product.id);

    if (result.success) {
      toast.success('Status updated');
      onSuccess();
      onClose();
    } else {
      toast.error(result.error || 'Failed to update status');
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Create Product' : mode === 'edit' ? 'Edit Product' : 'Product Details'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {formData.image && (
            <div className="relative h-36 w-full rounded-xl overflow-hidden bg-muted">
              <Image src={formData.image} alt="Product image" fill className="object-cover" />
            </div>
          )}

          {/* Product Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name">Product name</Label>
            <Input
              id="name"
              placeholder="e.g. Heineken"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={isReadOnly}
              required
            />
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <Label>Product type</Label>
            <Select
              value={formData.type}
              onValueChange={(v) => setFormData({ ...formData, type: v as ProductType })}
              disabled={isReadOnly}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {productTypeValues.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t.charAt(0) + t.slice(1).toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Size */}
          <div className="space-y-1.5">
            <Label>Product size</Label>
            <div className="flex gap-3">
              <Input
                type="number"
                placeholder="500"
                value={formData.sizeValue}
                onChange={(e) => setFormData({ ...formData, sizeValue: e.target.value })}
                disabled={isReadOnly}
                required
              />
              <Select
                value={formData.sizeUnit}
                onValueChange={(v) => setFormData({ ...formData, sizeUnit: v })}
                disabled={isReadOnly}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sizeUnits.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {formData.sizeValue && (
              <p className="text-xs text-muted-foreground">
                Preview: {formData.sizeValue}
                {formData.sizeUnit}
              </p>
            )}
          </div>

          {/* Prices */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Buying price (RWF)</Label>
              <Input
                type="number"
                value={formData.buyingPrice}
                onChange={(e) => setFormData({ ...formData, buyingPrice: e.target.value })}
                disabled={isReadOnly}
                required
              />
              <p className="text-xs text-muted-foreground">Cost from supplier</p>
            </div>

            <div className="space-y-1.5">
              <Label>Selling price (RWF)</Label>
              <Input
                type="number"
                value={formData.sellingPrice}
                onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                disabled={isReadOnly}
                required
              />
              <p className="text-xs text-muted-foreground">Customer price</p>
            </div>
          </div>

          {/* Loss Warning */}
          {isLoss && !isReadOnly && (
            <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
              ⚠️ Selling price is lower than buying price. This product will be sold at a loss.
            </div>
          )}

          {/* Image */}
          <div className="space-y-1.5">
            <Label>Image URL (optional)</Label>
            <Input
              type="url"
              placeholder="https://example.com/image.jpg"
              value={formData.image}
              onChange={(e) => setFormData({ ...formData, image: e.target.value })}
              disabled={isReadOnly}
            />
          </div>

          {/* Status */}
          {mode === 'view' && product && (
            <div className="rounded-lg border p-3 flex items-center justify-between">
              <span className="text-sm font-medium">Status: {product.status}</span>
              <Button
                size="sm"
                variant={product.status === 'ACTIVE' ? 'destructive' : 'default'}
                onClick={handleStatusToggle}
                disabled={loading}
              >
                {product.status === 'ACTIVE' ? 'Deactivate' : 'Reactivate'}
              </Button>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col  gap-3 pt-4">
            {!isReadOnly && (
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Saving…' : mode === 'create' ? 'Create Product' : 'Update Product'}
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose} className="w-full">
              {isReadOnly ? 'Close' : 'Cancel'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
