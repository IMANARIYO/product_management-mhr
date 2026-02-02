/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useState, useEffect, useMemo } from 'react';
import { PurchaseOrderCard } from './purchase-order-card';
import { PurchaseOrderTable } from './purchase-order-table';
import { OrderDialog } from './order-dialog';
import { ViewOrderDialog } from './view-order-dialog';
import { ApproveOrderDialog } from './approve-order-dialog';
import { ConfirmDialog } from './confirm-dialog';
import { Card, CardContent, Typography, Button, Select, MenuItem, FormControl, InputLabel, TextField, Box } from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Add } from '@mui/icons-material';
import { toast } from 'sonner';
import { getCurrentUser } from '@/app/actions/auth';
import { receivePurchaseOrder, deletePurchaseOrder, approvePurchaseOrder, getPurchaseOrders, createPurchaseOrder, updatePurchaseOrder, submitPurchaseOrder, cancelPurchaseOrder } from '@/app/actions/purchase-orders';
import { getProducts } from '@/app/actions/products';
import { PurchaseOrderStatus } from '@/db/types';

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  totalAmount: string;
  status: PurchaseOrderStatus;
  createdAt: Date;
  submittedAt?: Date | null;
  approvedAt?: Date | null;
  notes?: string | null;
  items: Array<{
    id: string;
    quantity: number;
    unitCost: string;
    totalCost: string;
    product: {
      id: string;
      name: string;
      size: string;
      buyingPrice: string;
    };
  }>;
  creator: {
    id: string;
    phoneNumber: string;
  };
}

interface Product {
  id: string;
  name: string;
  size: string;
  buyingPrice: string;
}

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productSize: string;
  buyingPrice: number;
  quantity: number;
  totalCost: number;
}

export function PurchaseOrderManagement() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [userRole, setUserRole] = useState<'ADMIN' | 'EMPLOYEE'>('EMPLOYEE');
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');

  const [statusFilter, setStatusFilter] = useState<PurchaseOrderStatus | ''>('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);

  const [pendingChanges, setPendingChanges] = useState<Set<string>>(new Set());

  // Form states
  const [notes, setNotes] = useState('');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  // Initialize order items from all products
  useEffect(() => {
    if (products.length > 0) {
      const items: OrderItem[] = products.map(product => ({
        id: product.id,
        productId: product.id,
        productName: product.name,
        productSize: product.size,
        buyingPrice: parseFloat(product.buyingPrice),
        quantity: 0,
        totalCost: 0,
      }));
      setOrderItems(items);
    }
  }, [products]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [userResult, ordersResult, productsResult] = await Promise.all([
        getCurrentUser(),
        getPurchaseOrders(statusFilter || undefined),
        getProducts()
      ]);

      if (userResult) setUserRole(userResult.role);
      if (ordersResult.success && ordersResult.orders) setOrders(ordersResult.orders);
      if (productsResult.success && productsResult.products) setProducts(productsResult.products);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = (productId: string, quantity: number) => {
    setOrderItems(prev => prev.map(item =>
      item.productId === productId
        ? { ...item, quantity, totalCost: quantity * item.buyingPrice }
        : item
    ));
    setPendingChanges(prev => new Set(prev).add(productId));
  };

  const totalOrderCost = useMemo(() => {
    return orderItems.reduce((sum, item) => sum + item.totalCost, 0);
  }, [orderItems]);

  const resetForm = () => {
    setNotes('');
    setPendingChanges(new Set());
    setOrderItems(prev => prev.map((item: OrderItem) => ({ ...item, quantity: 0, totalCost: 0 })));
  };

  const handleCreateOrder = async () => {
    const validItems = orderItems.filter(item => item.quantity > 0).map(item => ({
      productId: item.productId,
      quantity: item.quantity,
      unitCost: item.buyingPrice.toString(),
    }));

    if (validItems.length === 0) {
      toast.error('At least one item with quantity > 0 is required');
      return;
    }

    setLoading(true);
    try {
      const result = await createPurchaseOrder({
        items: validItems,
        notes: notes || undefined,
      });

      if (result.success) {
        toast.success('Purchase request created successfully');
        setCreateDialogOpen(false);
        resetForm();
        fetchData();
      } else {
        toast.error(result.error || 'Failed to create purchase request');
      }
    } catch (error) {
      toast.error('Failed to create purchase request');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitOrder = async (orderId: string) => {
    setLoading(true);
    try {
      const result = await submitPurchaseOrder(orderId);
      if (result.success) {
        toast.success('Purchase request submitted for approval');
        fetchData();
      } else {
        toast.error(result.error || 'Failed to submit purchase request');
      }
    } catch (error) {
      toast.error('Failed to submit purchase request');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveOrder = async () => {
    if (!selectedOrder) return;

    setLoading(true);
    try {
      const result = await approvePurchaseOrder(selectedOrder.id);
      if (result.success) {
        toast.success('Purchase request approved');
        setApproveDialogOpen(false);
        setSelectedOrder(null);
        fetchData();
      } else {
        toast.error(result.error || 'Failed to approve purchase request');
      }
    } catch (error) {
      toast.error('Failed to approve purchase request');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkReceived = async (orderId: string) => {
    setLoading(true);
    try {
      const result = await receivePurchaseOrder(orderId);
      if (result.success) {
        toast.success('Purchase request marked as received');
        fetchData();
      } else {
        toast.error(result.error || 'Failed to mark as received');
      }
    } catch (error) {
      toast.error('Failed to mark as received');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (order) {
      setSelectedOrder(order);
      setCancelDialogOpen(true);
    }
  };

  const handleConfirmCancel = async () => {
    if (!selectedOrder) return;

    setLoading(true);
    try {
      const result = await cancelPurchaseOrder(selectedOrder.id);
      if (result.success) {
        toast.success('Purchase request cancelled');
        setCancelDialogOpen(false);
        setSelectedOrder(null);
        fetchData();
      } else {
        toast.error(result.error || 'Failed to cancel');
      }
    } catch (error) {
      toast.error('Failed to cancel');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (order) {
      setSelectedOrder(order);
      setDeleteDialogOpen(true);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedOrder) return;

    setLoading(true);
    try {
      const result = await deletePurchaseOrder(selectedOrder.id);
      if (result.success) {
        toast.success('Purchase request deleted');
        setDeleteDialogOpen(false);
        setSelectedOrder(null);
        fetchData();
      } else {
        toast.error(result.error || 'Failed to delete');
      }
    } catch (error) {
      toast.error('Failed to delete');
    } finally {
      setLoading(false);
    }
  };

  const handleEditOrder = (order: PurchaseOrder) => {
    setSelectedOrder(order);
    setNotes(order.notes || '');
    setPendingChanges(new Set());

    // Initialize edit items from order items
    const editItems: OrderItem[] = products.map(product => {
      const orderItem = order.items.find(item => item.product.id === product.id);
      return {
        id: product.id,
        productId: product.id,
        productName: product.name,
        productSize: product.size,
        buyingPrice: parseFloat(product.buyingPrice),
        quantity: orderItem ? orderItem.quantity : 0,
        totalCost: orderItem ? orderItem.quantity * parseFloat(product.buyingPrice) : 0,
      };
    });
    setOrderItems(editItems);
    setEditDialogOpen(true);
  };

  const handleSaveItem = async (productId: string) => {
    if (!selectedOrder) return;

    const item = orderItems.find(i => i.productId === productId);
    if (!item) return;

    setLoading(true);
    try {
      const validItems = orderItems.filter(item => item.quantity > 0).map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        unitCost: item.buyingPrice.toString(),
      }));

      const result = await updatePurchaseOrder(selectedOrder.id, {
        items: validItems,
        notes: notes || undefined,
      });

      if (result.success) {
        setPendingChanges(prev => {
          const newSet = new Set(prev);
          newSet.delete(productId);
          return newSet;
        });
        toast.success('Item saved successfully');
        fetchData();
      } else {
        toast.error(result.error || 'Failed to save item');
      }
    } catch (error) {
      toast.error('Failed to save item');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAll = async () => {
    if (!selectedOrder || pendingChanges.size === 0) return;

    setLoading(true);
    try {
      const validItems = orderItems.filter(item => item.quantity > 0).map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        unitCost: item.buyingPrice.toString(),
      }));

      const result = await updatePurchaseOrder(selectedOrder.id, {
        items: validItems,
        notes: notes || undefined,
      });

      if (result.success) {
        setPendingChanges(new Set());
        toast.success('All changes saved successfully');
        fetchData();
      } else {
        toast.error(result.error || 'Failed to save changes');
      }
    } catch (error) {
      toast.error('Failed to save changes');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateOrder = async () => {
    if (!selectedOrder) return;

    const validItems = orderItems.filter(item => item.quantity > 0).map(item => ({
      productId: item.productId,
      quantity: item.quantity,
      unitCost: item.buyingPrice.toString(),
    }));

    if (validItems.length === 0) {
      toast.error('At least one item with quantity > 0 is required');
      return;
    }

    setLoading(true);
    try {
      const result = await updatePurchaseOrder(selectedOrder.id, {
        items: validItems,
        notes: notes || undefined,
      });

      if (result.success) {
        toast.success('Purchase request updated successfully');
        setEditDialogOpen(false);
        setSelectedOrder(null);
        resetForm();
        fetchData();
      } else {
        toast.error(result.error || 'Failed to update purchase request');
      }
    } catch (error) {
      toast.error('Failed to update purchase request');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: PurchaseOrderStatus) => {
    switch (status) {
      case 'DRAFT': return 'default';
      case 'SUBMITTED': return 'warning';
      case 'APPROVED': return 'info';
      case 'RECEIVED': return 'success';
      case 'CANCELLED': return 'error';
      default: return 'default';
    }
  };

  const canEdit = (order: PurchaseOrder) => {
    return order.status === 'DRAFT' && (userRole === 'ADMIN' || order.creator.id === userRole);
  };

  const canSubmit = (order: PurchaseOrder) => {
    return order.status === 'DRAFT';
  };

  const canApprove = (order: PurchaseOrder) => {
    return userRole === 'ADMIN' && order.status === 'SUBMITTED';
  };

  const canMarkReceived = (order: PurchaseOrder) => {
    return userRole === 'ADMIN' && order.status === 'APPROVED';
  };

  const canCancel = (order: PurchaseOrder) => {
    return userRole === 'ADMIN' && (order.status === 'DRAFT' || order.status === 'SUBMITTED');
  };

  const columns: GridColDef[] = [
    {
      field: 'productName',
      headerName: 'Product',
      flex: 1,
      minWidth: 150,
    },
    {
      field: 'productSize',
      headerName: 'Size',
      width: 80,
    },
    {
      field: 'buyingPrice',
      headerName: 'Price',
      width: 80,
      renderCell: (params: GridRenderCellParams) => `$${params.value.toFixed(2)}`,
    },
    {
      field: 'quantity',
      headerName: 'Qty',
      width: 100,
      renderCell: (params: GridRenderCellParams) => (
        <TextField
          type="number"
          value={params.value || ''}
          onChange={(e) => updateQuantity(params.row.productId, parseInt(e.target.value) || 0)}
          size="small"
          inputProps={{ min: 0 }}
          sx={{ width: '80px' }}
        />
      ),
    },
    {
      field: 'totalCost',
      headerName: 'Total',
      width: 100,
      renderCell: (params: GridRenderCellParams) => `$${params.value.toFixed(2)}`,
    },
    ...(editDialogOpen ? [{
      field: 'actions',
      headerName: 'Save',
      width: 80,
      renderCell: (params: GridRenderCellParams) => (
        <Button
          size="small"
          variant={pendingChanges.has(params.row.productId) ? "contained" : "outlined"}
          onClick={() => handleSaveItem(params.row.productId)}
          disabled={loading || !pendingChanges.has(params.row.productId)}
          sx={{ minWidth: '60px', fontSize: '0.7rem' }}
        >
          Save
        </Button>
      ),
    }] : []),
  ];

  return (
    <div className="p-2 sm:p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <Typography variant="h4" className="text-xl sm:text-2xl">Purchase Request Management</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setCreateDialogOpen(true)}
          size="small"
        >
          Create Request
        </Button>
      </div>

      {/* Filters and View Toggle */}
      <Card className="mb-4">
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Filter by Status</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as PurchaseOrderStatus | '')}
                label="Filter by Status"
              >
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="DRAFT">Draft</MenuItem>
                <MenuItem value="SUBMITTED">Submitted</MenuItem>
                <MenuItem value="APPROVED">Approved</MenuItem>
                <MenuItem value="RECEIVED">Received</MenuItem>
                <MenuItem value="CANCELLED">Cancelled</MenuItem>
              </Select>
            </FormControl>

            <div className="flex gap-2">
              <Button
                variant={viewMode === 'table' ? 'contained' : 'outlined'}
                onClick={() => setViewMode('table')}
                size="small"
              >
                Table View
              </Button>
              <Button
                variant={viewMode === 'cards' ? 'contained' : 'outlined'}
                onClick={() => setViewMode('cards')}
                size="small"
              >
                Card View
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Display */}
      {viewMode === 'table' ? (
        <PurchaseOrderTable
          onView={(orderId) => {
            const order = orders.find(o => o.id === orderId);
            if (order) {
              setSelectedOrder(order);
              setViewDialogOpen(true);
            }
          }}
          onEdit={(orderId) => {
            const order = orders.find(o => o.id === orderId);
            if (order) handleEditOrder(order);
          }}
          onDelete={handleDelete}
          onCancel={handleCancel}
        />
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <PurchaseOrderCard
              key={order.id}
              order={order}
              userRole={userRole}
              onView={(orderId) => {
                const order = orders.find(o => o.id === orderId);
                if (order) {
                  setSelectedOrder(order);
                  setViewDialogOpen(true);
                }
              }}
              onEdit={(orderId) => {
                const order = orders.find(o => o.id === orderId);
                if (order) handleEditOrder(order);
              }}
              onSubmit={handleSubmitOrder}
              onApprove={(orderId) => {
                const order = orders.find(o => o.id === orderId);
                if (order) {
                  setSelectedOrder(order);
                  setApproveDialogOpen(true);
                }
              }}
              onReceive={handleMarkReceived}
              onCancel={handleCancel}
            />
          ))}
        </div>
      )}

      <OrderDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        title="Create Purchase Request"
        orderItems={orderItems}
        columns={columns}
        totalOrderCost={totalOrderCost}
        notes={notes}
        onNotesChange={setNotes}
        onSubmit={handleCreateOrder}
        loading={loading}
        submitLabel="Create Order"
      />

      <OrderDialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        title="Edit Purchase Request"
        orderItems={orderItems}
        columns={columns}
        totalOrderCost={totalOrderCost}
        notes={notes}
        onNotesChange={setNotes}
        onSubmit={handleUpdateOrder}
        loading={loading}
        submitLabel="Update Order"
        pendingChanges={pendingChanges}
        onSaveAll={handleSaveAll}
      />

      <ViewOrderDialog
        open={viewDialogOpen}
        onClose={() => {
          setViewDialogOpen(false);
          setSelectedOrder(null);
        }}
        order={selectedOrder}
      />

      <ApproveOrderDialog
        open={approveDialogOpen}
        onClose={() => {
          setApproveDialogOpen(false);
          setSelectedOrder(null);
        }}
        onApprove={handleApproveOrder}
        loading={loading}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setSelectedOrder(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Purchase Order"
        message={`Are you sure you want to delete purchase order ${selectedOrder?.orderNumber}? This action cannot be undone.`}
        loading={loading}
        confirmText="Delete"
        confirmColor="error"
      />

      <ConfirmDialog
        open={cancelDialogOpen}
        onClose={() => {
          setCancelDialogOpen(false);
          setSelectedOrder(null);
        }}
        onConfirm={handleConfirmCancel}
        title="Cancel Purchase Order"
        message={`Are you sure you want to cancel purchase order ${selectedOrder?.orderNumber}?`}
        loading={loading}
        confirmText="Cancel Order"
        confirmColor="warning"
      />
    </div>
  );
}   