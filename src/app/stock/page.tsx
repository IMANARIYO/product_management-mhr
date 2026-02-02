'use client';

import React from "react"

import { useState, useEffect } from 'react';

import { getCurrentUser } from '@/app/actions/auth';
import { getProducts } from '@/app/actions/products';
import {
  handleStockAction,
  getStockActionsAction,
} from '@/app/actions/stock';
import { Sidebar } from '@/components/layout/sidebar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TrendingDown, TrendingUp, RotateCw } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function StockPage() {
  const [user, setUser] = useState<{ id: string; fullName: string; role: 'ADMIN' | 'EMPLOYEE' } | null>(null);
  const [products, setProducts] = useState<{ id: string; name: string; type: string; size: string; currentStock: number; buyingPrice: string }[]>([]);
  const [stockActions, setStockActions] = useState<{ id: string; actionType: string; quantity: number; product: { name: string }; user: { fullName: string }; doneAt: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [actionType, setActionType] = useState<'STOCK_IN' | 'SOLD' | 'BROKEN' | 'COUNTED'>('STOCK_IN');
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [formData, setFormData] = useState({
    quantity: '',
    supplier: '',
    reason: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const currentUser = await getCurrentUser();
        // TEMPORARY: Skip auth check
        // if (!currentUser) {
        //   redirect('/login');
        // }
        setUser(currentUser);

        const productsResult = await getProducts(false);
        if (productsResult.success) {
          setProducts(productsResult.products || []);
        }

        const actionsResult = await getStockActionsAction(undefined, undefined, 1, 20);
        if (actionsResult.success) {
          setStockActions((actionsResult.actions || []).map(action => ({
            ...action,
            doneAt: action.doneAt.toString()
          })));
        }
      } catch (error) {
        console.error('[v0] Error loading stock data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    setLoading(true);
    try {
      const result = await handleStockAction({
        productId: selectedProduct,
        actionType,
        quantity: parseInt(formData.quantity),
        supplier: formData.supplier || undefined,
        reason: formData.reason || undefined,
      });

      if (result?.success) {
        const productsResult = await getProducts(false);
        if (productsResult.success) {
          setProducts(productsResult.products || []);
        }

        const actionsResult = await getStockActionsAction(undefined, undefined, 1, 20);
        if (actionsResult.success) {
          setStockActions((actionsResult.actions || []).map(action => ({
            ...action,
            doneAt: action.doneAt.toString()
          })));
        }

        setOpenDialog(false);
        setFormData({ quantity: '', supplier: '', reason: '' });
        setSelectedProduct('');
      }
    } finally {
      setLoading(false);
    }
  };

  const openAddStockDialog = (type: 'STOCK_IN' | 'SOLD' | 'BROKEN' | 'COUNTED') => {
    setActionType(type);
    setFormData({ quantity: '', supplier: '', reason: '' });
    setSelectedProduct('');
    setOpenDialog(true);
  };

  if (!user) return null;

  const getActionLabel = (type: string) => {
    switch (type) {
      case 'STOCK_IN':
        return 'Stock In';
      case 'SOLD':
        return 'Sold';
      case 'BROKEN':
        return 'Broken';
      case 'COUNTED':
        return 'Counted';
      default:
        return type;
    }
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'STOCK_IN':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'SOLD':
        return <TrendingDown className="h-4 w-4 text-blue-500" />;
      case 'BROKEN':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'COUNTED':
        return <RotateCw className="h-4 w-4 text-orange-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex">
      <Sidebar user={user} />

      <main className="flex-1 lg:ml-0">
        <div className="border-b border-border p-6 pt-20 lg:pt-6">
          <h1 className="text-3xl font-bold">Stock Management</h1>
          <p className="text-muted-foreground mt-2">
            Track all stock movements and inventory
          </p>
        </div>

        <div className="p-6">
          <Tabs defaultValue="products" className="space-y-6">
            <TabsList>
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            <TabsContent value="products" className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button
                  onClick={() => openAddStockDialog('STOCK_IN')}
                  className="h-auto flex-col py-4"
                >
                  <TrendingUp className="h-6 w-6 mb-2" />
                  <span>Add Stock</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => openAddStockDialog('SOLD')}
                  className="h-auto flex-col py-4"
                >
                  <TrendingDown className="h-6 w-6 mb-2" />
                  <span>Record Sale</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => openAddStockDialog('BROKEN')}
                  className="h-auto flex-col py-4"
                >
                  <TrendingDown className="h-6 w-6 mb-2" />
                  <span>Record Loss</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => openAddStockDialog('COUNTED')}
                  className="h-auto flex-col py-4"
                >
                  <RotateCw className="h-6 w-6 mb-2" />
                  <span>Count Stock</span>
                </Button>
              </div>

              {products.length === 0 ? (
                <Card className="p-12 text-center">
                  <p className="text-muted-foreground">No products. Create products first.</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map((product) => (
                    <Card key={product.id} className="p-6">
                      <h3 className="text-lg font-bold mb-2">{product.name}</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {product.type} • {product.size}
                      </p>

                      <div className="bg-primary/5 rounded p-4 mb-4">
                        <p className="text-sm text-muted-foreground">Current Stock</p>
                        <p className="text-2xl font-bold">{product.currentStock} units</p>
                      </div>

                      <div className="space-y-2 text-sm mb-4">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Value</span>
                          <span className="font-medium">
                            RWF {(parseFloat(product.buyingPrice) * product.currentStock).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              {stockActions.length === 0 ? (
                <Card className="p-12 text-center">
                  <p className="text-muted-foreground">No stock actions yet</p>
                </Card>
              ) : (
                <div className="space-y-2">
                  {stockActions.map((action: { id: string; actionType: string; quantity: number; product: { name: string }; user: { fullName: string }; doneAt: string }) => (
                    <Card key={action.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          {getActionIcon(action.actionType)}
                          <div className="flex-1">
                            <p className="font-medium">
                              {action.product?.name} • {action.quantity} units
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {getActionLabel(action.actionType)} by {action.user?.fullName}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {new Date(action.doneAt).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(action.doneAt).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{getActionLabel(actionType)} - Stock</DialogTitle>
              <DialogDescription>
                Record a {actionType.toLowerCase()} action
              </DialogDescription>
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
                        {product.name} ({product.currentStock} in stock)
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

              {actionType === 'STOCK_IN' && (
                <div>
                  <label className="text-sm font-medium mb-1 block">Supplier (Optional)</label>
                  <Input
                    placeholder="e.g., ABC Distributors"
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  />
                </div>
              )}

              {actionType === 'BROKEN' && (
                <div>
                  <label className="text-sm font-medium mb-1 block">Reason</label>
                  <Input
                    placeholder="e.g., Broken bottle"
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    required
                  />
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button type="submit" className="flex-1" disabled={loading || !selectedProduct}>
                  Record Action
                </Button>
                <Button type="button" variant="outline" onClick={() => setOpenDialog(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}