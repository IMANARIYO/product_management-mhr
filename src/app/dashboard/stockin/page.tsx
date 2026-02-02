'use client';

import { useState, useEffect } from 'react';
import { getProducts } from '@/app/actions/products';
import { addStockAction, getStockActionsAction } from '@/app/actions/stock';
import { getCurrentUser } from '@/app/actions/auth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Edit } from 'lucide-react';

interface User {
  id: string;
  fullName: string;
  role: string;
}

interface Product {
  id: string;
  name: string;
  currentStock: number;
}

interface StockAction {
  id: string;
  productId: string;
  quantity: number;
  supplier?: string | null;
  doneBy: string;
  doneAt: Date;
  product?: { name: string };
  user?: { fullName: string };
}

export default function StockInPage() {
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [stockActions, setStockActions] = useState<StockAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [formData, setFormData] = useState({
    quantity: '',
    supplier: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [currentUser, productsResult, actionsResult] = await Promise.all([
        getCurrentUser(),
        getProducts(false),
        getStockActionsAction(undefined, 'STOCK_IN', 1, 50)
      ]);

      setUser(currentUser);

      if (productsResult.success) {
        setProducts(productsResult.products || []);
      }

      if (actionsResult.success) {
        setStockActions(actionsResult.actions || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !formData.quantity) return;

    setLoading(true);
    try {
      const result = await addStockAction(
        selectedProduct,
        parseInt(formData.quantity),
        formData.supplier || undefined
      );

      if (result.success) {
        await fetchData();
        setOpenDialog(false);
        setFormData({ quantity: '', supplier: '' });
        setSelectedProduct('');
      }
    } finally {
      setLoading(false);
    }
  };

  const canEdit = (action: StockAction) => {
    return user && action.doneBy === user.id;
  };

  if (!user) return null;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Stock In</h1>
          <p className="text-muted-foreground">Add products to inventory</p>
        </div>
        <Button onClick={() => {
          setFormData({ quantity: '', supplier: '' });
          setSelectedProduct('');
          setOpenDialog(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Add Stock
        </Button>
      </div>

      <div className="space-y-4">
        {stockActions.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">No stock entries yet</p>
          </Card>
        ) : (
          stockActions.map((action) => (
            <Card key={action.id} className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-lg">{action.product?.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Added {action.quantity} units
                    {action.supplier && ` from ${action.supplier}`}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    By {action.user?.fullName} • {new Date(action.doneAt).toLocaleDateString()}
                  </p>
                </div>
                {canEdit(action) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedProduct(action.productId);
                      setFormData({
                        quantity: action.quantity.toString(),
                        supplier: action.supplier || '',
                      });
                      setOpenDialog(true);
                    }}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Stock</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Product</label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} (Current: {product.currentStock})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Quantity</label>
              <Input
                type="number"
                placeholder="0"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Supplier (Optional)</label>
              <Input
                placeholder="e.g., ABC Distributors"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1" disabled={loading || !selectedProduct}>
                Add Stock
              </Button>
              <Button type="button" variant="outline" onClick={() => setOpenDialog(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}