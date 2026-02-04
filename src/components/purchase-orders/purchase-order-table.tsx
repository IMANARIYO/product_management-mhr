'use client';

import { useState, useEffect, useCallback } from 'react';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import { Button, Select, MenuItem, FormControl, InputLabel, Chip, Box } from '@mui/material';
import { Add, Visibility, Edit, Delete, FileCopy, CheckCircle, Cancel } from '@mui/icons-material';
import { toast } from 'sonner';
import { getCurrentUserAction } from '@/app/actions/profile';
import {
  getPurchaseOrders,
  submitPurchaseOrder,
  cancelPurchaseOrder
} from '@/app/actions/purchase-orders';
import { PurchaseOrderStatus } from '@/db/types';

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplierName?: string;
  totalAmount?: string;
  totalCost?: string;
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
    };
  }>;
  creator: {
    id: string;
    phoneNumber: string;
  };
}

export function PurchaseOrderTable({ onView, onEdit, onDelete, onCancel }: {
  onView?: (orderId: string) => void;
  onEdit?: (orderId: string) => void;
  onDelete?: (orderId: string) => void;
  onCancel?: (orderId: string) => void;
}) {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [userRole, setUserRole] = useState<'ADMIN' | 'EMPLOYEE'>('EMPLOYEE');
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<PurchaseOrderStatus | ''>('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [userResult, ordersResult] = await Promise.all([
        getCurrentUserAction(),
        getPurchaseOrders(statusFilter || undefined)
      ]);

      if (userResult.success && userResult.user) setUserRole(userResult.user.role);
      if (ordersResult.success && ordersResult.orders) {
        setOrders(ordersResult.orders as unknown as PurchaseOrder[]);
      }
    } catch {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getStatusColor = (status: PurchaseOrderStatus) => {
    const colors: Record<PurchaseOrderStatus, 'default' | 'primary' | 'success' | 'info' | 'error'> = {
      DRAFT: 'default',
      SUBMITTED: 'primary',
      CONFIRMED: 'success',
      EXECUTED_AT_MARKET: 'info',
      REJECTED_FOR_STOCK: 'error',
      STOCK_ENTERED: 'success',
      CANCELLED: 'error'
    };
    return colors[status] || 'default';
  };

  const handleAction = async (action: string, orderId: string) => {
    setLoading(true);
    try {
      let result;
      switch (action) {
        case 'submit':
          result = await submitPurchaseOrder(orderId);
          break;
        case 'cancel':
          result = await cancelPurchaseOrder(orderId);
          break;
        default:
          toast.error('Action not implemented');
          return;
      }

      if (result.success) {
        toast.success(`Purchase order ${action}d successfully`);
        fetchData();
      } else {
        toast.error(result.error || `Failed to ${action} purchase order`);
      }
    } catch {
      toast.error(`Failed to ${action} purchase order`);
    } finally {
      setLoading(false);
    }
  };

  const columns: GridColDef[] = [
    { field: 'orderNumber', headerName: 'Order #', width: 120 },
    {
      field: 'supplierName',
      headerName: 'Supplier',
      width: 150,
      renderCell: (params) => params.value || 'N/A'
    },
    {
      field: 'totalAmount',
      headerName: 'Total',
      width: 120,
      renderCell: (params) => {
        const amount = params.value || params.row.totalCost || '0';
        return `RWF ${parseFloat(amount).toLocaleString()}`;
      }
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={getStatusColor(params.value) as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'}
          size="small"
        />
      )
    },
    {
      field: 'itemCount',
      headerName: 'Items',
      width: 80,
      renderCell: (params) => params.row.items?.length || 0
    },
    {
      field: 'createdAt',
      headerName: 'Created',
      width: 120,
      renderCell: (params) => new Date(params.value).toLocaleDateString()
    },
    {
      field: 'creator',
      headerName: 'Created By',
      width: 120,
      renderCell: (params) => params.value?.phoneNumber || 'N/A'
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 200,
      getActions: (params) => {
        const actions = [
          <GridActionsCellItem
            key="view"
            icon={<Visibility />}
            label="View"
            onClick={() => onView?.(params.id as string)}
          />,
          <GridActionsCellItem
            key="copy"
            icon={<FileCopy />}
            label="Copy"
            onClick={() => handleAction('copy', params.id as string)}
          />
        ];

        const status = params.row.status;

        if (status === 'DRAFT') {
          actions.push(
            <GridActionsCellItem
              key="edit"
              icon={<Edit />}
              label="Edit"
              onClick={() => onEdit?.(params.id as string)}
            />,
            <GridActionsCellItem
              key="submit"
              icon={<CheckCircle />}
              label="Submit"
              onClick={() => handleAction('submit', params.id as string)}
            />,
            <GridActionsCellItem
              key="delete"
              icon={<Delete />}
              label="Delete"
              onClick={() => onDelete?.(params.id as string)}
            />
          );
        }

        if (status === 'SUBMITTED' && userRole === 'ADMIN') {
          actions.push(
            <GridActionsCellItem
              key="confirm"
              icon={<CheckCircle />}
              label="Confirm"
              onClick={() => toast.info('Confirm action not implemented')}
            />
          );
        }

        if (status === 'CONFIRMED' && userRole === 'ADMIN') {
          actions.push(
            <GridActionsCellItem
              key="execute"
              icon={<CheckCircle />}
              label="Execute"
              onClick={() => toast.info('Execute action not implemented')}
            />
          );
        }

        if (status !== 'STOCK_ENTERED' && status !== 'CANCELLED') {
          actions.push(
            <GridActionsCellItem
              key="cancel"
              icon={<Cancel />}
              label="Cancel"
              onClick={() => onCancel?.(params.id as string)}
            />
          );
        }

        return actions;
      }
    }
  ];

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Purchase Orders</h1>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => console.log('Create new order')}
        >
          New Order
        </Button>
      </div>

      <div className="mb-4">
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
            <MenuItem value="CONFIRMED">Confirmed</MenuItem>
            <MenuItem value="EXECUTED_AT_MARKET">Executed at Market</MenuItem>
            <MenuItem value="REJECTED_FOR_STOCK">Rejected for Stock</MenuItem>
            <MenuItem value="STOCK_ENTERED">Stock Entered</MenuItem>
            <MenuItem value="CANCELLED">Cancelled</MenuItem>
          </Select>
        </FormControl>
      </div>

      <Box sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={orders}
          columns={columns}
          loading={loading}
          initialState={{
            pagination: {
              paginationModel: { pageSize: 25 }
            }
          }}
          pageSizeOptions={[10, 25, 50]}
          checkboxSelection
          disableRowSelectionOnClick
          sx={{
            '& .MuiDataGrid-cell': {
              display: 'flex',
              alignItems: 'center'
            }
          }}
        />
      </Box>
    </div>
  );
}