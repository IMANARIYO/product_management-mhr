/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import React from "react"

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState } from 'react';
import { addCredit, payCredit } from '@/app/actions/credits';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface Product {
  id: string;
  name: string;
  type: string;
  size: string;
  currentStock: number;
  sellingPrice: string;
}

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

interface CreditsManagerProps {
  products: Product[];
  credits: Credit[];
  userRole: string;
}

export function CreditsManager({ products, credits, userRole }: CreditsManagerProps) {
  const [selectedTab, setSelectedTab] = useState('create');
  const [selectedProduct, setSelectedProduct] = useState<string>(products[0]?.id || '');
  const [quantity, setQuantity] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [amountOwed, setAmountOwed] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const unpaidCredits = credits.filter((c) => c.status === 'UNPAID');
  const totalUnpaid = unpaidCredits.reduce((sum, c) => sum + parseFloat(c.amountOwed), 0);

  const handleAddCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await addCredit(
        selectedProduct,
        parseInt(quantity),
        customerName,
        amountOwed
      );

      if (result.success) {
        toast.success('Credit sale recorded');
        setQuantity('');
        setCustomerName('');
        setAmountOwed('');
      } else {
        toast.error(result.error || 'Failed to add credit');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayCredit = async (creditId: string) => {
    if (confirm('Mark this credit as paid?')) {
      try {
        const result = await payCredit(creditId);
        if (result.success) {
          toast.success('Credit marked as paid');
        } else {
          toast.error(result.error || 'Failed to mark as paid');
        }
      } catch (error) {
        toast.error('An error occurred');
      }
    }
  };

  return (
    <div className="mt-8">
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="create">Add Credit Sale</TabsTrigger>
          <TabsTrigger value="list">View Credits</TabsTrigger>
        </TabsList>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Summary Card */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Unpaid Credits</h3>
            <div className="space-y-3">
              <div className="p-3 bg-orange-50 rounded-lg">
                <p className="text-muted-foreground text-sm">Total Unpaid</p>
                <p className="text-2xl font-bold text-orange-600">
                  RWF {totalUnpaid.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-muted-foreground text-sm">Total Records</p>
                <p className="text-2xl font-bold">{unpaidCredits.length}</p>
              </div>
            </div>
          </Card>

          {/* Forms and Lists */}
          <div className="lg:col-span-2">
            <TabsContent value="create">
              <Card className="p-6">
                <h3 className="font-semibold mb-4">Record Credit Sale</h3>
                <form onSubmit={handleAddCredit} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Product</label>
                    <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} ({p.size}) - Stock: {p.currentStock}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Quantity</label>
                    <Input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="Number of units"
                      disabled={isLoading}
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Customer Name</label>
                    <Input
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Customer name"
                      disabled={isLoading}
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Amount Owed (RWF)</label>
                    <Input
                      type="number"
                      value={amountOwed}
                      onChange={(e) => setAmountOwed(e.target.value)}
                      placeholder="Total amount"
                      disabled={isLoading}
                      required
                    />
                  </div>

                  <Button type="submit" disabled={isLoading} className="w-full">
                    {isLoading ? 'Recording...' : 'Record Credit Sale'}
                  </Button>
                </form>
              </Card>
            </TabsContent>

            <TabsContent value="list">
              <Card className="p-6">
                <h3 className="font-semibold mb-4">Credit Sales List</h3>
                <div className="space-y-2">
                  {credits.length === 0 ? (
                    <p className="text-muted-foreground">No credits recorded</p>
                  ) : (
                    credits.map((credit) => (
                      <div
                        key={credit.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted transition"
                      >
                        <div className="flex-1">
                          <p className="font-medium">
                            {credit.customerName} - {credit.quantity} x {credit.product.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {credit.user.fullName} •{' '}
                            {formatDistanceToNow(new Date(credit.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="font-semibold">
                              RWF {parseFloat(credit.amountOwed).toLocaleString()}
                            </p>
                            <Badge
                              variant={credit.status === 'PAID' ? 'default' : 'secondary'}
                            >
                              {credit.status}
                            </Badge>
                          </div>
                          {credit.status === 'UNPAID' && userRole === 'ADMIN' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePayCredit(credit.id)}
                            >
                              Mark Paid
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  );
}
