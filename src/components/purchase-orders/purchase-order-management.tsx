/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { useState, useEffect } from 'react';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import {
  Card, CardContent, Typography, Button, Select, MenuItem,
  FormControl, InputLabel, Box, Chip
} from '@mui/material';
import { Add, Visibility, Send, Check, LocalShipping, Inventory, Cancel } from '@mui/icons-material';
import { getCurrentUserAction } from '@/app/actions/profile';
import {
  getPurchaseOrders, createPurchaseOrder, submitPurchaseOrder,
  confirmPurchaseOrder, executeAtMarket, enterStock, rejectForStock, cancelPurchaseOrder
} from '@/app/actions/purchase-orders';
import { getProducts } from '@/app/actions/products';
import { useToastHandler } from '@/hooks/use-toast-handler';
import { DraftOrderDialog } from './draft-order-dialog';
import { ConfirmOrderDialog } from './confirm-order-dialog';
import { ExecuteOrderDialog } from './execute-order-dialog';
import { StockEntryDialog } from './stock-entry-dialog';

interface PurchaseOrderItem {
  id: string;
  desiredQuantity: number;
  confirmedQuantity?: number | null;
  actualFoundQuantity?: number | null;
  unitCost: string;
  totalCost: string;
  notes?: string | null;
  product: {
    id: string;
    name: string;
    size: string;
    buyingPrice: string;
  };
}

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  status: 'DRAFT' | 'SUBMITTED' | 'CONFIRMED' | 'EXECUTED_AT_MARKET' | 'REJECTED_FOR_STOCK' | 'STOCK_ENTERED' | 'CANCELLED';
  createdAt: Date;
  submittedAt?: Date | null;
  confirmedAt?: Date | null;
  executedAt?: Date | null;
  stockEnteredAt?: Date | null;
  notes?: string | null;
  items: PurchaseOrderItem[];
  creator: {
    id: string;
    fullName: string;
  };
}

interface Product {
  id: string;
  name: string;
  size: string;
  buyingPrice: string;
  currentStock: number;
}

export function PurchaseOrderManagement() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [userRole, setUserRole] = useState<'ADMIN' | 'EMPLOYEE'>('EMPLOYEE');
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);

  // Dialog states
  const [draftDialogOpen, setDraftDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [executeDialogOpen, setExecuteDialogOpen] = useState(false);
  const [stockDialogOpen, setStockDialogOpen] = useState(false);

  const { showToast, handleActionResult } = useToastHandler();

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [userResult, ordersResult, productsResult] = await Promise.all([
        getCurrentUserAction(),
        getPurchaseOrders(statusFilter || undefined),
        getProducts()
      ]);

      if (userResult.success && userResult.user) setUserRole(userResult.user.role);
      if (ordersResult.success && ordersResult.orders) setOrders(ordersResult.orders);
      if (productsResult.success && productsResult.products) setProducts(productsResult.products);
    } catch (error) {
      console.error('Error fetching data:', error);
      showToast({ type: 'error', title: 'Error', message: 'Failed to fetch data' });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'default';
      case 'SUBMITTED': return 'warning';
      case 'CONFIRMED': return 'info';
      case 'EXECUTED_AT_MARKET': return 'secondary';
      case 'REJECTED_FOR_STOCK': return 'error';
      case 'STOCK_ENTERED': return 'success';
      case 'CANCELLED': return 'error';
      default: return 'default';
    }
  };

  const getStatusDescription = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'Employee editing';
      case 'SUBMITTED': return 'Awaiting admin approval';
      case 'CONFIRMED': return 'Ready for market execution';
      case 'EXECUTED_AT_MARKET': return 'Awaiting stock entry';
      case 'REJECTED_FOR_STOCK': return 'Rejected - needs correction';
      case 'STOCK_ENTERED': return 'Complete - stock added';
      case 'CANCELLED': return 'Cancelled';
      default: return status;
    }
  };

  // Permission checks
  const canSubmit = (order: PurchaseOrder) => order.status === 'DRAFT';
  const canConfirm = (order: PurchaseOrder) => userRole === 'ADMIN' && order.status === 'SUBMITTED';
  const canExecute = (order: PurchaseOrder) => order.status === 'CONFIRMED';
  const canEnterStock = (order: PurchaseOrder) => userRole === 'ADMIN' && order.status === 'EXECUTED_AT_MARKET';
  const canCancel = (order: PurchaseOrder) => userRole === 'ADMIN' && !['STOCK_ENTERED', 'CANCELLED'].includes(order.status);

  // Action handlers
  const handleCreateOrder = async (items: Array<{ productId: string; quantity: number; unitCost: string }>, notes: string) => {
    setLoading(true);
    const result = await createPurchaseOrder({ items, notes: notes || undefined });
    handleActionResult(result);
    if (result.success) {
      setDraftDialogOpen(false);
      fetchData();
    }
    setLoading(false);
  };

  const handleSubmit = async (orderId: string) => {
    setLoading(true);
    const result = await submitPurchaseOrder(orderId);
    handleActionResult(result);
    if (result.success) fetchData();
    setLoading(false);
  };

  const handleConfirm = async (confirmedItems: Array<{ itemId: string; confirmedQuantity: number }>) => {
    if (!selectedOrder) return;

    setLoading(true);
    const result = await confirmPurchaseOrder(selectedOrder.id, confirmedItems);
    handleActionResult(result);
    if (result.success) {
      setConfirmDialogOpen(false);
      setSelectedOrder(null);
      fetchData();
    }
    setLoading(false);
  };

  const handleExecute = async (actualItems: Array<{ itemId: string; actualFoundQuantity: number; notes?: string }>) => {
    if (!selectedOrder) return;

    setLoading(true);
    const result = await executeAtMarket(selectedOrder.id, actualItems);
    handleActionResult(result);
    if (result.success) {
      setExecuteDialogOpen(false);
      setSelectedOrder(null);
      fetchData();
    }
    setLoading(false);
  };

  const handleEnterStock = async () => {
    if (!selectedOrder) return;

    setLoading(true);
    const result = await enterStock(selectedOrder.id);
    handleActionResult(result);
    if (result.success) {
      setStockDialogOpen(false);
      setSelectedOrder(null);
      fetchData();
    }
    setLoading(false);
  };

  const handleRejectStock = async (reason: string) => {
    if (!selectedOrder) return;

    setLoading(true);
    const result = await rejectForStock(selectedOrder.id, reason);
    handleActionResult(result);
    if (result.success) {
      setStockDialogOpen(false);
      setSelectedOrder(null);
      fetchData();
    }
    setLoading(false);
  };

  const handleCancel = async (orderId: string) => {
    setLoading(true);
    const result = await cancelPurchaseOrder(orderId);
    handleActionResult(result);
    if (result.success) fetchData();
    setLoading(false);
  };

  const openDialog = (type: 'confirm' | 'execute' | 'stock', order: PurchaseOrder) => {
    setSelectedOrder(order);
    switch (type) {
      case 'confirm': setConfirmDialogOpen(true); break;
      case 'execute': setExecuteDialogOpen(true); break;
      case 'stock': setStockDialogOpen(true); break;
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'orderNumber',
      headerName: 'Order #',
      width: 140,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" fontWeight="bold">{params.value}</Typography>
      )
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 180,
      renderCell: (params: GridRenderCellParams) => (
        <Box>
          <Chip
            label={params.value}
            color={getStatusColor(params.value) as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'}
            size="small"
          />
          <Typography variant="caption" display="block" color="text.secondary">
            {getStatusDescription(params.value)}
          </Typography>
        </Box>
      )
    },
    {
      field: 'creator',
      headerName: 'Created By',
      width: 120,
      renderCell: (params: GridRenderCellParams) => params.row.creator.fullName
    },
    {
      field: 'itemCount',
      headerName: 'Items',
      width: 80,
      renderCell: (params: GridRenderCellParams) => params.row.items.length
    },
    {
      field: 'totalCost',
      headerName: 'Total Cost',
      width: 120,
      renderCell: (params: GridRenderCellParams) => {
        const getRelevantQuantity = (item: PurchaseOrderItem) => {
          if (item.actualFoundQuantity !== null && item.actualFoundQuantity !== undefined) {
            return item.actualFoundQuantity;
          }
          if (item.confirmedQuantity !== null && item.confirmedQuantity !== undefined) {
            return item.confirmedQuantity;
          }
          return item.desiredQuantity;
        };

        const total = params.row.items.reduce((sum: number, item: PurchaseOrderItem) => {
          return sum + (getRelevantQuantity(item) * parseFloat(item.unitCost));
        }, 0);

        return `$${total.toFixed(2)}`;
      }
    },
    {
      field: 'createdAt',
      headerName: 'Created',
      width: 120,
      renderCell: (params: GridRenderCellParams) =>
        new Date(params.value).toLocaleDateString()
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 400,
      renderCell: (params: GridRenderCellParams) => {
        const order = params.row as PurchaseOrder;
        return (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              size="small"
              startIcon={<Visibility />}
              onClick={() => openDialog('stock', order)}
            >
              View
            </Button>

            {canSubmit(order) && (
              <Button
                size="small"
                variant="contained"
                startIcon={<Send />}
                onClick={() => handleSubmit(order.id)}
                disabled={loading}
              >
                Submit
              </Button>
            )}

            {canConfirm(order) && (
              <Button
                size="small"
                variant="contained"
                color="warning"
                startIcon={<Check />}
                onClick={() => openDialog('confirm', order)}
              >
                Confirm
              </Button>
            )}

            {canExecute(order) && (
              <Button
                size="small"
                variant="contained"
                color="info"
                startIcon={<LocalShipping />}
                onClick={() => openDialog('execute', order)}
              >
                Execute
              </Button>
            )}

            {canEnterStock(order) && (
              <Button
                size="small"
                variant="contained"
                color="success"
                startIcon={<Inventory />}
                onClick={() => openDialog('stock', order)}
              >
                Enter Stock
              </Button>
            )}

            {canCancel(order) && (
              <Button
                size="small"
                variant="outlined"
                color="error"
                startIcon={<Cancel />}
                onClick={() => handleCancel(order.id)}
                disabled={loading}
              >
                Cancel
              </Button>
            )}
          </Box>
        );
      }
    }
  ];

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <Box>
          <Typography variant="h4">Purchase Order Management</Typography>
          <Typography variant="body2" color="text.secondary">
            Complete lifecycle: DRAFT → SUBMITTED → CONFIRMED → EXECUTED_AT_MARKET → STOCK_ENTERED
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setDraftDialogOpen(true)}
        >
          Create Order
        </Button>
      </div>

      <Card className="mb-4">
        <CardContent>
          <FormControl size="small" sx={{ minWidth: 250 }}>
            <InputLabel>Filter by Status</InputLabel>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              label="Filter by Status"
            >
              <MenuItem value="">All Statuses</MenuItem>
              <MenuItem value="DRAFT">DRAFT - Employee editing</MenuItem>
              <MenuItem value="SUBMITTED">SUBMITTED - Awaiting approval</MenuItem>
              <MenuItem value="CONFIRMED">CONFIRMED - Ready for market</MenuItem>
              <MenuItem value="EXECUTED_AT_MARKET">EXECUTED_AT_MARKET - Awaiting stock entry</MenuItem>
              <MenuItem value="REJECTED_FOR_STOCK">REJECTED_FOR_STOCK - Needs correction</MenuItem>
              <MenuItem value="STOCK_ENTERED">STOCK_ENTERED - Complete</MenuItem>
              <MenuItem value="CANCELLED">CANCELLED</MenuItem>
            </Select>
          </FormControl>
        </CardContent>
      </Card>

      <Box sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={orders}
          columns={columns}
          loading={loading}
          pageSizeOptions={[10, 25, 50]}
          disableRowSelectionOnClick
          density="compact"
        />
      </Box>

      {/* Specialized Dialogs for Each Phase */}
      <DraftOrderDialog
        open={draftDialogOpen}
        onClose={() => setDraftDialogOpen(false)}
        products={products}
        onSubmit={handleCreateOrder}
        loading={loading}
      />

      <ConfirmOrderDialog
        open={confirmDialogOpen}
        onClose={() => {
          setConfirmDialogOpen(false);
          setSelectedOrder(null);
        }}
        order={selectedOrder as Parameters<typeof ConfirmOrderDialog>[0]['order']}
        onConfirm={handleConfirm}
        loading={loading}
      />

      <ExecuteOrderDialog
        open={executeDialogOpen}
        onClose={() => {
          setExecuteDialogOpen(false);
          setSelectedOrder(null);
        }}
        order={selectedOrder as Parameters<typeof ExecuteOrderDialog>[0]['order']}
        onExecute={handleExecute}
        loading={loading}
      />

      <StockEntryDialog
        open={stockDialogOpen}
        onClose={() => {
          setStockDialogOpen(false);
          setSelectedOrder(null);
        }}
        order={selectedOrder as Parameters<typeof StockEntryDialog>[0]['order']}
        onEnterStock={handleEnterStock}
        onRejectStock={handleRejectStock}
        loading={loading}
      />
    </div>
  );
}