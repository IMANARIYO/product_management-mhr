/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, ShoppingCart, DollarSign } from "lucide-react";
import { createCreditSale, getCreditSales, payCreditSale } from "@/app/actions/credit-sales";
import { StockDayStatusChecker } from "./stock-day-status-checker";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  type: string;
  size: string;
  currentStock: number;
  sellingPrice: string;
}

interface CreditSaleItem {
  productId: string;
  quantity: number;
  product?: Product;
}

interface CreditSale {
  id: string;
  customerName: string;
  customerPhone: string;
  totalAmount: string;
  amountOwed: string;
  status: "UNPAID" | "PAID";
  createdAt: Date;
  paidAt?: Date | null;
  items: Array<{
    id: string;
    quantity: number;
    unitPrice: string;
    totalPrice: string;
    product: {
      id: string;
      name: string;
      type: string;
      size: string;
      sellingPrice: string;
    };
  }>;
  user: {
    fullName: string;
  };
}

interface CreditSalesManagerProps {
  products: Product[];
  userRole: string;
}

export function CreditSalesManager({ products, userRole }: CreditSalesManagerProps) {
  const [creditSales, setCreditSales] = useState<CreditSale[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [canCreateCreditSale, setCanCreateCreditSale] = useState(false);

  // Create sale form state
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [saleItems, setSaleItems] = useState<CreditSaleItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    loadCreditSales();
  }, []);

  const loadCreditSales = async () => {
    setIsLoading(true);
    try {
      const result = await getCreditSales();
      if (result.success && result.creditSales) {
        setCreditSales(result.creditSales);
      } else {
        toast.error(result.error || "Failed to load credit sales");
      }
    } catch (error) {
      toast.error("Failed to load credit sales");
    } finally {
      setIsLoading(false);
    }
  };

  const addItemToSale = () => {
    if (!selectedProductId || quantity <= 0) {
      toast.error("Please select a product and enter valid quantity");
      return;
    }

    const product = products.find(p => p.id === selectedProductId);
    if (!product) {
      toast.error("Product not found");
      return;
    }

    if (product.currentStock < quantity) {
      toast.error(`Insufficient stock. Available: ${product.currentStock}`);
      return;
    }

    // Check if product already in sale
    const existingIndex = saleItems.findIndex(item => item.productId === selectedProductId);
    if (existingIndex >= 0) {
      const updatedItems = [...saleItems];
      updatedItems[existingIndex].quantity += quantity;
      setSaleItems(updatedItems);
    } else {
      setSaleItems([...saleItems, { productId: selectedProductId, quantity, product }]);
    }

    setSelectedProductId("");
    setQuantity(1);
  };

  const removeItemFromSale = (productId: string) => {
    setSaleItems(saleItems.filter(item => item.productId !== productId));
  };

  const calculateTotal = () => {
    return saleItems.reduce((total, item) => {
      const product = products.find(p => p.id === item.productId);
      return total + (product ? Number(product.sellingPrice) * item.quantity : 0);
    }, 0);
  };

  const handleCreateSale = async () => {
    if (!customerName.trim() || !customerPhone.trim()) {
      toast.error("Customer name and phone are required");
      return;
    }

    if (saleItems.length === 0) {
      toast.error("Please add at least one product");
      return;
    }

    setIsLoading(true);
    try {
      const result = await createCreditSale({
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        items: saleItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      });

      if (result.success) {
        toast.success("message" in result ? result.message : "Credit sale created successfully");
        setIsCreateDialogOpen(false);
        resetForm();
        loadCreditSales();
      } else {
        toast.error("error" in result ? result.error : "Failed to create credit sale");
      }
    } catch (error) {
      toast.error("Failed to create credit sale");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaySale = async (creditSaleId: string) => {
    setIsLoading(true);
    try {
      const result = await payCreditSale(creditSaleId);
      if (result.success) {
        toast.success("message" in result ? result.message : "Credit sale marked as paid");
        loadCreditSales();
      } else {
        toast.error("error" in result ? result.error : "Failed to mark as paid");
      }
    } catch (error) {
      toast.error("Failed to mark as paid");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setCustomerName("");
    setCustomerPhone("");
    setSaleItems([]);
    setSelectedProductId("");
    setQuantity(1);
  };

  const unpaidTotal = creditSales
    .filter(sale => sale.status === "UNPAID")
    .reduce((total, sale) => total + Number(sale.amountOwed), 0);

  return (
    <div className="space-y-6">
      {/* Stock Day Status Checker */}
      <StockDayStatusChecker onStatusChange={setCanCreateCreditSale} />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Credit Sales</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{creditSales.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unpaid Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">${unpaidTotal.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unpaid Sales</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {creditSales.filter(sale => sale.status === "UNPAID").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create Sale Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Credit Sales</h2>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={!canCreateCreditSale}>
              <Plus className="h-4 w-4 mr-2" />
              New Credit Sale
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Credit Sale</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customerName">Customer Name</Label>
                  <Input
                    id="customerName"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter customer name"
                  />
                </div>
                <div>
                  <Label htmlFor="customerPhone">Customer Phone</Label>
                  <Input
                    id="customerPhone"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Enter phone number"
                  />
                </div>
              </div>

              {/* Add Products */}
              <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-3">Add Products</h3>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="border rounded px-3 py-2"
                  >
                    <option value="">Select Product</option>
                    {products
                      .filter(p => p.currentStock > 0)
                      .map(product => (
                        <option key={product.id} value={product.id}>
                          {product.name} ({product.size}) - Stock: {product.currentStock}
                        </option>
                      ))}
                  </select>
                  <Input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    placeholder="Qty"
                  />
                  <Button onClick={addItemToSale} type="button">
                    Add
                  </Button>
                </div>

                {/* Sale Items */}
                {saleItems.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Items in Sale:</h4>
                    {saleItems.map((item) => {
                      const product = products.find(p => p.id === item.productId);
                      return (
                        <div key={item.productId} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                          <span>
                            {product?.name} ({product?.size}) x {item.quantity}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              ${(Number(product?.sellingPrice || 0) * item.quantity).toFixed(2)}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItemFromSale(item.productId)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                    <div className="text-right font-bold text-lg">
                      Total: ${calculateTotal().toFixed(2)}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateSale} disabled={isLoading}>
                  {isLoading ? "Creating..." : "Create Credit Sale"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Credit Sales Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {creditSales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell className="font-medium">{sale.customerName}</TableCell>
                  <TableCell>{sale.customerPhone}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {sale.items.map((item, index) => (
                        <div key={item.id}>
                          {item.product.name} x{item.quantity}
                          {index < sale.items.length - 1 && ", "}
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">${sale.totalAmount}</TableCell>
                  <TableCell>
                    <Badge variant={sale.status === "PAID" ? "default" : "destructive"}>
                      {sale.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{sale.user.fullName}</TableCell>
                  <TableCell>
                    {new Date(sale.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {sale.status === "UNPAID" && (
                      <Button
                        size="sm"
                        onClick={() => handlePaySale(sale.id)}
                        disabled={isLoading}
                      >
                        Mark Paid
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}